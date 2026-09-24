import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const API = "https://bhavishyakatha.in/express/api";

const RechargeLogsScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "today" | "7days" | "custom"
  >("today");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // 🔹 Fetch Logs
  const fetchLogs = async (start?: string, end?: string) => {
    try {
      setLoading(true);

      let url = `${API}/admin/recharge-logs`;

      if (start && end) {
        url += `?start_date=${start}&end_date=${end}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      console.log("API RESPONSE:", json);

      if (Array.isArray(json)) {
        setData(json);
      } else if (Array.isArray(json.data)) {
        setData(json.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterToday(); // ← default to today
  }, []);

  // 🔹 Helpers
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // 🔹 Filters
  const filterToday = () => {
    const today = new Date();
    const d = formatDate(today);
    setActiveFilter("today");
    fetchLogs(d, d);
  };

  const filterLast7Days = () => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 7);
    setActiveFilter("7days");
    fetchLogs(formatDate(past), formatDate(today));
  };

  const applyCustomFilter = () => {
    if (!startDate || !endDate) return;
    setActiveFilter("custom");
    fetchLogs(formatDate(startDate), formatDate(endDate));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const today = new Date();
    if (activeFilter === "7days") {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      await fetchLogs(formatDate(past), formatDate(today));
    } else if (activeFilter === "custom" && startDate && endDate) {
      await fetchLogs(formatDate(startDate), formatDate(endDate));
    } else {
      await fetchLogs(formatDate(today), formatDate(today));
    }
    setRefreshing(false);
  };

  // 🔹 Summary Calculations
  const totalRecharge = data.reduce(
    (sum, item) => sum + (parseFloat(item.recharge_amount) || 0),
    0,
  );
  const totalGST = data.reduce(
    (sum, item) => sum + (parseFloat(item.gst_amount) || 0),
    0,
  );
  const totalPaid = data.reduce(
    (sum, item) => sum + (parseFloat(item.payable_amount) || 0),
    0,
  );

  const getStatusColor = (status: string) => {
    if (!status) return "#888";
    const s = status.toLowerCase();
    if (s === "success" || s === "paid") return "#22c55e";
    if (s === "failed" || s === "failure") return "#ef4444";
    return "#f59e0b";
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recharge Logs</Text>
          <Text style={styles.headerSub}>
            {data.length} transaction{data.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh recharge logs"
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh-outline" size={22} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {/* ── FILTER PILLS ── */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.pill, activeFilter === "today" && styles.pillActive]}
            onPress={filterToday}
          >
            <Text
              style={[
                styles.pillText,
                activeFilter === "today" && styles.pillTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, activeFilter === "7days" && styles.pillActive]}
            onPress={filterLast7Days}
          >
            <Text
              style={[
                styles.pillText,
                activeFilter === "7days" && styles.pillTextActive,
              ]}
            >
              Last 7 Days
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── CUSTOM DATE RANGE ── */}
        <View style={styles.customRow}>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateBtnLabel}>From</Text>
            <Text style={styles.dateBtnValue}>
              {startDate ? formatDate(startDate) : "Select"}
            </Text>
          </TouchableOpacity>

          <View style={styles.dateSeparator} />

          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateBtnLabel}>To</Text>
            <Text style={styles.dateBtnValue}>
              {endDate ? formatDate(endDate) : "Select"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.applyBtn,
              (!startDate || !endDate) && styles.applyBtnDisabled,
            ]}
            onPress={applyCustomFilter}
            disabled={!startDate || !endDate}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* ── DATE PICKERS ── */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(Platform.OS === "ios");
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(Platform.OS === "ios");
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        {/* ── LOADING ── */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Fetching logs…</Text>
          </View>
        )}

        {/* ── SUMMARY CARD ── */}
        {!loading && data.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Recharge</Text>
                <Text style={styles.summaryAmount}>
                  ₹{totalRecharge.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total GST</Text>
                <Text style={[styles.summaryAmount, { color: "#f59e0b" }]}>
                  ₹{totalGST.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={[styles.summaryAmount, { color: "#22c55e" }]}>
                  ₹{totalPaid.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && data.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubText}>
              Try adjusting the date range
            </Text>
          </View>
        )}

        {/* ── DATA CARDS ── */}
        {!loading &&
          Array.isArray(data) &&
          data.map((item) => (
            <View key={item.id} style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardName}>{item.user_name}</Text>
                  <Text style={styles.cardPhone}>📞 {item.phone_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        getStatusColor(item.payment_status) + "20",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(item.payment_status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.payment_status) },
                    ]}
                  >
                    {item.payment_status}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Amount Row */}
              <View style={styles.amountRow}>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Recharge</Text>
                  <Text style={styles.amountValue}>
                    ₹{item.recharge_amount}
                  </Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>GST</Text>
                  <Text style={[styles.amountValue, { color: "#f59e0b" }]}>
                    ₹{item.gst_amount}
                  </Text>
                </View>
                <View style={styles.amountItem}>
                  <Text style={styles.amountLabel}>Total Paid</Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: "#22c55e", fontWeight: "700" },
                    ]}
                  >
                    ₹{item.payable_amount}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Balance Row */}
              <View style={styles.balanceRow}>
                <Text style={styles.balanceText}>
                  Prev: ₹{item.previous_balance}
                </Text>
                <Text style={styles.balanceArrow}>→</Text>
                <Text
                  style={[
                    styles.balanceText,
                    { color: "#6366f1", fontWeight: "600" },
                  ]}
                >
                  New: ₹{item.after_balance}
                </Text>
              </View>

              {/* Coupon Row */}
              {(item.coupon_code || item.coupon_bonus_amount > 0) && (
                <View style={styles.couponRow}>
                  <Text style={styles.couponText}>
                    🎟 {item.coupon_code || "—"}
                  </Text>
                  <Text style={styles.couponBonus}>
                    +₹{item.coupon_bonus_amount || 0} bonus
                  </Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.paymentId} numberOfLines={1}>
                  ID: {item.razorpay_payment_id}
                </Text>
                <Text style={styles.cardDate}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default RechargeLogsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f2f8",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // ── Header ──
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1e1b4b",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  headerSub: {
    fontSize: 13,
    color: "#6366f1",
    fontWeight: "600",
    marginBottom: 2,
  },

  // ── Filter Pills ──
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 50,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e0e0f0",
  },
  pillActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  pillTextActive: {
    color: "#fff",
  },

  // ── Custom Date Row ──
  customRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0f0",
    gap: 8,
  },
  dateBtn: {
    flex: 1,
    minWidth: 100,
    alignItems: "center",
  },
  dateBtnLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateBtnValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e1b4b",
  },
  dateSeparator: {
    width: 1,
    height: 30,
    backgroundColor: "#e0e0f0",
  },
  applyBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applyBtnDisabled: {
    backgroundColor: "#c7c7d4",
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Loading ──
  loadingBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: "#999",
    fontSize: 14,
  },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: "#1e1b4b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    minWidth: 90,
    alignItems: "center",
  },
  summaryLabel: {
    color: "#a5b4fc",
    fontSize: 11,
    marginBottom: 4,
  },
  summaryAmount: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  summarySep: {
    width: 1,
    height: 36,
    backgroundColor: "#3730a3",
  },

  // ── Empty State ──
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#555",
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: "#aaa",
  },

  // ── Transaction Card ──
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e1b4b",
    marginBottom: 2,
  },
  cardPhone: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f8",
    marginVertical: 10,
  },

  // Amount Row
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  amountItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 90,
  },
  amountLabel: {
    fontSize: 10,
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },

  // Balance Row
  balanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  balanceText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  balanceArrow: {
    color: "#aaa",
    fontSize: 12,
  },

  // Coupon
  couponRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  couponText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  couponBonus: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "700",
  },

  // Card Footer
  cardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  paymentId: {
    fontSize: 10,
    color: "#bbb",
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 10,
    color: "#999",
    fontWeight: "500",
    flexShrink: 1,
  },
  refreshButton: { marginLeft: "auto", padding: 8 },
});
