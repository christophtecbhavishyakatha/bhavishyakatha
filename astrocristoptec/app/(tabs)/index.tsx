import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { SafeAreaView } from "react-native-safe-area-context";
import { socket } from "../../components/soketOnOff";
import { CLIENT_AUTH_API_BASE_URL } from "../../lib/api";
import Header, { HeaderRef } from "../components/header";
import InsufficientBalanceModal from "../components/InsufficientBalanceModal";
import ForceUpdateChecker from "../components/updateChecker";
import LowBalanceModal from "../components/callAgainModal";
const LANGUAGE_LABELS: Record<string, string> = {
  english: "English",
  hindi: "हिन्दी",
  bengali: "বাংলা",
};
const parseLanguages = (input: any): string[] => {
  try {
    if (Array.isArray(input)) {
      const joined = input.join(",");
      const parsed = JSON.parse(joined);
      return Array.isArray(parsed)
        ? parsed.map((l) => String(l).toLowerCase().trim())
        : [];
    }

    if (typeof input === "string") {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed)
        ? parsed.map((l) => String(l).toLowerCase().trim())
        : [];
    }
  } catch (e) {
    console.warn("Language parse failed:", input);
  }
  return [];
};

const uniqueById = <T extends { id: unknown }>(items: T[]): T[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const id = String(item.id);
    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
};

type RequestModalMode = "online" | "busy";

interface RequestLocationSuggestion {
  label: string;
  lat: string;
  lon: string;
  display_name?: string;
  address?: NominatimAddress;
}

interface NominatimAddress {
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  suburb?: string;
  county?: string;
  district?: string;
  state?: string;
  region?: string;
  country?: string;
}

interface RequestDraft {
  fullName: string;
  dateOfBirth: Date | null;
  timeOfBirth: Date | null;
  location: string;
  latitude: string;
  longitude: string;
}

const createEmptyRequestDraft = (): RequestDraft => ({
  fullName: "",
  dateOfBirth: null,
  timeOfBirth: null,
  location: "",
  latitude: "",
  longitude: "",
});

const parseProfileDate = (value?: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const parts = value.split(/[/-]/).map((part) => Number(part));
  if (parts.length === 3 && parts.every((part) => !Number.isNaN(part))) {
    const [a, b, c] = parts;
    const year = a > 31 ? a : c;
    const month = a > 31 ? b - 1 : b - 1;
    const day = a > 31 ? c : a;
    const fallback = new Date(year, month, day);

    if (!Number.isNaN(fallback.getTime())) {
      return fallback;
    }
  }

  return null;
};

