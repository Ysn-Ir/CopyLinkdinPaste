package com.pfehunter.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import androidx.core.app.NotificationCompat

class RadarScreenshotService : Service() {

    private var contentObserver: ContentObserver? = null
    private var lastProcessedUri: String? = null
    private var lastProcessedTime: Long = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        registerScreenshotObserver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Keeps service alive
        return START_STICKY
    }

    private fun registerScreenshotObserver() {
        contentObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                if (uri != null) {
                    handleMediaChange(uri)
                }
            }
        }

        try {
            contentResolver.registerContentObserver(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                true,
                contentObserver!!
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun handleMediaChange(uri: Uri) {
        val now = System.currentTimeMillis()
        if (now - lastProcessedTime < 2000) return // Throttle duplicate events

        try {
            val projection = arrayOf(
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.DATA
            )
            contentResolver.query(uri, projection, null, null, "${MediaStore.Images.Media.DATE_ADDED} DESC")?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIdx = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME)
                    val dataIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATA)
                    val name = if (nameIdx >= 0) cursor.getString(nameIdx) else ""
                    val path = if (dataIdx >= 0) cursor.getString(dataIdx) else ""

                    val isScreenshot = (name != null && (name.contains("screenshot", ignoreCase = true) || name.contains("capture", ignoreCase = true)))
                            || (path != null && (path.contains("screenshots", ignoreCase = true) || path.contains("screen_shot", ignoreCase = true)))

                    if (isScreenshot && path != lastProcessedUri) {
                        lastProcessedUri = path
                        lastProcessedTime = now
                        postScreenshotNotification(name ?: "New Screenshot")
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun postScreenshotNotification(title: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("SCREENSHOT_CAPTURED", true)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val notification = NotificationCompat.Builder(this, "radar-captures")
            .setContentTitle("RADAR • Screenshot Detected")
            .setContentText("Tap to run OCR & classify offer into Vault")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setColor(0xFFFF3B30.toInt())
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(7701, notification)
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "radar-captures",
                "RADAR Opportunities & Captures",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies when a screenshot is captured for instant OCR"
                enableVibration(true)
                lightColor = 0xFFFF3B30.toInt()
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        contentObserver?.let {
            contentResolver.unregisterContentObserver(it)
        }
    }
}

