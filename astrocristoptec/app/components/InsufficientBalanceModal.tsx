
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
export const LANG = {
  en: {
    title: "Insufficient Balance",
    message: "You don’t have enough balance to start this audio call.",
    currentBalance: "Your balance",
    requiredBalance: "Minimum required",
    recharge: "Recharge Wallet",
    cancel: "Cancel",
  },

  hi: {
    title: "पर्याप्त बैलेंस नहीं है",
    message: "ऑडियो कॉल शुरू करने के लिए आपके पास पर्याप्त बैलेंस नहीं है।",
    currentBalance: "आपका बैलेंस",
    requiredBalance: "न्यूनतम आवश्यक",
    recharge: "वॉलेट रिचार्ज करें",
    cancel: "रद्द करें",
  },

  bn: {
    title: "পর্যাপ্ত ব্যালেন্স নেই",
    message: "অডিও কল শুরু করার জন্য আপনার পর্যাপ্ত ব্যালেন্স নেই।",
    currentBalance: "আপনার ব্যালেন্স",
    requiredBalance: "ন্যূনতম প্রয়োজন",
    recharge: "ওয়ালেট রিচার্জ করুন",
    cancel: "বাতিল",
  },
};

interface Props {
  visible: boolean;
  onRecharge: () => void;
  onCancel: () => void;
  balance: number;
  required: number;
  lang?: "en" | "hi" |"bn";
}

const InsufficientBalanceModal: React.FC<Props> = ({
  visible,
  onRecharge,
  onCancel,
  balance,
  required,
  lang = "en",
}) => {
  const t = LANG[lang];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* Title */}
          <Text style={styles.title}>{t.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{t.message}</Text>

          {/* Balance Info */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>{t.currentBalance}</Text>
              <Text style={styles.value}>₹{balance}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t.requiredBalance}</Text>
              <Text style={styles.value}>₹{required}</Text>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.rechargeBtn}
            onPress={onRecharge}
            activeOpacity={0.85}
          >
            <Text style={styles.rechargeText}>{t.recharge}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelText}>{t.cancel}</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

export default InsufficientBalanceModal;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 6,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
  },

  infoBox: {
    backgroundColor: "#F5F6FA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  label: {
    fontSize: 13,
    color: "#777",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
  },

  rechargeBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  rechargeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  cancelText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
  },
});
