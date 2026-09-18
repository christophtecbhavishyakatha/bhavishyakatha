package com.snsrk9.astrocristoptec

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object ActiveCallCleanup {
    private const val TAG = "ActiveCallCleanup"
    private const val END_CALL_URL = "https://bhavishyakatha.in/express/astrologer/call/end"

    fun endStoredCallAndClear(context: Context, reason: String) {
        val activeCall = ActiveCallState.get(context)

        if (activeCall?.callId.isNullOrBlank()) {
            ActiveCallState.clear(context)
            return
        }

        try {
            postEndCall(activeCall.callId)
            Log.d(TAG, "Ended active call from native cleanup: $reason")
        } catch (error: Exception) {
            Log.w(TAG, "Failed to end active call from native cleanup: $reason", error)
        } finally {
            ActiveCallState.clear(context)
        }
    }

    private fun postEndCall(callId: String) {
        val connection = (URL(END_CALL_URL).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 5000
            readTimeout = 5000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }

        try {
            val payload = JSONObject().put("call_id", callId).toString()

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload)
                writer.flush()
            }

            connection.responseCode
            connection.inputStream?.close()
            connection.errorStream?.close()
        } finally {
            connection.disconnect()
        }
    }
}
