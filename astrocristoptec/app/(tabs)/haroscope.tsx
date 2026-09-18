import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import DailyGlanceCard from "../components/DailyAtAGlance";

import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageSourcePropType,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE_URL = "https://bhavishyakatha.in/express/api/client";

// Key used to persist / restore the user's chosen language across app
// launches. Same key is expected to be used elsewhere in the app (e.g. a
// settings / onboarding screen) so the two stay in sync.
const LANGUAGE_STORAGE_KEY = "user-language";

type LanguageCode = "en" | "bn" | "hi";

type HoroscopeCategoryKey =
  | "career_business"
  | "family"
  | "love_relationships"
  | "finance"
  | "health_wellbeing";

type HoroscopeCategoryContent = Partial<
  Record<HoroscopeCategoryKey, string>
>;

type HoroscopeSummary = {
  header: string;
  body: string;
};

type ZodiacSign = {
  key: string;
  label_bn: string;
  label_hi: string;
};

const ZODIAC_SIGNS: ZodiacSign[] = [
  { key: "Aries", label_bn: "মেষ রাশি", label_hi: "मेष राशि" },
  { key: "Taurus", label_bn: "বৃষ রাশি", label_hi: "वृषभ राशि" },
  { key: "Gemini", label_bn: "মিথুন রাশি", label_hi: "मिथुन राशि" },
  { key: "Cancer", label_bn: "কর্কট রাশি", label_hi: "कर्क राशि" },
  { key: "Leo", label_bn: "সিংহ রাশি", label_hi: "सिंह राशि" },
  { key: "Virgo", label_bn: "কন্যা রাশি", label_hi: "कन्या राशि" },
  { key: "Libra", label_bn: "তুলা রাশি", label_hi: "तुला राशि" },
  { key: "Scorpio", label_bn: "বৃশ্চিক রাশি", label_hi: "वृश्चिक राशि" },
  { key: "Sagittarius", label_bn: "ধনু রাশি", label_hi: "धनु राशि" },
  { key: "Capricorn", label_bn: "মকর রাশি", label_hi: "मकर राशि" },
  { key: "Aquarius", label_bn: "কুম্ভ রাশি", label_hi: "कुंभ राशि" },
  { key: "Pisces", label_bn: "মীন রাশি", label_hi: "मीन राशि" },
];

const ZODIAC_IMAGES: Record<string, ImageSourcePropType> = {
  Aries: require("../../assets/images/zodiac/aries.png"),
  Taurus: require("../../assets/images/zodiac/taurus.png"),
  Gemini: require("../../assets/images/zodiac/gemini.png"),
  Cancer: require("../../assets/images/zodiac/cancer.png"),
  Leo: require("../../assets/images/zodiac/leo.png"),
  Virgo: require("../../assets/images/zodiac/virgo.png"),
  Libra: require("../../assets/images/zodiac/libra.png"),
  Scorpio: require("../../assets/images/zodiac/scorpio.png"),
  Sagittarius: require("../../assets/images/zodiac/sagittarius.png"),
  Capricorn: require("../../assets/images/zodiac/capricorn.png"),
  Aquarius: require("../../assets/images/zodiac/aquarius.png"),
  Pisces: require("../../assets/images/zodiac/pisces.png"),
};

// =====================================================
// HOROSCOPE TYPES
// =====================================================

type HoroscopeData = {
  id: number;

  sign: string;
  horoscope_date: string;
  language: string;
  weekday: string;

  summary: HoroscopeSummary;
  summary_bn: HoroscopeSummary;
  summary_hi: HoroscopeSummary;

  focus_areas: HoroscopeCategoryContent;
  focus_areas_bn: HoroscopeCategoryContent;
  focus_areas_hi: HoroscopeCategoryContent;

  cautions: string[];
  cautions_bn: string[];
  cautions_hi: string[];

  disclaimer?: string;
  disclaimer_bn?: string;
  disclaimer_hi?: string;

  interpretation_summary?: string;
  interpretation_summary_bn?: string;
  interpretation_summary_hi?: string;

  // Snapshot fields shown on the dark "today's reading" card. These are
  // optional because older API payloads may not include them yet — the UI
  // falls back to a placeholder ("--") whenever a field is missing.
  lucky_color?: string; // human-readable color name, e.g. "Saffron"
  lucky_color_hex?: string; // hex value, e.g. "#2AACB8"
  mood?: string;
  lucky_number?: string | number;
  // Best time of day is the same regardless of language, so there is
  // intentionally only one field (no _bn / _hi variants).
  best_time?: string;

  // Optional category breakdowns. When present they render as the
  // percentage cards (love / career) seen in the reference design.
  ratings?: Record<string, number>;
  rating_stars?: Record<string, string>;

  api_response?: unknown;

  created_at?: string;
  updated_at?: string;
};

