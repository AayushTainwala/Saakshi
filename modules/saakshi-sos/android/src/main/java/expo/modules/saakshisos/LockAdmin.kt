package expo.modules.saakshisos

import android.app.Activity
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import java.io.Serializable
import kotlinx.coroutines.delay

/**
 * "Lock the phone when 'My phone is being taken' starts" (SPEC 5.4; round 2, group 1.7).
 *
 * Android's device-admin permission with the force-lock policy only: the policy file
 * (res/xml/saakshi_lock_admin.xml) declares <force-lock/> and nothing else, so Saakshi can lock the
 * screen and do nothing more (no wipe, no password rules). It is switched on only by the user, on
 * Android's own "Activate device admin app?" screen, and switched off from Saakshi's Settings in one
 * step (removeActiveAdmin), or from Android's settings. No permission is requested for it: the
 * receiver is protected by BIND_DEVICE_ADMIN, which only the system holds.
 *
 * Keep the receiver's class name: Android switches the admin off if it changes in an update.
 */
class LockAdminReceiver : DeviceAdminReceiver()

object LockAdmin {
  fun component(context: Context) = ComponentName(context, LockAdminReceiver::class.java)

  private fun policyManager(context: Context): DevicePolicyManager? =
    context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager?

  /** False on the rare phone without device admin (FEATURE_DEVICE_ADMIN). */
  fun supported(context: Context): Boolean =
    context.packageManager.hasSystemFeature(PackageManager.FEATURE_DEVICE_ADMIN) && policyManager(context) != null

  /** True while the user has it switched on (it can be switched off in Android's settings too). */
  fun isActive(context: Context): Boolean =
    try {
      policyManager(context)?.isAdminActive(component(context)) == true
    } catch (error: SecurityException) {
      false
    }

  /** Locks the screen now, as if its timeout had run out. False if the admin isn't on. */
  fun lockNow(context: Context): Boolean {
    if (!isActive(context)) return false
    return try {
      policyManager(context)?.lockNow()
      true
    } catch (error: SecurityException) {
      false
    }
  }

  /**
   * Switches the admin off. Android does this a moment later ("the operation is not synchronous"),
   * so wait up to about two seconds for it, then say whether it is still on.
   */
  suspend fun removeAndWait(context: Context): Boolean {
    if (!isActive(context)) return false
    policyManager(context)?.removeActiveAdmin(component(context))
    repeat(20) {
      if (!isActive(context)) return false
      delay(100)
    }
    return isActive(context)
  }
}

class AddLockAdminInput(val explanation: String) : Serializable

/**
 * Android's own "Activate device admin app?" screen, with Saakshi's explanation on it
 * (EXTRA_ADD_EXPLANATION). Resolves true if the user chose to activate it.
 */
class AddLockAdminContract : AppContextActivityResultContract<AddLockAdminInput, Boolean> {
  override fun createIntent(context: Context, input: AddLockAdminInput): Intent =
    Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
      .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, LockAdmin.component(context))
      .putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, input.explanation)

  override fun parseResult(input: AddLockAdminInput, resultCode: Int, intent: Intent?): Boolean =
    resultCode == Activity.RESULT_OK
}
