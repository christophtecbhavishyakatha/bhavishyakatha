import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "https://bhavishyakatha.in/express/api/admin";

const MENU_ITEMS = [
  {
    label: "Pending Astrologers",
    route: "/(adminTab)/pendingAstrologer",
    icon: <MaterialIcons name="pending-actions" size={22} color="#fff" />,
    colors: ["#7C3AED", "#A855F7"] as const,
  },
  {
    label: "Verified Astrologers",
    route: "/(adminTab)/verified",
    icon: (
      <Ionicons name="checkmark-done-circle-outline" size={22} color="#fff" />
    ),
    colors: ["#0EA5E9", "#38BDF8"] as const,
  },
  {
    label: "View Tickets",
    route: "/(adminTab)/ticket",
    icon: <Ionicons name="help-circle-outline" size={22} color="#fff" />,
    colors: ["#F59E0B", "#FCD34D"] as const,
  },
  {
    label: "Social Posts",
    route: "/(adminTab)/social-posts",
    icon: <Ionicons name="newspaper-outline" size={22} color="#fff" />,
    colors: ["#EC4899", "#F9A8D4"] as const,
  },
  {
    label: "Wallet Report",
    route: "/(adminTab)/walletBalance",
    icon: <Ionicons name="card" size={22} color="#fff" />,
    colors: ["#10B981", "#6EE7B7"] as const,
  },
  {
    label: "Recharge Logs",
    route: "/(adminTab)/rechargeLogs",
    icon: <Ionicons name="card-outline" size={22} color="#fff" />,
    colors: ["#06B6D4", "#67E8F9"] as const,
  },
  {
    label: "Call Logs",
    route: "/(adminTab)/callLogs",
    icon: <Ionicons name="call" size={22} color="#fff" />,
    colors: ["#8B5CF6", "#C4B5FD"] as const,
  },
  {
    label: "All Users",
    route: "/(adminTab)/users",
    icon: <Ionicons name="people" size={22} color="#fff" />,
    colors: ["#EF4444", "#FCA5A5"] as const,
  },
  {
    label: "Astrologers Call Logs",
    route: "/(adminTab)/astrologerLogs",
    icon: <Ionicons name="people" size={22} color="#fff" />,
    colors: ["#F97316", "#FDBA74"] as const,
  },
  {
    label: "Notification Controller",
    route: "/(adminTab)/notification",
    icon: <Ionicons name="send" size={22} color="#fff" />,
    colors: ["#706c69", "#cd975c"] as const,
  },
  {
    label: "Comment Controller",
    route: "/(adminTab)/comment",
    icon: <Ionicons name="chatbubbles" size={22} color="#fff" />,
    colors: ["#6b5849", "#FDBA74"] as const,
  },
];

export default function AdminDashboard() {
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingTicketCount, setPendingTicketCount] = useState(0);

  useEffect(() => {
    loadAdmin();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadPendingTicketCount();
    }, []),
  );

  const loadPendingTicketCount = async () => {
    try {
      const response = await fetch(`${API_BASE}/tickets/pending-count`);
      const json = await response.json();
      if (response.ok && json.success) {
        setPendingTicketCount(Number(json.count || 0));
      }
    } catch (error) {
      console.error("Load pending ticket count error:", error);
    }
  };

  const loadAdmin = async () => {
    try {
      const adminId = await AsyncStorage.getItem("admin_id");
      if (!adminId) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`${API_BASE}/admin-profile/${adminId}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed");
      }
      setAdminName(json.data.name);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    await AsyncStorage.removeItem("admin_id");
    router.replace("/login");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAdmin();
    await loadPendingTicketCount();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#A855F7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#0F0C29", "#302B63", "#24243E"] as const}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {adminName ? adminName[0].toUpperCase() : "A"}
            </Text>
          </View>
          <View>
            <Text style={styles.welcome}>Welcome back 👋</Text>
            <Text style={styles.adminName}>{adminName}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logOut}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh admin dashboard"
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Scrollable Cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.85}
            onPress={() => router.push(item.route)}
          >
            <LinearGradient
              colors={item.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.iconBox}>{item.icon}</View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{item.label}</Text>
                {item.route === "/(adminTab)/ticket" &&
                pendingTicketCount > 0 ? (
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketBadgeText}>
                      {pendingTicketCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.6)"
                style={styles.chevron}
              />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0C29",
  },

  /* Top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#A855F7",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  welcome: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
  },
  adminName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  logoutButton: {
    backgroundColor: "rgba(239,68,68,0.85)",
    padding: 10,
    borderRadius: 12,
    shadowColor: "#EF4444",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 4,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
    marginBottom: 8,
  },

  /* Scroll */
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
    marginTop: 4,
  },

  /* Card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  ticketBadge: {
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#DC2626",
  },
  ticketBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  chevron: {
    marginLeft: 4,
  },
});
