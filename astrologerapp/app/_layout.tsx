import { Stack, router, usePathname } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, AppState, NativeModules, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ForceUpdateChecker from "../components/updateChecker";
import {
  getMessaging,
  getToken,
  onMessage,
  requestPermission,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import {
  clearActiveCallSession,
  getCurrentCallSession,
  hydrateActiveCallSession,
  subscribeToActiveCall,
  type ActiveCallSession,
} from "@/utils/callSession";
import AsyncStorage from "@react-native-async-storage/async-storage";

const messaging = getMessaging();
const { CallService } = NativeModules;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getTokenWithRetry = async (messaging: ReturnType<typeof getMessaging>) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await getToken(messaging);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = message.includes("SERVICE_NOT_AVAILABLE") && attempt < 3;

      if (!shouldRetry) break;
      await wait(1000 * attempt);
    }
  }

  throw lastError;
};


  
const getMessageDataValue = (value?: string | object | null) =>
  typeof value === "string" ? value : undefined;

const isIncomingSessionNotification = (msg: any) => {
  const callType = getMessageDataValue(msg?.data?.callType)?.toLowerCase();
  const requestId = getMessageDataValue(msg?.data?.requestId);
  const screen = getMessageDataValue(msg?.data?.screen);

  return (
    screen === "/(tabs)" &&
    Boolean(requestId) &&
    (callType === "audio" || callType === "video" || callType === "chat")
  );
};

