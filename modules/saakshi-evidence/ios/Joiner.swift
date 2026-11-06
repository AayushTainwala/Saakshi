import AVFoundation
import ExpoModulesCore

/// One stretch of a source file placed in a joined copy. Seconds.
struct JoinSegmentRecord: Record {
  @Field var uri: String = ""
  @Field var at: Double = 0
  @Field var from: Double = 0
  @Field var length: Double = 0
}

/// What JavaScript passes to `joinToMp4` (JoinRequest in src/modules/evidence/export/joinedCopy.ts).
struct JoinRequestRecord: Record {
  @Field var output: String = ""
  @Field var video: [JoinSegmentRecord] = []
  @Field var audio: [JoinSegmentRecord] = []
  @Field var rotationDegrees: Int? = nil
}

/// Joins a record's files into one MP4 copy for sharing (fix round 1, group 3). The originals are
/// only read. Each video file's picture goes at its place in the recording, with no picture
/// between them; the sound comes from the video files and the sound-only files, each stretch once,
/// as the app's own planner says (`planJoin`).
///
/// It is made without re-encoding (`AVAssetExportPresetPassthrough`) where the phone can. If the
/// clips were filmed turned different ways, or passthrough export fails, it is re-encoded instead,
/// and the result says so, so that the copy's signed record can say so too.
enum Joiner {
  enum Failure: LocalizedError {
    case badOutput
    case noVideo
    case cannotExport(String)

    var errorDescription: String? {
      switch self {
      case .badOutput: return "The output must be a file:// URI"
      case .noVideo: return "None of the video files could be read"
      case .cannotExport(let why): return "The joined copy could not be made: \(why)"
      }
    }
  }

  static func join(_ request: JoinRequestRecord) async throws -> [String: Any] {
    guard let output = URL(string: request.output), output.isFileURL else { throw Failure.badOutput }
    let composition = AVMutableComposition()
    guard let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
      let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
    else { throw Failure.cannotExport("no composition tracks") }

    // Where each video stretch sits in the copy, with the turn its file shows it upright with.
    var placed: [(range: CMTimeRange, transform: CGAffineTransform)] = []
    for segment in request.video {
      guard let inserted = try await insert(segment, mediaType: .video, into: videoTrack) else { continue }
      placed.append(inserted)
    }
    if placed.isEmpty { throw Failure.noVideo }
    var hasAudio = false
    for segment in request.audio {
      if try await insert(segment, mediaType: .audio, into: audioTrack) != nil { hasAudio = true }
    }
    if !hasAudio { composition.removeTrack(audioTrack) }

    let turns = Set(placed.map { "\($0.transform.a),\($0.transform.b),\($0.transform.c),\($0.transform.d)" })
    if turns.count == 1 {
      videoTrack.preferredTransform = placed[0].transform
      do {
        try await export(composition, preset: AVAssetExportPresetPassthrough, videoComposition: nil, to: output)
        return ["uri": output.absoluteString, "reencoded": false]
      } catch {
        NSLog("[Saakshi join] passthrough export failed, re-encoding: %@", error.localizedDescription)
      }
      try await export(composition, preset: AVAssetExportPresetHighestQuality, videoComposition: nil, to: output)
      return ["uri": output.absoluteString, "reencoded": true]
    }

    // Clips turned different ways: each is turned upright in a video composition, which needs
    // re-encoding. The picture is sized to the first clip as shown.
    let natural = try await firstNaturalSize(request.video)
    let shown = natural.applying(placed[0].transform)
    let render = CGSize(width: abs(shown.width), height: abs(shown.height))
    var instructions: [AVMutableVideoCompositionInstruction] = []
    var cursor = CMTime.zero
    for stretch in placed {
      if stretch.range.start > cursor {
        // No picture here: an instruction with no layers shows black.
        let gap = AVMutableVideoCompositionInstruction()
        gap.timeRange = CMTimeRange(start: cursor, end: stretch.range.start)
        instructions.append(gap)
      }
      let instruction = AVMutableVideoCompositionInstruction()
      instruction.timeRange = stretch.range
      let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
      layer.setTransform(fitted(stretch.transform, natural: natural, in: render), at: stretch.range.start)
      instruction.layerInstructions = [layer]
      instructions.append(instruction)
      cursor = stretch.range.end
    }
    let end = composition.duration
    if end > cursor {
      let tail = AVMutableVideoCompositionInstruction()
      tail.timeRange = CMTimeRange(start: cursor, end: end)
      instructions.append(tail)
    }
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = render
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.instructions = instructions
    try await export(composition, preset: AVAssetExportPresetHighestQuality, videoComposition: videoComposition, to: output)
    return ["uri": output.absoluteString, "reencoded": true]
  }

