package expo.modules.saakshidevice

import android.app.Activity
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.CancellationSignal
import android.annotation.TargetApi
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Android 11 and later: the system's prompt with DEVICE_CREDENTIAL alone, so it asks for the PIN,
 * pattern or password and starts no fingerprint or face sensor (BiometricService: "If it's only
 * device credential, we don't need to wait" for a sensor). No negative button may be set with it.
 */
@TargetApi(30)
object PasscodePrompt {
  suspend fun ask(activity: Activity, title: String, subtitle: String): String =
    suspendCancellableCoroutine { continuation ->
      val cancel = CancellationSignal()
      continuation.invokeOnCancellation { cancel.cancel() }
      val prompt = try {
        BiometricPrompt.Builder(activity)
          .setTitle(title)
          .setSubtitle(subtitle)
          .setAllowedAuthenticators(BiometricManager.Authenticators.DEVICE_CREDENTIAL)
          .build()
      } catch (error: Exception) {
        continuation.resume("unavailable")
        return@suspendCancellableCoroutine
      }
      val callback = object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
          if (continuation.isActive) continuation.resume("passed")
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          if (!continuation.isActive) return
          continuation.resume(
            when (errorCode) {
              BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED, BiometricPrompt.BIOMETRIC_ERROR_CANCELED -> "cancelled"
              BiometricPrompt.BIOMETRIC_ERROR_NO_DEVICE_CREDENTIAL -> "no-lock"
              BiometricPrompt.BIOMETRIC_ERROR_HW_UNAVAILABLE, BiometricPrompt.BIOMETRIC_ERROR_HW_NOT_PRESENT -> "unavailable"
              else -> "failed"
            },
          )
        }
        // onAuthenticationFailed (a wrong PIN) leaves the prompt up for another try.
      }
      try {
        prompt.authenticate(cancel, activity.mainExecutor, callback)
      } catch (error: Exception) {
        if (continuation.isActive) continuation.resume("unavailable")
      }
    }
}
