import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API = "https://bhavishyakatha.in/express/api";
const PAGE_SIZE = 50;

// ─── Call type config ─────────────────────────────────────────────────────────
const CALL_TYPE_CONFIG: Record<
  string,
  {
    icon: string;
    lib: "mci" | "ion" | "mi";
    color: string;
    label: string;
  }
> = {
  audio: {
    icon: "call",
    lib: "ion",
    color: "#2563EB",
    label: "Audio",
  },

  video: {
    icon: "videocam",
    lib: "ion",
    color: "#7C3AED",
    label: "Video",
  },

  chat: {
    icon: "chatbubble",
    lib: "ion",
    color: "#16A34A",
    label: "Chat",
  },
};


const CallTypeIcon = ({
  type,
  size = 14,
}: {
  type: string;
  size?: number;
}) => {
  const cfg =
    CALL_TYPE_CONFIG[
      type?.toLowerCase()
    ] ?? CALL_TYPE_CONFIG.audio;

  const iconProps = {
    name: cfg.icon as any,
    size,
    color: cfg.color,
  };

  // Ionicons
  if (cfg.lib === "ion") {
    return <Ionicons {...iconProps} />;
  }

  // MaterialCommunityIcons
  if (cfg.lib === "mci") {
    return (
      <MaterialCommunityIcons
        {...iconProps}
      />
    );
  }

  return (
    <MaterialIcons {...iconProps} />
  );
};

