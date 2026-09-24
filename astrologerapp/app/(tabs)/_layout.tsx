import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Tabs, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_BASE = "https://bhavishyakatha.in/express";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [checkingBlockStatus, setCheckingBlockStatus] = useState(true);

  const isSupportRoute = pathname.endsWith("/support");

  useEffect(() => {
    let active = true;

    const checkBlockStatus = async () => {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        if (active) setCheckingBlockStatus(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/astrologer/home/${userId}`);
        const json = await response.json();
        const isBlocked = Boolean(Number(json?.data?.blocked_by_admin));

        if (!active) return;

        setCheckingBlockStatus(false);

        if (isBlocked && !isSupportRoute && pathname !== "/blocked") {
          router.replace("/blocked");
        } else if (!isBlocked && pathname === "/blocked") {
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error("Block status check error:", error);
        if (active) setCheckingBlockStatus(false);
      }
    };

    void checkBlockStatus();

    const interval = setInterval(() => {
      void checkBlockStatus();
    }, 15000);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void checkBlockStatus();
      },
    );

    return () => {
      active = false;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [isSupportRoute, pathname]);

  if (checkingBlockStatus && !isSupportRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: "#000000",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bank-details"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.circle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: "Photos",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="photo.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chatList"
        options={{
          title: "Photos",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="photo.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chatroom"
        options={{
          title: "Photos",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="photo.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="withdrawalHistory"
        options={{
          title: "Photos",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="photo.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="QuickMessage"
        options={{
          title: "Photos",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="photo.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="feedback"
        options={{
          title: "Photos",
          href: null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="photo.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
});
