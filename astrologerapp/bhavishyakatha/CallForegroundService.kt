package com.astrologer.bhavishyakatha
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
class CallForegroundService : Service() {
    private var currentCallType: String = "audio"
    private var currentRequestId: String? = null
    private var currentUserId: String? = null
    private var currentCustomerId: String? = null
    private var currentFullName: String? = null
    override fun onCreate() {
        super.onCreate()
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        currentCallType = intent?.getStringExtra(EXTRA_CALL_TYPE)?.lowercase() ?: currentCallType
        currentRequestId = intent?.getStringExtra(EXTRA_REQUEST_ID) ?: currentRequestId
        currentUserId = intent?.getStringExtra(EXTRA_USER_ID) ?: currentUserId
        currentCustomerId = intent?.getStringExtra(EXTRA_CUSTOMER_ID) ?: currentCustomerId
        currentFullName = intent?.getStringExtra(EXTRA_FULL_NAME) ?: currentFullName

        try {
            startForegroundNotification()
        } catch (error: RuntimeException) {
            Log.e(TAG, "Unable to start active call foreground notification", error)
            stopSelf()
            return START_NOT_STICKY
        }

        return START_STICKY
    }
    private fun startForegroundNotification() {
        val channelId = "call_service_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Active Call",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.setSound(null, null)
            channel.enableVibration(false)
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
        val intent = Intent(Intent.ACTION_VIEW, buildDeepLink()).apply {
            flags =
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(getNotificationTitle())
            .setContentText(getNotificationBody())
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            notification,
            foregroundServiceTypeFor(currentCallType)
        )
    }
    private fun buildDeepLink(): Uri {
        val route = when (currentCallType) {
            "video", "videocall" -> "videocall"
            "chat", "chatbox" -> "chatbox"
            else -> "audiocall"
        }
        return Uri.Builder()
            .scheme("astrologerapp")
            .authority(route)
            .apply {
                currentRequestId?.let { appendQueryParameter("id", it) }
                currentUserId?.let { appendQueryParameter("userId", it) }
                currentCustomerId?.let { appendQueryParameter("customerId", it) }
                currentFullName?.let { appendQueryParameter("fullName", it) }
            }
            .build()
    }
    private fun getNotificationTitle(): String {
        return when (currentCallType) {
            "video", "videocall" -> "Video call in progress"
            "chat", "chatbox" -> "Chat in progress"
            else -> "Audio call in progress"
        }
    }
    private fun getNotificationBody(): String {
        return when (currentCallType) {
            "chat", "chatbox" -> "Tap to return to chat"
            else -> "Tap to return to call"
        }
    }
    override fun onBind(intent: Intent?): IBinder? = null

    private fun foregroundServiceTypeFor(callType: String): Int {
        return when (callType) {
            "audio", "audiocall", "video", "videocall" -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            else -> ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING
        }
    }

    companion object {
        private const val TAG = "CallForegroundService"
        private const val NOTIFICATION_ID = 1
        const val EXTRA_CALL_TYPE = "callType"
        const val EXTRA_REQUEST_ID = "requestId"
        const val EXTRA_USER_ID = "userId"
        const val EXTRA_CUSTOMER_ID = "customerId"
        const val EXTRA_FULL_NAME = "fullName"
    }
}
