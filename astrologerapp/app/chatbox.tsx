import {
  clearActiveCallSession,
  setActiveCallSession,
} from "@/utils/callSession";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { io, type Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
type ChatPayload = {
  historyId?: number;
  id: string;
  callId: string;
  channelName: string;
  sender: "astrologer" | "user";
  senderId: string;
  text: string;
  imageUrl?: string;
  messageType?: "text" | "image";
  sentAt: string;
};

type ChatPayloadLike = Partial<ChatPayload> & {
  historyId?: string | number;
  history_id?: string | number;
  id?: string | number;
  call_id?: string | number;
  channel_name?: string;
  sender_id?: string | number;
  sender_type?: "astrologer" | "user";
  sent_at?: string;
  created_at?: string;
  createdAt?: string;
  message?: string;
  image_url?: string;
  imageUrl?: string;
  message_type?: "text" | "image";
  messageType?: "text" | "image";
};

type Message = {
  id: string;
  callId: string;
  channelName: string;
  text: string;
  imageUrl?: string;
  messageType?: "text" | "image";
  sender: "me" | "other";
  sentAt: string;
};

type ChatTimerEvent = {
  callId?: string;
  startedAt?: string | null;
  expiresAt?: string | null;
};

type QuickMessage = {
  id: string;
  message: string;
};

type ChatHistoryCursor = {
  id: number;
  sentAt: string;
};

const SOCKET_URL = "https://bhavishyakatha.in/";
const CHAT_API = "https://bhavishyakatha.in/express/api/chat";
const ASTROLOGER_API = "https://bhavishyakatha.in/express/astrologer";
const UNANSWERED_CHAT_TIMEOUT_MS = 40 * 1000;

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

const sortMessages = (items: Message[]) =>
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

const mergeMessages = (current: Message[], incoming: Message[]) => {
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

const normalizeMessage = (message: ChatPayloadLike): Message | null => {
  const id = String(message.id ?? "");
  const text = String(message.text ?? message.message ?? "").trim();
  const imageUrl = String(message.imageUrl ?? message.image_url ?? "").trim();

  if (!id || (!text && !imageUrl)) {
    return null;
  }

  return {
    id,
    callId: String(message.callId ?? message.call_id ?? ""),
    channelName: String(message.channelName ?? message.channel_name ?? ""),
    text,
    imageUrl,
    messageType:
      (message.messageType ?? message.message_type) === "image" || imageUrl
        ? "image"
        : "text",
    sender:
      (message.sender ?? message.sender_type) === "astrologer" ? "me" : "other",
    sentAt: String(
      message.sentAt ??
        message.sent_at ??
        message.createdAt ??
        message.created_at ??
        "",
    ),
  };
};

const normalizeMessages = (messages: ChatPayloadLike[]) =>
  sortMessages(
    messages
      .map((message) => normalizeMessage(message))
      .filter((message): message is Message => Boolean(message)),
  );

export default function ChatScreen() {
  useKeepAwake();

  const insets = useSafeAreaInsets();
const {
  fullName = "Consultant",
  id,
  userId,
  customerId,
  dateOfBirth,
  timeOfBirth,
  birthLocation,
  channelName: initialChannelName,
  channel_name: initialChannelNameSnakeCase,
} = useLocalSearchParams<{
  fullName?: string;
  id?: string;
  userId?: string;
  customerId?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  birthLocation?: string;
  channelName?: string;
  channel_name?: string;
}>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [channelName, setChannelName] = useState(
    String(initialChannelName || initialChannelNameSnakeCase || ""),
  );
  const [sending, setSending] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<ChatHistoryCursor | null>(
    null,
  );
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [timeLeftLabel, setTimeLeftLabel] = useState("Waiting...");
  const [timeSpentLabel, setTimeSpentLabel] = useState("00:00");
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [quickMessageModal, setQuickMessageModal] = useState(false);
  const [loadingQuickMessages, setLoadingQuickMessages] = useState(false);

  const listRef = useRef<FlatList<Message> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const didEndRef = useRef(false);
  const chatStartedRef = useRef(false);
  const unansweredCallIdRef = useRef<string | null>(null);
  const unansweredDeadlineRef = useRef<number | null>(null);
  const unansweredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isNearBottomRef = useRef(true);
  const pendingScrollToBottomRef = useRef(false);
  const pendingScrollAnimatedRef = useRef(true);
  const pendingInitialScrollRef = useRef(false);
  const { CallService } = NativeModules;

  const resolvedCallId = String(id ?? "");
  const resolvedUserId = String(userId ?? "");
  const resolvedCustomerId = String(customerId ?? "");
  const resolvedFullName = String(fullName ?? "Consultant");
  const resolvedDateOfBirth = String(dateOfBirth ?? "");
const resolvedTimeOfBirth = String(timeOfBirth ?? "");
const resolvedBirthLocation = String(birthLocation ?? "");
  const resolvedChannelName =
    channelName ||
    String(initialChannelName || initialChannelNameSnakeCase || "");
  const hasChatStarted = startedAtMs !== null;
  const showWaitingModal = !loading && !hasChatStarted && !didEndRef.current;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const Zoom = ImageZoom as any;
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

      setMessages((prev) => {
        return mergeMessages(prev, [normalizedMessage]);
      });

      if (normalizedMessage.sender === "me" || isNearBottomRef.current) {
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

  const clearUnansweredTimeout = useCallback((resetDeadline = true) => {
    if (unansweredTimeoutRef.current) {
      clearTimeout(unansweredTimeoutRef.current);
      unansweredTimeoutRef.current = null;
    }

    if (resetDeadline) {
      unansweredDeadlineRef.current = null;
      unansweredCallIdRef.current = null;
    }
  }, []);

  const exitChat = useCallback(async () => {
    clearUnansweredTimeout();
    CallService?.stop?.();
    await clearActiveCallSession();
    router.replace("/(tabs)");
  }, [CallService, clearUnansweredTimeout]);

  const notifyBackendChatNoAnswer = useCallback(async () => {
    if (!resolvedCallId) {
      return;
    }

    try {
      await fetch(`${ASTROLOGER_API}/call/no-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callId: resolvedCallId,
        }),
      });
    } catch (error) {
      console.warn("Unable to notify backend that chat was unanswered", error);
    }
  }, [resolvedCallId]);

  const endUnansweredChat = useCallback(async () => {
    if (didEndRef.current) {
      return;
    }

    didEndRef.current = true;
    clearUnansweredTimeout();
    await notifyBackendChatNoAnswer();
    await exitChat();
  }, [clearUnansweredTimeout, exitChat, notifyBackendChatNoAnswer]);

  const startUnansweredTimeout = useCallback(() => {
    clearUnansweredTimeout(false);

    if (
      unansweredCallIdRef.current !== resolvedCallId ||
      !unansweredDeadlineRef.current
    ) {
      unansweredCallIdRef.current = resolvedCallId;
      unansweredDeadlineRef.current = Date.now() + UNANSWERED_CHAT_TIMEOUT_MS;
    }

    const delayMs = Math.max(0, unansweredDeadlineRef.current - Date.now());

    unansweredTimeoutRef.current = setTimeout(() => {
      if (!didEndRef.current && !chatStartedRef.current) {
        void endUnansweredChat();
      }
    }, delayMs);
  }, [clearUnansweredTimeout, endUnansweredChat, resolvedCallId]);

  const applyTimerWindow = useCallback(
    async (payload: ChatTimerEvent) => {
      const nextStartedAtMs = parseTimestamp(payload.startedAt);
      const nextExpiresAtMs = parseTimestamp(payload.expiresAt);
      chatStartedRef.current = Boolean(nextStartedAtMs);

      if (nextStartedAtMs) {
        clearUnansweredTimeout();
      }

      setStartedAtMs(nextStartedAtMs);
      setExpiresAtMs(nextExpiresAtMs);
      setTimeLeftLabel(
        nextExpiresAtMs ? formatRemainingTime(nextExpiresAtMs) : "Waiting...",
      );
      setTimeSpentLabel(
        nextStartedAtMs ? formatElapsedTime(nextStartedAtMs) : "00:00",
      );

      await setActiveCallSession({
        callType: "chat",
        id: resolvedCallId,
        userId: resolvedUserId,
        customerId: resolvedCustomerId,
        fullName: resolvedFullName,
        status: "connected",
        startedAt: nextStartedAtMs ?? Date.now(),
        remoteUid: null,
        isMuted: false,
        isVideoOff: false,
        isSpeakerOn: true,
      });
    },
    [
      clearUnansweredTimeout,
      resolvedCallId,
      resolvedCustomerId,
      resolvedFullName,
      resolvedUserId,
    ],
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
          participantType: "astrologer",
          participantId: resolvedUserId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        if (data.ended) {
          await exitChat();
          return;
        }

        Alert.alert("Error", data.message || "Failed to initialize chat");
        return;
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
    } catch (err) {
      console.log("Init chat error:", err);
      Alert.alert("Error", "Failed to initialize chat");
    } finally {
      setLoading(false);
    }
  }, [
    applyTimerWindow,
    exitChat,
    resolvedCallId,
    resolvedChannelName,
    resolvedUserId,
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
    } catch (err) {
      console.log("Load older messages error:", err);
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
          senderType: "astrologer",
          text,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.message) {
        if (data.ended) {
          didEndRef.current = true;
          await exitChat();
          return;
        }

        throw new Error(data.message || "Failed to send message");
      }

      appendMessage(data.message as ChatPayloadLike);
    } catch (err) {
      console.log("Send error:", err);
      setInput(text);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    didEndRef.current = false;
    chatStartedRef.current = false;

    CallService?.start?.(
      "chat",
      resolvedCallId,
      resolvedUserId,
      resolvedCustomerId,
      resolvedFullName,
    );

    startUnansweredTimeout();
    initChat();

    return () => {
      socketRef.current?.disconnect();
      clearUnansweredTimeout(false);
      CallService?.stop?.();
    };
  }, [
    CallService,
    clearUnansweredTimeout,
    initChat,
    resolvedCallId,
    resolvedCustomerId,
    resolvedFullName,
    resolvedUserId,
    startUnansweredTimeout,
  ]);

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

      if (didEndRef.current) {
        return;
      }

      didEndRef.current = true;
      void exitChat();
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
    exitChat,
    resolvedCallId,
    resolvedChannelName,
  ]);

  // The customer starts the server timer when joining the chat. If the
  // astrologer screen was opened first, it can miss the one-time
  // `chat:started` socket event, so resync the timer window until it exists.
  useEffect(() => {
    if (startedAtMs || !resolvedCallId) {
      return;
    }

    let cancelled = false;

    const syncTimerWindow = async () => {
      try {
        const res = await fetch(`${CHAT_API}/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId: resolvedCallId,
            channelName: resolvedChannelName,
            channel_name: resolvedChannelName,
            participantType: "astrologer",
            participantId: resolvedUserId,
          }),
        });
        const data = await res.json();

        if (!cancelled && data.success && data.startedAt) {
          await applyTimerWindow({
            startedAt: data.startedAt,
            expiresAt: data.expiresAt,
          });
        }
      } catch (error) {
        console.warn("Unable to resync chat timer:", error);
      }
    };

    void syncTimerWindow();
    const interval = setInterval(() => {
      void syncTimerWindow();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    applyTimerWindow,
    resolvedCallId,
    resolvedChannelName,
    resolvedUserId,
    startedAtMs,
  ]);

  useEffect(() => {
    const syncTimer = () => {
      if (!expiresAtMs) {
        setTimeLeftLabel("Waiting...");
      } else {
        const remaining = expiresAtMs - Date.now();
        if (remaining <= 0) {
          setTimeLeftLabel("00:00");
        } else {
          setTimeLeftLabel(formatRemainingTime(expiresAtMs));
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
    Alert.alert("End Chat", "Are you sure you want to end this chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          if (didEndRef.current) {
            return;
          }

          didEndRef.current = true;
          try {
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
            await exitChat();
          }
        },
      },
    ]);
  };
  const openQuickMessages = async () => {
    setLoadingQuickMessages(true);
    setQuickMessageModal(true);

    try {
      const saved = await AsyncStorage.getItem("astrologer_quick_messages");

      if (!saved) {
        setQuickMessages([]);
        return;
      }

      const parsed = JSON.parse(saved);

      setQuickMessages(
        Array.isArray(parsed)
          ? parsed.filter(
              (item): item is QuickMessage =>
                Boolean(item?.id && typeof item?.message === "string")
            )
          : []
      );
    } catch (error) {
      console.log("Load quick messages error:", error);
      setQuickMessages([]);
      Alert.alert("Error", "Unable to load quick messages.");
    } finally {
      setLoadingQuickMessages(false);
    }
  };

  const selectQuickMessage = async (message: string) => {
    if (!hasChatStarted || sending) {
      return;
    }

    setQuickMessageModal(false);
    setInput("");

    // Reuse the existing chat sending API without changing
    // the normal text-input flow.
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
          senderType: "astrologer",
          text: message,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.message) {
        if (data.ended) {
          didEndRef.current = true;
          await exitChat();
          return;
        }

        throw new Error(data.message || "Failed to send quick message");
      }

      appendMessage(data.message as ChatPayloadLike);
    } catch (error) {
      console.log("Quick message send error:", error);
      Alert.alert("Error", "Failed to send quick message.");
    } finally {
      setSending(false);
    }
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

  const historyHeader = loadingMoreHistory ? (
    <View style={styles.historyLoader}>
      <ActivityIndicator size="small" color="#1F8B5F" />
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

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender === "me";
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

        <View style={[styles.messageRow, isMe ? styles.right : styles.left]}>
          <View
            style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
          >
            {item.imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedImage(item.imageUrl!)}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                />
              </TouchableOpacity>
            ) : null}

            {item.text ? (
              <Text style={[styles.text, item.imageUrl && styles.imageCaption]}>
                {item.text}
              </Text>
            ) : null}

            <View style={styles.messageMetaRow}>
              <Text
                style={[
                  styles.messageTime,
                  isMe ? styles.myTime : styles.otherTime,
                ]}
              >
                {formatMessageTime(item.sentAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
  <View style={styles.headerTitleRow}>
    <Text style={styles.headerTitle} numberOfLines={1}>
      {resolvedFullName}
    </Text>
    <TouchableOpacity style={styles.endBtn} onPress={endChat}>
      <Text style={styles.endText}>End Chat</Text>
    </TouchableOpacity>
  </View>

  <Text style={styles.headerSub} numberOfLines={1}>
    DOB: {resolvedDateOfBirth || "Not provided"}
    {"  "}
    {resolvedTimeOfBirth
      ? `Time: ${resolvedTimeOfBirth}`
      : "Time: Not provided"}
  </Text>

  <Text style={styles.headerSub} numberOfLines={1}>
    Birth Place: {resolvedBirthLocation || "Not provided"}
  </Text>

  <View style={styles.headerTimerRow}>
    {hasChatStarted ? (
      <>
        <Text style={styles.headerTimeLeftText}>Left {timeLeftLabel}</Text>
        <Text style={styles.headerStatText}>Spent {timeSpentLabel}</Text>
      </>
    ) : (
      <Text style={styles.headerStatText}>Waiting for user</Text>
    )}
  </View>
</View>
        <Modal
          visible={!!selectedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageViewer}>
            <TouchableOpacity
              style={styles.imageCloseButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.imageCloseText}>✕</Text>
            </TouchableOpacity>
            <Zoom
              cropWidth={Dimensions.get("window").width}
              cropHeight={Dimensions.get("window").height}
              imageWidth={Dimensions.get("window").width}
              imageHeight={Dimensions.get("window").height}
              enableSwipeDown
              onSwipeDown={() => setSelectedImage(null)}
            >
              <Image
                source={{ uri: selectedImage || "" }}
                style={styles.imageZoomImage}
                resizeMode="contain"
              />
            </Zoom>
          </View>
        </Modal>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 12 : 24}
        enabled
      >
        <View style={styles.chatSurface}>
          <View style={styles.wallpaperOrbOne} />
          <View style={styles.wallpaperOrbTwo} />

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#1F8B5F" />
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
                    <Text style={styles.emptyBadgeText}>Chat</Text>
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

        <View style={styles.composerWrap}>
          <View style={styles.inputBar}>
            <TouchableOpacity
  style={styles.quickMessageBtn}
  onPress={openQuickMessages}
  activeOpacity={0.8}
  disabled={!hasChatStarted || sending}
>
  <Text style={styles.quickMessageIcon}>⚡</Text>
</TouchableOpacity>

            <TextInput
              value={input}
          onChangeText={(v: string) => {
  const cleaned = v.replace(/[<>]/g, "");
  setInput(cleaned);
}}

              placeholder="Type a message"
              placeholderTextColor="#7D8A84"
              style={styles.input}
              multiline
              maxLength={1000}
              editable={hasChatStarted}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendBtn,
                (!hasChatStarted || sending) && styles.sendBtnDisabled,
              ]}
              disabled={!hasChatStarted || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={quickMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickMessageModal(false)}
      >
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalCard}>
            <View style={styles.quickModalHeader}>
              <View>
                <Text style={styles.quickModalTitle}>
                  Quick Messages
                </Text>
                <Text style={styles.quickModalSubtitle}>
                  Tap a message to send instantly
                </Text>
              </View>

              <TouchableOpacity
                style={styles.quickModalClose}
                onPress={() => setQuickMessageModal(false)}
              >
                <Text style={styles.quickModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingQuickMessages ? (
              <View style={styles.quickLoading}>
                <ActivityIndicator size="small" color="#1F8B5F" />
                <Text style={styles.quickLoadingText}>
                  Loading quick messages...
                </Text>
              </View>
            ) : quickMessages.length === 0 ? (
              <View style={styles.quickEmpty}>
                <View style={styles.quickEmptyIcon}>
                  <Text style={styles.quickEmptyEmoji}>💬</Text>
                </View>

                <Text style={styles.quickEmptyTitle}>
                  No quick response set yet
                </Text>

                <Text style={styles.quickEmptyText}>
                  Set your frequently used responses under{" "}
                  <Text style={styles.quickEmptyBold}>
                    Profile → Quick Message
                  </Text>
                </Text>

  
              </View>
            ) : (
              <FlatList
                data={quickMessages}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.quickListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.quickMessageItem}
                    activeOpacity={0.75}
                    disabled={!hasChatStarted || sending}
                    onPress={() => void selectQuickMessage(item.message)}
                  >
                    <View style={styles.quickMessageItemIcon}>
                      <Text style={styles.quickMessageItemEmoji}>💬</Text>
                    </View>

                    <Text style={styles.quickMessageItemText}>
                      {item.message}
                    </Text>

                    <Text style={styles.quickMessageItemArrow}>›</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {quickMessages.length > 0 ? (
              <TouchableOpacity
                style={styles.manageQuickButton}
                activeOpacity={0.8}
                onPress={() => {
                  setQuickMessageModal(false);
                  router.push("/QuickMessage");
                }}
              >
                <Text style={styles.manageQuickButtonText}>
                  Manage Quick Messages
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWaitingModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.waitingOverlay}>
          <View style={styles.waitingCard}>
            <ActivityIndicator size="large" color="#1F8B5F" />
            <Text style={styles.waitingTitle}>Ringing customer...</Text>
            <Text style={styles.waitingText}>
              Chat will start as soon as the user joins this room.
            </Text>
            <TouchableOpacity
              style={styles.waitingEndBtn}
              onPress={endChat}
              activeOpacity={0.85}
            >
              <Text style={styles.waitingEndBtnText}>End Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F5D43",
  },
  content: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0F5D43",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerCenter: {
    flex: 1,
    marginRight: 12,
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
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  headerStats: {
    alignItems: "flex-end",
    marginRight: 12,
  },
  headerStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  headerTimeLeftText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFD166",
    marginBottom: 2,
  },
  endBtn: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  chatSurface: {
    flex: 1,
    backgroundColor: "#E4DDD6",
    overflow: "hidden",
  },
  wallpaperOrbOne: {
    position: "absolute",
    top: -70,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(15, 93, 67, 0.08)",
  },
  wallpaperOrbTwo: {
    position: "absolute",
    bottom: 40,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(31, 139, 95, 0.08)",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  historyLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
  },
  historyLoaderText: {
    marginTop: 6,
    fontSize: 12,
    color: "#496059",
    fontWeight: "600",
  },
  historyMoreBtn: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(31, 139, 95, 0.12)",
  },
  historyMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F6F54",
  },
  historyStart: {
    alignItems: "center",
    marginBottom: 12,
  },
  historyStartText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#61726D",
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  dateSeparator: {
    backgroundColor: "rgba(236, 248, 255, 0.92)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#50646A",
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: "row",
  },
  left: {
    justifyContent: "flex-start",
  },
  right: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "82%",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#DCF8C6",
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
  },
  text: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 21,
  },
  messageImage: {
    width: 200,
    height: 200,
    maxWidth: "100%",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  imageCaption: {
    marginTop: 8,
  },
  imageViewer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageCloseButton: {
    position: "absolute",
    top: 42,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 10,
  },
  imageCloseText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  imageZoomImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
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
  myTime: {
    color: "#5B6E63",
  },
  otherTime: {
    color: "#7A7F86",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  emptyBadge: {
    minWidth: 54,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60, 124, 99, 0.14)",
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  emptyBadgeText: {
    color: "#3C7C63",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#28453E",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: "#5D6C67",
  },
  composerWrap: {
    backgroundColor: "#F0EFEA",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    flex: 1,
    color: "#17212B",
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 12,
  },
  sendBtn: {
    minWidth: 56,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F8B5F",
    paddingHorizontal: 14,
  },
  sendBtnDisabled: {
    opacity: 0.75,
  },
  sendText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  quickMessageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
    marginBottom: 2,
    backgroundColor: "#F3F0EA",
    borderWidth: 1,
    borderColor: "rgba(31, 139, 95, 0.18)",
  },

  quickMessageIcon: {
    fontSize: 19,
    color: "#1F8B5F",
    alignSelf: "center",

  },

  quickModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 15, 23, 0.48)",
  },

  quickModalCard: {
    maxHeight: "78%",
    backgroundColor: "#F7F6F2",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },

  quickModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E4DF",
  },

  quickModalTitle: {
    color: "#17382F",
    fontSize: 18,
    fontWeight: "800",
  },

  quickModalSubtitle: {
    color: "#6A7772",
    fontSize: 11,
    marginTop: 3,
  },

  quickModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8ECE8",
  },

  quickModalCloseText: {
    color: "#52615B",
    fontSize: 17,
    fontWeight: "700",
  },

  quickLoading: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },

  quickLoadingText: {
    marginTop: 9,
    color: "#66736E",
    fontSize: 12,
    fontWeight: "600",
  },

  quickListContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },

  quickMessageItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 8,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E6E2",
  },

  quickMessageItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31, 139, 95, 0.10)",
    marginRight: 10,
  },

  quickMessageItemEmoji: {
    fontSize: 17,
  },

  quickMessageItemText: {
    flex: 1,
    color: "#263832",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },

  quickMessageItemArrow: {
    marginLeft: 8,
    color: "#1F8B5F",
    fontSize: 25,
    lineHeight: 27,
  },

  quickEmpty: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  quickEmptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31, 139, 95, 0.10)",
    marginBottom: 12,
  },

  quickEmptyEmoji: {
    fontSize: 27,
  },

  quickEmptyTitle: {
    color: "#17382F",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 7,
  },

  quickEmptyText: {
    color: "#65736D",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 290,
  },

  quickEmptyBold: {
    color: "#1F6F54",
    fontWeight: "800",
  },

  quickSetButton: {
    marginTop: 18,
    minWidth: 170,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F8B5F",
  },

  quickSetButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  manageQuickButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 2,
  },

  manageQuickButtonText: {
    color: "#1F6F54",
    fontSize: 12,
    fontWeight: "800",
  },

  waitingOverlay: {
    flex: 1,
    backgroundColor: "rgba(8, 15, 23, 0.52)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  waitingCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 26,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
  },
  waitingTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#17382F",
    textAlign: "center",
  },
  waitingText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#5B6E68",
    textAlign: "center",
  },
  waitingEndBtn: {
    marginTop: 18,
    minWidth: 132,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#C84B31",
    alignItems: "center",
    justifyContent: "center",
  },
  waitingEndBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
