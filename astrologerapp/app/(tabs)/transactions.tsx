import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "https://bhavishyakatha.in/express/astrologer/transactions";

type Transaction = {
  id: number;
  full_name: string;
  call_type: string;
  call_charge: number;
  created_at: string;
  duration:number;
};

export default function TransactionScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [tempStart, setTempStart] = useState<Date>(new Date());
  const [tempEnd, setTempEnd] = useState<Date>(new Date());

  const [showStart, setShowStart] = useState<boolean>(false);
  const [showEnd, setShowEnd] = useState<boolean>(false);

  // 📅 Helpers
  const formatDate = (date: Date): string =>
    date.toISOString().split("T")[0];

  const getToday = (): string => formatDate(new Date());

  const getLast7Days = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDate(d);
  };

  // 🚀 API CALL
  const fetchTransactions = async (start: string, end: string) => {
    try {
      setLoading(true);

      const astrologer_id = await AsyncStorage.getItem("user_id");

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          astrologer_id,
          start_date: start,
          end_date: end,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setTransactions(json.data);
        const computedTotal = json.data.reduce((sum: number, item: Transaction) => sum + (Number(item.call_charge) || 0), 0);
        setTotal(computedTotal);
      } else {
        console.log(json.message);
      }
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 📌 Initial load
  useEffect(() => {
    const today = getToday();
    setStartDate(today);
    setEndDate(today);
    fetchTransactions(today, today);
  }, []);

  // 🎯 Filters
  const handleToday = () => {
    const today = getToday();
    setStartDate(today);
    setEndDate(today);
    fetchTransactions(today, today);
  };

  const handleLast7Days = () => {
    const start = getLast7Days();
    const end = getToday();
    setStartDate(start);
    setEndDate(end);
    fetchTransactions(start, end);
  };

  const handleApply = () => {
    if (!startDate || !endDate) {
      alert("Select both dates");
      return;
    }
    fetchTransactions(startDate, endDate);
  };

  // Call type badge color
  const getCallTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "chat": return { bg: "#1A3A2A", text: "#4ADE80" };
      case "video": return { bg: "#1A2A3A", text: "#60A5FA" };
      case "voice":
      case "call": return { bg: "#2A1A3A", text: "#C084FC" };
      default: return { bg: "#2A2A1A", text: "#FACC15" };
    }
  };

  // Format display date — handles "YYYY-MM-DD" and "YYYY-MM-DD HH:mm:ss"
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${datePart}, ${timePart}`;
  };

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };
const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  return `${min}m ${sec}s`;
};
  // 📋 Render Item
  const renderItem = ({ item, index }: { item: Transaction; index: number }) => {
    const badge = getCallTypeColor(item.call_type);
    return (
      <View style={styles.card}>
        {/* Left accent bar */}
        <View style={styles.cardAccent} />

        <View style={styles.cardContent}>
          {/* Top row: name + amount */}
          <View style={styles.cardTopRow}>
            <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
            <Text style={styles.amount}>₹{item.call_charge}</Text>
          </View>

          {/* Bottom row: badge + date */}
          <View style={styles.cardBottomRow}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {item.call_type}
              </Text> 
           </View>
           <Text style={styles.duration}>{formatDuration(item.duration)}</Text> 

            <Text style={styles.date}>{formatDisplayDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container} >

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>EARNINGS</Text>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      {/* TOTAL CARD */}
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total Earned</Text>
          <Text style={styles.totalAmount}>₹{total.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.totalIconBox}>
          <Text style={styles.totalIcon}>₹</Text>
        </View>
      </View>

      {/* QUICK FILTER BUTTONS */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={handleToday} activeOpacity={0.75}>
          <Text style={styles.btnText}>Today</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={handleLast7Days} activeOpacity={0.75}>
          <Text style={styles.btnTextOutline}>Last 7 Days</Text>
        </TouchableOpacity>
      </View>

      {/* DATE RANGE SECTION */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionLabelText}>CUSTOM RANGE</Text>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowStart(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.dateBtnLabel}>FROM</Text>
          <Text style={styles.dateBtnValue}>{startDate ? formatDateOnly(startDate) : "Select"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowEnd(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.dateBtnLabel}>TO</Text>
          <Text style={styles.dateBtnValue}>{endDate ? formatDateOnly(endDate) : "Select"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
        <Text style={styles.applyBtnText}>Apply Filter</Text>
      </TouchableOpacity>

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* LIST HEADER */}
      <Text style={styles.listHeader}>
        {transactions.length > 0 ? `${transactions.length} Records` : "Records"}
      </Text>

      {/* LOADING */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Fetching transactions...</Text>
        </View>
      )}

      {/* LIST */}
      <FlatList<Transaction>
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No Transactions Found</Text>
              <Text style={styles.emptySubText}>Try a different date range</Text>
            </View>
          ) : null
        }
      />

      {/* START DATE PICKER */}
      {showStart && (
        <DateTimePicker
          value={tempStart}
          mode="date"
          display="default"
          onValueChange={(event, selectedDate) => {
            setShowStart(false);
            if (selectedDate) {
              setTempStart(selectedDate);
              setStartDate(formatDate(selectedDate));
            }
          }}
          onDismiss={() => setShowStart(false)}
        />
      )}

      {/* END DATE PICKER */}
      {showEnd && (
        <DateTimePicker
          value={tempEnd}
          mode="date"
          display="default"
          onValueChange={(event, selectedDate) => {
            setShowEnd(false);
            if (selectedDate) {
              setTempEnd(selectedDate);
              setEndDate(formatDate(selectedDate));
            }
          }}
          onDismiss={() => setShowEnd(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D14",
    paddingHorizontal: 16,
  },

  // ── HEADER ──────────────────────────────────
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A855F7",
    letterSpacing: 3,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F5F3FF",
    letterSpacing: -0.5,
  },

  // ── TOTAL CARD ──────────────────────────────
  totalCard: {
    backgroundColor: "#1C1A2E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#2D2A45",
  },
  totalLabel: {
    fontSize: 12,
    color: "#8B7FA8",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#E9D5FF",
    letterSpacing: -1,
    flexShrink: 1,
  },
  totalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2D1B69",
    alignItems: "center",
    justifyContent: "center",
  },
  totalIcon: {
    fontSize: 24,
    color: "#A855F7",
    fontWeight: "900",
  },

  // ── FILTER BUTTONS ──────────────────────────
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  btn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#3D2A60",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  btnTextOutline: {
    color: "#C4B5FD",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // ── SECTION LABEL ───────────────────────────
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5B4E7A",
    letterSpacing: 2,
  },

  // ── DATE BUTTONS ────────────────────────────
  dateBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#17152A",
    borderWidth: 1,
    borderColor: "#2D2A45",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dateBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6D5E8A",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  dateBtnValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D8B4FE",
  },

  // ── APPLY BUTTON ────────────────────────────
  applyBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // ── DIVIDER ─────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: "#1E1B30",
    marginBottom: 12,
  },

  // ── LIST HEADER ─────────────────────────────
  listHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A3F65",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // ── CARD ────────────────────────────────────
  card: {
    backgroundColor: "#13111F",
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#201E33",
  },
  cardAccent: {
    width: 4,
    backgroundColor: "#7C3AED",
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#E9D5FF",
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#4ADE80",
    flexShrink: 1,
    textAlign: "right",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  date: {
    fontSize: 11,
    color: "#4A3F65",
    fontWeight: "500",
  },

  // ── LOADING ─────────────────────────────────
  loadingBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    color: "#6D5E8A",
    fontSize: 13,
    fontWeight: "500",
  },

  // ── EMPTY ───────────────────────────────────
  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A3F65",
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: "#2E2848",
  },
  duration:{
    fontSize: 11,
    color: "#4A3F65",
    fontWeight: "500",  
  }
});
