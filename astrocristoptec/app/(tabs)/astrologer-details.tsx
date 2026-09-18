import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
    KeyboardAvoidingView,
    Platform,

} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { SafeAreaView } from "react-native-safe-area-context";
import { socket } from "../../components/soketOnOff";
import {
  API_BASE_URL as API_ORIGIN,
  CLIENT_API_BASE_URL,
  CLIENT_AUTH_API_BASE_URL,
} from "../../lib/api";
import ForceUpdateChecker from "../components/updateChecker";
import InsufficientBalanceModal from "../components/InsufficientBalanceModal";
const API_BASE_URL = CLIENT_API_BASE_URL;
const PHOTO_API_URL = `${API_ORIGIN}/api/astrologer/photos`;

/* 🌍 TRANSLATIONS */
const translations = {
  en: {
    fresher: "Fresher",
    year: "Year",
    years: "Years",
    experience: "of Experience",
    giveFeedback: "Give Feedback",
    specialty: "Specialty",
    specializations: "Specializations",
    languages: "Languages",
    rateExperience: "Rate Your Experience",
    writeFeedback: "Write your feedback here within 500 letters...",
    submitFeedback: "Submit Feedback",
    notFound: "Astrologer not found",
    loginRequired: "Login Required",
    pleaseLogin: "Please login to provide feedback",
    cancel: "Cancel",
    login: "Login",
    error: "Error",
    selectRating: "Please select a rating",
    commentTooLong: "Comment cannot exceed 500 characters",
    success: "Success",
    thankYou: "Thank you for your feedback!",
    failedSubmit: "Failed to submit feedback",
    perMin: "/ min",
    sendingRequest: "Sending request...",
    audioNotAvailable: "Astrologer is currently not available for audio call",
    chatNotAvailable: "Astrologer is currently not available for chat",
    videoNotAvailable: "Astrologer is currently not available for video call",
    busyDescAudio:
      "Astrologer is busy right now. Do you want to request an audio call?",
    busyDescVideo:
      "Astrologer is busy right now. Do you want to request a video call?",
    busyDescChat:
      "Astrologer is busy right now. Do you want to start a chat request?",
    pendingRequestTitle: "Request Pending",
    pendingRequestDesc:
      "You have a pending request. Please wait some time to meet our astrologer. If the astrologer does not accept your request within 30 minutes, you can make another request.",
    requestSuccessTitle: "Request Sent",
    requestSuccessDesc:
      "Your request has been successfully sent to the astrologer. Please wait for them to accept.",
    astrologerOffline: "Astrologer is offline",
    astrologerBusy: "Astrologer is busy",
    ok: "OK",
    pendingRequestWarning:
      "Do not share any contact information like phone number or postal address.",
    confirmRequestTitle: "Confirm Request",
    confirmRequestDesc: "Please verify your birth details before sending the request.",
    fullName: "Full Name",
    dateOfBirth: "Date of Birth",
    timeOfBirth: "Time of Birth",
    unknownBirthTime: "I don't know my birth time",
    birthLocation: "Birth Location",
    searchLocation: "Search location or Pincode",
    selectLocation: "Select a location from suggestions",
    sendRequest: "Send Request",
    locationLoading: "Looking up locations...",
    requestProfileError: "Please complete all birth details and select a location.",
    updateProfile: "Update Profile",
  },
  hi: {
    fresher: "नया",
    year: "साल",
    years: "साल",
    experience: "का अनुभव",
    giveFeedback: "फीडबैक दें",
    specialty: "विशेषता",
    specializations: "विशेषज्ञता",
    languages: "भाषाएँ",
    rateExperience: "अपने अनुभव को रेट करें",
    writeFeedback: "500 अक्षरों के भीतर अपनी प्रतिक्रिया लिखें...",
    submitFeedback: "फीडबैक सबमिट करें",
    notFound: "ज्योतिषी नहीं मिला",
    loginRequired: "लॉगिन आवश्यक",
    pleaseLogin: "फीडबैक देने के लिए कृपया लॉगिन करें",
    cancel: "रद्द करें",
    login: "लॉगिन",
    error: "त्रुटि",
    selectRating: "कृपया एक रेटिंग चुनें",
    commentTooLong: "टिप्पणी 500 अक्षरों से अधिक नहीं हो सकती",
    success: "सफलता",
    thankYou: "आपकी प्रतिक्रिया के लिए धन्यवाद!",
    failedSubmit: "फीडबैक सबमिट करने में विफल",
    perMin: "/ मिनट",
    sendingRequest: "अनुरोध भेजा जा रहा है...",
    audioNotAvailable: "ज्योतिषी इस समय ऑडियो कॉल के लिए उपलब्ध नहीं है",
    chatNotAvailable: "ज्योतिषी इस समय चैट के लिए उपलब्ध नहीं है",
    videoNotAvailable: "ज्योतिषी इस समय वीडियो कॉल के लिए उपलब्ध नहीं है",
    busyDescAudio:
      "ज्योतिषी इस समय व्यस्त हैं। क्या आप ऑडियो कॉल के लिए अनुरोध करना चाहते हैं?",
    busyDescVideo:
      "ज्योतिषी इस समय व्यस्त हैं। क्या आप वीडियो कॉल के लिए अनुरोध करना चाहते हैं?",
    busyDescChat:
      "ज्योतिषी इस समय व्यस्त हैं। क्या आप चैट शुरू करने के लिए अनुरोध करना चाहते हैं?",
    pendingRequestTitle: "अनुरोध लंबित",
    pendingRequestDesc:
      "आपका एक अनुरोध लंबित है। कृपया हमारे ज्योतिषी से मिलने के लिए कुछ समय प्रतीक्षा करें। यदि ज्योतिषी 30 मिनट के भीतर आपका अनुरोध स्वीकार नहीं करते हैं, तो आप एक और अनुरोध कर सकते हैं।",
    requestSuccessTitle: "अनुरोध भेजा गया",
    requestSuccessDesc:
      "आपका अनुरोध सफलतापूर्वक ज्योतिषी को भेज दिया गया है। कृपया उनके स्वीकार करने की प्रतीक्षा करें।",
    astrologerOffline: "ज्योतिषी ऑफलाइन है",
    astrologerBusy: "ज्योतिषी व्यस्त है",
    ok: "ठीक है",
    pendingRequestWarning:
      "फोन नंबर या पता जैसी कोई भी संपर्क जानकारी साझा न करें।",
  },
  bn: {
    fresher: "নতুন",
    year: "বছর",
    years: "বছর",
    experience: "এর অভিজ্ঞতা",
    giveFeedback: "মতামত দিন",
    specialty: "বিশেষত্ব",
    specializations: "বিশেষজ্ঞতা",
    languages: "ভাষা",
    rateExperience: "আপনার অভিজ্ঞতা রেট করুন",
    writeFeedback: "৫০০ অক্ষরের মধ্যে আপনার মতামত লিখুন...",
    submitFeedback: "মতামত জমা দিন",
    notFound: "জ্যোতিষী পাওয়া যায়নি",
    loginRequired: "লগইন প্রয়োজন",
    pleaseLogin: "মতামত দেওয়ার জন্য লগইন করুন",
    cancel: "বাতিল",
    login: "লগইন",
    error: "ত্রুটি",
    selectRating: "একটি রেটিং নির্বাচন করুন",
    commentTooLong: "মন্তব্য ৫০০ অক্ষরের বেশি হতে পারে না",
    success: "সফল",
    thankYou: "আপনার মতামতের জন্য ধন্যবাদ!",
    failedSubmit: "মতামত জমা দিতে ব্যর্থ",
    perMin: "/ মিনিট",
    sendingRequest: "অনুরোধ পাঠানো হচ্ছে...",
    audioNotAvailable: "জ্যোতিষী বর্তমানে অডিও কলের জন্য উপলব্ধ নন",
    chatNotAvailable: "জ্যোতিষী বর্তমানে চ্যাটের জন্য উপলব্ধ নন",
    videoNotAvailable: "জ্যোতিষী বর্তমানে ভিডিও কলের জন্য উপলব্ধ নন",
    busyDescAudio:
      "জ্যোতিষী এই মুহূর্তে ব্যস্ত আছেন। আপনি কি অডিও কলের জন্য অনুরোধ করতে চান?",
    busyDescVideo:
      "জ্যোতিষী এই মুহূর্তে ব্যস্ত আছেন। আপনি কি ভিডিও কলের জন্য অনুরোধ করতে চান?",
    busyDescChat:
      "জ্যোতিষী এই মুহূর্তে ব্যস্ত আছেন। আপনি কি চ্যাট শুরু করার জন্য অনুরোধ করতে চান?",
    pendingRequestTitle: "অনুরোধ মুলতুবি",
    pendingRequestDesc:
      "আপনার একটি অনুরোধ মুলতুবি আছে। আমাদের জ্যোতিষীর সাথে দেখা করতে কিছুক্ষণ অপেক্ষা করুন। যদি জ্যোতিষী 30 মিনিটের মধ্যে আপনার অনুরোধ গ্রহণ না করেন, তবে আপনি আরেকটি অনুরোধ করতে পারেন।",
    requestSuccessTitle: "অনুরোধ পাঠানো হয়েছে",
    requestSuccessDesc:
      "আপনার অনুরোধ সফলভাবে জ্যোতিষীর কাছে পাঠানো হয়েছে। দয়া করে তাদের গ্রহণ করার জন্য অপেক্ষা করুন।",
    astrologerOffline: "জ্যোতিষী অফলাইন",
    astrologerBusy: "জ্যোতিষী ব্যস্ত",
    ok: "ঠিক আছে",
    pendingRequestWarning:
      "ফোন নম্বর বা ঠিকানার মতো কোনো যোগাযোগের তথ্য শেয়ার করবেন না।",
  },
};

