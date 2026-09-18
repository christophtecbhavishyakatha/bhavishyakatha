import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Message = {
  id: number;
  room_id: string | number;
  sender_id: string | number;
  sender_type: "user" | "astrologer";
  message_text: string;
  message_type?: "text" | "image";
  image_url?: string;
  sent_at?: string;
};

type ChatConversation = {
  user_name?: string;
  astrologer_name?: string;
  customer_id?: string | number;
  astrologer_id?: string | number;
};

const API_BASE = "https://bhavishyakatha.in/express";

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatBubbleTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatBubbleDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitial = (name?: string) =>
  (name || "U").trim().charAt(0).toUpperCase() || "U";

const ChatRoomScreen = () => {
  const { room_id, user_name } = useLocalSearchParams();
  const roomId = getParamValue(room_id);
  const paramUserName = getParamValue(user_name);

  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatUserName, setChatUserName] = useState(paramUserName || "User");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (lastId?: number) => {
      if (!roomId) {
        setMessages([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      try {
        if (lastId) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        let url = `${API_BASE}/astrologer/chat/messages/${roomId}`;
        if (lastId) {
          url += `?last_id=${lastId}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        const nextMessages = Array.isArray(data.data) ? data.data : [];
        const conversation: ChatConversation | null = data.conversation || null;

        if (conversation?.user_name) {
          setChatUserName(conversation.user_name);
        }

        setHasMore(Boolean(data.hasMore));
        setMessages((prev) => (lastId ? [...prev, ...nextMessages] : nextMessages));
      } catch (err) {
        console.log("Fetch error:", err);
        if (!lastId) {
          setMessages([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [roomId]
  );

  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        const id = await AsyncStorage.getItem("user_id");
        setUserId(id);
        await fetchMessages();
      };

      initialize();
    }, [fetchMessages])
  );

  const loadMore = () => {
    if (!hasMore || loading || loadingMore || messages.length === 0) {
      return;
    }

    const lastId = messages[messages.length - 1]?.id;
    if (lastId) {
      fetchMessages(lastId);
    }
  };

  const headerTitle = useMemo(() => chatUserName?.trim() || "User", [chatUserName]);

  const renderItem = ({ item, index }: ListRenderItemInfo<Message>) => {
    const isMe =
      item.sender_type === "astrologer" || Number(item.sender_id) === Number(userId);
    const currentDate = formatBubbleDate(item.sent_at);
    const previousDate = index > 0 ? formatBubbleDate(messages[index - 1]?.sent_at) : null;
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

        <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.messageImage} />
            ) : null}

            {item.message_text ? (
              <Text
                style={[
                  styles.messageText,
                  isMe ? styles.messageTextMe : styles.messageTextThem,
                  item.image_url && styles.imageCaption,
                ]}
              >
                {item.message_text}
              </Text>
            ) : null}

            <Text
              style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeThem]}
            >
              {formatBubbleTime(item.sent_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LinearGradient colors={["#1A0533", "#2D0A5E", "#1A0533"]} style={styles.fullFlex}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient colors={["#33293E", "#3A3152", "#717641"]} style={styles.fullFlex}>
        <View style={styles.backgroundOrbOne} />
        <View style={styles.backgroundOrbTwo} />

        <View style={styles.headerShell}>
          <View style={styles.headerCard}>
            <View style={styles.headerTopBar} />
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/chatList")}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#F8F5FF" />
            </TouchableOpacity>

            <View style={styles.headerAvatarRing}>
              <LinearGradient
                colors={["#7C3AED", "#4C1D95"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerAvatar}
              >
                <Text style={styles.headerAvatarText}>{getInitial(headerTitle)}</Text>
              </LinearGradient>
            </View>

            <View style={styles.headerTextWrap}>
              <Text style={styles.headerName} numberOfLines={1}>
                {headerTitle}
              </Text>
              <Text style={styles.headerSub}>Chat history</Text>
            </View>
          </View>
        </View>

        <View style={styles.noticeWrap}>
          <View style={styles.noticePill}>
            <Ionicons name="lock-closed-outline" size={13} color="#F5C842" />
            <Text style={styles.noticeText}>Read-only chat view</Text>
          </View>
        </View>

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbox-ellipses-outline" size={28} color="#F5C842" />
              <Text style={styles.emptyTitle}>No messages found</Text>
              <Text style={styles.emptyText}>This room does not have saved chat history yet.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.moreLoader}>
                <ActivityIndicator size="small" color="#F5C842" />
              </View>
            ) : null
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ChatRoomScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1A0533",
  },
  fullFlex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#DDD6FE",
    fontSize: 14,
    fontWeight: "600",
  },
  backgroundOrbOne: {
    position: "absolute",
    top: 120,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(245,200,66,0.06)",
  },
  backgroundOrbTwo: {
    position: "absolute",
    bottom: 80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(124,58,237,0.08)",
  },
  headerShell: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: "hidden",
  },
  headerTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#F5C842",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginRight: 10,
  },
  headerAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#F5C842",
    padding: 3,
    marginRight: 12,
  },
  headerAvatar: {
    flex: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    color: "#F8F5FF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSub: {
    marginTop: 3,
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "500",
  },
  noticeWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  noticePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(30, 41, 59, 0.34)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  noticeText: {
    color: "#F5E7A1",
    fontSize: 11,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 26,
    flexGrow: 1,
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginVertical: 8,
  },
  dateSeparator: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dateSeparatorText: {
    color: "#F5E7A1",
    fontSize: 11,
    fontWeight: "700",
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: "row",
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowThem: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 8,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: "#7C3AED",
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.15)",
  },
  bubbleThem: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.12)",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: "#FFFFFF",
  },
  messageTextThem: {
    color: "#1A1033",
  },
  messageImage: {
    width: 200,
    height: 200,
    maxWidth: "100%",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  imageCaption: {
    marginTop: 8,
  },
  messageTime: {
    marginTop: 4,
    fontSize: 10,
    textAlign: "right",
  },
  messageTimeMe: {
    color: "rgba(255,255,255,0.72)",
  },
  messageTimeThem: {
    color: "#7C6E96",
  },
  moreLoader: {
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 10,
    color: "#F8F5FF",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 6,
    color: "#C4B5FD",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
