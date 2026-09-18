import ActiveCallBanner from "@/components/active-call-banner";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ActiveCallSession,
  clearActiveCallSession,
  loadActiveCallSession,
  setActiveCallSession,
  subscribeActiveCallSession,
} from "@/lib/activeCallSession";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FirebaseMessagingTypes,
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, NativeModules, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ForceUpdateChecker from "./components/updateChecker";

const messaging = getMessaging();
const { CallManager, CallService } = NativeModules;

const getMessageDataValue = (value?: string | object | null) =>
  typeof value === "string" ? value : undefined;

const isCallCancelledNotification = (
  msg?: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  const type = getMessageDataValue(msg?.data?.type)?.toUpperCase();
  const cancelledFlag = getMessageDataValue(msg?.data?.call_cancelled);
  const canelledFlag = getMessageDataValue(msg?.data?.call_canelled);

  return (
    type === "CALL_CANCELLED" ||
    cancelledFlag === "true" ||
    canelledFlag === "true"
  );
};

const isIncomingSessionNotification = (
  msg?: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  const type = getMessageDataValue(msg?.data?.type)?.toUpperCase();
  const callType = getMessageDataValue(msg?.data?.callType)?.toLowerCase();
  const hasCallId = Boolean(getMessageDataValue(msg?.data?.callId));

  return (
    type === "INCOMING_CALL" ||
    type === "INCOMING_CHAT" ||
    (hasCallId &&
      (callType === "audio" || callType === "video" || callType === "chat"))
  );
};

const showMissedAstrologerNotification = async (
  msg?: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  const title =
    getMessageDataValue(msg?.data?.title) ?? "Missed astrologer call";
  const body =
    getMessageDataValue(msg?.data?.body) ??
    "You have missed an astrologer call.";

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          callId: getMessageDataValue(msg?.data?.callId),
          callType: getMessageDataValue(msg?.data?.callType),
          call_cancelled: "true",
          call_canelled: "true",
        },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Unable to show missed call notification:", error);
  }
};

const handleCallCancelledNotification = async (
  msg?: FirebaseMessagingTypes.RemoteMessage | null,
  pathname?: string,
) => {
  if (!isCallCancelledNotification(msg)) {
    return false;
  }

  CallManager?.clearPendingIncomingCall?.();
  CallManager?.stopRingtone?.();
  await showMissedAstrologerNotification(msg);

  if (pathname === "/RingingScreen") {
    router.replace("/");
  }

  return true;
};

const openIncomingSession = (
  msg?: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  if (!isIncomingSessionNotification(msg)) {
    return false;
  }

  const callId = getMessageDataValue(msg?.data?.callId);

  if (!callId) {
    return false;
  }

  const callerName =
    getMessageDataValue(msg?.data?.callerName) ?? "Incoming Call";
  const callType = getMessageDataValue(msg?.data?.callType) ?? "audio";
  const channelName =
    getMessageDataValue(msg?.data?.channelName) ??
    getMessageDataValue(msg?.data?.channel_name);
  const astrologerId = getMessageDataValue(msg?.data?.astrologerId);

  if (CallManager?.showIncomingCall) {
    CallManager.showIncomingCall(
      callId,
      callerName,
      callType,
      channelName,
      true,
      astrologerId,
    );
    return true;
  }

  router.push({
    pathname: "/RingingScreen",
    params: {
      callId,
      callerName,
      callType,
      channelName,
    },
  });

  return true;
};

const openIncomingSessionFromPayload = (payload?: {
  callId?: string;
  callerName?: string;
  callType?: string;
  channelName?: string;
  astrologerId?: string;
  showNotification?: boolean;
}) => {
  if (!payload?.callId) {
    return false;
  }

  const callId = payload.callId;
  const callerName = payload.callerName ?? "Incoming Call";
  const callType = payload.callType ?? "audio";
  const channelName = payload.channelName;
  const astrologerId = payload.astrologerId;
  const showNotification = payload.showNotification ?? false;

  if (CallManager?.showIncomingCall) {
    CallManager.showIncomingCall(
      callId,
      callerName,
      callType,
      channelName,
      showNotification,
      astrologerId,
    );
  }

  router.replace({
    pathname: "/RingingScreen",
    params: {
      callId,
      callerName,
      callType,
      channelName,
      astrologerId,
    },
  });

  return true;
};