// =====================================================
// RAW API TYPE
// =====================================================

type RawHoroscopeData = Omit<
  HoroscopeData,
  | "focus_areas"
  | "focus_areas_bn"
  | "focus_areas_hi"
  | "summary"
  | "summary_bn"
  | "summary_hi"
  | "cautions"
  | "cautions_bn"
  | "cautions_hi"
  | "ratings"
  | "rating_stars"
> & {
  focus_areas: unknown;
  focus_areas_bn: unknown;
  focus_areas_hi: unknown;

  cautions: unknown;
  cautions_bn: unknown;
  cautions_hi: unknown;
  ratings: unknown;
  rating_stars: unknown;
  summary: unknown;
  summary_bn: unknown;
  summary_hi: unknown;
};

// =====================================================
// PARSE JSON ARRAY
// =====================================================

const CATEGORY_KEYS: HoroscopeCategoryKey[] = [
  "career_business",
  "family",
  "love_relationships",
  "finance",
  "health_wellbeing",
];

const parseCategoryField = (field: unknown): HoroscopeCategoryContent => {
  let value = field;

  if (typeof field === "string") {
    try {
      value = JSON.parse(field);
    } catch {
      return {};
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, item]) =>
          CATEGORY_KEYS.includes(key as HoroscopeCategoryKey) &&
          typeof item === "string"
      )
    ) as HoroscopeCategoryContent;
  }

  return {};
};

const parseSummaryField = (field: unknown): HoroscopeSummary => {
  let value = field;

  if (typeof field === "string") {
    try {
      value = JSON.parse(field);
    } catch {
      return { header: "", body: field };
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const summary = value as { header?: unknown; body?: unknown };
    return {
      header: typeof summary.header === "string" ? summary.header : "",
      body: typeof summary.body === "string" ? summary.body : "",
    };
  }

  return { header: "", body: "" };
};

const parseListField = (field: unknown): string[] => {
  if (Array.isArray(field)) {
    return field.filter((item): item is string => typeof item === "string");
  }

  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return field.trim() ? [field.trim()] : [];
    }
  }

  return [];
};

const parseRatings = (field: unknown): Record<string, number> => {
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(field).filter(
      ([, value]) => typeof value === "number" && Number.isFinite(value)
    )
  );
};

const parseRatingStars = (field: unknown): Record<string, string> => {
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(field).filter(([, value]) => typeof value === "string")
  ) as Record<string, string>;
};

const normalizeHexColor = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : undefined;
};

// Picks the localized value for the current language, falling back to the
// English value if a Hindi/Bengali translation hasn't been supplied yet.
const pickText = (
  language: LanguageCode,
  en: string | undefined,
  bn: string | undefined,
  hi: string | undefined
): string | undefined => {
  if (language === "bn") return bn ?? en;
  if (language === "hi") return hi ?? en;
  return en;
};

const pickSummary = (
  language: LanguageCode,
  en: HoroscopeSummary | undefined,
  bn: HoroscopeSummary | undefined,
  hi: HoroscopeSummary | undefined
): HoroscopeSummary | undefined => {
  if (language === "bn") return bn ?? en;
  if (language === "hi") return hi ?? en;
  return en;
};

// Same as pickText but for list fields — falls back to the English list if
// the localized list is missing or empty.
const pickList = (
  language: LanguageCode,
  en: string[] | undefined,
  bn: string[] | undefined,
  hi: string[] | undefined
): string[] | undefined => {
  if (language === "bn") return bn && bn.length > 0 ? bn : en;
  if (language === "hi") return hi && hi.length > 0 ? hi : en;
  return en;
};