/* 🔹 Types */
type StatusType = "online" | "offline" | "busy";
type LanguageCode = "en" | "hi" | "bn";
type CallType = "audio" | "chat" | "video";

interface Astrologer {
  id: string;
  displayName: string;
  image: string;
  experience: string;
  rating: number;
  rank_display?: number;
  languages: string[];
  specializations: string[];
  specialty: string[];
  bio: string;
  status: StatusType;
  isAudioAvailable: boolean;
  isVideoAvailable: boolean;
  isChatAvailable: boolean;
  callRate: number;
  videoRate: number;
  chatRate: number;
  audioPlatformFee: number;
  videoPlatformFee: number;
  chatPlatformFee: number;
  founding?: number; // Optional founding field
  comments: {
    name: string;
    comment: string;
    createdAt: string;
    reply?: string;
  }[];
}

type AstrologerPhoto = {
  id: number | string;
  astrologer_id: string;
  image_path: string;
  image_url: string;
  original_name?: string;
  file_size?: number;
  created_at?: string;
};

type RequestLocationSuggestion = {
  label?: string;
  display_name?: string;
  lat: string;
  lon: string;
};

type RequestDraft = {
  fullName: string;
  dateOfBirth: Date | null;
  timeOfBirth: Date | null;
  location: string;
  latitude: string;
  longitude: string;
};

const emptyRequestDraft = (): RequestDraft => ({
  fullName: "",
  dateOfBirth: null,
  timeOfBirth: null,
  location: "",
  latitude: "",
  longitude: "",
});

const parseBirthDate = (value?: string | null) => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const parts = value.split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [first, second, third] = parts;
  const year = first > 31 ? first : third;
  const day = first > 31 ? third : first;
  const date = new Date(year, second - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseBirthTime = (value?: string | null) => {
  if (!value) return null;

  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const meridiem = ampmMatch[3].toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    return time;
  }

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const time = new Date();
    time.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return time;
  }

  const parsed = new Date(`1970-01-01T${value}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatBirthDate = (date: Date | null) =>
  date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

const formatBirthTime = (date: Date | null) =>
  date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const formatDateForApi = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

const formatTimeForApi = (date: Date | null) =>
  date
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`
    : "";

/* 🔹 Helper to parse stringified arrays */
const parseArrayField = (field: any): string[] => {
  if (Array.isArray(field)) {
    return field
      .map((item) => {
        if (typeof item !== "string") return "";
        let cleaned = item.trim();
        cleaned = cleaned.replace(/^\["|"\]$/g, "");
        cleaned = cleaned.replace(/\\"/g, '"');
        cleaned = cleaned.replace(/^"|"$/g, "");
        return cleaned;
      })
      .filter((item) => item !== "");
  }

  if (typeof field === "string") {
    let cleaned = field.trim();
    cleaned = cleaned.replace(/\\/g, "");

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => typeof item === "string" && item.trim() !== "",
        );
      }
    } catch (e) {
      if (cleaned.includes(",")) {
        return cleaned
          .replace(/[\[\]"']/g, "")
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "");
      }
    }
  }

  return [];
};