const openIncomingSessionInApp = (
  msg?: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  if (!isIncomingSessionNotification(msg)) {
    return false;
  }

  const callId = getMessageDataValue(msg?.data?.callId);

  if (!callId) {
    return false;
  }

  const callerName =
    getMessageDataValue(msg?.data?.callerName) ?? "Incoming Call";
  const callType = getMessageDataValue(msg?.data?.callType) ?? "audio";
  const channelName =
    getMessageDataValue(msg?.data?.channelName) ??
    getMessageDataValue(msg?.data?.channel_name);
  const astrologerId = getMessageDataValue(msg?.data?.astrologerId);

  return openIncomingSessionFromPayload({
    callId,
    callerName,
    callType,
    channelName,
    astrologerId,
    showNotification: false,
  });
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout(props: any) {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [activeCallSession, setActiveCallSessionState] =
    useState<ActiveCallSession | null>(null);
  const restoredPendingIncomingCallIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const restorePendingIncomingCall = async () => {
    const pendingCall = await CallManager?.getPendingIncomingCall?.();

    if (!pendingCall?.callId) {
      restoredPendingIncomingCallIdRef.current = null;
      return;
    }

    if (
      restoredPendingIncomingCallIdRef.current === pendingCall.callId &&
      pathname === "/RingingScreen"
    ) {
      return;
    }

    restoredPendingIncomingCallIdRef.current = pendingCall.callId;

    openIncomingSessionFromPayload({
      callId: pendingCall.callId,
      callerName: pendingCall.callerName,
      callType: pendingCall.callType,
      channelName: pendingCall.channelName,
      astrologerId: pendingCall.astrologerId,
      showNotification: false,
    });
  };

  useEffect(() => {
    const requestNotificationPermission = async () => {
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    };

    void requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (props?.openScreen === "RingingScreen") {
    }

    const unsubMessage = onMessage(messaging, async (msg) => {
      if (await handleCallCancelledNotification(msg, pathname)) {
        restoredPendingIncomingCallIdRef.current = null;
        return;
      }

      if (AppState.currentState === "active" && openIncomingSessionInApp(msg)) {
        restoredPendingIncomingCallIdRef.current =
          getMessageDataValue(msg?.data?.callId) ?? null;
        return;
      }

      if (openIncomingSession(msg)) {
        return;
      }

     await Notifications.scheduleNotificationAsync({
  content: {
    title: msg.notification?.title ?? "Notification",
    body: msg.notification?.body ?? "",
    data: msg.data ?? {},
    sound: "default",
  },
  trigger: null,
});
    });

    const unsubOpen = onNotificationOpenedApp(messaging, async (msg) => {
      if (await handleCallCancelledNotification(msg, pathname)) {
        restoredPendingIncomingCallIdRef.current = null;
        return;
      }

      if (openIncomingSession(msg)) {
        return;
      }

      const screen = msg.data?.screen;
      if (screen) router.push(screen as any);
    });

    getInitialNotification(messaging).then(async (msg) => {
      if (await handleCallCancelledNotification(msg, pathname)) {
        restoredPendingIncomingCallIdRef.current = null;
        return;
      }

      if (openIncomingSession(msg)) {
        return;
      }

      const screen = msg?.data?.screen;
      if (screen) {
        setTimeout(() => router.push(screen as any), 500);
      }
    });

    void restorePendingIncomingCall();

    return () => {
      unsubMessage();
      unsubOpen();
    };
  }, [pathname, props?.openScreen]);

  useEffect(() => {
    const syncActiveCall = async () => {
      const nativeSession = await CallService?.getStoredSession?.();
      const storedSession = await loadActiveCallSession();

      if (nativeSession) {
        const session = await setActiveCallSession(nativeSession);
        setActiveCallSessionState(session);
        return;
      }

      if (storedSession) {
        await clearActiveCallSession();
      }

      setActiveCallSessionState(null);
    };

    void syncActiveCall();

    const unsubscribe = subscribeActiveCallSession(setActiveCallSessionState);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void syncActiveCall();
          void restorePendingIncomingCall();
        }
      },
    );

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [pathname]);



  if (loading) {
    return (
      <SafeAreaProvider>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <ForceUpdateChecker />
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ActiveCallBanner pathname={pathname} session={activeCallSession} />
        <Stack>
          <Stack.Screen name="language" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="service" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="transaction-history"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="call-history" options={{ headerShown: false }} />
          <Stack.Screen name="chat-history" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat-history-room"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="transaction-detail"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="RingingScreen" options={{ headerShown: false }} />
          <Stack.Screen name="audiocall" options={{ headerShown: false }} />
          <Stack.Screen name="videocall" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
