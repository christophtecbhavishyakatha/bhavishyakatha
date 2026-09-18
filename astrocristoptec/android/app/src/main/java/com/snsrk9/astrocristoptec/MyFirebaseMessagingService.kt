package com.snsrk9.astrocristoptec

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"]?.uppercase()
        val callId = data["callId"]
        val callType = data["callType"]?.lowercase()
        val isCallCancelled =
            type == "CALL_CANCELLED" ||
                data["call_cancelled"] == "true" ||
                data["call_canelled"] == "true"

        if (isCallCancelled) {
            stopIncomingCallRinging()
            showMissedAstrologerCallNotification(data)
            return
        }

        val isIncomingSession =
            type == "INCOMING_CALL" ||
            type == "INCOMING_CHAT" ||
            (!callId.isNullOrBlank() && (callType == "audio" || callType == "video" || callType == "chat"))

        if (isIncomingSession) {
            if (isAppInForeground()) {
                return
            }
val astrologerId = data["astrologerId"]

            val channelName = data["channelName"] ?: data["channel_name"]
            val serviceIntent = Intent(this, CallForegroundService::class.java).apply {
                putExtra("callId", callId)
                putExtra("callerName", data["callerName"])
                putExtra("callType", callType)
                putExtra("channelName", channelName)
                putExtra("showNotification", true)
                putExtra("astrologerId", astrologerId)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }
    }

    private fun stopIncomingCallRinging() {
        CallForegroundService.ringtone?.stop()
        CallForegroundService.ringtone = null
        PendingIncomingCallState.clear(this)
        getSystemService(NotificationManager::class.java).cancel(1001)
        stopService(Intent(this, CallForegroundService::class.java))
    }

    private fun showMissedAstrologerCallNotification(data: Map<String, String>) {
        val channelId = "MISSED_ASTROLOGER_CALL_CHANNEL"
        val title = data["title"] ?: "Missed astrologer call"
        val body = data["body"] ?: "You have missed an astrologer call."
        val notificationManager = getSystemService(NotificationManager::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Missed astrologer calls",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            data["callId"]?.hashCode() ?: 0,
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.sym_call_missed)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(data["callId"]?.hashCode() ?: 2002, notification)
    }

    private fun isAppInForeground(): Boolean {
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            ?: return false
        val runningProcesses = activityManager.runningAppProcesses ?: return false

        return runningProcesses.any { process ->
            process.processName == packageName &&
                (
                    process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND ||
                        process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
                    )
        }
    }
}
