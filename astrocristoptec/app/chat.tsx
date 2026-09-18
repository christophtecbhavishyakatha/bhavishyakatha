import {
  clearActiveCallSession,
  setActiveCallSession,
} from "@/lib/activeCallSession";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  Platform,
  StatusBar,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import WalletRecharge from "./components/WalletRecharge";
import { io, type Socket } from "socket.io-client";
import LoadingScreen from "./components/loadingScreen";
import { CLIENT_API_BASE_URL, CLIENT_AUTH_API_BASE_URL } from "../lib/api";
type ChatPayload = {
  historyId?: number;
  id: string;
  callId: string;
  channelName: string;
  text: string;
  imageUrl?: string;
  messageType?: "text" | "image";
  sender: "user" | "astrologer";
  senderId: string;
  sentAt: string;
};
import LowBalanceModal from './components/LowBalanceModal';
type ChatPayloadLike = Partial<ChatPayload> & {
  historyId?: string | number;
  history_id?: string | number;
  id?: string | number;
  call_id?: string | number;
  channel_name?: string;
  sender_id?: string | number;
  sender_type?: "user" | "astrologer";
  sent_at?: string;
  created_at?: string;
  createdAt?: string;
  message?: string;
  image_url?: string;
  imageUrl?: string;
  message_type?: "text" | "image";
  messageType?: "text" | "image";
};

type ChatTimerEvent = {
  callId?: string;
  startedAt?: string | null;
  expiresAt?: string | null;
};

type ChatHistoryCursor = {
  id: number;
  sentAt: string;
};

const SOCKET_URL = "https://bhavishyakatha.in/";
const CHAT_API = "https://bhavishyakatha.in/express/api/chat";
const ASTROLOGER_API = "https://bhavishyakatha.in/express/astrologer";
const CLIENT_API = CLIENT_API_BASE_URL;

type RequestLocationSuggestion = {
  label?: string;
  display_name?: string;
  lat: string;
  lon: string;
};

type RequestDraft = {
  fullName: string;
  dateOfBirth: Date | null;
  timeOfBirth: Date | null;
  location: string;
  latitude: string;
  longitude: string;
};

const emptyRequestDraft = (): RequestDraft => ({
  fullName: "",
  dateOfBirth: null,
  timeOfBirth: null,
  location: "",
  latitude: "",
  longitude: "",
});