const pickCategoryContent = (
  language: LanguageCode,
  en: HoroscopeCategoryContent | undefined,
  bn: HoroscopeCategoryContent | undefined,
  hi: HoroscopeCategoryContent | undefined
): HoroscopeCategoryContent => {
  if (language === "bn") return bn && Object.keys(bn).length > 0 ? bn : en ?? {};
  if (language === "hi") return hi && Object.keys(hi).length > 0 ? hi : en ?? {};
  return en ?? {};
};

// Formats horoscope_date ("YYYY-MM-DD" or any parseable date string) into
// "Weekday, D Mon YYYY" (e.g. "Wednesday, 19 Aug 2026"), in the given
// language. Falls back to the raw string if it can't be parsed.
const formatDisplayDate = (
  rawDate: string | undefined,
  language: LanguageCode
): string => {
  if (!rawDate) return "";

  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) return rawDate;

  const locale =
    language === "bn" ? "bn-BD" : language === "hi" ? "hi-IN" : "en-US";

  return parsed.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Simple deterministic star field for the hero card background.
const STAR_DOTS = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  top: `${(i * 37) % 100}%`,
  left: `${(i * 53) % 100}%`,
  size: i % 3 === 0 ? 3 : 2,
  opacity: i % 2 === 0 ? 0.8 : 0.4,
}));

// Decorative icon shown next to each hero stat. Purely visual — does not
// touch any horoscope data or logic.
const HERO_STAT_ICONS: Record<
  "luckyColor" | "mood" | "luckyNumber" | "bestTime",
  keyof typeof Feather.glyphMap
> = {
  luckyColor: "droplet",
  mood: "smile",
  luckyNumber: "hash",
  bestTime: "clock",
};

// =====================================================
// SCREEN
// =====================================================

const HoroscopeScreen = () => {
  const [selectedSign, setSelectedSign] = useState<string | null>('Aries');

  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [language, setLanguage] = useState<LanguageCode>("en");
  const [languageLoaded, setLanguageLoaded] = useState(false);

  // ===================================================
  // RESTORE LANGUAGE FROM ASYNC STORAGE
  // ===================================================

  useEffect(() => {
    (async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(
          LANGUAGE_STORAGE_KEY
        );

        if (
          storedLanguage === "en" ||
          storedLanguage === "bn" ||
          storedLanguage === "hi"
        ) {
          setLanguage(storedLanguage);
        }
      } catch (err) {
        console.error("Failed to load stored language:", err);
      } finally {
        setLanguageLoaded(true);
      }
    })();
  }, []);

  const handleLanguageChange = async (next: LanguageCode) => {
    setLanguage(next);

    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch (err) {
      console.error("Failed to persist language:", err);
    }
  };

  // ===================================================
  // FETCH HOROSCOPE
  // ===================================================
