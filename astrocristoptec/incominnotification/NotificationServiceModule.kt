
package com.snsrk9.astrocristoptec

import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*

class NotificationServiceModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "CallService"

    @ReactMethod
    fun start() {
        startInternal(null)
    }

    @ReactMethod
    fun startWithCallData(callData: ReadableMap?) {
        startInternal(callData)
    }

    private fun startInternal(callData: ReadableMap?) {
        val route = if (callData?.hasKey("route") == true && !callData.isNull("route")) {
            callData.getString("route")
        } else {
            null
        }
        val callId = if (callData?.hasKey("callId") == true && !callData.isNull("callId")) {
            callData.getString("callId")
        } else {
            null
        }
        val callerName = if (callData?.hasKey("callerName") == true && !callData.isNull("callerName")) {
            callData.getString("callerName")
        } else {
            null
        }
        val callType = if (callData?.hasKey("callType") == true && !callData.isNull("callType")) {
            callData.getString("callType")
        } else {
            null
        }

        if (callId.isNullOrBlank()) {
            return
        }

        val normalizedRoute = ActiveCallState.normalizeRoute(route, callType)
        ActiveCallState.save(reactContext, normalizedRoute, callId, callerName, callType)

        val intent = Intent(reactContext, NotificationFourgroundService::class.java).apply {
            putExtra("route", normalizedRoute)
            putExtra("callId", callId)
            putExtra("callerName", callerName)
            putExtra("callType", callType)
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (error: RuntimeException) {
            Log.e(TAG, "Unable to start active call service", error)
        }
    }

    @ReactMethod
    fun stop() {
        NotificationFourgroundService.skipCleanupForExplicitStop()
        ActiveCallState.clear(reactContext)
        val intent = Intent(reactContext, NotificationFourgroundService::class.java)
        reactContext.stopService(intent)
    }

    companion object {
        private const val TAG = "NotificationServiceModule"
    }
}
