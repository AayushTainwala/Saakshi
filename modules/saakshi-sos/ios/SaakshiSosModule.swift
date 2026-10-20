import ActivityKit
import Contacts
import ContactsUI
import ExpoModulesCore

public class SaakshiSosModule: Module {
  private var picker: PhonePicker?
  private var codePadObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("SaakshiSos")

    // Sent when the Action Button, a Control Center or Lock Screen control, or a Shortcut asks for
    // the code pad (targets/widget/_shared/OpenCodePadIntent.swift).
    Events("onOpenCodePad")

    OnStartObserving {
      self.codePadObserver = NotificationCenter.default.addObserver(
        forName: CodePadRequest.notification, object: nil, queue: .main
      ) { [weak self] _ in
        if CodePadRequest.consume() { self?.sendEvent("onOpenCodePad") }
      }
    }

    OnStopObserving {
      if let observer = self.codePadObserver { NotificationCenter.default.removeObserver(observer) }
      self.codePadObserver = nil
    }

    // True once if a trigger asked for the code pad in the last minute (for a cold start, before
    // anything was listening).
    Function("consumeCodePadRequest") { () -> Bool in
      CodePadRequest.consume()
    }

    // Bug mode's Live Activity on the Lock Screen and in the Dynamic Island (spec E8).
    AsyncFunction("liveActivityStart") { (title: String, detail: String) throws -> Bool in
      try BugModeActivity.start(title: title, detail: detail)
    }

    AsyncFunction("liveActivityUpdate") { (detail: String) async in
      await BugModeActivity.update(detail: detail)
    }

    AsyncFunction("liveActivityEnd") { () async in
      await BugModeActivity.end()
    }

    // Android only: the quick-alert notification. iPhone uses the controls above.
    Function("quickNotificationShow") { (_: String, _: String, _: String) in }
    Function("quickNotificationHide") { () in }
    Function("quickNotificationEnabled") { () -> Bool in false }

    // Keeps the app's files out of iCloud device backup until the user chooses otherwise.
    AsyncFunction("setExcludedFromBackup") { (uri: URL, excluded: Bool) throws -> Int in
      guard uri.isFileURL else {
        throw Exception(name: "ERR_FILE_URI", description: "Not a local file URI: \(uri)")
      }
      return try BackupExclusion.apply(to: uri, excluded: excluded)
    }

    // Android only: bug mode's recorder. iPhone records through expo-audio (Stream A's AudioPieces).
    Function("bugRecorderRunning") { () -> Bool in false }

    // Apple's contact picker runs outside the app and hands back only what the user picks, so no
    // contacts permission is asked for.
    AsyncFunction("pickPhoneNumber") { (promise: Promise) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject(Exception(name: "ERR_NO_VIEW", description: "Nothing on screen to present the picker from"))
        return
      }
      let picker = PhonePicker { picked in
        self.picker = nil
        promise.resolve(picked)
      }
      self.picker = picker
      picker.present(from: presenter)
    }.runOnQueue(.main)

    // iPhone never lets an app send SMS by itself; SOS opens the Messages composer instead.
    Function("canSendDirectly") { () -> Bool in
      false
    }

    AsyncFunction("sendDirect") { (_: [String], _: String) throws -> [[String: Any]] in
      throw Exception(name: "ERR_NOT_SUPPORTED", description: "iPhone apps can't send SMS by themselves")
    }
  }
}

/// Presents CNContactPickerViewController for one phone number. A contact with a single number is
/// picked with one tap; one with several opens its card so the user taps the number.
final class PhonePicker: NSObject, CNContactPickerDelegate {
  private let completion: ([String: Any]?) -> Void
  private var finished = false

  init(completion: @escaping ([String: Any]?) -> Void) {
    self.completion = completion
  }

  func present(from presenter: UIViewController) {
    let controller = CNContactPickerViewController()
    controller.delegate = self
    controller.displayedPropertyKeys = [CNContactPhoneNumbersKey]
    controller.predicateForEnablingContact = NSPredicate(format: "phoneNumbers.@count > 0")
    controller.predicateForSelectionOfContact = NSPredicate(format: "phoneNumbers.@count == 1")
    controller.predicateForSelectionOfProperty = NSPredicate(format: "key == 'phoneNumbers'")
    presenter.present(controller, animated: true)
  }

  func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
    finish(nil)
  }

  func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
    guard let number = contact.phoneNumbers.first?.value.stringValue else {
      finish(nil)
      return
    }
    finish(picked(number, contact))
  }

  func contactPicker(_ picker: CNContactPickerViewController, didSelect contactProperty: CNContactProperty) {
    guard let number = (contactProperty.value as? CNPhoneNumber)?.stringValue else {
      finish(nil)
      return
    }
    finish(picked(number, contactProperty.contact))
  }

  private func picked(_ number: String, _ contact: CNContact) -> [String: Any] {
    var result: [String: Any] = ["phone": number]
    if let name = displayName(contact) { result["name"] = name }
    return result
  }

  private func finish(_ result: [String: Any]?) {
    guard !finished else { return }
    finished = true
    completion(result)
  }

  private func displayName(_ contact: CNContact) -> String? {
    var parts: [String] = []
    if contact.isKeyAvailable(CNContactGivenNameKey) { parts.append(contact.givenName) }
    if contact.isKeyAvailable(CNContactFamilyNameKey) { parts.append(contact.familyName) }
    let name = parts.filter { !$0.isEmpty }.joined(separator: " ")
    if !name.isEmpty { return name }
    if contact.isKeyAvailable(CNContactOrganizationNameKey), !contact.organizationName.isEmpty {
      return contact.organizationName
    }
    return nil
  }
}
