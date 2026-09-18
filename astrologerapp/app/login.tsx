import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getMessaging,
  getToken,
  onMessage,
  requestPermission,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import * as Notifications from 'expo-notifications';
import LoadingScreen from './loadingScreen';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export default function AstrologerRegistration() {
  const [step, setStep] = useState<'login' | 'otp' | 'register' |'adminLogin'>('login');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [id, setId] = useState<string>('');
  const languageOptions: string[] = ['English', 'Bengali', 'Hindi'];
const categoryOptions: string[] = [
  'Vedic Astrology',
  'KP Astrology',
  'Western Astrology',
  'Nadi Astrology',
  'Prashna Astrology (Horary)',
  'Tarot Reading',
  'Numerology',
  'Palmistry',
  'Face Reading',
  'Vastu Shastra',
  'Feng Shui',
  'Lal Kitab',
  'Psychic Reading',
  'Aura Reading',
  'Reiki Healing',
  'Chakra Healing',
  'Crystal Healing',
  'Angel Card Reading',
  'Pendulum Dowsing'
];
const specializationOptions: string[] = [
  'Love',
  'Relationship',
  'Breakup',
  'Marriage',
  'Divorce',
  'Family',
  'Career',
  'Job',
  'Business',
  'Finance',
  'Wealth',
  'Money',
  'Investment',
  'Education',
  'Study Abroad',
  'Health',
  'Mental Health',
  'Child',
  'Pregnancy',
  'Legal Issues',
  'Property',
  'Travel',
  'Foreign Settlement',
  'Spiritual Growth'
];
const [experience, setExperience] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
const [adminId, setAdminId] = useState<string>('');
const [password, setPassword] = useState<string>(''); 
const [fcmToken, setFcmToken] = useState<string>('');
const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
const [policyType, setPolicyType] = useState<'terms' | 'privacy'>('terms');
const [policyContent, setPolicyContent] = useState<string>('');
const [loadingPolicy, setLoadingPolicy] = useState<boolean>(false);
  const API_BASE = "https://bhavishyakatha.in/express/api";
  const messaging = getMessaging();



const { stepParam, mode } = useLocalSearchParams<{
  stepParam?: string;
  mode?: string;
}>();
const isEditMode = mode === "edit";

 useEffect(() => {
  setStep(stepParam === "register" ? "register" : "login");
}, [stepParam]);
useEffect(() => {
}, []);

useFocusEffect(
  useCallback(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
         if (isEditMode) {
          router.back();
          return true;
        }
        if (step !== 'login') {
          setStep('login');
          return true;
        }

        Alert.alert(
          'Exit App',
          'Are you sure you want to exit?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => BackHandler.exitApp() },
          ]
        );

        return true;
      }
    );

    return () => subscription.remove();
  }, [step])
);

   const setup = async () => {
      await requestPermissionOnly();
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) return;

      const token = await getToken(messaging);
      console.log("🔥 FCM Token:", token);
      console.log("Authorization status:", authStatus);
      setFcmToken(token); 
    };
    const requestPermissionOnly = async () => {
  // 1. Check if we already have it
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    console.log("Permission already granted.");
    return true;
  }

  // 2. Request the permission (This triggers the native pop-up)
  const { status } = await Notifications.requestPermissionsAsync();

  if (status === 'granted') {
    console.log("Permission granted!");
    return true;
  } else {
    console.log("Permission denied.");
    return false;
  }
};
useEffect(() => {
  if (isEditMode) {
    getProfileData();
  } else if (!stepParam) {
    checkUserLoggedIn();
  }
}, [stepParam, mode]);

const checkUserLoggedIn = async () => {
  try {
    const adminId = await AsyncStorage.getItem("admin_id");
    const userId = await AsyncStorage.getItem("user_id");

    if (adminId) {
      // 🔐 Admin logged in
      router.replace("/(adminTab)");
      return;
    }

    if (userId) {
      // 👤 User logged in
      router.replace("/(tabs)");
      return;
    }

    // ❌ No one logged in
    setLoading(false);

  } catch (error) {
    console.error("Error checking login:", error);
    setLoading(false);
  }
};

