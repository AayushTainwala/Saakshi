import ExpoModulesCore
import UIKit

/**
 * The phone's own passcode prompt, a slow hash for the recovery code, and a light haptic tap
 * (round 2, group 1.6). Replaces expo-local-authentication, whose prompt also took Face ID or
 * Touch ID.
 */
public class SaakshiDeviceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SaakshiDevice")

    Function("hasScreenLock") { () -> Bool in
      PasscodeGate.hasPasscode()
    }

    // iPhone can always ask for the passcode alone (a `.devicePasscode` keychain item).
    Function("canAskPasscodeOnly") { () -> Bool in
      true
    }

    // The title is iOS's reason line in the passcode prompt; iOS shows no subtitle.
    AsyncFunction("confirmScreenLock") { (title: String, _: String) -> String in
      PasscodeGate.confirm(reason: title)
    }

    AsyncFunction("pbkdf2Sha256") { (password: String, saltHex: String, iterations: Int, length: Int) throws -> String in
      try SlowHash.pbkdf2Sha256Hex(password: password, saltHex: saltHex, iterations: iterations, length: length)
    }

    // The swipe's handle entering its confirm region (SPEC 5.1).
    Function("tapLight") {
      DispatchQueue.main.async {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
      }
    }
  }
}
