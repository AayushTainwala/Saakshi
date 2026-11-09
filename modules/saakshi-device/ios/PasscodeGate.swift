import Foundation
import LocalAuthentication
import Security

/**
 * Asks for the iPhone's passcode, and only the passcode (round 2, group 1.6; SPEC 5.3: a forgotten
 * secret code is reset with the phone's own passcode, never a face or fingerprint).
 *
 * No LocalAuthentication policy asks for the passcode alone: `deviceOwnerAuthentication` takes
 * Face ID or Touch ID first when they are set up. A keychain item can be held to the passcode
 * alone instead: its access control is `.devicePasscode` ("Constraint to access an item with a
 * passcode"), and it is kept "when passcode set, this device only". Reading it makes iOS ask for
 * the passcode. Each time, a fresh random value is written and must be read back, so a pass means
 * the passcode was entered just now.
 *
 * The read blocks while iOS shows its prompt, so it runs on its own serial queue, off the main
 * thread and off the queue Expo shares between every module's async functions. Being serial, two
 * resets can't race on the item.
 */
enum PasscodeGate {
  static let queue = DispatchQueue(label: "in.aayushtainwala.saakshi.passcode-gate", qos: .userInitiated)
  private static let service = "in.aayushtainwala.saakshi.passcode-gate"
  private static let account = "reset"

  /** Whether the phone has a passcode. */
  static func hasPasscode() -> Bool {
    var error: NSError?
    // True whenever a passcode is set (with or without Face ID); false with `passcodeNotSet`.
    return LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
  }

  static func confirm(reason: String) -> String {
    guard hasPasscode() else { return "no-lock" }

    var secret = Data(count: 32)
    let random = secret.withUnsafeMutableBytes { bytes -> OSStatus in
      guard let base = bytes.baseAddress else { return errSecAllocate }
      return SecRandomCopyBytes(kSecRandomDefault, 32, base)
    }
    guard random == errSecSuccess else { return "unavailable" }

    var accessError: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(
      nil,
      kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
      .devicePasscode,
      &accessError
    ) else { return "unavailable" }

    let item: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    // Deleting needs no passcode. The item never outlives one reset.
    SecItemDelete(item as CFDictionary)
    defer { SecItemDelete(item as CFDictionary) }

    var add = item
    add[kSecAttrAccessControl as String] = access
    add[kSecValueData as String] = secret
    let added = SecItemAdd(add as CFDictionary, nil)
    if added == errSecDuplicateItem {
      // Left over and not deletable: never treat an old value as a fresh pass.
      return "unavailable"
    }
    guard added == errSecSuccess else {
      // The passcode was removed between the check and here, or the keychain refused.
      return hasPasscode() ? "unavailable" : "no-lock"
    }

    // A fresh context each time, so an earlier entry of the passcode is never reused.
    let context = LAContext()
    context.localizedReason = reason
    var read = item
    read[kSecReturnData as String] = true
    read[kSecMatchLimit as String] = kSecMatchLimitOne
    read[kSecUseAuthenticationContext as String] = context
    var result: CFTypeRef?
    let status = SecItemCopyMatching(read as CFDictionary, &result)
    switch status {
    case errSecSuccess:
      return (result as? Data) == secret ? "passed" : "failed"
    case errSecUserCanceled:
      return "cancelled"
    case errSecAuthFailed:
      return "failed"
    case errSecItemNotFound:
      // iOS deletes "when passcode set" items when the passcode is turned off.
      return hasPasscode() ? "unavailable" : "no-lock"
    default:
      return "unavailable"
    }
  }
}
