import AVFoundation
import CryptoKit
import Foundation

/// A recording file the app writes itself, append-only, with a running SHA-256 over every byte as
/// it is written (fix round 1, group 2a). A checkpoint gives the length so far and the SHA-256 of
/// those bytes from the running state, so the file is never re-read; the bytes are flushed to
/// storage first, so a checkpoint never names bytes a power cut could still lose.
final class CheckpointedFile {
  struct Snapshot {
    let bytes: Int64
    let sha256: String
    /// The checkpoint's number in this file, from 0 (for the final snapshot: how many there were).
    let index: Int
  }

  let url: URL
  private let handle: FileHandle
  private var hasher = SHA256()
  private var bytes: Int64 = 0
  private var checkpoints = 0
  private var closed = false
  private let lock = NSLock()

  init(url: URL) throws {
    guard FileManager.default.createFile(atPath: url.path, contents: nil) else {
      throw NSError(domain: "SaakshiEvidence", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not create \(url.lastPathComponent)"])
    }
    self.url = url
    handle = try FileHandle(forWritingTo: url)
  }

  var size: Int64 {
    lock.lock()
    defer { lock.unlock() }
    return bytes
  }

  func append(_ data: Data) throws {
    lock.lock()
    defer { lock.unlock() }
    guard !closed, !data.isEmpty else { return }
    try handle.write(contentsOf: data)
    hasher.update(data: data)
    bytes += Int64(data.count)
  }

  /// Flushes what has been written and fingerprints it. Nil before the first byte, or once closed.
  func checkpoint() -> Snapshot? {
    lock.lock()
    defer { lock.unlock() }
    guard !closed, bytes > 0 else { return nil }
    try? handle.synchronize()
    var copy = hasher
    let snapshot = Snapshot(bytes: bytes, sha256: Self.hex(copy.finalize()), index: checkpoints)
    checkpoints += 1
    return snapshot
  }

  /// Closes the file and fingerprints all of it.
  func finish() -> Snapshot {
    lock.lock()
    defer { lock.unlock() }
    if !closed {
      closed = true
      try? handle.synchronize()
      try? handle.close()
    }
    var copy = hasher
    return Snapshot(bytes: bytes, sha256: Self.hex(copy.finalize()), index: checkpoints)
  }

  static func hex(_ digest: SHA256.Digest) -> String {
    digest.map { String(format: "%02x", $0) }.joined()
  }
}

/// Receives an asset writer's fragmented MPEG-4 output (Apple's HLS profile) and appends it to one
/// file: an initialization segment (`ftyp`, `moov`), then one segment (`moof`, `mdat`) about every
/// 10 seconds. Joined in order they are a fragmented MP4 that plays as one file, and every prefix
/// ending on a segment boundary plays too. Each media segment is a checkpoint.
final class SegmentSink: NSObject, AVAssetWriterDelegate {
  let file: CheckpointedFile
  var onCheckpoint: ((CheckpointedFile.Snapshot) -> Void)?
  var onError: ((Error) -> Void)?

  init(file: CheckpointedFile) {
    self.file = file
  }

  func assetWriter(
    _ writer: AVAssetWriter, didOutputSegmentData segmentData: Data, segmentType: AVAssetSegmentType,
    segmentReport: AVAssetSegmentReport?
  ) {
    do {
      try file.append(segmentData)
    } catch {
      onError?(error)
      return
    }
    if segmentType == .separable, let snapshot = file.checkpoint() { onCheckpoint?(snapshot) }
  }
}

/// Sound-only files: the microphone's PCM encoded to AAC with `AVAudioConverter`, written as ADTS
/// (`.aac`), a stream of self-contained frames with nothing written at the end. A file cut off
/// plays up to the cut, and works in the background, where an asset writer can't. A checkpoint
/// comes about every `checkpointSeconds` of sound.
final class AdtsWriter {
  let file: CheckpointedFile
  var onCheckpoint: ((CheckpointedFile.Snapshot) -> Void)?
  private let converter: AVAudioConverter
  private let output: AVAudioFormat
  private let frequencyIndex: UInt8
  private let channels: UInt8
  private let checkpointFrames: Int64
  private var framesSinceCheckpoint: Int64 = 0
  private var ended = false

