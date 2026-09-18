import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface LowBalanceModalProps {
  visible: boolean;
  balance: number;
  remainingMinutes?: number;
  onClose: () => void;
  onRecharge: () => void;
}

type LanguageCode = "en" | "bn" | "hi";

const translations: Record<
  LanguageCode,
  {
    title: string;
    subtitle: string;
    rechargeNow: string;
    bottomText: string;
    currentBalance: string;
    remainingTime: string;
    minutes: string;
    warning: string;
  }
> = {
  en: {
    title: "Balance is currently running low!",
    subtitle: "Recharge now to continue your conversation...",
    rechargeNow: "Recharge Now",
    bottomText: "Stay connected. Stay blessed. 💜",
    currentBalance: "Current Balance",
    remainingTime: "Remaining Time",
    minutes: "min",
    warning: "Low balance! Recharge to enjoy uninterrupted conversations.",
  },

  bn: {
    title: "আপনার ব্যালেন্স বর্তমানে কমে গেছে!",
    subtitle: "কথোপকথন চালিয়ে যেতে এখনই রিচার্জ করুন...",
    rechargeNow: "এখনই রিচার্জ করুন",
    bottomText: "সংযুক্ত থাকুন। আশীর্বাদে থাকুন। 💜",
    currentBalance: "বর্তমান ব্যালেন্স",
    remainingTime: "অবশিষ্ট সময়",
    minutes: "মিনিট",
    warning:
      "ব্যালেন্স কমে গেছে! নিরবচ্ছিন্ন কথোপকথনের জন্য রিচার্জ করুন।",
  },

  hi: {
    title: "आपका बैलेंस कम हो रहा है!",
    subtitle: "अपनी बातचीत जारी रखने के लिए अभी रिचार्ज करें...",
    rechargeNow: "अभी रिचार्ज करें",
    bottomText: "जुड़े रहें। खुश रहें। 💜",
    currentBalance: "वर्तमान बैलेंस",
    remainingTime: "शेष समय",
    minutes: "मिनट",
    warning:
      "बैलेंस कम है! बिना रुकावट बातचीत जारी रखने के लिए रिचार्ज करें।",
  },
};

const LowBalanceModal: React.FC<LowBalanceModalProps> = ({
  visible,
  balance,
  remainingMinutes = 2,
  onClose,
  onRecharge,
}) => {
  const [language, setLanguage] = useState<LanguageCode>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // Change this key if your app uses another AsyncStorage key.
        const savedLanguage = await AsyncStorage.getItem("user-language");

        if (
          savedLanguage === "en" ||
          savedLanguage === "bn" ||
          savedLanguage === "hi"
        ) {
          setLanguage(savedLanguage);
        } else {
          setLanguage("en");
        }
      } catch (error) {
        console.log("Language load error:", error);
        setLanguage("en");
      }
    };

    if (visible) {
      loadLanguage();
    }
  }, [visible]);

  const text = translations[language];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Feather name="x" size={22} color="#32145F" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <Feather name="credit-card" size={30} color="#7C3AED" />
          </View>

          {/* Heading */}
          <Text style={styles.title}>{text.title}</Text>

          <Text style={styles.subtitle}>{text.subtitle}</Text>

          {/* Optional balance card */}
          {/*
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.label}>
                  {text.currentBalance}
                </Text>

                <Text style={styles.balance}>
                  ₹{balance.toFixed(2)}
                </Text>
              </View>

              <View style={styles.timeContainer}>
                <Text style={styles.label}>
                  {text.remainingTime}
                </Text>

                <View style={styles.timeRow}>
                  <Feather
                    name="clock"
                    size={20}
                    color="#7C3AED"
                  />

                  <Text style={styles.time}>
                    {remainingMinutes} {text.minutes}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.progressBackground}>
              <View style={styles.progress} />
            </View>

            <Text style={styles.warning}>
              {text.warning}
            </Text>
          </View>
          */}

          {/* Recharge button */}
          <TouchableOpacity
            style={styles.rechargeButton}
            onPress={onRecharge}
            activeOpacity={0.85}
          >
            <Feather
              name="credit-card"
              size={22}
              color="#FFFFFF"
            />

            <Text style={styles.rechargeText}>
              {text.rechargeNow}
            </Text>

            <Feather
              name="chevron-right"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Bottom message */}
          <Text style={styles.bottomText}>
            {text.bottomText}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default LowBalanceModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 10, 35, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  modal: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFF9F0",
    borderRadius: 28,
    padding: 22,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1E7FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 15,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#32145F",
    textAlign: "center",
    lineHeight: 32,
    paddingHorizontal: 20,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B6175",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 9,
    paddingHorizontal: 12,
  },

  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#F0E5F5",
  },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  label: {
    fontSize: 12,
    color: "#776C80",
    marginBottom: 5,
  },

  balance: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F0441E",
  },

  timeContainer: {
    alignItems: "flex-end",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  time: {
    fontSize: 22,
    fontWeight: "800",
    color: "#241333",
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#F5DFDA",
    borderRadius: 5,
    marginTop: 17,
    overflow: "hidden",
  },

  progress: {
    width: "25%",
    height: "100%",
    backgroundColor: "#F0441E",
    borderRadius: 5,
  },

  warning: {
    fontSize: 12,
    color: "#6B6175",
    marginTop: 10,
  },

  rechargeButton: {
    height: 58,
    backgroundColor: "#7338C7",
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  rechargeText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 12,
  },

  bottomText: {
    textAlign: "center",
    color: "#776C80",
    fontSize: 13,
    marginTop: 17,
  },
});