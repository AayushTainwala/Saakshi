import Foundation

/// How a trigger outside the app's screens asks for the code pad. The App Intent runs in the app's
/// process, notes the time here and posts a notification; the module passes it to JavaScript, or
/// JavaScript picks it up on start if it wasn't running yet. Keep the names in step with
/// targets/widget/_shared/OpenCodePadIntent.swift.
enum CodePadRequest {
  static let notification = Notification.Name("SaakshiOpenCodePad")
  static let key = "saakshi.codepad.requestedAt"

  /// True if a request came in the last minute; clears it.
  static func consume() -> Bool {
    let defaults = UserDefaults.standard
    let at = defaults.double(forKey: key)
    guard at > 0 else { return false }
    defaults.removeObject(forKey: key)
    return Date().timeIntervalSince1970 - at < 60
  }
}
