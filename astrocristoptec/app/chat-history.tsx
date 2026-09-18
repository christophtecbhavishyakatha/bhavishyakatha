import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  ListRenderItemInfo,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { ChatHistoryItem, fetchChatHistory } from "../lib/profileHistory";

type LanguageCode = "en" | "hi" | "bn";

const translations = {
  en: {
    title: "Chat History",
    subtitle: "Your saved conversations",
    empty: "No chat history yet",
    open: "Open chat",
    youPrefix: "You: ",
    loading: "Loading chats...",
    today: "Today",
    yesterday: "Yesterday",
    chatAgain: "Chat Again",
  },
  hi: {
    title: "चैट इतिहास",
    subtitle: "आपकी सेव की गई बातचीत",
    empty: "अभी तक कोई चैट इतिहास नहीं",
    open: "चैट खोलें",
    youPrefix: "आप: ",
    loading: "चैट लोड हो रही है...",
    today: "आज",
    yesterday: "कल",
    chatAgain: "फिर से चैट करें",
  },
  bn: {
    title: "চ্যাট ইতিহাস",
    subtitle: "আপনার সংরক্ষিত কথোপকথন",
    empty: "এখনও কোনো চ্যাট ইতিহাস নেই",
    open: "চ্যাট খুলুন",
    youPrefix: "আপনি: ",
    loading: "চ্যাট লোড হচ্ছে...",
    today: "আজ",
    yesterday: "গতকাল",
    chatAgain: "আবার চ্যাট করুন",
  },
} as const;

const localeByLanguage: Record<LanguageCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-BD",
};

const formatListDateTime = (
  value: string,
  language: LanguageCode,
  t: (typeof translations)[LanguageCode]
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  const timeLabel = date.toLocaleTimeString(localeByLanguage[language], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diff === 0) {
    return `${t.today}, ${timeLabel}`;
  }

  if (diff === 1) {
    return `${t.yesterday}, ${timeLabel}`;
  }

  const dateLabel = date.toLocaleDateString(localeByLanguage[language], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${dateLabel}, ${timeLabel}`;
};

const getInitial = (name?: string) =>
  (name || "A").trim().charAt(0).toUpperCase() || "A";

export default function ChatHistoryScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/profile");
        return true;
      });

      const load = async () => {
        try {
          setLoading(true);
          const [savedLang, userId] = await Promise.all([
            AsyncStorage.getItem("user-language"),
            AsyncStorage.getItem("user_id"),
          ]);

          if (savedLang === "hi" || savedLang === "bn" || savedLang === "en") {
            setLanguage(savedLang);
          }

          if (!userId) {
            router.replace("/login");
            return;
          }

          const data = await fetchChatHistory(userId);
          setChats(data);
        } finally {
          setLoading(false);
        }
      };

      load();

      return () => subscription.remove();
    }, [router])
  );

  const t = translations[language];

  const renderItem = ({ item }: ListRenderItemInfo<ChatHistoryItem>) => {
    const preview = item.lastMessage
      ? item.senderType === "user"
        ? `${t.youPrefix}${item.lastMessage}`
        : item.lastMessage
      : t.open;

    return (
      <TouchableOpacity
        style={styles.cardTap}
        activeOpacity={0.86}
        onPress={() =>
          router.push({
            pathname: "/chat-history-room",
            params: {
              room_id: item.roomId,
              astrologer_name: item.astrologerName,
            },
          })
        }
      >
        <LinearGradient
          colors={["#FFFFFF", "#FFF7EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardAccent} />

{item.astrologerProfilePhoto ? (
  <Image
    source={{ uri: item.astrologerProfilePhoto }}
    style={styles.avatar}
  />
) : (
  <LinearGradient
    colors={["#4A148C", "#7B2CBF"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.avatar}
  >
    <Text style={styles.avatarText}>
      {getInitial(item.astrologerName)}
    </Text>
  </LinearGradient>
)}

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.name} numberOfLines={1}>
                {item.astrologerName}
              </Text>
              <View style={styles.timePill}>
                <Text style={styles.time}>
                  {formatListDateTime(item.sentAt, language, t)}
                </Text>
              </View>
            </View>

            <Text style={styles.message} numberOfLines={1}>
              {preview}
            </Text>
          </View>

          <Feather name="chevron-right" size={18} color="#B68A2B" />
        </LinearGradient>
      </TouchableOpacity>
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
        <View style={styles.headerOrb} />
        <TouchableOpacity onPress={() => router.replace("/profile")} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#FF9933" />
          <Text style={styles.loaderText}>{t.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.roomId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="message-circle" size={22} color="#4A148C" />
              </View>
              <Text style={styles.emptyText}>{t.empty}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7EA",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  headerOrb: {
    position: "absolute",
    right: -36,
    top: -58,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 244, 211, 0.86)",
    marginTop: 2,
    fontWeight: "600",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loaderText: {
    color: "#4A148C",
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    paddingTop: 18,
    gap: 14,
  },
  cardTap: {
    borderRadius: 22,
  },
  card: {
    borderRadius: 22,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: "#FF9933",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.45)",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 19,
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
    minWidth: 0,
  },
  name: {
    flex: 1,
    color: "#2B164C",
    fontSize: 16,
    fontWeight: "800",
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 153, 51, 0.12)",
    flexShrink: 1,
  },
  time: {
    color: "#9A4B00",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  message: {
    marginTop: 6,
    color: "#7A637D",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: "rgba(74, 20, 140, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
  },
  emptyText: {
    textAlign: "center",
    color: "#7A637D",
    fontSize: 14,
    fontWeight: "700",
  },
});