  private static let rates: [Double] = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350]

  init(url: URL, input: AVAudioFormat, checkpointSeconds: Double) throws {
    guard let index = Self.rates.firstIndex(of: input.sampleRate), (1...2).contains(input.channelCount) else {
      throw NSError(domain: "SaakshiEvidence", code: 2, userInfo: [NSLocalizedDescriptionKey: "No AAC for \(input.sampleRate) Hz, \(input.channelCount) channels"])
    }
    var description = AudioStreamBasicDescription(
      // mFormatFlags 2: MPEG-4 audio object type 2, AAC LC (kMPEG4Object_AAC_LC).
      mSampleRate: input.sampleRate, mFormatID: kAudioFormatMPEG4AAC, mFormatFlags: 2,
      mBytesPerPacket: 0, mFramesPerPacket: 1024, mBytesPerFrame: 0, mChannelsPerFrame: input.channelCount,
      mBitsPerChannel: 0, mReserved: 0
    )
    guard let output = AVAudioFormat(streamDescription: &description),
      let converter = AVAudioConverter(from: input, to: output)
    else {
      throw NSError(domain: "SaakshiEvidence", code: 3, userInfo: [NSLocalizedDescriptionKey: "The AAC encoder could not be set up"])
    }
    if converter.applicableEncodeBitRates?.contains(NSNumber(value: 128_000)) ?? false { converter.bitRate = 128_000 }
    self.output = output
    self.converter = converter
    frequencyIndex = UInt8(index)
    channels = UInt8(input.channelCount)
    checkpointFrames = Int64(input.sampleRate * checkpointSeconds)
    file = try CheckpointedFile(url: url)
  }

  func write(_ pcm: AVAudioPCMBuffer) throws {
    try encode(pcm)
  }

  /// Encodes what the encoder still holds, closes the file and fingerprints all of it.
  func finish() -> CheckpointedFile.Snapshot {
    if !ended {
      ended = true
      try? encode(nil)
    }
    return file.finish()
  }

  private func encode(_ pcm: AVAudioPCMBuffer?) throws {
    var given = false
    let endOfStream = pcm == nil
    while true {
      let out = AVAudioCompressedBuffer(format: output, packetCapacity: 16, maximumPacketSize: converter.maximumOutputPacketSize)
      var error: NSError?
      let status = converter.convert(to: out, error: &error) { _, inputStatus in
        if let pcm, !given {
          given = true
          inputStatus.pointee = .haveData
          return pcm
        }
        inputStatus.pointee = endOfStream ? .endOfStream : .noDataNow
        return nil
      }
      if status == .error { throw error ?? NSError(domain: "SaakshiEvidence", code: 4) }
      try writePackets(out)
      if status != .haveData { return }
    }
  }

  private func writePackets(_ buffer: AVAudioCompressedBuffer) throws {
    guard buffer.packetCount > 0, let descriptions = buffer.packetDescriptions else { return }
    var data = Data()
    for i in 0..<Int(buffer.packetCount) {
      let description = descriptions[i]
      let size = Int(description.mDataByteSize)
      guard size > 0 else { continue }
      data.append(contentsOf: header(frameLength: size + 7))
      data.append(buffer.data.advanced(by: Int(description.mStartOffset)).assumingMemoryBound(to: UInt8.self), count: size)
      framesSinceCheckpoint += 1024
    }
    try file.append(data)
    if framesSinceCheckpoint >= checkpointFrames {
      framesSinceCheckpoint = 0
      if let snapshot = file.checkpoint() { onCheckpoint?(snapshot) }
    }
  }

  /// The 7-byte ADTS header: MPEG-4, no CRC, AAC LC, the sample-rate index and channel count.
  private func header(frameLength: Int) -> [UInt8] {
    let profile: UInt8 = 1  // AAC LC is object type 2; ADTS stores the type minus one.
    return [
      0xFF,
      0xF1,
      (profile << 6) | (frequencyIndex << 2) | (channels >> 2),
      ((channels & 0x3) << 6) | UInt8((frameLength >> 11) & 0x3),
      UInt8((frameLength >> 3) & 0xFF),
      UInt8((frameLength & 0x7) << 5) | 0x1F,
      0xFC,
    ]
  }
}