const parseProfileTime = (value?: string | null) => {
  if (!value) return null;

  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    const time = new Date();
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const meridiem = ampmMatch[3].toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

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
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

const titleize = (value: string) =>
  value
    .split(/[\s,_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const formatCompactLocation = (address?: NominatimAddress, fallback = "") => {
  const locality =
    address?.village ||
    address?.town ||
    address?.city ||
    address?.municipality ||
    address?.suburb ||
    address?.district ||
    "";

  const county = address?.county || "";
  const state = address?.state || address?.region || "";

  const parts = [locality, county, state]
    .map((part) => part.trim())
    .filter(Boolean)
    .map(titleize);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return fallback ? titleize(fallback) : "";
};

const formatDateLabel = (date: Date | null) => {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateToApi = (date: Date | null) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatTimeLabel = (date: Date | null) => {
  if (!date) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTimeToApi = (date: Date | null) => {
  if (!date) return "";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = "00";

  return `${hours}:${minutes}:${seconds}`;
};

// Replace with your actual API URL
const API_BASE_URL = "https://bhavishyakatha.in/express/api/client";

interface Astrologer {
  id: string;
  name: string;
  displayName?: string;
  specialty: string[];
  specializations?: string[];
  image: string;
  rating: number;
  callRate: number;
  chatRate: number;
  videoRate: number;
  audioPlatformFee?: number;
  videoPlatformFee?: number;
  chatPlatformFee?: number;
  experience: string;
  languages: string[];
  isOnline: boolean;
  status?: string;
  lastSeen?: string;
  isAudioAvailable?: boolean;
  isVideoAvailable?: boolean;
  isChatAvailable?: boolean;
  walletBalance?: number;
  rank?: number;
  founding?: number;
  rankDisplay?: number;
  // ALWAYS array
}

interface CouponOffer {
  id: number;
  code: string;
  min_amount: number;
  bonus_percent: number;
  max_bonus?: number;
}

// Translation helper function
const getTranslations = (lang: string) => {
  const translations: any = {
    en: {
      call: "Call",
      video: "Video",
      chat: "Chat",
      min: "/ min",
      online: "Online",
      offline: "Offline",
      filters: "Filters",
      language: "Language",
      category: "Category",
      sortBy: "Sort By",
      all: "All",
      experience: "Experience",
      price: "Price",
      rating: "Rating",
      apply: "Apply Filters",
      reset: "Reset",
      loading: "Loading...",
      error: "Error loading astrologers",
      retry: "Retry",
      noAstrologers: "No astrologers found",
      languages: {
        Hindi: "हिन्दी",
        English: "English",
        Bengali: "বাংলা",
      },
      yearsExperience: "Years Experience",
      astrologerOffline: "Astrologer is offline",
      astrologerBusy: "Astrologer is busy",
      busyDesc:
        "Astrologer is currently busy. You can still send an audio call request.",
      ok: "OK",
      cancel: "Cancel",
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
      pendingRequestWarning:
        "Do not share any contact information like phone number or postal address.",
      pendingRequestDesc:
        "You have a pending request. Please wait some time to meet our astrologer. If the astrologer does not accept your request within 30 minutes, you can make another request.",
      requestSuccessTitle: "Request Sent",
      requestSuccessDesc:
        "Your request has been successfully sent to the astrologer. Please wait for them to accept.",
      confirmRequestTitle: "Confirm Request",
      confirmRequestDesc:
        "Please verify your birth details before sending the request.",
      fullName: "Full Name",
      dateOfBirth: "Date of Birth",
      timeOfBirth: "Time of Birth",
      unknownBirthTime: "I don't know my birth time",
      birthLocation: "Birth Location",
      latitude: "Latitude",
      longitude: "Longitude",
      selectLocation: "Select a location from suggestions",
      searchLocation: "Search location or Pincode",
      updateProfile: "Update Profile",
      sendRequest: "Send Request",
      locationLoading: "Looking up locations...",
      requestProfileError:
        "We could not load your profile. Please fill the details manually.",
    },
    hi: {
      call: "कॉल",
      video: "वीडियो",
      chat: "चैट",
      min: "/ मिनट",
      online: "ऑनलाइन",
      offline: "ऑफलाइन",
      filters: "फ़िल्टर",
      language: "भाषा",
      category: "श्रेणी",
      sortBy: "क्रमबद्ध करें",
      all: "सभी",
      experience: "अनुभव",
      price: "मूल्य",
      rating: "रेटिंग",
      apply: "फ़िल्टर लागू करें",
      reset: "रीसेट",
      loading: "लोड हो रहा है...",
      error: "ज्योतिषियों को लोड करने में त्रुटि",
      retry: "पुनः प्रयास करें",
      noAstrologers: "कोई ज्योतिषी नहीं मिला",
      languages: {
        Hindi: "हिन्दी",
        English: "English",
        Bengali: "বাংলা",
      },
      yearsExperience: "वर्ष का अनुभव",
      astrologerOffline: "ज्योतिषी ऑफलाइन है",
      astrologerBusy: "ज्योतिषी व्यस्त है",
      busyDesc:
        "ज्योतिषी इस समय व्यस्त है। आप फिर भी ऑडियो कॉल अनुरोध भेज सकते हैं।",
      ok: "ठीक है",
      cancel: "रद्द करें",
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
      pendingRequestWarning:
        "फोन नंबर या पता जैसी कोई भी संपर्क जानकारी साझा न करें।",
      pendingRequestDesc:
        "आपका एक अनुरोध लंबित है। कृपया हमारे ज्योतिषी से मिलने के लिए कुछ समय प्रतीक्षा करें। यदि ज्योतिषी 30 मिनट के भीतर आपका अनुरोध स्वीकार नहीं करते हैं, तो आप एक और अनुरोध कर सकते हैं।",
      requestSuccessTitle: "अनुरोध भेजा गया",
      requestSuccessDesc:
        "आपका अनुरोध सफलतापूर्वक ज्योतिषी को भेज दिया गया है। कृपया उनके स्वीकार करने की प्रतीक्षा करें।",
      confirmRequestTitle: "अनुरोध की पुष्टि करें",
      confirmRequestDesc:
        "कृपया अनुरोध भेजने से पहले अपनी जन्म जानकारी जांच लें।",
      fullName: "पूरा नाम",
      dateOfBirth: "जन्म तिथि",
      timeOfBirth: "जन्म समय",
      unknownBirthTime: "मुझे अपना जन्म समय नहीं पता",
      birthLocation: "जन्म स्थान",
      latitude: "अक्षांश",
      longitude: "देशांतर",
      selectLocation: "सुझावों में से स्थान चुनें",
      searchLocation: "स्थान खोजें या पिनकोड",
      updateProfile: "प्रोफ़ाइल अपडेट करें",
      sendRequest: "अनुरोध भेजें",
      locationLoading: "स्थान खोजे जा रहे हैं...",
      requestProfileError:
        "आपकी प्रोफ़ाइल लोड नहीं हो सकी। कृपया विवरण मैन्युअल रूप से भरें।",
    },
    bn: {
      call: "কল",
      video: "ভিডিও",
      chat: "চ্যাট",
      min: "/ মিনিট",
      online: "অনলাইন",
      offline: "অফলাইন",
      filters: "ফিল্টার",
      language: "ভাষা",
      category: "বিভাগ",
      sortBy: "সাজান",
      all: "সব",
      experience: "অভিজ্ঞতা",
      price: "মূল্য",
      rating: "রেটিং",
      apply: "ফিল্টার প্রয়োগ করুন",
      reset: "রিসেট",
      loading: "লোড হচ্ছে...",
      error: "জ্যোতিষী লোড করতে ত্রুটি",
      retry: "আবার চেষ্টা করুন",
      noAstrologers: "কোন জ্যোতিষী পাওয়া যায়নি",
      languages: {
        Hindi: "हिन्दी",
        English: "English",
        Bengali: "বাংলা",
      },
      yearsExperience: "বছরের অভিজ্ঞতা",
      astrologerOffline: "জ্যোতিষী অফলাইন",
      astrologerBusy: "জ্যোতিষী ব্যস্ত",
      busyDesc:
        "জ্যোতিষী বর্তমানে ব্যস্ত। আপনি তবুও অডিও কল অনুরোধ পাঠাতে পারেন।",
      ok: "ঠিক আছে",
      cancel: "বাতিল",
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
      pendingRequestWarning:
        "ফোন নম্বর বা ঠিকানার মতো কোনো যোগাযোগের তথ্য শেয়ার করবেন না।",
      pendingRequestDesc:
        "আপনার একটি অনুরোধ মুলতুবি আছে। আমাদের জ্যোতিষীর সাথে দেখা করতে কিছুক্ষণ অপেক্ষা করুন। যদি জ্যোতিষী 30 মিনিটের মধ্যে আপনার অনুরোধ গ্রহণ না করেন, তবে আপনি আরেকটি অনুরোধ করতে পারেন।",
      requestSuccessTitle: "অনুরোধ পাঠানো হয়েছে",
      requestSuccessDesc:
        "আপনার অনুরোধ সফলভাবে জ্যোতিষীর কাছে পাঠানো হয়েছে। দয়া করে তাদের গ্রহণ করার জন্য অপেক্ষা করুন।",
      confirmRequestTitle: "অনুরোধ নিশ্চিত করুন",
      confirmRequestDesc:
        "অনুগ্রহ করে অনুরোধ পাঠানোর আগে আপনার জন্মের তথ্য যাচাই করুন।",
      fullName: "পুরো নাম",
      dateOfBirth: "জন্ম তারিখ",
      timeOfBirth: "জন্ম সময়",
      unknownBirthTime: "আমি আমার জন্ম সময় জানি না",
      birthLocation: "জন্মস্থান",
      latitude: "অক্ষাংশ",
      longitude: "দ্রাঘিমাংশ",
      selectLocation: "সাজেশন থেকে একটি স্থান নির্বাচন করুন",
      searchLocation: "স্থান / পিনকোড অনুসন্ধান করুন",
      updateProfile: "প্রোফাইল আপডেট করুন",
      sendRequest: "অনুরোধ পাঠান",
      locationLoading: "স্থান অনুসন্ধান করা হচ্ছে...",
      requestProfileError:
        "আপনার প্রোফাইল লোড করা যায়নি। অনুগ্রহ করে তথ্য ম্যানুয়ালি পূরণ করুন।",
    },
  };

  const offerTranslations: Record<string, Record<string, string>> = {
 en: {
  rechargeOffer: "Get {percent}% EXTRA",
  rechargeSub: "Wallet balance",
  rechargeSub2: "On your next recharge",
  rechargeOfferMinimum:
    "Recharge {currency}{amount}+ and get {percent}% EXTRA",
  rechargeOfferCode: "Use code {code}",
},

hi: {
  rechargeOffer: "{percent}% अतिरिक्त",
  rechargeSub: "वॉलेट बैलेंस पाएं",
  rechargeSub2: "अगले रिचार्ज पर",
  rechargeOfferMinimum:
    "{currency}{amount}+ रिचार्ज पर {percent}% अतिरिक्त पाएं",
  rechargeOfferCode: "कोड {code} का उपयोग करें",
},

bn: {
  rechargeOffer: "{percent}% অতিরিক্ত",
  rechargeSub: "ওয়ালেট ব্যালেন্স পান",
  rechargeSub2: "পরবর্তী রিচার্জে",
  rechargeOfferMinimum:
    "{currency}{amount}+ রিচার্জে {percent}% অতিরিক্ত পান",
  rechargeOfferCode: "কোড {code} ব্যবহার করুন",
},
  };

  return {
    ...(translations[lang] || translations.en),
    ...(offerTranslations[lang] || offerTranslations.en),
  };
};
type CallType = "audio" | "chat" | "video";

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const scale = SCREEN_WIDTH / 375; // base iPhone width
export default function ChatScreen() {
  const router = useRouter();

  const [coins, setCoins] = useState(0);
  const [language, setLanguage] = useState("en");
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLanguageFilter, setSelectedLanguageFilter] =
    useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<string>("All");
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [requestModalMode, setRequestModalMode] =
    useState<RequestModalMode>("online");
  const [selectedAstrologer, setSelectedAstrologer] =
    useState<Astrologer | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [requestDraft, setRequestDraft] = useState<RequestDraft>(
    createEmptyRequestDraft(),
  );
  const [requestProfileLoading, setRequestProfileLoading] = useState(false);
  const [requestProfileError, setRequestProfileError] = useState("");
  const [requestLocationSuggestions, setRequestLocationSuggestions] = useState<
    RequestLocationSuggestion[]
  >([]);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);
  const [showRequestTimePicker, setShowRequestTimePicker] = useState(false);
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);
let noticeFetchedThisSession = false;
  // Temporary filter states for modal
  const [tempLanguageFilter, setTempLanguageFilter] = useState<string>("All");
  const [tempCategory, setTempCategory] = useState<string>("All");
  const [tempSortBy, setTempSortBy] = useState<string>("rating");
  const [tempSpecialization, setTempSpecialization] = useState<string>("All");
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<CallType | null>(null);
  const [pendingAstrologerName, setPendingAstrologerName] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
const [updateProfile, setUpdateProfile] = useState(false);
const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);  
  const [bestCouponOffer, setBestCouponOffer] = useState<CouponOffer | null>(
    null,
  );
  const [notice, setNotice] = useState<{
    image: string;
    button_name: string;
    redirect_url: string;
  } | null>(null);

  const headerRef = useRef<HeaderRef>(null);
  const locationSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  AppEventsLogger.logEvent("Downloaded_App");
  const onWalletUpdated = () => {
    headerRef.current?.reloadHeader();
  };
  const getTotalRate = (rate: number, fee?: number) => {
    return Math.round(((Number(rate) || 0) + (Number(fee) || 0)) * 100) / 100;
  };

  const getStatusLabel = (status?: string) => {
    if (status === "online") return t.online;
    if (status === "busy") return "Busy";
    return t.offline;
  };

  const getStatusColor = (status?: string) => {
    if (status === "online") return "#22C55E"; // green
    if (status === "busy") return "#F59E0B"; // orange
    return "#94A3B8"; // gray
  };

  // Load selected language
  useEffect(() => {
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
    loadLanguage();
  }, []);

  const t = getTranslations(language);

  // Fetch astrologers from API
  const fetchAstrologers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/astrologers`);
      const json = await res.json();
      const normalized: Astrologer[] = json.data.map((a: any) => ({
        ...a,
        id: String(a.id),
        specialty: Array.isArray(a.specialty)
          ? a.specialty
          : JSON.parse(a.specialty || "[]"),

        languages: parseLanguages(a.languages), // 🔥 FIX
        specializations: parseLanguages(a.specializations), // 🔥 FIX
      }));

      console.log("FIXED LANGUAGES:", normalized[0]?.languages);
      setAstrologers(uniqueById(normalized));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBestCouponOffer = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        setBestCouponOffer(null);
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/coupon/list?userId=${encodeURIComponent(userId)}`,
      );
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const best = [...(json.data as CouponOffer[])].sort((a, b) => {
          const bonusDifference =
            Number(b.bonus_percent) - Number(a.bonus_percent);
          if (bonusDifference !== 0) return bonusDifference;
          return Number(a.min_amount) - Number(b.min_amount);
        })[0];
        setBestCouponOffer(best || null);
      } else {
        setBestCouponOffer(null);
      }
    } catch (error) {
      console.log("Best coupon offer fetch error:", error);
      setBestCouponOffer(null);
    }
  };
