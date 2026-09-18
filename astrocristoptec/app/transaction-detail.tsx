import React,{useState} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { downloadWalletRechargeInvoice } from '../lib/invoice';
import {
  fetchTransactionHistory,
  getTransactionDetailParams,
  TransactionItem,
} from '../lib/profileHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';
const formatAmount = (value?: string | string[]) => {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const amount = Number(normalizedValue ?? 0);

  return `\u20B9${Number.isFinite(amount) ? amount : 0}`;
};

const readParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
};

const DetailRow = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, mono && styles.detailMono]}>
      {value || '--'}
    </Text>
  </View>
);

export default function TransactionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const description = readParam(params.description) || 'Wallet recharge';
  const date = readParam(params.date);
  const eventType = readParam(params.eventType);
  const status = readParam(params.paymentStatus) || readParam(params.status);
  const currency = readParam(params.currency) || 'INR';
  const razorpayOrderId = readParam(params.razorpayOrderId);
  const razorpayPaymentId = readParam(params.razorpayPaymentId);
  const razorpaySignature = readParam(params.razorpaySignature);
  const couponCode = readParam(params.couponCode);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  
const handleDownloadInvoice = async (transaction: any) => {
    if (!transaction.rechargeLogId) {
      Alert.alert('Invoice Unavailable', 'Invoice is not available for this transaction.');
      return;
    }

    try {
      setDownloadingInvoiceId(transaction.id);
      const userId = await AsyncStorage.getItem('user_id');

      if (!userId) {
        router.replace('/login');
        return;
      }

      const savedInvoice = await downloadWalletRechargeInvoice(
        userId,
        transaction.rechargeLogId
      );

      Alert.alert(
        'Invoice Saved',
        savedInvoice.usedStorageAccessFramework
          ? 'Invoice saved to the folder you selected.'
          : `Invoice saved to ${savedInvoice.fileName} inside app storage.`
      );
    } catch (error) {
      console.log('Transaction invoice download error:', error);
      Alert.alert(
        'Invoice Download Failed',
        error instanceof Error ? error.message : 'Unable to download invoice'
      );
    } finally {
      setDownloadingInvoiceId(null);
    }
  };
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4B7BEC" />

      <LinearGradient colors={['#4B7BEC', '#667eea']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Detail</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Feather name="check-circle" size={26} color="#10B981" />
          </View>
          <Text style={styles.summaryTitle}>{description
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())}
    </Text>
          <Text style={styles.summaryAmount}>{formatAmount(params.amount)}</Text>
          <Text style={styles.summaryDate}>{date || '--'}</Text>
                                         {params.eventType === "wallet_recharge" && params.rechargeLogId ? (
                            <TouchableOpacity
                              style={styles.invoiceBtn}
                              onPress={() => void handleDownloadInvoice(params)}
                            >
                              <Feather name="download" size={15} color="#2563EB" />
                              <Text style={styles.invoiceBtnText}>
                                {downloadingInvoiceId === params.id ? 'Saving...' : 'Invoice'}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
        </View>

        <View style={styles.detailCard}>
          <DetailRow label="Recharge Amount" value={formatAmount(params.recharge_amount)} />
          <DetailRow label="GST Amount" value={formatAmount(params.gstAmount)} />
          <DetailRow label="Coupon Code" value={couponCode || '--'} />
          <DetailRow label="Coupon Bonus" value={formatAmount(params.couponBonusAmount)} />
          <DetailRow label="Wallet Credit" value={formatAmount(params.creditedAmount)} />
          <DetailRow label="Payable Amount" value={formatAmount(params.payableAmount)} />
          <DetailRow label="Previous Balance" value={formatAmount(params.previousBalance)} />
          <DetailRow label="After Balance" value={formatAmount(params.afterBalance)} />
          <DetailRow label="Currency" value={currency} />
          <DetailRow label="Payment Status" value={status || '--'} />
          <DetailRow label="Event Type" value={eventType || '--'} />
          <DetailRow label="Razorpay Order ID" value={razorpayOrderId || '--'} mono />
          <DetailRow label="Razorpay Payment ID" value={razorpayPaymentId || '--'} mono />
          <DetailRow label="Razorpay Signature" value={razorpaySignature || '--'} mono />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    flex: 1,
    minWidth: 0,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  summaryAmount: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
  },
  summaryDate: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  detailRow: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
  },
  detailMono: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
   invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 0,
    paddingHorizontal: 5,
    paddingVertical: 7,
    borderRadius: 50,
    backgroundColor: '#DBEAFE',
    flexShrink: 0,
    textAlign: 'center',
    justifyContent: 'center',
    width: "40%",
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
});