const getProfileData = async () => {
  try {
    const userId = await AsyncStorage.getItem('user_id');
    if(userId) {
      setId(userId);
    }
    if (!userId) {
      // User not logged in
      router.replace('/login');
      return;
    }

    setLoading(true);

    const res = await fetch(`https://bhavishyakatha.in/express/astrologer/profile/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to fetch profile');
    }

const data = result.data;
console.log('Profile data:', data);
//setId(data.astrologer_id?.toString() || "");
setName(data.full_name || "");
setPhone(data.phone || "");
setProfilePhoto(data.profile_photo || null);
setLanguages(data.languages || []);
setCategories(data.categories || []);
setSpecializations(data.specializations || []);
setExperience(data.experience?.toString() || "");


  } catch (error) {
    console.error('Error loading profile data:', error);
    Alert.alert('Error', 'Failed to load profile data');
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <SafeAreaView edges={["bottom","top"]} style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
const handlePhoneSubmit = async () => {
  if (phone.length !== 10) {
    Alert.alert("Error", "Please enter a valid 10-digit phone number");
    return;
  }
     setup();   // ✅ WAIT here

  try {

   

    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (data.success) {
      setStep("otp");
    } else {
      Alert.alert("Error", "Failed to send OTP");
    }
  } catch (err) {
    Alert.alert("Error", "Server not reachable");
  }
};


const handleOtpSubmit = async () => {
  if (otp.length !== 6) {
    Alert.alert("Error", "Please enter valid OTP");
    return;
  }

  try {
    const currentToken = fcmToken 

    if (!currentToken) {
      Alert.alert("Error", "Notification token missing. Try again.");
      return;
    }

    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        otp,
        fcmToken: currentToken, // still send same field
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert("Error", data.message || "OTP verification failed");
      return;
    }

    if (!data.profile_completed) {
      setId(data.astrologer_id.toString());
      setStep("register");
    } else if (!data.is_admin_verified) {
      router.push("/admin-verification-pending");
    } else {
      await AsyncStorage.setItem("user_id", data.astrologer_id.toString());
      await AsyncStorage.setItem("fcmToken", data.fcmToken || "" );
      router.replace("/(tabs)");
    }

  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Server error");
  }
};



const MAX_SIZE_KB = 30;

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    quality: 1, // start high, we compress later
  });

  if (result.canceled) return;

  let asset = result.assets[0];
  let quality = 0.8;
  let width = 400;
  let compressed;

  // 🔁 Keep compressing until under 30 KB
  while (true) {
    compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
if (!compressed.base64) {
  throw new Error("Base64 generation failed");
}

    const sizeKB =
      (compressed.base64.length * 3) / 4 / 1024;

    if (sizeKB <= MAX_SIZE_KB || quality < 0.2) break;

    quality -= 0.1;
    width -= 50;
  }

  console.log("Final image size:", Math.round(
    (compressed.base64.length * 3) / 4 / 1024
  ), "KB");

  setProfilePhoto(`data:image/jpeg;base64,${compressed.base64}`);
};

  const toggleCheckbox = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter((i: string) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

const fetchPolicy = async (type: 'terms' | 'privacy') => {
  try {
    setLoadingPolicy(true);
    setPolicyContent('');

    const res = await fetch(`${API_BASE}/astrologer/${type}`);
    const data = await res.json();

    if (data.success) {
      setPolicyContent(data.content || '');
    } else {
      setPolicyContent(data.message || 'Unable to load content.');
    }
  } catch (err) {
    setPolicyContent('Something went wrong while loading this content.');
  } finally {
    setLoadingPolicy(false);
  }
};

const openPolicyModal = (type: 'terms' | 'privacy') => {
  setPolicyType(type);
  setShowPolicyModal(true);
  fetchPolicy(type);
};

 const handleFinalSubmit = async () => {
  if (
    !name || !profilePhoto ||
    languages.length === 0 ||
    categories.length === 0 || !experience ||
    specializations.length === 0
  ) {
    Alert.alert("Error", "Please fill all required fields");
    return;
  }
  if (!isEditMode && !acceptedTerms) {
    Alert.alert(
      "Terms Required",
      "Please accept the Terms & Conditions and Privacy Policy to proceed."
    );
    return;
  }
setLoadingProfile(true);
  try {
//const astrologerId = await AsyncStorage.getItem("astrologer_id");

    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        astrologer_id: id,
        full_name: name,
        profile_photo: profilePhoto, // later upload properly
        languages,
        categories,
        specializations,
        experience,
        acceptedTerms: isEditMode ? undefined : acceptedTerms,
      }),
    });

    const data = await res.json();
console.log(data);
if (data.success) {
  Alert.alert(
    "Success",
    data.is_admin_verified ? "Profile updated" : "Profile completed",
    [
      {
        text: "OK",
        onPress: () => {
          if (data.is_admin_verified) {
            // Admin verified → go to profile tabs
            router.replace("/(tabs)/profile");
          } else {
            // Admin not verified → go to pending page
            router.replace("/admin-verification-pending");
          }
        },
      },
    ]
  );
} else {
  Alert.alert("Error", "Failed to save profile");
}

  } catch (err) {
    Alert.alert("Error", "Server error");
  } finally {
    setLoadingProfile(false); 
  }
};

// --- Handler for admin login ---
const handleAdminLogin = async () => {
  if (!adminId || !password) {
    alert('Please enter both User ID and Password');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/admin/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: adminId,
        password: password,
      }),
    });

    const data = await response.json();

    if (data.status) {
  await AsyncStorage.setItem('admin_id', data.admin_id.toString());
  router.replace('/(adminTab)');
} else {
      // Login failed
      alert(data.message || 'Invalid credentials');
    }
  } catch (error) {
    console.error(error);
    alert('Something went wrong. Please try again.');
  }
};

  // Login Screen
  if (step === 'login') {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoiding}
        >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>✨</Text>
            </View>
            <Text style={styles.title}>Astrologer Login</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text: string) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10 digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={'gray'}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handlePhoneSubmit}>
              <Text style={styles.buttonText}>Get OTP →</Text>
            </TouchableOpacity>
                      {/* Admin Login Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#555', marginTop: 12 }]}
            onPress={() => setStep('adminLogin')} // Or your admin login handler
          >
            <Text style={styles.buttonText}>Admin Login →</Text>
          </TouchableOpacity>

          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
if (step === 'adminLogin') {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🛡️</Text>
          </View>
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>Enter your credentials to continue</Text>

          {/* User ID Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={styles.input}
              value={adminId}
              onChangeText={(text: string) => setAdminId(text)}
              placeholder="Enter your User ID"
              autoCapitalize="none"
              placeholderTextColor="gray"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text: string) => setPassword(text)}
              placeholder="Enter your password"
              secureTextEntry
              placeholderTextColor="gray"
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAdminLogin}
          >
            <Text style={styles.buttonText}>Login →</Text>
          </TouchableOpacity>

          {/* Back to Astrologer Login */}
          <TouchableOpacity
            style={{ marginTop: 12, alignSelf: 'center' }}
            onPress={() => setStep('login')}
          >
            <Text style={{ color: '#555' }}>← Back to Astrologer Login</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
  // OTP Screen
  if (step === 'otp') {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoiding}
        >
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🔐</Text>
            </View>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Enter the OTP sent to +91 {phone}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={(text: string) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6 digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={'gray'}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleOtpSubmit}>
              <Text style={styles.buttonText}>Submit OTP →</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('login')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Registration Screen
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
                <LoadingScreen loadingScreen={loadingProfile} />
      <Modal visible={showPolicyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {policyType === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPolicyModal(false)}
              >
                <Text style={styles.modalCloseText}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingPolicy ? (
                <View style={styles.policyLoading}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={styles.policyLoadingText}>Loading...</Text>
                </View>
              ) : (
                <Text style={styles.policyText}>{policyContent}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.registerContainer}>
          <Text style={styles.title}>Create Astrologer Profile</Text>
          <Text style={styles.subtitle}>Complete your profile to get started</Text>

          {/* Profile Photo */}
          <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
                <Text style={styles.photoLabel}>Upload Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={'gray'}
            />
          </View>

          {/* Phone (Non-editable) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={phone}
              editable={false}
              placeholder="Enter your phone number"
              placeholderTextColor={'gray'}
            />
          </View>
 {/* Experience*/}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Experience </Text>
            <TextInput
              style={[styles.input, styles.input]}
              value={experience}
              placeholder="Enter your experience in years"
              onChangeText={setExperience}
              keyboardType="number-pad"
                maxLength={2}
              placeholderTextColor={'gray'}
            />
          </View>
          {/* Languages */}
          <View style={styles.checkboxSection}>
            <Text style={styles.sectionLabel}>Languages Known *</Text>
            <View style={styles.checkboxGrid}>
              {languageOptions.map((lang: string) => (
                <TouchableOpacity
                  key={lang}
                  style={styles.checkboxItem}
                  onPress={() => toggleCheckbox(lang, languages, setLanguages)}
                >
                  <View style={[styles.checkbox, languages.includes(lang) && styles.checkboxChecked]}>
                    {languages.includes(lang) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>{lang}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.checkboxSection}>
            <Text style={styles.sectionLabel}>Category of Astrology *</Text>
            <View style={styles.checkboxGrid}>
              {categoryOptions.map((cat: string) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.checkboxItem}
                  onPress={() => toggleCheckbox(cat, categories, setCategories)}
                >
                  <View style={[styles.checkbox, categories.includes(cat) && styles.checkboxChecked]}>
                    {categories.includes(cat) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Specializations */}
          <View style={styles.checkboxSection}>
            <Text style={styles.sectionLabel}>Specialization In *</Text>
            <View style={styles.checkboxGrid}>
              {specializationOptions.map((spec: string) => (
                <TouchableOpacity
                  key={spec}
                  style={styles.checkboxItem}
                  onPress={() => toggleCheckbox(spec, specializations, setSpecializations)}
                >
                  <View style={[styles.checkbox, specializations.includes(spec) && styles.checkboxChecked]}>
                    {specializations.includes(spec) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>{spec}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {!isEditMode && (
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptedTerms((value) => !value)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I accept the{' '}
                  <Text style={styles.linkText} onPress={() => openPolicyModal('terms')}>
                    Terms & Conditions
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.linkText} onPress={() => openPolicyModal('privacy')}>
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleFinalSubmit}>
<Text style={styles.buttonText}>
  {isEditMode ? "Update Profile ✓" : "Complete Registration ✓"}
</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B21A8',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#6B21A8',
    justifyContent: 'center',
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#6B21A8',
  },
  registerContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 40,
    marginBottom: 40,
    borderRadius: 16,
    padding: 24,
    maxWidth: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#7C3AED',
    borderRadius: 40,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    alignSelf: 'center',
    marginVertical: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#7C3AED',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#7C3AED',
  },
  photoPlaceholderText: {
    fontSize: 40,
  },
  photoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  checkboxSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
    minWidth: 130,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  termsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  linkText: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  modalCloseText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  policyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  policyLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  policyLoadingText: {
    color: '#6B7280',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
