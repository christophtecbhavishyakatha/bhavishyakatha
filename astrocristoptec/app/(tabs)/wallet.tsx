import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  NativeModules,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RazorpayCheckout, {
  RazorpayError,
  RazorpaySuccess,
} from "react-native-razorpay";
import { SafeAreaView } from "react-native-safe-area-context";
import { CLIENT_API_BASE_URL, CLIENT_AUTH_API_BASE_URL } from "../../lib/api";
import { downloadWalletRechargeInvoice } from "../../lib/invoice";
import Header, { HeaderRef } from "../components/header";
import LoadingScreen from "../components/loadingScreen";
import { Dimensions, Image } from "react-native";
import Carousel from "react-native-reanimated-carousel";

const width = Dimensions.get("window").width;

const GST_PERCENT = 18;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type WalletOrderResponse = {
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    rechargeAmount: number;
    gstAmount: number;
    payableAmount: number;
    coupon?: CouponData | null;
    customerGstin?: string;
    user: {
      full_name?: string | null;
      mobile?: string | null;
    };
  };
};

type WalletVerifyResponse = {
  success: boolean;
  message?: string;
  data?: {
    recharge_log_id: number;
    wallet_balance: number;
    previous_balance: number | null;
    recharge_amount: number;
    coupon_bonus_amount?: number;
    credited_amount?: number;
  };
};

type CouponData = {
  couponId: number;
  code: string;
  minAmount: number;
  bonusPercent: number;
  bonusAmount: number;
  creditedAmount: number;
  amount: number;
};

type TermsResponse = {
  success: boolean;
  type?: string;
  content?: string;
  version?: string;
  updatedAt?: string;
  message?: string;
};

