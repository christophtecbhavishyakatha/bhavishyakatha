package com.astrologer.bhavishyakatha
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
class CallServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "CallService"

    private fun launchForegroundService(intent: Intent) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (error: RuntimeException) {
            Log.e(TAG, "Unable to start foreground service", error)
        }
    }

    @ReactMethod
    fun start(
        callType: String?,
        requestId: String?,
        userId: String?,
        customerId: String?,
        fullName: String?
    ) {
        val intent = Intent(reactContext, CallForegroundService::class.java).apply {
            putExtra(CallForegroundService.EXTRA_CALL_TYPE, callType ?: "audio")
            requestId?.let { putExtra(CallForegroundService.EXTRA_REQUEST_ID, it) }
            userId?.let { putExtra(CallForegroundService.EXTRA_USER_ID, it) }
            customerId?.let { putExtra(CallForegroundService.EXTRA_CUSTOMER_ID, it) }
            fullName?.let { putExtra(CallForegroundService.EXTRA_FULL_NAME, it) }
        }
        launchForegroundService(intent)
    }
    @ReactMethod
    fun stop() {
        val intent = Intent(reactContext, CallForegroundService::class.java)
        reactContext.stopService(intent)
    }

    companion object {
        private const val TAG = "CallServiceModule"
    }
}
