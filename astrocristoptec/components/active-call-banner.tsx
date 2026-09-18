import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ActiveCallSession,
  buildActiveCallHref,
  isCallRoute,
} from "@/lib/activeCallSession";

type ActiveCallBannerProps = {
  pathname: string;
  session: ActiveCallSession | null;
};

export default function ActiveCallBanner({
  pathname,
  session,
}: ActiveCallBannerProps) {
  const insets = useSafeAreaInsets();

  if (!session || isCallRoute(pathname)) {
    return null;
  }

  const callLabel =
    session.callType === "video"
      ? "Video call in progress"
      : session.callType === "chat"
        ? "Chat in progress"
        : "Audio call in progress";

  const returnLabel =
    session.callType === "chat" ? "tap to return to chat" : "tap to return to call";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingTop: Math.max(insets.top, 12) }]}
    >
      <Pressable
        onPress={() => router.navigate(buildActiveCallHref(session) as never)}
        style={styles.banner}
      >
        <Text style={styles.title}>{callLabel}</Text>
        <Text style={styles.subtitle}>
          {session.callerName} - {returnLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 50,
  },
  banner: {
    backgroundColor: "#128C7E",
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    color: "#E6FFFA",
    fontSize: 12,
    marginTop: 2,
  },
});