const SkeletonAstrologerCard = () => (
  <View style={styles.card}>
    <View style={styles.skeletonProfileRow}>
      <View style={styles.skeletonImage} />

      <View style={{ flex: 1, marginLeft: 14 }}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineSmall} />
        <View style={styles.skeletonLineSmall} />
      </View>
    </View>

    <View style={styles.skeletonActions}>
      <View style={styles.skeletonButton} />
      <View style={styles.skeletonButton} />
      <View style={styles.skeletonButton} />
    </View>
  </View>
);
const skeletonData = Array.from({ length: 6 }, (_, index) => ({
  id: `skeleton-${index}`,
}));
  // Initial load
  useEffect(() => {
    fetchAstrologers();
    fetchNotice();
    loadBestCouponOffer();
  }, []);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
     // fetchAstrologers();
    //  fetchNotice();

      onWalletUpdated();
      loadBestCouponOffer();
          checkLowBalance();

    }, []),
  );
  useEffect(() => {
    console.log("🔵 Trying socket connection...");

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.log("🔴 Socket connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("🟡 Socket disconnected:", reason);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, []);

  useEffect(() => {
    const handler = (payload: {
      astrologer_id: string;
      status: string;
      audio: boolean;
      video: boolean;
      chat: boolean;
    }) => {
      console.log("📥 Socket payload:", payload);

      setAstrologers((prev) =>
        prev.map((a) =>
          String(a.id) === String(payload.astrologer_id)
            ? {
                ...a,
                status: payload.status,
                isAudioAvailable: payload.audio,
                isVideoAvailable: payload.video,
                isChatAvailable: payload.chat,
              }
            : a,
        ),
      );
    };

    socket.on("astrologer-status-update", handler);
    console.log("🟢 Socket listener added");

    return () => {
      socket.off("astrologer-status-update", handler);
    };
  }, []);

  useEffect(() => {
    if (!showAudioModal) {
      setRequestLocationSuggestions([]);
      return;
    }

    if (requestDraft.latitude && requestDraft.longitude) {
      return;
    }

    const query = requestDraft.location.trim();

    if (query.length < 2) {
      setRequestLocationSuggestions([]);
      return;
    }

    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }

    locationSearchTimeoutRef.current = setTimeout(() => {
      void searchLocationSuggestions(query);
    }, 450);

    return () => {
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
    };
  }, [
    showAudioModal,
    requestDraft.location,
    requestDraft.latitude,
    requestDraft.longitude,
    language,
  ]);

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchAstrologers();
    onWalletUpdated();
  };

  // Open modal with current filters
  const openFilterModal = () => {
    setTempLanguageFilter(selectedLanguageFilter);
    setTempCategory(selectedCategory);
    setTempSortBy(sortBy);
    setTempSpecialization(selectedSpecialization); // ✅
    setShowFilterModal(true);
  };

  // Apply filters
  const applyFilters = () => {
    setSelectedLanguageFilter(tempLanguageFilter);
    setSelectedCategory(tempCategory);
    setSortBy(tempSortBy);
    setSelectedSpecialization(tempSpecialization); // ✅
    setShowFilterModal(false);
  };

  // Reset filters
  const resetFilters = () => {
    setTempLanguageFilter("All");
    setTempCategory("All");
    setTempSpecialization("All"); // ✅
    setTempSortBy("rating");
  };

  // Get unique categories from astrologers
  const getCategories = () => {
    const categories = new Set<string>();

    astrologers.forEach((a) => {
      // FIX: specialty is string[]
      if (Array.isArray(a.specialty)) {
        a.specialty.forEach((s) => categories.add(s));
      }
    });

    return ["All", ...Array.from(categories)];
  };
  const fetchNotice = async () => {
     if (noticeFetchedThisSession) {
    console.log("⏭️ Notice already fetched this app session");
    return;
  }
    try {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        return;
      }
    noticeFetchedThisSession = true;

      const res = await fetch(
        `${API_BASE_URL}/notice?userId=${encodeURIComponent(userId)}`,
      );

      const json = await res.json();

      console.log("NOTICE API:", json);

      if (json.success === true && json.data) {
        setNotice({
          image: json.data.image,
          button_name: json.data.button_name,
          redirect_url: json.data.redirect_url,
        });

        setShowNoticeModal(true);
      }
    } catch (error) {
      console.error("Notice API error:", error);
    }
  };
  // Get unique languages from astrologers
  const getLanguages = () => {
    const languages = new Set<string>();
    astrologers.forEach((a) => {
      if (a.languages) {
        a.languages.forEach((l) => languages.add(l.trim()));
      }
    });
    return ["All", ...Array.from(languages)];
  };
  const getSpecializations = () => {
    const specs = new Set<string>();

    astrologers.forEach((a) => {
      if (Array.isArray(a.specializations)) {
        a.specializations.forEach((s) => specs.add(s));
      }
    });

    return ["All", ...Array.from(specs)];
  };
