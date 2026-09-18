package com.snsrk9.astrocristoptec

import android.content.Context
import android.content.Intent
import android.net.Uri

data class ActiveCallData(
    val route: String,
    val callId: String,
    val callerName: String,
    val callType: String
)

object ActiveCallState {
    private const val PREFS_NAME = "active_call_state"
    private const val KEY_ROUTE = "route"
    private const val KEY_CALL_ID = "call_id"
    private const val KEY_CALLER_NAME = "caller_name"
    private const val KEY_CALL_TYPE = "call_type"
    private const val DEFAULT_CALLER_NAME = "Astrologer"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun normalizeRoute(route: String?, callType: String?): String {
        val cleanedRoute = route?.trim()?.removePrefix("/")
        return when {
            cleanedRoute == "videocall" -> "videocall"
            cleanedRoute == "audiocall" -> "audiocall"
            callType.equals("video", ignoreCase = true) -> "videocall"
            else -> "audiocall"
        }
    }

    fun save(
        context: Context,
        route: String?,
        callId: String?,
        callerName: String?,
        callType: String?
    ) {
        if (callId.isNullOrBlank()) {
            return
        }

        val normalizedRoute = normalizeRoute(route, callType)
        val normalizedCallType = if (callType.equals("video", ignoreCase = true)) {
            "video"
        } else {
            "audio"
        }

        prefs(context).edit()
            .putString(KEY_ROUTE, normalizedRoute)
            .putString(KEY_CALL_ID, callId)
            .putString(KEY_CALLER_NAME, callerName ?: DEFAULT_CALLER_NAME)
            .putString(KEY_CALL_TYPE, normalizedCallType)
            .apply()
    }

    fun get(context: Context): ActiveCallData? {
        val route = prefs(context).getString(KEY_ROUTE, null) ?: return null
        val callId = prefs(context).getString(KEY_CALL_ID, null) ?: return null
        val callerName = prefs(context).getString(KEY_CALLER_NAME, DEFAULT_CALLER_NAME)
            ?: DEFAULT_CALLER_NAME
        val callType = prefs(context).getString(KEY_CALL_TYPE, "audio") ?: "audio"

        return ActiveCallData(
            route = route,
            callId = callId,
            callerName = callerName,
            callType = callType
        )
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun buildResumeIntent(
        context: Context,
        route: String?,
        callId: String?,
        callerName: String?,
        callType: String?
    ): Intent? {
        val savedCall = get(context)
        val resolvedCallId = callId ?: savedCall?.callId ?: return null
        val resolvedRoute = normalizeRoute(route ?: savedCall?.route, callType ?: savedCall?.callType)
        val resolvedCallerName = callerName ?: savedCall?.callerName ?: DEFAULT_CALLER_NAME
        val resolvedCallType = if ((callType ?: savedCall?.callType).equals("video", ignoreCase = true)) {
            "video"
        } else {
            "audio"
        }

        val uri = Uri.Builder()
            .scheme("astrocristoptec")
            .authority(resolvedRoute)
            .appendQueryParameter("callId", resolvedCallId)
            .appendQueryParameter("fullName", resolvedCallerName)
            .appendQueryParameter("callerName", resolvedCallerName)
            .appendQueryParameter("callType", resolvedCallType)
            .build()

        return Intent(Intent.ACTION_VIEW, uri).apply {
            setPackage(context.packageName)
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }
    }
}
