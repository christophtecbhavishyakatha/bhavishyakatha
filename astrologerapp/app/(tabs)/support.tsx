import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "https://bhavishyakatha.in/express/api/support";
const API_CREATE_TICKET = `${API_BASE}/create`;
const API_GET_TICKETS = `${API_BASE}/tickets`;

interface Ticket {
  id: string;
  issue_type: string;
  details: string;
  screenshot?: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  created_at: string;
  response?: string;
}

const ISSUE_TYPES = [
  { value: "payment", label: "💳 Payment Issue" },
  { value: "technical", label: "⚙️ Technical Problem" },
  { value: "account", label: "👤 Account Issue" },
  { value: "booking", label: "📅 Booking/Consultation" },
  { value: "profile", label: "📝 Profile Update" },
  { value: "other", label: "❓ Other" },
];

export default function Support() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [form, setForm] = useState({
    issueType: "",
    details: "",
    screenshot: "",
  });

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, []),
  );
  const fetchTickets = async () => {
    setFetching(true);
    const userId = await AsyncStorage.getItem("user_id");

    try {
      const res = await fetch(
        `${API_BASE}/tickets/${userId}?userType=astrologer`,
      );
      const json = await res.json();
      console.log("Fetched tickets:", json, userId);

      if (json.status && json.data) {
        setTickets(json.data);
      }
    } catch (e) {
      console.log("Error fetching tickets:", e);
    }

    setFetching(false);
  };

  const pickScreenshot = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        const uri = result.assets[0].uri;

        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          {
            compress: 0.4,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );

        const base64 = manipResult.base64 || "";
        const sizeKB = Math.round((base64.length * 3) / 4 / 1024);

        console.log(`Screenshot size: ${sizeKB}KB`);

        if (sizeKB > 200) {
          Alert.alert(
            "Warning",
            `Image is ${sizeKB}KB. It may take longer to upload.`,
          );
        }

        setForm({ ...form, screenshot: base64 });
      } catch (error) {
        Alert.alert("Error", "Failed to process image");
        console.error(error);
      }
    }
  };

  const submitTicket = async () => {
    if (!form.issueType || !form.details.trim()) {
      Alert.alert("Error", "Please select an issue type and provide details");
      return;
    }

    if (form.details.length < 10) {
      Alert.alert(
        "Error",
        "Please provide more details (minimum 10 characters)",
      );
      return;
    }

    setLoading(true);
    const userId = await AsyncStorage.getItem("user_id");

    try {
      const res = await fetch(API_CREATE_TICKET, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologer_id: userId,
          issue_type: form.issueType,
          details: form.details,
          screenshot: form.screenshot || null,
          user_type: "astrologer",
        }),
      });

      const json = await res.json();

      if (json.status) {
        Alert.alert("Success", "Support ticket created successfully!");
        setForm({ issueType: "", details: "", screenshot: "" });
        setShowCreateForm(false);
        fetchTickets();
      } else {
        Alert.alert("Error", json.message || "Failed to create ticket");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      console.error(e);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#3b82f6";
      case "in-progress":
        return "#f59e0b";
      case "resolved":
        return "#10b981";
      case "closed":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "open":
        return "#dbeafe";
      case "in-progress":
        return "#fef3c7";
      case "resolved":
        return "#d1fae5";
      case "closed":
        return "#f3f4f6";
      default:
        return "#f3f4f6";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading support tickets...</Text>
      </View>
    );
  }

  if (showCreateForm) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowCreateForm(false)}
              style={styles.backButton}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>🎫</Text>
            </View>
            <Text style={styles.headerTitle}>Create Support Ticket</Text>
            <Text style={styles.headerSubtitle}>
              {"We're here to help you"}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Issue Type *</Text>
              <View style={styles.issueTypesGrid}>
                {ISSUE_TYPES.map((issue) => (
                  <TouchableOpacity
                    key={issue.value}
                    style={[
                      styles.issueTypeCard,
                      form.issueType === issue.value &&
                        styles.issueTypeCardActive,
                    ]}
                    onPress={() => setForm({ ...form, issueType: issue.value })}
                  >
                    <Text
                      style={[
                        styles.issueTypeText,
                        form.issueType === issue.value &&
                          styles.issueTypeTextActive,
                      ]}
                    >
                      {issue.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>
                Describe Your Issue *
                <Text style={styles.labelHint}>
                  {" "}
                  ({form.details.length}/500)
                </Text>
              </Text>
              <TextInput
                style={styles.textArea}
                value={form.details}
                onChangeText={(v: string) => {
  const cleaned = v.replace(/[<>]/g, "");
  setForm({ ...form, details: cleaned });
}}
                placeholder="Please provide detailed information about your issue..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Screenshot (Optional)</Text>
              <Text style={styles.uploadHint}>
                Adding a screenshot helps us understand the issue better
              </Text>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickScreenshot}
              >
                <Text style={styles.uploadIcon}>📤</Text>
                <Text style={styles.uploadText}>
                  {form.screenshot ? "Change Screenshot" : "Upload Screenshot"}
                </Text>
              </TouchableOpacity>

              {form.screenshot ? (
                <View style={styles.previewContainer}>
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${form.screenshot}`,
                    }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setForm({ ...form, screenshot: "" })}
                  >
                    <Text style={styles.removeImageText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={submitTicket}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Ticket</Text>
                  <Text style={styles.submitButtonIcon}>→</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoNote}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                {
                  "Our support team typically responds within 24-48 hours. You'll be notified via email."
                }
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>💬</Text>
          </View>
          <Text style={styles.headerTitle}>Support Center</Text>
          <Text style={styles.headerSubtitle}>How can we help you today?</Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateForm(true)}
        >
          <Text style={styles.createButtonIcon}>+</Text>
          <Text style={styles.createButtonText}>Create New Ticket</Text>
        </TouchableOpacity>

        <View style={styles.ticketsSection}>
          <Text style={styles.sectionTitle}>Your Support Tickets</Text>

          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No support tickets yet</Text>
              <Text style={styles.emptyText}>
                Create a ticket if you need help with anything
              </Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketType}>
                    <Text style={styles.ticketTypeEmoji}>
                      {ISSUE_TYPES.find(
                        (t) => t.value === ticket.issue_type,
                      )?.label.split(" ")[0] || "❓"}
                    </Text>
                    <Text style={styles.ticketTypeText}>
                      {ISSUE_TYPES.find(
                        (t) => t.value === ticket.issue_type,
                      )?.label.replace(/^.+?\s/, "") || "Other"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBg(ticket.status) },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(ticket.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(ticket.status) },
                      ]}
                    >
                      {ticket.status.replace("-", " ")}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketDetails} numberOfLines={3}>
                  {ticket.details}
                </Text>

                {ticket.screenshot ? (
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${ticket.screenshot}`,
                    }}
                    style={styles.ticketScreenshot}
                    resizeMode="cover"
                  />
                ) : null}

                {ticket.response ? (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>
                      📝 Support Response:
                    </Text>
                    <Text style={styles.responseText}>{ticket.response}</Text>
                  </View>
                ) : null}

                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketId}>#{ticket.id}</Text>
                  <Text style={styles.ticketDate}>
                    {formatDate(ticket.created_at)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 45,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "#6366f1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "55%",
  },
  backIcon: {
    fontSize: 24,
    color: "#6366f1",
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: "#f4f4f7ff",
    fontWeight: "600",
    flexShrink: 1,
  },
  headerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIconText: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    backgroundColor: "#6366f1",
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonIcon: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginRight: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  ticketsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  ticketCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ticketType: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  ticketTypeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  ticketTypeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  ticketDetails: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketScreenshot: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    marginBottom: 12,
  },
  responseBox: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065f46",
    marginBottom: 6,
  },
  responseText: {
    fontSize: 13,
    color: "#047857",
    lineHeight: 18,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 8,
  },
  ticketId: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
  },
  ticketDate: {
    fontSize: 12,
    color: "#9ca3af",
    flexShrink: 1,
    textAlign: "right",
  },
  form: {
    padding: 16,
  },
  inputWrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 10,
  },
  labelHint: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "400",
  },
  issueTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  issueTypeCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  issueTypeCardActive: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
  },
  issueTypeText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
  },
  issueTypeTextActive: {
    color: "#6366f1",
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    minHeight: 120,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 6,
  },
  uploadHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  previewContainer: {
    marginTop: 12,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeImageText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginRight: 8,
  },
  submitButtonIcon: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 16,
  },
});
