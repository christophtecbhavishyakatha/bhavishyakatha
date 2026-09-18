import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const STORAGE_KEY = "astrologer_quick_messages";

const MAX_MESSAGES = 25;
const MAX_LENGTH = 500;

type QuickMessage = {
  id: string;
  message: string;
};

export default function QuickMessageScreen() {
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  // =========================
  // LOAD MESSAGES
  // =========================
  const loadMessages = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error("Load quick messages error:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SAVE MESSAGES
  // =========================
  const saveMessages = async (newMessages: QuickMessage[]) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(newMessages)
      );

      setMessages(newMessages);
    } catch (error) {
      console.error("Save quick messages error:", error);

      Alert.alert(
        "Error",
        "Unable to save quick message."
      );
    }
  };

  // =========================
  // ADD / UPDATE
  // =========================
  const handleSave = async () => {
    const trimmed = message.trim();

    if (!trimmed) {
      Alert.alert(
        "Message Required",
        "Please enter a quick message."
      );
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      Alert.alert(
        "Message Too Long",
        `Maximum ${MAX_LENGTH} characters allowed.`
      );
      return;
    }

    // EDIT
    if (editingId) {
      const updated = messages.map((item) =>
        item.id === editingId
          ? {
              ...item,
              message: trimmed,
            }
          : item
      );

      await saveMessages(updated);

      setEditingId(null);
      setMessage("");

      return;
    }

    // CREATE
    if (messages.length >= MAX_MESSAGES) {
      Alert.alert(
        "Maximum Reached",
        `You can create maximum ${MAX_MESSAGES} quick messages.`
      );
      return;
    }

    const newMessage: QuickMessage = {
      id: Date.now().toString(),
      message: trimmed,
    };

    await saveMessages([
      ...messages,
      newMessage,
    ]);

    setMessage("");
  };

  // =========================
  // EDIT
  // =========================
  const handleEdit = (item: QuickMessage) => {
    setEditingId(item.id);
    setMessage(item.message);
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Quick Message",
      "Are you sure you want to delete this message?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = messages.filter(
              (item) => item.id !== id
            );

            await saveMessages(updated);

            if (editingId === id) {
              setEditingId(null);
              setMessage("");
            }
          },
        },
      ]
    );
  };

  // =========================
  // CANCEL EDIT
  // =========================
  const cancelEdit = () => {
    setEditingId(null);
    setMessage("");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={["#1A0533", "#2D0A5E", "#1A0533"]}
          style={styles.center}
        >
          <Text style={styles.loadingText}>
            Loading quick messages...
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top","bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <LinearGradient
          colors={[
            "#33293e",
            "#3a3152",
            "#717641",
          ]}
          style={styles.flex}
        >
          {/* ================= HEADER ================= */}

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Feather
                name="arrow-left"
                size={22}
                color="#F5C842"
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                Quick Messages
              </Text>

              <Text style={styles.headerSubtitle}>
                Save messages for faster replies
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>
                💬
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.scrollContent
            }
          >
            {/* ================= INFO ================= */}

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Feather
                  name="info"
                  size={18}
                  color="#F5C842"
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  Quick reply templates
                </Text>

                <Text style={styles.infoText}>
                  Create up to {MAX_MESSAGES} messages.
                  Each message can contain up to{" "}
                  {MAX_LENGTH} characters.
                </Text>
              </View>
            </View>

            {/* ================= CREATE / EDIT ================= */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />

                <Text style={styles.sectionTitle}>
                  {editingId
                    ? "Edit Message"
                    : "Create Message"}
                </Text>
              </View>

              <View style={styles.editorCard}>
                <TextInput
                  value={message}
                  onChangeText={(text) => {
                    if (
                      text.length <= MAX_LENGTH
                    ) {
                      setMessage(text);
                    }
                  }}
                  placeholder="Example: Namaste 🙏 How may I help you?"
                  placeholderTextColor="#9E7DC8"
                  multiline
                  maxLength={MAX_LENGTH}
                  style={styles.input}
                  textAlignVertical="top"
                />

                <View style={styles.inputBottom}>
                  <Text
                    style={[
                      styles.characterCount,
                      message.length >= MAX_LENGTH &&
                        styles.characterLimit,
                    ]}
                  >
                    {message.length}/{MAX_LENGTH}
                  </Text>
                </View>

                <View style={styles.editorButtons}>
                  {editingId && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelEdit}
                    >
                      <Text style={styles.cancelText}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      !message.trim() &&
                        styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!message.trim()}
                  >
                    <LinearGradient
                      colors={[
                        "#7C3AED",
                        "#5B21B6",
                      ]}
                      start={{
                        x: 0,
                        y: 0,
                      }}
                      end={{
                        x: 1,
                        y: 0,
                      }}
                      style={styles.saveGradient}
                    >
                      <Feather
                        name={
                          editingId
                            ? "check"
                            : "plus"
                        }
                        size={17}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.saveText}
                      >
                        {editingId
                          ? "Update Message"
                          : "Add Message"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ================= MESSAGE LIST ================= */}

            <View style={styles.section}>
              <View style={styles.listHeader}>
                <View
                  style={styles.sectionHeader}
                >
                  <View
                    style={styles.sectionDot}
                  />

                  <Text
                    style={styles.sectionTitle}
                  >
                    Your Messages
                  </Text>
                </View>

                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {messages.length}/{MAX_MESSAGES}
                  </Text>
                </View>
              </View>

              {messages.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyEmoji}>
                      💬
                    </Text>
                  </View>

                  <Text style={styles.emptyTitle}>
                    No quick messages yet
                  </Text>

                  <Text style={styles.emptyText}>
                    Create your first quick message
                    above to reply to customers
                    faster.
                  </Text>
                </View>
              ) : (
                messages.map((item, index) => (
                  <View
                    key={item.id}
                    style={styles.messageCard}
                  >
                    <View
                      style={styles.messageNumber}
                    >
                      <Text
                        style={
                          styles.messageNumberText
                        }
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.messageContent
                      }
                    >
                      <Text
                        style={styles.messageText}
                      >
                        {item.message}
                      </Text>

                      <Text
                        style={styles.messageLength}
                      >
                        {item.message.length}{" "}
                        characters
                      </Text>
                    </View>

                    <View
                      style={styles.messageActions}
                    >
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() =>
                          handleEdit(item)
                        }
                      >
                        <Feather
                          name="edit-2"
                          size={17}
                          color="#C4B5FD"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.iconButton,
                          styles.deleteButton,
                        ]}
                        onPress={() =>
                          handleDelete(item.id)
                        }
                      >
                        <Feather
                          name="trash-2"
                          size={17}
                          color="#F87171"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ================= HELP ================= */}

            <View style={styles.helpCard}>
              <View style={styles.helpIcon}>
                <Feather
                  name="zap"
                  size={18}
                  color="#F5C842"
                />
              </View>

              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>
                  Quick tip
                </Text>

                <Text style={styles.helpText}>
                  Keep your messages short and
                  friendly. You can use them for
                  greetings, common responses, or to answer
                  or common questions.
                </Text>
              </View>
            </View>

            <Text style={styles.footer}>
              ✦ ✦ ✦
            </Text>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1A0533",
  },

  flex: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#C4B5FD",
    fontSize: 14,
    fontWeight: "600",
  },

  // ================= HEADER =================

  header: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor:
      "rgba(245,200,66,0.25)",
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor:
      "rgba(124,58,237,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F3F0FF",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#9E7DC8",
    marginTop: 2,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(245,200,66,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor:
      "rgba(245,200,66,0.3)",
  },

  headerEmoji: {
    fontSize: 20,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ================= INFO =================

  infoCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 13,
    borderRadius: 15,
    backgroundColor:
      "rgba(245,200,66,0.08)",
    borderWidth: 1,
    borderColor:
      "rgba(245,200,66,0.2)",
    flexDirection: "row",
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(245,200,66,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: "#F5C842",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },

  infoText: {
    color: "#C4B5FD",
    fontSize: 11,
    lineHeight: 17,
  },

  // ================= SECTION =================

  section: {
    marginHorizontal: 14,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },

  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F5C842",
  },

  sectionTitle: {
    color: "#F3F0FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ================= EDITOR =================

  editorCard: {
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor:
      "rgba(124,58,237,0.35)",
    padding: 12,
  },

  input: {
    minHeight: 100,
    maxHeight: 150,
    borderRadius: 13,
    backgroundColor:
      "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor:
      "rgba(124,58,237,0.3)",
    padding: 13,
    color: "#F3F0FF",
    fontSize: 14,
    lineHeight: 20,
  },

  inputBottom: {
    alignItems: "flex-end",
    marginTop: 5,
  },

  characterCount: {
    color: "#9E7DC8",
    fontSize: 10,
    fontWeight: "600",
  },

  characterLimit: {
    color: "#F87171",
  },

  editorButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveGradient: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  cancelButton: {
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      "rgba(124,58,237,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "700",
  },

  // ================= LIST =================

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  counterBadge: {
    backgroundColor:
      "rgba(124,58,237,0.35)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },

  counterText: {
    color: "#DDD6FE",
    fontSize: 10,
    fontWeight: "800",
  },

  messageCard: {
    minHeight: 76,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor:
      "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor:
      "rgba(245,200,66,0.18)",
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  messageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor:
      "rgba(124,58,237,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  messageNumberText: {
    color: "#F5C842",
    fontSize: 12,
    fontWeight: "800",
  },

  messageContent: {
    flex: 1,
    paddingRight: 7,
  },

  messageText: {
    color: "#F3F0FF",
    fontSize: 13,
    lineHeight: 19,
  },

  messageLength: {
    color: "#8E73B5",
    fontSize: 9,
    marginTop: 3,
  },

  messageActions: {
    flexDirection: "row",
    gap: 5,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor:
      "rgba(124,58,237,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  deleteButton: {
    backgroundColor:
      "rgba(239,68,68,0.1)",
  },

  // ================= EMPTY =================

  emptyCard: {
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor:
      "rgba(124,58,237,0.25)",
    padding: 25,
    alignItems: "center",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor:
      "rgba(124,58,237,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  emptyEmoji: {
    fontSize: 25,
  },

  emptyTitle: {
    color: "#F3F0FF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },

  emptyText: {
    color: "#9E7DC8",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  // ================= HELP =================

  helpCard: {
    marginHorizontal: 14,
    marginTop: 2,
    padding: 13,
    borderRadius: 15,
    backgroundColor:
      "rgba(124,58,237,0.1)",
    borderWidth: 1,
    borderColor:
      "rgba(124,58,237,0.25)",
    flexDirection: "row",
  },

  helpIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(245,200,66,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  helpContent: {
    flex: 1,
  },

  helpTitle: {
    color: "#F5C842",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },

  helpText: {
    color: "#B9A5D1",
    fontSize: 11,
    lineHeight: 17,
  },

  footer: {
    textAlign: "center",
    color: "rgba(245,200,66,0.35)",
    fontSize: 16,
    letterSpacing: 8,
    marginTop: 14,
  },
});