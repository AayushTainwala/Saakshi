package expo.modules.saakshievidence

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import java.io.File

/**
 * Body-cam mode on Android: a foreground service (types camera and microphone) that owns
 * CameraRecorder, so recording carries on with the screen off, during calls and while the user
 * is in other apps. It must be started while the app is on screen (Android's while-in-use rule).
 */
class BodyCamService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> start(intent)
      ACTION_STOP -> stop()
    }
    return START_NOT_STICKY
  }

  private fun start(intent: Intent) {
    val notification = buildNotification(
      intent.getStringExtra(EXTRA_TITLE) ?: "Saakshi",
      intent.getStringExtra(EXTRA_TEXT) ?: "",
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }

    // Keep the CPU running with the screen off, so frames keep reaching the encoder.
    wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Saakshi:BodyCam")
      .apply { acquire() }

    val quality = intent.getIntExtra(EXTRA_QUALITY, 720)
    CameraRecorder.setPreview(null)
    CameraRecorder.open(this, quality)
    CameraRecorder.startRecording(
      CameraRecorder.Config(
        outputDir = File(intent.getStringExtra(EXTRA_OUTPUT_DIR)!!),
        pendingDir = File(intent.getStringExtra(EXTRA_PENDING_DIR)!!),
        pieceMillis = intent.getLongExtra(EXTRA_PIECE_MILLIS, 60_000L),
        quality = quality,
        clip = intent.getIntExtra(EXTRA_CLIP, 0),
        mode = "body-cam",
      ),
    )
    running = true
  }

  private fun stop() {
    CameraRecorder.stopRecording()
    CameraRecorder.close()
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    running = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  override fun onDestroy() {
    if (running) stop()
    super.onDestroy()
  }

  private fun buildNotification(title: String, text: String): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, title, NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) },
      )
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val open = launch?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .apply { if (open != null) setContentIntent(open) }
      .build()
  }

  companion object {
    const val ACTION_START = "expo.modules.saakshievidence.BODYCAM_START"
    const val ACTION_STOP = "expo.modules.saakshievidence.BODYCAM_STOP"
    const val EXTRA_OUTPUT_DIR = "outputDir"
    const val EXTRA_PENDING_DIR = "pendingDir"
    const val EXTRA_PIECE_MILLIS = "pieceMillis"
    const val EXTRA_QUALITY = "quality"
    const val EXTRA_CLIP = "clip"
    const val EXTRA_TITLE = "title"
    const val EXTRA_TEXT = "text"
    private const val CHANNEL_ID = "saakshi-bodycam"
    private const val NOTIFICATION_ID = 6301

    @Volatile var running = false
  }
}
