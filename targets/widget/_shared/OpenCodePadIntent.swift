import AppIntents
import Foundation

/// Opens Saakshi's SOS screen, the three swipes (round 2; it opened a code pad before). Used by the
/// Control Center and Lock Screen control, the Action Button, and Shortcuts (for Back Tap). It is
/// built into the app as well as the widget extension, so with `openAppWhenRun` it runs in the app:
/// it notes the request for the app's JavaScript to pick up (modules/saakshi-sos/ios/SosRequest.swift
/// uses the same names). The type keeps its old name so that Shortcuts already made with it, such
/// as for Back Tap, keep working.
struct OpenCodePadIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Saakshi SOS"
  static let description = IntentDescription("Opens Saakshi's SOS screen.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "saakshi.sos.requestedAt")
    NotificationCenter.default.post(name: Notification.Name("SaakshiOpenSos"), object: nil)
    return .result()
  }
}
