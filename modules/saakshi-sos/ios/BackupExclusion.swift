import Foundation

/// The owner's backups decision (spec section 2): the app backs nothing up until the user chooses
/// a destination, iCloud device backup included. iOS skips a file in backup when it is marked
/// excluded; this marks a folder and everything in it.
enum BackupExclusion {
  /// Marks `root` and every file and folder under it. Returns how many items were marked.
  static func apply(to root: URL, excluded: Bool) throws -> Int {
    var marked = 0
    func mark(_ url: URL) throws {
      var target = url
      var values = URLResourceValues()
      values.isExcludedFromBackup = excluded
      try target.setResourceValues(values)
      marked += 1
    }
    try mark(root)
    if let items = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil) {
      for case let url as URL in items {
        // One file that can't be marked (being written, say) must not stop the rest.
        try? mark(url)
      }
    }
    return marked
  }
}