export default function RootLayout() {
  const pathname = usePathname();
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(
    getCurrentCallSession()
  );
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncActiveCall = async () => {
      const hydratedSession = await hydrateActiveCallSession();
      const nativeSession = await CallService?.getStoredSession?.();

      if (!nativeSession) {
        if (hydratedSession) {
          await clearActiveCallSession();
        }
        setActiveCall(null);
        return;
      }

      setActiveCall(getCurrentCallSession());
    };

    void syncActiveCall();

    const appStateSubscription = AppState.addEventListener("change", nextState => {
      if (nextState === "active") {
        void syncActiveCall();
      }
    });

    const unsubscribe = subscribeToActiveCall(setActiveCall);

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const setup = async () => {
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) return;

      try {
        const token = await getTokenWithRetry(messaging);
      console.log("🔥 FCM Token:", token);
        console.log("Authorization status:", authStatus);
      } catch (error) {
        console.warn("Failed to get FCM token:", error);
      }
    };

    void setup().catch(error => console.warn("FCM setup failed:", error));

    const stopIncomingRing = () => {
      CallService?.stopIncomingRing?.();
    };

    const unsubMessage = onMessage(messaging, async msg => {
      try {
        if (isIncomingSessionNotification(msg) && getCurrentCallSession()) {
          return;
        }

        if (AppState.currentState !== "active") {
          return;
        }

        Alert.alert(
          msg.notification?.title ??
            getMessageDataValue(msg?.data?.title) ??
            "Notification",
          msg.notification?.body ??
            getMessageDataValue(msg?.data?.body) ??
            ""
        );
      } catch (error) {
        console.warn("Unable to display foreground notification alert:", error);
      }
    });

    const unsubOpen = onNotificationOpenedApp(messaging, msg => {
      stopIncomingRing();
      const screen = msg.data?.screen;
      if (screen) router.push(screen as any);
    });

    getInitialNotification(messaging).then(msg => {
      if (msg) {
        stopIncomingRing();
      }
      const screen = msg?.data?.screen;
      if (screen) {
        setTimeout(() => router.push(screen as any), 500);
      }
    });

    return () => {
      unsubMessage();
      unsubOpen();
    };
  }, []);

  useEffect(() => {
    const stopIncomingRing = () => {
      CallService?.stopIncomingRing?.();
    };

    const appStateSubscription = AppState.addEventListener("change", nextState => {
      if (nextState === "active") {
        stopIncomingRing();
      }
    });

    stopIncomingRing();

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (activeCall?.status !== "connected" || !activeCall.startedAt) {
      setElapsedLabel("00:00");
      return;
    }

    const updateTimer = () => {
      const totalSeconds = Math.max(
        0,
        Math.floor((Date.now() - activeCall.startedAt!) / 1000)
      );
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setElapsedLabel(
        hours > 0
          ? [hours, minutes, seconds]
              .map((value) => String(value).padStart(2, "0"))
              .join(":")
          : [minutes, seconds]
              .map((value) => String(value).padStart(2, "0"))
              .join(":")
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.startedAt, activeCall?.status]);

  const shouldShowCallBubble = useMemo(() => {
    if (!activeCall) {
      return false;
    }

    if (
      activeCall.callType !== "audio" &&
      activeCall.callType !== "video" &&
      activeCall.callType !== "chat"
    ) {
      return false;
    }

    return (
      pathname !== "/audiocall" &&
      pathname !== "/videocall" &&
      pathname !== "/chatbox"
    );
  }, [activeCall, pathname]);

  const returnToCall = () => {
    if (!activeCall) {
      return;
    }

    router.replace({
      pathname:
        activeCall.callType === "video"
          ? "/videocall"
          : activeCall.callType === "chat"
            ? "/chatbox"
            : "/audiocall",
      params: {
        id: activeCall.id,
        userId: activeCall.userId,
        customerId: activeCall.customerId,
        fullName: activeCall.fullName,
      },
    });
  };

  const bubbleTitle =
    activeCall?.callType === "video"
      ? "Video call in progress"
      : activeCall?.callType === "chat"
        ? "Chat in progress"
        : "Audio call in progress";

  const bubbleStatus =
    activeCall?.callType === "chat"
      ? "Tap here to return to chat"
      : activeCall?.status === "connected"
        ? elapsedLabel
        : activeCall?.status === "ringing"
          ? "Ringing..."
          : "Connecting...";
 const logout = async () => {
  Alert.alert(
    "Session Expired",
    "Parallel login detected. Please log in again.",
    [
      {
        text: "OK",
        onPress: async () => {
          try {
            const userId = await AsyncStorage.getItem("user_id");

            if (userId) {
              await fetch("https://bhavishyakatha.in/express/astrologer/status/update", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: userId,
                  status: "offline",
                  audio: 0,
                  video: 0,
                  chat: 0,
                }),
              });
            }

            await AsyncStorage.multiRemove([
              "user_id",
              "user_name",
              "user_phone",
              "user_photo",
              "user_languages",
              "user_categories",
              "user_specializations",
              "fcmToken",
            ]);

            router.replace("/login");
          } catch (error) {
            console.error("Force logout error:", error);
          }
        },
      },
    ],
    {
      cancelable: false,
    }
  );
};

 useEffect(() => {
    checkFcmToken();
  }, []);
const checkFcmToken = async () => {
    try {
      setLoading(true);
      const fcmToken = await AsyncStorage.getItem("fcmToken");

      // No stored token -> continue normally
      if (!fcmToken || fcmToken.trim() === "") {
        setLoading(false);
        return;
      }
console.log("Stored FCM Token:", fcmToken);
    const id = await AsyncStorage.getItem("user_id");
const ASTROLOGER_API = "https://bhavishyakatha.in/express/api/auth";

      const response = await fetch(
        `${ASTROLOGER_API}/verify-fcm-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fcmToken,
            user_id: id,
          }),
        }
      );

      const data = await response.json();
console.log("FCM Token verification response:", data);
      if (!data.success) {
        await logout();
        return;
      }

      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }finally {
      setLoading(false);
    }
  };
if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
            <ForceUpdateChecker />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {shouldShowCallBubble ? (
        <TouchableOpacity style={styles.callBubble} onPress={returnToCall}>
          <View style={styles.callDot} />
          <View style={styles.callBubbleTextWrap}>
            <Text style={styles.callBubbleTitle}>{bubbleTitle}</Text>
            <Text style={styles.callBubbleSubtitle}>{bubbleStatus}</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  callBubble: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0f172a",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  callBubbleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  callDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  callBubbleTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  callBubbleSubtitle: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
});
