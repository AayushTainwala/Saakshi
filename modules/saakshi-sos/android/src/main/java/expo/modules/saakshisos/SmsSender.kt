package expo.modules.saakshisos

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import java.util.UUID
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull

data class SmsResult(val phone: String, val status: String, val errorCode: Int?, val error: String?) {
  fun toMap(): Map<String, Any?> = mapOf(
    "phone" to phone,
    "status" to status,
    "errorCode" to errorCode,
    "error" to error
  )
}

/**
 * Sends one message to several numbers through the default SMS subscription and waits for the
 * radio's "sent" report for every part. A part with no report after [TIMEOUT_MS] counts as unknown.
 */
class SmsSender(private val context: Context) {
  suspend fun send(phones: List<String>, message: String): List<SmsResult> {
    val sms = smsManager()
    val parts = sms.divideMessage(message)
    val codes = Array(phones.size) { IntArray(parts.size) { PENDING } }
    val errors = arrayOfNulls<String>(phones.size)
    var remaining = phones.size * parts.size
    val done = CompletableDeferred<Unit>()

    // One action per call, so reports from an earlier alert can't be mistaken for this one's.
    val action = "${context.packageName}.SOS_SMS_SENT.${UUID.randomUUID()}"
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        val recipient = intent.getIntExtra(EXTRA_RECIPIENT, -1)
        val part = intent.getIntExtra(EXTRA_PART, -1)
        if (recipient !in phones.indices || part !in parts.indices) return
        record(recipient, part, resultCode)
      }

      fun record(recipient: Int, part: Int, code: Int) {
        synchronized(codes) {
          if (codes[recipient][part] == PENDING) {
            codes[recipient][part] = code
            remaining--
            if (remaining == 0) done.complete(Unit)
          }
        }
      }
    }
    register(receiver, IntentFilter(action))

    try {
      for ((recipient, phone) in phones.withIndex()) {
        val sent = ArrayList<PendingIntent>(parts.size)
        for (part in parts.indices) {
          val intent = Intent(action)
            .setPackage(context.packageName)
            .putExtra(EXTRA_RECIPIENT, recipient)
            .putExtra(EXTRA_PART, part)
          // Distinct request codes keep each part's PendingIntent separate.
          sent.add(
            PendingIntent.getBroadcast(
              context,
              recipient * MAX_PARTS + part,
              intent,
              PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT
            )
          )
        }
        try {
          if (parts.size == 1) {
            sms.sendTextMessage(phone, null, parts[0], sent[0], null)
          } else {
            sms.sendMultipartTextMessage(phone, null, parts, sent, null)
          }
        } catch (error: Exception) {
          errors[recipient] = error.message ?: error.javaClass.simpleName
          for (part in parts.indices) receiver.record(recipient, part, SmsManager.RESULT_ERROR_GENERIC_FAILURE)
        }
      }
      if (remaining > 0) withTimeoutOrNull(TIMEOUT_MS) { done.await() }
    } finally {
      context.unregisterReceiver(receiver)
    }

    return synchronized(codes) {
      phones.mapIndexed { recipient, phone ->
        val failure = codes[recipient].firstOrNull { it != Activity.RESULT_OK && it != PENDING }
        when {
          failure != null -> SmsResult(phone, "failed", failure, errors[recipient])
          codes[recipient].any { it == PENDING } -> SmsResult(phone, "unknown", null, null)
          else -> SmsResult(phone, "sent", null, null)
        }
      }
    }
  }

  private fun smsManager(): SmsManager =
    if (Build.VERSION.SDK_INT >= 31) {
      context.getSystemService(SmsManager::class.java)
    } else {
      @Suppress("DEPRECATION")
      SmsManager.getDefault()
    }

  private fun register(receiver: BroadcastReceiver, filter: IntentFilter) {
    if (Build.VERSION.SDK_INT >= 33) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(receiver, filter)
    }
  }

  companion object {
    private const val EXTRA_RECIPIENT = "recipient"
    private const val EXTRA_PART = "part"
    private const val PENDING = Int.MIN_VALUE
    private const val MAX_PARTS = 100
    private const val TIMEOUT_MS = 60_000L
  }
}