const checkLowBalance = async () => {
  try {
    const lastcall = await AsyncStorage.getItem("lastCall");
console.log("Last call timestamp:", lastcall);
    // Only check balance if there was a previous call
    if (!lastcall) {
      console.log(
        "No last call timestamp found, skipping low balance check."
      );
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      console.log("No user ID found, skipping low balance check.");
      return;
    }

    const res = await fetch(
      `${CLIENT_AUTH_API_BASE_URL}/users/${userId}`
    );

    const json = await res.json();

    if (json.success) {
      const balance = Math.trunc(
        Number(json.data.wallet_balance ?? 0)
      );

      console.log("💰 Current wallet balance:", balance);

      setCoins(balance);

      // Show modal only when balance is below ₹50
      if (balance < 50) {
        setShowLowBalanceModal(true);
      } else {
        setShowLowBalanceModal(false);
      }
    }
  } catch (error) {
    console.error("Low balance check error:", error);
  }
};
const getStatusPriority = (astrologer: Astrologer) => {
  if (astrologer.status === "online") return 0;
  if (astrologer.status === "busy") return 1;
  return 2; // offline
};
  // Filter and sort astrologers
  const getFilteredAndSortedAstrologers = () => {
    let filtered = [...astrologers];

    // Filter by language
    if (selectedLanguageFilter !== "All") {
      filtered = filtered.filter((a) =>
        a.languages.some((l) => l.trim() === selectedLanguageFilter),
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (a) =>
          (Array.isArray(a.specialty) &&
            a.specialty.includes(selectedCategory)) ||
          (Array.isArray(a.specializations) &&
            a.specializations.includes(selectedCategory)),
      );
    }

    // Sort
filtered.sort((a, b) => {
  // ALWAYS: Online → Busy → Offline
  const statusDiff =
    getStatusPriority(a) - getStatusPriority(b);

  if (statusDiff !== 0) {
    return statusDiff;
  }

  // Sort within the same status
  if (sortBy === "experience") {
    return parseInt(b.experience) - parseInt(a.experience);
  }

  if (sortBy === "price") {
    return a.chatRate - b.chatRate;
  }

  if (sortBy === "rating") {
    return b.rating - a.rating;
  }

  // Keep existing order for recent
  return 0;
});

    return filtered;
  };
  const requestIconConfig = {
    audio: {
      icon: "phone-call",
      color: "#F59E0B",
    },
    chat: {
      icon: "message-circle",
      color: "#FF9933",
    },
    video: {
      icon: "video",
      color: "#4A148C",
    },
  } as const;

  const activeRequestConfig = callType ? requestIconConfig[callType] : null;

  const closeRequestModal = () => {
    setShowAudioModal(false);
    setRequestModalMode("online");
    setRequestLocationSuggestions([]);
    setRequestProfileError("");
    setRequestProfileLoading(false);
    setShowRequestDatePicker(false);
    setShowRequestTimePicker(false);
  };

  const resolveLocationCoordinates = async (query: string) => {
    if (query.trim().length < 2) {
      return null;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/location/search?q=${encodeURIComponent(
          query.trim(),
        )}&limit=1&language=${encodeURIComponent(language)}`,
      );

      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data[0]) {
        const first = json.data[0];

        return {
          label: formatCompactLocation(first.address, first.display_name),
          lat: String(first.lat),
          lon: String(first.lon),
          display_name: first.display_name,
          address: first.address,
        } as RequestLocationSuggestion;
      }
    } catch (error) {
      console.error("Location lookup failed:", error);
    }

    return null;
  };

 const searchLocationSuggestions = async (query: string) => {
  if (query.trim().length < 2) {
    setRequestLocationSuggestions([]);
    return;
  }

  try {
    const url =
      `${API_BASE_URL}/location/search?q=${encodeURIComponent(
        query.trim()
      )}&limit=5&language=${encodeURIComponent(language)}`;

    console.log("🔎 Location API:", url);

    const res = await fetch(url);

    console.log("📡 HTTP status:", res.status);

    const json = await res.json();

    console.log("📍 Location JSON:", json);

    if (json.status === true && Array.isArray(json.data)) {
      setRequestLocationSuggestions(json.data);
    } else {
      setRequestLocationSuggestions([]);
    }
  } catch (error) {
    console.error("❌ Location API error:", error);
    setRequestLocationSuggestions([]);
  }
};

  const loadRequestDraft = async (): Promise<RequestDraft | null> => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return null;
      }

      const res = await fetch(
        `${CLIENT_AUTH_API_BASE_URL}/users/${userId}/birth-profile`,
      );
      const json = await res.json();

      const user = json?.data ?? json;
      if (!user || !user.full_name) {
        throw new Error("Profile not found");
      }

      console.log("Loaded user profile:", user);
      const nextDraft: RequestDraft = {
        fullName: user.full_name || "",
        dateOfBirth: parseProfileDate(user.date_of_birth),
        timeOfBirth: parseProfileTime(user.time_of_birth),
        location: user.location || "",
        latitude:
          user.latitude !== null && user.latitude !== undefined
            ? String(user.latitude)
            : "",
        longitude:
          user.longitude !== null && user.longitude !== undefined
            ? String(user.longitude)
            : "",
      };

      if (
        nextDraft.location.trim() &&
        (!nextDraft.latitude || !nextDraft.longitude)
      ) {
        const resolved = await resolveLocationCoordinates(nextDraft.location);
        if (resolved) {
          nextDraft.latitude = String(resolved.lat);
          nextDraft.longitude = String(resolved.lon);
          nextDraft.location =
            resolved.label || resolved.display_name || nextDraft.location;
        }
      }

      return nextDraft;
    } catch (error) {
      console.error("Request profile load error:", error);
      setRequestProfileError(t.requestProfileError);
      return null;
    }
  };

  const openRequestModal = async (
    astrologer: Astrologer,
    nextCallType: CallType,
    mode: RequestModalMode,
  ) => {
    console.log("🔥 OPEN REQUEST MODAL", {
      astrologerId: astrologer.id,
      callType: nextCallType,
      mode,
    });

    setSelectedAstrologer(astrologer);
    setCallType(nextCallType);
    setRequestModalMode(mode);
    setRequestLocationSuggestions([]);
    setRequestProfileError("");
    setRequestProfileLoading(true);
    setUnknownBirthTime(false);
    setShowAudioModal(false);

    const draft = await loadRequestDraft();
    setRequestDraft(draft ?? createEmptyRequestDraft());
    setRequestProfileLoading(false);
    setShowAudioModal(true);

    console.log("🔥 showAudioModal should become TRUE");
  };

  const handleRequestDateChange = (_event: any, selectedDate?: Date) => {
    setShowRequestDatePicker(false);

    if (selectedDate) {
      setRequestProfileError("");
      setRequestDraft((prev) => ({
        ...prev,
        dateOfBirth: selectedDate,
      }));
    }
  };

  const handleRequestTimeChange = (_event: any, selectedTime?: Date) => {
    setShowRequestTimePicker(false);

    if (selectedTime) {
      setRequestProfileError("");
      setRequestDraft((prev) => ({
        ...prev,
        timeOfBirth: selectedTime,
      }));
    }
  };

  const handleRequestLocationChange = (text: string) => {
    setRequestProfileError("");
    setRequestDraft((prev) => ({
      ...prev,
      location: text,
      latitude: "",
      longitude: "",
    }));
  };

  const handleRequestLocationSelect = (
    suggestion: RequestLocationSuggestion,
  ) => {
    setRequestProfileError("");
    setRequestDraft((prev) => ({
      ...prev,
      location: suggestion.label || suggestion.display_name || "",
      latitude: String(suggestion.lat),
      longitude: String(suggestion.lon),
    }));
    setRequestLocationSuggestions([]);
  };

  const sendCallRequest = async (
    astrologerId: string,
    nextCallType: CallType,
  ) => {
    const payload = {
      full_name: requestDraft.fullName.trim(),
      date_of_birth: formatDateToApi(requestDraft.dateOfBirth),
      time_of_birth: formatTimeToApi(requestDraft.timeOfBirth),
      location: requestDraft.location.trim(),
      latitude: requestDraft.latitude,
      longitude: requestDraft.longitude,
    };

    // Validate before entering the try/finally block. The finally block closes
    // the modal after a request, but validation errors must leave it open so
    // the user can correct the missing details.
    if (
      !payload.full_name ||
      !payload.date_of_birth ||
      (!payload.time_of_birth && !unknownBirthTime) ||
      !payload.location
    ) {
      setRequestProfileError(t.requestProfileError);
      return;
    }

    if (!payload.latitude || !payload.longitude) {
      setRequestProfileError(t.selectLocation);
      return;
    }

    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        router.push("/login");
        return;
      }

      const requestPayload = {
        astrologerId,
        userId,
        ...payload,
        lat: payload.latitude,
        long: payload.longitude,
        callType: nextCallType,
        update_profile: updateProfile,
      };

      let finalLatitude = requestPayload.latitude;
      let finalLongitude = requestPayload.longitude;
      let finalLocation = requestPayload.location;

      if (!finalLatitude || !finalLongitude) {
        const resolved = await resolveLocationCoordinates(finalLocation);
        if (resolved) {
          finalLatitude = String(resolved.lat);
          finalLongitude = String(resolved.lon);
          finalLocation =
            resolved.label || resolved.display_name || finalLocation;
          setRequestDraft((prev) => ({
            ...prev,
            location: finalLocation,
            latitude: finalLatitude,
            longitude: finalLongitude,
          }));
        }
      }

      if (!finalLatitude || !finalLongitude) {
        setRequestProfileError(t.selectLocation);
        return;
      }

      setSendingRequest(true);

      const endpoint =
        nextCallType === "audio"
          ? "requestAudio"
          : nextCallType === "chat"
            ? "requestChat"
            : "requestVideo";

      const res = await fetch(`${API_BASE_URL}/call/${endpoint}/v1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestPayload,
          location: finalLocation,
          latitude: finalLatitude,
          longitude: finalLongitude,
          lat: finalLatitude,
          long: finalLongitude,
        }),
      });

      const json = await res.json();
      console.log(json);

      onWalletUpdated();

      if (json.code === "INSUFFICIENT_BALANCE") {
        setRequiredAmount(json.requiredAmount || 0);
        setCoins(json.currentBalance || coins);
        setShowBalanceModal(true);
        return;
      }

      if (json.code === "PREVIOUS_REQUEST_PENDING") {
        setPendingAstrologerName(json.astrologerName || "Astrologer");
        setPendingCallType(nextCallType);
        setShowPendingModal(true);
        return;
      }

      if (json.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setSendingRequest(false);
      closeRequestModal();
    }
  };

  const handleAudioCall =
    (id: string, isAudioAvailable?: boolean, status?: string) => async () => {
      if (!isAudioAvailable) {
        alert(t.audioNotAvailable);
        return;
      }
      const astrologer = astrologers.find((a) => String(a.id) === String(id));
      if (!astrologer) return;

      if (status === "offline") {
        alert(t.astrologerOffline);
        return;
      }

      if (status === "busy") {
        await openRequestModal(astrologer, "audio", "busy");
        return;
      }

      if (status === "online") {
        await openRequestModal(astrologer, "audio", "online");
      }
    };

  const handleChat =
    (id: string, isChatAvailable?: boolean, status?: string) => async () => {
      if (!isChatAvailable) {
        alert(t.chatNotAvailable);
        return;
      }

      const astrologer = astrologers.find((a) => String(a.id) === String(id));
      if (!astrologer) return;

      if (status === "offline") {
        alert(t.astrologerOffline);
        return;
      }

      if (status === "busy") {
        await openRequestModal(astrologer, "chat", "busy");
        return;
      }

      if (status === "online") {
        await openRequestModal(astrologer, "chat", "online");
      }
    };

  const handleVideoCall =
    (id: string, isVideoAvailable?: boolean, status?: string) => async () => {
      if (!isVideoAvailable) {
        alert(t.videoNotAvailable);
        return;
      }

      const astrologer = astrologers.find((a) => String(a.id) === String(id));
      if (!astrologer) return;

      if (status === "offline") {
        alert(t.astrologerOffline);
        return;
      }

      if (status === "busy") {
        await openRequestModal(astrologer, "video", "busy");
        return;
      }

      if (status === "online") {
        await openRequestModal(astrologer, "video", "online");
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
        return t.busyDesc;
    }
  };

  // Navigate to astrologer details with ID
  const handleAstrologerPress = (id: string) => {
    router.push({
      pathname: "/(tabs)/astrologer-details",
      params: { id },
    });
  };
