package expo.modules.saakshisos

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.Serializable
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SaakshiSosModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context", null)

  override fun definition() = ModuleDefinition {
    Name("SaakshiSos")

    lateinit var phonePicker: AppContextActivityResultLauncher<PickPhoneInput, Uri?>

    RegisterActivityContracts {
      phonePicker = registerForActivityResult(PickPhoneContract())
    }

    // Opens the contacts app's picker for phone numbers. The picker grants this app read access to
    // the one number picked, so READ_CONTACTS is never requested.
    AsyncFunction("pickPhoneNumber") Coroutine { ->
      val uri: Uri? = try {
        phonePicker.launch(PickPhoneInput())
      } catch (error: ActivityNotFoundException) {
        throw CodedException("ERR_NO_PICKER", "This phone has no contact picker", error)
      }
      if (uri == null) null else withContext(Dispatchers.IO) { readPickedPhone(uri) }
    }

    // True only in a build whose manifest declares SEND_SMS (the APK; spec S2) on a phone that can
    // send text messages.
    Function("canSendDirectly") {
      declaresSendSms() && canSendText()
    }

    AsyncFunction("sendDirect") Coroutine { phones: List<String>, message: String ->
      if (!declaresSendSms()) {
        throw CodedException("ERR_NOT_IN_BUILD", "This build does not send SMS by itself", null)
      }
      if (context.checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
        throw CodedException("ERR_NO_PERMISSION", "SEND_SMS has not been granted", null)
      }
      SmsSender(context).send(phones, message).map { it.toMap() }
    }
  }

  private fun readPickedPhone(uri: Uri): Map<String, String?>? {
    val columns = arrayOf(
      ContactsContract.CommonDataKinds.Phone.NUMBER,
      ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME
    )
    context.contentResolver.query(uri, columns, null, null, null)?.use { cursor ->
      if (!cursor.moveToFirst()) return null
      val number = cursor.getString(0)?.takeIf { it.isNotBlank() } ?: return null
      return mapOf("phone" to number, "name" to cursor.getString(1)?.takeIf { it.isNotBlank() })
    }
    return null
  }

  private fun declaresSendSms(): Boolean {
    val info = if (Build.VERSION.SDK_INT >= 33) {
      context.packageManager.getPackageInfo(
        context.packageName,
        PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
    }
    return info.requestedPermissions?.contains(Manifest.permission.SEND_SMS) == true
  }

  private fun canSendText(): Boolean {
    val feature = if (Build.VERSION.SDK_INT >= 33) {
      PackageManager.FEATURE_TELEPHONY_MESSAGING
    } else {
      PackageManager.FEATURE_TELEPHONY
    }
    return context.packageManager.hasSystemFeature(feature)
  }
}

class PickPhoneInput : Serializable

class PickPhoneContract : AppContextActivityResultContract<PickPhoneInput, Uri?> {
  override fun createIntent(context: Context, input: PickPhoneInput): Intent =
    Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI)

  override fun parseResult(input: PickPhoneInput, resultCode: Int, intent: Intent?): Uri? =
    if (resultCode == Activity.RESULT_OK) intent?.data else null
}
