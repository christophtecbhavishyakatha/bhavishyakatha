import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardTypeOptions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';

const API_BASE = "https://bhavishyakatha.in/express/api/bank";
const API_GET = `${API_BASE}/get`;
const API_SAVE = `${API_BASE}/add`;

export default function AddBankAccount() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [accountExists, setAccountExists] = useState(false);

  const [form, setForm] = useState({
    bankName: "",
    beneficiaryName: "",
    ifsc: "",
    branch: "",
    accountNumber: "",
    panNumber: "",
    panImage: "",
  });


useFocusEffect(
  useCallback(() => {
    fetchBank();
  }, [])
);
  const fetchBank = async () => {
    setFetching(true);
    const id = await AsyncStorage.getItem("user_id");
    try {
      const res = await fetch(API_GET, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologer_id: id,
        }),
      });
      const json = await res.json();
console.log("Fetch Bank Response:", json,id);
      if (json.status === true && json.data) {
        setForm(json.data);
        setAccountExists(true);
      }
    } catch (e) {
      console.log("Error fetching bank:", e);
    }
    setFetching(false);
  };


  const pickPanImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        const uri = result.assets[0].uri;
        
        // Compress to ~100KB
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }], // Resize to 800px width
          { 
            compress: 0.3, // Low quality for smaller size
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true 
          }
        );
        
        const base64 = manipResult.base64 || '';
        const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
        
        console.log(`Image size: ${sizeKB}KB`);
        
        if (sizeKB > 150) {
          Alert.alert("Warning", `Image is ${sizeKB}KB. It may take longer to upload.`);
        }
        
        setForm({ ...form, panImage: base64 });
      } catch (error) {
        Alert.alert("Error", "Failed to process image");
        console.error(error);
      }
    }
  };

  const submit = async () => {
    if (
      !form.bankName.trim() ||
      !form.beneficiaryName.trim() ||
      !form.ifsc.trim() ||
      !form.accountNumber.trim() ||
      !form.panNumber.trim()
    ) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    const id = await AsyncStorage.getItem("user_id");
    // Validate IFSC format (basic)
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) {
      Alert.alert("Error", "Please enter a valid IFSC code");
      return;
    }

    // Validate PAN format
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.toUpperCase())) {
      Alert.alert("Error", "Please enter a valid PAN number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          astrologer_id: id,
          ifsc: form.ifsc.toUpperCase(),
          panNumber: form.panNumber.toUpperCase(),
        }),
      });

      const json = await res.json();

      if (json.status) {
        Alert.alert("Success", "Bank account added successfully!");
        fetchBank();
      } else {
        Alert.alert("Error", json.message || "Failed to add account");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const handleContactSupport = () => {
    Alert.alert(
      "Contact Support",
      "To modify your bank account details, please contact our support team.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Contact Support", onPress: () => router.push("/support") },
      ]
    );
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading account details...</Text>
      </View>
    );
  }

  // Display mode when account exists
  if (accountExists) {
    return (
              <SafeAreaView edges={["top"]} style={styles.safeArea}>
        
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🏦</Text>
          </View>
          <Text style={styles.headerTitle}>Bank Account</Text>
          <Text style={styles.headerSubtitle}>Your registered bank details</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Verified Account</Text>
          </View>

          <DetailRow label="Bank Name" value={form.bankName} icon="🏛️" />
          <DetailRow label="Beneficiary Name" value={form.beneficiaryName} icon="👤" />
          <DetailRow label="IFSC Code" value={form.ifsc} icon="🔢" />
          {form.branch ? <DetailRow label="Branch" value={form.branch} icon="📍" /> : null}
          <DetailRow 
            label="Account Number" 
            value={`****${form.accountNumber.slice(-4)}`} 
            icon="💳"
            secure
          />
          <DetailRow label="PAN Number" value={form.panNumber} icon="🆔" />

          {form.panImage ? (
            <View style={styles.imageSection}>
              <Text style={styles.imageLabel}>PAN Card Image</Text>
              <Image
                source={{ uri: `data:image/jpeg;base64,${form.panImage}` }}
                style={styles.displayImage}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Need to update details?</Text>
            <Text style={styles.infoText}>
              For security reasons, bank account modifications require verification. 
              Please contact our support team for assistance.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
          <Text style={styles.supportButtonText}>Contact Support</Text>
          <Text style={styles.supportButtonIcon}>→</Text>
        </TouchableOpacity>
      </ScrollView>
      </SafeAreaView>
    );
  }

  // Add mode when no account exists
  return (
          <SafeAreaView edges={["top"]} style={styles.safeArea}>
    
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🏦</Text>
        </View>
        <Text style={styles.headerTitle}>Add Bank Account</Text>
        <Text style={styles.headerSubtitle}>Enter your bank details for payments</Text>
      </View>

      <View style={styles.form}>
        <Input 
          label="Bank Name *" 
          value={form.bankName} 
          onChange={(v: string) => setForm({ ...form, bankName: v })}
          placeholder="e.g., State Bank of India"
        />
        <Input 
          label="Beneficiary Name *" 
          value={form.beneficiaryName} 
          onChange={(v: string) => setForm({ ...form, beneficiaryName: v })}
          placeholder="Account holder name"
        />
        <Input 
          label="IFSC Code *" 
          value={form.ifsc} 
          onChange={(v: string) => setForm({ ...form, ifsc: v.toUpperCase() })}
          placeholder="e.g., SBIN0001234"
          autoCapitalize="characters"
        />
        <Input 
          label="Branch Name" 
          value={form.branch} 
          onChange={(v: string) => setForm({ ...form, branch: v })}
          placeholder="Branch location (optional)"
        />
        <Input 
          label="Account Number *" 
          value={form.accountNumber} 
          onChange={(v: string) => setForm({ ...form, accountNumber: v })}
          keyboard="numeric"
          placeholder="Enter account number"
        />
        <Input 
          label="PAN Number *" 
          value={form.panNumber} 
          onChange={(v: string) => setForm({ ...form, panNumber: v.toUpperCase() })}
          placeholder="e.g., ABCDE1234F"
          autoCapitalize="characters"
          maxLength={10}
        />

        <View style={styles.uploadSection}>
          <Text style={styles.uploadLabel}>PAN Card Image (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickPanImage}>
            <Text style={styles.uploadIcon}>📤</Text>
            <Text style={styles.uploadText}>
              {form.panImage ? "Change Image" : "Upload PAN Card"}
            </Text>
          </TouchableOpacity>

          {form.panImage ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${form.panImage}` }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={submit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Bank Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your information is encrypted and secure. Once added, modifications require support verification.
          </Text>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboard?: KeyboardTypeOptions;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}

function Input({ 
  label, 
  value, 
  onChange, 
  keyboard = "default", 
  placeholder = "", 
  autoCapitalize = "sentences", 
  maxLength 
}: InputProps) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        keyboardType={keyboard}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  icon: string;
  secure?: boolean;
}

function DetailRow({ label, value, icon, secure = false }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailIcon}>{icon}</Text>
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, secure && styles.detailValueSecure]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
      safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  card: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  detailRow: {
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    minWidth: 0,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    flexShrink: 1,
  },
  detailValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    marginLeft: 24,
    flexShrink: 1,
  },
  detailValueSecure: {
    letterSpacing: 2,
  },
  imageSection: {
    marginTop: 10,
  },
  imageLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 12,
  },
  displayImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fef3c7",
    minWidth: 0,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 18,
  },
  supportButton: {
    flexDirection: "row",
    backgroundColor: "#6366f1",
    marginHorizontal: 16,
    marginBottom: 30,
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
  supportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
    flexShrink: 1,
    textAlign: "center",
  },
  supportButtonIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  form: {
    padding: 16,
  },
  inputWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#111827",
  },
  uploadSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
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
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "#f3f4f6",
  },
  submitButton: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
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
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
});