const renderHeader = () => (
  bestCouponOffer ? (
    <TouchableOpacity
      style={styles.couponOfferBanner}
      activeOpacity={0.85}
      onPress={() => router.push("/wallet")}
    >
      <ImageBackground
        source={require("../../assets/images/recharge-bg.png")}
        style={styles.couponOfferBackground}
        imageStyle={styles.couponOfferBackgroundImage}
      />

      <View style={styles.couponOfferOverlay} />

      <View style={styles.couponOfferInner}>
{/*
        <LinearGradient
          colors={["#FF9933", "#FF6B00"]}
          style={styles.couponOfferIcon}
        >
          <Feather name="gift" size={20} color="#FFFFFF" />
        </LinearGradient>
 */}
        <View style={styles.couponOfferContent}>
          <Text
            style={styles.couponOfferTitle}
            minimumFontScale={0.75}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {couponOfferText}
          </Text>

          <Text style={styles.couponOfferSubtitle} numberOfLines={1}>
            {t.rechargeSub}
          </Text>

          <Text style={styles.couponOfferSubline} numberOfLines={1}>
            {t.rechargeSub2}
          </Text>
        </View>

        <View style={styles.couponChevronWrap}>
          <Feather name="chevron-right" size={20} color="#fefdfd" />
        </View>
      </View>
    </TouchableOpacity>
  ) : null
);
  const renderItem = ({ item }: { item: Astrologer }) => (
    <View style={styles.card}>
      <View style={styles.cardGlow} />
      <LinearGradient
        colors={["rgba(74, 20, 140, 0.96)", "rgba(255, 153, 51, 0.18)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardTopAccent}
      />

      {/* PROFILE */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={() => handleAstrologerPress(item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.imageWrapper}>
          <LinearGradient
            colors={["#FFD700", "#FF9933", "#4A148C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imageFrame}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
          </LinearGradient>

          {item.founding === 1 && (
            <View style={styles.cornerFlag} pointerEvents="none">
              <LinearGradient
                colors={["#FFD700", "#FF9933"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cornerFlagBody}
              >
                <Feather name="award" size={8} color="#4A148C" />
              </LinearGradient>
              <View style={styles.cornerFlagTailLeft} />
              <View style={styles.cornerFlagTailRight} />
            </View>
          )}

          {/* STATUS DOT */}
        </View>

        <View style={styles.profileInfo}>
          {/* NAME + RATING */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.displayName || item.name}
            </Text>
            {item.rankDisplay === 1 && (
              <LinearGradient
                colors={["#FFF8D8", "#FFE58A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ratingBadge}
              >
                <Feather name="star" color="#9A4B00" size={12} />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </LinearGradient>
            )}
          </View>

          {/* SPECIALTY (MAX 3) */}
          <Text style={styles.specialty} numberOfLines={1}>
            <Feather name="award" size={12} color="#B66A00" />{" "}
            {item.specialty.slice(0, 2).join(", ")}
            {item.specialty && item.specialty.length > 2 && (
              <Text
                style={[styles.languageTagSpecialty, styles.moreTagSpecialty]}
              >
                , +{item.specialty.length - 2} more
              </Text>
            )}{" "}
          </Text>

          <View style={styles.languagesRow}>
            {item.languages.slice(0, 3).map((lang, idx) => (
              <Text key={idx} style={styles.languageTag}>
                {LANGUAGE_LABELS[lang] ?? lang}
              </Text>
            ))}
          </View>
{/* 
          <View style={styles.languagesRow}>
            {item.specializations?.slice(0, 3).map((spec, idx) => (
              <Text key={idx} style={styles.languageTag}>
                {LANGUAGE_LABELS[spec] ?? spec}
              </Text>
            ))}

            {item.specializations && item.specializations.length > 2 && (
              <Text style={[styles.languageTag, styles.moreTag]}>
                +{item.specializations.length - 2} more
              </Text>
            )}
          </View>
*/}
          {/* EXPERIENCE + STATUS */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              <Feather name="clock" size={11} /> {item.experience}{" "}
              {t.yearsExperience}
            </Text>

            <View style={styles.statusTextBadge}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status) },
                ]}
              >
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        {/* CALL */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            !item.isAudioAvailable && styles.disabledBtn,
          ]}
          onPress={handleAudioCall(item.id, item.isAudioAvailable, item.status)}
        >
          <LinearGradient
            colors={
              item.isAudioAvailable ? ["#22C55E", "#15803D"] : ["#CCC", "#AAA"]
            }
            style={styles.gradientBtn}
          >
            <Feather name="phone" color="#FFF" size={16} />
            <Text style={styles.actionBtnText}>
              ₹{getTotalRate(item.callRate, item.audioPlatformFee)}
              {t.min}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* VIDEO */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            !item.isVideoAvailable && styles.disabledBtn,
          ]}
          onPress={handleVideoCall(item.id, item.isVideoAvailable, item.status)}
        >
          <LinearGradient
            colors={
              item.isVideoAvailable ? ["#6D28D9", "#4A148C"] : ["#CCC", "#AAA"]
            }
            style={styles.gradientBtn}
          >
            <Feather name="video" color="#FFF" size={16} />
            <Text style={styles.actionBtnText}>
              ₹{getTotalRate(item.videoRate, item.videoPlatformFee)}
              {t.min}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* CHAT */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            // styles.chatBtnWrapper,
            !item.isChatAvailable && styles.disabledBtn,
          ]}
          onPress={handleChat(item.id, item.isChatAvailable, item.status)}
        >
          <LinearGradient
            colors={
              item.isChatAvailable ? ["#FFD700", "#FF9933"] : ["#CCC", "#AAA"]
            }
            style={styles.gradientBtn}
          >
            <Feather name="message-circle" color="#FFF" size={16} />
            <Text style={styles.actionBtnText}>
              ₹{getTotalRate(item.chatRate, item.chatPlatformFee)}
              {t.min}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredAstrologers = getFilteredAndSortedAstrologers();

  const couponOfferText = bestCouponOffer
    ? t.rechargeOffer.replace(
        "{percent}",
        String(bestCouponOffer.bonus_percent),
      )
    : "";

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2A0B4F" />

      <Header
        ref={headerRef}
        variant="home"
        onProfilePress={() => router.push("/profile")}
      />
      <ForceUpdateChecker />

     
<FlatList
  data={loading ? skeletonData : filteredAstrologers}
  keyExtractor={(item) => String(item.id)}

  renderItem={({ item }) => {
    if (loading) {
      return <SkeletonAstrologerCard />;
    }

    return renderItem({ item: item as Astrologer });
  }}

  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}

  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  }
  ListHeaderComponent={renderHeader()}
  ListHeaderComponentStyle={styles.listHeader}
  ListFooterComponent={<View style={{ height: 180 }} />}
