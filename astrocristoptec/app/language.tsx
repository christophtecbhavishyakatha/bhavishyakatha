import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";

const LANGUAGES = [
  { 
    id: 'en', 
    label: 'English', 
    native: 'English',
    button: 'Continue'
  },
  { 
    id: 'hi', 
    label: 'Hindi', 
    native: 'हिन्दी',
    button: 'जारी रखें'
  },
  { 
    id: 'bn', 
    label: 'Bengali', 
    native: 'বাংলা',
    button: 'চালিয়ে যান'
  },
];

export default function LanguageScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Get current display text based on selection
  const currentLang = LANGUAGES.find(l => l.id === selectedId) || LANGUAGES[0];

  /** 🔹 Check language on first load */
  useEffect(() => {
    const checkLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('user-language');

        if (savedLang) {
          // Language already selected → go to tabs
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.log('Language check error', e);
      } finally {
        setChecking(false);
      }
    };

    checkLanguage();
  }, []);

  /** 🔹 Save language and navigate */
  const confirmSelection = async () => {
    if (!selectedId) return;

    try {
      await AsyncStorage.setItem('user-language', selectedId);
      
      // Navigate to tabs
      router.replace('/(tabs)');
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  /** 🔹 Loader while checking storage */
  if (checking) {
    return (
      <SafeAreaView edges={['top','bottom']} style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top','bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

      {/* 🌍 Multilingual Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Language</Text>
        <Text style={styles.title}>भाषा चुनें</Text>
        <Text style={styles.title}>ভাষা নির্বাচন করুন</Text>
        <Text style={styles.subtitle}>
          Select your preferred language to continue
        </Text>
      </View>

      {/* Language Cards */}
      <View style={styles.list}>
        {LANGUAGES.map(item => {
          const active = selectedId === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={[styles.card, active && styles.selectedCard]}
            >
              <View style={styles.cardLeft}>
                <View>
                  <Text style={[styles.nativeText, active && styles.selectedText]}>
                    {item.native}
                  </Text>
                  <Text style={styles.labelText}>{item.label}</Text>
                </View>
              </View>

              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Multilingual Continue Button */}
      <Pressable
        style={[styles.btn, !selectedId && styles.btnDisabled]}
        disabled={!selectedId}
        onPress={confirmSelection}
      >
        <Text style={styles.btnText}>{currentLang.button}</Text>
      </Pressable>

      {/* 🌐 Visual Indicator - All languages shown */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🌐 English • हिन्दी • বাংলা
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  header: {
    marginTop: 60,
    marginBottom: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },

  list: {
    flex: 1,
  },

  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EEE',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },

  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },

  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },

  nativeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  selectedText: {
    color: '#007AFF',
  },

  labelText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  radioActive: {
    borderColor: '#007AFF',
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },

  btn: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  btnDisabled: {
    backgroundColor: '#C7C7CC',
  },

  btnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
