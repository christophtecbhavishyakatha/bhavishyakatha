import { CallTypeIcon } from "@/components/callTypeIcon";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppEventsLogger } from "react-native-fbsdk-next";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "https://bhavishyakatha.in/express";

const logMetaEvent = (eventName: string) => {
  try {
    // Expo Go or an old APK may not contain the native Facebook module yet.
    AppEventsLogger?.logEvent?.(eventName);
  } catch (error) {
    if (__DEV__) {
      console.warn("Meta App Events unavailable until a native rebuild:", error);
    }
  }
};

/* ---------- UTILITY ---------- */
const capitalizeName = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const formatCallTime = (value?: string | null) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatBirthDate = (value?: string | null) => {
  if (!value) return "";

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);

  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
};

const formatBirthTime = (value?: string | null) => {
  if (!value) return "";

  const match = String(value).match(/^(\d{2}):(\d{2})/);
  if (!match) return String(value);

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${meridiem}`;
};

/* ---------- HOME SCREEN ---------- */
export default function HomeScreen() {
  useEffect(() => {
    logMetaEvent("Downloaded_App");
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState("");
  const [dpName, setDpName] = useState("");
  const [wallet, setWallet] = useState(0);
  const [bioModal, setBioModal] = useState(false);
  const [bio, setBio] = useState("");
  const [bioLoading, setBioLoading] = useState(false);
  const [status, setStatus] = useState<"online" | "offline" | "busy">(
    "offline",
  );
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);
  const [chat, setChat] = useState(false);
  const [calls, setCalls] = useState<any[]>([]);
  const [rank, setRank] = useState(0);
  const [category, setCategory] = useState("");
  const [founding, setFounding] = useState(0);
  const requestPermissionOnly = async () => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status: askStatus } = await Notifications.requestPermissionsAsync();
    if (askStatus !== "granted") {
      await new Promise((resolve) => {
        Alert.alert(
          "Enable Notifications",
          "You previously denied notifications. To continue, you must enable them in Settings.",
          [
            {
              text: "Cancel",
              onPress: () => {
                router.replace("/login");
                resolve(false);
              },
            },
            {
              text: "Open Settings",
              onPress: async () => {
                if (Platform.OS === "ios")
                  await Linking.openURL("app-settings:");
                else await Linking.openSettings();
                resolve(true);
              },
            },
          ],
          { cancelable: false },
        );
      });
      return false;
    }
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      init();
      requestPermissionOnly();
    }, []),
  );

  const init = async () => {
    try {
      const uid = await AsyncStorage.getItem("user_id");
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUserId(uid);
      await Promise.all([fetchHome(uid), fetchCalls(uid, true)]);
    } catch (e) {
      console.error("Init error:", e);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalls = async (user_id: string, showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(
        `${API_BASE}/api/astrologer-v1/call-requests-v1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id }),
        },
      );
      if (!res.ok) {
        console.error("API error:", res.status);
        return;
      }
      const json = await res.json();
      if (json.success) setCalls(json.data || []);
      else console.warn("API returned success: false", json.message);
    } catch (err) {
      console.error("Fetch calls error:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchHome(userId);
      fetchCalls(userId, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchHome = async (uid: string) => {
    try {
      const res = await fetch(`${API_BASE}/astrologer/home/${uid}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data || {};
      setName(capitalizeName(data.full_name || "Astrologer"));
      setDpName(data.dp_name || "");
      setWallet(data.wallet_balance || 0);
      setStatus(data.status || "offline");
      setAudio(!!data.audio_call);
      setVideo(!!data.video_call);
      setChat(!!data.chat);
      setRank(data.rank || 0);
      setCategory(data.category || "");
      setFounding(data.founding || 0);
    } catch (error) {
      console.error("Fetch home error:", error);
    }
  };

  const updateStatusAPI = async (
    newStatus = status,
    newAudio = audio,
    newVideo = video,
    newChat = chat,
  ) => {
    try {
      const res = await fetch(`${API_BASE}/astrologer/status/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          status: newStatus,
          audio: newAudio,
          video: newVideo,
          chat: newChat,
        }),
      });
      if (!res.ok) return false;
      return true;
    } catch (err) {
      console.error("Update status error:", err);
      return false;
    }
  };

  const availabilityKey = (uid: string) => `astrologer_availability_${uid}`;

  const saveAvailability = async (
    uid: string,
    values: { audio: boolean; video: boolean; chat: boolean },
  ) => {
    // Never replace the last useful selection with the offline all-false state.
    if (values.audio || values.video || values.chat) {
      await AsyncStorage.setItem(availabilityKey(uid), JSON.stringify(values));
    }
  };

  const readAvailability = async (uid: string) => {
    const saved = await AsyncStorage.getItem(availabilityKey(uid));
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed?.audio === "boolean" &&
        typeof parsed?.video === "boolean" &&
        typeof parsed?.chat === "boolean" &&
        (parsed.audio || parsed.video || parsed.chat)
      ) {
        return { audio: parsed.audio, video: parsed.video, chat: parsed.chat };
      }
    } catch (error) {
      console.error("Invalid saved availability:", error);
    }

    return null;
  };

  const updateAll = async (
    requestedStatus = status,
    requestedAudio = audio,
    requestedVideo = video,
    requestedChat = chat,
    restoreSavedAvailability = false,
  ) => {
    try {
      let newStatus = requestedStatus;
      let newAudio = requestedAudio;
      let newVideo = requestedVideo;
      let newChat = requestedChat;

      if (
        (requestedStatus === "online" || requestedStatus === "busy") &&
        restoreSavedAvailability
      ) {
        // Restore the last useful selection. With no saved selection, keep the
        // current values so each service can be enabled independently.
        const saved = await readAvailability(userId);
        if (saved) {
          newAudio = saved.audio;
          newVideo = saved.video;
          newChat = saved.chat;
        }
        newStatus = requestedStatus;
      } else if (requestedStatus === "offline") {
        await saveAvailability(userId, { audio, video, chat });
        newStatus = "offline";
        newAudio = false;
        newVideo = false;
        newChat = false;
      } else if (requestedStatus === "busy") {
        newStatus = "busy";
      } else if (requestedAudio || requestedVideo || requestedChat) {
        // Any combination of one, two, or all three services is valid.
        newStatus = "online";
        await saveAvailability(userId, {
          audio: requestedAudio,
          video: requestedVideo,
          chat: requestedChat,
        });
      } else {
        // Turning off the final service also takes the astrologer offline, but
        // preserves the previous selection for the next Online action.
        await saveAvailability(userId, { audio, video, chat });
        newStatus = "offline";
        newAudio = false;
        newVideo = false;
        newChat = false;
      }

      setStatus(newStatus);
      setAudio(newAudio);
      setVideo(newVideo);
      setChat(newChat);

      // Always send the complete availability payload, including false flags.
      const success = await updateStatusAPI(
        newStatus,
        newAudio,
        newVideo,
        newChat,
      );
      if (!success) console.warn("Failed to update status");
    } catch (error) {
      console.error("Update status error:", error);
    }
  };

  const fetchBio = async () => {
    try {
      setBioLoading(true);
      const res = await fetch(`${API_BASE}/astrologer/bio/${userId}`);
      const json = await res.json();
      setBio(json.bio || "");
    } catch (err) {
      console.error(err);
    } finally {
      setBioLoading(false);
    }
  };

  const saveBio = async () => {
    try {
      setBioLoading(true);
      const res = await fetch(`${API_BASE}/astrologer/bio/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astrologer_id: userId, bio }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("Success", "Bio updated");
        setBioModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBioLoading(false);
    }
  };

  const acceptAudioCall = async (
    customerId: string,
    id: string,
    fullName: string,
    dateOfBirth: string,
    timeOfBirth: string,
    birthLocation: string,
    latitude: string,
    longitude: string,
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/astrologer/accept-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_type: "audio", id }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchCalls(userId, false);
        router.replace({
          pathname: "/audiocall" as any,
          params: {
            customerId,
            userId,
            fullName,
            id,
            dateOfBirth,
            timeOfBirth: timeOfBirth ?? "",
            birthLocation,
            latitude,
            longitude,
          },
        });
      } else console.warn("Failed to accept audio call:", json.message);
    } catch (err) {
      console.error("Accept audio call error:", err);
    } finally {
      setLoading(false);
    }
  };

  const acceptVideoCall = async (
    customerId: string,
    id: string,
    fullName: string,
    dateOfBirth: string,
    timeOfBirth: string,
    birthLocation: string,
    latitude: string,
    longitude: string,
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/astrologer/accept-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologer_id: userId,
          customer_id: customerId,
          call_type: "video",
          id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchCalls(userId, false);
        router.replace({
          pathname: "/videocall" as any,
          params: {
            customerId,
            userId,
            fullName,
            id,
            dateOfBirth,
            timeOfBirth,
            birthLocation,
            latitude,
            longitude,
          },
        });
      } else console.warn("Failed to accept video call:", json.message);
    } catch (err) {
      console.error("Accept video call error:", err);
    } finally {
      setLoading(false);
    }
  };

  const acceptChat = async (
    customerId: string,
    id: string,
    fullName: string,
    dateOfBirth: string,
    timeOfBirth: string,
    birthLocation: string,
    latitude: string,
    longitude: string,
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/astrologer/accept-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologer_id: userId,
          customer_id: customerId,
          call_type: "chat",
          id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchCalls(userId, false);
        router.replace({
          pathname: "/chatbox" as any,
          params: {
            customerId,
            userId,
            fullName,
            id,
            dateOfBirth,
            timeOfBirth: timeOfBirth ?? "",
            birthLocation,
            latitude,
            longitude,
          },
        });
      } else console.warn("Failed to accept chat:", json.message);
    } catch (err) {
      console.error("Accept chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const rejectCall = async (customerId: string, id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/astrologer/reject-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologer_id: userId,
          customer_id: customerId,
          id,
        }),
      });
      const json = await res.json();
      if (json.success) await fetchCalls(userId, false);
      else console.warn("Failed to reject call:", json.message);
    } catch (err) {
      console.error("Reject call error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RENDER ---------- */
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LinearGradient
          colors={["#1A0533", "#2D0A5E", "#1A0533"]}
          style={styles.fullFlex}
        >
          <View style={styles.center}>
            <View style={styles.loadingOrb}>
              <Text style={styles.loadingSymbol}>☽</Text>
            </View>
            <ActivityIndicator
              size="large"
              color="#F5C842"
              style={{ marginTop: 16 }}
            />
            <Text style={styles.loadingText}>Reading the stars…</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const statusConfig = {
    online: {
      label: "Online",
      activeCard: styles.statusOnlineActive,
      dot: styles.dotOnline,
      activeText: styles.statusTextOnline,
    },
    offline: {
      label: "Offline",
      activeCard: styles.statusOfflineActive,
      dot: styles.dotOffline,
      activeText: styles.statusTextOffline,
    },
    busy: {
      label: "Busy",
      activeCard: styles.statusBusyActive,
      dot: styles.dotBusy,
      activeText: styles.statusTextBusy,
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.fullFlex}
      >
        <LinearGradient
          colors={["#33293e", "#3a3152", "#717641"]}
          style={styles.fullFlex}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── HEADER ── */}
            <View style={styles.headerBg}>
              <LinearGradient
                colors={["#F5C842", "#E8A020", "#F5C842"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerTopBar}
              />
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerSub}>✦ NAMASTE 🙏 ✦</Text>
                  <Text style={styles.headerName}>
                    {name} (<Feather name="star" size={18} color="#FFD700" />{" "}
                    {rank})
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    {dpName ? (
                      <View style={styles.dpBadge}>
                        <Text style={styles.dpBadgeText}>✦ {dpName} </Text>
                      </View>
                    ) : null}
                    {category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.avatarRing,
                    founding === 1 && { right: "12%" },
                  ]}
                >
                  <LinearGradient
                    colors={["#7C3AED", "#4C1D95"]}
                    style={styles.avatarCircle}
                  >
                    <Text style={styles.avatarText}>
                      {name ? name.charAt(0).toUpperCase() : "A"}
                    </Text>
                  </LinearGradient>
                </View>
              </View>
              {founding === 1 && (
                <View style={styles.ribbon}>
                  <Text style={styles.ribbonText}>
                    FOUNDING{"\n"}ASTROLOGER
                  </Text>
                </View>
              )}
              {refreshing && (
                <View style={styles.refreshRow}>
                  <ActivityIndicator size="small" color="#C4B5FD" />
                  <Text style={styles.refreshText}>Updating…</Text>
                </View>
              )}
            </View>

            {/* ── WALLET ── */}
            <LinearGradient
              colors={["#3B0F8C", "#2D0A5E", "#1A0533"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletCard}
            >
              <View style={styles.walletOrb} />
              <View style={styles.walletOrb2} />
              <LinearGradient
                colors={["#F5C842", "#E8A020", "#D4900A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.walletTopBar}
              />
              <View style={styles.walletInner}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 0,
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.walletLabel}>💰 Wallet Balance</Text>
                  <TouchableOpacity
                    style={styles.txnBtn}
                    onPress={() => router.push("/withdrawalHistory")}
                  >
                    <Text style={styles.txnBtnText}>
                      Bank Transfer History →
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.walletAmount}>
                  ₹ {wallet.toLocaleString()}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <TouchableOpacity
                    style={styles.txnBtn}
                    onPress={() => router.push("/chatList")}
                  >
                    <Text style={styles.txnBtnText}>Chat History →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.txnBtn}
                    onPress={() => router.push("/transactions")}
                  >
                    <Text style={styles.txnBtnText}>Transactions →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            {/* ── QUICK ACTIONS ── */}
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => {
                  setBioModal(true);
                  fetchBio();
                }}
              >
                <Text style={styles.quickIcon}>📝</Text>
                <Text style={styles.quickLabel}>Update Bio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => router.push("/photos")}
              >
                <Text style={styles.quickIcon}>🖼️</Text>
                <Text style={styles.quickLabel}>Manage Photos</Text>
              </TouchableOpacity>
            </View>

            {/* ── BIO MODAL ── */}
            <Modal visible={bioModal} animationType="slide" transparent>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.fullFlex}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalCard}>
                    <LinearGradient
                      colors={["#F5C842", "#E8A020"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalTopBar}
                    />
                    <Text style={styles.modalTitle}>✦ Update Your Bio</Text>
                    <Text style={styles.modalSub}>
                      Tell seekers about your expertise
                    </Text>
                    {bioLoading && (
                      <ActivityIndicator
                        color="#7C3AED"
                        style={{ marginVertical: 8 }}
                      />
                    )}
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Write your bio…"
                      placeholderTextColor="#9E7DC8"
                      multiline
                      style={styles.bioInput}
                    />
                    <TouchableOpacity
                      style={styles.modalSaveBtn}
                      onPress={saveBio}
                    >
                      <LinearGradient
                        colors={["#7C3AED", "#5B21B6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalSaveBtnGradient}
                      >
                        <Text style={styles.modalSaveBtnText}>Save Bio</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setBioModal(false)}
                    >
                      <Text style={styles.modalCloseBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>

            {/* ── STATUS ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionDot}>◈</Text>
                <Text style={styles.sectionTitle}>Your Status</Text>
              </View>
              <View style={styles.statusRow}>
                {(["online", "offline", "busy"] as const).map((s) => {
                  const cfg = statusConfig[s];
                  const isActive = status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusCard, isActive && cfg.activeCard]}
                      onPress={() =>
                        updateAll(
                          s,
                          audio,
                          video,
                          chat,
                          s === "online" || s === "busy",
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <View style={[styles.statusDot, isActive && cfg.dot]} />
                      <Text
                        style={[styles.statusLabel, isActive && cfg.activeText]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── AVAILABILITY ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionDot}>◈</Text>
                <Text style={styles.sectionTitle}>Available For</Text>
              </View>
              <View style={styles.availRow}>
                <AvailChip
                  label="Audio Call"
                  emoji="🔊"
                  value={audio}
                  onPress={() => updateAll(status, !audio, video, chat)}
                />
                <AvailChip
                  label="Video Call"
                  emoji="🎥"
                  value={video}
                  onPress={() => updateAll(status, audio, !video, chat)}
                />
                <AvailChip
                  label="Chat"
                  emoji="💬"
                  value={chat}
                  onPress={() => updateAll(status, audio, video, !chat)}
                />
              </View>
            </View>

            {/* ── CALL REQUESTS ── */}
            {calls.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionDot}>◈</Text>
                  <Text style={styles.sectionTitle}>Incoming Requests</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{calls.length}</Text>
                  </View>
                </View>

                {calls.map((item, i) => (
                  <LinearGradient
                    key={i}
                    colors={["#3B0F8C", "#2D0A5E", "#1E0650"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.callCard}
                  >
                    <LinearGradient
                      colors={["#F5C842", "#E8A020"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.callCardTopBar}
                    />
                    <View style={styles.callCardTop}>
                      <View style={styles.callAvatarRing}>
                        <LinearGradient
                          colors={["#7C3AED", "#4C1D95"]}
                          style={styles.callAvatar}
                        >
                          <Text style={styles.callAvatarText}>
                            {item.full_name
                              ? item.full_name.charAt(0).toUpperCase()
                              : "?"}
                          </Text>
                        </LinearGradient>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.callNameRow}>
                          <Text style={styles.callName}>{item.full_name}</Text>
                          <CallTypeIcon type={item.call_type} size={22} />
                        </View>
                        <Text style={styles.callMeta}>
                          🎂 {formatBirthDate(item.date_of_birth)}
                          {formatBirthTime(item.time_of_birth)
                            ? `  🕐 ${formatBirthTime(item.time_of_birth)}`
                            : ""}
                        </Text>
                        {formatCallTime(item.created_at) ? (
                          <Text style={styles.callCreatedAt}>
                            Requested at {formatCallTime(item.created_at)}
                          </Text>
                        ) : null}
                        {item.location ? (
                          <Text style={styles.callLocation}>
                            📍 {item.location}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.callDivider} />

                    <View style={styles.callActions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                          if (item.call_type === "audio")
                            acceptAudioCall(
                              item.customer_id,
                              item.id,
                              item.full_name,
                              item.date_of_birth,
                              item.time_of_birth,
                              item.location,
                              item.latitude,
                              item.longitude,
                            );
                          else if (item.call_type === "video")
                            acceptVideoCall(
                              item.customer_id,
                              item.id,
                              item.full_name,
                              item.date_of_birth,
                              item.time_of_birth,
                              item.location,
                              item.latitude,
                              item.longitude,
                            );
                          else if (item.call_type === "chat")
                            acceptChat(
                              item.customer_id,
                              item.id,
                              item.full_name,
                              item.date_of_birth,
                              item.time_of_birth,
                              item.location,
                              item.latitude,
                              item.longitude,
                            );
                        }}
                      >
                        <LinearGradient
                          colors={["#7C3AED", "#5B21B6"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.acceptBtnGradient}
                        >
                          <Text style={styles.acceptBtnText}>✓ Accept</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => rejectCall(item.customer_id, item.id)}
                      >
                        <Text style={styles.rejectBtnText}>✕ Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}

            <Text style={styles.footer}>✦ ✦ ✦</Text>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- AVAIL CHIP ---------- */
function AvailChip({
  label,
  emoji,
  value,
  onPress,
}: {
  label: string;
  emoji: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, value && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {value ? (
        <LinearGradient
          colors={["#7C3AED", "#5B21B6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipGradient}
        >
          <Text style={styles.chipEmoji}>{emoji}</Text>
          <Text style={styles.chipLabelActive}>{label}</Text>
          <Text style={styles.chipCheck}>✓</Text>
        </LinearGradient>
      ) : (
        <View style={styles.chipInner}>
          <Text style={styles.chipEmoji}>{emoji}</Text>
          <Text style={styles.chipLabel}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#1A0533" },
  fullFlex: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  /* Loading */
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(124,58,237,0.2)",
    borderWidth: 1.5,
    borderColor: "#F5C842",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSymbol: { fontSize: 34, color: "#F5C842" },
  loadingText: {
    marginTop: 10,
    color: "#C4B5FD",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 1,
  },

  /* Header */
  headerBg: {
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 18,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.25)",
  },
  headerTopBar: { height: 2, width: "100%" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerLeft: { flex: 1, marginRight: 10 },
  headerSub: {
    fontSize: 9,
    color: "#F5C842",
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F3F0FF",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  dpBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(124,58,237,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.5)",
  },
  dpBadgeText: { fontSize: 10, color: "#C4B5FD", fontWeight: "600" },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#F5C842",
    padding: 2,
    shadowColor: "#F5C842",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#F3F0FF" },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 4,
  },
  refreshText: { fontSize: 11, color: "#C4B5FD" },
  categoryBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(245,200,66,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.4)",
  },
  categoryText: { fontSize: 10, color: "#F5C842", fontWeight: "600" },
  ribbon: {
    position: "absolute",
    top: 12,
    right: -42,
    width: 150,
    backgroundColor: "#D4AF37",
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    zIndex: 999,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  ribbonText: {
    color: "#4A148C",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },
  /* Wallet */
  walletCard: {
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.4)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  walletTopBar: { height: 2 },
  walletOrb: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(245,200,66,0.07)",
    top: -20,
    right: -10,
  },
  walletOrb2: {
    position: "absolute",
    width: 65,
    height: 65,
    borderRadius: 32,
    backgroundColor: "rgba(124,58,237,0.08)",
    bottom: -15,
    left: 20,
  },
  walletInner: { paddingHorizontal: 16, paddingVertical: 12 },
  walletLabel: {
    fontSize: 10,
    color: "#F5C842",
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  walletAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F3F0FF",
    letterSpacing: 0.3,
  },
  txnBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "rgba(124,58,237,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.5)",
  },
  txnBtnText: { color: "#DDD6FE", fontWeight: "700", fontSize: 11 },

  /* Quick Actions */
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 14,
    marginBottom: 10,
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(245,200,66,0.25)",
    gap: 3,
  },
  quickIcon: { fontSize: 18 },
  quickLabel: { fontSize: 11, fontWeight: "700", color: "#DDD6FE" },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,0,30,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#1E0840",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.2)",
  },
  modalTopBar: { height: 3, marginBottom: 24 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F3F0FF",
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  modalSub: {
    fontSize: 13,
    color: "#9E7DC8",
    marginBottom: 18,
    paddingHorizontal: 24,
  },
  bioInput: {
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.4)",
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
    textAlignVertical: "top",
    fontSize: 15,
    color: "#F3F0FF",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 18,
    marginHorizontal: 24,
  },
  modalSaveBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 24,
    marginBottom: 12,
  },
  modalSaveBtnGradient: { paddingVertical: 15, alignItems: "center" },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    marginHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.4)",
  },
  modalCloseBtnText: { color: "#C4B5FD", fontWeight: "700", fontSize: 14 },

  /* Section */
  section: { paddingHorizontal: 14, marginBottom: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sectionDot: { fontSize: 11, color: "#F5C842" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F3F0FF",
    flex: 1,
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 },

  /* Status */
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusCard: {
    flex: 1,
    minWidth: 88,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.3)",
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  statusOnlineActive: {
    backgroundColor: "rgba(22,163,74,0.15)",
    borderColor: "#16A34A",
  },
  statusOfflineActive: {
    backgroundColor: "rgba(156,163,175,0.15)",
    borderColor: "#9CA3AF",
  },
  statusBusyActive: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "#EF4444",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotOnline: { backgroundColor: "#16A34A" },
  dotOffline: { backgroundColor: "#9CA3AF" },
  dotBusy: { backgroundColor: "#EF4444" },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
  },
  statusTextOnline: { color: "#4ADE80" },
  statusTextOffline: { color: "#D1D5DB" },
  statusTextBusy: { color: "#F87171" },

  /* Availability Chips */
  availRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flex: 1,
    minWidth: 86,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.3)",
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  chipActive: { borderColor: "#7C3AED" },
  chipGradient: { paddingVertical: 10, alignItems: "center", gap: 2 },
  chipInner: { paddingVertical: 10, alignItems: "center", gap: 2 },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C4B5FD",
    textAlign: "center",
  },
  chipLabelActive: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  chipCheck: { fontSize: 10, color: "#F5C842", fontWeight: "800" },

  /* Call Cards */
  callCard: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(245,200,66,0.3)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  callCardTopBar: { height: 2 },
  callCardTop: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  callAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#F5C842",
    padding: 2,
    shadowColor: "#F5C842",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  callAvatar: {
    flex: 1,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  callAvatarText: { fontSize: 18, fontWeight: "800", color: "#F3F0FF" },
  callNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  callName: { fontSize: 15, fontWeight: "800", color: "#F3F0FF", flex: 1 },
  callMeta: {
    fontSize: 12,
    color: "#C4B5FD",
    fontWeight: "600",
    marginBottom: 2,
    lineHeight: 18,
  },
  callCreatedAt: {
    fontSize: 11,
    color: "#F5C842",
    fontWeight: "600",
    marginBottom: 2,
  },
  callLocation: { fontSize: 11, color: "#9E7DC8", fontWeight: "500" },
  callDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 14,
  },
  callActions: { flexDirection: "row", gap: 10, padding: 12 },
  acceptBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  acceptBtnGradient: { paddingVertical: 11, alignItems: "center" },
  acceptBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.5)",
  },
  rejectBtnText: { color: "#F87171", fontWeight: "700", fontSize: 14 },

  /* Footer */
  footer: {
    textAlign: "center",
    color: "rgba(245,200,66,0.35)",
    fontSize: 16,
    letterSpacing: 8,
    marginTop: 4,
    marginBottom: 8,
  },
});
