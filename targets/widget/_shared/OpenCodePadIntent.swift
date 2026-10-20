import AppIntents
import Foundation

/// Opens Saakshi's code pad (spec S4). Used by the Control Center and Lock Screen control, the
/// Action Button, and Shortcuts (for Back Tap). It is built into the app as well as the widget
/// extension, so with `openAppWhenRun` it runs in the app: it notes the request for the app's
/// JavaScript to pick up (modules/saakshi-sos/ios/CodePadRequest.swift uses the same names).
struct OpenCodePadIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Saakshi code pad"
  static let description = IntentDescription("Opens the code pad that alerts your trusted contacts.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "saakshi.codepad.requestedAt")
    NotificationCenter.default.post(name: Notification.Name("SaakshiOpenCodePad"), object: nil)
    return .result()
  }
}