  /// Inserts the stretch of the file's first track of this type at its place, after an empty stretch
  /// if there is a gap. Nil if the file has no such track (a video recorded without sound).
  private static func insert(
    _ segment: JoinSegmentRecord, mediaType: AVMediaType, into track: AVMutableCompositionTrack
  ) async throws -> (range: CMTimeRange, transform: CGAffineTransform)? {
    guard let url = URL(string: segment.uri), url.isFileURL else { return nil }
    let asset = AVURLAsset(url: url)
    guard let source = try await asset.loadTracks(withMediaType: mediaType).first else { return nil }
    let (available, transform) = try await source.load(.timeRange, .preferredTransform)
    let from = available.start + seconds(segment.from)
    guard from < available.end else { return nil }
    let length = min(seconds(segment.length), available.end - from)
    guard length > .zero else { return nil }
    // Never before what is already in the track: inserting inside a track shifts what follows.
    let trackEnd = track.timeRange.end.isValid ? track.timeRange.end : .zero
    var at = seconds(segment.at)
    if at > trackEnd {
      track.insertEmptyTimeRange(CMTimeRange(start: trackEnd, end: at))
    } else {
      at = trackEnd
    }
    try track.insertTimeRange(CMTimeRange(start: from, duration: length), of: source, at: at)
    return (CMTimeRange(start: at, duration: length), transform)
  }

  private static func firstNaturalSize(_ segments: [JoinSegmentRecord]) async throws -> CGSize {
    for segment in segments {
      guard let url = URL(string: segment.uri) else { continue }
      if let track = try await AVURLAsset(url: url).loadTracks(withMediaType: .video).first {
        return try await track.load(.naturalSize)
      }
    }
    throw Failure.noVideo
  }

  /// A file's turn, then scaled to fit the render area and centred in it (a clip filmed the other
  /// way up shows whole, with black bars). All clips of one recording share one natural size.
  private static func fitted(_ transform: CGAffineTransform, natural: CGSize, in render: CGSize) -> CGAffineTransform {
    let box = CGRect(origin: .zero, size: natural).applying(transform)
    guard box.width > 0, box.height > 0 else { return transform }
    let scale = min(render.width / box.width, render.height / box.height)
    let moved = transform.concatenating(CGAffineTransform(translationX: -box.minX, y: -box.minY))
    let scaled = moved.concatenating(CGAffineTransform(scaleX: scale, y: scale))
    let x = (render.width - box.width * scale) / 2
    let y = (render.height - box.height * scale) / 2
    return scaled.concatenating(CGAffineTransform(translationX: x, y: y))
  }

  private static func export(
    _ asset: AVAsset, preset: String, videoComposition: AVVideoComposition?, to output: URL
  ) async throws {
    guard let session = AVAssetExportSession(asset: asset, presetName: preset) else {
      throw Failure.cannotExport("no export session for \(preset)")
    }
    try? FileManager.default.removeItem(at: output)
    try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    session.outputURL = output
    session.outputFileType = .mp4
    session.shouldOptimizeForNetworkUse = true
    session.videoComposition = videoComposition
    await withCheckedContinuation { (done: CheckedContinuation<Void, Never>) in
      session.exportAsynchronously { done.resume() }
    }
    guard session.status == .completed else {
      try? FileManager.default.removeItem(at: output)
      throw Failure.cannotExport(session.error?.localizedDescription ?? "status \(session.status.rawValue)")
    }
  }

  private static func seconds(_ value: Double) -> CMTime {
    CMTime(seconds: value, preferredTimescale: 600)
  }
}
