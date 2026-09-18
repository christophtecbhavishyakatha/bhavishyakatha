package com.snsrk9.astrocristoptec

import android.content.Intent
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CallManagerModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallManager"

    @ReactMethod
    fun showIncomingCall(
        callId: String?,
        callerName: String?,
        callType: String?,
        channelName: String?,
        showNotification: Boolean,
        astrologerId: String?
    ) {
        if (callId.isNullOrBlank()) {
            return
        }

        val intent = Intent(reactContext, CallForegroundService::class.java).apply {
            putExtra("callId", callId)
            putExtra("callerName", callerName)
            putExtra("callType", callType)
            putExtra("channelName", channelName)
            putExtra("showNotification", showNotification)
            putExtra("astrologerId", astrologerId)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && showNotification) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopRingtone() {
        // Stop ringtone
        CallForegroundService.ringtone?.stop()
        CallForegroundService.ringtone = null
        PendingIncomingCallState.clear(reactContext)

        // Stop foreground service
        reactContext.getSystemService(NotificationManager::class.java).cancel(1001)
        val intent = Intent(reactContext, CallForegroundService::class.java)
        reactContext.stopService(intent)
    }

    @ReactMethod
    fun getPendingIncomingCall(promise: Promise) {
        val pendingCall = PendingIncomingCallState.get(reactContext)
        promise.resolve(
            pendingCall?.let { PendingIncomingCallState.toWritableMap(it) }
        )
    }

    @ReactMethod
    fun clearPendingIncomingCall() {
        PendingIncomingCallState.clear(reactContext)
    }
}
