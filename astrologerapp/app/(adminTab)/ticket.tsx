import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";

const API = "https://bhavishyakatha.in/express/api/admin";
const INITIAL_LIMIT = 200;

const formatTimestamp = (value?: string | null) => {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const openPhoneNumber = async (value?: string | null) => {
  const phoneNumber = String(value ?? "").replace(/[\s()-]/g, "");

  if (!phoneNumber) {
    return;
  }

  const phoneUrl = `tel:${phoneNumber}`;

  try {
    if (await Linking.canOpenURL(phoneUrl)) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert(
        "Unable to call",
        "This device cannot open the phone dialer.",
      );
    }
  } catch (error) {
    console.error("Open phone number error:", error);
    Alert.alert("Unable to call", "Could not open the phone dialer.");
  }
};

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0F0F13",
  surface: "#17171F",
  surfaceUp: "#1E1E2A",
  border: "#2A2A38",
  borderLight: "#32324A",
  accent: "#7B5EFF",
  accentSoft: "#7B5EFF22",
  accentGlow: "#7B5EFF44",
  gold: "#F5A623",
  goldSoft: "#F5A62322",
  green: "#22D3A5",
  greenSoft: "#22D3A522",
  blue: "#3B82F6",
  blueSoft: "#3B82F622",
  textPrimary: "#F0EFF8",
  textSecondary: "#8A89A6",
  textMuted: "#52516A",
  white: "#FFFFFF",
};

