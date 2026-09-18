package com.snsrk9.astrocristoptec

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity

class IncomingCallActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        val callId = intent.getStringExtra("callId")
        val callerName = intent.getStringExtra("callerName")
        val callType = intent.getStringExtra("callType")

        // 🔥 Deep link to Expo Router
        val deepLink = Intent(Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(
                "astrocristoptec://RingingScreen?callId=$callId&callerName=$callerName&callType=$callType"
            )
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        startActivity(deepLink)
        finish()
    }
}
