package com.snsrk9.astrocristoptec

import android.content.Context
import android.content.Intent
import android.net.Uri

data class ActiveCallData(
    val route: String,
    val callId: String,
    val callerName: String,
    val callType: String,
    val astrologerId: String?
)

object ActiveCallState {
    private const val PREFS_NAME = "active_call_state"
    private const val KEY_ROUTE = "route"
    private const val KEY_CALL_ID = "call_id"
    private const val KEY_CALLER_NAME = "caller_name"
    private const val KEY_CALL_TYPE = "call_type"
    private const val DEFAULT_CALLER_NAME = "Astrologer"
    private const val KEY_ASTROLOGER_ID = "astrologer_id"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun normalizeRoute(route: String?, callType: String?): String {
        val cleanedRoute = route?.trim()?.removePrefix("/")
        return when {
            cleanedRoute == "videocall" -> "videocall"
            cleanedRoute == "chat" -> "chat"
            cleanedRoute == "audiocall" -> "audiocall"
            callType.equals("video", ignoreCase = true) -> "videocall"
            callType.equals("chat", ignoreCase = true) -> "chat"
            else -> "audiocall"
        }
    }

    fun normalizeCallType(callType: String?): String {
        return when {
            callType.equals("video", ignoreCase = true) -> "video"
            callType.equals("chat", ignoreCase = true) -> "chat"
            else -> "audio"
        }
    }

    fun save(
        context: Context,
        route: String?,
        callId: String?,
        callerName: String?,
        callType: String?,
        astrologerId: String?
    ) {
        if (callId.isNullOrBlank()) {
            return
        }

        val normalizedRoute = normalizeRoute(route, callType)
        val normalizedCallType = normalizeCallType(callType)

        prefs(context).edit()
            .putString(KEY_ROUTE, normalizedRoute)
            .putString(KEY_CALL_ID, callId)
            .putString(KEY_CALLER_NAME, callerName ?: DEFAULT_CALLER_NAME)
            .putString(KEY_CALL_TYPE, normalizedCallType)
            .putString(KEY_ASTROLOGER_ID, astrologerId)
            .apply()
    }

    fun get(context: Context): ActiveCallData? {
        val route = prefs(context).getString(KEY_ROUTE, null) ?: return null
        val callId = prefs(context).getString(KEY_CALL_ID, null) ?: return null
        val callerName = prefs(context).getString(KEY_CALLER_NAME, DEFAULT_CALLER_NAME)
            ?: DEFAULT_CALLER_NAME
        val callType = prefs(context).getString(KEY_CALL_TYPE, "audio") ?: "audio"
        val astrologerId = prefs(context).getString( KEY_ASTROLOGER_ID, null )

        return ActiveCallData(
            route = route,
            callId = callId,
            callerName = callerName,
            callType = callType,
            astrologerId = astrologerId
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
    callType: String?,
    astrologerId: String?
): Intent? {
    val savedCall = get(context)

    val resolvedCallId =
        callId ?: savedCall?.callId ?: return null

    val resolvedCallType =
        normalizeCallType(callType ?: savedCall?.callType)

    val resolvedRoute =
        normalizeRoute(
            route ?: savedCall?.route,
            resolvedCallType
        )

    val resolvedCallerName =
        callerName ?: savedCall?.callerName ?: DEFAULT_CALLER_NAME

    val resolvedAstrologerId =
        astrologerId ?: savedCall?.astrologerId

    val uriBuilder = Uri.Builder()
        .scheme("astrocristoptec")
        .authority(resolvedRoute)
        .appendQueryParameter("callId", resolvedCallId)
        .appendQueryParameter("fullName", resolvedCallerName)
        .appendQueryParameter("callerName", resolvedCallerName)
        .appendQueryParameter("callType", resolvedCallType)

    if (!resolvedAstrologerId.isNullOrBlank()) {
        uriBuilder.appendQueryParameter(
            "astrologerId",
            resolvedAstrologerId
        )
    }

    val uri = uriBuilder.build()

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
