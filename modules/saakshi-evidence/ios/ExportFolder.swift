import ExpoModulesCore
import UIKit
import UniformTypeIdentifiers

/// The default export folder (fix round 1, group 9). The user picks a folder once in the document
/// picker, and the app keeps a bookmark to it, as Apple describes in "Providing access to
/// directories" (https://developer.apple.com/documentation/uikit/providing-access-to-directories):
/// start accessing the security-scoped URL, make a minimal bookmark, stop accessing. Each later
/// export resolves the bookmark, starts accessing the folder, copies the bundle in under file
/// coordination, and stops accessing; a stale bookmark is made again while the folder is open.
final class ExportFolder: NSObject, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
  static let shared = ExportFolder()

  /// The picker's promise, while it is open. Only touched on the main queue.
  private var pending: Promise?

  /// Shows the folder picker. Resolves with `bookmark` (Base64) and the folder's `name`, or with
  /// null if the user cancels.
  func pick(from controller: UIViewController, promise: Promise) {
    if pending != nil {
      promise.reject("ERR_PICKER_BUSY", "A folder picker is already open.")
      return
    }
    pending = promise
    let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder], asCopy: false)
    picker.delegate = self
    picker.allowsMultipleSelection = false
    picker.presentationController?.delegate = self
    picker.popoverPresentationController?.sourceView = controller.view
    controller.present(picker, animated: true)
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    guard let promise = pending else { return }
    pending = nil
    guard let url = urls.first else {
      promise.resolve(nil)
      return
    }
    guard url.startAccessingSecurityScopedResource() else {
      promise.reject("ERR_FOLDER_ACCESS", "iOS did not give access to that folder.")
      return
    }
    defer { url.stopAccessingSecurityScopedResource() }
    do {
      let bookmark = try url.bookmarkData(options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil)
      promise.resolve(["bookmark": bookmark.base64EncodedString(), "name": url.lastPathComponent])
    } catch {
      promise.reject("ERR_FOLDER_BOOKMARK", error.localizedDescription)
    }
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    cancel()
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    cancel()
  }

  private func cancel() {
    let promise = pending
    pending = nil
    promise?.resolve(nil)
  }

  /// Copies `source` into the bookmarked folder as `name`, or "name (2)" and so on if that is
  /// taken. Returns the name it got, the folder's name, and, if the bookmark was stale, a new one
  /// to keep in its place.
  static func save(bookmark: String, source: URL, name: String) throws -> [String: Any] {
    guard let data = Data(base64Encoded: bookmark) else {
      throw Exception(name: "ERR_FOLDER_GONE", description: "The saved folder can't be read.")
    }
    var stale = false
    let folder: URL
    do {
      folder = try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
    } catch {
      throw Exception(name: "ERR_FOLDER_GONE", description: error.localizedDescription)
    }
    guard folder.startAccessingSecurityScopedResource() else {
      throw Exception(name: "ERR_FOLDER_ACCESS", description: "iOS no longer gives access to that folder.")
    }
    defer { folder.stopAccessingSecurityScopedResource() }

    var result: [String: Any] = ["folder": folder.lastPathComponent]
    if stale, let fresh = try? folder.bookmarkData(options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil) {
      result["bookmark"] = fresh.base64EncodedString()
    }

    let target = freeName(in: folder, for: name)
    var coordinationError: NSError?
    var copyError: Error?
    NSFileCoordinator().coordinate(writingItemAt: target, options: .forReplacing, error: &coordinationError) { url in
      do {
        try FileManager.default.copyItem(at: source, to: url)
      } catch {
        copyError = error
      }
    }
    if let error = coordinationError ?? copyError {
      throw Exception(name: "ERR_FOLDER_WRITE", description: error.localizedDescription)
    }
    result["name"] = target.lastPathComponent
    return result
  }

  private static func freeName(in folder: URL, for name: String) -> URL {
    let base = (name as NSString).deletingPathExtension
    let ext = (name as NSString).pathExtension
    var candidate = folder.appendingPathComponent(name)
    var number = 2
    while FileManager.default.fileExists(atPath: candidate.path) {
      let next = ext.isEmpty ? "\(base) (\(number))" : "\(base) (\(number)).\(ext)"
      candidate = folder.appendingPathComponent(next)
      number += 1
    }
    return candidate
  }
}
