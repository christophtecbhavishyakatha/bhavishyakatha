import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Chat = {
  room_id: string | number;
  sender_type: "user" | "astrologer";
  sender_id: string | number;
  message_text: string;
  sent_at: string;
  user_name?: string;
  astrologer_name?: string;
  customer_id?: string | number;
};

const API_BASE = "https://bhavishyakatha.in/express";

const formatListDateTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const dateLabel = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateLabel}, ${timeLabel}`;
};

const getInitial = (name?: string) =>
  (name || "U").trim().charAt(0).toUpperCase() || "U";

const ChatListScreen = () => {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        setChats([]);
        return;
      }

      const res = await fetch(`${API_BASE}/astrologer/chat/list?user_id=${userId}`);
      const data = await res.json();
      setChats(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.log("Chat list error:", err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  const renderItem = ({ item }: ListRenderItemInfo<Chat>) => {
    const customerName = item.user_name?.trim() || "User";
    const preview = item.message_text?.trim()
      ? item.sender_type === "astrologer"
        ? `You: ${item.message_text}`
        : item.message_text
      : "Open chat history";

    return (
      <TouchableOpacity
        style={styles.cardTap}
        activeOpacity={0.86}
        onPress={() =>
          router.push({
            pathname: "/chatroom",
            params: {
              room_id: String(item.room_id),
              user_name: customerName,
            },
          })
        }
      >
        <LinearGradient
          colors={["rgba(59,15,140,0.96)", "rgba(45,10,94,0.94)", "rgba(30,6,80,0.92)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardTopBar} />
          <View style={styles.avatarRing}>
            <LinearGradient
              colors={["#7C3AED", "#4C1D95"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitial(customerName)}</Text>
            </LinearGradient>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.name} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={styles.time}>{formatListDateTime(item.sent_at)}</Text>
            </View>

            <Text style={styles.message} numberOfLines={1}>
              {preview}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Ionicons name="chatbubble-ellipses-outline" size={12} color="#F5C842" />
                <Text style={styles.metaBadgeText}>Chat history</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4B5FD" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LinearGradient colors={["#1A0533", "#2D0A5E", "#1A0533"]} style={styles.fullFlex}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient colors={["#33293E", "#3A3152", "#717641"]} style={styles.fullFlex}>
        <View style={styles.headerWrap}>
          <View style={styles.headerCard}>
            <View style={styles.headerTopBar} />
            <Text style={styles.headerEyebrow}>CHAT HISTORY</Text>
            <Text style={styles.headerTitle}>Conversations</Text>
            <Text style={styles.headerSubtitle}>
              {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
            </Text>
          </View>
        </View>

        <FlatList
          data={chats}
          keyExtractor={(item) => String(item.room_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color="#F5C842" />
              <Text style={styles.emptyTitle}>No chat history yet</Text>
              <Text style={styles.emptyText}>
                Your completed customer chats will appear here.
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ChatListScreen;

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
    letterSpacing: 0.4,
  },
  headerWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.22)",
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
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#F5C842",
    marginBottom: 4,
  },
  headerTitle: {
    color: "#F8F5FF",
    fontSize: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 4,
    color: "#C4B5FD",
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12,
  },
  cardTap: {
    borderRadius: 22,
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.16)",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  cardTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(245,200,66,0.92)",
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#F5C842",
    padding: 3,
    marginRight: 12,
  },
  avatar: {
    flex: 1,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  name: {
    flex: 1,
    color: "#F8F5FF",
    fontSize: 16,
    fontWeight: "700",
  },
  time: {
    color: "#F5C842",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  message: {
    marginTop: 6,
    color: "#DDD6FE",
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,200,66,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 1,
  },
  metaBadgeText: {
    color: "#F5E7A1",
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  emptyCard: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.18)",
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
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
    textAlign: "center",
    lineHeight: 19,
  },
});
