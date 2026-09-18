import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CLIENT_AUTH_API_BASE_URL } from "../../lib/api";

interface HeaderProps {
  onProfilePress: () => void;
  variant?: "default" | "home";
}

export interface HeaderRef {
  reloadHeader: () => void;
}

// 🌍 Language Labels
const languageLabel: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
};

// 🌍 Translations
const translations = {
  en: {
    hi: "Hi!",
    guest: "Guest",
    user: "User",
    changeLanguageTitle: "Change Language",
    changeLanguageMessage: "Do you want to change the app language?",
    cancel: "Cancel",
    change: "Change",
  },
  hi: {
    hi: "नमस्ते!",
    guest: "अतिथि",
    user: "उपयोगकर्ता",
    changeLanguageTitle: "भाषा बदलें",
    changeLanguageMessage: "क्या आप ऐप की भाषा बदलना चाहते हैं?",
    cancel: "रद्द करें",
    change: "बदलें",
  },
  bn: {
    hi: "হ্যালো!",
    guest: "অতিথি",
    user: "ব্যবহারকারী",
    changeLanguageTitle: "ভাষা পরিবর্তন করুন",
    changeLanguageMessage: "আপনি কি অ্যাপের ভাষা পরিবর্তন করতে চান?",
    cancel: "বাতিল",
    change: "পরিবর্তন",
  },
};

const Header = forwardRef<HeaderRef, HeaderProps>(
  ({ onProfilePress, variant = "default" }, ref) => {
  const router = useRouter();
  const isHomeVariant = variant === "home";

  const [language, setLanguage] = useState<"en" | "hi" | "bn">("en");
  const [userName, setUserName] = useState("Guest");
  const [coins, setCoins] = useState(0);

  // Get current translations
  const t = translations[language];

  const loadHeaderData = useCallback(async () => {
    try {
      const savedLang = await AsyncStorage.getItem("user-language");
      if (savedLang && ["en", "hi", "bn"].includes(savedLang)) {
        setLanguage(savedLang as "en" | "hi" | "bn");
      }

      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        setUserName(t.guest);
        setCoins(0);
        return;
      }

      const res = await fetch(`${CLIENT_AUTH_API_BASE_URL}/users/${userId}`);
      const json = await res.json();
      console.log("Header load response:", json);

      if (json.success) {
        setUserName(json.data.full_name ?? t.user);
setCoins(Math.trunc(Number(json.data.wallet_balance ?? 0)));      }
    } catch (err) {
      console.log("Header load error:", err);
    }
  }, [language]);

  useEffect(() => {
    loadHeaderData();
  }, [loadHeaderData]);

  // 🔹 Expose reload function
  useImperativeHandle(ref, () => ({
    reloadHeader: loadHeaderData,
  }));

  const changeLanguage = () => {
    Alert.alert(t.changeLanguageTitle, t.changeLanguageMessage, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.change,
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("user-language");
          router.replace("/language");
        },
      },
    ]);
  };

  const handleWalletPress = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      console.log("Wallet press - userId:", userId);
      if (!userId?.trim()) {
        router.push("/login");
        console.log("Navigating to login because userId is missing or empty.");
        return;
      }
console.log("Navigating to wallet for userId:", userId);
      router.push("/wallet");
    } catch (error) {
      console.error("Navigation error:", error);
      router.push("/login");
    }
  };

  return (
    <LinearGradient
      colors={
        isHomeVariant
          ? ["#FFFDF8", "#FFFDF8"]
          : ["#2A0B4F", "#4A148C", "#7B2CBF"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={[styles.headerOrb, isHomeVariant && styles.homeHeaderOrb]} />
      <Text style={[styles.headerTitle, isHomeVariant && styles.homeHeaderTitle]}>
        {t.hi} {userName?.trim().split(" ")[0]}
      </Text>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={[styles.langButton, isHomeVariant && styles.homeLangButton]}
          onPress={changeLanguage}
        >
          <Text style={[styles.langText, isHomeVariant && styles.homeLangText]}>
            {languageLabel[language] ?? "EN"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.coinContainer, isHomeVariant && styles.homeCoinContainer]}
          activeOpacity={0.7}
          onPress={handleWalletPress}
        >
          <Feather name="circle" color="#FFD700" size={18} />
          <Text style={styles.coinText}>₹{coins}</Text>
        </TouchableOpacity>



        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <Feather name="user" color="#4A148C" size={22} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
    );
  },
);

Header.displayName = "Header";

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.16)",
    overflow: "hidden",
  },
  headerOrb: {
    position: "absolute",
    right: -46,
    top: -72,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },

  langButton: {
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    flexShrink: 1,
  },

  langText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF6D8",
    flexShrink: 1,
  },

  coinContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 153, 51, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.28)",
    flexShrink: 1,
  },

  coinText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF6D8",
    flexShrink: 1,
  },

  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF7EA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
  },
  homeHeaderOrb: {
    display: "none",
  },
  homeHeaderTitle: {
    color: "#303030",
    fontSize: Math.max(18, Math.min(24, Dimensions.get("window").width * 0.06)),
    lineHeight: Math.max(30, Math.min(38, Dimensions.get("window").width * 0.085)),
    fontWeight: "500",
    includeFontPadding: true,
  },
  homeLangButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  homeLangText: {
    color: "#555555",
  },
  homeCoinContainer: {
    backgroundColor: "#4A148C",
    borderColor: "#4A148C",
  },
  homeHeaderIcon: {
    width: 30,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Header;
export { Header };