const parseBirthDate = (value?: string | null) => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const parts = value.split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [first, second, third] = parts;
  const date = new Date(first > 31 ? first : third, second - 1, first > 31 ? third : first);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseBirthTime = (value?: string | null) => {
  if (!value) return null;

  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    if (ampmMatch[3].toUpperCase() === "PM" && hours < 12) hours += 12;
    if (ampmMatch[3].toUpperCase() === "AM" && hours === 12) hours = 0;

    const time = new Date();
    time.setHours(hours, Number(ampmMatch[2]), 0, 0);
    return time;
  }

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const time = new Date();
    time.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return time;
  }

  const parsed = new Date(`1970-01-01T${value}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatBirthDate = (date: Date | null) =>
  date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
const formatBirthTime = (date: Date | null) =>
  date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const formatDateForApi = (date: Date | null) =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";
const formatTimeForApi = (date: Date | null) =>
  date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00` : "";

const formatMessageDate = (value?: string | null) => {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = date.toDateString();
  if (dateKey === today.toDateString()) {
    return "Today";
  }

  if (dateKey === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMessageTime = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const sortMessages = (items: ChatPayload[]) =>
  [...items].sort((a, b) => {
    const left = new Date(a.sentAt).getTime();
    const right = new Date(b.sentAt).getTime();

    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0;
    }

    if (Number.isNaN(left)) {
      return 1;
    }

    if (Number.isNaN(right)) {
      return -1;
    }

    return left - right;
  });

const mergeMessages = (current: ChatPayload[], incoming: ChatPayload[]) => {
  const byId = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  return sortMessages([...byId.values()]);
};

const normalizeHistoryCursor = (value: any): ChatHistoryCursor | null => {
  const historyId = Number(value?.id);
  const sentAt = String(value?.sentAt || "");

  if (!Number.isFinite(historyId) || historyId <= 0 || !sentAt) {
    return null;
  }

  return {
    id: historyId,
    sentAt,
  };
};

const normalizeMessage = (value: ChatPayloadLike): ChatPayload | null => {
  const id = String(value.id ?? "");
  const text = String(value.text ?? value.message ?? "").trim();
  const imageUrl = String(value.imageUrl ?? value.image_url ?? "").trim();
  const historyId = Number(value.historyId ?? value.history_id ?? 0);

  if (!id || (!text && !imageUrl)) {
    return null;
  }

  return {
    historyId:
      Number.isFinite(historyId) && historyId > 0 ? historyId : undefined,
    id,
    callId: String(value.callId ?? value.call_id ?? ""),
    channelName: String(value.channelName ?? value.channel_name ?? ""),
    text,
    imageUrl,
    messageType:
      (value.messageType ?? value.message_type) === "image" || imageUrl
        ? "image"
        : "text",
    sender:
      (value.sender ?? value.sender_type) === "astrologer"
        ? "astrologer"
        : "user",
    senderId: String(value.senderId ?? value.sender_id ?? ""),
    sentAt: String(
      value.sentAt ??
        value.sent_at ??
        value.createdAt ??
        value.created_at ??
        "",
    ),
  };
};
const chatAgainTranslations = {
  en: {
    chatEnded: "This chat has ended",
    chatAgain: "Chat Again",
    requestSent: "Request Sent",
    astrologerWillJoin: "Request sent. Please wait, the astrologer will join shortly.",
    confirmRequest: "Confirm Request",
    verifyBirthDetails:
      "Please verify your birth details before sending the request.",
    requestSuccessfullySent: "Your chat request has been sent successfully.",
  },

  bn: {
    chatEnded: "এই চ্যাটটি শেষ হয়েছে",
    chatAgain: "আবার চ্যাট করুন",
    requestSent: "অনুরোধ পাঠানো হয়েছে",
    astrologerWillJoin:
      "অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে অপেক্ষা করুন, জ্যোতিষী শীঘ্রই যোগ দেবেন।",
    confirmRequest: "অনুরোধ নিশ্চিত করুন",
    verifyBirthDetails:
      "অনুরোধ পাঠানোর আগে আপনার জন্মের তথ্য যাচাই করুন।",
    requestSuccessfullySent: "আপনার চ্যাটের অনুরোধ সফলভাবে পাঠানো হয়েছে।",
  },

  hi: {
    chatEnded: "यह चैट समाप्त हो गई है",
    chatAgain: "फिर से चैट करें",
    requestSent: "अनुरोध भेज दिया गया",
    astrologerWillJoin:
      "अनुरोध भेज दिया गया है। कृपया प्रतीक्षा करें, ज्योतिषी जल्द ही जुड़ेंगे।",
    confirmRequest: "अनुरोध की पुष्टि करें",
    verifyBirthDetails:
      "अनुरोध भेजने से पहले अपनी जन्म संबंधी जानकारी की पुष्टि करें।",
    requestSuccessfullySent: "आपका चैट अनुरोध सफलतापूर्वक भेज दिया गया है।",
  },
};
const normalizeMessages = (items: ChatPayloadLike[]) =>
  sortMessages(
    items
      .map((item) => normalizeMessage(item))
      .filter((item): item is ChatPayload => Boolean(item)),
  );

export default function ChatScreen() {
  useKeepAwake("chat-session");

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { CallService } = NativeModules;
  const {
    callerName,
    callId,
    channelName: initialChannelName,
    channel_name: initialChannelNameSnakeCase,
    astrologerId: initialAstrologerId,
  } = useLocalSearchParams<{
    callerName?: string;
    callId?: string;
    channelName?: string;
    channel_name?: string;
    astrologerId?: string;
  }>();

  const initialResolvedChannelName = String(
    initialChannelName || initialChannelNameSnakeCase || "",
  );

  const [messages, setMessages] = useState<ChatPayload[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [channelName, setChannelName] = useState(initialResolvedChannelName);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<ChatHistoryCursor | null>(
    null,
  );
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [timeLeftLabel, setTimeLeftLabel] = useState("Connecting...");
  const [timeSpentLabel, setTimeSpentLabel] = useState("00:00");
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [language, setLanguage] = useState("en");

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<ChatPayload> | null>(null);
  const didEndRef = useRef(false);
  const manuallyEndedRef = useRef(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);
  const pendingScrollToBottomRef = useRef(false);
  const pendingScrollAnimatedRef = useRef(true);
  const pendingInitialScrollRef = useRef(false);

  const resolvedCallId = String(callId || "");
  const resolvedAstrologerId = String(initialAstrologerId || resolvedCallId);
  const resolvedCallerName = String(callerName || "Astrologer");
  const resolvedChannelName = channelName || initialResolvedChannelName;
const resolvedAstrologerDp = String(callerName || "");
  const [showRechargePopup, setShowRechargePopup] = useState(false);
const [chatEnded, setChatEnded] = useState(false);
const [showLowBalance, setShowLowBalance] = useState(false);
  const [showChatAgainModal, setShowChatAgainModal] = useState(false);
  const [chatAgainDraft, setChatAgainDraft] = useState<RequestDraft>(emptyRequestDraft());
  const [chatAgainLoading, setChatAgainLoading] = useState(false);
  const [chatAgainSending, setChatAgainSending] = useState(false);
  const [chatAgainError, setChatAgainError] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<RequestLocationSuggestion[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [astrologerId, setAstrologerId] = useState('');
  const [chatAgainRequestSent, setChatAgainRequestSent] = useState(false);
  const chatText =
  chatAgainTranslations[language as keyof typeof chatAgainTranslations] ||
  chatAgainTranslations.en;
  const locationSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unknownBirthTimeLabel = language === "hi"
    ? "मुझे अपना जन्म समय नहीं पता"
    : language === "bn"
      ? "আমি আমার জন্ম সময় জানি না"
      : "I don't know my birth time";

  useEffect(() => {
    setAstrologerId(initialAstrologerId||'');
    AsyncStorage.getItem("user-language").then((savedLanguage) => {
      if (savedLanguage === "hi" || savedLanguage === "bn" || savedLanguage === "en") {
        setLanguage(savedLanguage);
      }
    });
  }, []);
  const scrollToBottom = useCallback((animated = true) => {
    pendingScrollToBottomRef.current = true;
    pendingScrollAnimatedRef.current = animated;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!pendingScrollToBottomRef.current) {
      return;
    }

    pendingScrollToBottomRef.current = false;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({
        animated: pendingScrollAnimatedRef.current,
      });
    });
  }, []);

  const appendMessage = useCallback(
    (message: ChatPayloadLike) => {
      const normalizedMessage = normalizeMessage(message);
      if (!normalizedMessage) {
        return;
      }

      setMessages((prev) => mergeMessages(prev, [normalizedMessage]));

      if (normalizedMessage.sender === "user" || isNearBottomRef.current) {
        scrollToBottom();
      }
    },
    [scrollToBottom],
  );

  const parseTimestamp = (value?: string | null) => {
    if (!value) {
      return null;
    }

    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  const formatRemainingTime = (targetMs: number) => {
    const remainingSeconds = Math.max(
      0,
      Math.ceil((targetMs - Date.now()) / 1000),
    );
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const formatElapsedTime = (baseMs: number) => {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - baseMs) / 1000),
    );
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const beginExitFlow = useCallback(async () => {
    if (exitTimeoutRef.current) {
      return;
    }

    setLoadingScreen(true);
    CallService?.stop?.();
    await clearActiveCallSession();
    exitTimeoutRef.current = setTimeout(() => {
      router.replace("/");
    }, 5000);
  }, [CallService, router]);

  const applyTimerWindow = useCallback(
    async (payload: ChatTimerEvent) => {
      const nextStartedAtMs = parseTimestamp(payload.startedAt);
      const nextExpiresAtMs = parseTimestamp(payload.expiresAt);
      setStartedAtMs(nextStartedAtMs);
      setExpiresAtMs(nextExpiresAtMs);
      setTimeLeftLabel(
        nextExpiresAtMs
          ? formatRemainingTime(nextExpiresAtMs)
          : "Connecting...",
      );
      setTimeSpentLabel(
        nextStartedAtMs ? formatElapsedTime(nextStartedAtMs) : "00:00",
      );

      await setActiveCallSession({
        route: "/chat",
        callId: resolvedCallId,
        callerName: resolvedCallerName,
        callType: "chat",
      });

      if (resolvedCallId) {
        const callSession = {
          route: "/chat",
          callId: resolvedCallId,
          callerName: resolvedCallerName,
          callType: "chat",
        } as const;

        if (CallService?.startWithCallData) {
          CallService.startWithCallData(callSession);
        } else {
          CallService?.start?.();
        }
      }
    },
    [CallService, resolvedCallId, resolvedCallerName],
  );

  const initChat = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${CHAT_API}/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: resolvedCallId,
          channelName: resolvedChannelName,
          channel_name: resolvedChannelName,
          participantType: "user",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.ended) {
          await beginExitFlow();
          return;
        }

        throw new Error(data.message || "Failed to initialize chat");
      }

      const nextChannelName = String(
        data.channelName || resolvedChannelName || "",
      );
      setChannelName(nextChannelName);
      await applyTimerWindow({
        startedAt: data.startedAt,
        expiresAt: data.expiresAt,
      });

      const nextMessages = Array.isArray(data.messages)
        ? normalizeMessages(data.messages as ChatPayloadLike[])
        : [];
      pendingInitialScrollRef.current = true;
      setMessages(nextMessages);
      setHasMoreHistory(Boolean(data.pagination?.hasMore));
      setHistoryCursor(normalizeHistoryCursor(data.pagination?.nextCursor));
      isNearBottomRef.current = true;

      scrollToBottom(false);
    } catch (error) {
      console.log("Init chat error:", error);
    } finally {
      setLoading(false);
    }
  }, [
    applyTimerWindow,
    beginExitFlow,
    resolvedCallId,
    resolvedChannelName,
    scrollToBottom,
  ]);

  const loadOlderMessages = useCallback(async () => {
    if (
      loading ||
      loadingMoreHistory ||
      !hasMoreHistory ||
      !historyCursor?.id ||
      !historyCursor.sentAt
    ) {
      return;
    }

    try {
      setLoadingMoreHistory(true);

      const params = new URLSearchParams({
        callId: resolvedCallId,
        limit: "40",
        beforeHistoryId: String(historyCursor.id),
        beforeSentAt: historyCursor.sentAt,
      });

      const res = await fetch(`${CHAT_API}/messages?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load older messages");
      }

      const olderMessages = Array.isArray(data.messages)
        ? normalizeMessages(data.messages as ChatPayloadLike[])
        : [];

      setMessages((prev) => mergeMessages(prev, olderMessages));
      setHasMoreHistory(Boolean(data.pagination?.hasMore));
      setHistoryCursor(normalizeHistoryCursor(data.pagination?.nextCursor));
    } catch (error) {
      console.log("Load older messages error:", error);
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [
    hasMoreHistory,
    historyCursor,
    loading,
    loadingMoreHistory,
    resolvedCallId,
  ]);

  const openChatAgainModal = async () => {
    setChatAgainError("");
    setUnknownBirthTime(false);
    setLocationSuggestions([]);
    setChatAgainLoading(true);
    setShowChatAgainModal(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${CLIENT_AUTH_API_BASE_URL}/users/${userId}/birth-profile`);
      const json = await res.json();
      const user = json?.data ?? json;
      setChatAgainDraft({
        fullName: user?.full_name || "",
        dateOfBirth: parseBirthDate(user?.date_of_birth),
        timeOfBirth: parseBirthTime(user?.time_of_birth),
        location: user?.location || "",
        latitude: user?.latitude == null ? "" : String(user.latitude),
        longitude: user?.longitude == null ? "" : String(user.longitude),
      });
    } catch (error) {
      console.log("Chat again profile error:", error);
      setChatAgainDraft(emptyRequestDraft());
      setChatAgainError("Please enter your birth details.");
    } finally {
      setChatAgainLoading(false);
    }
  };

  useEffect(() => {
    if (!showChatAgainModal || chatAgainDraft.latitude || chatAgainDraft.longitude) {
      setLocationSuggestions([]);
      return;
    }
    const query = chatAgainDraft.location.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    locationSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${CLIENT_API}/location/search?q=${encodeURIComponent(query)}&limit=5`);
        const json = await res.json();
        setLocationSuggestions(json?.data || []);
      } catch (error) {
        console.log("Chat again location error:", error);
        setLocationSuggestions([]);
      }
    }, 450);
    return () => {
      if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    };
  }, [chatAgainDraft.latitude, chatAgainDraft.longitude, chatAgainDraft.location, showChatAgainModal]);

  const sendChatAgainRequest = async () => {
    const { fullName, dateOfBirth, timeOfBirth, location, latitude, longitude } = chatAgainDraft;
    if (!fullName.trim() || !dateOfBirth || (!timeOfBirth && !unknownBirthTime) || !location.trim() || !latitude || !longitude) {
      setChatAgainError("Please complete all birth details and select a location from suggestions.");
      return;
    }
    try {
      setChatAgainSending(true);
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      console.log("Sending chat again request with data:", {
        astrologerId: astrologerId,
        userId,
        full_name: fullName.trim(),
        date_of_birth: formatDateForApi(dateOfBirth),
        time_of_birth: formatTimeForApi(timeOfBirth),
        location: location.trim(),
        latitude,
        longitude,
        lat: latitude,
        long: longitude,
        callType: "chat",
      }); 
      const res = await fetch(`${CLIENT_API}/call/requestChat/v1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologerId: astrologerId,
          userId,
          full_name: fullName.trim(),
          date_of_birth: formatDateForApi(dateOfBirth),
          time_of_birth: formatTimeForApi(timeOfBirth),
          location: location.trim(),
          latitude,
          longitude,
          lat: latitude,
          long: longitude,
          callType: "chat",
        }),
      });
      const json = await res.json();
      if (json.code === "INSUFFICIENT_BALANCE") {
        setShowChatAgainModal(false);
        setShowLowBalance(true);
      } else if (json.code === "PREVIOUS_REQUEST_PENDING") {
        Alert.alert("Request Pending", json.message || "You already have a pending request.");
        setShowChatAgainModal(false);
      } else if (json.success) {
setChatAgainRequestSent(true);

  Alert.alert(
    chatText.requestSent,
    chatText.requestSuccessfullySent
  );

  setShowChatAgainModal(false);
      } else {
        setChatAgainError(json.message || "Unable to send chat request.");
      }
    } catch (error) {
      console.log("Chat again request error:", error);
      setChatAgainError("Something went wrong. Please try again.");
    } finally {
      setChatAgainSending(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    try {
      setSending(true);
      setInput("");

      const res = await fetch(`${CHAT_API}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: resolvedCallId,
          channelName: resolvedChannelName,
          channel_name: resolvedChannelName,
          senderType: "user",
          text,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.message) {
        if (data.ended) {
          didEndRef.current = true;
          await beginExitFlow();
          return;
        }

        throw new Error(data.message || "Failed to send message");
      }

      appendMessage(data.message as ChatPayloadLike);
    } catch (error) {
      console.log("Send message error:", error);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const sendImageMessage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (sending || !asset.base64) {
      return;
    }

    const sizeInBytes = (asset.base64.length * 3) / 4;
    const sizeInMB = sizeInBytes / 1024 / 1024;

    console.log(`[IMAGE] Upload size: ${sizeInMB.toFixed(2)} MB`);

    try {
      setSending(true);

      const res = await fetch(`${CHAT_API}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: resolvedCallId,
          channelName: resolvedChannelName,
          channel_name: resolvedChannelName,
          senderType: "user",
          text: "",
          imageBase64: asset.base64,
          imageName: asset.fileName || `chat-${Date.now()}.jpg`,
          imageMime: asset.mimeType || "image/jpeg",
        }),
      });

      const data = await res.json();

      if (!data.success || !data.message) {
        if (data.ended) {
          didEndRef.current = true;
          await beginExitFlow();
          return;
        }

        throw new Error(data.message || "Failed to send image");
      }

      appendMessage(data.message as ChatPayloadLike);
    } catch (error) {
      console.log("Send image error:", error);

      if (error instanceof Error) {
        console.log("Error message:", error.message);
      }

      Alert.alert(
        "Image not sent",
        error instanceof Error ? error.message : JSON.stringify(error),
      );
    } finally {
      setSending(false);
    }
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow gallery access to send a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    console.log("gallery result:", JSON.stringify(result));

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0]);
    }
  };

  const takePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow camera access to send a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    console.log("Camera result:", JSON.stringify(result));

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0]);
    }
  };

  const openImageOptions = () => {
    if (sending) {
      return;
    }

    Alert.alert("Send Photo", "Choose a photo source", [
      { text: "Camera", onPress: () => void takePhotoWithCamera() },
      { text: "Gallery", onPress: () => void pickImageFromGallery() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  useEffect(() => {
    initChat();

    return () => {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
      socketRef.current?.disconnect();
    };
  }, [initChat]);

  useEffect(() => {
    if (loading || !pendingInitialScrollRef.current) {
      return;
    }

    pendingInitialScrollRef.current = false;

    const scrollTimers = [0, 120, 280].map((delay) =>
      setTimeout(() => {
        scrollToBottom(false);
      }, delay),
    );

    return () => {
      scrollTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [loading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!resolvedChannelName) {
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit("chat:join", {
        callId: resolvedCallId,
        channelName: resolvedChannelName,
        channel_name: resolvedChannelName,
      });
    };

    const handleMessage = (payload: ChatPayloadLike) => {
      const payloadCallId = String(payload.callId ?? payload.call_id ?? "");
      const payloadChannelName = String(
        payload.channelName ?? payload.channel_name ?? "",
      );

      if (
        payloadCallId !== resolvedCallId &&
        payloadChannelName !== resolvedChannelName
      ) {
        return;
      }

      appendMessage(payload);
    };

    const handleStarted = (payload: ChatTimerEvent) => {
      if (String(payload.callId ?? "") !== resolvedCallId) {
        return;
      }

      void applyTimerWindow(payload);
    };

const handleEnded = (payload: { callId?: string }) => {
  if (String(payload?.callId ?? "") !== resolvedCallId) {
    return;
  }

  // A user-initiated end should not trigger the low-balance modal when the
  // server broadcasts the resulting chat:ended event.
  if (manuallyEndedRef.current) {
    return;
  }

  // Server ended the chat.
  // Do NOT navigate away.
  setChatEnded(true);
  setShowRechargePopup(false);
  setShowLowBalance(true);
  setInput("");

  // Stop call service, but keep this screen open.
  CallService?.stop?.();

  console.log("Chat ended by server");
};

    socket.on("connect", joinRoom);
    socket.on("chat:message", handleMessage);
    socket.on("chat:started", handleStarted);
    socket.on("chat:ended", handleEnded);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.emit("chat:leave", {
        channelName: resolvedChannelName,
        channel_name: resolvedChannelName,
      });
      socket.off("connect", joinRoom);
      socket.off("chat:message", handleMessage);
      socket.off("chat:started", handleStarted);
      socket.off("chat:ended", handleEnded);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    appendMessage,
    applyTimerWindow,
    beginExitFlow,
    resolvedChannelName,
    resolvedCallId,
  ]);

  useEffect(() => {
    const syncTimer = () => {
      if (!expiresAtMs) {
        setTimeLeftLabel("Connecting...");
      } else {
        const remaining = expiresAtMs - Date.now();
        if (remaining <= 0) {
          setTimeLeftLabel("00:00");
        } else {
          setTimeLeftLabel(formatRemainingTime(expiresAtMs));
          // Show recharge popup only when less than 2 minutes remain
          setShowRechargePopup(remaining <= 120000);
        }
      }

      if (!startedAtMs) {
        setTimeSpentLabel("00:00");
      } else {
        setTimeSpentLabel(formatElapsedTime(startedAtMs));
      }
    };

    syncTimer();

    const interval = setInterval(syncTimer, 1000);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          syncTimer();
        }
      },
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [expiresAtMs, startedAtMs]);

  const endChat = () => {
    if (chatEnded) {
      router.replace("/");
      return;
    }
    Alert.alert("End Chat", "Are you sure you want to end this chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          if (didEndRef.current) {
            return;
          }

          manuallyEndedRef.current = true;
          didEndRef.current = true;
          try {
            await saveLastCall();
            await fetch(`${ASTROLOGER_API}/call/end`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                call_id: resolvedCallId,
              }),
            });
          } catch (error) {
            console.log("End chat error:", error);
          } finally {
            await beginExitFlow();
          }
        },
      },
    ]);
  };

  const handleListScroll = useCallback(
    (event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      isNearBottomRef.current = distanceFromBottom <= 120;

      if (contentOffset.y <= 80) {
        void loadOlderMessages();
      }
    },
    [loadOlderMessages],
  );