const translations: any = {
  en: {
    wallet: "Wallet",
    balance: "Current Balance",
    recharge: "Recharge",
    selectAmount: "Select Amount",
    customAmount: "Enter Amount",
    gst: "GST (18%)",
    gstin: "GSTIN (Optional)",
    total: "Total Payable",
    terms: "Once added, amount is non-refundable",
    accept: "I accept the terms & conditions",
    proceed: "Proceed to Pay",
    currency: "₹",
    enterCoupon: "Enter Coupon Code",
    couponBonusAvailable: "{percent}% bonus is available. Use code {code}",
    couponAddMore: "Add {amount} more to get {percent}% bonus with code {code}",
    noCouponBonus: "No coupon bonus is available for this amount",
    bonusCongratulations: "Congratulations!",
    bonusEarned: "You earned {percent}% bonus",
    bonusAmount: "Bonus amount: {amount}",
    walletCreditTotal: "Total wallet credit: {amount}",
    next: "Next",
    back: "Back",
  apply: "Apply",
  remove: "Remove",
  enterAmount: "Enter amount",
  enterAmountFirst: "Enter an amount first to enable coupon validation.",
  viewAllCoupons: "View All Coupon Codes",
  availableCoupons: "Available Coupons",
  noCoupons: "No coupons available right now",
  noCouponsDesc: "We'll show active offers here as soon as they become available.",
  close: "Close",
  applyCoupon: "Apply Coupon",
  minimum: "Minimum",
  bonus: "Bonus",
  maxBonus: "Max Bonus",
  usesPerUser: "uses per user",
  rechargeAmount: "Recharge Amount",
  couponBonus: "Coupon Bonus",
  walletCredit: "Wallet Credit",
  couponApplied: "applied. Bonus",
  },
hi: {
  wallet: "वॉलेट",
  balance: "वर्तमान बैलेंस",
  recharge: "रिचार्ज",
  selectAmount: "राशि चुनें",
  customAmount: "राशि दर्ज करें",
  gst: "जीएसटी (18%)",
  gstin: "GSTIN (वैकल्पिक)",
  total: "कुल भुगतान",
  terms: "एक बार जोड़ी गई राशि वापस नहीं की जाएगी",
  accept: "मैं नियम एवं शर्तों को स्वीकार करता/करती हूँ",
  proceed: "भुगतान करें",
  currency: "₹",
   enterCoupon: "कूपन कोड दर्ज करें",
  apply: "लागू करें",
  remove: "हटाएं",
  enterAmount: "राशि दर्ज करें",
  enterAmountFirst: "कूपन लागू करने के लिए पहले राशि दर्ज करें।",
  couponBonusAvailable: "इस राशि पर {percent}% बोनस उपलब्ध है। कोड {code} का उपयोग करें",
  couponAddMore: "{percent}% बोनस पाने के लिए ₹{amount} और जोड़ें। कोड {code}",
  noCouponBonus: "इस राशि पर कोई कूपन बोनस उपलब्ध नहीं है",
  bonusCongratulations: "बधाई हो!",
  bonusEarned: "आपने {percent}% बोनस प्राप्त किया",
  bonusAmount: "बोनस राशि: {amount}",
  walletCreditTotal: "कुल वॉलेट क्रेडिट: {amount}",
  next: "आगे",
  back: "वापस",
  viewAllCoupons: "सभी कूपन देखें",
  availableCoupons: "उपलब्ध कूपन",
  noCoupons: "अभी कोई कूपन उपलब्ध नहीं है",
  noCouponsDesc: "सक्रिय ऑफ़र उपलब्ध होते ही यहाँ दिखाई देंगे।",
  close: "बंद करें",
  applyCoupon: "कूपन लागू करें",
  minimum: "न्यूनतम",
  bonus: "बोनस",
  maxBonus: "अधिकतम बोनस",
  usesPerUser: "प्रति उपयोगकर्ता उपयोग",
  rechargeAmount: "रिचार्ज राशि",
  couponBonus: "कूपन बोनस",
  walletCredit: "वॉलेट क्रेडिट",
  couponApplied: "लागू हुआ। बोनस",
},

bn: {
  wallet: "ওয়ালেট",
  balance: "বর্তমান ব্যালেন্স",
  recharge: "রিচার্জ",
  selectAmount: "পরিমাণ নির্বাচন করুন",
  customAmount: "পরিমাণ লিখুন",
  gst: "জিএসটি (১৮%)",
  gstin: "GSTIN (ঐচ্ছিক)",
  total: "মোট পরিশোধযোগ্য",
  terms: "একবার ওয়ালেটে যোগ করা অর্থ ফেরতযোগ্য নয়",
  accept: "আমি শর্তাবলী মেনে নিচ্ছি",
  proceed: "পেমেন্ট করুন",
  currency: "₹",
   enterCoupon: "কুপন কোড লিখুন",
  couponBonusAvailable: "এই পরিমাণে {percent}% বোনাস পাওয়া যাবে। কোড {code} ব্যবহার করুন",
  couponAddMore: "{percent}% বোনাস পেতে আরও ₹{amount} যোগ করুন। কোড {code}",
  noCouponBonus: "এই পরিমাণে কোনো কুপন বোনাস পাওয়া যাবে না",
  bonusCongratulations: "অভিনন্দন!",
  bonusEarned: "আপনি {percent}% বোনাস পেয়েছেন",
  bonusAmount: "বোনাসের পরিমাণ: {amount}",
  walletCreditTotal: "মোট ওয়ালেট ক্রেডিট: {amount}",
  next: "পরবর্তী",
  back: "পিছনে",
  apply: "প্রয়োগ করুন",
  remove: "সরান",
  enterAmount: "পরিমাণ লিখুন",
  enterAmountFirst: "কুপন ব্যবহার করতে আগে পরিমাণ লিখুন।",
  viewAllCoupons: "সব কুপন কোড দেখুন",
  availableCoupons: "উপলব্ধ কুপন",
  noCoupons: "এই মুহূর্তে কোনো কুপন নেই",
  noCouponsDesc: "নতুন অফার এলে এখানে দেখানো হবে।",
  close: "বন্ধ করুন",
  applyCoupon: "কুপন প্রয়োগ করুন",
  minimum: "ন্যূনতম",
  bonus: "বোনাস",
  maxBonus: "সর্বোচ্চ বোনাস",
  usesPerUser: "বার ব্যবহার করা যাবে",
  rechargeAmount: "রিচার্জের পরিমাণ",
  couponBonus: "কুপন বোনাস",
  walletCredit: "ওয়ালেটে যোগ হবে",
  couponApplied: "প্রয়োগ হয়েছে। বোনাস",
},
};

type CouponListItem = {
  id: number;
  code: string;
  min_amount: number;
  bonus_percent: number;
  max_bonus: number;
  usage_per_user: number;
  total_usage: number;
  max_usage: number;
  expiry_date: string;
};