const CallTypeBadge = ({ type }: { type: string }) => {
  const cfg = CALL_TYPE_CONFIG[type?.toLowerCase()] ?? CALL_TYPE_CONFIG.audio;
  return (
    <View style={[styles.callTypeBadge, { backgroundColor: cfg.color + "20", borderColor: cfg.color + "55" }]}>
      <CallTypeIcon type={type} size={11} />
      <Text style={[styles.callTypeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const AstrologerScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [walletLogs, setWalletLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"calls" | "wallet">("calls");

  // Has-more flags (if returned < PAGE_SIZE, no more pages)
  const [hasMoreCalls, setHasMoreCalls] = useState(false);
  const [hasMoreWallet, setHasMoreWallet] = useState(false);

  // ── Fetch astrologers ──────────────────────────────────────────────────────
  const fetchAstrologers = async (text = "") => {
    const res = await fetch(`${API}/admin/astrologers?search=${text}`);
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
  };

  useEffect(() => {
    fetchAstrologers();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    fetchAstrologers(text);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAstrologers(search);
    setRefreshing(false);
  };

  // ── Fetch paginated calls ──────────────────────────────────────────────────
  const fetchCalls = async (id: number, beforeId?: number): Promise<any[]> => {
    const url = beforeId
      ? `${API}/admin/astrologer/calls/${id}?before_id=${beforeId}`
      : `${API}/admin/astrologer/calls/${id}`;
    const res = await fetch(url);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  };

  // ── Fetch paginated wallet ─────────────────────────────────────────────────
  const fetchWallet = async (id: number, beforeId?: number): Promise<any[]> => {
    const url = beforeId
      ? `${API}/admin/astrologer/wallet/${id}?before_id=${beforeId}`
      : `${API}/admin/astrologer/wallet/${id}`;
    const res = await fetch(url);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  };

  // ── Open modal (initial load) ──────────────────────────────────────────────
  const openDetails = async (id: number) => {
    try {
      setSelectedId(id);
      setModalVisible(true);
      setLoading(true);
      setActiveTab("calls");
      setCallLogs([]);
      setWalletLogs([]);

      const [calls, wallet] = await Promise.all([
        fetchCalls(id),
        fetchWallet(id),
      ]);

      setCallLogs(calls);
      setWalletLogs(wallet);
      setHasMoreCalls(calls.length === PAGE_SIZE);
      setHasMoreWallet(wallet.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Load older records ─────────────────────────────────────────────────────
  const loadOlderCalls = async () => {
    if (!selectedId || loadingMore || !hasMoreCalls) return;
    try {
      setLoadingMore(true);
      const oldestId = callLogs[callLogs.length - 1]?.id;
      const older = await fetchCalls(selectedId, oldestId);
      setCallLogs((prev) => [...prev, ...older]);
      setHasMoreCalls(older.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadOlderWallet = async () => {
    if (!selectedId || loadingMore || !hasMoreWallet) return;
    try {
      setLoadingMore(true);
      const oldestId = walletLogs[walletLogs.length - 1]?.id;
      const older = await fetchWallet(selectedId, oldestId);
      setWalletLogs((prev) => [...prev, ...older]);
      setHasMoreWallet(older.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── List item ──────────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetails(item.id)}
      activeOpacity={0.82}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {(item.dp_name || item.full_name || "?")[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.dp_name || item.full_name}</Text>
        <Text style={styles.mobile}>
          <Ionicons name="call-outline" size={11} color="#8893B5" /> {item.mobile}
        </Text>
      </View>

      <View style={styles.walletBadge}>
        <Text style={styles.walletLabel}>WALLET</Text>
        <Text style={styles.walletAmount}>₹{item.wallet_balance}</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Call log card ──────────────────────────────────────────────────────────
  const renderCallCard = (c: any, i: number) => (
    <View key={c.id ?? i} style={styles.modalCard}>
      {/* Top row: user + call type badge */}
      <View style={[styles.modalRow, { marginBottom: 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(c.user_name || "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.callUserName}>{c.user_name}</Text>
            <Text style={styles.modalMobileText}>
              <Ionicons name="call-outline" size={10} color="#8893B5" /> {c.user_mobile}
            </Text>
          </View>
        </View>
        <CallTypeBadge type={c.call_type} />
      </View>

      <View style={styles.divider} />

      {/* Duration + status row */}
      <View style={[styles.modalRow, { marginTop: 6 }]}>
        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={12} color="#8893B5" />
          <Text style={styles.metaChipText}>{c.duration}s</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            c.status === "completed" ? styles.statusGreen : styles.statusOrange,
          ]}
        >
          <Text style={styles.statusText}>{c.status}</Text>
        </View>
      </View>

      {/* Financial details – only for completed */}
      {c.status === "completed" && (
        <View style={styles.financialRow}>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Charge</Text>
            <Text style={styles.financialValue}>₹{c.call_charge}</Text>
          </View>
          <View style={styles.financialDivider} />
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Platform Fee</Text>
            <Text style={styles.financialValue}>₹{c.platform_fee}</Text>
          </View>
        </View>
      )}

      {/* Timestamp */}
      {c.created_at && (
        <Text style={styles.timestampText}>
          <Ionicons name="calendar-outline" size={10} color="#AABBC8" />{" "}
          {new Date(c.created_at).toLocaleString()}
        </Text>
      )}
    </View>
  );

  // ── Wallet log card ────────────────────────────────────────────────────────
  const renderWalletCard = (w: any, i: number) => (
    <View key={w.id ?? i} style={styles.modalCard}>
      <View style={styles.modalRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletType}>{w.type}</Text>
          {w.source ? (
            <Text style={styles.walletSource}>
              <MaterialCommunityIcons name="source-repository" size={10} color="#8893B5" />{" "}
              {w.source}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.walletAmountLarge, { color: w.amount >= 0 ? "#1A7A4A" : "#C0392B" }]}>
          {w.amount >= 0 ? "+" : ""}₹{Math.abs(w.amount)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>Old Balance</Text>
          <Text style={styles.balanceValue}>₹{w.old_balance}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color="#8893B5" />
        <View style={styles.balanceItem}>
          <Text style={styles.balanceLabel}>New Balance</Text>
          <Text style={[styles.balanceValue, { color: "#1A7A4A", fontWeight: "700" }]}>
            ₹{w.new_balance}
          </Text>
        </View>
      </View>

      {w.created_at && (
        <Text style={styles.timestampText}>
          <Ionicons name="calendar-outline" size={10} color="#AABBC8" />{" "}
          {new Date(w.created_at).toLocaleString()}
        </Text>
      )}
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1437" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Astrologers</Text>
        <Text style={styles.headerSub}>Admin Console</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh astrologers" onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={15} color="#8893B5" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search name or phone…"
          placeholderTextColor="#8893B5"
          value={search}
          onChangeText={handleSearch}
          style={styles.search}
        />
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet} edges={["bottom"]}>
            <View style={styles.sheetHandle} />

            {/* Tab buttons */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "calls" && styles.tabBtnActive]}
                onPress={() => setActiveTab("calls")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="call"
                  size={14}
                  color={activeTab === "calls" ? GOLD : "#8893B5"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabBtnText, activeTab === "calls" && styles.tabBtnTextActive]}>
                  Call Logs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "wallet" && styles.tabBtnActive]}
                onPress={() => setActiveTab("wallet")}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="wallet"
                  size={14}
                  color={activeTab === "wallet" ? GOLD : "#8893B5"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabBtnText, activeTab === "wallet" && styles.tabBtnTextActive]}>
                  Wallet Logs
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Initial loading spinner */}
              {loading && (
                <ActivityIndicator color={GOLD} size="large" style={{ marginVertical: 24 }} />
              )}

              {/* ── Call History ── */}
              {!loading && activeTab === "calls" && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>Call History</Text>
                    <Text style={styles.sectionCount}>{callLogs.length} records</Text>
                  </View>

                  {callLogs.map((c, i) => renderCallCard(c, i))}

                  {/* Load older button */}
                  {hasMoreCalls && (
                    <TouchableOpacity
                      style={styles.loadMoreBtn}
                      onPress={loadOlderCalls}
                      disabled={loadingMore}
                      activeOpacity={0.8}
                    >
                      {loadingMore ? (
                        <ActivityIndicator color={NAV} size="small" />
                      ) : (
                        <>
                          <Ionicons name="arrow-down-circle-outline" size={16} color={NAV} />
                          <Text style={styles.loadMoreText}>Load older transactions</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {!hasMoreCalls && callLogs.length > 0 && (
                    <Text style={styles.endText}>— No more records —</Text>
                  )}
                </>
              )}

              {/* ── Wallet Logs ── */}
              {!loading && activeTab === "wallet" && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>Wallet Logs</Text>
                    <Text style={styles.sectionCount}>{walletLogs.length} records</Text>
                  </View>

                  {walletLogs.map((w, i) => renderWalletCard(w, i))}

                  {/* Load older button */}
                  {hasMoreWallet && (
                    <TouchableOpacity
                      style={styles.loadMoreBtn}
                      onPress={loadOlderWallet}
                      disabled={loadingMore}
                      activeOpacity={0.8}
                    >
                      {loadingMore ? (
                        <ActivityIndicator color={NAV} size="small" />
                      ) : (
                        <>
                          <Ionicons name="arrow-down-circle-outline" size={16} color={NAV} />
                          <Text style={styles.loadMoreText}>Load older transactions</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {!hasMoreWallet && walletLogs.length > 0 && (
                    <Text style={styles.endText}>— No more records —</Text>
                  )}
                </>
              )}

              {/* Close */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AstrologerScreen;

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const NAV = "#0B1437";
const SURFACE = "#111D45";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C87A";
const TEXT_PRIMARY = "#EDF0FB";
const TEXT_MUTED = "#8893B5";
const SHEET_BG = "#F5F6FA";
const SHEET_CARD = "#FFFFFF";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NAV },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 26, fontWeight: "800", letterSpacing: 0.4, flexShrink: 1 },
  headerSub: {
    color: GOLD, fontSize: 11, fontWeight: "600", letterSpacing: 2.5,
    textTransform: "uppercase", marginTop: 2,
  },

  // Search
  searchWrapper: {
    flexDirection: "row", alignItems: "center", backgroundColor: SURFACE,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#1E2E64",
  },
  search: { flex: 1, paddingVertical: 13, color: TEXT_PRIMARY, fontSize: 14 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: SURFACE,
    borderRadius: 14, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: "#1E2E64",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: GOLD,
    alignItems: "center", justifyContent: "center", marginRight: 13,
  },
  avatarText: { color: NAV, fontWeight: "800", fontSize: 18 },
  cardBody: { flex: 1, minWidth: 0 },
  name: { color: TEXT_PRIMARY, fontWeight: "700", fontSize: 15, marginBottom: 3 },
  mobile: { color: TEXT_MUTED, fontSize: 12 },
  walletBadge: { alignItems: "flex-end", flexShrink: 1 },
  walletLabel: { color: GOLD, fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 2 },
  walletAmount: { color: GOLD_LIGHT, fontWeight: "800", fontSize: 15 },

  // Tabs
  tabRow: {
    flexDirection: "row", backgroundColor: "#E8EAF2",
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: "center", flexDirection: "row", justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: NAV,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  tabBtnText: { fontSize: 13, fontWeight: "700", color: TEXT_MUTED },
  tabBtnTextActive: { color: GOLD },

  // Modal overlay
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(5,10,28,0.65)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: SHEET_BG, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 10, maxHeight: "90%",
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: "#CBD0DE",
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionAccent: { width: 4, height: 20, backgroundColor: GOLD, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: NAV, letterSpacing: 0.3, flex: 1 },
  sectionCount: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600" },

  // Modal cards
  modalCard: {
    backgroundColor: SHEET_CARD, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#0B1437", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  modalRow: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
    gap: 6,
  },
  modalLabel: {
    color: "#8893B5", fontSize: 12, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  modalValue: {
    color: "#1A2550", fontSize: 13, fontWeight: "600",
    maxWidth: "100%", textAlign: "right", flexShrink: 1,
  },
  modalMobileText: { color: TEXT_MUTED, fontSize: 11 },
  divider: { height: 1, backgroundColor: "#EAECF3", marginVertical: 8 },

  // Call card specifics
  userAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#E8EAF2",
    alignItems: "center", justifyContent: "center",
  },
  userAvatarText: { color: NAV, fontWeight: "700", fontSize: 13 },
  callUserName: { color: "#1A2550", fontWeight: "700", fontSize: 14 },

  callTypeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  callTypeBadgeText: { fontSize: 11, fontWeight: "700" },

  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F0F2FA", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  metaChipText: { color: "#6B7DB3", fontSize: 12, fontWeight: "600" },

  financialRow: {
    flexDirection: "row", flexWrap: "wrap", backgroundColor: "#F8F9FD",
    borderRadius: 10, padding: 10, marginTop: 8, alignItems: "center",
  },
  financialItem: { flex: 1, minWidth: 80, alignItems: "center" },
  financialDivider: { width: 1, height: 28, backgroundColor: "#E0E3EF" },
  financialLabel: { fontSize: 10, color: TEXT_MUTED, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  financialValue: { fontSize: 14, fontWeight: "700", color: "#1A7A4A", marginTop: 2 },

  // Wallet card specifics
  walletType: { fontSize: 14, fontWeight: "700", color: "#1A2550" },
  walletSource: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  walletAmountLarge: { fontSize: 18, fontWeight: "800" },
  balanceRow: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-around",
    backgroundColor: "#F8F9FD", borderRadius: 10, padding: 10, marginTop: 4,
  },
  balanceItem: { alignItems: "center", minWidth: 80 },
  balanceLabel: { fontSize: 10, color: TEXT_MUTED, fontWeight: "600", textTransform: "uppercase" },
  balanceValue: { fontSize: 14, fontWeight: "600", color: "#1A2550", marginTop: 2 },

  // Status badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusGreen: { backgroundColor: "#D1FAE5" },
  statusOrange: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#065F46" },

  // Timestamp
  timestampText: { fontSize: 10, color: "#4a94cd", marginTop: 8, textAlign: "right" },

  // Load more
  loadMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#E8EAF2", borderRadius: 12, paddingVertical: 12,
    marginBottom: 10, gap: 6,
  },
  loadMoreText: { color: NAV, fontWeight: "700", fontSize: 13 },
  endText: { textAlign: "center", color: TEXT_MUTED, fontSize: 12, marginBottom: 16, marginTop: 4 },

  // Close
  closeBtn: {
    backgroundColor: NAV, borderRadius: 12, paddingVertical: 14,
    marginTop: 16, marginBottom: 8, alignItems: "center",
    flexDirection: "row", justifyContent: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
  refreshButton: { marginLeft: "auto", padding: 8 },
});
