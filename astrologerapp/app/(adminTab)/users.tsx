import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://bhavishyakatha.in/express/api";

const UsersScreen = () => {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState<number | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState("");

  // =============================
  // 🔹 FETCH USERS
  // =============================
  const fetchUsers = async (
    pageNumber = 1,
    searchText = search,
    filter = profileFilter,
  ) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      let url = `${API}/admin/users?page=${pageNumber}`;

      if (searchText && searchText.length === 10) {
        url += `&search=${searchText}`;
      }

      if (filter !== null) {
        url += `&profile_completed=${filter}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (!Array.isArray(json)) return;

      if (pageNumber === 1) {
        setData(json);
      } else {
setData((prev) => {
  const merged = [...prev, ...json];

  return Array.from(
    new Map(merged.map((user) => [String(user.id), user])).values()
  );
});
      }

      setHasMore(json.length === 30);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchUsers(1, search, profileFilter);
    setRefreshing(false);
  };

  // =============================
  // 🔹 SEARCH (10 digit trigger)
  // =============================
  const handleSearch = (text: string) => {
    setSearch(text);

    if (text.length === 10) {
      setPage(1);
      fetchUsers(1, text, profileFilter);
    }

    if (text.length === 0) {
      fetchUsers(1, "", profileFilter);
    }
  };

  // =============================
  // 🔹 LOAD MORE
  // =============================
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage, search, profileFilter);
    }
  };

  // =============================
  // 🔹 FILTER BUTTON HANDLER
  // =============================
  const applyFilter = (filterValue: number | null) => {
    setProfileFilter(filterValue);
    setPage(1);
    setHasMore(true);
    fetchUsers(1, search, filterValue);
  };

  // =============================
  // 🔹 MODAL FUNCTIONS
  // =============================
  const openRechargeLogs = async (user_id: number) => {
    setModalTitle("Recharge History");
    setModalVisible(true);
    setModalData([]);

    const res = await fetch(`${API}/admin/recharge-logs?user_id=${user_id}`);
    const json = await res.json();

    setModalData(Array.isArray(json) ? json : []);
  };

  const openCallLogs = async (user_id: number) => {
    setModalTitle("Call Logs");
    setModalVisible(true);
    setModalData([]);

    const res = await fetch(`${API}/admin/call-logs?user_id=${user_id}`);
    const json = await res.json();

    setModalData(Array.isArray(json) ? json : []);
  };

  // =============================
  // 🔹 USER CARD
  // =============================
  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      {/* Avatar Circle */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.full_name ? item.full_name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.mobile}>📞 {item.mobile}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.profile_completed ? styles.badgeGreen : styles.badgeRed,
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {item.profile_completed ? "✓ Done" : "✗ Pending"}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Wallet Row */}
      <View style={styles.walletRow}>
        <View style={styles.walletBox}>
          <Text style={styles.walletLabel}>Wallet Balance</Text>
          <Text style={styles.walletAmount}>₹ {item.wallet_balance}</Text>
        </View>

        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.rechargeBtn}
            onPress={() => openRechargeLogs(item.id)}
          >
            <Text style={styles.rechargeBtnText}>💳 Recharge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => openCallLogs(item.id)}
          >
            <Text style={styles.callBtnText}>📋 Calls</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading Users...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh users" onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👥 Users</Text>
        <Text style={styles.headerSub}>{data.length} loaded</Text>
      </View>

      {/* 🔍 SEARCH */}
      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search by 10-digit mobile..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={handleSearch}
          style={styles.search}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* 🔥 PROFILE FILTER */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            profileFilter === null && styles.filterBtnActive,
          ]}
          onPress={() => applyFilter(null)}
        >
          <Text
            style={[
              styles.filterBtnText,
              profileFilter === null && styles.filterBtnTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            profileFilter === 1 && styles.filterBtnActive,
          ]}
          onPress={() => applyFilter(1)}
        >
          <Text
            style={[
              styles.filterBtnText,
              profileFilter === 1 && styles.filterBtnTextActive,
            ]}
          >
            ✓ Completed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            profileFilter === 0 && styles.filterBtnActive,
          ]}
          onPress={() => applyFilter(0)}
        >
          <Text
            style={[
              styles.filterBtnText,
              profileFilter === 0 && styles.filterBtnTextActive,
            ]}
          >
            ✗ Incomplete
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📋 LIST */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text style={styles.footerLoaderText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* 🔹 MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {modalData.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No records found</Text>
              </View>
            )}

            {modalData.map((item, index) => {
              const isRecharge = item.recharge_amount !== undefined;
  const uniqueKey = `${isRecharge ? "recharge" : "call"}-${item.id ?? item.recharge_id ?? item.call_id ?? index}`;

              return (
                <View key={uniqueKey} style={styles.modalCard}>
                  {isRecharge ? (
                    <>
                      <View style={styles.modalCardHeader}>
                        <Text style={styles.modalCardName}>
                          {item.user_name}
                        </Text>
                        <View
                          style={[
                            styles.statusPill,
                            item.payment_status === "captured" ||
                            item.payment_status === "success"
                              ? styles.pillGreen
                              : styles.pillOrange,
                          ]}
                        >
                          <Text style={styles.pillText}>
                            {item.payment_status}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.modalCardSub}>
                        📞 {item.phone_number}
                      </Text>

                      {/* Razorpay ID */}
                      {item.razorpay_payment_id ? (
                        <View style={styles.razorpayRow}>
                          <Text style={styles.razorpayLabel}>
                            🏦 Razorpay ID
                          </Text>
                          <Text style={styles.razorpayValue}>
                            {item.razorpay_payment_id}
                          </Text>
                        </View>
                      ) : null}

                      {/* Amount boxes */}
                      <View style={styles.modalAmountRow}>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountLabel}>Recharge</Text>
                          <Text style={styles.amountValue}>
                            ₹{item.recharge_amount}
                          </Text>
                        </View>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountLabel}>GST</Text>
                          <Text style={styles.amountValue}>
                            ₹{item.gst_amount}
                          </Text>
                        </View>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountLabel}>Total Paid</Text>
                          <Text
                            style={[styles.amountValue, { color: "#6C63FF" }]}
                          >
                            ₹{item.payable_amount}
                          </Text>
                        </View>
                      </View>

                      {/* Coupon Section */}
                      {item.coupon_code ||
                      parseFloat(item.coupon_bonus_amount) > 0 ? (
                        <View style={styles.couponRow}>
                          <Text style={styles.couponIcon}>🎟️</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.couponCode}>
                              {item.coupon_code ?? "Coupon Applied"}
                            </Text>
                            <Text style={styles.couponBonus}>
                              Bonus: ₹{item.coupon_bonus_amount}
                            </Text>
                          </View>
                          <View style={styles.pillGreenSolid}>
                            <Text style={styles.pillGreenText}>
                              +₹{item.coupon_bonus_amount}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.couponRowEmpty}>
                          <Text style={styles.couponEmptyText}>
                            🎟️ No coupon used
                          </Text>
                        </View>
                      )}

                      {/* Balance change */}
                      <View style={styles.balanceRow}>
                        <Text style={styles.balancePrev}>
                          Prev: ₹{item.previous_balance}
                        </Text>
                        <Text style={styles.balanceArrow}>→</Text>
                        <Text style={styles.balanceNew}>
                          New: ₹{item.after_balance}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.modalCardHeader}>
                        <Text style={styles.modalCardName}>
                          {item.astrologer_name}
                        </Text>
                        <View
                          style={[
                            styles.statusPill,
                            item.status === "completed"
                              ? styles.pillGreen
                              : styles.pillOrange,
                          ]}
                        >
                          <Text style={styles.pillText}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.modalCardSub}>
                        User: {item.user_name}
                      </Text>

                      <View style={styles.modalAmountRow}>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountLabel}>Duration</Text>
                          <Text style={styles.amountValue}>
                            {item.duration}s
                          </Text>
                        </View>
                        {item.status === "completed" && (
                          <>
                            <View style={styles.amountBox}>
                              <Text style={styles.amountLabel}>
                                Call Charge
                              </Text>
                              <Text
                                style={[
                                  styles.amountValue,
                                  { color: "#6C63FF" },
                                ]}
                              >
                                ₹{item.call_charge}
                              </Text>
                            </View>
                            <View style={styles.amountBox}>
                              <Text style={styles.amountLabel}>
                                Platform Fee
                              </Text>
                              <Text
                                style={[
                                  styles.amountValue,
                                  { color: "#F59E0B" },
                                ]}
                              >
                                ₹{item.platform_fee ?? "0"}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </>
                  )}

                  <Text style={styles.dateText}>
                    🕒 {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default UsersScreen;

const PURPLE = "#6C63FF";
const PURPLE_LIGHT = "#EEF0FF";
const BG = "#F4F6FB";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1A1A2E";
const TEXT_MID = "#555577";
const TEXT_LIGHT = "#9999BB";
const GREEN = "#22C55E";
const RED = "#EF4444";
const ORANGE = "#F59E0B";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },

  loadingText: {
    marginTop: 12,
    color: PURPLE,
    fontSize: 15,
    fontWeight: "600",
  },

  // ─── HEADER ─────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: PURPLE,
    gap: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },

  // ─── SEARCH ─────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_DARK,
  },

  // ─── FILTER ─────────────────────────────────────────────────
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },

  filterBtn: {
    flex: 1,
    minWidth: 88,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: "#DDE1F0",
  },

  filterBtnActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },

  filterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MID,
  },

  filterBtnTextActive: {
    color: "#fff",
  },

  // ─── CARD ────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    elevation: 3,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 0,
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: PURPLE,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 2,
  },

  mobile: {
    fontSize: 13,
    color: TEXT_MID,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 1,
  },

  badgeGreen: {
    backgroundColor: "#DCFCE7",
  },

  badgeRed: {
    backgroundColor: "#FEE2E2",
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F8",
    marginVertical: 12,
  },

  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  walletBox: { flex: 1, minWidth: 0 },

  walletLabel: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: "500",
    marginBottom: 2,
  },

  walletAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  actionBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  rechargeBtn: {
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  rechargeBtnText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
  },

  callBtn: {
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  callBtnText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },

  // ─── FOOTER ─────────────────────────────────────────────────
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },

  footerLoaderText: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: "500",
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyText: {
    color: TEXT_LIGHT,
    fontSize: 15,
    fontWeight: "500",
  },

  // ─── MODAL ───────────────────────────────────────────────────
  modalSafeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: PURPLE,
    gap: 12,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    flex: 1,
    minWidth: 0,
  },

  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  closeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  modalCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  modalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },

  modalCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    flex: 1,
    minWidth: 0,
  },

  modalCardSub: {
    fontSize: 13,
    color: TEXT_MID,
    marginBottom: 10,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },

  pillGreen: {
    backgroundColor: "#DCFCE7",
  },

  pillOrange: {
    backgroundColor: "#FEF3C7",
  },

  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_DARK,
    textTransform: "capitalize",
  },

  modalAmountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  amountBox: {
    flex: 1,
    minWidth: 100,
    backgroundColor: BG,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  amountLabel: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: "500",
    marginBottom: 3,
  },

  amountValue: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  balanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: "#F8F8FF",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 6,
  },

  balancePrev: {
    fontSize: 13,
    color: TEXT_MID,
    fontWeight: "600",
  },

  balanceArrow: {
    fontSize: 16,
    color: PURPLE,
    fontWeight: "800",
  },

  balanceNew: {
    fontSize: 13,
    color: GREEN,
    fontWeight: "700",
  },

  dateText: {
    fontSize: 11,
    color: TEXT_LIGHT,
    marginTop: 6,
  },

  razorpayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 8,
  },

  razorpayLabel: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: "600",
  },

  razorpayValue: {
    fontSize: 11,
    color: PURPLE,
    fontWeight: "700",
    flexShrink: 1,
  },

  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },

  couponIcon: {
    fontSize: 18,
  },

  couponCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    flexShrink: 1,
  },

  couponBonus: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "500",
  },

  pillGreenSolid: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  pillGreenText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },

  couponRowEmpty: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },

  couponEmptyText: {
    fontSize: 12,
    color: TEXT_LIGHT,
    fontWeight: "500",
  },

  refreshButton: {
    marginLeft: "auto",
    padding: 8,
  },
});
