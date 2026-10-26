import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLIENT_AUTH_API_BASE_URL } from '../lib/api';
import {
  CallHistoryItem,
  fetchCallHistory,
  fetchTransactionHistory,
  getTransactionDetailParams,
  TransactionItem,
} from '../lib/profileHistory';

const getTranslations = (lang: string) => {
  const translations: any = {
    en: {
      profile: "Profile",
      personalDetails: "Personal Details",
      name: "Name",
      phone: "Phone",
      walletBalance: "Wallet Balance",
      addMoney: "Add Money",
      transactionHistory: "Recharge History",
      callHistory: "Call History",
      chatHistory: "Chat History",
      logout: "Logout",
      languageSettings: "Language Settings",
      viewAll: "View All",
      noTransactions: "No transactions yet",
      noCallHistory: "No call history yet",
      logoutConfirm: "Are you sure you want to logout?",
      editProfile: "Edit Profile",
      helpCenter: "Help Center",
      cancel: "Cancel",
      yes: "Yes",
      languages: {
        Hindi: "हिंदी",
        English: "English",
        Bengali: "বাংলা",
      },
    },
    hi: {
      profile: "प्रोफाइल",
      personalDetails: "व्यक्तिगत विवरण",
      name: "नाम",
      phone: "फ़ोन",
      walletBalance: "वॉलेट बैलेंस",
      addMoney: "पैसे जोड़ें",
      transactionHistory: "रिचार्ज इतिहास",
      callHistory: "कॉल इतिहास",
      chatHistory: "चैट इतिहास",
      logout: "लॉगआउट",
      languageSettings: "भाषा सेटिंग",
      viewAll: "सभी देखें",
      noTransactions: "अभी तक कोई लेनदेन नहीं",
      noCallHistory: "अभी तक कोई कॉल इतिहास नहीं",
      logoutConfirm: "क्या आप वाकई लॉगआउट करना चाहते हैं?",
      editProfile: "प्रोफाइल संपादित करें",
      helpCenter: "सहायता केंद्र",
      cancel: "रद्द करें",
      yes: "हाँ",
      languages: {
        Hindi: "हिंदी",
        English: "English",
        Bengali: "বাংলা",
      },
    },
    bn: {
      profile: "প্রোফাইল",
      personalDetails: "ব্যক্তিগত বিবরণ",
      name: "নাম",
      phone: "ফোন",
      walletBalance: "ওয়ালেট ব্যালেন্স",
      addMoney: "টাকা যোগ করুন",
      transactionHistory: "রিচার্জের ইতিহাস",
      callHistory: "কল ইতিহাস",
      chatHistory: "চ্যাট ইতিহাস",
      logout: "লগআউট",
      languageSettings: "ভাষা সেটিংস",
      viewAll: "সব দেখুন",
      noTransactions: "এখনও কোনো লেনদেন নেই",
      noCallHistory: "এখনও কোনো কল ইতিহাস নেই",
      logoutConfirm: "আপনি কি নিশ্চিত লগআউট করতে চান?",
      editProfile: "প্রোফাইল সম্পাদনা করুন",
      helpCenter: "সহায়তা কেন্দ্র",
      cancel: "বাতিল",
      yes: "হ্যাঁ",
      languages: {
        Hindi: "हिंदी",
        English: "English",
        Bengali: "বাংলা",
      },
    },
  };

  return translations[lang] || translations.en;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: 'John Doe',
    phone: '+91 9876543210',
    gender: '',
  });
  const [walletBalance, setWalletBalance] = useState(1250);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);

  const t = getTranslations(language);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/(tabs)');
        return true;
      });

      loadLanguage();
      loadUserProfile();

      return () => subscription.remove();
    }, [router])
  );

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('user_id');

      if (!userId) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${CLIENT_AUTH_API_BASE_URL}/users/${userId}`);
      const result = await response.json();
      console.log('Profile load response:', result);
      if (!result.success) {
        await AsyncStorage.removeItem('user_id');
        router.replace('/login');
        return;
      }

      const user = result.data;

      setUserData({
        name: user.full_name,
        phone: user.mobile,
        gender: user.gender,
      });
      setWalletBalance(user.wallet_balance || 0);

      const [transactionData, callData] = await Promise.all([
        fetchTransactionHistory(userId, 3),
        fetchCallHistory(userId, 3),
      ]);

      setTransactions(transactionData);
      setCallHistory(callData);
      setLoading(false);
    } catch (error) {
      console.log('Profile API error:', error);
      await AsyncStorage.removeItem('user_id');
      router.replace('/login');
    }
  };

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user-language');
      if (savedLang) {
        setLanguage(savedLang);
      }
    } catch (e) {
      console.log('Error loading language:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(t.logout, t.logoutConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.yes,
        onPress: async () => {
          await AsyncStorage.removeItem('user_id');
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const getGenderAvatar = () => {
    switch (userData?.gender) {
      case 'Male':
        return require('../assets/male.jpg');
      case 'Female':
        return require('../assets/female.jpg');
      default:
        return require('../assets/other.jpg');
    }
  };

  const changeLanguage = async (lang: string) => {
    try {
      await AsyncStorage.setItem('user-language', lang);
      setLanguage(lang);
    } catch (e) {
      console.log('Error saving language:', e);
    }
  };

  const openTransactionDetail = (transaction: TransactionItem) => {
    router.push({
      pathname: '/transaction-detail',
      params: getTransactionDetailParams(transaction),
    });
    console.log('Navigating to transaction detail with params:', getTransactionDetailParams(transaction));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#2A0B4F', '#4A148C']}
          style={styles.loadingBadge}
        >
          <Feather name="moon" size={24} color="#FFD700" />
        </LinearGradient>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2A0B4F" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarTitle}>{t.profile}</Text>
          <Text style={styles.topBarSubtitle}>Your spiritual account hub</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <LinearGradient
          colors={['#2A0B4F', '#4A148C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroOrb} />
          <View style={styles.heroRow}>
            <LinearGradient
              colors={['#FFD700', '#FF9933']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarFrame}
            >
              <Image source={getGenderAvatar()} style={styles.avatar} />
            </LinearGradient>
            <View style={styles.heroInfo}>
              <Text style={styles.userName} numberOfLines={1}>{userData.name}</Text>
              <View style={styles.phoneRow}>
                <Feather name="phone" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.phoneText} numberOfLines={1}>{userData.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.editProfileBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/login',
                    params: { mode: 'edit' },
                  })
                }
              >
                <Feather name="edit-2" size={14} color="#2A0B4F" />
                <Text style={styles.editProfileText}>{t.editProfile}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Wallet (overlaps hero) */}
        <View style={styles.walletWrap}>
          <View style={styles.walletCard}>
            <View style={styles.walletLeft}>
              <View style={styles.walletIcon}>
                <Feather name="credit-card" size={22} color="#B66A00" />
              </View>
              <View style={styles.walletTextWrap}>
                <Text style={styles.walletLabel}>{t.walletBalance}</Text>
                <Text style={styles.walletAmount}>{"\u20B9"}{walletBalance}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addMoneyBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/wallet')}
            >
              <Feather name="plus" size={16} color="#FFF" />
              <Text style={styles.addMoneyText}>{t.addMoney}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.personalDetails}</Text>
          <View style={styles.group}>
            <View style={[styles.row, styles.rowDivider]}>
              <View style={styles.rowIcon}>
                <Feather name="user" size={18} color="#4A148C" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{t.name}</Text>
                <Text style={styles.rowValue}>{userData.name}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather name="phone" size={18} color="#4A148C" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{t.phone}</Text>
                <Text style={styles.rowValue}>{userData.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chat history */}
        <View style={styles.section}>
          <View style={styles.group}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => router.push('/chat-history')}
            >
              <View style={styles.rowIcon}>
                <Feather name="message-circle" size={18} color="#4A148C" />
              </View>
              <Text style={styles.menuText}>{t.chatHistory}</Text>
              <Feather name="chevron-right" size={20} color="#B8AFC7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recharge history */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>{t.transactionHistory}</Text>
            <TouchableOpacity
              onPress={() => router.push('/transaction-history')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewAllText}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.group}>
            {transactions.length ? (
              transactions.map((transaction, index) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={[
                    styles.row,
                    index < transactions.length - 1 && styles.rowDivider,
                  ]}
                  activeOpacity={0.7}
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
                      color={transaction.type === 'credit' ? '#059669' : '#DC2626'}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {transaction.description
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                    <Text style={styles.listDate}>{transaction.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.listAmount,
                      transaction.type === 'credit' ? styles.creditText : styles.debitText,
                    ]}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}{"\u20B9"}{transaction.amount}
                  </Text>
                  <Feather name="chevron-right" size={18} color="#B8AFC7" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <Feather name="inbox" size={22} color="#B8AFC7" />
                <Text style={styles.emptyText}>{t.noTransactions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Call history */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>{t.callHistory}</Text>
            <TouchableOpacity
              onPress={() => router.push('/call-history')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewAllText}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.group}>
            {callHistory.length ? (
              callHistory.map((call, index) => (
                <TouchableOpacity
                  key={call.id}
                  style={[
                    styles.row,
                    index < callHistory.length - 1 && styles.rowDivider,
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/astrologer-details",
                      params: { id: call.astrologerId },
                    })
                  }
                >
                  <View style={styles.iconCircle}>
                    <Feather
                      name={
                        call.type === 'video'
                          ? 'video'
                          : call.type === 'call'
                            ? 'phone'
                            : 'message-circle'
                      }
                      size={18}
                      color="#4A148C"
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.listTitle} numberOfLines={1}>{call.astrologerName}</Text>
                    <Text style={styles.listDate}>{call.duration} on {call.date}</Text>
                  </View>
                  <Text style={styles.callAmount}>{"\u20B9"}{call.amount}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <Feather name="phone-off" size={22} color="#B8AFC7" />
                <Text style={styles.emptyText}>{t.noCallHistory}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.languageSettings}</Text>
          <View style={styles.segment}>
            {['en', 'hi', 'bn'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.segmentOption, language === lang && styles.segmentOptionActive]}
                activeOpacity={0.8}
                onPress={() => changeLanguage(lang)}
              >
                <Text style={[styles.segmentText, language === lang && styles.segmentTextActive]}>
                  {t.languages[lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Bengali']}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Help + Logout */}
        <View style={styles.section}>
          <View style={styles.group}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => router.push('/help')}
            >
              <View style={styles.rowIcon}>
                <Feather name="help-circle" size={18} color="#4A148C" />
              </View>
              <Text style={styles.menuText}>{t.helpCenter}</Text>
              <Feather name="chevron-right" size={20} color="#B8AFC7" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const INK = '#1F1235';
const MUTED = '#7C6F8F';
const PURPLE = '#4A148C';
const PLUM = '#2A0B4F';
const SAFFRON = '#FF9933';
const BG = '#F7F5FB';
const BORDER = '#EFEAF5';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PLUM,
  },
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  loadingBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: PURPLE,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PLUM,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  topBarTitleWrap: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  topBarSubtitle: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 244, 211, 0.75)',
  },

  /* Hero */
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 56,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroOrb: {
    position: 'absolute',
    right: -50,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarFrame: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 41,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    flexShrink: 1,
  },
  editProfileBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFD700',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '800',
    color: PLUM,
  },

  /* Wallet */
  walletWrap: {
    paddingHorizontal: 20,
    marginTop: -36,
  },
  walletCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: PLUM,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  walletIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3DF',
  },
  walletTextWrap: {
    flexShrink: 1,
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  walletAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: INK,
    marginTop: 1,
  },
  addMoneyBtn: {
    backgroundColor: PURPLE,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addMoneyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  /* Sections */
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
    marginBottom: 10,
  },
  sectionTitleInline: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
    flexShrink: 1,
  },
  viewAllText: {
    fontSize: 14,
    color: PURPLE,
    fontWeight: '700',
    flexShrink: 0,
  },

  /* Grouped list */
  group: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 60,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4DDEE',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3ECFB',
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },

  /* History items */
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3ECFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditBg: {
    backgroundColor: '#D1FAE5',
  },
  debitBg: {
    backgroundColor: '#FEE2E2',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
    marginBottom: 2,
  },
  listDate: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '500',
  },
  listAmount: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 0,
  },
  creditText: {
    color: '#059669',
  },
  debitText: {
    color: '#DC2626',
  },
  callAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    flexShrink: 0,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 26,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    fontWeight: '600',
  },

  /* Language segmented control */
  segment: {
    flexDirection: 'row',
    backgroundColor: '#EBE4F4',
    borderRadius: 16,
    padding: 4,
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  segmentOptionActive: {
    backgroundColor: '#FFF',
    shadowColor: PLUM,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: MUTED,
  },
  segmentTextActive: {
    color: PURPLE,
    fontWeight: '800',
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
});