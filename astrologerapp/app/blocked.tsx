import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
    AppState,
    BackHandler,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "https://bhavishyakatha.in/express";

export default function BlockedScreen() {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;

    const checkBlockStatus = async () => {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/astrologer/home/${userId}`);
        const json = await response.json();

        if (active && !Boolean(Number(json?.data?.blocked_by_admin))) {
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error("Blocked screen status check error:", error);
      }
    };

    void checkBlockStatus();
    const interval = setInterval(() => void checkBlockStatus(), 15000);
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
  }, []);

  const raiseTicket = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      router.replace("/login");
      return;
    }

    router.replace("/(tabs)/support");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={34} color="#B91C1C" />
        </View>
        <Text style={styles.title}>Account Blocked</Text>
        <Text style={styles.message}>
          Your astrologer account has been blocked by the administrator. You
          cannot access the app until the account is unblocked.
        </Text>
        <TouchableOpacity
          style={styles.ticketButton}
          onPress={() => void raiseTicket()}
        >
          <Feather name="help-circle" size={18} color="#FFFFFF" />
          <Text style={styles.ticketButtonText}>Raise a Ticket</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderRadius: 20,
    padding: 28,
    backgroundColor: "#FFFFFF",
    shadowColor: "#7F1D1D",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    marginBottom: 18,
    backgroundColor: "#FEE2E2",
  },
  title: {
    color: "#7F1D1D",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    marginTop: 12,
    color: "#475569",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: "#B91C1C",
  },
  ticketButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
