import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

type Language = "en" | "hi" | "bn";

interface LowBalanceModalProps {
  visible: boolean;
  onRecharge: () => void;
  onClose: () => void;
}

const content = {
  en: {
    title: "Enjoyed your last consultation? ✨",
    subtitle: "Your astrologer is ready to connect with you again.",
    balance: "Your wallet balance is running low.",
    message: "Recharge now and continue your journey. 💫",
    button: "Recharge Now",
    close: "Maybe Later",
  },

  hi: {
    title: "पिछली सलाह आपको पसंद आई? ✨",
    subtitle: "अपने ज्योतिषी से फिर से जुड़ें और आगे की सलाह पाएं।",
    balance: "आपके वॉलेट का बैलेंस कम है।",
    message: "अभी रिचार्ज करें और अपनी यात्रा जारी रखें। 💫",
    button: "अभी रिचार्ज करें",
    close: "बाद में",
  },

  bn: {
    title: "শেষ পরামর্শটি কি আপনার ভালো লেগেছিল? ✨",
    subtitle: "আবার আপনার জ্যোতিষীর সঙ্গে যুক্ত হন এবং পরবর্তী পরামর্শ নিন।",
    balance: "আপনার ওয়ালেটের ব্যালেন্স কমে এসেছে।",
    message: "এখনই রিচার্জ করুন এবং আপনার যাত্রা এগিয়ে নিয়ে যান। 💫",
    button: "এখনই রিচার্জ করুন",
    close: "পরে করব",
  },
};

export default function LowBalanceModal({
  visible,
  onRecharge,
  onClose,
}: LowBalanceModalProps) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("user-language");
console
        if (
          savedLanguage === "en" ||
          savedLanguage === "hi" ||
          savedLanguage === "bn"
        ) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.log("Error loading language:", error);
      }
    };

    if (visible) {
      loadLanguage();
    }
  }, [visible]);

  const clearLastCall = async () => {
    try {
      await AsyncStorage.removeItem("lastCall");
    } catch (error) {
      console.error("Failed to remove lastCall:", error);
    }
  };

  const handleClose = async () => {
    await clearLastCall();
    onClose();
  };

  const handleRecharge = async () => {
    await clearLastCall();

    onRecharge();

    router.push("/(tabs)/wallet");
  };

  if (!visible) {
    return null;
  }

  const text = content[language];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />

        <View style={styles.card}>
          {/* TOP SECTION */}
          <LinearGradient
            colors={["#4F46E5", "#7C3AED", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topSection}
          >
            {/* Decorative circles */}
            <View style={styles.circleTopRight} />
            <View style={styles.circleBottomLeft} />

            <View style={styles.topContent}>
              {/* ICON */}
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>✨</Text>
              </View>

              {/* TITLE */}
              <Text style={styles.title}>
                {text.title}
              </Text>

              {/* SUBTITLE */}
              <Text style={styles.subtitle}>
                {text.subtitle}
              </Text>
            </View>
          </LinearGradient>

          {/* CONTENT */}
          <View style={styles.contentContainer}>
            {/* LOW BALANCE BADGE */}
            <View style={styles.balanceBadge}>
              <View style={styles.balanceDot} />

              <Text style={styles.balanceText}>
                {text.balance}
              </Text>
            </View>

            {/* MESSAGE */}
            <Text style={styles.message}>
              {text.message}
            </Text>

            {/* RECHARGE BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRecharge}
              style={styles.rechargeButtonWrapper}
            >
              <LinearGradient
                colors={["#4F46E5", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.rechargeButton}
              >
                <Text style={styles.rechargeButtonText}>
                  {text.button}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* CLOSE */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>
                {text.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,

    elevation: 15,
  },

  topSection: {
    position: "relative",
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  topContent: {
    alignItems: "center",
    zIndex: 10,
  },

  circleTopRight: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    right: -45,
    top: -45,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  circleBottomLeft: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    left: -50,
    bottom: -55,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.20)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,

    elevation: 5,
  },

  iconText: {
    fontSize: 30,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 29,
  },

  subtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.90)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    alignItems: "center",
  },

  balanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",

    backgroundColor: "#FFF7ED",

    paddingHorizontal: 15,
    paddingVertical: 9,

    borderRadius: 30,
  },

  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
    marginRight: 8,
  },

  balanceText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "700",
  },

  message: {
    marginTop: 18,
    marginBottom: 22,

    color: "#4B5563",

    fontSize: 14,
    lineHeight: 21,

    textAlign: "center",
  },

  rechargeButtonWrapper: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",

    shadowColor: "#7C3AED",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,

    elevation: 5,
  },

  rechargeButton: {
    width: "100%",
    paddingVertical: 15,

    alignItems: "center",
    justifyContent: "center",
  },

  rechargeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  closeButton: {
    marginTop: 16,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },

  closeText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
});