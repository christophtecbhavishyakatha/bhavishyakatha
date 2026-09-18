import React, { useCallback, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { downloadWalletRechargeInvoice } from '../lib/invoice';
import LoadingScreen from './components/loadingScreen';
import {
  fetchTransactionHistory,
  getTransactionDetailParams,
  TransactionItem,
} from '../lib/profileHistory';

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  const openTransactionDetail = (transaction: TransactionItem) => {
    router.push({
      pathname: '/transaction-detail',
      params: getTransactionDetailParams(transaction),
    });
  };

  useFocusEffect(
    useCallback(() => {
      const loadTransactions = async () => {
        try {
          setLoading(true);
          const userId = await AsyncStorage.getItem('user_id');

          if (!userId) {
            router.replace('/login');
            return;
          }

          const data = await fetchTransactionHistory(userId);
          setTransactions(data);
        } finally {
          setLoading(false);
        }
      };

      loadTransactions();
    }, [router])
  );

  const handleDownloadInvoice = async (transaction: TransactionItem) => {
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
      <LoadingScreen loadingScreen={loading} />

      <LinearGradient colors={['#4B7BEC', '#667eea']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {transactions.length ? (
            transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.listItem}
                activeOpacity={0.82}
                onPress={() => openTransactionDetail(transaction)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    transaction.type === 'credit' ? styles.creditBg : styles.debitBg,
                  ]}
                >
                  <Feather
                    name={transaction.type === 'credit' ? 'arrow-down-left' : 'arrow-up-right'}
                    size={18}
                    color={transaction.type === 'credit' ? '#10B981' : '#EF4444'}
                  />
                </View>
                <View style={styles.listContent}>
<Text style={styles.listTitle}>
  {transaction.description
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())}
</Text>
                  <Text style={styles.listDate}>{transaction.date}</Text>

                                  {transaction.eventType === "wallet_recharge" && transaction.rechargeLogId ? (
                  <TouchableOpacity
                    style={styles.invoiceBtn}
                    onPress={() => void handleDownloadInvoice(transaction)}
                  >
                    <Feather name="download" size={15} color="#2563EB" />
                    <Text style={styles.invoiceBtnText}>
                      {downloadingInvoiceId === transaction.id ? 'Saving...' : 'Invoice'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                </View>
                <Text
                  style={[
                    styles.listAmount,
                    transaction.type === 'credit' ? styles.creditText : styles.debitText,
                  ]}
                >
                  {transaction.type === 'credit' ? '+' : '-'}{"\u20B9"}{transaction.amount}
                </Text>

                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
              
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
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
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    flexWrap: 'wrap',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditBg: {
    backgroundColor: '#D1FAE5',
  },
  debitBg: {
    backgroundColor: '#FEE2E2',
  },
  listContent: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  listDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  listAmount: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 0,
  },
  creditText: {
    color: '#10B981',
  },
  debitText: {
    color: '#EF4444',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
    paddingVertical: 8,
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
