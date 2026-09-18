package com.snsrk9.astrocristoptec

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CallManagerModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallManager"

    @ReactMethod
    fun stopRingtone() {
        // Stop ringtone
        CallForegroundService.ringtone?.stop()
        CallForegroundService.ringtone = null

        // Stop foreground service
        val intent = Intent(reactContext, CallForegroundService::class.java)
        reactContext.stopService(intent)
    }
}
