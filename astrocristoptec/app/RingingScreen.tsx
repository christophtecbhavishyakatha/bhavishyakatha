import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  NativeModules,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

const { CallManager } = NativeModules;
const API_BASE_URL = "https://bhavishyakatha.in/express/api/client/";

export default function RingingScreen() {
  const {
    callerName,
    callType,
    callId,
    channelName,
    channel_name: channelNameSnakeCase,
    astrologerId,
  } = useLocalSearchParams<{
    callerName?: string;
    callType?: string;
    callId?: string;
    channelName?: string;
    channel_name?: string;
    astrologerId?: string;
  }>();

  const [loading, setLoading] = useState(false);

  const name = callerName || "Incoming Call";
  const type = callType || "audio";
  const resolvedChannelName = channelName || channelNameSnakeCase;
  const resolvedAstrologerId = String(astrologerId || "");

  useEffect(() => {
    StatusBar.setBarStyle("light-content");

    console.log("RingingScreen data:", {
      callId,
      callType,
      astrologerId: resolvedAstrologerId,
      channelName: resolvedChannelName,
    });
  }, []);

  const stopNativeCall = () => {
    if (CallManager?.clearPendingIncomingCall) {
      CallManager.clearPendingIncomingCall();
    }

    if (CallManager?.stopRingtone) {
      CallManager.stopRingtone();
    }
  };

  const rejectCallApi = async () => {
    try {
      await fetch(`${API_BASE_URL}/reject-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: String(callId),
          astrologerId: resolvedAstrologerId,
        }),
      });
    } catch (error) {
      console.log("Reject API error:", error);
    }
  };

  const rejectChatApi = async () => {
    try {
      await fetch(`${API_BASE_URL}/reject-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: String(callId),
          astrologerId: resolvedAstrologerId,
        }),
      });
    } catch (error) {
      console.log("Reject API error:", error);
    }
  };

  const acceptCallApi = async () => {
    const response = await fetch(`${API_BASE_URL}/accept-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callId: String(callId),
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Call is no longer available");
    }
  };

  const handleReject = async () => {
    if (loading) return;

    setLoading(true);
    stopNativeCall();

    try {
      if (!callId) {
        return;
      }

      if (type !== "chat") {
        await rejectCallApi();
      } else {
        await rejectChatApi();
      }
    } finally {
      setLoading(false);
      router.replace("/");
    }
  };

  const handleAnswer = async () => {
    if (loading) return;

    setLoading(true);
    stopNativeCall();

    try {
      if (!callId) {
        throw new Error("Call ID is missing");
      }

      await acceptCallApi();
    } catch (error) {
      console.log("Accept API error:", error);
      setLoading(false);
      router.replace("/");
      return;
    }

    // AUDIO CALL
    if (type === "audio") {
      router.replace({
        pathname: "/audiocall",
        params: {
          fullName: name,
          callerName: name,
          callId: String(callId || ""),
          callType: "audio",
          astrologerId: resolvedAstrologerId,
        },
      });
    }

    // VIDEO CALL
    else if (type === "video") {
      router.replace({
        pathname: "/videocall",
        params: {
          fullName: name,
          callerName: name,
          callId: String(callId || ""),
          callType: "video",
          astrologerId: resolvedAstrologerId,
        },
      });
    }

    // CHAT
    else if (type === "chat") {
      router.replace({
        pathname: "/chat",
        params: {
          fullName: name,
          callerName: name,
          callId: String(callId || ""),
          callType: "chat",
          channelName: resolvedChannelName || "",
          astrologerId: resolvedAstrologerId,
        },
      });
    }

    // UNKNOWN TYPE
    else {
      router.replace({
        pathname: "/",
        params: {
          callerName: name,
          callId: String(callId || ""),
          astrologerId: resolvedAstrologerId,
        },
      });
    }
  };

  const getIcon = () => {
    if (type === "video") return "videocam";
    if (type === "chat") return "chatbubble";
    return "call";
  };

  return (
    <View style={styles.container}>
    <Text style={styles.appName}>Bhavishya Katha</Text>

      <Text style={styles.incomingText}>
        {type === "chat"
          ? "Incoming Chat Request"
          : `Incoming ${type} call`}
      </Text>

      <Ionicons
        name={getIcon()}
        size={80}
        color="#fff"
        style={{ marginVertical: 20 }}
      />

      <Text style={styles.name}>{name}</Text>

      {loading && (
        <View style={{ marginTop: 20 }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#aaa", marginTop: 10 }}>
            Processing...
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          disabled={loading}
          style={[
            styles.button,
            styles.reject,
            loading && { opacity: 0.5 },
          ]}
          onPress={handleReject}
        >
          <Ionicons name="call" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.button,
            styles.answer,
            loading && { opacity: 0.5 },
          ]}
          onPress={handleAnswer}
        >
          <Ionicons name="call" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  incomingText: {
    color: "#aaa",
    fontSize: 18,
  },
  name: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 60,
    width: "60%",
    justifyContent: "space-between",
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  reject: {
    backgroundColor: "#e53935",
    transform: [{ rotate: "135deg" }],
  },
  answer: {
    backgroundColor: "#43a047",
  },
  appName: {
  color: "#FFFFFF",
  fontSize: 32,
  fontWeight: "bold",
  marginBottom: 16,
  letterSpacing: 0.5,
},
});