// ─── Format a Date object → "YYYY-MM-DD" ─────────────────────────────────────
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Date Range Modal ─────────────────────────────────────────────────────────
function DateRangeModal({
  visible,
  onClose,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
}) {
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [toDate, setToDate] = useState<Date>(today);

  // Android shows one picker at a time
  const [pickerMode, setPickerMode] = useState<"from" | "to" | null>(null);

  // iOS shows both inline; Android uses a native dialog triggered by tapping
  const isIOS = Platform.OS === "ios";

  const handleFromChange = (_: DateTimePickerEvent, date?: Date) => {
    if (!isIOS) setPickerMode(null); // close Android picker
    if (date) setFromDate(date);
  };

  const handleToChange = (_: DateTimePickerEvent, date?: Date) => {
    if (!isIOS) setPickerMode(null);
    if (date) setToDate(date);
  };

  const handleApply = () => {
    if (fromDate > toDate) {
      Alert.alert("Invalid Range", "'From' date must be before 'To' date.");
      return;
    }
    onApply(formatDate(fromDate), formatDate(toDate));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={drStyles.overlay}>
        <View style={drStyles.sheet}>
          <View style={drStyles.handle} />

          <View style={drStyles.titleRow}>
            <Ionicons name="calendar-outline" size={20} color={C.accent} />
            <Text style={drStyles.title}>Search Older Tickets</Text>
          </View>
          <Text style={drStyles.subtitle}>
            Select a date range to load tickets beyond the latest 200.
          </Text>

          {/* ── FROM ── */}
          <View style={drStyles.pickerBlock}>
            <Text style={drStyles.pickerLabel}>FROM</Text>
            {isIOS ? (
              <DateTimePicker
                value={fromDate}
                mode="date"
                display="inline"
                maximumDate={today}
                onChange={handleFromChange}
                themeVariant="dark"
                accentColor={C.accent}
                style={drStyles.iosPicker}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={drStyles.androidDateBtn}
                  onPress={() => setPickerMode("from")}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={C.accent}
                  />
                  <Text style={drStyles.androidDateText}>
                    {formatDate(fromDate)}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={C.textMuted} />
                </TouchableOpacity>
                {pickerMode === "from" && (
                  <DateTimePicker
                    value={fromDate}
                    mode="date"
                    display="default"
                    maximumDate={today}
                    onChange={handleFromChange}
                  />
                )}
              </>
            )}
          </View>

          {/* ── TO ── */}
          <View style={drStyles.pickerBlock}>
            <Text style={drStyles.pickerLabel}>TO</Text>
            {isIOS ? (
              <DateTimePicker
                value={toDate}
                mode="date"
                display="inline"
                maximumDate={today}
                minimumDate={fromDate}
                onChange={handleToChange}
                themeVariant="dark"
                accentColor={C.accent}
                style={drStyles.iosPicker}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={drStyles.androidDateBtn}
                  onPress={() => setPickerMode("to")}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={C.accent}
                  />
                  <Text style={drStyles.androidDateText}>
                    {formatDate(toDate)}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={C.textMuted} />
                </TouchableOpacity>
                {pickerMode === "to" && (
                  <DateTimePicker
                    value={toDate}
                    mode="date"
                    display="default"
                    maximumDate={today}
                    minimumDate={fromDate}
                    onChange={handleToChange}
                  />
                )}
              </>
            )}
          </View>

          {/* ── Range Preview ── */}
          <View style={drStyles.rangePreview}>
            <Text style={drStyles.rangePreviewText}>
              {formatDate(fromDate)}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
            <Text style={drStyles.rangePreviewText}>{formatDate(toDate)}</Text>
          </View>

          {/* ── Actions ── */}
          <TouchableOpacity style={drStyles.applyBtn} onPress={handleApply}>
            <Ionicons
              name="search-outline"
              size={16}
              color={C.white}
              style={{ marginRight: 8 }}
            />
            <Text style={drStyles.applyBtnText}>Load Tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity style={drStyles.cancelBtn} onPress={onClose}>
            <Text style={drStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Date Range Modal Styles ──────────────────────────────────────────────────
const drStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderLight,
    alignSelf: "center",
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },
  pickerBlock: {
    marginBottom: 16,
    backgroundColor: C.surfaceUp,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: C.accent,
    marginBottom: 8,
  },
  iosPicker: {
    height: 120,
  },
  androidDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  androidDateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: 0.5,
  },
  rangePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: C.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent + "33",
  },
  rangePreviewText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 0.5,
  },
  applyBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  applyBtnText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  cancelBtn: {
    padding: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading tickets…");

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [reply, setReply] = useState("");

  const [imageVisible, setImageVisible] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Date range state (stored as strings for API, set via DateRangeModal)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRangeActive, setDateRangeActive] = useState(false);
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);

  const [statusChangeVisible, setStatusChangeVisible] = useState(false);

  /* ================= HELPER: FORMAT BASE64 ================= */
  const formatBase64Image = (base64String?: string) => {
    if (!base64String) return undefined;
    if (base64String.startsWith("data:image")) return base64String;
    return `data:image/jpeg;base64,${base64String}`;
  };

  /* ================= LOAD ON FOCUS ================= */
  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, []),
  );

  const loadTickets = async (from?: string, to?: string) => {
    try {
      setLoading(true);
      const isDateRange = !!(from && to);
      setLoadingMessage(
        isDateRange
          ? "Fetching tickets for date range…"
          : "Loading latest 200 tickets…",
      );

      let url = `${API}/tickets?limit=${INITIAL_LIMIT}`;
      if (isDateRange) {
        url = `${API}/tickets?from=${from}&to=${to}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error();
      setTickets(json.data);
      applyFilters(json.data, statusFilter, typeFilter);
      setDateRangeActive(isDateRange);
    } catch {
      Alert.alert("Error", "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets(
      dateRangeActive ? dateFrom : undefined,
      dateRangeActive ? dateTo : undefined,
    );
    setRefreshing(false);
  };

  /* ================= FILTER ================= */
  const applyFilters = (list: any[], status: string, type: string) => {
    let result = [...list];
    if (status !== "all") result = result.filter((t) => t.status === status);
    if (type !== "all") result = result.filter((t) => t.customer_type === type);
    setFilteredTickets(result);
  };

  const changeStatusFilter = (value: string) => {
    setStatusFilter(value);
    applyFilters(tickets, value, typeFilter);
  };

  const changeTypeFilter = (value: string) => {
    setTypeFilter(value);
    applyFilters(tickets, statusFilter, value);
  };

  /* ── Apply date range from DateRangeModal ── */
  const handleApplyDateRange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setDateRangeModalVisible(false);
    loadTickets(from, to);
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setDateRangeActive(false);
    loadTickets();
  };

  /* ================= COMMENTS ================= */
  const loadComments = async (ticketId: string) => {
    try {
      setCommentLoading(true);
      const res = await fetch(`${API}/tickets/${ticketId}`);
      const json = await res.json();
      if (!json.success) throw new Error();
      setComments(json.data.comments || []);
    } catch {
      Alert.alert("Error", "Failed to load comments");
    } finally {
      setCommentLoading(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      const res = await fetch(`${API}/tickets/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          user_id: "admin",
          user_type: "admin",
          comment: reply,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error();
      setReply("");
      loadComments(selectedTicket.id);
    } catch {
      Alert.alert("Error", "Failed to send reply");
    }
  };

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    loadComments(ticket.id);
  };

  /* ================= CHANGE STATUS ================= */
  const changeTicketStatus = async (newStatus: string) => {
    setLoading(true);
    setLoadingMessage("Updating ticket status…");
    try {
      const res = await fetch(`${API}/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, response: reply || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Update failed");
      setSelectedTicket((prev: any) => ({
        ...prev,
        status: newStatus,
        response: reply || prev.response,
      }));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, status: newStatus, response: reply || t.response }
            : t,
        ),
      );
      loadTickets(
        dateRangeActive ? dateFrom : undefined,
        dateRangeActive ? dateTo : undefined,
      );
      setReply("");
    } catch (err) {
      console.error("Status update error:", err);
      Alert.alert("Error", "Failed to update ticket");
    } finally {
      setLoading(false);
      setStatusChangeVisible(false);
    }
  };

  /* ================= STATUS HELPERS ================= */
  const statusConfig: Record<
    string,
    { color: string; bg: string; emoji: string; label: string }
  > = {
    open: { color: C.gold, bg: C.goldSoft, emoji: "🟡", label: "OPEN" },
    "in-progress": {
      color: C.blue,
      bg: C.blueSoft,
      emoji: "🔵",
      label: "IN PROGRESS",
    },
    resolved: {
      color: C.green,
      bg: C.greenSoft,
      emoji: "🟢",
      label: "RESOLVED",
    },
  };

  const getStatusCfg = (status: string) =>
    statusConfig[status] ?? {
      color: C.textMuted,
      bg: C.border,
      emoji: "⚪",
      label: status?.toUpperCase(),
    };

  /* ================= LOADING SCREEN ================= */
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingIconRing}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
          <Text style={styles.loadingTitle}>Please wait</Text>
          <Text style={styles.loadingText}>{loadingMessage}</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.35 }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── HEADER ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>SUPPORT</Text>
          <Text style={styles.header}>Tickets</Text>
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="options-outline" size={20} color={C.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Refresh tickets"
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={20} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE FILTER CHIPS ── */}
      {(statusFilter !== "all" || typeFilter !== "all" || dateRangeActive) && (
        <View style={styles.activeFilters}>
          {statusFilter !== "all" && (
            <View
              style={[
                styles.chip,
                { borderColor: getStatusCfg(statusFilter).color },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: getStatusCfg(statusFilter).color },
                ]}
              >
                {statusFilter.toUpperCase()}
              </Text>
            </View>
          )}
          {typeFilter !== "all" && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {typeFilter === "astrologer" ? "🔮" : "👤"} {typeFilter}
              </Text>
            </View>
          )}
          {dateRangeActive && (
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  borderColor: C.accent,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                },
              ]}
              onPress={clearDateRange}
            >
              <Ionicons name="calendar-outline" size={12} color={C.accent} />
              <Text style={[styles.chipText, { color: C.accent }]}>
                {dateFrom} → {dateTo}
              </Text>
              <Ionicons name="close-circle" size={13} color={C.accent} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── COUNT BAR ── */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {filteredTickets.length} ticket
          {filteredTickets.length !== 1 ? "s" : ""}
          {dateRangeActive ? " in range" : " (latest 200)"}
        </Text>
        {!dateRangeActive && (
          <TouchableOpacity
            onPress={() => setDateRangeModalVisible(true)}
            style={styles.oldTicketsBtn}
          >
            <Ionicons name="calendar-outline" size={13} color={C.accent} />
            <Text style={styles.oldTicketsBtnText}>Search older</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
          />
        }
        renderItem={({ item }) => {
          const cfg = getStatusCfg(item.status);
          return (
            <TouchableOpacity
              style={styles.ticketCard}
              onPress={() => openTicket(item)}
              activeOpacity={0.85}
            >
              {/* left accent bar */}
              <View
                style={[styles.cardAccentBar, { backgroundColor: cfg.color }]}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.issueType}>{item.issue_type}</Text>
                  <View
                    style={[styles.statusPill, { backgroundColor: cfg.bg }]}
                  >
                    <Text style={[styles.statusPillText, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                </View>

                <Text numberOfLines={2} style={styles.detailsText}>
                  {item.details}
                </Text>

                <View style={styles.cardMeta}>
                  <View>
                    <View style={styles.userTypeBadge}>
                      <Text style={styles.userTypeText}>
                        {item.customer_type === "astrologer"
                          ? "🔮 Astrologer"
                          : "👤 User"}
                      </Text>
                    </View>
                    <Text style={styles.userName}>
                      {item.full_name || "Unknown"}
                    </Text>
                    {item.contact_number ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${item.contact_number}`}
                        onPress={(event) => {
                          event.stopPropagation();
                          void openPhoneNumber(item.contact_number);
                        }}
                      >
                        <Text style={styles.userContactLink}>
                          {item.contact_number}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.userContact}>No Contact</Text>
                    )}
                    <Text style={styles.timestampText}>
                      Created: {formatTimestamp(item.created_at)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={C.textMuted}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyText}>No tickets found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* ── FILTER MODAL (status + type only — no date range) ── */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter Tickets</Text>

            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.filterChips}>
              {["all", "open", "in-progress", "resolved"].map((s) => {
                const active = statusFilter === s;
                const cfg = s !== "all" ? getStatusCfg(s) : null;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.filterChip,
                      active && {
                        backgroundColor: cfg?.bg ?? C.accentSoft,
                        borderColor: cfg?.color ?? C.accent,
                      },
                    ]}
                    onPress={() => changeStatusFilter(s)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && {
                          color: cfg?.color ?? C.accent,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {s === "all" ? "All" : s.replace("-", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              User Type
            </Text>
            <View style={styles.filterChips}>
              {["all", "astrologer", "user"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    typeFilter === t && {
                      backgroundColor: C.accentSoft,
                      borderColor: C.accent,
                    },
                  ]}
                  onPress={() => changeTypeFilter(t)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      typeFilter === t && {
                        color: C.accent,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {t === "astrologer" ? "🔮 " : t === "user" ? "👤 " : ""}
                    {t === "all" ? "All" : t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.applyBtn2, { marginTop: 28 }]}
              onPress={() => {
                applyFilters(tickets, statusFilter, typeFilter);
                setFilterVisible(false);
              }}
            >
              <Text style={styles.applyBtnText2}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── DATE RANGE MODAL (DateTimePicker) ── */}
      <DateRangeModal
        visible={dateRangeModalVisible}
        onClose={() => setDateRangeModalVisible(false)}
        onApply={handleApplyDateRange}
      />

      {/* ── TICKET DETAIL MODAL ── */}
      <Modal visible={!!selectedTicket} animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={styles.detailContainer}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setSelectedTicket(null)}
              >
                <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Ticket Detail</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title + Status */}
              <View style={styles.detailTop}>
                <Text style={styles.detailTitle}>
                  {selectedTicket?.issue_type}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.detailStatusBadge,
                    {
                      backgroundColor: getStatusCfg(selectedTicket?.status).bg,
                    },
                  ]}
                  onPress={() => setStatusChangeVisible(true)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: getStatusCfg(selectedTicket?.status)
                          .color,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.detailStatusText,
                      { color: getStatusCfg(selectedTicket?.status).color },
                    ]}
                  >
                    {getStatusCfg(selectedTicket?.status).label}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={getStatusCfg(selectedTicket?.status).color}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailBody}>{selectedTicket?.details}</Text>

              <View style={styles.detailTimestamps}>
                <Text style={styles.detailTimestampText}>
                  Created: {formatTimestamp(selectedTicket?.created_at)}
                </Text>
                {selectedTicket?.updated_at ? (
                  <Text style={styles.detailTimestampText}>
                    Updated: {formatTimestamp(selectedTicket.updated_at)}
                  </Text>
                ) : null}
                {selectedTicket?.resolved_at ? (
                  <Text style={styles.detailTimestampText}>
                    Resolved: {formatTimestamp(selectedTicket.resolved_at)}
                  </Text>
                ) : null}
              </View>

              {/* Screenshot */}
              {selectedTicket?.screenshot && (
                <>
                  <TouchableOpacity
                    style={styles.imageWrapper}
                    onPress={() => setImageVisible(true)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{
                        uri: formatBase64Image(selectedTicket.screenshot),
                      }}
                      style={styles.screenshot}
                      resizeMode="cover"
                    />
                    <View style={styles.zoomHint}>
                      <Ionicons
                        name="expand-outline"
                        size={14}
                        color={C.white}
                      />
                      <Text style={styles.zoomText}>Tap to zoom</Text>
                    </View>
                  </TouchableOpacity>
                  <ImageViewing
                    images={[
                      { uri: formatBase64Image(selectedTicket.screenshot) },
                    ]}
                    imageIndex={0}
                    visible={imageVisible}
                    onRequestClose={() => setImageVisible(false)}
                    HeaderComponent={() => (
                      <View style={styles.imageViewerHeader}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Close image"
                          style={styles.imageViewerCloseButton}
                          onPress={() => setImageVisible(false)}
                        >
                          <Ionicons name="close" size={24} color={C.white} />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </>
              )}

              {/* Conversation */}
              <View style={styles.conversationHeader}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={16}
                  color={C.accent}
                />
                <Text style={styles.conversationTitle}>Conversation</Text>
              </View>

              {commentLoading ? (
                <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />
              ) : (
                <View style={styles.commentsContent}>
                  {comments.length > 0 ? (
                    comments.map((item) => {
                      const isAdmin = item.user_type === "admin";
                      return (
                        <View
                          key={String(item.id)}
                          style={[
                            styles.bubble,
                            isAdmin ? styles.adminBubble : styles.userBubble,
                          ]}
                        >
                          <Text style={styles.bubbleSender}>
                            {isAdmin ? "Admin" : "User"}
                          </Text>
                          <Text style={styles.bubbleText}>{item.comment}</Text>
                          <Text style={styles.bubbleTimestamp}>
                            {formatTimestamp(item.created_at)}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noComments}>
                      No messages yet. Start the conversation.
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Reply Box */}
            <View style={styles.replyBox}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your response…"
                placeholderTextColor={C.textMuted}
                value={reply}
                onChangeText={setReply}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendReply}>
                <Ionicons name="send" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── STATUS CHANGE MODAL ── */}
      <Modal visible={statusChangeVisible} transparent animationType="fade">
        <View style={styles.statusOverlay}>
          <View style={styles.statusSheet}>
            <Text style={styles.statusSheetTitle}>Change Status</Text>
            {["open", "in-progress", "resolved"].map((s) => {
              const cfg = getStatusCfg(s);
              const active = selectedTicket?.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusOption,
                    active && {
                      backgroundColor: cfg.bg,
                      borderColor: cfg.color,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => changeTicketStatus(s)}
                >
                  <View
                    style={[
                      styles.statusOptionDot,
                      { backgroundColor: cfg.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      active && { color: cfg.color, fontWeight: "700" },
                    ]}
                  >
                    {s
                      .replace("-", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={cfg.color}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setStatusChangeVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },

  /* ── Loading Screen ── */
  loadingCard: {
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 36,
    width: 260,
    maxWidth: "90%",
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  loadingIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accentSoft,
    borderWidth: 1.5,
    borderColor: C.accent + "55",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  loadingTitle: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  loadingText: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    paddingTop: 8,
    gap: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: C.accent,
    marginBottom: 2,
  },
  refreshButton: { padding: 8, marginLeft: 4 },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent + "44",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Count bar */
  countBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  countText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  oldTicketsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  oldTicketsBtnText: {
    fontSize: 11,
    color: C.accent,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  /* Active filter chips */
  activeFilters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
    backgroundColor: C.surfaceUp,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  /* Ticket Card */
  ticketCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  cardAccentBar: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: { flex: 1, padding: 14 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  issueType: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  detailsText: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  userTypeBadge: {
    backgroundColor: C.surfaceUp,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userTypeText: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },
  userName: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  userContact: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  userContactLink: {
    color: C.accent,
    fontSize: 12,
    marginTop: 2,
    textDecorationLine: "underline",
  },
  timestampText: {
    color: C.textMuted,
    fontSize: 10,
    marginTop: 5,
  },

  /* Empty */
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "700", color: C.textSecondary },
  emptySubtext: { fontSize: 13, color: C.textMuted },

  /* Filter Sheet */
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderLight,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceUp,
  },
  filterChipText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },

  applyBtn2: {
    backgroundColor: C.surfaceUp,
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  applyBtnText2: {
    color: C.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },

  /* Detail Screen */
  detailContainer: { flex: 1, backgroundColor: C.bg },
  detailScroll: { flex: 1 },
  detailScrollContent: { paddingBottom: 12 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    flexShrink: 1,
    textAlign: "center",
  },
  detailTop: {
    paddingHorizontal: 18,
    paddingTop: 20,
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  detailStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  detailStatusText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  detailBody: {
    marginHorizontal: 18,
    marginBottom: 16,
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailTimestamps: {
    marginHorizontal: 18,
    marginBottom: 16,
    gap: 4,
  },
  detailTimestampText: {
    color: C.textMuted,
    fontSize: 11,
  },

  /* Image */
  imageWrapper: {
    marginHorizontal: 18,
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  screenshot: { width: "100%", height: 190 },
  zoomHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: "center",
    gap: 5,
  },
  zoomText: { color: C.white, fontSize: 11, fontWeight: "600" },
  imageViewerHeader: {
    position: "absolute",
    top: 18,
    right: 16,
    zIndex: 2,
  },
  imageViewerCloseButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    top:50
  },

  /* Conversation */
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: 0.2,
  },
  commentsContent: {
    paddingVertical: 8,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginHorizontal: 18,
    marginVertical: 4,
    maxWidth: "78%",
  },
  adminBubble: {
    backgroundColor: C.accentSoft,
    borderTopRightRadius: 4,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: C.accent + "33",
  },
  userBubble: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMuted,
    marginBottom: 3,
    letterSpacing: 0.8,
  },
  bubbleText: { fontSize: 14, color: C.textPrimary, lineHeight: 20 },
  bubbleTimestamp: {
    alignSelf: "flex-end",
    marginTop: 6,
    color: C.textMuted,
    fontSize: 10,
  },
  noComments: {
    textAlign: "center",
    color: C.textMuted,
    fontSize: 13,
    marginTop: 20,
    fontStyle: "italic",
  },

  /* Reply */
  replyBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: C.border,
    gap: 10,
    backgroundColor: C.bg,
  },
  replyInput: {
    flex: 1,
    minWidth: 180,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 14,
    padding: 12,
    paddingTop: 12,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.surface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Status Modal */
  statusOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusSheet: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 13,
    backgroundColor: C.surfaceUp,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusOptionDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textSecondary,
  },
  cancelBtn: { marginTop: 6, padding: 14, alignItems: "center" },
  cancelBtnText: { color: C.textMuted, fontSize: 14, fontWeight: "600" },
});
