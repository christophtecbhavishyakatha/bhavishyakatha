
export type SupportedLanguage = "en" | "hi" | "bn";

export type ReportCategory = "basic" | "life" | "family" | "special";

export type ReportSlug = string;

export type ReportConfig = {
  slug: ReportSlug;
  category: ReportCategory;
  title: string;
  description: string;

  // Report image
  image: any;

  // Pricing
  originalPrice: number;
  discountPercentage: number;
  finalPrice: number;
};

type ReportTranslation = {
  title: string;
  description: string;
};

type Definition = {
  slug: ReportSlug;
  category: ReportCategory;
  translationKey: string;

  image: any;

  originalPrice: number;
  discountPercentage: number;
};

/*
|--------------------------------------------------------------------------
| Report Definitions
|--------------------------------------------------------------------------
|
| Put your report images inside:
|
| assets/reports/
|
| Example:
|
| assets/reports/free-kundali.png
| assets/reports/marriage-report.png
|
*/

const definitions: Definition[] = [
  // =========================
  // BASIC REPORTS
  // =========================

  {
    slug: "free-kundali",
    category: "basic",
    translationKey: "freeKundali",
    image: require("../assets/reports/free-kundali.png"),
    originalPrice: 0,
    discountPercentage: 100,
  },
/* 
  {
    slug: "kundali-summary",
    category: "basic",
    translationKey: "kundaliSummary",
    image: require("../assets/reports/kundali-summary.png"),
    originalPrice: 99,
    discountPercentage: 79,
  },





  // =========================
  // LIFE REPORTS
  // =========================

  {
    slug: "marriage-report",
    category: "life",
    translationKey: "marriageReport",
    image: require("../assets/reports/marriage-report.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },

  {
    slug: "love-relationship",
    category: "life",
    translationKey: "loveRelationship",
    image: require("../assets/reports/love-relationship.png"),
    originalPrice: 399,
    discountPercentage: 25,
  },

  {
    slug: "career-report",
    category: "life",
    translationKey: "careerReport",
    image: require("../assets/reports/career-report.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },

  {
    slug: "finance-report",
    category: "life",
    translationKey: "financeReport",
    image: require("../assets/reports/finance-report.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },

  {
    slug: "education-report",
    category: "life",
    translationKey: "educationReport",
    image: require("../assets/reports/education-report.png"),
    originalPrice: 399,
    discountPercentage: 25,
  },

  {
    slug: "business-report",
    category: "life",
    translationKey: "businessReport",
    image: require("../assets/reports/business-report.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },



  // =========================
  // FAMILY REPORTS
  // =========================

  {
    slug: "baby-name-suggestions",
    category: "family",
    translationKey: "babyNameSuggestions",
    image: require("../assets/reports/baby-name-suggestions.png"),
    originalPrice: 299,
    discountPercentage: 33,
  },

  {
    slug: "child-future",
    category: "family",
    translationKey: "childFuture",
    image: require("../assets/reports/child-future.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },

  {
    slug: "marriage-compatibility",
    category: "family",
    translationKey: "marriageCompatibility",
    image: require("../assets/reports/marriage-compatibility.png"),
    originalPrice: 599,
    discountPercentage: 50,
  },



  // =========================
  // SPECIAL REPORTS
  // =========================

  {
    slug: "dosha-report",
    category: "special",
    translationKey: "doshaReport",
    image: require("../assets/reports/dosha-report.png"),
    originalPrice: 399,
    discountPercentage: 25,
  },

  {
    slug: "manglik-report",
    category: "special",
    translationKey: "manglikReport",
    image: require("../assets/reports/manglik-report.png"),
    originalPrice: 399,
    discountPercentage: 25,
  },

  {
    slug: "yoga-report",
    category: "special",
    translationKey: "yogaReport",
    image: require("../assets/reports/yoga-report.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },

  {
    slug: "marriage-timing",
    category: "special",
    translationKey: "marriageTiming",
    image: require("../assets/reports/marriage-timing.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },

  {
    slug: "career-change",
    category: "special",
    translationKey: "careerChange",
    image: require("../assets/reports/career-change.png"),
    originalPrice: 399,
    discountPercentage: 25,
  },

  {
    slug: "personal-year-report",
    category: "special",
    translationKey: "personalYearReport",
    image: require("../assets/reports/personal-year-report.png"),
    originalPrice: 499,
    discountPercentage: 40,
  },
   */
];

