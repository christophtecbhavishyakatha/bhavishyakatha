import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

const API = "https://bhavishyakatha.in/express/api";

const CallLogsScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"today" | "week" | "custom">("today");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchLogs = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      let url = `${API}/admin/call-logs`;
      if (start && end) url += `?start_date=${start}&end_date=${end}`;
      const res = await fetch(url);
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
      else setData([]);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  useEffect(() => {
    const d = formatDate(new Date());
    fetchLogs(d, d);
  }, []);

  const filterToday = () => {
    setActiveFilter("today");
    const d = formatDate(new Date());
    fetchLogs(d, d);
  };

  const filterLast7Days = () => {
    setActiveFilter("week");
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 7);
    fetchLogs(formatDate(past), formatDate(today));
  };

  const applyCustomFilter = () => {
    if (!startDate || !endDate) return;
    setActiveFilter("custom");
    fetchLogs(formatDate(startDate), formatDate(endDate));
  };

  const onRefresh = () => {
    setRefreshing(true);
    const start = startDate ? formatDate(startDate) : formatDate(new Date());
    const end = endDate ? formatDate(endDate) : formatDate(new Date());
    fetchLogs(start, end);
  };

  const isCompleted = (item: any) => item.status?.toLowerCase() === "completed";

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  const AVATAR_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"];
  const getAvatarColor = (name: string) => {
    const code = name?.charCodeAt(0) ?? 0;
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
  };

  const totalCalls = data.length;
  const completedCalls = data.filter(isCompleted).length;
  const totalEarning = data
    .filter(isCompleted)
    .reduce((sum, item) => sum + (parseFloat(item.platform_fee) || 0), 0)
    .toFixed(0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loaderText}>Fetching logs…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#f59e0b"]}
              tintColor="#f59e0b"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── HEADER ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>Admin Panel</Text>
              <Text style={styles.title}>Call Logs</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Text style={styles.refreshIcon}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* ── STATS BAR ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalCalls}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMid]}>
              <Text style={[styles.statValue, { color: "#34d399" }]}>{completedCalls}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#f59e0b" }]}>₹{totalEarning}</Text>
              <Text style={styles.statLabel}>Earning</Text>
            </View>
          </View>

          {/* ── FILTER CHIPS ── */}
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, activeFilter === "today" && styles.chipActive]}
              onPress={filterToday}
            >
              <Text style={[styles.chipText, activeFilter === "today" && styles.chipTextActive]}>
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, activeFilter === "week" && styles.chipActive]}
              onPress={filterLast7Days}
            >
              <Text style={[styles.chipText, activeFilter === "week" && styles.chipTextActive]}>
                Last 7 Days
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── CUSTOM DATE RANGE ── */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateBtnLabel}>From</Text>
              <Text style={styles.dateBtnValue}>
                {startDate ? formatDate(startDate) : "Select date"}
              </Text>
            </TouchableOpacity>

            <View style={styles.dateSep}>
              <Text style={styles.dateSepText}>→</Text>
            </View>

            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateBtnLabel}>To</Text>
              <Text style={styles.dateBtnValue}>
                {endDate ? formatDate(endDate) : "Select date"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyBtn} onPress={applyCustomFilter}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
            />
          )}

          {/* ── SECTION TITLE ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Results</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{data.length}</Text>
            </View>
          </View>

          {/* ── EMPTY STATE ── */}
          {data.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No calls found</Text>
              <Text style={styles.emptySubtitle}>Try a different date range</Text>
            </View>
          )}

          {/* ── CALL CARDS ── */}
          {data.map((item) => {
            const completed = isCompleted(item);
            const avatarColor = getAvatarColor(item.astrologer_name);

            return (
              <View key={item.id} style={styles.card}>
                {/* Card top accent */}
                <View style={[styles.cardAccent, { backgroundColor: completed ? "#34d399" : "#f59e0b" }]} />

                {/* Astrologer row */}
                <View style={styles.cardTopRow}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor + "22", borderColor: avatarColor }]}>
                    <Text style={[styles.avatarText, { color: avatarColor }]}>
                      {getInitials(item.astrologer_name)}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.astrologerName}>{item.astrologer_name}</Text>
                    <Text style={styles.mobileText}>📞 {item.astrologer_mobile}</Text>
                  </View>

                  <View style={[styles.badge, completed ? styles.badgeGreen : styles.badgeAmber]}>
                    <Text style={[styles.badgeText, completed ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* User row */}
                <View style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userLabel}>USER</Text>
                    <Text style={styles.userName}>{item.user_name}</Text>
                    <Text style={styles.mobileText}>📞 {item.user_mobile}</Text>
                  </View>
                  <View style={styles.callTypePill}>
                    <Text style={styles.callTypePillText}>{item.call_type}</Text>
                  </View>
                </View>

                {/* Completed details */}
                {completed && (
                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricIcon}>⏱</Text>
                      <Text style={styles.metricVal}>{formatDuration(item.duration)}</Text>
                      <Text style={styles.metricLabel}>Duration</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metric}>
                      <Text style={styles.metricIcon}>💰</Text>
                      <Text style={styles.metricVal}>₹{item.call_charge}</Text>
                      <Text style={styles.metricLabel}>Astro Payment</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metric}>
                      <Text style={styles.metricIcon}>🏦</Text>
                      <Text style={styles.metricVal}>₹{item.platform_fee}</Text>
                      <Text style={styles.metricLabel}>Our Earning</Text>
                    </View>
                  </View>
                )}

                {/* Timestamp */}
                <Text style={styles.timestamp}>
                  🕐 {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            );
          })}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default CallLogsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
    gap: 12,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#f59e0b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f9fafb",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1c2333",
    borderWidth: 1,
    borderColor: "#2d3748",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshIcon: {
    color: "#f59e0b",
    fontSize: 20,
    fontWeight: "700",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#161b27",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 18,
    overflow: "hidden",
  },
  statCard: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 14,
    alignItems: "center",
  },
  statCardMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#1f2937",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f9fafb",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },

  // Filter chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: "#161b27",
    borderWidth: 1,
    borderColor: "#2d3748",
  },
  chipActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  chipText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#0d1117",
  },

  // Date range
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  dateBtn: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#161b27",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2d3748",
  },
  dateBtnLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#f59e0b",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  dateBtnValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d1d5db",
    marginTop: 2,
  },
  dateSep: {
    justifyContent: "center",
    alignItems: "center",
  },
  dateSepText: {
    color: "#4b5563",
    fontSize: 16,
  },
  applyBtn: {
    backgroundColor: "#065f46",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#34d399",
  },
  applyBtnText: {
    color: "#34d399",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  countBadge: {
    backgroundColor: "#1c2333",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#2d3748",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#d1d5db",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },

  // Card
  card: {
    backgroundColor: "#161b27",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1f2937",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cardAccent: {
    height: 3,
    width: "100%",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 15,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  astrologerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f9fafb",
    letterSpacing: -0.3,
  },
  mobileText: {
    fontSize: 12,
    color: "#6b7280",
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: "#05361f",
    borderColor: "#34d399",
  },
  badgeAmber: {
    backgroundColor: "#3d2a00",
    borderColor: "#f59e0b",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badgeTextGreen: {
    color: "#34d399",
  },
  badgeTextAmber: {
    color: "#f59e0b",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "#1f2937",
    marginHorizontal: 14,
  },

  // User row
  userRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  userLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#4b5563",
    textTransform: "uppercase",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d1d5db",
  },
  callTypePill: {
    backgroundColor: "#1c2333",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#374151",
  },
  callTypePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "capitalize",
  },

  // Metrics
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#0f1822",
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1a2640",
  },
  metric: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    gap: 3,
  },
  metricIcon: {
    fontSize: 14,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#34d399",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricDivider: {
    width: 1,
    backgroundColor: "#1f2937",
    alignSelf: "stretch",
    marginHorizontal: 4,
  },

  // Timestamp
  timestamp: {
    fontSize: 11,
    color: "#374151",
    textAlign: "right",
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginTop: -4,
  },
});
