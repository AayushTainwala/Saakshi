import Contacts
import ContactsUI
import ExpoModulesCore

public class SaakshiSosModule: Module {
  private var picker: PhonePicker?

  public func definition() -> ModuleDefinition {
    Name("SaakshiSos")

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
