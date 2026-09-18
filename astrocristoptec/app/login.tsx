import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  requestPermission,
} from "@react-native-firebase/messaging";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppEventsLogger } from "react-native-fbsdk-next";

interface LocationSuggestion {
  label?: string;
  display_name?: string;
  lat: string | number;
  lon: string | number;
}

// Translation helper
const getTranslations = (lang: string) => {
  const translations: any = {
    en: {
      welcome: "Welcome",
      subtitle: "Sign in to continue",
      mobileNumber: "Mobile Number",
      enterMobile: "Enter your mobile number",
      sendOTP: "Send OTP",
      verifyOTP: "Verify OTP",
      enterOTP: "Enter 6-digit OTP",
      verify: "Verify",
      resendOTP: "Resend OTP",
      createAccount: "Create Account",
      fullName: "Full Name",
      enterName: "Enter your full name",
      location: "Birth Place",
      enterLocation: "Enter your birth place",
      selectLocation: "Select a location from suggestions",
      dateOfBirth: "Date of Birth",
      selectDate: "Select Date",
      timeOfBirth: "Time of Birth",
      selectTime: "Select Time",
      dontKnowTime: "I don't know my birth time",
      signup: "Sign Up",
      requiredField: "This field is required",
      invalidMobile: "Please enter a valid 10-digit mobile number",
      invalidOTP: "Please enter a valid 6-digit OTP",
      otpSent: "OTP sent successfully",
      signupSuccess: "Account created successfully",
      loginSuccess: "Login successful",
      saveChanges: "Save Changes",
      profileCompleted: "Your profile has been successfully completed",
      profileUpdated: "Your profile has been successfully updated",
      profileCompletedTitle: "Profile Completed 🎉",
      profileUpdatedTitle: "Profile Updated 🎉",
      completeProfile: "Complete your profile",
      editProfile: "Edit your profile",
    },
    hi: {
      welcome: "स्वागत है",
      subtitle: "जारी रखने के लिए साइन इन करें",
      mobileNumber: "मोबाइल नंबर",
      enterMobile: "अपना मोबाइल नंबर दर्ज करें",
      sendOTP: "OTP भेजें",
      verifyOTP: "OTP सत्यापित करें",
      enterOTP: "6 अंकों का OTP दर्ज करें",
      verify: "सत्यापित करें",
      resendOTP: "OTP फिर से भेजें",
      createAccount: "खाता बनाएं",
      fullName: "पूरा नाम",
      enterName: "अपना पूरा नाम दर्ज करें",
      location: "जन्म स्थान",
      enterLocation: "अपना जन्म स्थान दर्ज करें",
      selectLocation: "सुझावों में से स्थान चुनें",
      dateOfBirth: "जन्म तिथि",
      selectDate: "तारीख चुनें",
      timeOfBirth: "जन्म समय",
      selectTime: "समय चुनें",
      dontKnowTime: "मुझे अपना जन्म समय नहीं पता",
      signup: "साइन अप करें",
      requiredField: "यह फ़ील्ड आवश्यक है",
      invalidMobile: "कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें",
      invalidOTP: "कृपया एक मान्य 6 अंकों का OTP दर्ज करें",
      otpSent: "OTP सफलतापूर्वक भेजा गया",
      signupSuccess: "खाता सफलतापूर्वक बनाया गया",
      loginSuccess: "लॉगिन सफल",
      saveChanges: "परिवर्तन सहेजें",
      profileCompleted: "आपकी प्रोफ़ाइल सफलतापूर्वक पूरी हो गई है",
      profileUpdated: "आपकी प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई है",
      profileCompletedTitle: "प्रोफ़ाइल पूरी हुई 🎉",
      profileUpdatedTitle: "प्रोफ़ाइल अपडेट हुई 🎉",
      completeProfile: "अपनी प्रोफ़ाइल पूरी करें",
      editProfile: "अपनी प्रोफ़ाइल संपादित करें",
    },
    bn: {
      welcome: "স্বাগতম",
      subtitle: "চালিয়ে যেতে সাইন ইন করুন",
      mobileNumber: "মোবাইল নম্বর",
      enterMobile: "আপনার মোবাইল নম্বর লিখুন",
      sendOTP: "OTP পাঠান",
      verifyOTP: "OTP যাচাই করুন",
      enterOTP: "6 সংখ্যার OTP লিখুন",
      verify: "যাচাই করুন",
      resendOTP: "OTP পুনরায় পাঠান",
      createAccount: "অ্যাকাউন্ট তৈরি করুন",
      fullName: "পুরো নাম",
      enterName: "আপনার পুরো নাম লিখুন",
      location: "জন্মস্থান",
      enterLocation: "আপনার জন্মস্থান লিখুন",
      selectLocation: "পরামর্শ থেকে একটি স্থান নির্বাচন করুন",
      dateOfBirth: "জন্ম তারিখ",
      selectDate: "তারিখ নির্বাচন করুন",
      timeOfBirth: "জন্ম সময়",
      selectTime: "সময় নির্বাচন করুন",
      dontKnowTime: "আমি আমার জন্ম সময় জানি না",
      signup: "সাইন আপ করুন",
      requiredField: "এই ক্ষেত্রটি প্রয়োজনীয়",
      invalidMobile: "অনুগ্রহ করে একটি বৈধ 10 সংখ্যার মোবাইল নম্বর লিখুন",
      invalidOTP: "অনুগ্রহ করে একটি বৈধ 6 সংখ্যার OTP লিখুন",
      otpSent: "OTP সফলভাবে পাঠানো হয়েছে",
      signupSuccess: "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে",
      loginSuccess: "লগইন সফল",
      saveChanges: "পরিবর্তন সংরক্ষণ করুন",
      profileCompleted: "আপনার প্রোফাইল সফলভাবে সম্পন্ন হয়েছে",
      profileUpdated: "আপনার প্রোফাইল সফলভাবে আপডেট হয়েছে",
      profileCompletedTitle: "প্রোফাইল সম্পন্ন হয়েছে 🎉",
      profileUpdatedTitle: "প্রোফাইল আপডেট হয়েছে 🎉",
      completeProfile: "আপনার প্রোফাইল সম্পূর্ণ করুন",
      editProfile: "আপনার প্রোফাইল সম্পাদনা করুন",
    },
  };
  return translations[lang] || translations.en;
};

