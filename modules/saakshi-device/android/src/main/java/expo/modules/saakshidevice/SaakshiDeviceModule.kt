package expo.modules.saakshidevice

import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.view.HapticFeedbackConstants
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * The phone's own screen-lock prompt, a slow hash and a light haptic tap (round 2, group 1.6).
 * Replaces expo-local-authentication, whose prompt also took a fingerprint or face.
 */
class SaakshiDeviceModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)

  private fun keyguard(): KeyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager

  override fun definition() = ModuleDefinition {
    Name("SaakshiDevice")

    // A PIN, pattern or password (not swipe or none). KeyguardManager.isDeviceSecure, API 23+.
    Function("hasScreenLock") { keyguard().isDeviceSecure }

    // Android 11 and later can ask for the screen lock alone. Before that, the only system screens
    // that ask for it also take a fingerprint (Android 7 to 9) or a fingerprint or face (Android 10),
    // and an app can't turn that off (BUILD_HANDOFF.md, group 1.6), so Saakshi doesn't use them.
    Function("canAskPasscodeOnly") { Build.VERSION.SDK_INT >= Build.VERSION_CODES.R }

    AsyncFunction("confirmScreenLock") Coroutine { title: String, subtitle: String ->
      confirm(title, subtitle)
    }

    AsyncFunction("pbkdf2Sha256") Coroutine { password: String, saltHex: String, iterations: Int, length: Int ->
      withContext(Dispatchers.Default) { Pbkdf2.sha256Hex(password, saltHex, iterations, length) }
    }

    // The swipe's handle entering its confirm region (SPEC 5.1). Through the window's own touch
    // feedback, which needs no VIBRATE permission (it stays blocked) and follows the phone's
    // "touch feedback" setting.
    Function("tapLight") {
      val view = appContext.currentActivity?.window?.decorView
      view?.post {
        val effect =
          if (Build.VERSION.SDK_INT >= 34) HapticFeedbackConstants.GESTURE_THRESHOLD_ACTIVATE else HapticFeedbackConstants.CLOCK_TICK
        view.performHapticFeedback(effect)
      }
      Unit
    }
  }

  private suspend fun confirm(title: String, subtitle: String): String {
    if (!keyguard().isDeviceSecure) return "no-lock"
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return "unavailable"
    val activity = appContext.currentActivity ?: return "unavailable"
    return withContext(Dispatchers.Main) { PasscodePrompt.ask(activity, title, subtitle) }
  }
}
