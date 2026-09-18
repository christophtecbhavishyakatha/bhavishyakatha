package com.snsrk9.astrocristoptec

import android.content.Intent
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.util.Log

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Extract data safely
        val data = remoteMessage.data

        if (data["type"] == "INCOMING_CALL") {
            // Use 'this' as context and explicitly reference the Class
            val serviceIntent = Intent(this, CallForegroundService::class.java).apply {
                putExtra("callId", data["callId"])
                putExtra("callerName", data["callerName"])
                putExtra("callType", data["callType"])
            }

            // For Android 8.0+ 
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        }
    }
}