export default function LoginScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [step, setStep] = useState<"mobile" | "otp" | "signup">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationEdited, setLocationEdited] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const t = getTranslations(language);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyType, setPolicyType] = useState("terms"); // 'terms' | 'privacy'
  const [policyContent, setPolicyContent] = useState("");
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [fcmToken, setFcmToken] = useState("");
  const locationSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { mode } = useLocalSearchParams<{
    mode?: string;
  }>();

  const isEdit = mode === "edit";

  const messaging = getMessaging();

  const API_URL = "https://bhavishyakatha.in/express/api/client/auth";
  const LOCATION_API_URL = "https://bhavishyakatha.in/express/api/client";

  useEffect(() => {
    loadLanguage();
    checkAuth();

    return () => {
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const query = location.trim();

    // In edit mode, do not search the already-saved location on initial load.
    // Search only after the user changes the location field.
    if (
      query.length < 2 ||
      latitude ||
      longitude ||
      (isEdit && !locationEdited)
    ) {
      setLocationSuggestions([]);
      return;
    }

    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }

    locationSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${LOCATION_API_URL}/location/search?q=${encodeURIComponent(
            query,
          )}&limit=5&language=${encodeURIComponent(language)}`,
        );
        const result = await response.json();
        setLocationSuggestions(
          Array.isArray(result?.data) ? result.data : [],
        );
      } catch (error) {
        console.log("Location search error:", error);
        setLocationSuggestions([]);
      }
    }, 450);

    return () => {
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
    };
  }, [isEdit, language, latitude, longitude, location, locationEdited]);

  const checkAuth = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    console.log("Checking auth - userId:", userId, "isEdit:", isEdit);
    if (isEdit && userId?.trim()) {
      loadProfileData(userId);
      setStep("signup");
    } else if (userId?.trim()) {
      router.replace("/(tabs)");
    }
  };

  const setup = async (): Promise<boolean> => {
    try {
      const permissionGranted = await requestPermissionOnly();

      // ❌ Permission denied
      if (!permissionGranted) {
        console.log("Notification permission denied.");
        return false;
      }

      // Firebase notification permission
      const authStatus = await requestPermission(messaging);

      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      // ❌ Firebase permission not enabled
      if (!enabled) {
        console.log("Firebase notification permission denied.");
        return false;
      }

      // Get FCM token
      const token = await getToken(messaging);

      console.log("🔥 FCM Token:", token);
      console.log("Authorization status:", authStatus);

      setFcmToken(token);

      // Save token
      await AsyncStorage.setItem("fcmToken", token);

      return true;
    } catch (error) {
      console.log("Notification setup error:", error);
      return false;
    }
  };
  const requestPermissionOnly = async (): Promise<boolean> => {
    try {
      const { status: existingStatus, canAskAgain } =
        await Notifications.getPermissionsAsync();

      console.log("Notification permission:", {
        existingStatus,
        canAskAgain,
      });

      // Already granted
      if (existingStatus === "granted") {
        return true;
      }

      // Permission denied but OS allows asking again
      if (canAskAgain) {
        const { status } = await Notifications.requestPermissionsAsync();

        console.log("Permission request result:", status);

        return status === "granted";
      }

      // Permission permanently denied / cannot ask again
      Alert.alert(
        "Notification Permission Required",
        "Notification permission is required to receive OTP and important account notifications. Please enable notifications from Settings.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings();
            },
          },
        ],
      );

      return false;
    } catch (error) {
      console.log("Notification permission error:", error);
      return false;
    }
  };
  const loadProfileData = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`);
      const json = await res.json();
      console.log("Profile Data:", json);
      if (json.success) {
        const data = json.data;
        setName(data.full_name || "");
        setLocation(data.location || "");
        setLocationEdited(false);
        setLatitude(
          data.latitude !== null && data.latitude !== undefined
            ? String(data.latitude)
            : data.lat !== null && data.lat !== undefined
              ? String(data.lat)
              : "",
        );
        setLongitude(
          data.longitude !== null && data.longitude !== undefined
            ? String(data.longitude)
            : data.long !== null && data.long !== undefined
              ? String(data.long)
              : data.lon !== null && data.lon !== undefined
                ? String(data.lon)
                : "",
        );
        setGender(data.gender || "");
        setMobile(data.mobile || "");
        setDateOfBirth(data.date_of_birth || "");
        if (data.time_of_birth) {
          setTimeOfBirth(data.time_of_birth);
          setUnknownTime(false);
        } else {
          setUnknownTime(true);
        }
        setGender(data.gender || "");
      }
    } catch (err) {
      console.log("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchPolicy = async (type: string) => {
    try {
      setLoadingPolicy(true);
      setPolicyContent("");

      const response = await fetch(`${API_URL}/${type}`);
      const result = await response.json();

      if (result.success) {
        setPolicyContent(result.content); // HTML or plain text
      } else {
        setPolicyContent("Unable to load content.");
      }
    } catch (err) {
      setPolicyContent("Something went wrong.");
    } finally {
      setLoadingPolicy(false);
    }
  };

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem("user-language");
      if (savedLang) {
        setLanguage(savedLang);
      }
    } catch (e) {
      console.log("Error loading language:", e);
    }
  };

  const validateMobile = () => {
    const newErrors: any = {};
    if (!mobile || mobile.length !== 10) {
      newErrors.mobile = t.invalidMobile;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOTP = () => {
    const newErrors: any = {};
    if (!otp || otp.length !== 6) {
      newErrors.otp = t.invalidOTP;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = t.requiredField;
    if (!location.trim()) {
      newErrors.location = location.trim()
        ? t.selectLocation
        : t.requiredField;
    } else if ((!isEdit || locationEdited) && (!latitude || !longitude)) {
      newErrors.location = t.selectLocation;
    }
    if (!dateOfBirth) newErrors.dateOfBirth = t.requiredField;
    if (!unknownTime && !timeOfBirth) newErrors.timeOfBirth = t.requiredField;
    setErrors(newErrors);
    if (!acceptedTerms) {
      Alert.alert(
        "Terms & Conditions",
        "You must accept the Terms & Conditions and Privacy Policy to proceed.",
      );
      return false;
    }
    return Object.keys(newErrors).length === 0;
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  };

  const handleDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) {
      setSelectedDate(selected);
      setDateOfBirth(formatDate(selected));
      setErrors({ ...errors, dateOfBirth: null });
    }
  };

  const handleTimeChange = (event: any, selected?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selected) {
      setSelectedTime(selected);
      setTimeOfBirth(formatTime(selected));
      setErrors({ ...errors, timeOfBirth: null });
    }
  };

  const handleSendOTP = async () => {
    // 1. Validate mobile first
    if (!validateMobile()) {
      return;
    }
    const allowed = await setup();

    // ❌ Permission not granted → STOP
    if (!allowed) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();
      console.log("OTP Send Response:", data);
      if (!data.status) {
        //   Alert.alert("Error", data.message);
        setErrors({ ...errors, mobile: t.invalidMobile });
        return false;
      }
      setStep("otp");
    } catch (error) {
      // Alert.alert("Error", "Something went wrong");
      setErrors({ ...errors, mobile: t.invalidMobile });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile, otp, token: fcmToken }),
      });

      const data = await res.json();
      console.log("OTP Verify Response:", data);
      if (!data.status) {
        // Alert.alert("Invalid OTP", data.message);
        setErrors({ ...errors, otp: t.invalidOTP });
        return;
      }

      // ✅ ROUTING LOGIC
      if (data.data.profile_complete) {
        router.replace("/(tabs)");
        await AsyncStorage.setItem("user_id", data.data.user_id.toString());
        await AsyncStorage.setItem("fcmToken", fcmToken);
        AppEventsLogger.logEvent("user_registered", { mobile: mobile });
      } else {
        setStep("signup");
      }
    } catch (error) {
      //Alert.alert("Error", "Verification failed");
      setErrors({ ...errors, otp: t.invalidOTP });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) return;

    try {
      setLoading(true);

      const payload = {
        mobile,
        full_name: name,
        location,
        latitude,
        longitude,
        lat: latitude,
        long: longitude,
        date_of_birth: dateOfBirth,
        time_of_birth: unknownTime ? null : timeOfBirth,
        gender,
        acceptedTerms,
      };
      console.log("Signup Payload:", payload);
      const response = await fetch(`${API_URL}/complete-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.status) {
        Alert.alert("Error", result.message);
        setLoading(false);
        return;
      }

      // ✅ Store ONLY user_id
      await AsyncStorage.setItem("user_id", result.data.user_id.toString());

      // 🎉 Show success modal
      setShowSuccessModal(true);

      // ⏳ Redirect after 1 sec
      setTimeout(() => {
        setShowSuccessModal(false);
        if (isEdit) {
          router.replace("/profile"); // or '/(tabs)/profile' if profile is a tab
        } else {
          router.replace("/(tabs)");
        }
      }, 2000);
    } catch (err) {
      console.error("Signup error:", err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  const renderMobileStep = () => (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <Feather name="smartphone" size={48} color="#4B7BEC" />
      </View>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.skipTitle}>Skip</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{t.welcome}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.mobileNumber}</Text>
        <View style={[styles.inputWrapper, errors.mobile && styles.inputError]}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder={t.enterMobile}
            value={mobile}
            onChangeText={(text) => {
              setMobile(text.replace(/[^0-9]/g, ""));
              setErrors({});
            }}
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor={"#94A3B8"}
          />
        </View>
        {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSendOTP}>
        <Text style={styles.primaryButtonText}>{t.sendOTP}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.textButton}
        onPress={() => setStep("signup")}
      >
        <Text style={styles.textButtonText}>{t.newUser}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <Feather name="lock" size={48} color="#4B7BEC" />
      </View>

      <Text style={styles.title}>{t.verifyOTP}</Text>
      <Text style={styles.subtitle}>OTP sent to +91 {mobile}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t.enterOTP}</Text>
        <View style={[styles.inputWrapper, errors.otp && styles.inputError]}>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/[^0-9]/g, ""));
              setErrors({});
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor={"#94A3B8"}
          />
        </View>
        {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOTP}>
        <Text style={styles.primaryButtonText}>{t.verify}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.textButton} onPress={handleSendOTP}>
        <Text style={styles.textButtonText}>{t.resendOTP}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.textButton}
        onPress={() => setStep("mobile")}
      >
        <Feather name="arrow-left" size={16} color="#4B7BEC" />
        <Text style={styles.textButtonText}>{t.changeNumber}</Text>
      </TouchableOpacity>
    </View>
  );

  {
    loading && (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255,255,255,0.6)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999,
        }}
      >
        <ActivityIndicator size="large" color="#4B7BEC" />
      </View>
    );
  }
  const renderSignupStep = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.formContainer}>
        <View style={styles.iconContainer}>
          <Feather name="user-plus" size={48} color="#4B7BEC" />
        </View>

        <Text style={styles.title}>
          {isEdit ? "Edit Profile" : "Create Account"}
        </Text>
        <Text style={styles.subtitle}>
          {isEdit ? t.editProfile : t.completeProfile}
        </Text>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.fullName} *</Text>
          <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
            <Feather name="user" size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder={t.enterName}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors({ ...errors, name: null });
              }}
              placeholderTextColor={"#94A3B8"}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Gender */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender *</Text>

          <View style={styles.genderContainer}>
            {["Male", "Female", "Other"].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.genderOption,
                  gender === item && styles.genderOptionActive,
                  errors.gender && styles.inputError,
                ]}
                onPress={() => {
                  setGender(item);
                  setErrors({ ...errors, gender: null });
                }}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === item && styles.genderTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {errors.gender && (
            <Text style={styles.errorText}>{errors.gender}</Text>
          )}
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.location} *</Text>
          <View
            style={[styles.inputWrapper, errors.location && styles.inputError]}
          >
            <Feather name="map-pin" size={20} color="#94A3B8" />
            <TextInput
              style={styles.input}
              placeholder={t.enterLocation}
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                setLocationEdited(true);
                setLatitude("");
                setLongitude("");
                setLocationSuggestions([]);
                setErrors({ ...errors, location: null });
              }}
              placeholderTextColor={"#94A3B8"}
            />
          </View>
          {locationSuggestions.length > 0 && (
            <View style={styles.locationDropdown}>
              {locationSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`${suggestion.display_name || suggestion.label}-${index}`}
                  style={styles.locationOption}
                  onPress={() => {
                    setLocation(
                      suggestion.label || suggestion.display_name || "",
                    );
                    setLocationEdited(true);
                    setLatitude(String(suggestion.lat));
                    setLongitude(String(suggestion.lon));
                    setLocationSuggestions([]);
                    setErrors({ ...errors, location: null });
                  }}
                >
                  <Text style={styles.locationOptionText} numberOfLines={2}>
                    {suggestion.display_name || suggestion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {location.trim().length >= 2 &&
            !latitude &&
            !longitude &&
            (!isEdit || locationEdited) && (
            <Text style={styles.locationHint}>{t.selectLocation}</Text>
          )}
          {errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
        </View>

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.dateOfBirth} *</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              errors.dateOfBirth && styles.inputError,
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={20} color="#94A3B8" />
            <Text
              style={[styles.input, !dateOfBirth && styles.placeholderText]}
            >
              {dateOfBirth || t.selectDate}
            </Text>
          </TouchableOpacity>
          {errors.dateOfBirth && (
            <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Time of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t.timeOfBirth}</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              errors.timeOfBirth && styles.inputError,
              unknownTime && styles.inputDisabled,
            ]}
            onPress={() => {
              if (!unknownTime) {
                setShowTimePicker(true);
              }
            }}
            disabled={unknownTime}
          >
            <Feather
              name="clock"
              size={20}
              color={unknownTime ? "#CBD5E1" : "#94A3B8"}
            />
            <Text
              style={[
                styles.input,
                !timeOfBirth && styles.placeholderText,
                unknownTime && styles.disabledText,
              ]}
            >
              {timeOfBirth || t.selectTime}
            </Text>
          </TouchableOpacity>
          {errors.timeOfBirth && (
            <Text style={styles.errorText}>{errors.timeOfBirth}</Text>
          )}

          {showTimePicker && !unknownTime && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
            />
          )}

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              setUnknownTime(!unknownTime);
              if (!unknownTime) {
                setTimeOfBirth("");
                setErrors({ ...errors, timeOfBirth: null });
              }
            }}
          >
            <View
              style={[styles.checkbox, unknownTime && styles.checkboxChecked]}
            >
              {unknownTime && <Feather name="check" size={16} color="#FFF" />}
            </View>
            <Text style={styles.checkboxLabel}>{t.dontKnowTime}</Text>
          </TouchableOpacity>
        </View>

        {/* Terms & Privacy */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View
              style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
            >
              {acceptedTerms && <Feather name="check" size={14} color="#FFF" />}
            </View>

            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                style={styles.linkText}
                onPress={() => {
                  setPolicyType("terms");
                  setShowPolicyModal(true);
                  fetchPolicy("terms");
                }}
              >
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text
                style={styles.linkText}
                onPress={() => {
                  setPolicyType("privacy");
                  setShowPolicyModal(true);
                  fetchPolicy("privacy");
                }}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showPolicyModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {policyType === "terms"
                    ? "Terms & Conditions"
                    : "Privacy Policy"}
                </Text>

                <TouchableOpacity onPress={() => setShowPolicyModal(false)}>
                  <Feather name="x" size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {loadingPolicy ? (
                  <Text style={styles.loadingText}>Loading...</Text>
                ) : (
                  <Text style={styles.policyText}>{policyContent}</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
          <Text style={styles.primaryButtonText}>
            {isEdit ? t.saveChanges : t.signup}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={() => setStep("mobile")}
        >
          <Text style={styles.textButtonText}>{t.alreadyHaveAccount}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4B7BEC" />
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.successIcon}>
              <Feather name="check" size={36} color="#FFF" />
            </View>

            <Text style={styles.modalTitle}>
              {isEdit ? t.profileUpdatedTitle : t.profileCompletedTitle}
            </Text>
            <Text style={styles.modalText}>
              {isEdit ? t.profileUpdated : t.profileCompleted}
            </Text>

            <Text style={styles.modalTitle}>Redirecting...</Text>

            <ActivityIndicator
              size="small"
              color="#4B7BEC"
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <LinearGradient colors={["#4B7BEC", "#667eea"]} style={styles.header} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        {step === "mobile" && renderMobileStep()}
        {step === "otp" && renderOTPStep()}
        {step === "signup" && renderSignupStep()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 200,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  content: {
    flex: 1,
    marginTop: -120,
  },
  formContainer: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  locationDropdown: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  locationOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  locationOptionText: {
    fontSize: 14,
    color: "#334155",
  },
  locationHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },
  inputDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.6,
  },
  prefix: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    padding: 0,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
  },
  placeholderText: {
    color: "#94A3B8",
  },
  disabledText: {
    color: "#CBD5E1",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4B7BEC",
    borderColor: "#4B7BEC",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  primaryButton: {
    backgroundColor: "#4B7BEC",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B7BEC",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },

  modalText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  genderOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8F9FA",
    alignItems: "center",
  },

  genderOptionActive: {
    backgroundColor: "#4B7BEC",
    borderColor: "#4B7BEC",
  },

  genderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },

  genderTextActive: {
    color: "#FFF",
  },
  termsContainer: {
    marginTop: 16,
  },

  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    marginLeft: 8,
  },

  linkText: {
    color: "#4B7BEC",
    fontWeight: "600",
  },

  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    maxHeight: "80%",
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  policyText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },

  loadingText: {
    textAlign: "center",
    marginTop: 20,
    color: "#64748B",
  },
  skipButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  skipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B7BEC",
  },
});