export default function WalletScreen() {
  const [language, setLanguage] = useState("en");
  const [walletBalance, setWalletBalance] = useState(0);
  const [amount, setAmount] = useState<number>(0);
  const [gstin, setGstin] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [successInvoiceId, setSuccessInvoiceId] = useState<number | null>(null);
  const [successRedirectCount, setSuccessRedirectCount] = useState(3);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const headerRef = useRef<HeaderRef>(null);
  const [coupon, setCoupon] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const t = translations[language];
  const router = useRouter();
  const presetAmounts = [51, 101, 201, 501, 1001, 2001, 5001, 10001];
  const normalizedGstin = gstin.trim().toUpperCase();
  const normalizedCoupon = coupon.trim().toUpperCase();
  const hasAmount = amount > 0;
  const canApplyCoupon = hasAmount && !isProcessingPayment && !isApplyingCoupon;
  const [couponList, setCouponList] = useState<CouponListItem[]>([]);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [autoApplyingCoupon, setAutoApplyingCoupon] = useState(false);
  const [walletStep, setWalletStep] = useState<1 | 2>(1);
  const [banners, setBanners] = useState<any[]>([]);
const flatListRef = useRef<FlatList>(null);
const [currentIndex, setCurrentIndex] = useState(0);
  const resetRechargeForm = useCallback(() => {
    setAmount(0);
    setGstin("");
    setCoupon("");
    setCouponData(null);
    setAcceptTerms(false);
    setCouponModalVisible(false);
    setBonusModalVisible(false);
    setWalletStep(1);
  }, []);
  const screenWidth = Dimensions.get("window").width;

  const loadData = useCallback(async () => {
    const lang = await AsyncStorage.getItem("user-language");
    if (lang) {
      setLanguage(lang);
    }

    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      setWalletBalance(0);
      return;
    }

    try {
      const res = await fetch(`${CLIENT_AUTH_API_BASE_URL}/users/${userId}`);
      const json = await res.json();
      console.log("Wallet fetch response:", json);

      if (json.success) {
        setWalletBalance(Number(json.data.wallet_balance) || 0);
      }
    } catch (err) {
      console.log("Wallet fetch error:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetRechargeForm();
      loadData();
      loadBanner();
      loadCouponList();
    }, [loadData, resetRechargeForm]),
  );

  useEffect(() => {
    if (!successInvoiceId) {
      setSuccessRedirectCount(3);
      return;
    }

    if (isDownloadingInvoice) {
      return;
    }

    setSuccessRedirectCount(3);
    const countdownInterval = setInterval(() => {
      setSuccessRedirectCount((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const redirectTimeout = setTimeout(() => {
      setSuccessInvoiceId(null);
      router.replace("/");
    }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimeout);
    };
  }, [isDownloadingInvoice, router, successInvoiceId]);

  useEffect(() => {
    if (couponData && couponData.amount !== amount) {
      setCouponData(null);
    }
  }, [amount, couponData]);

  useEffect(() => {
    if (couponData && couponData.code.toUpperCase() !== normalizedCoupon) {
      setCouponData(null);
    }
 }, [couponData, normalizedCoupon]);
  const loadCouponList = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) return;

      const res = await fetch(`${CLIENT_API_BASE_URL}/coupon/list?userId=${userId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCouponList(json.data);
      } else {
        setCouponList([]);
      }
    } catch (error) {
      console.log("Coupon list fetch error:", error);
      setCouponList([]);
    }
  };

  const eligibleCoupons = couponList.filter((item) => amount >= Number(item.min_amount));
  const nextCoupon = couponList
    .filter((item) => amount < Number(item.min_amount))
    .sort((a, b) => Number(a.min_amount) - Number(b.min_amount))[0];
  const bestCoupon = [...eligibleCoupons].sort(
    (a, b) => Number(b.bonus_percent) - Number(a.bonus_percent),
  )[0];
  const couponHint = hasAmount
    ? bestCoupon
      ? t.couponBonusAvailable
          .replace("{percent}", String(bestCoupon.bonus_percent))
          .replace("{code}", bestCoupon.code)
      : nextCoupon
        ? t.couponAddMore
            .replace("{amount}", String(Math.max(0, Number(nextCoupon.min_amount) - amount)))
            .replace("{percent}", String(nextCoupon.bonus_percent))
            .replace("{code}", nextCoupon.code)
        : t.noCouponBonus
    : "";
 const loadBanner = async () => {
  try {
    const { width, height } = Dimensions.get("window");

    const res = await fetch(
      `${CLIENT_API_BASE_URL}/coupon/banner?width=${Math.round(width)}&height=${Math.round(height)}`
    );

    const json = await res.json();
console.log("Banner list response:", json);

    if (json.success) {
      setBanners(Array.isArray(json.data) ? json.data : [json.data]);
    }
  } catch (err) {
    console.log("Banner Error:", err);
  }
};
const sliderData =
  banners.length > 1 ? [...banners, ...banners] : banners;
useEffect(() => {
  if (sliderData.length <= 1) return;

  const interval = setInterval(() => {
    const next = currentIndex + 1;

    flatListRef.current?.scrollToIndex({
      index: next,
      animated: true,
    });

    setCurrentIndex(next);

    if (next >= banners.length * 2 - 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: false,
        });
        setCurrentIndex(0);
      }, 300);
    }
  }, 3000);

  return () => clearInterval(interval);
}, [currentIndex, banners]);

  const gstAmount = (amount * GST_PERCENT) / 100;
  const couponBonusAmount = couponData?.bonusAmount || 0;
  const creditedAmount = amount + couponBonusAmount;
  const roundedCreditedAmount = Math.round(creditedAmount);
  const totalAmount = amount + gstAmount;

  const handleDownloadInvoice = useCallback(async (rechargeLogId: number) => {
    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      Alert.alert("Login Required", "Please log in again to download invoice");
      return;
    }

    try {
      setIsDownloadingInvoice(true);
      const savedInvoice = await downloadWalletRechargeInvoice(
        userId,
        rechargeLogId,
      );

      Alert.alert(
        "Invoice Saved",
        savedInvoice.usedStorageAccessFramework
          ? "Invoice saved to the folder you selected."
          : `Invoice saved to ${savedInvoice.fileName} inside app storage.`,
      );
    } catch (error) {
      console.log("Invoice download error:", error);
      Alert.alert(
        "Invoice Download Failed",
        error instanceof Error ? error.message : "Unable to download invoice",
      );
    } finally {
      setIsDownloadingInvoice(false);
    }
  }, []);
  const openCouponModal = async () => {
    try {
      setCouponLoading(true);
      setCouponModalVisible(true);
      await loadCouponList();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Unable to load coupons.");
    } finally {
      setCouponLoading(false);
    }
  };
  const proceedToPay = async () => {
    if (amount <= 0) {
      Alert.alert("Error", "Please select or enter amount");
      return;
    }

    if (normalizedGstin && !GSTIN_REGEX.test(normalizedGstin)) {
      Alert.alert(
        "Invalid GSTIN",
        "Please enter a valid GSTIN or leave it blank",
      );
      return;
    }

    if (!acceptTerms) {
      Alert.alert("Terms Required", "Please accept terms & conditions");
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      Alert.alert("Login Required", "Please log in to recharge your wallet");
      router.push("/login");
      return;
    }

    if (
      !(NativeModules as { RNRazorpayCheckout?: unknown }).RNRazorpayCheckout
    ) {
      Alert.alert(
        "Razorpay Not Available",
        "This build does not include the Razorpay native SDK. Use a native dev build with expo run:android or expo run:ios. It will not work in Expo Go.",
      );
      return;
    }

    try {
      setIsProcessingPayment(true);

      const orderResponse = await fetch(
        `${CLIENT_API_BASE_URL}/wallet/razorpay/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            rechargeAmount: amount,
            customerGstin: normalizedGstin,
            couponCode: couponData?.code || "",
          }),
        },
      );

      const orderJson = (await orderResponse.json()) as WalletOrderResponse;
      console.log("Wallet order response:", orderJson);
      if (!orderResponse.ok || !orderJson.success || !orderJson.data) {
        Alert.alert(
          "Payment Error",
          orderJson.message || "Unable to start payment",
        );
        return;
      }

      const paymentResult = (await RazorpayCheckout.open({
        key: orderJson.data.keyId,
        amount: String(orderJson.data.amount),
        currency: orderJson.data.currency,
        order_id: orderJson.data.orderId,
        name: "Bhavisya Katha",
        description: `Wallet recharge of ${t.currency}${orderJson.data.rechargeAmount}`,
        prefill: {
          name: orderJson.data.user.full_name ?? undefined,
          contact: orderJson.data.user.mobile ?? undefined,
        },
        notes: {
          userId: String(userId),
          rechargeAmount: String(orderJson.data.rechargeAmount),
          customerGstin: orderJson.data.customerGstin || "",
        },
        theme: { color: "#4B7BEC" },
      })) as RazorpaySuccess;

      const verifyResponse = await fetch(
        `${CLIENT_API_BASE_URL}/wallet/razorpay/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          }),
        },
      );

      const verifyJson = (await verifyResponse.json()) as WalletVerifyResponse;

      if (!verifyResponse.ok || !verifyJson.success || !verifyJson.data) {
        Alert.alert(
          "Verification Failed",
          verifyJson.message || "Payment was completed but verification failed",
        );
        return;
      }

      setWalletBalance(Number(verifyJson.data.wallet_balance) || 0);
      onWalletUpdated();
      setAmount(0);
      setGstin("");
      setCoupon("");
      setCouponData(null);
      setAcceptTerms(false);
      setBonusModalVisible(false);
      setWalletStep(1);
      setSuccessInvoiceId(Number(verifyJson.data.recharge_log_id) || null);
    } catch (error) {
      const paymentError = error as RazorpayError;
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : "Payment was cancelled or could not be completed";
      const message = paymentError?.description || fallbackMessage;
      const title = /cancel/i.test(message)
        ? "Payment Cancelled"
        : "Payment Failed";

      console.log("Razorpay checkout error:", error);
      Alert.alert(title, message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const onWalletUpdated = () => {
    headerRef.current?.reloadHeader();
  };
  const applyCoupon = async (
    couponCode = normalizedCoupon,
    options: { showAlert?: boolean; showBonusModal?: boolean } = {},
  ) => {
    const { showAlert = true, showBonusModal = false } = options;
    const couponToApply = couponCode.trim().toUpperCase();

    if (!hasAmount) {
      Alert.alert("Enter amount first");
      return;
    }

    if (!couponToApply) {
      Alert.alert("Coupon Required", "Please enter a coupon code");
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      Alert.alert("Login Required", "Please log in to apply a coupon");
      router.push("/login");
      return;
    }

    try {
      setIsApplyingCoupon(true);

      const res = await fetch(`${CLIENT_API_BASE_URL}/coupon/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            couponCode: couponToApply,
            amount,
          }),
        });

      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        Alert.alert("Coupon Invalid", json.message || "Unable to apply coupon");
        return;
      }

      const rawCoupon = json.data as CouponData & {
        bonus_percent?: number;
        bonus_amount?: number;
        min_amount?: number;
        credited_amount?: number;
      };
      const normalizedCouponData: CouponData = {
        ...rawCoupon,
        code: rawCoupon.code || couponToApply,
        minAmount: Number(rawCoupon.minAmount ?? rawCoupon.min_amount ?? 0),
        bonusPercent: Number(
          rawCoupon.bonusPercent ?? rawCoupon.bonus_percent ?? 0,
        ),
        bonusAmount: Number(
          rawCoupon.bonusAmount ?? rawCoupon.bonus_amount ?? 0,
        ),
        creditedAmount: Number(
          rawCoupon.creditedAmount ?? rawCoupon.credited_amount ?? amount,
        ),
        amount: Number(rawCoupon.amount ?? amount),
      };

      setCouponData(normalizedCouponData);
      setCoupon(normalizedCouponData.code);
      if (showBonusModal) {
        setBonusModalVisible(true);
      } else if (showAlert) {
        Alert.alert(
          "Coupon Applied",
          `Bonus Rs.${normalizedCouponData.bonusAmount} added`,
        );
      }
    } catch (error) {
      console.log("Apply coupon error:", error);
      Alert.alert("Coupon Error", "Unable to apply coupon right now");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  useEffect(() => {
    if (walletStep !== 2 || !hasAmount || coupon.trim() || couponData || !couponList.length) {
      return;
    }

    const eligibleCoupons = couponList.filter(
      (item) => amount >= Number(item.min_amount),
    );
    const bestCoupon = [...eligibleCoupons].sort(
      (a, b) => Number(b.bonus_percent) - Number(a.bonus_percent),
    )[0];

    if (!bestCoupon) return;

    const timer = setTimeout(() => {
      setAutoApplyingCoupon(true);
      void applyCoupon(bestCoupon.code, {
        showAlert: false,
        showBonusModal: true,
      }).finally(() => setAutoApplyingCoupon(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, coupon, couponData, couponList, hasAmount, walletStep]);

  useEffect(() => {
    if (!bonusModalVisible) return;

    const timer = setTimeout(() => setBonusModalVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [bonusModalVisible]);
  const applyCouponFromList = (code: string) => {
    setCoupon(code);
    setCouponModalVisible(false);
    void applyCoupon(code);
  };
  const openTermsModal = async () => {
    try {
      setIsTermsLoading(true);

      const response = await fetch(`${CLIENT_AUTH_API_BASE_URL}/terms`);
      const json = (await response.json()) as TermsResponse;

      if (!response.ok || !json.success || !json.content) {
        Alert.alert(
          "Terms Unavailable",
          json.message || "Unable to load terms and conditions right now",
        );
        return;
      }

      setTermsContent(json.content);
      setTermsVersion(json.version ?? null);
      setIsTermsModalVisible(true);
    } catch (error) {
      console.log("Terms fetch error:", error);
      Alert.alert(
        "Terms Unavailable",
        "Unable to load terms and conditions right now",
      );
    } finally {
      setIsTermsLoading(false);
    }
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <LoadingScreen loadingScreen={isTermsLoading} />

        <Header
          ref={headerRef}
          onProfilePress={() => router.push("/profile")}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.containerContent}
          showsVerticalScrollIndicator={false}
        >
          <Modal
            visible={couponModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setCouponModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
<Text style={styles.modalTitle}>{t.availableCoupons}</Text>
                  <TouchableOpacity
                    onPress={() => setCouponModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Feather name="x" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                {couponLoading ? (
                  <LoadingScreen loadingScreen={true} />
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {couponList.length === 0 ? (
                      <View style={styles.emptyCouponState}>
                        <View style={styles.emptyCouponIcon}>
                          <Feather name="tag" size={28} color="#2563EB" />
                        </View>
                        <Text style={styles.emptyCouponTitle}>{t.noCoupons}</Text>
                        <Text style={styles.emptyCouponText}>{t.noCouponsDesc}</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={() => setCouponModalVisible(false)}>
                          <Text style={styles.modalButtonText}>{t.close}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      couponList.map((item) => (
                        <View key={item.id} style={styles.couponCard}>
                          <View style={styles.couponCardTopRow}>
                            <View style={styles.couponCodePill}><Text style={styles.couponCodeText}>{item.code}</Text></View>
                            <Text style={styles.couponExpiry}>{item.usage_per_user} uses per user</Text>
                          </View>
                          <View style={styles.couponMetaRow}>
                            <View style={styles.couponMetaChip}><Text style={styles.couponMetaLabel}>Minimum</Text><Text style={styles.couponMetaValue}>{t.currency}{item.min_amount}</Text></View>
                            <View style={styles.couponMetaChip}><Text style={styles.couponMetaLabel}>Bonus</Text><Text style={styles.couponMetaValue}>{item.bonus_percent}%</Text></View>
                            <View style={styles.couponMetaChip}><Text style={styles.couponMetaLabel}>Max bonus</Text><Text style={styles.couponMetaValue}>{t.currency}{item.max_bonus}</Text></View>
                          </View>
                          <TouchableOpacity style={styles.couponApplyButton} onPress={() => applyCouponFromList(item.code)}>
                            <Text style={styles.couponApplyButtonText}>Apply Coupon</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                    {couponList.length > 0 ? (
                      <TouchableOpacity style={styles.modalButton} onPress={() => setCouponModalVisible(false)}>
                        <Text style={styles.modalButtonText}>Close</Text>
                      </TouchableOpacity>
                    ) : null}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
{banners.length > 0 && (
  <View
    style={{
      marginTop: -30,
      marginBottom: -30,
    }}
  >
    <Carousel
      loop={banners.length > 1}
      autoPlay={banners.length > 1}
      autoPlayInterval={3000}
      width={width - 40}
      height={(width - 40) / (12 / 5)}
      data={banners}
      pagingEnabled
      scrollAnimationDuration={800}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (item.click_url) {
              // router.push(item.click_url);
            }
          }}
        >
          <Image
            source={{ uri: item.image }}
            style={{
              width: width - 40,
              height: (width - 40) / (12 / 5),
              borderRadius: 20,
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    />
  </View>
)}
          <Text style={styles.title}>{t.wallet}</Text>

          {walletStep === 1 ? (
            <>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>{t.balance}</Text>
                <Text style={styles.balanceValue}>
                  {t.currency} {walletBalance}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>{t.selectAmount}</Text>
              <View style={styles.amountGrid}>
                {presetAmounts.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.amountBox,
                      amount === val && styles.amountBoxActive,
                    ]}
                    onPress={() => setAmount(val)}
                    disabled={isProcessingPayment}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        amount === val && styles.amountTextActive,
                      ]}
                    >
                      {t.currency} {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder={t.customAmount}
                keyboardType="numeric"
                value={amount ? String(amount) : ""}
                onChangeText={(v) => setAmount(Number(v) || 0)}
                style={styles.input}
                editable={!isProcessingPayment}
                placeholderTextColor={"rgb(56, 56, 50)"}
              />

              <TouchableOpacity
                style={[
                  styles.payButton,
                  !hasAmount && styles.payButtonDisabled,
                ]}
                onPress={() => setWalletStep(2)}
                disabled={!hasAmount || isProcessingPayment}
              >
                <Text style={styles.payButtonText}>{t.next}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setWalletStep(1);
                  setCoupon("");
                  setCouponData(null);
                  setBonusModalVisible(false);
                }}
                disabled={isProcessingPayment || autoApplyingCoupon}
              >
                <Feather name="arrow-left" size={16} color="#2563EB" />
                <Text style={styles.backButtonText}>{t.back}</Text>
              </TouchableOpacity>

              <View style={styles.selectedAmountCard}>
                <Text style={styles.selectedAmountLabel}>{t.rechargeAmount}</Text>
                <Text style={styles.selectedAmountValue}>
                  {t.currency} {amount.toFixed(2)}
                </Text>
              </View>

              {couponHint ? <Text style={styles.couponHint}>{couponHint}</Text> : null}

          <View style={styles.couponRow}>
            <TextInput
placeholder={t.enterCoupon}
              value={coupon}
              onChangeText={setCoupon}
              style={[styles.input, styles.couponInput]}
              editable={!isProcessingPayment && !isApplyingCoupon && !autoApplyingCoupon}
              autoCapitalize="characters"
              placeholderTextColor={"rgb(56, 56, 50)"}
            />

            <TouchableOpacity
                onPress={
                  couponData
                    ? () => {
                        setCoupon("");
                        setCouponData(null);
                      }
                    : () => void applyCoupon()
                }
              style={[
                styles.couponButton,
                isProcessingPayment || isApplyingCoupon
                  ? styles.couponButtonDisabled
                  : couponData
                    ? styles.couponButtonRemove
                    : hasAmount
                      ? styles.couponButtonApply
                      : styles.couponButtonDisabled,
              ]}
              disabled={
                isProcessingPayment ||
                isApplyingCoupon ||
                autoApplyingCoupon ||
                (!hasAmount && !couponData)
              }
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {isApplyingCoupon
                  ? "..."
                  : couponData
                    ? t.remove
                    : hasAmount
                      ? t.apply
                      : t.enterAmount}
              </Text>
            </TouchableOpacity>
          </View>

                    <TextInput
            placeholder={t.gstin}
            autoCapitalize="characters"
            value={gstin}
            onChangeText={(value) => setGstin(value.toUpperCase())}
            style={styles.input}
            editable={!isProcessingPayment}
            maxLength={15}
            placeholderTextColor={"rgb(56, 56, 50)"}
          />
          
          {!hasAmount ? (
            <Text style={styles.helperText}>
              {t.enterAmountFirst}
            </Text>
          ) : null}
          <TouchableOpacity onPress={openCouponModal}>
<Text style={styles.viewCouponsLink}>{t.viewAllCoupons}</Text>       
   </TouchableOpacity>
          {couponData ? (
            <Text style={styles.couponSuccessText}>
              {couponData.code} applied. Bonus {t.currency}{" "}
              {couponData.bonusAmount.toFixed(2)}
            </Text>
          ) : null}
          {/* Calculation */}
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>{t.rechargeAmount}</Text>
            <Text style={styles.calculationValue}>
              {t.currency} {amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>{t.gst}</Text>
            <Text style={styles.calculationValue}>
              {t.currency} {gstAmount.toFixed(2)}
            </Text>
          </View>
          {couponData && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>{t.couponBonus}</Text>
              <Text style={styles.calculationValue}>
                {t.currency} {couponData.bonusAmount}
              </Text>
            </View>
          )}
          <View style={[styles.calculationRow, styles.summaryRow]}>
            <Text style={styles.totalText}>{t.walletCredit}</Text>
            <Text style={styles.totalText}>
              {t.currency} {roundedCreditedAmount}
            </Text>
          </View>
          <View style={[styles.calculationRow, styles.summaryRow]}>
            <Text style={styles.totalText}>{t.total}</Text>
            <Text style={styles.totalText}>
              {t.currency} {totalAmount.toFixed(2)}
            </Text>
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptTerms(!acceptTerms)}
            disabled={isProcessingPayment}
          >
            <Feather
              name={acceptTerms ? "check-square" : "square"}
              size={20}
              color="#4B7BEC"
            />
            <Text style={styles.termsText}>
              I accept the{" "}
              <Text style={styles.termsLink} onPress={openTermsModal}>
                terms & conditions
              </Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsNote} onPress={openTermsModal}>
            {t.terms}
          </Text>

          {/* Pay Button */}
          <TouchableOpacity
            style={[
              styles.payButton,
              (!hasAmount || !acceptTerms || isProcessingPayment) &&
                styles.payButtonDisabled,
            ]}
            onPress={proceedToPay}
            disabled={isProcessingPayment || !hasAmount || !acceptTerms}
          >
            <Text style={styles.payButtonText}>
              {isProcessingPayment ? "Processing..." : t.proceed}
            </Text>
          </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={bonusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBonusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.bonusModalOverlay}
          activeOpacity={1}
          onPress={() => setBonusModalVisible(false)}
        >
          <View style={styles.bonusModalCard}>
            <View style={styles.bonusIconWrap}>
              <Feather name="gift" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.bonusModalTitle}>{t.bonusCongratulations}</Text>
            <Text style={styles.bonusModalText}>
              {t.bonusEarned
                .replace("{percent}", String(couponData?.bonusPercent || 0))}
            </Text>
            <Text style={styles.bonusModalText}>
              {t.bonusAmount
                .replace("{amount}", `${t.currency} ${Number(couponData?.bonusAmount || 0).toFixed(2)}`)}
            </Text>
            <Text style={styles.bonusModalCredit}>
              {t.walletCreditTotal
                .replace("{amount}", `${t.currency} ${roundedCreditedAmount}`)}
            </Text>
            <Text style={styles.bonusModalCode}>{couponData?.code}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isTermsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setIsTermsModalVisible(false)}>
                <Feather name="x" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {termsVersion ? (
                <Text style={styles.modalMeta}>Version {termsVersion}</Text>
              ) : null}
              <Text style={styles.modalBody}>{termsContent}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsTermsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(successInvoiceId)}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessInvoiceId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Feather name="check-circle" size={32} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Recharge Successful</Text>
            <Text style={styles.successText}>
              Wallet recharge completed successfully. You can download the
              invoice now, or we will redirect you to the home page in{" "}
              {successRedirectCount} seconds.
            </Text>

            <TouchableOpacity
              style={[
                styles.successPrimaryButton,
                isDownloadingInvoice && styles.payButtonDisabled,
              ]}
              onPress={() =>
                successInvoiceId
                  ? void handleDownloadInvoice(successInvoiceId)
                  : undefined
              }
              disabled={isDownloadingInvoice}
            >
              <Text style={styles.successPrimaryButtonText}>
                {isDownloadingInvoice ? "Downloading..." : "Download Invoice"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondaryButton}
              onPress={() => {
                setSuccessInvoiceId(null);
                router.replace("/");
              }}
            >
              <Text style={styles.successSecondaryButtonText}>Go To Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF4FF" },
  containerContent: {
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    color: "#0F172A",
  },
  balanceCard: {
    backgroundColor: "#1f3057",
    padding: 20,
    borderRadius: 22,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  balanceLabel: { color: "#C9A227", fontWeight: "600" },
  balanceValue: { fontSize: 24, fontWeight: "800", marginTop: 8, color: "#FFF" },
  sectionTitle: {
    fontWeight: "800",
    marginBottom: 12,
    color: "#0F172A",
    fontSize: 16,
  },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  amountBox: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  amountBoxActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  amountText: { fontWeight: "700", color: "#1E3A8A" },
  amountTextActive: { color: "#FFF" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 14,
    paddingVertical: 6,
  },
  backButtonText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 14,
  },
  selectedAmountCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  selectedAmountLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
  },
  selectedAmountValue: {
    color: "#1D4ED8",
    fontSize: 22,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  couponHint: {
    marginTop: -5,
    marginBottom: 10,
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  couponRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 4,
  },
  couponInput: {
    flex: 1,
    minWidth: 0,
  },
  couponButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    flexShrink: 0,
  },
  couponButtonApply: {
    backgroundColor: "#10B981",
  },
  couponButtonRemove: {
    backgroundColor: "#EF4444",
  },
  couponButtonDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.75,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 7,
    gap: 12,
  },
  calculationLabel: { color: "#334155", flex: 1 },
  calculationValue: { color: "#0F172A", fontWeight: "600" },
  couponSuccessText: {
    marginTop: 2,
    marginBottom: 8,
    color: "#059669",
    fontWeight: "600",
  },
  couponBonusLabel: {
    color: "#059669",
    fontWeight: "700",
  },
  totalText: { fontWeight: "800", fontSize: 16 },
  summaryRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 8,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  termsText: { flex: 1, fontWeight: "600" },
  termsLink: {
    color: "#2563EB",
    textDecorationLine: "underline",
  },
  termsNote: { fontSize: 12, color: "#f40909", marginTop: 6 },
  payButton: {
    backgroundColor: "#4B7BEC",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
    marginBottom: 30,
  },
  payButtonDisabled: { opacity: 0.7 },
  payButtonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  bonusModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  bonusModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  bonusIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bonusModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  bonusModalText: {
    color: "#475569",
    fontSize: 15,
    textAlign: "center",
    marginTop: 5,
  },
  bonusModalCredit: {
    color: "#059669",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },
  bonusModalCode: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 12,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingRight: 12,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  modalMeta: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#334155",
  },
  modalButton: {
    marginTop: 18,
    backgroundColor: "#4B7BEC",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
  },
  successText: {
    marginTop: 10,
    textAlign: "center",
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
  },
  successPrimaryButton: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  successPrimaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  successSecondaryButton: {
    marginTop: 10,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  successSecondaryButtonText: {
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 15,
  },
  couponCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  couponCardTopRow: {
    marginBottom: 12,
  },
  couponCodePill: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  couponCodeText: {
    color: "#1D4ED8",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  couponExpiry: {
    color: "#64748B",
    fontSize: 12,
  },
  couponMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  couponMetaChip: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  couponMetaLabel: {
    color: "#64748B",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: "700",
  },
  couponMetaValue: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 15,
  },
  couponApplyButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  couponApplyButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  emptyCouponState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyCouponIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyCouponTitle: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 16,
    textAlign: "center",
  },
  emptyCouponText: {
    color: "#475569",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  helperText: {
    marginTop: -2,
    marginBottom: 10,
    color: "#64748B",
    fontSize: 12,
  },
  viewCouponsLink: {
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 10,
    textAlign: "right",
  },
});
