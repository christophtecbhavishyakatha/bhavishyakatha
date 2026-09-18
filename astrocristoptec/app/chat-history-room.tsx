import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  ListRenderItemInfo,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ChatHistoryMessage,
  fetchChatHistoryMessages,
} from "../lib/profileHistory";

type LanguageCode = "en" | "hi" | "bn";

const translations = {
  en: {
    subtitle: "Chat history",
    loading: "Loading messages...",
    empty: "No chat messages found",
    today: "Today",
    yesterday: "Yesterday",
    chatAgain: "Chat Again",
  },
  hi: {
    subtitle: "चैट इतिहास",
    loading: "मैसेज लोड हो रहे हैं...",
    empty: "कोई चैट संदेश नहीं मिला",
    today: "आज",
    yesterday: "कल",
    chatAgain: "फिर से चैट करें",
  },
  bn: {
    subtitle: "চ্যাট ইতিহাস",
    loading: "মেসেজ লোড হচ্ছে...",
    empty: "কোনো চ্যাট বার্তা পাওয়া যায়নি",
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

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatMessageTime = (value: string, language: LanguageCode) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(localeByLanguage[language], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatMessageDate = (
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

  if (diff === 0) {
    return t.today;
  }

  if (diff === 1) {
    return t.yesterday;
  }

  return date.toLocaleDateString(localeByLanguage[language], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitial = (name?: string) =>
  (name || "A").trim().charAt(0).toUpperCase() || "A";

export default function ChatHistoryRoomScreen() {
  const { room_id, astrologer_name } = useLocalSearchParams();
  const roomId = getParamValue(room_id);
  const paramAstrologerName = getParamValue(astrologer_name) || "Astrologer";

  const [language, setLanguage] = useState<LanguageCode>("en");
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [astrologerName, setAstrologerName] = useState(paramAstrologerName);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
const [astrologerId, setAstrologerId] = useState("");
const [astrologerProfilePhoto, setAstrologerProfilePhoto] = useState<
  string | undefined
>(undefined);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/chat-history");
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

          if (!userId || !roomId) {
            setMessages([]);
            setHasMore(false);
            return;
          }

          const data = await fetchChatHistoryMessages(userId, roomId);
          console.log("Chat history messages:", data);
          setMessages(data.messages);
          setHasMore(data.hasMore);
          setAstrologerId(data.astrologerId);
          setAstrologerName(data.astrologerName || paramAstrologerName);
          setAstrologerProfilePhoto(data.astrologerProfilePhoto);
        } finally {
          setLoading(false);
        }
      };

      load();

      return () => subscription.remove();
    }, [paramAstrologerName, roomId])
  );

  const t = translations[language];
  const headerTitle = useMemo(
    () => astrologerName?.trim() || "Astrologer",
    [astrologerName]
  );

  const loadMore = async () => {
    if (!hasMore || loading || loadingMore || messages.length === 0 || !roomId) {
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      return;
    }

    try {
      setLoadingMore(true);
      const data = await fetchChatHistoryMessages(
        userId,
        roomId,
        messages[messages.length - 1]?.id
      );
      setMessages((prev) => [...prev, ...data.messages]);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<ChatHistoryMessage>) => {
    const isUser = item.senderType === "user";
    const currentDate = formatMessageDate(item.sentAt, language, t);

const previousDate =
  index < messages.length - 1
    ? formatMessageDate(messages[index + 1]?.sentAt, language, t)
    : null;

const showDateSeparator =
  index === messages.length - 1 || currentDate !== previousDate;
    return (
      <View>
        {showDateSeparator ? (
          <View style={styles.dateSeparatorWrap}>
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>{currentDate}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAstro]}>
         {!isUser ? (
  astrologerProfilePhoto ? (
    <Image
      source={{
        uri: astrologerProfilePhoto.startsWith("data:image")
          ? astrologerProfilePhoto
          : `data:image/jpeg;base64,${astrologerProfilePhoto}`,
      }}
      style={styles.messageAvatar}
    />
  ) : (
    <View style={styles.messageAvatar}>
      <Feather name="moon" size={13} color="#FFD700" />
    </View>
  )
) : null}

          {isUser ? (
            <View style={styles.userMoonIcon} pointerEvents="none">
              <Feather name="user" size={18} color="#4A148C" />
            </View>
          ) : null}

          {isUser ? (
            <LinearGradient
              colors={["#FFB35C", "#FF9933", "#E76F00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleUser]}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.messageImage}
                />
              ) : null}
            
              <Text style={[styles.messageText, styles.messageTextUser]}>
                {item.messageText}
              </Text>
              <Text style={[styles.messageTime, styles.messageTimeUser]}>
                {formatMessageTime(item.sentAt, language)}
              </Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleAstro]}>
              <Text style={styles.messageText}>{item.messageText}</Text>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.sentAt, language)}
              </Text>
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
        <View style={styles.headerOrb} />
        <TouchableOpacity
          onPress={() => router.replace("/chat-history")}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

{astrologerProfilePhoto ? (
  <Image
    source={{
      uri: astrologerProfilePhoto.startsWith("data:image")
        ? astrologerProfilePhoto
        : `data:image/jpeg;base64,${astrologerProfilePhoto}`,
    }}
    style={styles.headerAvatar}
  />
) : (
  <LinearGradient
    colors={["#FFD700", "#FF9933"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.headerAvatar}
  >
    <Text style={styles.headerAvatarText}>
      {getInitial(headerTitle)}
    </Text>
  </LinearGradient>
)}

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
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
          data={messages}
          inverted
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.moreLoader}>
                <ActivityIndicator size="small" color="#FF9933" />
              </View>
            ) : null
          }
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
      <View style={{ alignItems: "center", justifyContent: "center" }}>
      <TouchableOpacity style={styles.button} onPress={() => {
  if (!astrologerId) return;

  router.push({
    pathname: "/(tabs)/astrologer-details",
    params: {
      id: astrologerId,
    },
  });
}}  >
        <Text style={styles.buttonText}>{t.chatAgain}</Text>
      </TouchableOpacity>
      </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  headerOrb: {
    position: "absolute",
    right: -38,
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
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  headerAvatarText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
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
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginVertical: 8,
  },
  dateSeparator: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: "rgba(74, 20, 140, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
  },
  dateSeparatorText: {
    color: "#4A148C",
    fontSize: 11,
    fontWeight: "800",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 5,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAstro: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
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
  userMoonIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 5,
    backgroundColor: "rgba(247, 247, 24, 0.33)",
    borderRadius: 50,
  },
  bubble: {
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
    minWidth: 0,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAstro: {
    backgroundColor: "#F8F1FF",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#2B164C",
    fontWeight: "500",
  },
  messageTextUser: {
    color: "#FFFFFF",
  },
  messageTime: {
    marginTop: 4,
    fontSize: 10,
    color: "#8E6CA8",
    textAlign: "right",
    fontWeight: "700",
  },
  messageTimeUser: {
    color: "rgba(255, 255, 255, 0.82)",
  },
  moreLoader: {
    paddingVertical: 12,
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
   messageImage: {
    width: 220,
    maxWidth: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  button: {
    bottom: 20,
    width: "40%",
    marginTop: 10,
    height: 50,
    borderRadius: 50,
    backgroundColor: "#4A148C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },  
});
