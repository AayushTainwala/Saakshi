import CryptoKit
import Foundation

/// Reads a file once, in fixed-size chunks, and computes its SHA-256, SHA-1, MD5 and CRC-32 together.
/// Memory use stays at one buffer whatever the file size.
enum StreamingHasher {
  static let bufferSize = 1 << 20

  struct Result {
    let size: UInt64
    let sha256: String
    let sha1: String
    let md5: String
    let crc32: UInt32
  }

  static func hash(fileAt url: URL) throws -> Result {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }

    var sha256 = SHA256()
    var sha1 = Insecure.SHA1()
    var md5 = Insecure.MD5()
    var crc = CRC32()
    var size: UInt64 = 0

    while true {
      let chunk: Data? = try autoreleasepool { try handle.read(upToCount: bufferSize) }
      guard let chunk, !chunk.isEmpty else { break }
      sha256.update(data: chunk)
      sha1.update(data: chunk)
      md5.update(data: chunk)
      crc.update(chunk)
      size += UInt64(chunk.count)
    }

    return Result(
      size: size,
      sha256: hex(sha256.finalize()),
      sha1: hex(sha1.finalize()),
      md5: hex(md5.finalize()),
      crc32: crc.value
    )
  }

  static func hex<D: Sequence>(_ digest: D) -> String where D.Element == UInt8 {
    digest.map { String(format: "%02x", $0) }.joined()
  }
}

/// CRC-32 (IEEE 802.3, as used by ZIP), table-driven.
struct CRC32 {
  private static let table: [UInt32] = (0..<256).map { i -> UInt32 in
    var c = UInt32(i)
    for _ in 0..<8 {
      c = (c & 1) != 0 ? (0xEDB8_8320 ^ (c >> 1)) : (c >> 1)
    }
    return c
  }

  private var crc: UInt32 = 0xFFFF_FFFF

  mutating func update(_ data: Data) {
    var c = crc
    data.withUnsafeBytes { (buffer: UnsafeRawBufferPointer) in
      for byte in buffer {
        c = CRC32.table[Int((c ^ UInt32(byte)) & 0xFF)] ^ (c >> 8)
      }
    }
    crc = c
  }

  var value: UInt32 { crc ^ 0xFFFF_FFFF }
}
