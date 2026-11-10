import Darwin
import Foundation

/// Replaces a small file in one step (repair round A, group 1): the locker's bookkeeping
/// (session.json) and the device-key files.
///
/// The new contents go into a file beside the target ("<name>.tmp"), are flushed to storage, and
/// the file is then renamed over the target. rename(2) puts the new file in the old one's place in
/// a single step: a reader, or the app after a kill or a power cut, finds the old file or the new
/// one, whole, never an empty or half-written one. If anything fails before the rename (the
/// storage is full, say), the old file is untouched.
enum AtomicFile {
  /// The ending of the file written beside the target. A leftover one is removed when the app next opens.
  static let temporarySuffix = ".tmp"

  static func replace(_ url: URL, with data: Data) throws {
    let target = url.path
    let temporary = target + temporarySuffix
    let fd = open(temporary, O_WRONLY | O_CREAT | O_TRUNC, 0o644)
    guard fd >= 0 else { throw failure("open", temporary) }
    do {
      try data.withUnsafeBytes { (buffer: UnsafeRawBufferPointer) in
        var offset = 0
        while offset < buffer.count {
          let count = Darwin.write(fd, buffer.baseAddress! + offset, buffer.count - offset)
          if count < 0 {
            if errno == EINTR { continue }
            throw failure("write", temporary)
          }
          offset += count
        }
      }
      // Onto storage before the rename: otherwise a power cut could leave the new name on an empty
      // file. F_FULLFSYNC asks the storage itself to write its cache out; fsync is the fallback.
      if fcntl(fd, F_FULLFSYNC) != 0 && fsync(fd) != 0 { throw failure("fsync", temporary) }
    } catch {
      close(fd)
      unlink(temporary)
      throw error
    }
    close(fd)
    guard rename(temporary, target) == 0 else {
      let error = failure("rename", target)
      unlink(temporary)
      throw error
    }
  }

  private static func failure(_ step: String, _ path: String) -> NSError {
    let code = errno
    return NSError(
      domain: NSPOSIXErrorDomain, code: Int(code),
      userInfo: [NSLocalizedDescriptionKey: "\(step) failed for \((path as NSString).lastPathComponent): \(String(cString: strerror(code)))"])
  }
}