export default function AstrologerDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
  const [astrologerPhotos, setAstrologerPhotos] = useState<AstrologerPhoto[]>(
    [],
  );
  const [photosLoading, setPhotosLoading] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [coins, setCoins] = useState(0);

  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Call request states
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<CallType | null>(null);
  const [pendingAstrologerName, setPendingAstrologerName] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [requestDraft, setRequestDraft] = useState<RequestDraft>(emptyRequestDraft());
  const [requestProfileLoading, setRequestProfileLoading] = useState(false);
  const [requestProfileError, setRequestProfileError] = useState("");
  const [requestLocationSuggestions, setRequestLocationSuggestions] = useState<RequestLocationSuggestion[]>([]);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);
  const [showRequestTimePicker, setShowRequestTimePicker] = useState(false);
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);
  const [updateProfile, setUpdateProfile] = useState(false);
  const locationSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current translations
  const t = { ...translations.en, ...translations[language] };

  /* 🌍 Load language preference */
  useFocusEffect(
    useCallback(() => {
      const loadLanguage = async () => {
        try {
          const savedLang = await AsyncStorage.getItem("user-language");
          if (savedLang && ["en", "hi", "bn"].includes(savedLang)) {
            setLanguage(savedLang as LanguageCode);
          }
        } catch (error) {
          console.log("Error loading language:", error);
        }
      };
      loadLanguage();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.replace("/(tabs)");
          return true;
        },
      );
      return () => subscription.remove();
    }, []),
  );

  /* 🔄 Load astrologer on focus */
  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadAstrologer();
        loadAstrologerPhotos();
      }
    }, [id]),
  );

  const loadAstrologerPhotos = async () => {
    try {
      setPhotosLoading(true);
      const res = await fetch(
        `${PHOTO_API_URL}/astrologer/${encodeURIComponent(String(id))}`,
      );
      const json = await res.json();
      console.log("Astrologer photos response:", json);
      if (res.ok && json.success && Array.isArray(json.data)) {
        setAstrologerPhotos(
          json.data.filter((photo: AstrologerPhoto) =>
            Boolean(photo.image_url),
          ),
        );
      } else {
        setAstrologerPhotos([]);
      }
    } catch (err) {
      console.log("Fetch astrologer photos error:", err);
      setAstrologerPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  const loadAstrologer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/astrologers/${id}`);
      const json = await res.json();

      if (json.success) {
        const data = json.data;
        const parsedData = {
          ...data,
          languages: parseArrayField(data.languages),
          specializations: parseArrayField(data.specializations),
          specialty: parseArrayField(data.specialty),
        };
        setAstrologer(parsedData);
      }
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  /* 📡 Socket live updates */
  useEffect(() => {
    const handler = (payload: {
      astrologer_id: string;
      status: StatusType;
      audio: boolean;
      video: boolean;
      chat: boolean;
    }) => {
      setAstrologer((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(payload.astrologer_id)) return prev;

        return {
          ...prev,
          status: payload.status,
          isAudioAvailable: payload.audio,
          isVideoAvailable: payload.video,
          isChatAvailable: payload.chat,
        };
      });
    };

    socket.on("astrologer-status-update", handler);
    return () => {
      socket.off("astrologer-status-update", handler);
    };
  }, []);

  /* 📝 Handle Feedback Button Click */
  const handleFeedbackClick = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        Alert.alert(t.loginRequired, t.pleaseLogin, [
          { text: t.cancel, style: "cancel" },
          {
            text: t.login,
            onPress: () => router.push("/login"),
          },
        ]);
        return;
      }

      loadInitialRating();
      setFeedbackModal(true);
    } catch (error) {
      console.log("Error checking auth:", error);
    }
  };

  /* 📤 Submit Feedback */
  const submitFeedback = async () => {
    if (rating === 0) {
      Alert.alert(t.error, t.selectRating);
      return;
    }

    const sanitizedComment = comment?.replace(/\s+/g, " ").trim();

    if (sanitizedComment && sanitizedComment.length > 500) {
      Alert.alert(t.error, t.commentTooLong);
      return;
    }

    try {
      setSubmitting(true);
      const userId = await AsyncStorage.getItem("user_id");

      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          astrologerId: id,
          userId: userId,
          rating,
          comment: sanitizedComment || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(t.success, t.thankYou);
        setFeedbackModal(false);
        setRating(0);
        setComment("");
        await loadAstrologer();
      } else {
        Alert.alert(t.error, result.message || t.failedSubmit);
      }
    } catch (error) {
      console.log("Feedback error:", error);
      Alert.alert(t.error, t.failedSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  const loadInitialRating = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) return;

      const res = await fetch(
        `${API_BASE_URL}/feedback/rating?astrologerId=${id}&userId=${userId}`,
      );
      const json = await res.json();

      if (json.success) {
        setRating(json.rating || 0);
      }
    } catch (err) {
      console.log("Rating fetch error:", err);
    }
  };

  useEffect(() => {
    if (!showAudioModal || requestDraft.latitude || requestDraft.longitude) {
      setRequestLocationSuggestions([]);
      return;
    }

    const query = requestDraft.location.trim();
    if (query.length < 2) {
      setRequestLocationSuggestions([]);
      return;
    }

    if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    locationSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/location/search?q=${encodeURIComponent(query)}&limit=5&language=${language}`,
        );
        const json = await res.json();
        setRequestLocationSuggestions(json?.data || []);
      } catch (error) {
        console.log("Location search error:", error);
        setRequestLocationSuggestions([]);
      }
    }, 450);

    return () => {
      if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    };
  }, [language, requestDraft.latitude, requestDraft.longitude, requestDraft.location, showAudioModal]);

  const loadRequestDraft = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      router.push("/login");
      return emptyRequestDraft();
    }

    const res = await fetch(`${CLIENT_AUTH_API_BASE_URL}/users/${userId}/birth-profile`);
    const json = await res.json();
    const user = json?.data ?? json;
    return {
      fullName: user?.full_name || "",
      dateOfBirth: parseBirthDate(user?.date_of_birth),
      timeOfBirth: parseBirthTime(user?.time_of_birth),
      location: user?.location || "",
      latitude: user?.latitude == null ? "" : String(user.latitude),
      longitude: user?.longitude == null ? "" : String(user.longitude),
    };
  };

  const openRequestDetailsModal = async (nextCallType: CallType) => {
    setCallType(nextCallType);
    setUnknownBirthTime(false);
    setUpdateProfile(false);
    setRequestProfileError("");
    setRequestLocationSuggestions([]);
    setRequestProfileLoading(true);
    setShowAudioModal(true);
    try {
      setRequestDraft(await loadRequestDraft());
    } catch (error) {
      console.log("Request profile load error:", error);
      setRequestDraft(emptyRequestDraft());
      setRequestProfileError(t.requestProfileError);
    } finally {
      setRequestProfileLoading(false);
    }
  };

  const closeRequestDetailsModal = () => {
    setShowAudioModal(false);
    setRequestLocationSuggestions([]);
    setShowRequestDatePicker(false);
    setShowRequestTimePicker(false);
  };

  const sendRequestWithBirthDetails = async () => {
    if (!astrologer || !callType) return;
    const { fullName, dateOfBirth, timeOfBirth, location, latitude, longitude } = requestDraft;
    if (!fullName.trim() || !dateOfBirth || (!timeOfBirth && !unknownBirthTime) || !location.trim() || !latitude || !longitude) {
      setRequestProfileError(t.requestProfileError);
      return;
    }

    try {
      setSendingRequest(true);
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      const endpoint = callType === "audio" ? "requestAudio" : callType === "chat" ? "requestChat" : "requestVideo";
      const res = await fetch(`${API_BASE_URL}/call/${endpoint}/v1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologerId: astrologer.id,
          userId,
          full_name: fullName.trim(),
          date_of_birth: formatDateForApi(dateOfBirth),
          time_of_birth: formatTimeForApi(timeOfBirth),
          location: location.trim(),
          latitude,
          longitude,
          lat: latitude,
          long: longitude,
          callType,
          update_profile: updateProfile,
        }),
      });
      const json = await res.json();
      if (json.code === "INSUFFICIENT_BALANCE") {
        setRequiredAmount(json.requiredAmount || 0);
        setCoins(json.currentBalance || 0);
        setShowBalanceModal(true);
      } else if (json.code === "PREVIOUS_REQUEST_PENDING") {
        setPendingAstrologerName(json.astrologerName || "Astrologer");
        setPendingCallType(callType);
        setShowPendingModal(true);
      } else if (json.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Request error:", error);
      Alert.alert(t.error, "Something went wrong");
    } finally {
      setSendingRequest(false);
      closeRequestDetailsModal();
    }
  };

  /* API Call Functions */
  const sendAudioCallRequest = async (astrologerId: string) => {
    try {
      setSendingRequest(true);
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/call/requestAudio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astrologerId, userId }),
      });

      const json = await res.json();

      if (json.code === "INSUFFICIENT_BALANCE") {
        setRequiredAmount(json.requiredAmount || 0);
        setCoins(json.currentBalance || 0);
        setShowBalanceModal(true);
        return;
      }

      if (json.code === "PREVIOUS_REQUEST_PENDING") {
        setPendingAstrologerName(json.astrologerName || "Astrologer");
        setPendingCallType("audio");
        setShowPendingModal(true);
        return;
      }

      if (json.success) {
        setShowSuccessModal(true);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t.error, "Something went wrong");
    } finally {
      setSendingRequest(false);
      setShowAudioModal(false);
    }
  };

  const sendVideoCallRequest = async (astrologerId: string) => {
    try {
      setSendingRequest(true);
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/call/requestVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astrologerId, userId }),
      });

      const json = await res.json();

      if (json.code === "INSUFFICIENT_BALANCE") {
        setRequiredAmount(json.requiredAmount || 0);
        setCoins(json.currentBalance || 0);
        setShowBalanceModal(true);
        return;
      }

      if (json.code === "PREVIOUS_REQUEST_PENDING") {
        setPendingAstrologerName(json.astrologerName || "Astrologer");
        setPendingCallType("video");
        setShowPendingModal(true);
        return;
      }

      if (json.success) {
        setShowSuccessModal(true);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t.error, "Something went wrong");
    } finally {
      setSendingRequest(false);
      setShowAudioModal(false);
    }
  };

  const sendChatRequest = async (astrologerId: string) => {
    try {
      setSendingRequest(true);
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/call/requestChat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astrologerId, userId }),
      });

      const json = await res.json();

      if (json.code === "INSUFFICIENT_BALANCE") {
        setRequiredAmount(json.requiredAmount || 0);
        setCoins(json.currentBalance || 0);
        setShowBalanceModal(true);
        return;
      }

      if (json.code === "PREVIOUS_REQUEST_PENDING") {
        setPendingAstrologerName(json.astrologerName || "Astrologer");
        setPendingCallType("chat");
        setShowPendingModal(true);
        return;
      }

      if (json.success) {
        setShowSuccessModal(true);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t.error, "Something went wrong");
    } finally {
      setSendingRequest(false);
      setShowAudioModal(false);
    }
  };

  /* Handler Functions */
  const handleAudioPress = async () => {
    if (!astrologer) return;

    if (!astrologer.isAudioAvailable) {
      Alert.alert(t.error, t.audioNotAvailable);
      return;
    }

    if (astrologer.status === "offline") {
      Alert.alert(t.error, t.astrologerOffline);
      return;
    }

    if (astrologer.status === "busy") {
      await openRequestDetailsModal("audio");
      return;
    }

    if (astrologer.status === "online") {
      await openRequestDetailsModal("audio");
    }
  };

  const handleVideoPress = async () => {
    if (!astrologer) return;

    if (!astrologer.isVideoAvailable) {
      Alert.alert(t.error, t.videoNotAvailable);
      return;
    }

    if (astrologer.status === "offline") {
      Alert.alert(t.error, t.astrologerOffline);
      return;
    }

    if (astrologer.status === "busy") {
      await openRequestDetailsModal("video");
      return;
    }

    if (astrologer.status === "online") {
      await openRequestDetailsModal("video");
    }
  };

  const handleChatPress = async () => {
    if (!astrologer) return;

    if (!astrologer.isChatAvailable) {
      Alert.alert(t.error, t.chatNotAvailable);
      return;
    }

    if (astrologer.status === "offline") {
      Alert.alert(t.error, t.astrologerOffline);
      return;
    }

    if (astrologer.status === "busy") {
      await openRequestDetailsModal("chat");
      return;
    }

    if (astrologer.status === "online") {
      await openRequestDetailsModal("chat");
    }
  };

  const getBusyDesc = () => {
    switch (callType) {
      case "audio":
        return t.busyDescAudio;
      case "video":
        return t.busyDescVideo;
      case "chat":
        return t.busyDescChat;
      default:
        return t.busyDescAudio;
    }
  };

  const handleConfirmBusyRequest = () => {
    void sendRequestWithBirthDetails();
  };

  /* ⏳ Loading */
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!astrologer) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>{t.notFound}</Text>
      </SafeAreaView>
    );
  }

  /* 🔐 Button availability logic */
  const canInteract = astrologer.status !== "offline";
  const audioTotal = astrologer.callRate + astrologer.audioPlatformFee;
  const videoTotal = astrologer.videoRate + astrologer.videoPlatformFee;
  const chatTotal = astrologer.chatRate + astrologer.chatPlatformFee;

  /* Experience text helper */
  const getExperienceText = () => {
    const exp = Number(astrologer.experience);
    if (exp === 0) return t.fresher;
    const yearText = exp === 1 ? t.year : t.years;
    return `${exp} ${yearText} ${t.experience}`;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2A0B4F" />
      <ForceUpdateChecker />
      <ScrollView showsVerticalScrollIndicator={false}>
      
        {/* 🔮 PROFILE */}
        <View style={styles.profileWrap}>
          <LinearGradient
            colors={["#2A0B4F", "#4A148C", "#7B2CBF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileGlowOne} />
            <View style={styles.profileGlowTwo} />

            <LinearGradient
              colors={["#FFD700", "#FF9933", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarFrame}
            >
              <Image source={{ uri: astrologer.image }} style={styles.avatar} />
            </LinearGradient>

            <Text style={styles.name}>{astrologer.displayName}</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <Feather name="clock" size={14} color="#FFD700" />
                <Text style={styles.heroStatText}>{getExperienceText()}</Text>
              </View>
       {astrologer.rank_display === 1 && (
        <View style={styles.heroStatCard}>
          <Feather name="star" size={14} color="#FFD700" />
          <Text style={styles.heroStatText}>{astrologer.rating}</Text>
        </View>
       )}
            </View>
{astrologer.founding === 1 && (
  <View style={styles.ribbonContainer} pointerEvents="none">
    <LinearGradient
      colors={["#B8860B", "#FFD700", "#FFF3C4", "#FFD700", "#B8860B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.ribbon}
    >
      <Feather name="award" size={16} color="#4A148C" style={{ marginRight: 4 }} />
<Text style={styles.ribbonText}>
  FOUNDING{"\n"}ASTROLOGER
</Text>
    </LinearGradient>
    <View style={styles.ribbonStitchTop} />
    <View style={styles.ribbonStitchBottom} />
    <View style={styles.ribbonFoldLeft} />
    <View style={styles.ribbonFoldRight} />
  </View>
)}
            {/* STATUS */}
            <View
              style={[
                styles.statusPill,
                astrologer.status === "online" && styles.online,
                astrologer.status === "busy" && styles.busy,
                astrologer.status === "offline" && styles.offline,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  astrologer.status === "online" && styles.dotOnline,
                  astrologer.status === "busy" && styles.dotBusy,
                  astrologer.status === "offline" && styles.dotOffline,
                ]}
              />
              <Text style={styles.statusText}>
                {astrologer.status.toUpperCase()}
              </Text>
            </View>

            {/* FEEDBACK BUTTON */}
            <TouchableOpacity
              style={styles.feedbackBtn}
              onPress={handleFeedbackClick}
            >
              <Feather name="message-square" size={16} color="#4A148C" />
              <Text style={styles.feedbackText}>{t.giveFeedback}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ☎️ ACTIONS */}
        <View style={styles.actions}>
          <ActionButton
            icon="phone"
            label={`₹${audioTotal}${t.perMin}`}
            enabled={canInteract && astrologer.isAudioAvailable}
            colors={["#22C55E", "#15803D"]}
            onPress={handleAudioPress}
          />
          <ActionButton
            icon="video"
            label={`₹${videoTotal}${t.perMin}`}
            enabled={canInteract && astrologer.isVideoAvailable}
            colors={["#6D28D9", "#4A148C"]}
            onPress={handleVideoPress}
          />
          <ActionButton
            icon="message-circle"
            label={`₹${chatTotal}${t.perMin}`}
            enabled={canInteract && astrologer.isChatAvailable}
            colors={["#FFD700", "#FF9933"]}
            onPress={handleChatPress}
          />
        </View>

        {/* 🎯 SPECIALTY */}
        {(photosLoading || astrologerPhotos.length > 0) && (
          <View style={styles.photoSection}>
            <View style={styles.photoSectionHeader}>
              <View>
                <Text style={styles.photoSectionTitle}>Photos</Text>
                <Text style={styles.photoSectionSub}>Astrologer gallery</Text>
              </View>
              <Feather name="image" size={18} color="#B66A00" />
            </View>

            {photosLoading ? (
              <View style={styles.photoLoader}>
                <ActivityIndicator size="small" color="#FF9933" />
                <Text style={styles.photoLoaderText}>Loading photos...</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoList}
              >
                {astrologerPhotos.map((photo, index) => (
                  <TouchableOpacity
                    key={String(photo.id)}
                    style={styles.galleryPhotoCard}
                    onPress={() => {
                      setSelectedIndex(index);
                      setViewerVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: photo.image_url }}
                      style={styles.galleryPhoto}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        {/* 📝 BIO */}
        {astrologer.bio && (
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{astrologer.bio}</Text>
          </View>
        )}
        {astrologer.specialty && astrologer.specialty.length > 0 && (
          <Section title={t.specialty}>
            {astrologer.specialty.map((s, i) => (
              <Chip key={i} label={s} />
            ))}
          </Section>
        )}
        <Modal visible={viewerVisible} transparent animationType="fade">
          <View style={styles.viewerOverlay}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setViewerVisible(false)}
            >
              <Feather name="x" size={26} color="#fff" />
            </TouchableOpacity>

            {/* Image Container with Border */}
            <View style={styles.viewerContainer}>
              <ImageViewer
                imageUrls={astrologerPhotos.map((p) => ({
                  url: p.image_url,
                }))}
                index={selectedIndex}
                enableSwipeDown
                onSwipeDown={() => setViewerVisible(false)}
                backgroundColor="transparent"
                saveToLocalByLongPress={false}
              />
            </View>
          </View>
        </Modal>
        {/* 🧠 SPECIALIZATIONS */}
        {astrologer.specializations &&
          astrologer.specializations.length > 0 && (
            <Section title={t.specializations}>
              {astrologer.specializations.map((s, i) => (
                <Chip key={i} label={s} />
              ))}
            </Section>
          )}

        {/* 🌍 LANGUAGES */}
        {astrologer.languages && astrologer.languages.length > 0 && (
          <Section title={t.languages}>
            {astrologer.languages.map((l, i) => (
              <Chip key={i} label={l} />
            ))}
          </Section>
        )}

      {/* 💬 COMMENTS */}
{astrologer?.comments?.length > 0 && (
  <View style={styles.commentSection}>
    <Text style={styles.commentTitle}>Comments</Text>

    {astrologer.comments.map((item, index) => (
      <View key={index} style={styles.commentCard}>
        {/* User Comment */}
        <Text style={styles.commentName}>{item.name}</Text>

        <Text style={styles.commentText}>
          {item.comment}
        </Text>

        <Text style={styles.commentDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>

        {/* Bhavishya Katha Reply */}
        {item.reply && (
          <View style={styles.replyCard}>
            <Text style={styles.replyTitle}>
              🔮 Bhavishya Katha
            </Text>

            <Text style={styles.replyText}>
              {item.reply}
            </Text>

           
          </View>
        )}
      </View>
    ))}
  </View>
)}
      </ScrollView>

      {/* 🌟 FEEDBACK MODAL */}
      <Modal
        visible={feedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackModal(false)}
      >
         <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
  >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFeedbackModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.rateExperience}</Text>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* STAR RATING */}
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starBtn}
                >
                  <Feather
                    name="star"
                    size={36}
                    color={star <= rating ? "#fbbf24" : "#d1d5db"}
                    fill={star <= rating ? "#fbbf24" : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* COMMENT INPUT */}
            <TextInput
              style={styles.commentInput}
              placeholder={t.writeFeedback}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
              maxLength={500}
            />

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submitFeedback}
              disabled={submitting}
            >
              <LinearGradient
                colors={
                  submitting ? ["#9ca3af", "#6b7280"] : ["#4A148C", "#FF9933"]
                }
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t.submitFeedback}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* 💰 INSUFFICIENT BALANCE MODAL */}
      <InsufficientBalanceModal
        visible={showBalanceModal}
        balance={coins}
        required={requiredAmount}
        lang={language as "en" | "hi" | "bn"}
        onRecharge={() => {
          setShowBalanceModal(false);
          router.push("/wallet");
        }}
        onCancel={() => setShowBalanceModal(false)}
      />

      {/* ✅ SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.audioModalOverlay}>
          <View style={styles.audioModalCard}>
            <Feather name="check-circle" size={36} color="#22C55E" />

            <Text style={styles.audioModalTitle}>{t.requestSuccessTitle}</Text>

            <Text style={styles.audioModalDesc}>
              {t.requestSuccessDesc}

              {"\n\n"}

              <Text
                style={{
                  fontWeight: "800",
                  color: "#991B1B",
                }}
              >
                {t.pendingRequestWarning}
              </Text>
            </Text>
            <View style={styles.audioModalActions}>
              <TouchableOpacity
                style={styles.audioCancelBtn}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.audioCancelText}>{t.ok}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⏳ PENDING REQUEST MODAL */}
      <Modal visible={showPendingModal} transparent animationType="fade">
        <View style={styles.audioModalOverlay}>
          <View style={styles.audioModalCard}>
            <Text style={styles.audioModalTitle}>{t.pendingRequestTitle}</Text>

            <Text style={styles.audioModalDesc}>
              {t.pendingRequestDesc.replace("{name}", pendingAstrologerName)}
            </Text>

            <View style={styles.audioModalActions}>
              <TouchableOpacity
                style={styles.audioCancelBtn}
                onPress={() => setShowPendingModal(false)}
              >
                <Text style={styles.audioCancelText}>{t.ok}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⚠️ BUSY ASTROLOGER MODAL */}
      <Modal
        visible={showAudioModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeRequestDetailsModal}
      >
        <KeyboardAvoidingView
          style={styles.audioModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.audioModalCard, styles.requestModalCard]}>
            <View style={styles.requestModalHeader}>
              <Feather
                name={callType === "audio" ? "phone-call" : callType === "video" ? "video" : "message-circle"}
                size={28}
                color={callType === "audio" ? "#F59E0B" : callType === "video" ? "#4A148C" : "#FF9933"}
              />
              <View style={styles.requestHeading}>
                <Text style={styles.audioModalTitle}>{t.confirmRequestTitle}</Text>
                <Text style={styles.requestSubtitle}>{t.confirmRequestDesc}</Text>
              </View>
            </View>
            {requestProfileLoading ? (
              <View style={styles.requestLoading}>
                <ActivityIndicator color="#4A148C" />
                <Text style={styles.requestLoadingText}>{t.sendingRequest}</Text>
              </View>
            ) : (
              <ScrollView style={styles.requestScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {requestProfileError ? <Text style={styles.requestError}>{requestProfileError}</Text> : null}
                <Text style={styles.requestLabel}>{t.fullName}</Text>
                <TextInput
                  style={styles.requestInput}
                  value={requestDraft.fullName}
                  onChangeText={(fullName) => setRequestDraft((prev) => ({ ...prev, fullName }))}
                  placeholder={t.fullName}
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.requestLabel}>{t.dateOfBirth}</Text>
                <TouchableOpacity style={styles.requestPicker} onPress={() => setShowRequestDatePicker(true)}>
                  <Text style={requestDraft.dateOfBirth ? styles.requestValue : styles.requestPlaceholder}>
                    {formatBirthDate(requestDraft.dateOfBirth) || t.dateOfBirth}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.requestLabel}>{t.timeOfBirth}</Text>
                <TouchableOpacity style={styles.requestPicker} onPress={() => setShowRequestTimePicker(true)}>
                  <Text style={requestDraft.timeOfBirth ? styles.requestValue : styles.requestPlaceholder}>
                    {formatBirthTime(requestDraft.timeOfBirth) || t.timeOfBirth}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.updateProfileRow}
                  onPress={() => {
                    setUnknownBirthTime((prev) => !prev);
                    if (!unknownBirthTime) setRequestDraft((prev) => ({ ...prev, timeOfBirth: null }));
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.updateProfileBox, unknownBirthTime && styles.updateProfileBoxChecked]}>
                    {unknownBirthTime ? <Feather name="check" size={14} color="#FFF" /> : null}
                  </View>
                  <Text style={styles.updateProfileText}>{t.unknownBirthTime}</Text>
                </TouchableOpacity>
                <Text style={styles.requestLabel}>{t.birthLocation}</Text>
                <TextInput
                  style={styles.requestInput}
                  value={requestDraft.location}
                  onChangeText={(location) => {
                    setRequestProfileError("");
                    setRequestDraft((prev) => ({ ...prev, location, latitude: "", longitude: "" }));
                  }}
                  placeholder={t.searchLocation}
                  placeholderTextColor="#94A3B8"
                />
                {!requestDraft.latitude && requestDraft.location.trim().length >= 2 ? <Text style={styles.locationHint}>{t.selectLocation}</Text> : null}
                {requestLocationSuggestions.length > 0 && (
                  <View style={styles.locationDropdown}>
                    {requestLocationSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={`${suggestion.display_name}-${index}`}
                        style={styles.locationOption}
                        onPress={() => {
                          setRequestDraft((prev) => ({ ...prev, location: suggestion.label || suggestion.display_name || "", latitude: String(suggestion.lat), longitude: String(suggestion.lon) }));
                          setRequestLocationSuggestions([]);
                        }}
                      >
                        <Text style={styles.locationOptionText} numberOfLines={2}>{suggestion.display_name || suggestion.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.updateProfileRow}
                  onPress={() => setUpdateProfile((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.updateProfileBox, updateProfile && styles.updateProfileBoxChecked]}>
                    {updateProfile ? <Feather name="check" size={14} color="#FFF" /> : null}
                  </View>
                  <Text style={styles.updateProfileText}>{t.updateProfile}</Text>
                </TouchableOpacity>
                <View style={styles.audioModalActions}>
                  <TouchableOpacity style={styles.audioCancelBtn} onPress={closeRequestDetailsModal}>
                    <Text style={styles.audioCancelText}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.audioOkBtn} onPress={handleConfirmBusyRequest} disabled={sendingRequest}>
                    {sendingRequest ? <ActivityIndicator color="#FFF" /> : <Text style={styles.audioOkText}>{t.sendRequest}</Text>}
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {showRequestDatePicker && (
        <DateTimePicker
          value={requestDraft.dateOfBirth || new Date()}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, date) => {
            setShowRequestDatePicker(false);
            if (date) setRequestDraft((prev) => ({ ...prev, dateOfBirth: date }));
          }}
        />
      )}
      {showRequestTimePicker && (
        <DateTimePicker
          value={requestDraft.timeOfBirth || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, time) => {
            setShowRequestTimePicker(false);
            if (time) setRequestDraft((prev) => ({ ...prev, timeOfBirth: time }));
          }}
        />
      )}
      <Modal visible={false} transparent animationType="fade">
        <View style={styles.audioModalOverlay}>
          <View style={styles.audioModalCard}>
            <Feather
              name={
                callType === "audio"
                  ? "phone-call"
                  : callType === "video"
                    ? "video"
                    : "message-circle"
              }
              size={36}
              color={
                callType === "audio"
                  ? "#F59E0B"
                  : callType === "video"
                    ? "#4A148C"
                    : "#FF9933"
              }
            />

            <Text style={styles.audioModalTitle}>{t.astrologerBusy}</Text>

            <Text style={styles.audioModalDesc}>{getBusyDesc()}</Text>

            <View style={styles.audioModalActions}>
              <TouchableOpacity
                style={styles.audioCancelBtn}
                onPress={() => setShowAudioModal(false)}
              >
                <Text style={styles.audioCancelText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioOkBtn}
                onPress={handleConfirmBusyRequest}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.audioOkText}>{t.ok}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* 🔹 UI Components */

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.chips}>{children}</View>
  </View>
);

const Chip = ({ label }: any) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const ActionButton = ({ icon, label, enabled, colors, onPress }: any) => (
  <TouchableOpacity
    onPress={enabled ? onPress : undefined}
    disabled={!enabled}
    style={{ width: "30%" }}
    activeOpacity={0.85}
  >
    <LinearGradient
      colors={enabled ? colors : ["#9ca3af", "#6b7280"]}
      style={styles.actionBtn}
    >
      <Feather name={icon} size={18} color="#fff" />
      <Text style={styles.actionText}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

/* 🎨 Styles */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF7EA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileWrap: { padding: 16, paddingBottom: 8 },
  profileCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.24)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  profileGlowOne: {
    position: "absolute",
    right: -54,
    top: -64,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
  },
  profileGlowTwo: {
    position: "absolute",
    left: -52,
    bottom: -72,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 153, 51, 0.14)",
  },
  avatarFrame: {
    width: 126,
    height: 126,
    borderRadius: 63,
    padding: 4,
    marginBottom: 14,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 59,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  sub: { color: "#FFF6D8", marginTop: 4 },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  heroStatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.22)",
  },
  heroStatText: {
    color: "#FFF6D8",
    fontSize: 12,
    fontWeight: "800",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  online: { backgroundColor: "#dcfce7" },
  busy: { backgroundColor: "#fef3c7" },
  offline: { backgroundColor: "#e5e7eb" },

  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotOnline: { backgroundColor: "#16a34a" },
  dotBusy: { backgroundColor: "#f59e0b" },
  dotOffline: { backgroundColor: "#6b7280" },

  statusText: { fontSize: 12, fontWeight: "900", color: "#2B164C" },

  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7EA",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.35)",
  },
  feedbackText: {
    color: "#4A148C",
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "800",
  },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    color: "#2B164C",
  },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    backgroundColor: "#FFF7EA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 153, 51, 0.16)",
  },
  chipText: { fontSize: 12, color: "#4A148C", fontWeight: "700" },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  actionBtn: {
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  actionText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
modalContent: {
  backgroundColor: "#FFFDF8",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  maxHeight: "90%",
},
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2B164C",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: "#FFF7EA",
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    color: "#2B164C",
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.1)",
  },
  submitBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bioCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 22,
    marginTop: 0,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  bioText: {
    fontSize: 14,
    color: "#4B3A55",
    lineHeight: 21,
    fontWeight: "600",
  },
  photoSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  photoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  photoSectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2B164C",
  },
  photoSectionSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#8E6CA8",
  },
  photoLoader: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoLoaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8E6CA8",
  },
  photoList: {
    gap: 12,
    paddingRight: 4,
  },
  galleryPhotoCard: {
    width: 138,
    height: 172,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFF7EA",
    borderWidth: 2,
    borderColor: "rgba(255, 153, 51, 0.18)",
  },
  galleryPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  commentSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  commentTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    color: "#2B164C",
  },
  commentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
  },
  commentName: {
    fontWeight: "800",
    marginBottom: 4,
    color: "#2B164C",
  },
  commentText: {
    fontSize: 14,
    color: "#4B3A55",
    lineHeight: 20,
  },
  commentDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
    textAlign: "right",
  },
  audioModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioModalCard: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  requestModalCard: {
    width: "92%",
    maxHeight: "86%",
    alignItems: "stretch",
    paddingVertical: 20,
  },
  requestModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  requestHeading: { flex: 1 },
  requestSubtitle: { fontSize: 13, color: "#64748B", marginTop: 4, lineHeight: 18 },
  requestScroll: { width: "100%" },
  requestLoading: { paddingVertical: 28, alignItems: "center" },
  requestLoadingText: { marginTop: 10, color: "#64748B", fontWeight: "600" },
  requestError: { backgroundColor: "#FEF2F2", color: "#991B1B", padding: 10, borderRadius: 10, marginBottom: 12, fontSize: 12 },
  requestLabel: { fontSize: 12, fontWeight: "800", color: "#4A148C", marginBottom: 7, marginTop: 6, textTransform: "uppercase" },
  requestInput: { borderWidth: 1, borderColor: "rgba(74,20,140,0.16)", backgroundColor: "#FFFDF8", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1E293B" },
  requestPicker: { borderWidth: 1, borderColor: "rgba(74,20,140,0.16)", backgroundColor: "#FFFDF8", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  requestValue: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
  requestPlaceholder: { fontSize: 14, color: "#94A3B8" },
  locationHint: { marginTop: 7, fontSize: 12, color: "#B45309", fontWeight: "600" },
  locationDropdown: { marginTop: 9, borderWidth: 1, borderColor: "rgba(74,20,140,0.12)", borderRadius: 14, overflow: "hidden", backgroundColor: "#FFFFFF" },
  locationOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(148,163,184,0.16)" },
  locationOptionText: { fontSize: 13, color: "#334155", lineHeight: 18 },
  updateProfileRow: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 6 },
  updateProfileBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginRight: 10, backgroundColor: "#FFF" },
  updateProfileBoxChecked: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
  updateProfileText: { fontSize: 14, color: "#334155", fontWeight: "600" },
  audioModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  audioModalDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 12,
  },
  audioModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  audioCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  audioCancelText: {
    fontWeight: "700",
    color: "#374151",
  },
  audioOkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    alignItems: "center",
  },
  audioOkText: {
    fontWeight: "700",
    color: "#FFF",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  viewerContainer: {
    width: "92%",
    height: "75%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FF9933", // saffron border 🔥
    backgroundColor: "#000",
  },

  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
    padding: 8,
    borderRadius: 20,
  },
 ribbonContainer: {
  position: "absolute",
  top: 22,
  left: -46,
  width: '50%',
  alignItems: "center",
  transform: [{ rotate: "-45deg" }],
  zIndex: 20,
},
ribbon: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  paddingVertical: 5,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.55)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.35,
  shadowRadius: 4,
  elevation: 8,
},
ribbonText: {
  fontSize: 7,
  fontWeight: "900",
  color: "#4A148C",
  letterSpacing: 1.1,
},
// thin "stitched" lines near the top/bottom edge of the ribbon for a stamp feel
ribbonStitchTop: {
  position: "absolute",
  top: 2,
  left: 6,
  right: 6,
  height: 1,
  borderStyle: "dashed",
  borderWidth: 0.6,
  borderColor: "rgba(74,20,140,0.35)",
},
ribbonStitchBottom: {
  position: "absolute",
  bottom: 2,
  left: 6,
  right: 6,
  height: 1,
  borderStyle: "dashed",
  borderWidth: 0.6,
  borderColor: "rgba(74,20,140,0.35)",
},
// small dark triangles at each end to mimic a folded ribbon tail
ribbonFoldLeft: {
  position: "absolute",
  left: 0,
  bottom: -6,
  width: 0,
  height: 0,
  borderTopWidth: 6,
  borderTopColor: "transparent",
  borderRightWidth: 6,
  borderRightColor: "transparent",
},
ribbonFoldRight: {
  position: "absolute",
  right: 0,
  bottom: -6,
  width: 0,
  height: 0,
  borderTopWidth: 6,
  borderTopColor: "transparent",
  borderLeftWidth: 6,
  borderLeftColor: "transparent",
},
replyCard: {
  marginTop: 12,
  marginLeft: 12,
  padding: 12,
  borderRadius: 14,
  backgroundColor: "transparent",
  borderLeftWidth: 3,
  borderLeftColor: "transparent",
},

replyTitle: {
  fontSize: 13,
  fontWeight: "900",
  color: "#4A148C",
  marginBottom: 5,
},

replyText: {
  fontSize: 13,
  lineHeight: 19,
  color: "#4B3A55",
},

replyDate: {
  fontSize: 10,
  color: "#999",
  marginTop: 5,
  textAlign: "right",
},
});
