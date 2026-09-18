package com.snsrk9.astrocristoptec

import android.app.*
import android.content.Intent
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class CallForegroundService : Service() {

    companion object {
         var ringtone: Ringtone? = null
        const val CHANNEL_ID = "CALL_CHANNEL"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {

        val callId = intent?.getStringExtra("callId")
        val callerName = intent?.getStringExtra("callerName")
        val callType = intent?.getStringExtra("callType")

        createNotificationChannel()

val fullScreenIntent = Intent(this, IncomingCallActivity::class.java).apply {
            putExtra("callId", callId)
            putExtra("callerName", callerName)
            putExtra("callType", callType)
            // FIX: Use addFlags() instead of trying to reassign flags = ...
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Incoming $callType Call")
            .setContentText("Call from $callerName")
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .build()

        startForeground(1001, notification)

        startRingtone()

        return START_NOT_STICKY
    }

private fun startRingtone() {
        if (ringtone == null) {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            // Use the class name to be explicit since it's in the companion object
            CallForegroundService.ringtone = RingtoneManager.getRingtone(this, uri)
            CallForegroundService.ringtone?.play()
        }
    }

    fun stopRingtone() {
        ringtone?.stop()
        ringtone = null
        stopSelf()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