const saveLastCall = async () => {
  try {
    await AsyncStorage.setItem(
      "lastCall",
      JSON.stringify({
        type: "chat",
        callId: resolvedCallId,
       // astrologerName: resolvedCallerName,
        astrologerDp: resolvedAstrologerDp,
      })
    );

    console.log("Last chat saved");
  } catch (error) {
    console.log("Save last chat error:", error);
  }
};
  const historyHeader = loadingMoreHistory ? (
    <View style={styles.historyLoader}>
      <ActivityIndicator size="small" color="#FF9933" />
      <Text style={styles.historyLoaderText}>Loading older chats...</Text>
    </View>
  ) : hasMoreHistory ? (
    <TouchableOpacity
      style={styles.historyMoreBtn}
      onPress={() => void loadOlderMessages()}
    >
      <Text style={styles.historyMoreText}>Load older chat</Text>
    </TouchableOpacity>
  ) : messages.length > 0 ? (
    <View style={styles.historyStart}>
      <Text style={styles.historyStartText}>Start of saved room history</Text>
    </View>
  ) : null;

  const renderItem = ({
    item,
    index,
  }: {
    item: ChatPayload;
    index: number;
  }) => {
    const isUser = item.sender === "user";
    const currentDate = formatMessageDate(item.sentAt);
    const previousDate =
      index > 0 ? formatMessageDate(messages[index - 1]?.sentAt) : null;
    const showDateSeparator = index === 0 || currentDate !== previousDate;

    return (
      <View>
        {showDateSeparator ? (
          <View style={styles.dateSeparatorWrap}>
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>{currentDate}</Text>
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.messageRow,
            isUser ? styles.userMessageRow : styles.astroMessageRow,
          ]}
        >
          {!isUser ? (
            <View style={styles.astroAvatar}>
              <Feather name="moon" size={13} color="#FFD700" />
            </View>
          ) : null}

          {isUser ? (
            <LinearGradient
              colors={["#FFB35C", "#FF9933", "#E76F00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.messageBubble, styles.userMessage]}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                />
              ) : null}

              {item.text ? (
                <Text
                  style={[
                    styles.messageText,
                    styles.userMessageText,
                    item.imageUrl && styles.imageCaption,
                  ]}
                >
                  {item.text}
                </Text>
              ) : null}

              <View style={styles.messageMetaRow}>
                <Text style={[styles.messageTime, styles.userMessageTime]}>
                  {formatMessageTime(item.sentAt)}
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.messageBubble, styles.astroMessage]}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                />
              ) : null}

              {item.text ? (
                <Text
                  style={[
                    styles.messageText,
                    styles.astroMessageText,
                    item.imageUrl && styles.imageCaption,
                  ]}
                >
                  {item.text}
                </Text>
              ) : null}

              <View style={styles.messageMetaRow}>
                <Text style={[styles.messageTime, styles.astroMessageTime]}>
                  {formatMessageTime(item.sentAt)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2A0B4F" />

      <LinearGradient
        colors={["#2A0B4F", "#4A148C", "#7B2CBF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerGlow} />
        <TouchableOpacity onPress={endChat} style={styles.headerIconBtn}>
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Feather name="star" size={16} color="#FFD700" />
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {resolvedCallerName}
            </Text>
            {!chatEnded ? (
              <TouchableOpacity style={styles.endBtn} onPress={endChat}>
                <Text style={styles.endText}>End Chat</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {!chatEnded ? (
            <View style={styles.headerTimerRow}>
              <Text style={styles.headerStatText}>Left {timeLeftLabel}</Text>
              <Text style={styles.headerSpentText}>Spent {timeSpentLabel}</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
{showRechargePopup ? (
  <View style={styles.rechargePopup}>
    <View style={styles.rechargePopupIcon}>
      <Feather name="clock" size={18} color="#FFFFFF" />
    </View>

   <View style={styles.rechargePopupContent}>
  <Text style={styles.rechargePopupTitle}>
    {language === "bn"
      ? "আপনার চ্যাটের সময় শেষ হতে চলেছে"
      : language === "hi"
      ? "आपका चैट समय समाप्त होने वाला है"
      : "Your chat time is running low"}
  </Text>

  <Text style={styles.rechargePopupText}>
    {language === "bn"
      ? `আর মাত্র ${timeLeftLabel} বাকি।`
      : language === "hi"
      ? `केवल ${timeLeftLabel} शेष है।`
      : `Only ${timeLeftLabel} remaining.`}
  </Text>
</View>
{/* 
    <TouchableOpacity
      style={styles.rechargeButton}
      onPress={() => {
        // Recharge button logic later
        console.log("Recharge pressed");
      }}
    >
      <Feather name="plus" size={15} color="#FFFFFF" />
      <Text style={styles.rechargeButtonText}>Recharge</Text>
    </TouchableOpacity>
    */}
  </View>
) : null}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 12 : 24}
        enabled
      >
        <View style={styles.chatSurface}>
          <View style={styles.wallpaperOrbOne} />
          <View style={styles.wallpaperOrbTwo} />
          <View style={styles.wallpaperOrbThree} />

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#FF9933" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
              onContentSizeChange={handleContentSizeChange}
              onScroll={handleListScroll}
              scrollEventThrottle={16}
              ListHeaderComponent={historyHeader}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyBadge}>
                    <Feather name="message-circle" size={18} color="#4A148C" />
                  </View>
                  <Text style={styles.emptyTitle}>No previous chat yet</Text>
                  <Text style={styles.emptyText}>
                    Previous messages will appear here once the backend returns
                    them for this call channel.
                  </Text>
                </View>
              }
            />
          )}
        </View>
{!chatEnded ? (
        <View style={styles.composerWrap}>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.attachBtn, sending && styles.attachBtnDisabled]}
              onPress={openImageOptions}
              disabled={sending}
            >
              <Feather name="image" size={20} color="#4A148C" />
            </TouchableOpacity>

            <TextInput
              value={input}
              onChangeText={(v: string) => {
                const cleaned = v.replace(/[<>]/g, "");
                setInput(cleaned);
              }}
              placeholder="Type your message"
              placeholderTextColor="#7D8A84"
              style={styles.input}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={sending}
            >
              <LinearGradient
                colors={["#FFD700", "#FF9933"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtnGradient}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </View>
) : (
 <View style={styles.chatEndedWrap}>
  <Text style={styles.chatEndedText}>
    {chatAgainRequestSent
      ? chatText.astrologerWillJoin
      : chatText.chatEnded}
  </Text>

  <TouchableOpacity
    style={[
      styles.chatAgainButton,
      chatAgainRequestSent && styles.chatAgainButtonDisabled,
    ]}
    onPress={openChatAgainModal}
    disabled={chatAgainRequestSent}
    activeOpacity={0.85}
  >
    <Feather
      name={chatAgainRequestSent ? "check-circle" : "message-circle"}
      size={17}
      color="#FFFFFF"
    />

    <Text style={styles.chatAgainText}>
      {chatAgainRequestSent
        ? chatText.requestSent
        : chatText.chatAgain}
    </Text>
  </TouchableOpacity>
</View>
)}
      </KeyboardAvoidingView>
<Modal
  visible={showChatAgainModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowChatAgainModal(false)}
>
  <KeyboardAvoidingView
    style={styles.chatAgainOverlay}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <View style={styles.chatAgainCard}>
      <View style={styles.chatAgainHeader}>
        <Feather name="message-circle" size={25} color="#FF9933" />
        <View style={{ flex: 1 }}>
          <Text style={styles.chatAgainTitle}>
  {chatText.confirmRequest}
</Text>

<Text style={styles.chatAgainSubtitle}>
  {chatText.verifyBirthDetails}
</Text>
        </View>
      </View>
      {chatAgainLoading ? (
        <View style={styles.chatAgainLoading}><ActivityIndicator color="#4A148C" /></View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {chatAgainError ? <Text style={styles.chatAgainError}>{chatAgainError}</Text> : null}
          <Text style={styles.chatAgainLabel}>Full Name</Text>
          <TextInput
            style={styles.chatAgainInput}
            value={chatAgainDraft.fullName}
            onChangeText={(fullName) => setChatAgainDraft((prev) => ({ ...prev, fullName }))}
            placeholder="Full Name"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.chatAgainLabel}>Date of Birth</Text>
          <TouchableOpacity style={styles.chatAgainPicker} onPress={() => setShowDatePicker(true)}>
            <Text style={chatAgainDraft.dateOfBirth ? styles.chatAgainValue : styles.chatAgainPlaceholder}>{formatBirthDate(chatAgainDraft.dateOfBirth) || "Date of Birth"}</Text>
          </TouchableOpacity>
          <Text style={styles.chatAgainLabel}>Time of Birth</Text>
          <TouchableOpacity style={styles.chatAgainPicker} onPress={() => setShowTimePicker(true)}>
            <Text style={chatAgainDraft.timeOfBirth ? styles.chatAgainValue : styles.chatAgainPlaceholder}>{formatBirthTime(chatAgainDraft.timeOfBirth) || "Time of Birth"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatAgainUnknownRow}
            onPress={() => {
              setUnknownBirthTime((prev) => !prev);
              if (!unknownBirthTime) setChatAgainDraft((prev) => ({ ...prev, timeOfBirth: null }));
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.chatAgainUnknownBox, unknownBirthTime && styles.chatAgainUnknownBoxChecked]}>
              {unknownBirthTime ? <Feather name="check" size={14} color="#FFF" /> : null}
            </View>
            <Text style={styles.chatAgainUnknownText}>{unknownBirthTimeLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.chatAgainLabel}>Birth Location</Text>
          <TextInput
            style={styles.chatAgainInput}
            value={chatAgainDraft.location}
            onChangeText={(location) => setChatAgainDraft((prev) => ({ ...prev, location, latitude: "", longitude: "" }))}
            placeholder="Search location or Pincode"
            placeholderTextColor="#94A3B8"
          />
          {!chatAgainDraft.latitude && chatAgainDraft.location.trim().length >= 2 ? <Text style={styles.chatAgainHint}>Select a location from suggestions</Text> : null}
          {locationSuggestions.length > 0 ? (
            <View style={styles.chatAgainDropdown}>
              {locationSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`${suggestion.display_name}-${index}`}
                  style={styles.chatAgainOption}
                  onPress={() => {
                    setChatAgainDraft((prev) => ({ ...prev, location: suggestion.label || suggestion.display_name || "", latitude: String(suggestion.lat), longitude: String(suggestion.lon) }));
                    setLocationSuggestions([]);
                  }}
                >
                  <Text style={styles.chatAgainOptionText} numberOfLines={2}>{suggestion.display_name || suggestion.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View style={styles.chatAgainActions}>
            <TouchableOpacity style={styles.chatAgainCancel} onPress={() => setShowChatAgainModal(false)}>
              <Text style={styles.chatAgainCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatAgainSend} onPress={sendChatAgainRequest} disabled={chatAgainSending}>
              {chatAgainSending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.chatAgainSendText}>Send Request</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  </KeyboardAvoidingView>
</Modal>
{showDatePicker && (
  <DateTimePicker
    value={chatAgainDraft.dateOfBirth || new Date()}
    mode="date"
    maximumDate={new Date()}
    display={Platform.OS === "ios" ? "spinner" : "default"}
    onChange={(_event, date) => {
      setShowDatePicker(false);
      if (date) setChatAgainDraft((prev) => ({ ...prev, dateOfBirth: date }));
    }}
  />
)}
{showTimePicker && (
  <DateTimePicker
    value={chatAgainDraft.timeOfBirth || new Date()}
    mode="time"
    display={Platform.OS === "ios" ? "spinner" : "default"}
    onChange={(_event, time) => {
      setShowTimePicker(false);
      if (time) setChatAgainDraft((prev) => ({ ...prev, timeOfBirth: time }));
    }}
  />
)}
<LowBalanceModal
  visible={showLowBalance}
  balance={12.50}
  remainingMinutes={2}
  onClose={() => setShowLowBalance(false)}
  onRecharge={() => {
    setShowLowBalance(false);
    setShowRechargeModal(true);

    // Open recharge page
    
  }}
 
/>
<Modal
  visible={showRechargeModal}
  animationType="slide"
  transparent
  onRequestClose={() => {
    setShowRechargeModal(false);
  }}
>
  <View style={styles.rechargeOverlay}>
    <View style={styles.rechargeContainer}>
      <WalletRecharge
        onClose={() => {
          setShowRechargeModal(false);
        }}
        onWalletUpdated={(newBalance) => {
          console.log(
            "Wallet updated:",
            newBalance
          );
          setShowRechargeModal(false);
          setShowLowBalance(false);
        }}
      />
    </View>
  </View>
</Modal>
      <LoadingScreen loadingScreen={loadingScreen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A0B4F",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.14)",
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    right: -40,
    top: -70,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.38)",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    minWidth: 0,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 5,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255, 244, 211, 0.82)",
    fontWeight: "600",
  },
  headerStats: {
    alignItems: "flex-end",
    marginRight: 10,
    gap: 4,
    flexShrink: 0,
  },
  timerPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 153, 51, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  headerStatText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFF6D8",
  },
  headerSpentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.72)",
  },
  endBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    flexShrink: 0,
  },
  endText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  chatSurface: {
    flex: 1,
    backgroundColor: "#FFF7EA",
    overflow: "hidden",
  },
  wallpaperOrbOne: {
    position: "absolute",
    top: -70,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 153, 51, 0.16)",
  },
  wallpaperOrbTwo: {
    position: "absolute",
    bottom: 40,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(74, 20, 140, 0.09)",
  },
  wallpaperOrbThree: {
    position: "absolute",
    top: "35%",
    left: "34%",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 18,
    flexGrow: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  historyLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
    gap: 6,
  },
  historyLoaderText: {
    fontSize: 12,
    color: "#6B4A2B",
    fontWeight: "700",
  },
  historyMoreBtn: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 153, 51, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 153, 51, 0.22)",
  },
  historyMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A4B00",
  },
  historyStart: {
    alignItems: "center",
    marginBottom: 12,
  },
  historyStartText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6B45",
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  dateSeparator: {
    backgroundColor: "rgba(74, 20, 140, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4A148C",
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  astroMessageRow: {
    justifyContent: "flex-start",
  },
  astroAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    marginBottom: 1,
    backgroundColor: "#4A148C",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.45)",
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: "#2A0B4F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 9,
    elevation: 3,
  },
  userMessage: {
    borderTopRightRadius: 6,
  },
  astroMessage: {
    backgroundColor: "#F8F1FF",
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  astroMessageText: {
    color: "#2B164C",
  },
  messageImage: {
    width: 220,
    maxWidth: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  imageCaption: {
    marginTop: 8,
  },
  messageMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  userMessageTime: {
    color: "rgba(255, 255, 255, 0.82)",
  },
  astroMessageTime: {
    color: "#8E6CA8",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  emptyBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74, 20, 140, 0.1)",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3A105F",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: "#7A637D",
  },
  composerWrap: {
    backgroundColor: "#FFF7EA",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(74, 20, 140, 0.08)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingLeft: 7,
    paddingRight: 6,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    backgroundColor: "rgba(74, 20, 140, 0.08)",
  },
  attachBtnDisabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: "#2B164C",
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#FF9933",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.75,
  },
  rechargePopup: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: "#FFF3D6",
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255, 153, 51, 0.25)",
},

