import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getReportScreenTranslations, normalizeLanguage, SupportedLanguage } from "../../lib/reportCatalog";
import { CLIENT_API_BASE_URL, CLIENT_AUTH_API_BASE_URL } from "../../lib/api";

type LocationSuggestion = { display_name?: string; label?: string; lat?: string | number; lon?: string | number };

const parseProfileDate = (value?: string | null) => {
  if (!value) return null;

  // DB format: DD/MM/YYYY
  const parts = value.split("/");

  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

    if (
      !Number.isNaN(day) &&
      !Number.isNaN(month) &&
      !Number.isNaN(year)
    ) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
};

const parseProfileTime = (value?: string | null) => {
  if (!value) return null;

  const normalized = value.trim();
  const match = normalized.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
  );

  if (!match) {
    console.log("Invalid birth time:", value);
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minutes > 59 || hours > (period ? 12 : 23)) {
    return null;
  }

  if (period) {
    if (hours < 1 || hours > 12) return null;

    hours = hours % 12;
    if (period === "PM") hours += 12;
  }

  const result = new Date();
  result.setHours(hours, minutes, 0, 0);

  return result;
};


export default function FreeKundaliScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [showForm, setShowForm] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [timeOfBirth, setTimeOfBirth] = useState<Date | null>(null);
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalScrollRef = useRef<ScrollView>(null);
  const locationRequestId = useRef(0);
  const [locationLoading, setLocationLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem("user-language").then((value) => setLanguage(normalizeLanguage(value)));
  }, []));

  const t = getReportScreenTranslations(language);
  const formatDate = (value: Date) => value.toLocaleDateString();
  const formatTime = (value: Date) => value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const openKundaliForm = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId?.trim()) {
      router.push("/login");
      return;
    }
    setFormError("");
    setIsEditingInfo(false);
    setProfileLoading(true);
    setShowForm(true);
    try {
      const response = await fetch(`${CLIENT_AUTH_API_BASE_URL}/users/${userId}/birth-profile`);
      const json = await response.json();
      const user = json?.data ?? json;
      console.log("Loaded kundali profile:", user);
      setFullName(user?.full_name || "");
      setDateOfBirth(parseProfileDate(user?.date_of_birth));
      setTimeOfBirth(parseProfileTime(user?.time_of_birth));
      setUnknownBirthTime(!user?.time_of_birth);
      setLocation(user?.location || "");
      setLatitude(user?.latitude == null ? "" : String(user.latitude));
      setLongitude(user?.longitude == null ? "" : String(user.longitude));
    } catch (error) {
      console.error("Kundali profile load error:", error);
      setFormError("Unable to load your saved birth details.");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!showForm || !isEditingInfo || location.trim().length < 2 || (latitude && longitude)) {
      setLocationSuggestions([]);
      return;
    }
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current);
    locationSearchTimer.current = setTimeout(async () => {
      const requestId = ++locationRequestId.current;
      setLocationLoading(true);
      try {
        const response = await fetch(`${CLIENT_API_BASE_URL}/location/search?q=${encodeURIComponent(location.trim())}&limit=5&language=${encodeURIComponent(language)}`);
        const json = await response.json();
        if (requestId === locationRequestId.current) setLocationSuggestions(Array.isArray(json?.data) ? json.data : []);
      } catch (error) {
        console.error("Kundali location search error:", error);
        if (requestId === locationRequestId.current) setLocationSuggestions([]);
      } finally {
        if (requestId === locationRequestId.current) setLocationLoading(false);
      }
    }, 350);
    return () => { if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current); };
  }, [showForm, isEditingInfo, location, latitude, longitude, language]);

  const selectLocation = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.label || suggestion.display_name || "");
    setLatitude(suggestion.lat == null ? "" : String(suggestion.lat));
    setLongitude(suggestion.lon == null ? "" : String(suggestion.lon));
    setLocationSuggestions([]);
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (locationSuggestions.length > 0) {
      const timer = setTimeout(() => modalScrollRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timer);
    }
  }, [locationSuggestions.length]);

  const submitKundaliForm = async () => {
    if (!fullName.trim() || !dateOfBirth || (!timeOfBirth && !unknownBirthTime) || !location.trim()) {
      setFormError(t.kundaliForm.validation);
      return;
    }

    if (!latitude || !longitude) {
      setFormError(t.kundaliForm.validation);
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");
    if (!userId?.trim()) {
      router.push("/login");
      return;
    }

    const dateValue = dateOfBirth.toISOString().slice(0, 10);
    const timeValue = unknownBirthTime
      ? "12:00"
      : `${String(timeOfBirth?.getHours() ?? 0).padStart(2, "0")}:${String(timeOfBirth?.getMinutes() ?? 0).padStart(2, "0")}`;

    setShowForm(false);
    router.push({
      pathname: "/report/kundali-result",
      params: {
        userId,
        fullName: fullName.trim(),
        dateOfBirth: dateValue,
        timeOfBirth: timeValue,
        latitude,
        longitude,
        birthLocation: location.trim(),
      },
    });
  };

  return (
    <SafeAreaView edges={['bottom','top']} style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <Text style={styles.topTitle}>{t.freeKundaliTitle}</Text><View style={styles.backButton} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Image source={require("../../assets/reports/free-kundali.png")} style={styles.image} resizeMode="cover" />
        <Text style={styles.title}>{t.freeKundaliTitle}</Text>
        <Text style={styles.intro}>{t.freeKundaliIntro}</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.whatIsKundali}</Text>
          <Text style={styles.body}>{t.whatIsKundaliBody}</Text>
          <Text style={[styles.sectionTitle, styles.spacedTitle]}>{t.whyKundali}</Text>
          <Text style={styles.body}>{t.whyKundaliBody}</Text>
          <View style={styles.benefits}>{t.kundaliBenefits.map((benefit) => <View key={benefit} style={styles.benefitRow}><Text style={styles.check}>✓</Text><Text style={styles.benefitText}>{benefit}</Text></View>)}</View>
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={openKundaliForm}><Text style={styles.ctaText}>{t.getFreeKundali}</Text></TouchableOpacity>

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0} style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>{t.getFreeKundali}</Text><Text style={styles.modalSubtitle}>{t.freeKundaliIntro}</Text></View>
                <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity>
              </View>
              {!isEditingInfo ? <TouchableOpacity style={styles.editInfoButton} onPress={() => { setShowForm(false); router.push({ pathname: "/login", params: { mode: "edit" } }); }}><Text style={styles.editInfoButtonText}>Edit info</Text></TouchableOpacity> : null}
              <ScrollView ref={modalScrollRef} style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="none" nestedScrollEnabled showsVerticalScrollIndicator={false} onContentSizeChange={() => { if (locationSuggestions.length > 0) modalScrollRef.current?.scrollToEnd({ animated: true }); }}>
                {profileLoading ? <Text style={styles.loadingText}>Loading saved birth details...</Text> : null}
                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                <Text style={styles.label}>{t.kundaliForm.fullName}</Text>
                <TextInput editable={isEditingInfo} value={fullName} onChangeText={(value) => { setFullName(value); setFormError(""); }} placeholder={t.kundaliForm.namePlaceholder} placeholderTextColor="#94A3B8" style={[styles.input, !isEditingInfo && styles.inputDisabled]} />
                <Text style={styles.label}>{t.kundaliForm.dateOfBirth}</Text>
                <TouchableOpacity disabled={!isEditingInfo} style={[styles.pickerButton, !isEditingInfo && styles.pickerButtonDisabled]} onPress={() => setShowDatePicker(true)}><Text style={dateOfBirth ? styles.pickerText : styles.placeholder}>{dateOfBirth ? formatDate(dateOfBirth) : t.kundaliForm.selectDate}</Text></TouchableOpacity>
                <Text style={styles.label}>{t.kundaliForm.timeOfBirth}</Text>
                <TouchableOpacity disabled={!isEditingInfo || unknownBirthTime} style={[styles.pickerButton, (!isEditingInfo || unknownBirthTime) && styles.pickerButtonDisabled]} onPress={() => setShowTimePicker(true)}><Text style={timeOfBirth ? styles.pickerText : styles.placeholder}>{timeOfBirth ? formatTime(timeOfBirth) : t.kundaliForm.selectTime}</Text></TouchableOpacity>
                <TouchableOpacity disabled style={[styles.checkboxRow, styles.disabledRow]} activeOpacity={0.75}>
                  <View style={[styles.checkbox, unknownBirthTime && styles.checkboxChecked]}>{unknownBirthTime ? <Text style={styles.checkboxMark}>✓</Text> : null}</View>
                  <Text style={styles.checkboxText}>{t.kundaliForm.dontKnowTime}</Text>
                </TouchableOpacity>
                <Text style={styles.label}>{t.kundaliForm.birthLocation}</Text>
                <TextInput editable={isEditingInfo} value={location} onChangeText={(value) => { setLocation(value); setLatitude(""); setLongitude(""); setFormError(""); }} placeholder={t.kundaliForm.locationPlaceholder} placeholderTextColor="#94A3B8" style={[styles.input, !isEditingInfo && styles.inputDisabled]} />
                {locationLoading ? <Text style={styles.locationLoadingText}>Searching locations...</Text> : null}
                {locationSuggestions.length > 0 ? <View style={styles.locationDropdown}>{locationSuggestions.map((suggestion, index) => <TouchableOpacity key={`${suggestion.display_name || suggestion.label}-${index}`} style={styles.locationOption} onPress={() => selectLocation(suggestion)}><Text style={styles.locationOptionText}>{suggestion.display_name || suggestion.label}</Text></TouchableOpacity>)}</View> : null}
                <View style={styles.modalActions}><TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>{t.kundaliForm.cancel}</Text></TouchableOpacity><TouchableOpacity style={styles.submitButton} onPress={submitKundaliForm}><Text style={styles.submitText}>{t.kundaliForm.continue}</Text></TouchableOpacity></View>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>
      {showDatePicker ? <DateTimePicker value={dateOfBirth || new Date()} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} maximumDate={new Date()} onChange={(_event, value) => { setShowDatePicker(false); if (value) setDateOfBirth(value); }} /> : null}
      {showTimePicker ? <DateTimePicker value={timeOfBirth || new Date()} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(_event, value) => { setShowTimePicker(false); if (value) setTimeOfBirth(value); }} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" }, topBar: { height: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" }, backText: { fontSize: 36, lineHeight: 36, color: "#1E293B" }, topTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" }, content: { padding: 16, paddingBottom: 100 }, image: { width: "100%", height: 260, borderRadius: 20, backgroundColor: "#F1EDFF" }, title: { marginTop: 22, fontSize: 28, fontWeight: "800", color: "#1E293B" }, intro: { marginTop: 8, fontSize: 15, lineHeight: 23, color: "#64748B" }, card: { marginTop: 20, padding: 18, borderRadius: 18, backgroundColor: "#FFFFFF", elevation: 2, shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, sectionTitle: { fontSize: 19, fontWeight: "700", color: "#1E293B" }, spacedTitle: { marginTop: 20 }, body: { marginTop: 8, fontSize: 14, lineHeight: 22, color: "#64748B" }, benefits: { marginTop: 17, gap: 11 }, benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 }, check: { color: "#7C3AED", fontSize: 18, fontWeight: "800" }, benefitText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#475569" }, cta: { position: "absolute", left: 20, right: 20, bottom: 44, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: "#2a1351", elevation: 5 }, ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(15,23,42,0.55)" }, modalCard: { maxHeight: "90%", padding: 20, borderRadius: 22, backgroundColor: "#FFFFFF" }, modalScroll: { flexGrow: 0 }, modalScrollContent: { paddingBottom: 4 }, modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }, modalHeaderCopy: { flex: 1, paddingRight: 12 }, modalTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B" }, modalSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 18, color: "#64748B" }, closeText: { fontSize: 30, lineHeight: 28, color: "#64748B" }, editInfoButton: { alignSelf: "flex-start", marginBottom: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: "#F1EAFE" }, editInfoButtonText: { color: "#7C3AED", fontSize: 13, fontWeight: "800" }, loadingText: { marginBottom: 12, color: "#64748B", fontSize: 13 }, errorText: { marginBottom: 12, fontSize: 13, lineHeight: 19, color: "#DC2626" }, label: { marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: "700", color: "#334155" }, input: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, fontSize: 15, color: "#1E293B" }, inputDisabled: { backgroundColor: "#F8FAFC", color: "#64748B" }, pickerButton: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, justifyContent: "center" }, pickerButtonDisabled: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }, pickerText: { fontSize: 15, color: "#1E293B" }, placeholder: { fontSize: 15, color: "#94A3B8" }, checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 9 }, disabledRow: { opacity: 0.7 }, checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }, checkboxChecked: { borderColor: "#7C3AED", backgroundColor: "#7C3AED" }, checkboxMark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" }, checkboxText: { flex: 1, fontSize: 13, color: "#475569" }, locationLoadingText: { marginTop: 6, fontSize: 12, color: "#64748B" }, locationDropdown: { marginTop: 4, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, backgroundColor: "#FFFFFF", overflow: "hidden", zIndex: 10, elevation: 10 }, locationOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }, locationOptionText: { fontSize: 13, lineHeight: 18, color: "#334155" }, modalActions: { flexDirection: "row", gap: 10, marginTop: 24 }, cancelButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }, cancelText: { fontSize: 15, fontWeight: "700", color: "#475569" }, submitButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" }, submitText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
