import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  NativeModules,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  useWindowDimensions,
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
  const { width, height } = useWindowDimensions();
  const outerRingPulse = useRef(new Animated.Value(0)).current;
  const middleRingPulse = useRef(new Animated.Value(0)).current;

  const scale = Math.min(Math.max(Math.min(width / 375, height / 812), 0.78), 1.12);
  const styles = useMemo(() => createStyles(scale, width), [scale, width]);

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

  useEffect(() => {
    const createPulse = (value: Animated.Value, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const outerAnimation = createPulse(outerRingPulse);
    const middleAnimation = createPulse(middleRingPulse, 450);
    outerAnimation.start();
    middleAnimation.start();

    return () => {
      outerAnimation.stop();
      middleAnimation.stop();
    };
  }, [middleRingPulse, outerRingPulse]);

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
      <View style={styles.content}>
        <View style={styles.logoFrame}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Bhavishya Katha</Text>

        <Text style={styles.incomingText}>
          {type === "chat"
            ? "Incoming Chat Request"
            : `Incoming ${type} call`}
        </Text>

        <TouchableOpacity
          disabled={loading}
          activeOpacity={0.85}
          onPress={handleAnswer}
          hitSlop={12 * scale}
          accessibilityRole="button"
          accessibilityLabel={type === "chat" ? "Accept chat" : "Accept call"}
          style={styles.requestIcon}
        >
          <Animated.View
            style={[
              styles.requestIconRingOuter,
              {
                opacity: outerRingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.12] }),
                transform: [{ scale: outerRingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.08] }) }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.requestIconRingMiddle,
              {
                opacity: middleRingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0.2] }),
                transform: [{ scale: middleRingPulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.08] }) }],
              },
            ]}
          />
          <View style={styles.requestIconCircle}>
            <Ionicons name={getIcon()} size={styles.requestIconGlyph.fontSize} color="#351047" />
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{name}</Text>
        <Text style={styles.requestDescription}>
          has accepted your consultation request
        </Text>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size={32 * scale} color="#fff" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <View style={styles.action}>
          <TouchableOpacity
            disabled={loading}
            style={[styles.button, styles.reject, loading && styles.disabled]}
            onPress={handleReject}
          >
            <Ionicons name="call" size={styles.buttonIcon.fontSize} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Decline</Text>
        </View>

        <View style={styles.action}>
          <TouchableOpacity
            disabled={loading}
            style={[styles.button, styles.answer, loading && styles.disabled]}
            onPress={handleAnswer}
          >
            <Ionicons name={type === "chat" ? "chatbubble" : getIcon()} size={styles.buttonIcon.fontSize} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>
            {type === "chat" ? "Accept Chat" : "Accept Call"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (scale: number, width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1d032d",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24 * scale,
  },
  content: {
    alignItems: "center",
    width: "100%",
    marginTop: 8 * scale,
  },
  logoFrame: {
    width: 0 * scale,
    height: 0 * scale,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#21052f",
    borderRadius: 12 * scale,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 12 * scale,
    shadowOffset: { width: 0, height: 7 * scale },
    elevation: 8 * scale,
    marginBottom: 26 * scale,
  },
  logo: {
    width: 112 * scale,
    height: 112 * scale,
  },
  incomingText: {
    color: "#dd98f8",
    fontSize: 20 * scale,
    fontWeight: "500",
    marginTop: 26 * scale,
  },
  name: {
    color: "#fff",
    fontSize: 30 * scale,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 18 * scale,
  },
  requestDescription: {
    color: "#dd98f8",
    fontSize: 15 * scale,
    textAlign: "center",
    marginTop: 10 * scale,
  },
  requestIcon: {
    width: 210 * scale,
    height: 190 * scale,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26 * scale,
  },
  requestIconRingOuter: {
    position: "absolute",
    width: 210 * scale,
    height: 210 * scale,
    borderRadius: 105 * scale,
    backgroundColor: "rgba(104, 45, 139, 0.16)",
  },
  requestIconRingMiddle: {
    position: "absolute",
    width: 170 * scale,
    height: 170 * scale,
    borderRadius: 85 * scale,
    backgroundColor: "rgba(122, 54, 160, 0.28)",
  },
  requestIconCircle: {
    width: 112 * scale,
    height: 112 * scale,
    borderRadius: 56 * scale,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 42 * scale,
    width: Math.min(width * 0.86, 360 * scale),
    justifyContent: "space-around",
    alignItems: "flex-start",
  },
  action: {
    alignItems: "center",
    minWidth: 115 * scale,
  },
  button: {
    width: 108 * scale,
    height: 108 * scale,
    borderRadius: 54 * scale,
    justifyContent: "center",
    alignItems: "center",
  },
  reject: {
    backgroundColor: "#f22f36",
    transform: [{ rotate: "135deg" }],
  },
  answer: {
    backgroundColor: "#18b930",
  },
  disabled: {
    opacity: 0.5,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 19 * scale,
    marginTop: 22 * scale,
    textAlign: "center",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 32 * scale,
    fontWeight: "bold",
    letterSpacing: 0.5 * scale,
  },
  loading: {
    position: "absolute",
    bottom: 28 * scale,
    alignItems: "center",
  },
  loadingText: {
    color: "#aaa",
    marginTop: 10 * scale,
  },
  buttonIcon: {
    fontSize: 34 * scale,
  },
  requestIconGlyph: {
    fontSize: 54 * scale,
  },
});
