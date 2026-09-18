import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  NativeModules,
  ScrollView,
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

import {
  CLIENT_API_BASE_URL,
  CLIENT_AUTH_API_BASE_URL,
} from "../../lib/api";

const GST_PERCENT = 18;

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type CouponData = {
  couponId: number;
  code: string;
  minAmount: number;
  bonusPercent: number;
  bonusAmount: number;
  creditedAmount: number;
  amount: number;
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

type Props = {
  onClose: () => void;
  onWalletUpdated?: (newBalance: number) => void;
};

const presetAmounts = [51, 101, 201, 501, 1001, 2001, 5001, 10001];

export default function WalletRecharge({
  onClose,
  onWalletUpdated,
}: Props) {
  const [language, setLanguage] = useState("en");

  const [amount, setAmount] = useState(0);
  const [gstin, setGstin] = useState("");
  const [coupon, setCoupon] = useState("");

  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [couponList, setCouponList] = useState<CouponListItem[]>([]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [autoApplyingCoupon, setAutoApplyingCoupon] = useState(false);
  const [walletStep, setWalletStep] = useState<1 | 2>(1);

  const [acceptTerms, setAcceptTerms] = useState(false);

  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [termsVersion, setTermsVersion] = useState<string | null>(null);

  const normalizedGstin = gstin.trim().toUpperCase();
  const normalizedCoupon = coupon.trim().toUpperCase();

  const hasAmount = amount > 0;

  const gstAmount = (amount * GST_PERCENT) / 100;
  const couponBonusAmount = couponData?.bonusAmount || 0;
  const creditedAmount = amount + couponBonusAmount;
  const roundedCreditedAmount = Math.round(creditedAmount);
  const totalAmount = amount + gstAmount;

  const translations: any = {
    en: {
      recharge: "Recharge Wallet",
      selectAmount: "Select Amount",
      customAmount: "Enter Amount",
      gstin: "GSTIN (Optional)",
      enterCoupon: "Enter Coupon Code",
      apply: "Apply",
      remove: "Remove",
      viewCoupons: "View All Coupon Codes",
      rechargeAmount: "Recharge Amount",
      gst: "GST (18%)",
      couponBonus: "Coupon Bonus",
      walletCredit: "Wallet Credit",
      total: "Total Payable",
      accept: "I accept the terms & conditions",
      terms: "Once added, amount is non-refundable",
      proceed: "Proceed to Pay",
      termsTitle: "Terms & Conditions",
      close: "Close",
      availableCoupons: "Available Coupons",
      noCoupons: "No coupons available",
      couponBonusAvailable: "{percent}% bonus available. Use code {code}",
      couponAddMore: "Add ₹{amount} more to get {percent}% bonus with code {code}",
      noCouponBonus: "No coupon bonus is available for this amount",
      next: "Next",
      back: "Back",
      bonusCongratulations: "Congratulations!",
      bonusEarned: "You earned {percent}% bonus",
      bonusAmount: "Bonus amount: {amount}",
      walletCreditTotal: "Total wallet credit: {amount}",
    },

    bn: {
      recharge: "ওয়ালেট রিচার্জ",
      selectAmount: "পরিমাণ নির্বাচন করুন",
      customAmount: "পরিমাণ লিখুন",
      gstin: "GSTIN (ঐচ্ছিক)",
      enterCoupon: "কুপন কোড লিখুন",
      apply: "প্রয়োগ করুন",
      remove: "সরান",
      viewCoupons: "সব কুপন কোড দেখুন",
      rechargeAmount: "রিচার্জের পরিমাণ",
      gst: "জিএসটি (১৮%)",
      couponBonus: "কুপন বোনাস",
      walletCredit: "ওয়ালেটে যোগ হবে",
      total: "মোট পরিশোধযোগ্য",
      accept: "আমি শর্তাবলী মেনে নিচ্ছি",
      terms: "একবার ওয়ালেটে যোগ করা অর্থ ফেরতযোগ্য নয়",
      proceed: "পেমেন্ট করুন",
      termsTitle: "শর্তাবলী",
      close: "বন্ধ করুন",
      availableCoupons: "উপলব্ধ কুপন",
      noCoupons: "কোনও কুপন পাওয়া যায়নি",
      next: "পরবর্তী",
      back: "পিছনে",
      bonusCongratulations: "অভিনন্দন!",
      bonusEarned: "আপনি {percent}% বোনাস পেয়েছেন",
      bonusAmount: "বোনাসের পরিমাণ: {amount}",
      walletCreditTotal: "মোট ওয়ালেট ক্রেডিট: {amount}",
    },
  };

  const t = { ...translations.en, ...(translations[language] || {}) };

  const eligibleCoupons = couponList.filter(
    (item) => amount >= Number(item.min_amount),
  );
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

  useEffect(() => {
    loadLanguage();
    void loadCouponList();
  }, []);

  useEffect(() => {
    if (couponData && couponData.amount !== amount) {
      setCouponData(null);
      setCoupon("");
    }
  }, [amount]);

  useEffect(() => {
    if (couponData && couponData.code.toUpperCase() !== normalizedCoupon) {
      setCouponData(null);
    }
  }, [couponData, normalizedCoupon]);

  useEffect(() => {
    if (
      walletStep !== 2 ||
      !hasAmount ||
      coupon.trim() ||
      couponData ||
      !couponList.length
    ) {
      return;
    }

    const eligible = couponList.filter(
      (item) => amount >= Number(item.min_amount),
    );
    const best = [...eligible].sort(
      (a, b) => Number(b.bonus_percent) - Number(a.bonus_percent),
    )[0];

    if (!best) return;

    const timer = setTimeout(() => {
      setAutoApplyingCoupon(true);
      void applyCoupon(best.code, { showAlert: false, showBonusModal: true })
        .finally(() => setAutoApplyingCoupon(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [amount, coupon, couponData, couponList, hasAmount, walletStep]);

  useEffect(() => {
    if (!bonusModalVisible) return;

    const timer = setTimeout(() => setBonusModalVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [bonusModalVisible]);

  const loadLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("user-language");

      if (lang === "bn" || lang === "hi") {
        setLanguage(lang);
      } else {
        setLanguage("en");
      }
    } catch {
      setLanguage("en");
    }
  };

  const loadCouponList = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) return;

      const response = await fetch(
        `${CLIENT_API_BASE_URL}/coupon/list?userId=${userId}`
      );

      const json = await response.json();

      if (json.success && Array.isArray(json.data)) {
        setCouponList(json.data);
      } else {
        setCouponList([]);
      }
    } catch (error) {
      console.log("Coupon list error:", error);
      setCouponList([]);
    }
  };

  const openCouponModal = async () => {
    setCouponLoading(true);
    setCouponModalVisible(true);

    await loadCouponList();

    setCouponLoading(false);
  };

  const applyCoupon = async (
    couponCode = normalizedCoupon,
    options: { showAlert?: boolean; showBonusModal?: boolean } = {},
  ) => {
    const { showAlert = true, showBonusModal = false } = options;
    if (!hasAmount) {
      Alert.alert(
        "Enter Amount",
        "Please enter recharge amount first."
      );
      return;
    }

    const couponToApply = couponCode.trim().toUpperCase();

    if (!couponToApply) {
      Alert.alert(
        "Coupon Required",
        "Please enter a coupon code."
      );
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      Alert.alert(
        "Login Required",
        "Please login again."
      );
      return;
    }

    try {
      setIsApplyingCoupon(true);

      const response = await fetch(
        `${CLIENT_API_BASE_URL}/coupon/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            couponCode: couponToApply,
            amount,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success || !json.data) {
        Alert.alert(
          "Coupon Invalid",
          json.message || "Unable to apply coupon."
        );
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
      } else if (!showAlert) {
        return;
      }

      Alert.alert(
        "Coupon Applied",
        `Bonus ₹${Number(json.data.bonusAmount).toFixed(2)} added`
      );
    } catch (error) {
      console.log("Coupon error:", error);

      Alert.alert(
        "Coupon Error",
        "Unable to apply coupon right now."
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const applyCouponFromList = (code: string) => {
    setCoupon(code);
    setCouponModalVisible(false);

    void applyCoupon(code);
  };

  const openTermsModal = async () => {
    try {
      const response = await fetch(
        `${CLIENT_AUTH_API_BASE_URL}/terms`
      );

      const json = await response.json();

      if (!response.ok || !json.success || !json.content) {
        Alert.alert(
          "Terms Unavailable",
          json.message || "Unable to load terms."
        );
        return;
      }

      setTermsContent(json.content);
      setTermsVersion(json.version ?? null);
      setTermsModalVisible(true);
    } catch (error) {
      console.log("Terms error:", error);

      Alert.alert(
        "Terms Unavailable",
        "Unable to load terms and conditions."
      );
    }
  };

  const proceedToPay = async () => {
    if (amount <= 0) {
      Alert.alert(
        "Error",
        "Please select or enter amount."
      );
      return;
    }

    if (
      normalizedGstin &&
      !GSTIN_REGEX.test(normalizedGstin)
    ) {
      Alert.alert(
        "Invalid GSTIN",
        "Please enter a valid GSTIN or leave it blank."
      );
      return;
    }

    if (!acceptTerms) {
      Alert.alert(
        "Terms Required",
        "Please accept terms & conditions."
      );
      return;
    }

    const userId = await AsyncStorage.getItem("user_id");

    if (!userId) {
      Alert.alert(
        "Login Required",
        "Please login again."
      );
      return;
    }

    if (
      !(NativeModules as {
        RNRazorpayCheckout?: unknown;
      }).RNRazorpayCheckout
    ) {
      Alert.alert(
        "Razorpay Not Available",
        "This build does not include the Razorpay native SDK."
      );
      return;
    }

    try {
      setIsProcessingPayment(true);

      // CREATE ORDER
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
        }
      );

      const orderJson =
        (await orderResponse.json()) as WalletOrderResponse;

      if (
        !orderResponse.ok ||
        !orderJson.success ||
        !orderJson.data
      ) {
        Alert.alert(
          "Payment Error",
          orderJson.message ||
            "Unable to start payment."
        );
        return;
      }

      // RAZORPAY
      const paymentResult =
        (await RazorpayCheckout.open({
          key: orderJson.data.keyId,
          amount: String(orderJson.data.amount),
          currency: orderJson.data.currency,
          order_id: orderJson.data.orderId,
          name: "Bhavisya Katha",
          description: `Wallet recharge of ₹${orderJson.data.rechargeAmount}`,

          prefill: {
            name:
              orderJson.data.user.full_name ??
              undefined,
            contact:
              orderJson.data.user.mobile ??
              undefined,
          },

          notes: {
            userId: String(userId),
            rechargeAmount: String(
              orderJson.data.rechargeAmount
            ),
            customerGstin:
              orderJson.data.customerGstin || "",
          },

          theme: {
            color: "#4B7BEC",
          },
        })) as RazorpaySuccess;

      // VERIFY PAYMENT
      const verifyResponse = await fetch(
        `${CLIENT_API_BASE_URL}/wallet/razorpay/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            razorpay_order_id:
              paymentResult.razorpay_order_id,
            razorpay_payment_id:
              paymentResult.razorpay_payment_id,
            razorpay_signature:
              paymentResult.razorpay_signature,
          }),
        }
      );

      const verifyJson =
        (await verifyResponse.json()) as WalletVerifyResponse;

      if (
        !verifyResponse.ok ||
        !verifyJson.success ||
        !verifyJson.data
      ) {
        Alert.alert(
          "Verification Failed",
          verifyJson.message ||
            "Payment completed but verification failed."
        );
        return;
      }

      const newBalance =
        Number(
          verifyJson.data.wallet_balance
        ) || 0;

      // Tell ChatScreen that wallet has changed
      onWalletUpdated?.(newBalance);

      // Reset form
      setAmount(0);
      setGstin("");
      setCoupon("");
      setCouponData(null);
      setAcceptTerms(false);
      setBonusModalVisible(false);
      setWalletStep(1);

      Alert.alert(
        "Recharge Successful",
        `₹${Number(
          verifyJson.data.recharge_amount
        ).toFixed(2)} added to your wallet.`,
        [
          {
            text: "Continue Chat",
            onPress: onClose,
          },
        ]
      );
    } catch (error) {
      const paymentError =
        error as RazorpayError;

      const fallbackMessage =
        error instanceof Error
          ? error.message
          : "Payment was cancelled or failed.";

      const message =
        paymentError?.description ||
        fallbackMessage;

      const title = /cancel/i.test(message)
        ? "Payment Cancelled"
        : "Payment Failed";

      console.log(
        "Razorpay checkout error:",
        error
      );

      Alert.alert(title, message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t.recharge}
        </Text>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          disabled={isProcessingPayment}
        >
          <Feather
            name="x"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {walletStep === 1 ? (
          <>
        {/* AMOUNT */}
        <Text style={styles.sectionTitle}>
          {t.selectAmount}
        </Text>

        <View style={styles.amountGrid}>
          {presetAmounts.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.amountBox,
                amount === value &&
                  styles.amountBoxActive,
              ]}
              onPress={() => setAmount(value)}
              disabled={isProcessingPayment}
            >
              <Text
                style={[
                  styles.amountText,
                  amount === value &&
                    styles.amountTextActive,
                ]}
              >
                ₹ {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CUSTOM AMOUNT */}
        <TextInput
          placeholder={t.customAmount}
          keyboardType="numeric"
          value={amount ? String(amount) : ""}
          onChangeText={(value) =>
            setAmount(Number(value) || 0)
          }
          style={styles.input}
          editable={!isProcessingPayment}
          placeholderTextColor="#64748B"
        />

        <TouchableOpacity
          style={[styles.payButton, !hasAmount && styles.payButtonDisabled]}
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
            ₹ {amount.toFixed(2)}
          </Text>
        </View>

        {couponHint ? (
          <Text style={styles.couponHint}>{couponHint}</Text>
        ) : null}

        {/* COUPON */}
        <View style={styles.couponRow}>
          <TextInput
            placeholder={t.enterCoupon}
            value={coupon}
            onChangeText={setCoupon}
            style={[
              styles.input,
              styles.couponInput,
            ]}
            editable={
              !isProcessingPayment &&
              !isApplyingCoupon
            }
            autoCapitalize="characters"
            placeholderTextColor="#64748B"
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
            disabled={
              isProcessingPayment ||
              isApplyingCoupon ||
              (!hasAmount && !couponData)
            }
            style={[
              styles.couponButton,
              couponData
                ? styles.removeButton
                : hasAmount
                ? styles.applyButton
                : styles.disabledButton,
            ]}
          >
            <Text style={styles.couponButtonText}>
              {isApplyingCoupon
                ? "..."
                : couponData
                ? t.remove
                : hasAmount
                ? t.apply
                : "Enter"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* VIEW COUPONS */}
        <TouchableOpacity
          onPress={openCouponModal}
          disabled={isProcessingPayment}
        >
          <Text style={styles.viewCoupons}>
            {t.viewCoupons}
          </Text>
        </TouchableOpacity>

        {/* APPLIED COUPON */}
        {couponData && (
          <Text style={styles.couponSuccess}>
            {couponData.code} applied. Bonus ₹
            {Number(
              couponData.bonusAmount
            ).toFixed(2)}
          </Text>
        )}

        {/* GSTIN */}
        <TextInput
          placeholder={t.gstin}
          autoCapitalize="characters"
          value={gstin}
          onChangeText={(value) =>
            setGstin(value.toUpperCase())
          }
          style={styles.input}
          editable={!isProcessingPayment}
          maxLength={15}
          placeholderTextColor="#64748B"
        />

        {/* CALCULATION */}
        <View style={styles.calculationRow}>
          <Text style={styles.calculationLabel}>
            {t.rechargeAmount}
          </Text>

          <Text style={styles.calculationValue}>
            ₹ {amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.calculationRow}>
          <Text style={styles.calculationLabel}>
            {t.gst}
          </Text>

          <Text style={styles.calculationValue}>
            ₹ {gstAmount.toFixed(2)}
          </Text>
        </View>

        {couponData && (
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>
              {t.couponBonus}
            </Text>

            <Text style={styles.calculationValue}>
              ₹{" "}
              {Number(
                couponData.bonusAmount
              ).toFixed(2)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.calculationRow,
            styles.totalRow,
          ]}
        >
          <Text style={styles.totalText}>
            {t.walletCredit}
          </Text>

          <Text style={styles.totalText}>
            ₹ {creditedAmount.toFixed(2)}
          </Text>
        </View>

        <View
          style={[
            styles.calculationRow,
            styles.totalRow,
          ]}
        >
          <Text style={styles.totalText}>
            {t.total}
          </Text>

          <Text style={styles.totalText}>
            ₹ {totalAmount.toFixed(2)}
          </Text>
        </View>

        {/* TERMS */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() =>
            setAcceptTerms(!acceptTerms)
          }
          disabled={isProcessingPayment}
        >
          <Feather
            name={
              acceptTerms
                ? "check-square"
                : "square"
            }
            size={20}
            color="#4B7BEC"
          />

          <Text style={styles.termsText}>
            {t.accept}{" "}
            <Text
              style={styles.termsLink}
              onPress={openTermsModal}
            >
              terms & conditions
            </Text>
          </Text>
        </TouchableOpacity>

        <Text
          style={styles.termsNote}
          onPress={openTermsModal}
        >
          {t.terms}
        </Text>

        {/* PAY */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!hasAmount ||
              !acceptTerms ||
              isProcessingPayment) &&
              styles.payButtonDisabled,
          ]}
          onPress={proceedToPay}
          disabled={
            !hasAmount ||
            !acceptTerms ||
            isProcessingPayment
          }
        >
          <Text style={styles.payButtonText}>
            {isProcessingPayment
              ? "Processing..."
              : t.proceed}
          </Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>

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
              {t.bonusEarned.replace(
                "{percent}",
                String(couponData?.bonusPercent || 0),
              )}
            </Text>
            <Text style={styles.bonusModalText}>
              {t.bonusAmount.replace(
                "{amount}",
                `₹ ${Number(couponData?.bonusAmount || 0).toFixed(2)}`,
              )}
            </Text>
            <Text style={styles.bonusModalCredit}>
              {t.walletCreditTotal.replace(
                "{amount}",
                `₹ ${roundedCreditedAmount}`,
              )}
            </Text>
            <Text style={styles.bonusModalCode}>{couponData?.code}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* COUPON MODAL */}
      <Modal
        visible={couponModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setCouponModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.availableCoupons}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setCouponModalVisible(false)
                }
              >
                <Feather
                  name="x"
                  size={22}
                  color="#0F172A"
                />
              </TouchableOpacity>
            </View>

            {couponLoading ? (
              <Text style={styles.loadingText}>
                Loading...
              </Text>
            ) : couponList.length === 0 ? (
              <Text style={styles.emptyText}>
                {t.noCoupons}
              </Text>
            ) : (
              <ScrollView>
                {couponList.map((item) => (
                  <View
                    key={item.id}
                    style={styles.couponCard}
                  >
                    <View
                      style={
                        styles.couponTopRow
                      }
                    >
                      <Text
                        style={
                          styles.couponCode
                        }
                      >
                        {item.code}
                      </Text>

                      <Text
                        style={
                          styles.couponUses
                        }
                      >
                        {item.usage_per_user} uses/user
                      </Text>
                    </View>

                    <View
                      style={
                        styles.couponInfoRow
                      }
                    >
                      <Text>
                        Minimum ₹
                        {item.min_amount}
                      </Text>

                      <Text>
                        Bonus{" "}
                        {item.bonus_percent}%
                      </Text>

                      <Text>
                        Max ₹
                        {item.max_bonus}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.couponApply
                      }
                      onPress={() =>
                        applyCouponFromList(
                          item.code
                        )
                      }
                    >
                      <Text
                        style={
                          styles.couponApplyText
                        }
                      >
                        Apply Coupon
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() =>
                setCouponModalVisible(false)
              }
            >
              <Text
                style={styles.modalCloseText}
              >
                {t.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TERMS MODAL */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setTermsModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t.termsTitle}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setTermsModalVisible(false)
                }
              >
                <Feather
                  name="x"
                  size={22}
                  color="#0F172A"
                />
              </TouchableOpacity>
            </View>

            {termsVersion ? (
              <Text style={styles.version}>
                Version {termsVersion}
              </Text>
            ) : null}

            <ScrollView>
              <Text style={styles.termsBody}>
                {termsContent}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() =>
                setTermsModalVisible(false)
              }
            >
              <Text
                style={styles.modalCloseText}
              >
                {t.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#EEF4FF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  content: {
    padding: 18,
    paddingBottom: 35,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  amountBox: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
  },

  amountBoxActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  amountText: {
    fontWeight: "700",
    color: "#1E3A8A",
  },

  amountTextActive: {
    color: "#FFFFFF",
  },

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
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#0F172A",
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
  },

  couponInput: {
    flex: 1,
    minWidth: 0,
  },

  couponButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },

  applyButton: {
    backgroundColor: "#10B981",
  },

  removeButton: {
    backgroundColor: "#EF4444",
  },

  disabledButton: {
    backgroundColor: "#94A3B8",
  },

  couponButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  viewCoupons: {
    color: "#2563EB",
    fontWeight: "700",
    marginBottom: 12,
  },

  couponSuccess: {
    color: "#059669",
    fontWeight: "700",
    marginBottom: 12,
  },

  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 7,
    gap: 12,
  },

  calculationLabel: {
    color: "#334155",
    flex: 1,
  },

  calculationValue: {
    color: "#0F172A",
    fontWeight: "600",
  },

  totalRow: {
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 8,
  },

  totalText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#0F172A",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },

  termsText: {
    flex: 1,
    fontWeight: "600",
    color: "#0F172A",
  },

  termsLink: {
    color: "#2563EB",
    textDecorationLine: "underline",
  },

  termsNote: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 7,
  },

  payButton: {
    backgroundColor: "#4B7BEC",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
    marginBottom: 20,
  },

  payButtonDisabled: {
    opacity: 0.6,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.50)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  couponCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  couponTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  couponCode: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },

  couponUses: {
    fontSize: 12,
    color: "#64748B",
  },

  couponInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  couponApply: {
    backgroundColor: "#2563EB",
    padding: 11,
    borderRadius: 10,
    alignItems: "center",
  },

  couponApplyText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  modalClose: {
    backgroundColor: "#4B7BEC",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },

  modalCloseText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  loadingText: {
    textAlign: "center",
    padding: 30,
    color: "#64748B",
  },

  emptyText: {
    textAlign: "center",
    padding: 30,
    color: "#64748B",
  },

  version: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 10,
  },

  termsBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#334155",
  },
});