/>
 {/* Filter Button */}
      <View style={styles.filterButtonContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
          <Feather name="sliders" size={12} color="#4A148C" />
          <Text style={styles.filterButtonText}>{t.filters}</Text>
          {(selectedLanguageFilter !== "All" ||
            selectedCategory !== "All" ||
            sortBy !== "rating") && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>
      <Modal
        visible={showNoticeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoticeModal(false)}
      >
        <Pressable
          style={styles.noticeOverlay}
          onPress={() => setShowNoticeModal(false)}
        >
          <Pressable
            style={styles.noticeCard}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.noticeCloseButton}
              onPress={() => setShowNoticeModal(false)}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Notice Image */}
            {notice?.image ? (
              <Image
                source={{ uri: notice.image }}
                style={styles.noticeImage}
                resizeMode="cover"
              />
            ) : null}

            {/* Button */}
            {notice?.button_name ? (
              <TouchableOpacity
                style={styles.noticeButton}
                onPress={() => {
                  setShowNoticeModal(false);

                  if (notice.redirect_url) {
                    router.push(notice.redirect_url as any);
                  }
                }}
              >
                <Text style={styles.noticeButtonText}>
                  {notice.button_name}
                </Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {/* Language Filter */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Language</Text>
                <View style={styles.modalOptions}>
                  {getLanguages().map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.modalChip,
                        tempLanguageFilter === lang && styles.modalChipActive,
                      ]}
                      onPress={() => setTempLanguageFilter(lang)}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          tempLanguageFilter === lang &&
                            styles.modalChipTextActive,
                        ]}
                      >
                        {lang === "All" ? "All" : toTitleCase(lang)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Category</Text>
                <View style={styles.modalOptions}>
                  {getCategories().map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.modalChip,
                        tempCategory === cat && styles.modalChipActive,
                      ]}
                      onPress={() => setTempCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          tempCategory === cat && styles.modalChipTextActive,
                        ]}
                      >
                        {cat === "All" ? "All" : toTitleCase(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Specialization Filter */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Specialization</Text>

                <View style={styles.modalOptions}>
                  {getSpecializations().map((spec) => (
                    <TouchableOpacity
                      key={spec}
                      style={[
                        styles.modalChip,
                        tempSpecialization === spec && styles.modalChipActive,
                      ]}
                      onPress={() => setTempSpecialization(spec)}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          tempSpecialization === spec &&
                            styles.modalChipTextActive,
                        ]}
                      >
                        {spec === "All" ? "All" : toTitleCase(spec)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Sort By</Text>
                <View style={styles.modalOptions}>
                  {[
                    { key: "rating", label: "Rating" },
                    { key: "experience", label: "Experience" },
                    { key: "price", label: "Price" },
                  ].map((sort) => (
                    <TouchableOpacity
                      key={sort.key}
                      style={[
                        styles.modalChip,
                        tempSortBy === sort.key && styles.modalChipActive,
                      ]}
                      onPress={() => setTempSortBy(sort.key)}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          tempSortBy === sort.key && styles.modalChipTextActive,
                        ]}
                      >
                        {sort.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>{t.reset}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>{t.apply}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <InsufficientBalanceModal
        visible={showBalanceModal}
        balance={coins}
        required={requiredAmount}
        lang={language as "en" | "hi" | "bn"}
        onRecharge={() => {
          setShowBalanceModal(false);
          router.push("/wallet"); // or recharge screen
        }}
        onCancel={() => setShowBalanceModal(false)}
      />
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

      <Modal visible={showPendingModal} transparent animationType="fade">
        <View style={styles.audioModalOverlay}>
          <View style={styles.audioModalCard}>
            <Text style={styles.audioModalTitle}>{t.pendingRequestTitle}</Text>

            <Text style={styles.audioModalDesc}>
              {t.pendingRequestDesc.replace("{name}", pendingAstrologerName)}

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
                onPress={() => setShowPendingModal(false)}
              >
                <Text style={styles.audioCancelText}>{t.ok}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
 <LowBalanceModal
  visible={showLowBalanceModal}
  onRecharge={() => {
    setShowLowBalanceModal(false);
  }}
  onClose={() => { 
    setShowLowBalanceModal(false);
  }}
/>
      {/* Request Details Modal */}
      <Modal
        visible={showAudioModal}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={closeRequestModal}
      >
        <View style={styles.audioModalOverlay}>
          <View style={[styles.audioModalCard, styles.requestModalCard]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.requestModalKeyboard}
            >
              {/* HEADER */}
              <View style={styles.requestModalHeader}>
                {activeRequestConfig && (
                  <View
                    style={[
                      styles.requestModalIconWrap,
                      {
                        backgroundColor: activeRequestConfig.color + "20",
                      },
                    ]}
                  >
                    <Feather
                      name={activeRequestConfig.icon as any}
                      size={24}
                      color={activeRequestConfig.color}
                    />
                  </View>
                )}

                <View style={styles.requestModalHeadingBlock}>
                  <Text style={styles.audioModalTitle}>
                    {t.confirmRequestTitle}
                  </Text>

                  <Text style={styles.requestModalSubtitle}>
                    {requestModalMode === "busy"
                      ? getBusyDesc()
                      : t.confirmRequestDesc}
                  </Text>
                </View>
              </View>

              {/* BODY */}
              {requestProfileLoading ? (
                <View style={styles.requestLoadingState}>
                  <ActivityIndicator color="#4A148C" />

                  <Text style={styles.requestLoadingText}>{t.loading}</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.requestModalScroll}
                  contentContainerStyle={styles.requestModalContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {requestProfileError ? (
                    <Text style={styles.requestModalError}>
                      {requestProfileError}
                    </Text>
                  ) : null}

                  {/* NAME */}
                  <View style={styles.requestField}>
                    <Text style={styles.requestLabel}>{t.fullName}</Text>

                    <TextInput
                      style={styles.requestInput}
                      value={requestDraft.fullName}
                      onChangeText={(text) => {
                        setRequestProfileError("");

                        setRequestDraft((prev) => ({
                          ...prev,
                          fullName: text,
                        }));
                      }}
                      placeholder={t.fullName}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  {/* DATE OF BIRTH */}
                  <View style={styles.requestField}>
                    <Text style={styles.requestLabel}>{t.dateOfBirth}</Text>

                    <TouchableOpacity
                      style={styles.requestPickerButton}
                      onPress={() => setShowRequestDatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.requestPickerButtonText,
                          !requestDraft.dateOfBirth && styles.placeholderText,
                        ]}
                      >
                        {requestDraft.dateOfBirth
                          ? formatDateLabel(requestDraft.dateOfBirth)
                          : t.dateOfBirth}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* TIME OF BIRTH */}
                  <View style={styles.requestField}>
                    <Text style={styles.requestLabel}>{t.timeOfBirth}</Text>

                    <TouchableOpacity
                      style={styles.requestPickerButton}
                      onPress={() => setShowRequestTimePicker(true)}
                    >
                      <Text
                        style={[
                          styles.requestPickerButtonText,
                          !requestDraft.timeOfBirth && styles.placeholderText,
                        ]}
                      >
                        {requestDraft.timeOfBirth
                          ? formatTimeLabel(requestDraft.timeOfBirth)
                          : t.timeOfBirth}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.updateProfileCheckboxRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setUnknownBirthTime((prev) => !prev);
                      if (!unknownBirthTime) setRequestDraft((prev) => ({ ...prev, timeOfBirth: null }));
                    }}
                  >
                    <View style={[styles.updateProfileCheckbox, unknownBirthTime && styles.updateProfileCheckboxChecked]}>
                      {unknownBirthTime ? <Feather name="check" size={15} color="#FFFFFF" /> : null}
                    </View>
                    <Text style={styles.updateProfileCheckboxText}>{t.unknownBirthTime}</Text>
                  </TouchableOpacity>

                  {/* BIRTH LOCATION */}
                  <View style={styles.requestField}>
                    <Text style={styles.requestLabel}>{t.birthLocation}</Text>

                    <TextInput
                      style={styles.requestInput}
                      value={requestDraft.location}
                      onChangeText={handleRequestLocationChange}
                      placeholder={t.searchLocation}
                      placeholderTextColor="#94A3B8"
                    />

                    {requestDraft.location.trim().length >= 2 &&
                    (!requestDraft.latitude || !requestDraft.longitude) ? (
                      <Text style={styles.locationHint}>
                        {t.selectLocation}
                      </Text>
                    ) : null}

                    {requestLocationSuggestions.length > 0 && (
                      <View style={styles.locationDropdown}>
                        {requestLocationSuggestions.map((suggestion, index) => (
                          <TouchableOpacity
                            key={`${suggestion.display_name}-${index}`}
                            style={styles.locationOption}
                            onPress={() =>
                              handleRequestLocationSelect(suggestion)
                            }
                          >
                            <Text
                              style={styles.locationOptionText}
                              numberOfLines={2}
                            >
                              {suggestion.display_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* LATITUDE / LONGITUDE */}
             {/*     <View style={styles.coordinateRow}>
                    <View style={styles.coordinateCard}>
                      <Text style={styles.coordinateLabel}>{t.latitude}</Text>

                      <Text style={styles.coordinateValue} numberOfLines={1}>
                        {requestDraft.latitude || "-"}
                      </Text>
                    </View>

                    <View style={styles.coordinateCard}>
                      <Text style={styles.coordinateLabel}>{t.longitude}</Text>

                      <Text style={styles.coordinateValue} numberOfLines={1}>
                        {requestDraft.longitude || "-"}
                      </Text>
                    </View>
                  </View>
 */}


                  {/* UPDATE PROFILE */}
{/* UPDATE PROFILE CHECKBOX */}
<TouchableOpacity
  style={styles.updateProfileCheckboxRow}
  activeOpacity={0.7}
  onPress={() => setUpdateProfile((prev) => !prev)}
>
  <View
    style={[
      styles.updateProfileCheckbox,
      updateProfile && styles.updateProfileCheckboxChecked,
    ]}
  >
    {updateProfile && (
      <Feather
        name="check"
        size={15}
        color="#FFFFFF"
      />
    )}
  </View>

  <Text style={styles.updateProfileCheckboxText}>
    {t.updateProfile}
  </Text>
</TouchableOpacity>

                  {/* ACTION BUTTONS */}
                  <View style={styles.audioModalActions}>
                    <TouchableOpacity
                      style={styles.audioCancelBtn}
                      onPress={closeRequestModal}
                    >
                      <Text style={styles.audioCancelText}>{t.cancel}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.audioOkBtn}
                      onPress={() => {
                        if (selectedAstrologer && callType) {
                          sendCallRequest(selectedAstrologer.id, callType);
                        }
                      }}
                      disabled={sendingRequest}
                    >
                      {sendingRequest ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.audioOkText}>{t.sendRequest}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* EXTRA BOTTOM SPACE */}
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {showRequestDatePicker && (
        <DateTimePicker
          value={requestDraft.dateOfBirth || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={handleRequestDateChange}
        />
      )}

      {showRequestTimePicker && (
        <DateTimePicker
          value={requestDraft.timeOfBirth || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleRequestTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7A637D",
    fontWeight: "700",
  },
  placeholderText: {
    color: "#94A3B8",
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4A148C",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7A637D",
    fontWeight: "700",
  },
  foundingText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "500",
    color: "#69b704",
  },
couponOfferBanner: {
  width: SCREEN_WIDTH-10,
  marginLeft: -14,
  marginRight: -14,
  marginTop: 8,
  marginBottom: 5,
  minHeight: 112,
  padding: 0,
  borderRadius: 18,
  flexDirection: "row",
  alignItems: "center",
  overflow: "hidden",
  position: "relative",
  backgroundColor: "transparent",
  borderWidth: 1,
  borderColor: "rgba(255, 153, 51, 0.3)",
  shadowColor: "#FF6B00",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 3,
  alignSelf: "center",
},
couponOfferIcon: {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},
couponOfferContent: {
  flex: 1,
  minWidth: 0,
},
couponOfferTitle: {
  fontSize: Math.max(19, Math.min(28, 24 * scale)),
  lineHeight: Math.max(31, Math.min(39, 34 * scale)),
  fontWeight: "900",
  color: "#FFFFFF",
  textAlign: "center",
  includeFontPadding:true,
  textShadowColor: "rgba(0, 0, 0, 0.8)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
},
couponOfferSubtitle: {
  marginTop: 1,
  fontSize: Math.max(13, Math.min(17, 15 * scale)),
  lineHeight: Math.max(21, Math.min(28, 24 * scale)),
  fontWeight: "800",
  color: "#FFF4D6",
  textAlign: "center",
  textShadowColor: "rgba(0, 0, 0, 0.8)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
},
couponOfferSubline: {
  marginTop: 1,
  fontSize: Math.max(11, Math.min(14, 12 * scale)),
  lineHeight: Math.max(18, Math.min(23, 20 * scale)),
  fontWeight: "600",
  color: "#FFE3A3",
  textAlign: "center",
  textShadowColor: "rgba(0, 0, 0, 0.8)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
},
couponCodePill: {
  alignSelf: "flex-start",
  marginTop: 6,
  paddingVertical: 3,
  paddingHorizontal: 8,
  borderRadius: 8,
  backgroundColor: "rgba(255, 107, 0, 0.12)",
},
couponOfferCode: {
  fontSize: 12,
  fontWeight: "800",
  color: "#B66A00",
  letterSpacing: 0.5,
},
couponChevronWrap: {
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(241, 188, 150, 0.38)",
  marginLeft: 6,
},
  filterButtonContainer: {
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 2,
    borderBottomWidth: 0,
    borderBottomColor: "rgba(74, 20, 140, 0.08)",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 18,
    gap: 8,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4A148C",
  },
  filterActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF9933",
    position: "absolute",
    top: 8,
    right: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    paddingBottom: 24,
  },
  modalContent: {
    backgroundColor: "#FFFDF8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    width: "100%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74, 20, 140, 0.08)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2B164C",
  },
  modalBody: {
    flex: 1,
    minHeight: 0,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFF7EA",
    borderWidth: 1.5,
    borderColor: "rgba(74, 20, 140, 0.1)",
  },
  modalChipActive: {
    backgroundColor: "#4A148C",
    borderColor: "#4A148C",
  },
  modalChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  modalChipTextActive: {
    color: "#FFF",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(74, 20, 140, 0.08)",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFF7EA",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#4A148C",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
  },
  listHeader: {
    width: "100%",
    alignSelf: "stretch",
  },
  card: {
    marginBottom: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E4E4E4",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardGlow: {
    display: "none",
  },
  cardTopAccent: {
    display: "none",
  },
  profileSection: {
    flexDirection: "row",
    marginBottom: 12,
    minWidth: 0,
  },
  imageWrapper: {
    position: "relative",
  },
  imageFrame: {
    width: Math.max(56, Math.min(72, 64 * scale)),
    height: Math.max(56, Math.min(72, 64 * scale)),
    borderRadius: 999,
    padding: 3,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F4EBDD",
  },
  imageStatusDot: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  statusBadge: {
    position: "relative",

    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  online: {
    backgroundColor: "#4ADE80",
  },
  offline: {
    backgroundColor: "#94A3B8",
  },
  profileInfo: {
    flex: 1,
    marginLeft: Math.max(10, 14 * scale),
    justifyContent: "space-between",
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    gap: 8,
  },
  name: {
   fontSize: Math.max(14, Math.min(18, 16 * scale)),
    fontWeight: "800",
    color: "#171717",
    flex: 1,
    minWidth: 0,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.38)",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  specialty: {
    fontSize: Math.max(10, Math.min(15, 12 * scale)),
    color: "#858585",
    marginBottom: 3,
    fontWeight: "700",
  },
  languagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 3,
  },
  languageTag: {
    fontSize: Math.max(10, Math.min(14, 12 * scale)),
    fontWeight: "600",
    color: "#858585",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: Math.max(11, Math.min(15, 13 * scale)),
    color: "#8A8A8A",
    fontWeight: "700",
  },
  statusTextBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    textAlign: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.1)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  statusTextOnline: {
    color: "#22C55E",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    gap: 6,
    flexWrap: "wrap",
  },

  actionBtn: {
    flex: 1,
    minWidth: 78,
    borderRadius: 13,
    overflow: "hidden",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Math.max(8, Math.min(13, 10 * scale)),
    gap: Math.max(3, 5 * scale),
  },

  actionBtnText: {
    color: "#FFF",
    fontSize: Math.max(10, Math.min(15, 12 * scale)),
    fontWeight: "700",
  },

  disabledBtn: {
    opacity: 0.6,
  },

  moreTag: {
    fontWeight: "bold",
    color: "#B66A00",
  },
  moreTagSpecialty: {
    fontWeight: "bold",
    color: "#B66A00",
  },
  languageTagSpecialty: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B7BEC",
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    height: "86%",
    maxHeight: "86%",
    alignItems: "stretch",
    paddingVertical: 20,
    justifyContent: "flex-start",
  },
  requestModalKeyboard: {
    width: "100%",
    flex: 1,
  },
  requestModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  requestModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  requestModalHeadingBlock: {
    flex: 1,
    minWidth: 0,
  },
  requestModalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 18,
  },
  requestLoadingState: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  requestLoadingText: {
    marginTop: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  requestModalScroll: {
    width: "100%",
    flex: 1,
  },
  requestModalContent: {
    paddingBottom: 8,
  },
  requestModalError: {
    backgroundColor: "#FEF2F2",
    color: "#991B1B",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 12,
    fontWeight: "600",
  },
  requestField: {
    marginBottom: 14,
  },
  requestLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4A148C",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  requestInput: {
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.16)",
    backgroundColor: "#FFFDF8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
  },
  requestPickerButton: {
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.16)",
    backgroundColor: "#FFFDF8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  requestPickerButtonText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  locationHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
  },
  locationDropdown: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.12)",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  locationOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.16)",
  },
  locationOptionText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  coordinateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  coordinateCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.12)",
    backgroundColor: "#F8F6FF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coordinateLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  coordinateValue: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "700",
  },
  requestUpdateProfileButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#4A148C",
    backgroundColor: "#F8F4FF",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  requestUpdateProfileText: {
    color: "#4A148C",
    fontWeight: "800",
    fontSize: 14,
  },
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
  cornerFlag: {
    position: "absolute",
    top: -4,
    right: 2,
    alignItems: "center",
    zIndex: 10,
  },
  cornerFlagBody: {
    width: 12,
    paddingTop: 5,
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  // two triangles under the flag body create the pointed pennant tail
  cornerFlagTailLeft: {
    position: "absolute",
    bottom: -6,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: "#B8860B",
    borderRightWidth: 10,
    borderRightColor: "transparent",
  },
  cornerFlagTailRight: {
    position: "absolute",
    bottom: -6,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: "#B8860B",
    borderLeftWidth: 10,
    borderLeftColor: "transparent",
  },
  noticeOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  noticeCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    paddingBottom: 18,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },

  noticeCloseButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  noticeImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F4EBDD",
  },

  noticeButton: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: "#4A148C",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  updateProfileCheckboxRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 12,
  marginBottom: 8,
},

