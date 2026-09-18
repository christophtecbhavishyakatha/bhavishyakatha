import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";

const API_BASE = "https://bhavishyakatha.in/express";

interface Transaction {
  id: number;
  amount: number;
  old_balance: number;
  new_balance: number;
  created_at: string;
}

const WalletTransactionScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [astrologerId, setAstrologerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // REFS — don't trigger re-renders, safe to read inside callbacks
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getUserId();
    }, [])
  );

  const getUserId = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (userId) {
        setAstrologerId(userId);
        fetchTransactions(userId, true);
      }
    } catch (err) {
      setError("Failed to load user data.");
    }
  };

  const formatDate = (date: Date): string =>
    date.toISOString().split("T")[0];

  const fetchTransactions = async (
    userId: string,
    reset: boolean = false
  ) => {
    // GUARD: prevent duplicate/concurrent fetches
    if (isFetchingRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    if (!userId) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
console.log("Fetching transactions for user:", userId, "reset:", reset);    
    const currentOffset = reset ? 0 : offsetRef.current;

    try {
      let url =
        `${API_BASE}/astrologer/transactions/${userId}` +
        `?limit=20&offset=${currentOffset}`;

      if (startDate && endDate) {
        url +=
          `&start_date=${formatDate(startDate)}` +
          `&end_date=${formatDate(endDate)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Server error. Please try again.");
      }

      const data = await response.json();

      if (data.status) {
        const fetched: Transaction[] = data.data ?? [];

        if (reset) {
          setTransactions(fetched);
          offsetRef.current = 20;
        } else {
          setTransactions((prev) => [...prev, ...fetched]);
          offsetRef.current = currentOffset + 20;
        }

        // If fewer than 20 returned, no more pages exist
        hasMoreRef.current = fetched.length === 20;
      } else {
        throw new Error(data.message || "Failed to fetch transactions.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleEndReached = () => {
    if (!astrologerId || isFetchingRef.current || !hasMoreRef.current) return;
    fetchTransactions(astrologerId, false);
  };

  const handleSearch = () => {
    if (!astrologerId) return;
    hasMoreRef.current = true;
    offsetRef.current = 0;
    fetchTransactions(astrologerId, true);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isCredit = item.amount > 0;
    return (
      <View style={styles.card}>
        <View style={[styles.iconBox, isCredit ? styles.iconCredit : styles.iconDebit]}>
          <Text style={[styles.iconText, isCredit ? styles.iconCreditText : styles.iconDebitText]}>
            {isCredit ? "↙" : "↗"}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardType}>{isCredit ? "Credit" : "Debit"}</Text>
            <Text style={[styles.cardAmount, isCredit ? styles.amountPos : styles.amountNeg]}>
              {isCredit ? "+" : "−"}₹{Math.abs(item.amount)}
            </Text>
          </View>
          <Text style={styles.cardBalance}>
            ₹{item.old_balance} → ₹{item.new_balance}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🏦</Text>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your bank transfer history will appear here.
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text style={styles.emptyTitle}>Something Went Wrong</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={() => astrologerId && fetchTransactions(astrologerId, true)}
      >
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Wallet</Text>
          <Text style={styles.headerSub}>Bank Transfer History</Text>
        </View>
      </View>

      {/* BALANCE CARD */}
      <View style={styles.balanceCard}>
       
        <View style={styles.balanceMeta}>
          <Text style={styles.balanceMetaText}>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* FILTER ROW */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateBtnText}>
            {startDate ? formatDate(startDate) : "Start Date"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.dateBtnText}>
            {endDate ? formatDate(endDate) : "End Date"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* DATE PICKERS */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(_event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(_event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}

      {/* SECTION LABEL */}
      {!error && !loading && transactions.length > 0 && (
        <Text style={styles.sectionLabel}>RECENT TRANSFERS</Text>
      )}

      {/* STATES */}
      {error ? (
        renderError()
      ) : loading && transactions.length === 0 ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#1a56db" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            transactions.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={!loading ? renderEmpty : null}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading && transactions.length > 0 ? (
              <ActivityIndicator color="#1a56db" style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

export default WalletTransactionScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  headerSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: "#1a56db",
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  balanceLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginTop: 6,
  },
  balanceMeta: {
    marginTop: 10,
    flexDirection: "row",
    gap: 16,
  },
  balanceMetaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  dateBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  dateBtnText: {
    fontSize: 13,
    color: "#444",
  },
  searchBtn: {
    backgroundColor: "#1a56db",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCredit: { backgroundColor: "#ecfdf5" },
  iconDebit: { backgroundColor: "#fff7ed" },
  iconText: { fontSize: 18, fontWeight: "700" },
  iconCreditText: { color: "#059669" },
  iconDebitText: { color: "#d97706" },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardType: { fontSize: 14, fontWeight: "600", color: "#111" },
  cardAmount: { fontSize: 15, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  amountPos: { color: "#059669" },
  amountNeg: { color: "#d97706" },
  cardBalance: { fontSize: 12, color: "#888", marginTop: 4 },
  cardDate: { fontSize: 11, color: "#bbb", marginTop: 6 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 21,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#1a56db",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
