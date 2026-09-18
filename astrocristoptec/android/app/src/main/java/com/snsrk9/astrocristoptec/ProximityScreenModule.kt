package com.snsrk9.astrocristoptec

import android.annotation.SuppressLint
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.PowerManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ProximityScreenModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), SensorEventListener {

    private val sensorManager =
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val powerManager =
        reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
    private val proximitySensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)

    @SuppressLint("WakelockTimeout")
    private val proximityWakeLock: PowerManager.WakeLock? =
        if (powerManager.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
            powerManager.newWakeLock(
                PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK,
                "astrocristoptec:audioProximity"
            )
        } else {
            null
        }

    private var isMonitoring = false
    private var isEnabled = false

    override fun getName(): String = "ProximityScreen"

    @ReactMethod
    fun start() {
        if (isMonitoring || proximitySensor == null) {
            return
        }

        sensorManager.registerListener(
            this,
            proximitySensor,
            SensorManager.SENSOR_DELAY_NORMAL
        )
        isMonitoring = true
    }

    @ReactMethod
    fun setEnabled(enabled: Boolean) {
        isEnabled = enabled

        if (!enabled) {
            releaseWakeLock()
        }
    }

    @ReactMethod
    fun stop() {
        if (isMonitoring) {
            sensorManager.unregisterListener(this)
            isMonitoring = false
        }

        isEnabled = false
        releaseWakeLock()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isEnabled || event == null || proximitySensor == null) {
            releaseWakeLock()
            return
        }

        val distance = event.values.firstOrNull() ?: proximitySensor.maximumRange
        val isNear = distance < proximitySensor.maximumRange

        if (isNear) {
            acquireWakeLock()
        } else {
            releaseWakeLock()
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    @SuppressLint("WakelockTimeout")
    private fun acquireWakeLock() {
        val wakeLock = proximityWakeLock ?: return
        if (!wakeLock.isHeld) {
            wakeLock.acquire()
        }
    }

    private fun releaseWakeLock() {
        val wakeLock = proximityWakeLock ?: return
        if (wakeLock.isHeld) {
            wakeLock.release()
        }
    }
}
