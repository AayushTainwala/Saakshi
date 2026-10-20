package expo.modules.saakshisos

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews

/**
 * Quick trigger (spec S4) on Android: a home-screen widget and an optional ongoing notification,
 * both opening the app's code pad (saakshi://codepad). Android asks the user to unlock first when
 * the phone is locked.
 */
object QuickTrigger {
  private const val PREFS = "saakshi_sos"
  private const val KEY_ENABLED = "quick_notification_enabled"
  private const val KEY_TITLE = "quick_notification_title"
  private const val KEY_TEXT = "quick_notification_text"
  private const val KEY_ACTION = "quick_notification_action"
  private const val CHANNEL = "saakshi_quick"
  private const val NOTIFICATION_ID = 7112

  fun codePadIntent(context: Context, requestCode: Int = 0): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("saakshi://codepad"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  /** Shows the notification and remembers it, so it comes back after a restart. */
  fun showNotification(context: Context, title: String, text: String, action: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean(KEY_ENABLED, true)
      .putString(KEY_TITLE, title)
      .putString(KEY_TEXT, text)
      .putString(KEY_ACTION, action)
      .apply()
    post(context, title, text, action)
  }

  fun hideNotification(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, false).apply()
    manager(context).cancel(NOTIFICATION_ID)
  }

  fun notificationEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

  /** After a restart or an app update: shows the notification again if the user had it on. */
  fun restore(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_ENABLED, false)) return
    post(
      context,
      prefs.getString(KEY_TITLE, null) ?: "Saakshi",
      prefs.getString(KEY_TEXT, null) ?: "",
      prefs.getString(KEY_ACTION, null) ?: "SOS"
    )
  }

  private fun post(context: Context, title: String, text: String, action: String) {
    val manager = manager(context)
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, context.getString(R.string.saakshi_quick_channel), NotificationManager.IMPORTANCE_LOW)
          .apply { setShowBadge(false) }
      )
    }
    val builder = if (Build.VERSION.SDK_INT >= 26) {
      Notification.Builder(context, CHANNEL)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).setPriority(Notification.PRIORITY_LOW)
    }
    val notification = builder
      .setSmallIcon(R.drawable.saakshi_quick_notification)
      .setContentTitle(title)
      .setContentText(text)
      .setContentIntent(codePadIntent(context, 1))
      .addAction(Notification.Action.Builder(null as android.graphics.drawable.Icon?, action, codePadIntent(context, 2)).build())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(Notification.CATEGORY_STATUS)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .build()
    // Without POST_NOTIFICATIONS (Android 13+) this does nothing; the app asks for it first.
    runCatching { manager.notify(NOTIFICATION_ID, notification) }
  }

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}

class QuickWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    for (id in widgetIds) {
      val views = RemoteViews(context.packageName, R.layout.saakshi_quick_widget)
      views.setOnClickPendingIntent(R.id.saakshi_quick_widget_root, QuickTrigger.codePadIntent(context, 3))
      manager.updateAppWidget(id, views)
    }
  }
}

class QuickBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      QuickTrigger.restore(context)
    }
  }
}
