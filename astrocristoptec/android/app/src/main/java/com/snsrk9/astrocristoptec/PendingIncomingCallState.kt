package com.snsrk9.astrocristoptec

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class PendingIncomingCallData(
    val callId: String,
    val callerName: String,
    val callType: String,
    val channelName: String?,
    val astrologerId: String?
)

object PendingIncomingCallState {
    private const val PREFS_NAME = "pending_incoming_call_state"
    private const val KEY_CALL_ID = "call_id"
    private const val KEY_CALLER_NAME = "caller_name"
    private const val KEY_CALL_TYPE = "call_type"
    private const val KEY_CHANNEL_NAME = "channel_name"
    private const val KEY_ASTROLOGER_ID = "astrologer_id"
    private const val DEFAULT_CALLER_NAME = "Incoming Call"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(
        context: Context,
        callId: String?,
        callerName: String?,
        callType: String?,
        channelName: String?,
        astrologerId: String?
    ) {
        if (callId.isNullOrBlank()) {
            return
        }

        prefs(context).edit()
            .putString(KEY_CALL_ID, callId)
            .putString(KEY_CALLER_NAME, callerName ?: DEFAULT_CALLER_NAME)
            .putString(KEY_CALL_TYPE, ActiveCallState.normalizeCallType(callType))
            .putString(KEY_CHANNEL_NAME, channelName)
            .putString(KEY_ASTROLOGER_ID, astrologerId)
            .apply()
    }

    fun get(context: Context): PendingIncomingCallData? {
        val callId = prefs(context).getString(KEY_CALL_ID, null) ?: return null
        val callerName = prefs(context).getString(KEY_CALLER_NAME, DEFAULT_CALLER_NAME)
            ?: DEFAULT_CALLER_NAME
        val callType = prefs(context).getString(KEY_CALL_TYPE, "audio") ?: "audio"
        val channelName = prefs(context).getString(KEY_CHANNEL_NAME, null)
        val astrologerId = prefs(context).getString(KEY_ASTROLOGER_ID, null)

        return PendingIncomingCallData(
            callId = callId,
            callerName = callerName,
            callType = callType,
            channelName = channelName,
            astrologerId = astrologerId
        )
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun toWritableMap(call: PendingIncomingCallData): WritableMap =
        Arguments.createMap().apply {
            putString("callId", call.callId)
            putString("callerName", call.callerName)
            putString("callType", call.callType)
            putString("channelName", call.channelName)
            putString("astrologerId", call.astrologerId)
        }
}
