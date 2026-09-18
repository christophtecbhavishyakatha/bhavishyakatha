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
}
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
}
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
          <Feather name="moon" size={22} color="#FFD700" />
        </LinearGradient>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2A0B4F" />

      <LinearGradient
        colors={['#2A0B4F', '#4A148C', '#7B2CBF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerOrb} />
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={12} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t.profile}</Text>
          <Text style={styles.headerSubtitle}>Your spiritual account hub</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileCardGlow} />
          <LinearGradient
            colors={['#FFD700', '#FF9933', '#4A148C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarFrame}
          >
            <Image source={getGenderAvatar()} style={styles.avatar} />
          </LinearGradient>
          <Text style={styles.userName}>{userData.name}</Text>
          <View style={styles.profilePhonePill}>
            <Feather name="phone" size={13} color="#B66A00" />
            <Text style={styles.profilePhoneText}>{userData.phone}</Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() =>
              router.push({
                pathname: '/login',
                params: { mode: 'edit' },
              })
            }
          >
            <Feather name="edit-2" size={16} color="#4A148C" />
            <Text style={styles.editProfileText}>{t.editProfile}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.personalDetails}</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Feather name="user" size={18} color="#4A148C" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t.name}</Text>
                <Text style={styles.detailValue}>{userData.name}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Feather name="phone" size={18} color="#4A148C" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t.phone}</Text>
                <Text style={styles.detailValue}>{userData.phone}</Text>
              </View>
            </View>
          </View>
        </View>

  <TouchableOpacity style={styles.helpBtn} onPress={() => router.push('/chat-history')}>
          <Feather name="message-circle" size={20} color="#4A148C" />
          <Text style={styles.helpText}>{t.chatHistory}</Text>
        </TouchableOpacity>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.walletBalance}</Text>
          <LinearGradient
            colors={['#2A0B4F', '#4A148C', '#FF9933']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletOrb} />
            <View style={styles.walletContent}>
              <View style={styles.walletIcon}>
                <Feather name="credit-card" size={28} color="#FFD700" />
              </View>
              <View>
                <Text style={styles.walletLabel}>{t.walletBalance}</Text>
                <Text style={styles.walletAmount}>{"\u20B9"}{walletBalance}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addMoneyBtn} onPress={() => router.push('/wallet')}>
              <Text style={styles.addMoneyText}>{t.addMoney}</Text>
              <Feather name="plus" size={16} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.transactionHistory}</Text>
            <TouchableOpacity onPress={() => router.push('/transaction-history')}>
              <Text style={styles.viewAllText}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listCard}>
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
              <Text style={styles.emptyText}>{t.noTransactions}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.callHistory}</Text>
            <TouchableOpacity onPress={() => router.push('/call-history')}>
              <Text style={styles.viewAllText}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listCard}>
            {callHistory.length ? (
              callHistory.map((call) => (
        <TouchableOpacity
          key={call.id}
          style={styles.listItem}
          activeOpacity={0.82}
          onPress={() =>
   router.push({
      pathname: "/(tabs)/astrologer-details",
      params:  { id: call.astrologerId },
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
                  <View style={styles.listContent}>
                    <Text style={styles.listTitle}>{call.astrologerName}</Text>
                    <Text style={styles.listDate}>{call.duration} on {call.date}</Text>
                  </View>
                  <Text style={styles.callAmount}>{"\u20B9"}{call.amount}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>{t.noCallHistory}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.languageSettings}</Text>
          <View style={styles.languageCard}>
            {['en', 'hi', 'bn'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.languageOption, language === lang && styles.languageOptionActive]}
                onPress={() => changeLanguage(lang)}
              >
                <Text style={[styles.languageText, language === lang && styles.languageTextActive]}>
                  {t.languages[lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Bengali']}
                </Text>
                {language === lang && <Feather name="check" size={20} color="#4A148C" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

      

        <TouchableOpacity style={styles.helpBtn} onPress={() => router.push('/help')}>
          <Feather name="help-circle" size={20} color="#4A148C" />
          <Text style={styles.helpText}>{t.helpCenter}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7EA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7EA',
  },
  loadingBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A148C',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerOrb: {
    position: 'absolute',
    right: -42,
    top: -62,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 244, 211, 0.82)',
  },
  scrollContent: {
    paddingBottom: 34,
  },
  profileCard: {
    backgroundColor: '#FFF',
    marginTop: -18,
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 20, 140, 0.08)',
    shadowColor: '#4A148C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 7,
    overflow: 'hidden',
  },
  profileCardGlow: {
    position: 'absolute',
    top: -62,
    right: -56,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 153, 51, 0.12)',
  },
  avatarFrame: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 23,
    fontWeight: '900',
    color: '#2B164C',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  profilePhonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFF7EA',
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 51, 0.16)',
    maxWidth: '100%',
  },
  profilePhoneText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B6B45',
    flexShrink: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B164C',
    marginBottom: 12,
    flexShrink: 1,
  },
  viewAllText: {
    fontSize: 14,
    color: '#B66A00',
    fontWeight: '800',
    flexShrink: 0,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 20, 140, 0.08)',
    shadowColor: '#4A148C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F1FF',
    borderWidth: 1,
    borderColor: 'rgba(74, 20, 140, 0.08)',
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E6CA8',
    marginBottom: 4,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B164C',
  },
  walletCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.22)',
    shadowColor: '#4A148C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  walletOrb: {
    position: 'absolute',
    right: -38,
    top: -48,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    minWidth: 0,
  },
  walletIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.24)',
  },
  walletLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
  },
  addMoneyBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  addMoneyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 20, 140, 0.08)',
    shadowColor: '#4A148C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FFFDF8',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F1FF',
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
    fontWeight: '800',
    color: '#2B164C',
    marginBottom: 2,
    flexShrink: 1,
  },
  listDate: {
    fontSize: 12,
    color: '#8E6CA8',
    fontWeight: '600',
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
  callAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B164C',
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E6CA8',
    textAlign: 'center',
    paddingVertical: 18,
    fontWeight: '700',
  },
  languageCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 20, 140, 0.08)',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF7EA',
  },
  languageOptionActive: {
    backgroundColor: '#F8F1FF',
    borderWidth: 2,
    borderColor: '#4A148C',
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7A637D',
  },
  languageTextActive: {
    color: '#4A148C',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  editProfileBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 20, 140, 0.14)',
    backgroundColor: '#F8F1FF',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4A148C',
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 20, 140, 0.08)',
    shadowColor: '#4A148C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  helpText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A148C',
  },
});