export type ReportTranslationKey =
  (typeof definitions)[number]["translationKey"];

export type ReportScreenTranslations = {
  title: string;
  subtitle: string;

  allReports: string;

  categories: Record<ReportCategory, string>;

  reports: Record<ReportTranslationKey, ReportTranslation>;

  comingSoon: string;
  comingSoonMessage: string;

  freeKundaliTitle: string;
  freeKundaliIntro: string;

  whatIsKundali: string;
  whatIsKundaliBody: string;

  whyKundali: string;
  whyKundaliBody: string;

  kundaliBenefits: string[];

  getFreeKundali: string;
  kundaliForm: { fullName: string; dateOfBirth: string; timeOfBirth: string; birthLocation: string; dontKnowTime: string; namePlaceholder: string; locationPlaceholder: string; selectDate: string; selectTime: string; cancel: string; continue: string; validation: string };

  reportDetailsTitle: string;
  reportDetailsBody: string;
  getReport: string;

  reportIntro: (title: string) => string;
  whatReport: (title: string) => string;
  whyReport: (title: string) => string;
  reportBenefits: (title: string) => string[];
};

const translations: Record<
  SupportedLanguage,
  ReportScreenTranslations
> = {
  // ============================================================
  // ENGLISH
  // ============================================================

  en: {
    title: "Reports",
    subtitle:
      "Explore astrology reports based on your birth details",

    allReports: "All",

    categories: {
      basic: "Basic Reports",
      life: "Life Reports",
      family: "Family Reports",
      special: "Special Reports",
    },

    reports: {
      freeKundali: {
        title: "Kundali",
        description:
          "Create your birth chart and explore its key insights.",
      },

      kundaliSummary: {
        title: "Kundali Summary",
        description:
          "Get a simple overview of your birth chart and major influences.",
      },

      planetaryReport: {
        title: "Planetary Report",
        description:
          "Explore the positions and influences of the planets in your chart.",
      },

      dashaReport: {
        title: "Dasha Report",
        description:
          "Understand your planetary periods and their influence on life.",
      },

      nakshatraReport: {
        title: "Nakshatra Report",
        description:
          "Explore your birth star and its traditional astrological meaning.",
      },

      marriageReport: {
        title: "Marriage Report",
        description:
          "Explore marriage, partnership, and married-life patterns.",
      },

      loveRelationship: {
        title: "Love & Relationship",
        description:
          "Explore relationship patterns, emotional connections, and compatibility.",
      },

      careerReport: {
        title: "Career Report",
        description:
          "Explore career strengths, opportunities, and professional direction.",
      },

      financeReport: {
        title: "Finance Report",
        description:
          "Explore your financial outlook, opportunities, and money patterns.",
      },

      educationReport: {
        title: "Education Report",
        description:
          "Explore learning strengths, education patterns, and opportunities.",
      },

      businessReport: {
        title: "Business Report",
        description:
          "Explore business potential, opportunities, and professional patterns.",
      },

      yearlyPrediction: {
        title: "Yearly Prediction",
        description:
          "Explore the major themes and opportunities for the coming year.",
      },

      babyNameSuggestions: {
        title: "Baby Name Suggestions",
        description:
          "Find meaningful baby names based on birth details and astrology.",
      },

      childFuture: {
        title: "Child Future",
        description:
          "Explore traditional astrological insights about your child's future.",
      },

      marriageCompatibility: {
        title: "Marriage Compatibility",
        description:
          "Compare two birth charts to explore traditional compatibility factors.",
      },

      parentChildCompatibility: {
        title: "Parent–Child Compatibility",
        description:
          "Explore traditional astrological compatibility between parent and child.",
      },

      doshaReport: {
        title: "Dosha Report",
        description:
          "Explore important dosha-related factors identified in your birth chart.",
      },

      manglikReport: {
        title: "Manglik Report",
        description:
          "Explore traditional Manglik considerations in your birth chart.",
      },

      yogaReport: {
        title: "Yoga Report",
        description:
          "Explore important planetary combinations and traditional yogas.",
      },

      marriageTiming: {
        title: "Marriage Timing",
        description:
          "Explore traditional astrological indicators related to marriage timing.",
      },

      careerChange: {
        title: "Career Change",
        description:
          "Explore traditional astrological indicators related to career changes.",
      },

      personalYearReport: {
        title: "Personal Year Report",
        description:
          "Explore the major themes and opportunities of your personal year.",
      },
    },

    comingSoon: "Coming Soon",

    comingSoonMessage:
      "This report will be available soon.",

    freeKundaliTitle: "Kundali",

    freeKundaliIntro:
      "Discover what your birth chart says about your personality, strengths, life path, and important opportunities.",

    whatIsKundali: "What is a Kundali?",

    whatIsKundaliBody:
      "A Kundali is a snapshot of the sky at the exact time and place of your birth. It maps the planets and zodiac signs to help understand different areas of life.",

    whyKundali: "Why do you need a Kundali?",

    whyKundaliBody:
      "Your birth chart can help you reflect on your nature, relationships, career direction, and personal growth with guidance from astrology.",

    kundaliBenefits: [
      "Understand your personality and natural strengths",
      "Explore career and relationship patterns",
      "Learn about planetary influences in your life",
    ],

    getFreeKundali: "Get Free Kundali",
    kundaliForm: { fullName: "Full Name", dateOfBirth: "Date of Birth", timeOfBirth: "Time of Birth", birthLocation: "Birth Location", dontKnowTime: "I don't know my birth time", namePlaceholder: "Enter your full name", locationPlaceholder: "Enter your birth location", selectDate: "Select date of birth", selectTime: "Select time of birth", cancel: "Cancel", continue: "Continue", validation: "Please verify your name, date of birth, time of birth, and birth location." },

    reportDetailsTitle: "What is this report?",

    reportDetailsBody:
      "This report explores one area of life through an astrology reading based on your birth details.",

    getReport: "Get This Report",

    reportIntro: (title) =>
      `Discover what your ${title.toLowerCase()} can reveal about your life and future.`,

    whatReport: (title) => `What is a ${title}?`,

    whyReport: (title) => `Why do you need a ${title}?`,

    reportBenefits: () => [
      "Understand important patterns in this area of life",
      "Explore strengths, opportunities, and challenges",
      "Receive guidance based on your birth details",
    ],
  },

  // ============================================================
  // HINDI
  // ============================================================

  hi: {
    title: "रिपोर्ट",
    subtitle:
      "अपनी जन्म जानकारी के आधार पर ज्योतिष रिपोर्ट देखें",

    allReports: "सभी",

    categories: {
      basic: "बेसिक रिपोर्ट",
      life: "जीवन रिपोर्ट",
      family: "परिवार रिपोर्ट",
      special: "विशेष रिपोर्ट",
    },

    reports: {
      freeKundali: {
        title: "कुंडली",
        description:
          "अपनी जन्म कुंडली बनाएं और उसके प्रमुख संकेतों को समझें।",
      },

      kundaliSummary: {
        title: "कुंडली सारांश",
        description:
          "अपनी जन्म कुंडली और प्रमुख ग्रह प्रभावों का सरल सारांश पाएं।",
      },

      planetaryReport: {
        title: "ग्रह स्थिति रिपोर्ट",
        description:
          "अपनी कुंडली में ग्रहों की स्थिति और उनके प्रभावों को समझें।",
      },

      dashaReport: {
        title: "दशा रिपोर्ट",
        description:
          "अपनी ग्रह दशाओं और जीवन पर उनके प्रभाव को समझें।",
      },

      nakshatraReport: {
        title: "नक्षत्र रिपोर्ट",
        description:
          "अपने जन्म नक्षत्र और उसके पारंपरिक ज्योतिषीय अर्थ को जानें।",
      },

      marriageReport: {
        title: "विवाह रिपोर्ट",
        description:
          "विवाह, जीवनसाथी और वैवाहिक जीवन से जुड़े संकेतों को समझें।",
      },

      loveRelationship: {
        title: "प्रेम और संबंध",
        description:
          "रिश्तों, भावनात्मक जुड़ाव और अनुकूलता से जुड़े संकेतों को समझें।",
      },

      careerReport: {
        title: "करियर रिपोर्ट",
        description:
          "करियर की खूबियों, अवसरों और पेशेवर दिशा को समझें।",
      },

      financeReport: {
        title: "वित्त रिपोर्ट",
        description:
          "आर्थिक स्थिति, अवसरों और धन से जुड़े संकेतों को समझें।",
      },

      educationReport: {
        title: "शिक्षा रिपोर्ट",
        description:
          "सीखने की क्षमता, शिक्षा से जुड़े पैटर्न और अवसरों को समझें।",
      },

      businessReport: {
        title: "व्यापार रिपोर्ट",
        description:
          "व्यापार की संभावनाओं, अवसरों और पेशेवर संकेतों को समझें।",
      },

      yearlyPrediction: {
        title: "वार्षिक भविष्यफल",
        description:
          "आने वाले वर्ष के प्रमुख विषयों और अवसरों को जानें।",
      },

      babyNameSuggestions: {
        title: "बच्चे के नाम सुझाव",
        description:
          "जन्म जानकारी और ज्योतिष के आधार पर बच्चे के लिए नाम खोजें।",
      },

      childFuture: {
        title: "बच्चे का भविष्य",
        description:
          "बच्चे के भविष्य से जुड़े पारंपरिक ज्योतिषीय संकेतों को समझें।",
      },

      marriageCompatibility: {
        title: "विवाह मिलान",
        description:
          "दो जन्म कुंडलियों के आधार पर पारंपरिक अनुकूलता को समझें।",
      },

      parentChildCompatibility: {
        title: "माता-पिता और बच्चे की अनुकूलता",
        description:
          "माता-पिता और बच्चे के बीच पारंपरिक ज्योतिषीय अनुकूलता को समझें।",
      },

      doshaReport: {
        title: "दोष रिपोर्ट",
        description:
          "अपनी जन्म कुंडली में मौजूद महत्वपूर्ण दोष संबंधी संकेतों को समझें।",
      },

      manglikReport: {
        title: "मांगलिक रिपोर्ट",
        description:
          "अपनी जन्म कुंडली में मांगलिक स्थिति से जुड़े पारंपरिक संकेतों को समझें।",
      },

      yogaReport: {
        title: "योग रिपोर्ट",
        description:
          "कुंडली में मौजूद महत्वपूर्ण ग्रह संयोजनों और पारंपरिक योगों को जानें।",
      },

      marriageTiming: {
        title: "विवाह का संभावित समय",
        description:
          "विवाह के समय से जुड़े पारंपरिक ज्योतिषीय संकेतों को समझें।",
      },

      careerChange: {
        title: "करियर परिवर्तन",
        description:
          "करियर में बदलाव से जुड़े पारंपरिक ज्योतिषीय संकेतों को समझें।",
      },

      personalYearReport: {
        title: "व्यक्तिगत वार्षिक रिपोर्ट",
        description:
          "अपने व्यक्तिगत वर्ष के प्रमुख विषयों और अवसरों को समझें।",
      },
    },

    comingSoon: "जल्द आ रहा है",

    comingSoonMessage:
      "यह रिपोर्ट जल्द ही उपलब्ध होगी।",

    freeKundaliTitle: "कुंडली",

    freeKundaliIntro:
      "जानें कि आपकी जन्म कुंडली आपके व्यक्तित्व, शक्तियों, जीवन यात्रा और महत्वपूर्ण अवसरों के बारे में क्या बताती है।",

    whatIsKundali: "कुंडली क्या है?",

    whatIsKundaliBody:
      "कुंडली आपके जन्म के सटीक समय और स्थान पर आकाश की स्थिति का चित्र है। इसमें ग्रहों और राशियों के आधार पर जीवन के विभिन्न क्षेत्रों को समझा जाता है।",

    whyKundali: "कुंडली क्यों जरूरी है?",

    whyKundaliBody:
      "ज्योतिष के मार्गदर्शन से आपकी जन्म कुंडली आपके स्वभाव, रिश्तों, करियर और व्यक्तिगत विकास को समझने में मदद कर सकती है।",

    kundaliBenefits: [
      "अपने व्यक्तित्व और प्राकृतिक खूबियों को समझें",
      "करियर और रिश्तों के पैटर्न जानें",
      "अपने जीवन पर ग्रहों के प्रभाव को समझें",
    ],

    getFreeKundali: "फ्री कुंडली पाएं",
    kundaliForm: { fullName: "पूरा नाम", dateOfBirth: "जन्म तिथि", timeOfBirth: "जन्म समय", birthLocation: "जन्म स्थान", dontKnowTime: "मुझे अपना जन्म समय नहीं पता", namePlaceholder: "अपना पूरा नाम दर्ज करें", locationPlaceholder: "अपना जन्म स्थान दर्ज करें", selectDate: "जन्म तिथि चुनें", selectTime: "जन्म समय चुनें", cancel: "रद्द करें", continue: "आगे बढ़ें", validation: "कृपया अपना नाम, जन्म तिथि, जन्म समय और जन्म स्थान सत्यापित करें।" },

    reportDetailsTitle: "यह रिपोर्ट क्या है?",

    reportDetailsBody:
      "यह रिपोर्ट आपकी जन्म जानकारी के आधार पर ज्योतिष के माध्यम से जीवन के एक क्षेत्र को समझती है।",

    getReport: "यह रिपोर्ट पाएं",

    reportIntro: (title) =>
      `जानें कि ${title} आपके जीवन और भविष्य के बारे में क्या बता सकती है।`,

    whatReport: (title) => `${title} क्या है?`,

    whyReport: (title) => `${title} क्यों जरूरी है?`,

    reportBenefits: () => [
      "जीवन के इस क्षेत्र के महत्वपूर्ण पैटर्न समझें",
      "अपनी खूबियों, अवसरों और चुनौतियों को जानें",
      "अपनी जन्म जानकारी के आधार पर मार्गदर्शन पाएं",
    ],
  },

  // ============================================================
  // BENGALI
  // ============================================================

  bn: {
    title: "রিপোর্ট",
    subtitle:
      "আপনার জন্মতথ্যের ভিত্তিতে বিভিন্ন জ্যোতিষ রিপোর্ট দেখুন",

    allReports: "সব",

    categories: {
      basic: "বেসিক রিপোর্ট",
      life: "জীবন রিপোর্ট",
      family: "পরিবারের রিপোর্ট",
      special: "বিশেষ রিপোর্ট",
    },

    reports: {
      freeKundali: {
        title: "কুণ্ডলী",
        description:
          "আপনার জন্মছক তৈরি করুন এবং এর গুরুত্বপূর্ণ দিকগুলি জানুন।",
      },

      kundaliSummary: {
        title: "কুণ্ডলী সংক্ষিপ্ত বিশ্লেষণ",
        description:
          "আপনার জন্মছক ও প্রধান গ্রহের প্রভাবের একটি সহজ বিশ্লেষণ পান।",
      },

      planetaryReport: {
        title: "গ্রহের অবস্থান",
        description:
          "আপনার কুণ্ডলীতে গ্রহগুলির অবস্থান ও প্রভাব সম্পর্কে জানুন।",
      },

      dashaReport: {
        title: "দশা বিশ্লেষণ",
        description:
          "আপনার গ্রহের দশা এবং জীবনে তার প্রভাব সম্পর্কে জানুন।",
      },

      nakshatraReport: {
        title: "নক্ষত্র বিশ্লেষণ",
        description:
          "আপনার জন্ম নক্ষত্র এবং তার জ্যোতিষীয় অর্থ সম্পর্কে জানুন।",
      },

      marriageReport: {
        title: "বিবাহ ও দাম্পত্য জীবন",
        description:
          "বিবাহ, জীবনসঙ্গী এবং দাম্পত্য জীবন সম্পর্কে জ্যোতিষীয় বিশ্লেষণ পান।",
      },

      loveRelationship: {
        title: "প্রেম ও সম্পর্ক",
        description:
          "সম্পর্ক, আবেগ এবং পারস্পরিক সামঞ্জস্য সম্পর্কে জানুন।",
      },

      careerReport: {
        title: "ক্যারিয়ার ও কর্মজীবন",
        description:
          "ক্যারিয়ারের শক্তি, সুযোগ এবং পেশাগত দিক সম্পর্কে জানুন।",
      },

      financeReport: {
        title: "অর্থ ও আর্থিক ভবিষ্যৎ",
        description:
          "অর্থনৈতিক পরিস্থিতি, সুযোগ এবং আর্থিক প্রবণতা সম্পর্কে জানুন।",
      },

      educationReport: {
        title: "শিক্ষা ও পড়াশোনা",
        description:
          "শিক্ষার সম্ভাবনা, শেখার ধরন এবং সুযোগ সম্পর্কে জানুন।",
      },

      businessReport: {
        title: "ব্যবসার ভবিষ্যৎ",
        description:
          "ব্যবসার সম্ভাবনা, সুযোগ এবং পেশাগত দিক সম্পর্কে জানুন।",
      },

      yearlyPrediction: {
        title: "বার্ষিক ভবিষ্যৎ",
        description:
          "আগামী বছরের গুরুত্বপূর্ণ দিক এবং সম্ভাবনা সম্পর্কে জানুন।",
      },

      babyNameSuggestions: {
        title: "শিশুর নাম নির্বাচন",
        description:
          "জন্মতথ্য ও জ্যোতিষের ভিত্তিতে শিশুর জন্য সুন্দর নাম খুঁজুন।",
      },

      childFuture: {
        title: "সন্তানের ভবিষ্যৎ",
        description:
          "সন্তানের ভবিষ্যৎ সম্পর্কে প্রচলিত জ্যোতিষীয় বিশ্লেষণ জানুন।",
      },

      marriageCompatibility: {
        title: "বিবাহ মিলান",
        description:
          "দুটি জন্মছকের ভিত্তিতে প্রচলিত সামঞ্জস্য সম্পর্কে জানুন।",
      },

      parentChildCompatibility: {
        title: "অভিভাবক ও সন্তানের সামঞ্জস্য",
        description:
          "অভিভাবক ও সন্তানের মধ্যে প্রচলিত জ্যোতিষীয় সামঞ্জস্য সম্পর্কে জানুন।",
      },

      doshaReport: {
        title: "দোষ বিশ্লেষণ",
        description:
          "আপনার জন্মছকে থাকা গুরুত্বপূর্ণ দোষ সম্পর্কিত বিষয়গুলি সম্পর্কে জানুন।",
      },

      manglikReport: {
        title: "মাঙ্গলিক বিশ্লেষণ",
        description:
          "আপনার জন্মছকে মাঙ্গলিক অবস্থার প্রচলিত জ্যোতিষীয় দিকগুলি জানুন।",
      },

      yogaReport: {
        title: "গুরুত্বপূর্ণ যোগ",
        description:
          "আপনার জন্মছকে থাকা গুরুত্বপূর্ণ গ্রহের সংযোগ ও যোগ সম্পর্কে জানুন।",
      },

      marriageTiming: {
        title: "বিবাহের সম্ভাব্য সময়",
        description:
          "বিবাহের সময় সম্পর্কে প্রচলিত জ্যোতিষীয় ইঙ্গিতগুলি জানুন।",
      },

      careerChange: {
        title: "ক্যারিয়ার পরিবর্তন",
        description:
          "ক্যারিয়ার পরিবর্তন সম্পর্কে প্রচলিত জ্যোতিষীয় ইঙ্গিতগুলি জানুন।",
      },

      personalYearReport: {
        title: "ব্যক্তিগত বার্ষিক রিপোর্ট",
        description:
          "আপনার ব্যক্তিগত বছরের গুরুত্বপূর্ণ দিক ও সম্ভাবনা সম্পর্কে জানুন।",
      },
    },

    comingSoon: "শীঘ্রই আসছে",

    comingSoonMessage:
      "এই রিপোর্টটি খুব শীঘ্রই উপলব্ধ হবে।",

    freeKundaliTitle: "কুণ্ডলী",

    freeKundaliIntro:
      "আপনার জন্মছক আপনার ব্যক্তিত্ব, শক্তি, জীবনের পথ এবং গুরুত্বপূর্ণ সুযোগ সম্পর্কে কী বলে তা জানুন।",

    whatIsKundali: "কুণ্ডলী কী?",

    whatIsKundaliBody:
      "কুণ্ডলী হল আপনার জন্মের সঠিক সময় ও স্থানে আকাশের অবস্থার একটি ছবি। গ্রহ ও রাশির অবস্থান দেখে জীবনের বিভিন্ন দিক বোঝা যায়।",

    whyKundali: "কুণ্ডলী কেন প্রয়োজন?",

    whyKundaliBody:
      "জ্যোতিষের সাহায্যে আপনার জন্মছক স্বভাব, সম্পর্ক, কর্মজীবন এবং ব্যক্তিগত উন্নতি সম্পর্কে ভাবতে সাহায্য করতে পারে।",

    kundaliBenefits: [
      "আপনার ব্যক্তিত্ব ও স্বাভাবিক শক্তি বুঝুন",
      "কর্মজীবন ও সম্পর্কের ধারা জানুন",
      "আপনার জীবনে গ্রহের প্রভাব বুঝুন",
    ],

    getFreeKundali: "ফ্রি কুণ্ডলী নিন",
    kundaliForm: { fullName: "পুরো নাম", dateOfBirth: "জন্ম তারিখ", timeOfBirth: "জন্ম সময়", birthLocation: "জন্মস্থান", dontKnowTime: "আমি আমার জন্ম সময় জানি না", namePlaceholder: "আপনার পুরো নাম লিখুন", locationPlaceholder: "আপনার জন্মস্থান লিখুন", selectDate: "জন্ম তারিখ নির্বাচন করুন", selectTime: "জন্ম সময় নির্বাচন করুন", cancel: "বাতিল", continue: "চালিয়ে যান", validation: "আপনার নাম, জন্ম তারিখ, জন্ম সময় এবং জন্মস্থান যাচাই করুন।" },

    reportDetailsTitle: "এই রিপোর্টটি কী?",

    reportDetailsBody:
      "আপনার জন্মতথ্যের ভিত্তিতে জ্যোতিষের মাধ্যমে জীবনের একটি দিক এই রিপোর্টে বোঝানো হয়।",

    getReport: "এই রিপোর্টটি নিন",

    reportIntro: (title) =>
      `${title} আপনার জীবন ও ভবিষ্যৎ সম্পর্কে কী জানাতে পারে তা জানুন।`,

    whatReport: (title) => `${title} কী?`,

    whyReport: (title) => `${title} কেন প্রয়োজন?`,

    reportBenefits: () => [
      "জীবনের এই ক্ষেত্রের গুরুত্বপূর্ণ ধারা বুঝুন",
      "আপনার শক্তি, সুযোগ ও চ্যালেঞ্জ জানুন",
      "আপনার জন্মতথ্যের ভিত্তিতে পরামর্শ পান",
    ],
  },
};

export const normalizeLanguage = (
  lang?: string | null
): SupportedLanguage => {
  return lang === "hi" || lang === "bn" ? lang : "en";
};

export const getReportCatalog = (
  lang: SupportedLanguage = "en"
): ReportConfig[] => {
  const language = translations[lang];

  return definitions.map((item) => {
    const report = language.reports[item.translationKey];

    const finalPrice =
      item.originalPrice === 0
        ? 0
        : Math.round(
            item.originalPrice *
              (1 - item.discountPercentage / 100)
          );

    return {
      slug: item.slug,
      category: item.category,
      title: report.title,
      description: report.description,

      image: item.image,

      originalPrice: item.originalPrice,
      discountPercentage: item.discountPercentage,
      finalPrice,
    };
  });
};

export const getReportCatalogBySlug = (
  lang: SupportedLanguage = "en"
) =>
  Object.fromEntries(
    getReportCatalog(lang).map((item) => [
      item.slug,
      item,
    ])
  ) as Record<ReportSlug, ReportConfig>;

export const getReportScreenTranslations = (
  lang: SupportedLanguage = "en"
): ReportScreenTranslations => {
  return translations[lang];
};
