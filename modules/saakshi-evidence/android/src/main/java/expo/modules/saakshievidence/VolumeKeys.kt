package expo.modules.saakshievidence

import android.app.Activity
import android.view.KeyEvent
import android.view.Window

/**
 * Reads the volume-down button while body-cam mode's lock screen is showing. The app's window
 * receives key events only while it is on screen with the screen on; with the screen off, Android
 * sends volume keys to the system (or to an active media session), not to the app. While enabled,
 * volume keys are consumed so the volume doesn't change.
 */
object VolumeKeys {
  var onVolumeDown: (() -> Unit)? = null
  private var installed: Pair<Window, Window.Callback>? = null

  private class Interceptor(private val wrapped: Window.Callback) : Window.Callback by wrapped {
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      return when (event.keyCode) {
        KeyEvent.KEYCODE_VOLUME_DOWN -> {
          if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) onVolumeDown?.invoke()
          true
        }
        KeyEvent.KEYCODE_VOLUME_UP -> true
        else -> wrapped.dispatchKeyEvent(event)
      }
    }
  }

  /** Call on the main thread. */
  fun enable(activity: Activity) {
    if (installed != null) return
    val window = activity.window
    val original = window.callback
    window.callback = Interceptor(original)
    installed = window to original
  }

  /** Call on the main thread. */
  fun disable() {
    val (window, original) = installed ?: return
    window.callback = original
    installed = null
  }
}
