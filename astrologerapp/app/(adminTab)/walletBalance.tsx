import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type Astrologer = {
  id: number;
  full_name: string;
  mobile: string;
  wallet_balance: number;
  dp_name: string;
};

type Payout = {
  id: number;
  amount: number;
  status: string;
  reference_no?: string;
  created_at: string;
};

const API = "https://bhavishyakatha.in/express/api";

const AdminWallet = () => {
  const [list, setList] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<Payout[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [currentAstro, setCurrentAstro] = useState<number | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchAstrologers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/admin/astrologers`);
      const data = await res.json();
      setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAstrologers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAstrologers();
    setRefreshing(false);
  };

  const openTransferModal = (id: number) => {
    setCurrentAstro(id);
    setModalVisible(true);
  };

  const handleTransfer = async () => {
    if (!amount || !currentAstro) return;

    if (Number(amount) <= 0) {
      Alert.alert("Error", "Enter valid amount");
      return;
    }

    Alert.alert("Confirm", `Transfer ₹${amount}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          try {
            setTransferLoading(true);

            const res = await fetch(`${API}/admin/transfer`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                astrologer_id: currentAstro,
                amount: Number(amount),
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              Alert.alert("Error", data.message || "Transfer failed");
              return;
            }

            Alert.alert("Success", "Transfer initiated");

            setModalVisible(false);
            setAmount("");
            fetchAstrologers();
          } catch (err) {
            console.error(err);
          } finally {
            setTransferLoading(false);
          }
        },
      },
    ]);
  };

  const fetchHistory = async (astrologer_id: number) => {
    try {
      setSelectedId(astrologer_id);
      setHistoryLoading(true);
      console.log("Fetching history for astrologer ID:", astrologer_id);
      const res = await fetch(`${API}/admin/payout-history/${astrologer_id}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "failed":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loaderText}>Loading wallets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Admin Panel</Text>
          <Text style={styles.headerTitle}>Astrologer Wallets</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{list.length}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh astrologer wallets" onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      >
        {list.map((astro) => (
          <View key={astro.id} style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{getInitials(astro.full_name)}</Text>
              </View>
              <View style={styles.astroInfo}>
                <Text style={styles.dpName}>{astro.dp_name}</Text>
                <Text style={styles.fullName}>{astro.full_name}</Text>
                <Text style={styles.mobile}>📞 {astro.mobile}</Text>
              </View>
            </View>

            {/* Balance Pill */}
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceAmount}>₹ {astro.wallet_balance?.toLocaleString("en-IN")}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.transferBtn}
                onPress={() => openTransferModal(astro.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.transferBtnIcon}>↑</Text>
                <Text style={styles.transferBtnText}>Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.historyBtn,
                  selectedId === astro.id && styles.historyBtnActive,
                ]}
                onPress={() => fetchHistory(astro.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.historyBtnText}>
                  {selectedId === astro.id ? "▼ History" : "▶ History"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* History Section */}
            {selectedId === astro.id && (
              <View style={styles.historyBox}>
                <Text style={styles.historyTitle}>Payout History</Text>

                {historyLoading && (
                  <View style={styles.historyLoader}>
                    <ActivityIndicator size="small" color="#6C63FF" />
                    <Text style={styles.historyLoadingText}>Loading...</Text>
                  </View>
                )}

                {!historyLoading && history.length === 0 && (
                  <View style={styles.emptyHistory}>
                    <Text style={styles.emptyHistoryIcon}>📭</Text>
                    <Text style={styles.emptyHistoryText}>No payout history found</Text>
                  </View>
                )}

                {history.map((h) => (
                  <View key={h.id} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyAmount}>₹ {h.amount?.toLocaleString("en-IN")}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(h.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(h.status) + "20" },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(h.status) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(h.status) },
                        ]}
                      >
                        {h.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Transfer Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Transfer Funds</Text>
            <Text style={styles.modalSubtitle}>
              Enter the amount to transfer to astrologer
            </Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>₹</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
              />
            </View>

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleTransfer}
                disabled={transferLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>
                  {transferLoading ? "Processing..." : "✓  Confirm"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>✕  Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminWallet;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1A1A2E",
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  loaderText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontFamily: "System",
  },

  /* ── Header ── */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1A1A2E",
    borderBottomWidth: 1,
    borderBottomColor: "#16213E",
    gap: 12,
  },

  headerSub: {
    color: "#6C63FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  headerTitle: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    flexShrink: 1,
  },

  headerBadge: {
    backgroundColor: "#6C63FF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  headerBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  /* ── Scroll ── */
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  scrollContent: {
    padding: 16,
    paddingTop: 18,
  },

  /* ── Card ── */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },

  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 0,
  },

  avatarText: {
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 16,
  },

  astroInfo: {
    flex: 1,
    minWidth: 0,
  },

  dpName: {
    color: "#6C63FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 1,
  },

  fullName: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },

  mobile: {
    color: "#6B7280",
    fontSize: 13,
  },

  /* ── Balance ── */
  balanceContainer: {
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#6C63FF",
    gap: 10,
  },

  balanceLabel: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "600",
  },

  balanceAmount: {
    color: "#1A1A2E",
    fontSize: 18,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },

  /* ── Buttons ── */
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  transferBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#6C63FF",
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  transferBtnIcon: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  transferBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  historyBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#F3F4F6",
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  historyBtnActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#6C63FF",
  },

  historyBtnText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 14,
  },

  /* ── History ── */
  historyBox: {
    marginTop: 14,
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  historyTitle: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  historyLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },

  historyLoadingText: {
    color: "#9CA3AF",
    fontSize: 13,
  },

  emptyHistory: {
    alignItems: "center",
    paddingVertical: 14,
  },

  emptyHistoryIcon: {
    fontSize: 24,
    marginBottom: 6,
  },

  emptyHistoryText: {
    color: "#9CA3AF",
    fontSize: 13,
  },

  historyItem: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  historyLeft: {},

  historyAmount: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 15,
  },

  historyDate: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },

  modalTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },

  modalSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 20,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#6C63FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
    marginBottom: 20,
  },

  inputPrefix: {
    color: "#6C63FF",
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },

  input: {
    flex: 1,
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
    paddingVertical: 14,
  },

  modalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: "#6C63FF",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  cancelBtnText: {
    color: "#EF4444",
    fontWeight: "800",
    fontSize: 15,
  },
  refreshButton: { marginLeft: "auto", padding: 8 },
});
