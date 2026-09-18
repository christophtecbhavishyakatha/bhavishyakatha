package com.snsrk9.astrocristoptec

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlin.concurrent.thread

class NotificationFourgroundService : Service() {
    private var cleanupTriggered = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        resetExplicitStopFlag()

        val activeCall = ActiveCallState.get(this)
        val route = intent?.getStringExtra("route") ?: activeCall?.route
        val callId = intent?.getStringExtra("callId") ?: activeCall?.callId
        val callerName = intent?.getStringExtra("callerName") ?: activeCall?.callerName
        val callType = intent?.getStringExtra("callType") ?: activeCall?.callType
        val astrologerId = intent?.getStringExtra("astrologerId") ?: activeCall?.astrologerId

        if (callId.isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }

        val resumeIntent = ActiveCallState.buildResumeIntent(
            context = this,
            route = route,
            callId = callId,
            callerName = callerName,
            callType = callType,
            astrologerId = astrologerId
        ) ?: run {
            stopSelf()
            return START_NOT_STICKY
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            callId.hashCode(),
            resumeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val normalizedCallType = ActiveCallState.normalizeCallType(callType)
        val title = when (normalizedCallType) {
            "video" -> "Video call in progress"
            "chat" -> "Chat in progress"
            else -> "Audio call in progress"
        }
        val contentText = if (!callerName.isNullOrBlank()) {
            "Tap to return to $callerName"
        } else {
            "Tap to return"
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(contentText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(pendingIntent)
            .build()

        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                foregroundServiceTypeFor(normalizedCallType)
            )
        } catch (error: RuntimeException) {
            Log.e(TAG, "Unable to start active call foreground notification", error)
            stopSelf()
            return START_NOT_STICKY
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        triggerCleanup("task_removed")
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        triggerCleanup("service_destroyed")
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    private fun triggerCleanup(reason: String) {
        if (cleanupTriggered) {
            return
        }

        cleanupTriggered = true

        if (consumeExplicitStopFlag()) {
            cleanupTriggered = false
            return
        }

        thread(start = true, name = "active-call-cleanup") {
            ActiveCallCleanup.endStoredCallAndClear(this, reason)
            stopSelf()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Active Call",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.setSound(null, null)
            channel.enableVibration(false)

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun foregroundServiceTypeFor(callType: String): Int {
        return when (callType) {
            "audio", "video" -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            else -> ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING
        }
    }

    companion object {
        private const val TAG = "NotificationFgService"
        private const val CHANNEL_ID = "call_service_channel"
        private const val NOTIFICATION_ID = 1
        @Volatile
        private var skipCleanupOnDestroy = false

        fun skipCleanupForExplicitStop() {
            skipCleanupOnDestroy = true
        }

        private fun resetExplicitStopFlag() {
            skipCleanupOnDestroy = false
        }

        private fun consumeExplicitStopFlag(): Boolean {
            val shouldSkip = skipCleanupOnDestroy
            skipCleanupOnDestroy = false
            return shouldSkip
        }
    }
}