rechargePopupIcon: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FF9933",
  marginRight: 9,
},

rechargePopupContent: {
  flex: 1,
  marginRight: 8,
},

rechargePopupTitle: {
  fontSize: 13,
  fontWeight: "800",
  color: "#5C2A00",
},

rechargePopupText: {
  marginTop: 2,
  fontSize: 11,
  lineHeight: 15,
  fontWeight: "600",
  color: "#8A5A20",
},

rechargeButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 11,
  paddingVertical: 9,
  borderRadius: 18,
  backgroundColor: "#4A148C",
},

rechargeButtonText: {
  marginLeft: 4,
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: "800",
},
chatEndedWrap: {
  backgroundColor: "#FFF7EA",
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: Platform.OS === "ios" ? 14 : 12,
  borderTopWidth: 1,
  borderTopColor: "rgba(74, 20, 140, 0.08)",
  alignItems: "center",
},

chatEndedText: {
  fontSize: 13,
  fontWeight: "700",
  color: "#7A637D",
  marginBottom: 10,
},

chatAgainButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#4A148C",
  paddingHorizontal: 24,
  paddingVertical: 11,
  borderRadius: 22,
},

chatAgainOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 18,
},
chatAgainCard: {
  width: "100%",
  maxHeight: "86%",
  backgroundColor: "#FFFFFF",
  borderRadius: 22,
  padding: 20,
},
chatAgainHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
chatAgainTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
chatAgainSubtitle: { marginTop: 4, color: "#64748B", fontSize: 13, lineHeight: 18 },
chatAgainLoading: { paddingVertical: 32, alignItems: "center" },
chatAgainError: { backgroundColor: "#FEF2F2", color: "#991B1B", padding: 10, borderRadius: 10, marginBottom: 10, fontSize: 12 },
chatAgainLabel: { marginTop: 7, marginBottom: 6, color: "#4A148C", fontSize: 12, fontWeight: "800" },
chatAgainInput: { borderWidth: 1, borderColor: "rgba(74,20,140,0.16)", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, color: "#1E293B", fontSize: 14 },
chatAgainPicker: { borderWidth: 1, borderColor: "rgba(74,20,140,0.16)", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12 },
chatAgainValue: { color: "#1E293B", fontSize: 14, fontWeight: "600" },
chatAgainPlaceholder: { color: "#94A3B8", fontSize: 14 },
chatAgainUnknownRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 4 },
chatAgainUnknownBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginRight: 10 },
chatAgainUnknownBoxChecked: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
chatAgainUnknownText: { color: "#334155", fontSize: 14, fontWeight: "600" },
chatAgainHint: { marginTop: 6, color: "#B45309", fontSize: 12, fontWeight: "600" },
chatAgainDropdown: { marginTop: 8, borderWidth: 1, borderColor: "rgba(74,20,140,0.12)", borderRadius: 13, overflow: "hidden" },
chatAgainOption: { paddingHorizontal: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(148,163,184,0.16)" },
chatAgainOptionText: { color: "#334155", fontSize: 13, lineHeight: 18 },
chatAgainActions: { flexDirection: "row", gap: 10, marginTop: 16 },
chatAgainCancel: { flex: 1, backgroundColor: "#E5E7EB", borderRadius: 11, paddingVertical: 12, alignItems: "center" },
chatAgainCancelText: { color: "#374151", fontWeight: "700" },
chatAgainSend: { flex: 1, backgroundColor: "#F59E0B", borderRadius: 11, paddingVertical: 12, alignItems: "center" },
chatAgainSendText: { color: "#FFFFFF", fontWeight: "700" },

chatAgainText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "800",
  marginLeft: 7,
},
rechargeOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  justifyContent: "flex-end",
},

rechargeContainer: {
  height: "92%",
  backgroundColor: "#EEF4FF",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  overflow: "hidden",
},
chatAgainButtonDisabled: {
  backgroundColor: "#9CA3AF",
  opacity: 0.8,
},
});