updateProfileCheckbox: {
  width: 20,
  height: 20,
  borderWidth: 1.5,
  borderColor: "#CBD5E1",
  borderRadius: 5,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
  backgroundColor: "#FFFFFF",
},

updateProfileCheckboxChecked: {
  backgroundColor: "#7C3AED",
  borderColor: "#7C3AED",
},
couponOfferBackground: {
  ...StyleSheet.absoluteFillObject,
},

couponOfferBackgroundImage: {
  width: "100%",
  height: "100%",
  resizeMode: "stretch",
  opacity: 0.95,
},

couponOfferOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(12, 2, 30, 0.48)",
},

couponOfferInner: {
  flex: 1,
  minHeight: 112,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 8,
},

updateProfileCheckboxText: {
  fontSize: 14,
  color: "#334155",
  fontWeight: "500",
},
skeletonProfileRow: {
  flexDirection: "row",
  alignItems: "center",
},

skeletonImage: {
  width: 78,
  height: 78,
  borderRadius: 39,
  backgroundColor: "#E2E8F0",
},

skeletonName: {
  width: "65%",
  height: 18,
  borderRadius: 6,
  backgroundColor: "#E2E8F0",
  marginBottom: 10,
},

skeletonLine: {
  width: "85%",
  height: 12,
  borderRadius: 6,
  backgroundColor: "#E2E8F0",
  marginBottom: 8,
},

skeletonLineSmall: {
  width: "55%",
  height: 12,
  borderRadius: 6,
  backgroundColor: "#E2E8F0",
  marginBottom: 8,
},

skeletonActions: {
  flexDirection: "row",
  gap: 8,
  marginTop: 16,
},

skeletonButton: {
  flex: 1,
  height: 38,
  borderRadius: 10,
  backgroundColor: "#E2E8F0",
},
});