useEffect(() => {
  if (languageLoaded) {
    fetchHoroscope("Aries");
  }
}, [languageLoaded]);
  const fetchHoroscope = async (sign: string) => {
    try {
      setSelectedSign(sign);
      setLoading(true);
      setError("");
      setHoroscope(null);

      const response = await fetch(
        `${API_BASE_URL}/horoscope/daily/${encodeURIComponent(sign)}`
      );

      const result: {
        success: boolean;
        message?: string;
        data: RawHoroscopeData;
      } = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch horoscope");
      }

      const data = result.data;

      setHoroscope({
        ...data,
        summary: parseSummaryField(data.summary),
        summary_bn: parseSummaryField(data.summary_bn),
        summary_hi: parseSummaryField(data.summary_hi),
        focus_areas: parseCategoryField(data.focus_areas),
        focus_areas_bn: parseCategoryField(data.focus_areas_bn),
        focus_areas_hi: parseCategoryField(data.focus_areas_hi),
        cautions: parseListField(data.cautions),
        cautions_bn: parseListField(data.cautions_bn),
        cautions_hi: parseListField(data.cautions_hi),
        ratings: parseRatings(data.ratings),
        rating_stars: parseRatingStars(data.rating_stars),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";

      console.error("Horoscope error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const UI_STRINGS: Record<LanguageCode, Record<string, string>> = {
    en: {
      title: "Daily Horoscope",
      readyHeadline: "Your daily horoscope is ready!",
      luckyColor: "Lucky Color",
      mood: "Mood of the Day",
      luckyNumber: "Lucky Number",
      bestTime: "Best Time",
      sectionHeading: "Today's Horoscope",
      general: "General Outlook",
      career: "Career",
      interpretation: "Astrological Interpretation",
      ratings: "Star Ratings",
      careerBusiness: "Career & Business",
      family: "Family",
      loveRelationships: "Love & Relationships",
      wealth: "Wealth & Finance",
      healthWellbeing: "Health & Well-being",
      cautions: "Cautions",
      loading: "Reading the stars...",
      empty: "Tap a sign above to see today's prediction",
      consultWithAstrologer: "Need personal guidance? Talk to an astrologer",
    },
    bn: {
      title: "প্রতিদিনের রাশিফল",
      readyHeadline: "আপনার দৈনিক রাশিফল প্রস্তুত!",
      luckyColor: "লাকি কালার",
      mood: "দিনের মেজাজ",
      luckyNumber: "ভাগ্যবান সংখ্যা",
      bestTime: "দিনের সময়",
      sectionHeading: "প্রতিদিনের রাশিফল",
      general: "সামগ্রিক পরিস্থিতি",
      career: "কর্মজীবন",
      interpretation: "জ্যোতিষীয় বিশ্লেষণ",
      ratings: "তারকার মূল্যায়ন",
      careerBusiness: "কর্মজীবন ও ব্যবসা",
      family: "পরিবার",
      loveRelationships: "প্রেম ও সম্পর্ক",
      wealth: "অর্থ ও সম্পদ",
      healthWellbeing: "স্বাস্থ্য ও সুস্থতা",
      cautions: "সতর্কতা",
      loading: "গ্রহ-নক্ষত্র বিশ্লেষণ করা হচ্ছে...",
      empty: "আজকের রাশিফল দেখতে উপরের একটি রাশি নির্বাচন করুন",
      consultWithAstrologer: "ব্যক্তিগত পরামর্শ চান? একজন জ্যোতিষীর সাথে কথা বলুন",
    },
    hi: {
      title: "दैनिक राशिफल",
      readyHeadline: "आपका दैनिक राशिफल तैयार है!",
      luckyColor: "शुभ रंग",
      mood: "दिन का मूड",
      luckyNumber: "शुभ अंक",
      bestTime: "दिन का समय",
      sectionHeading: "आज का राशिफल",
      general: "सामग्रिक स्थिति",
      career: "करियर",
      interpretation: "ज्योतिषीय व्याख्या",
      ratings: "सितारा रेटिंग",
      careerBusiness: "करियर और व्यवसाय",
      family: "परिवार",
      loveRelationships: "प्रेम और रिश्ते",
      wealth: "धन और वित्त",
      healthWellbeing: "स्वास्थ्य और कल्याण",
      cautions: "सावधानियाँ",
      loading: "ग्रह-नक्षत्रों का विश्लेषण किया जा रहा है...",
      empty: "आज की भविष्यवाणी देखने के लिए ऊपर एक राशि चुनें",
      consultWithAstrologer: "व्यक्तिगत मार्गदर्शन चाहिए? ज्योतिषी से बात करें",
    },
  };

  const t = UI_STRINGS[language];

  if (!languageLoaded) {
    // Avoid a language flash while AsyncStorage is being read.
    return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  const focusAreas = pickCategoryContent(
    language,
    horoscope?.focus_areas,
    horoscope?.focus_areas_bn,
    horoscope?.focus_areas_hi
  );
  const cautions = pickList(
    language,
    horoscope?.cautions,
    horoscope?.cautions_bn,
    horoscope?.cautions_hi
  );
  const interpretation = pickText(
    language,
    horoscope?.interpretation_summary,
    horoscope?.interpretation_summary_bn,
    horoscope?.interpretation_summary_hi
  );
  const disclaimer = pickText(
    language,
    horoscope?.disclaimer,
    horoscope?.disclaimer_bn,
    horoscope?.disclaimer_hi
  );
  const summary = pickSummary(
    language,
    horoscope?.summary,
    horoscope?.summary_bn,
    horoscope?.summary_hi
  );
  const summaryText = summary?.body ?? "";

  const luckyColorHex = normalizeHexColor(horoscope?.lucky_color_hex);

  const categoryCards: {
    key: HoroscopeCategoryKey;
    ratingKey: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
    iconBackground: string;
    iconColor: string;
  }[] = [
    {
      key: "career_business",
      ratingKey: "career_business",
      label: t.careerBusiness,
      icon: "briefcase",
      color: "#2563EB",
      iconBackground: "#DBEAFE",
      iconColor: "#1D4ED8",
    },
    {
      key: "family",
      ratingKey: "family",
      label: t.family,
      icon: "users",
      color: "#16A34A",
      iconBackground: "#DCFCE7",
      iconColor: "#15803D",
    },
    {
      key: "love_relationships",
      ratingKey: "love",
      label: t.loveRelationships,
      icon: "heart",
      color: "#DB2777",
      iconBackground: "#FCE7F3",
      iconColor: "#DB2777",
    },
    {
      key: "finance",
      ratingKey: "wealth",
      label: t.wealth,
      icon: "dollar-sign",
      color: "#B45309",
      iconBackground: "#FEF3C7",
      iconColor: "#B45309",
    },
    {
      key: "health_wellbeing",
      ratingKey: "health",
      label: t.healthWellbeing,
      icon: "activity",
      color: "#0F766E",
      iconBackground: "#CCFBF1",
      iconColor: "#0F766E",
    },
  ];

  return (
    <SafeAreaView edges={["top"]}  style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B0836" />

      {/* =========================================
          HEADER
      ========================================== */}

  

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
<LinearGradient
  colors={["#1747C7", "#082A82", "#06175C"]}
  start={{ x: 0, y: 0 }}
  end={{ x: 0, y: 1 }}
  style={styles.ctaButton}
>
        <View style={styles.headerIconBadge}>
          <Feather name="star" size={16} color="#FFD700" />
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t.title}
        </Text>
        <View style={styles.headerIconBadge}>
          <Feather name="moon" size={16} color="#FFD700" />
        </View>
      </LinearGradient>
        {/* =========================================
            LANGUAGE SWITCH
        ========================================== */}

        <View style={styles.languageSwitch}>
          {(
            [
              { code: "en" as LanguageCode, label: "English" },
              { code: "bn" as LanguageCode, label: "বাংলা" },
              { code: "hi" as LanguageCode, label: "हिन्दी" },
            ]
          ).map((option) => {
            const isActive = language === option.code;

            return (
              <TouchableOpacity
                key={option.code}
                activeOpacity={0.8}
                style={[
                  styles.languageButton,
                  isActive && styles.languageButtonActive,
                ]}
                onPress={() => handleLanguageChange(option.code)}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    isActive && styles.languageButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* =========================================
            ZODIAC STRIP (horizontal)
        ========================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.zodiacStrip}
        >
          {ZODIAC_SIGNS.map((z) => {
            const isActive = selectedSign === z.key;

            return (
              <TouchableOpacity
                key={z.key}
                style={styles.signTile}
                activeOpacity={0.8}
                onPress={() => fetchHoroscope(z.key)}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#FFD700", "#B45309"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.signIconFrameActiveRing}
                  >
                    <View style={styles.signIconFrame}>
                      <Image
                        source={ZODIAC_IMAGES[z.key]}
                        style={styles.signIconImage}
                        resizeMode="cover"
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.signIconFrame}>
                    <Image
                      source={ZODIAC_IMAGES[z.key]}
                      style={styles.signIconImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <Text
                  style={[
                    styles.signLabel,
                    isActive && styles.signLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {language === "bn"
                    ? z.label_bn
                    : language === "hi"
                    ? z.label_hi
                    : z.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* =========================================
            LOADING
        ========================================== */}

        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.stateText}>{t.loading}</Text>
          </View>
        )}

        {/* =========================================
            ERROR
        ========================================== */}

        {!loading && error && (
          <View style={[styles.stateCard, styles.errorCard]}>
            <View style={styles.errorIconCircle}>
              <Feather name="alert-circle" size={26} color="#DC2626" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* =========================================
            HERO "READING" CARD
        ========================================== */}

        {!loading && !error && horoscope && (
          <>
          <DailyGlanceCard
  dateLabel={formatDisplayDate(horoscope.horoscope_date, language)}
  sign={horoscope.sign}
  signLocalLabel={
    language === "bn"
      ? ZODIAC_SIGNS.find((z) => z.key === horoscope.sign)?.label_bn
      : language === "hi"
      ? ZODIAC_SIGNS.find((z) => z.key === horoscope.sign)?.label_hi
      : undefined
  }
  outlookHeader={summary?.header}
  outlook={summaryText}
  zodiacImage={ZODIAC_IMAGES[horoscope.sign] ?? ZODIAC_IMAGES.Aries}
 // traits={["", "", ""]} // optional, static or per-sign
  luckyColorLabel={horoscope.lucky_color}
  luckyColorHex={luckyColorHex}
  luckyNumber={horoscope.lucky_number}
  bestTime={horoscope.best_time}
  mood={horoscope.mood}
/>


            {/* ===================================
                SECTION HEADING
            =================================== */}

            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionHeadingBar} />
              <Text style={styles.sectionHeading}>{t.sectionHeading}</Text>
            </View>



           

            {categoryCards.map((category) => {
              const rating = horoscope.ratings?.[category.ratingKey];
              const content = focusAreas[category.key];

              return (
                <View
                  key={category.key}
                  style={[styles.card, { borderLeftWidth: 4, borderLeftColor: category.color }]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.iconBadge, { backgroundColor: category.iconBackground }]}>
                      <Feather name={category.icon} size={16} color={category.iconColor} />
                    </View>
                    <Text style={styles.heading}>{category.label}</Text>
                    <View style={styles.ratingPill}>
                      <Text style={styles.ratingStars}>
                        {horoscope.rating_stars?.[category.ratingKey] ??
                          (typeof rating === "number" ? `${rating}/5` : "--")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.summary}>{content ?? "--"}</Text>
                </View>
              );
            })}

            <View style={[styles.card, styles.accentCardBlue]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.iconBadge, { backgroundColor: "#DBEAFE" }]}>
                  <Feather name="book-open" size={16} color="#1D4ED8" />
                </View>
                <Text style={styles.heading}>{t.interpretation}</Text>
              </View>
              <Text style={styles.summary}>{interpretation ?? summaryText}</Text>
            </View>

            {/* ===================================
                CAUTIONS
            =================================== */}

            {!!cautions && cautions.length > 0 && (
              <View style={[styles.card, styles.accentCardAmber]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { backgroundColor: "#FEF3C7" }]}>
                    <Feather name="alert-triangle" size={16} color="#B45309" />
                  </View>

                  <Text style={styles.heading}>{t.cautions}</Text>
                </View>

                {cautions.map((item, index) => (
                  <View key={index} style={styles.listRow}>
                    <View style={styles.bulletDotAmber} />
                    <Text style={styles.listItem}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ===================================
                DISCLAIMER
            =================================== */}

            {!!disclaimer && (
              <View style={styles.disclaimerCard}>
                <Feather
                  name="info"
                  size={13}
                  color="#8B7B99"
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text style={styles.disclaimer}>{disclaimer}</Text>
              </View>
            )}
          </>
        )}

        {/* =========================================
            EMPTY STATE
        ========================================== */}

        {!loading && !error && !horoscope && (
          <View style={styles.stateCard}>
            <View style={styles.emptyIconCircle}>
              <Feather name="star" size={26} color="#B491D8" />
            </View>
            <Text style={styles.stateTextMuted}>{t.empty}</Text>
          </View>
        )}
        <View style={{ height: 54 }} />
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.ctaWrapper}
        onPress={() => {
          router.push("/");
        }}
      >
        <LinearGradient
          colors={["#06175c", "#083f7be3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaButtonText}>{t.consultWithAstrologer}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CTA_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);
const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: "#FBF6FF",
  },

  content: {
    paddingBottom: 24,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: "#1B0836",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  headerIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // ===================================================
  // LANGUAGE SWITCH
  // ===================================================

  languageSwitch: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    padding: 4,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.12)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },

  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },

  languageButtonActive: {
    backgroundColor: "#4A148C",
  },

  languageButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B7B99",
  },

  languageButtonTextActive: {
    color: "#FFD700",
  },

  // ===================================================
  // ZODIAC STRIP
  // ===================================================

  zodiacStrip: {
    paddingHorizontal: 12,
    marginBottom: 20,
    gap: 4,
  },

  signTile: {
    width: 76,
    alignItems: "center",
    paddingVertical: 8,
  },

  signIconFrame: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#120D1D",
    borderWidth: 2,
    borderColor: "#FBF6FF",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },

  signIconFrameActiveRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F0B400",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },

  signIconImage: {
    width: "100%",
    height: "100%",
  },

  signLabel: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: "700",
    color: "#8B7B99",
    textAlign: "center",
  },

  signLabelActive: {
    color: "#4A148C",
    fontWeight: "900",
  },

  // ===================================================
  // STATE
  // ===================================================

  stateCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.08)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },

  stateText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#6C5675",
    textAlign: "center",
  },

  stateTextMuted: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#A896B8",
    textAlign: "center",
    lineHeight: 20,
  },

  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },

  errorCard: {
    borderColor: "rgba(220, 38, 38, 0.15)",
  },

  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    color: "#DC2626",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },

  // ===================================================
  // HERO CARD
  // ===================================================

  heroCard: {
    marginHorizontal: 16,
    marginBottom: 22,
    borderRadius: 28,
    padding: 22,
    overflow: "hidden",
    shadowColor: "#2A0B4F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },

  heroZodiacBackground: {
    position: "absolute",
    width: 240,
    height: 240,
    right: -42,
    top: 42,
    opacity: 0.18,
    borderRadius: 120,
  },

  star: {
    position: "absolute",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },

  heroDatePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },

  heroDateText: {
    color: "#E9D8FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  heroHeadline: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginRight: 12,
    lineHeight: 24,
  },

  heroZodiacBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },

  heroZodiacImage: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },

  heroStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  heroStat: {
    width: "50%",
    marginBottom: 16,
    paddingRight: 8,
  },

  heroStatLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  heroStatLabel: {
    color: "#C9AEEB",
    fontSize: 11,
    fontWeight: "700",
  },

  heroStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  heroStatValueText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  heroStatEmoji: {
    fontSize: 20,
  },

  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },

  // ===================================================
  // SECTION HEADING
  // ===================================================

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 24,
    gap: 8,
  },

  sectionHeadingBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#7C3AED",
  },

  sectionHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#2B164C",
    letterSpacing: 0.2,
  },

  // ===================================================
  // CARD
  // ===================================================

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(74, 20, 140, 0.06)",
    shadowColor: "#4A148C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },

  accentCardPink: {
    borderLeftWidth: 4,
    borderLeftColor: "#EC4899",
  },

  accentCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },

  accentCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },

  accentCardAmber: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },

  accentCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#2B164C",
  },

  percentageText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#4A148C",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  ratingLabel: {
    flex: 1,
    fontSize: 14,
    color: "#4B3A55",
    fontWeight: "600",
    textTransform: "capitalize",
  },

  ratingPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },

  ratingStars: {
    color: "#B45309",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  summary: {
    fontSize: 14.5,
    lineHeight: 25,
    color: "#4B3A55",
    fontWeight: "500",
  },

  // ===================================================
  // LIST
  // ===================================================

  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 9,
  },

  bulletDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginTop: 8,
    marginRight: 10,
  },

  bulletDotAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
    marginTop: 8,
    marginRight: 10,
  },

  listItem: {
    flex: 1,
    fontSize: 14,
    lineHeight: 23,
    color: "#4B3A55",
    fontWeight: "500",
  },

  // ===================================================
  // DISCLAIMER
  // ===================================================

  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(124, 58, 237, 0.05)",
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
    padding: 15,
    borderRadius: 18,
  },

  disclaimer: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: "#8B7B99",
    fontWeight: "500",
  },

  // ===================================================
  // CTA BUTTON
  // ===================================================

ctaWrapper: {
  position: "absolute",
  width: CTA_WIDTH,
  alignSelf: "center",
  bottom: 8,
  borderRadius: 17,

  // 3D bottom layer
  backgroundColor: "#04113F",

  // Shadow
  shadowColor: "#1B0836",
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.35,
  shadowRadius: 10,
  elevation: 8,
},

ctaButton: {
  width: "100%",
  minHeight: 48,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",

  paddingHorizontal: 12,
  paddingVertical: 10,

  borderRadius: 16,

  // Move the top face slightly upward
  marginBottom: 4,

  // Top-face shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.18,
  shadowRadius: 4,
  elevation: 4,
},

ctaButtonText: {
  flexShrink: 1,
  textAlign: "center",
  color: "#FFFFFF",
  fontWeight: "800",
  fontSize: 12,
  lineHeight: 17,
  letterSpacing: 0.2,
},
});

export default HoroscopeScreen;
