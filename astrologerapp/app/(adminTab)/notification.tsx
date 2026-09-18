import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  View, Platform
} from "react-native";

const API_BASE_URL = "https://bhavishyakatha.in/express/api/admin/";

export default function NotificationControlScreen() {
  const [recipientType, setRecipientType] = useState<"user" | "astrologer">(
    "user"
  );

  const [targetType, setTargetType] = useState("low_balance");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const userTargets = [
    {
      value: "low_balance",
      label: "Low Balance",
    },
    {
      value: "previous_consultation",
      label: "Previous Consultation Done",
    },
    {
      value: "no_consultation",
      label: "No Consultation Yet",
    },
    {
      value: "all",
      label: "All Users",
    },
  ];

  const astrologerTargets = [
    {
      value: "all",
      label: "All Astrologers",
    },
    {
      value: "incomplete_profile",
      label: "Profile Not Complete",
    },
  ];

  const targets =
    recipientType === "user" ? userTargets : astrologerTargets;

  const handleRecipientChange = (
    type: "user" | "astrologer"
  ) => {
    setRecipientType(type);

    // Set first available category
    if (type === "user") {
      setTargetType("low_balance");
    } else {
      setTargetType("all");
    }
  };

  const sendNotification = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter notification title.");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Error", "Please enter notification message.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        recipientType,
        targetType,
        title: title.trim(),
        message: message.trim(),
      };

      console.log("Notification payload:", payload);

      const response = await fetch(
        `${API_BASE_URL}/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to send notification"
        );
      }

      Alert.alert(
        "Success",
        data?.message || "Notification sent successfully."
      );

      setTitle("");
      setMessage("");
    } catch (error: any) {
      console.log("Notification error:", error);

      Alert.alert(
        "Error",
        error?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
  <KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
>
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
      <Text style={styles.heading}>
        Notification Control
      </Text>

      {/* Recipient */}
      <Text style={styles.sectionTitle}>
        Send Notification To
      </Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            recipientType === "user" && styles.activeButton,
          ]}
          onPress={() => handleRecipientChange("user")}
        >
          <Text
            style={[
              styles.typeText,
              recipientType === "user" && styles.activeText,
            ]}
          >
            User
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            recipientType === "astrologer" && styles.activeButton,
          ]}
          onPress={() => handleRecipientChange("astrologer")}
        >
          <Text
            style={[
              styles.typeText,
              recipientType === "astrologer" && styles.activeText,
            ]}
          >
            Astrologer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub category */}
      <Text style={styles.sectionTitle}>
        Select Category
      </Text>

      {targets.map((item) => (
        <TouchableOpacity
          key={item.value}
          style={[
            styles.option,
            targetType === item.value && styles.selectedOption,
          ]}
          onPress={() => setTargetType(item.value)}
        >
          <View
            style={[
              styles.radio,
              targetType === item.value && styles.radioSelected,
            ]}
          />

          <Text
            style={[
              styles.optionText,
              targetType === item.value && styles.selectedText,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Title */}
      <Text style={styles.sectionTitle}>
        Notification Title
      </Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Enter notification title"
        placeholderTextColor="#888"
        style={styles.input}
      />

      {/* Message */}
      <Text style={styles.sectionTitle}>
        Notification Message
      </Text>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Enter notification message"
        placeholderTextColor="#888"
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.messageInput]}
      />

      {/* Send */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          loading && styles.disabledButton,
        ]}
        disabled={loading}
        onPress={sendNotification}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sendText}>
            Send Notification
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  heading: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 25,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    backgroundColor: "#1c1c1c",
  },

  activeButton: {
    backgroundColor: "#6C4DFF",
    borderColor: "#6C4DFF",
  },

  typeText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "600",
  },

  activeText: {
    color: "#fff",
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#1c1c1c",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },

  selectedOption: {
    borderColor: "#6C4DFF",
    backgroundColor: "#211b3d",
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#777",
    marginRight: 12,
  },

  radioSelected: {
    borderColor: "#6C4DFF",
    backgroundColor: "#6C4DFF",
  },

  optionText: {
    color: "#ccc",
    fontSize: 15,
  },

  selectedText: {
    color: "#fff",
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: "#fff",
    fontSize: 15,
  },

  messageInput: {
    minHeight: 120,
  },

  sendButton: {
    backgroundColor: "#6C4DFF",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 30,
  },

  disabledButton: {
    opacity: 0.6,
  },

  sendText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});