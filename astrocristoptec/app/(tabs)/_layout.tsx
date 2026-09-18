import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Translation helper
const getTranslations = (lang: string) => {
  const translations: any = {
    en: {
      home: "Home",
      astrologers: "Astrologers",
      horoscope: "Horoscope",
    },
    hi: {
      home: "होम",
      astrologers: "ज्योतिषी",
      horoscope: "राशिफल",
    },
    bn: {
      home: "হোম",
      astrologers: "জ্যোতিষী",
      horoscope: "রাশিফল",
    },
  };
  return translations[lang] || translations.en;
};


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState('en');
  const [t, setT] = useState(getTranslations('en'));

  useEffect(() => {
    loadLanguage();
    
    // Listen for language changes
    const interval = setInterval(() => {
      loadLanguage();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user-language');
      if (savedLang && savedLang !== language) {
        setLanguage(savedLang);
        setT(getTranslations(savedLang));
      }
    } catch (e) {
      console.log('Error loading language:', e);
    }
  };

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t.astrologers,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.3.fill" color={color} />,
        }}
      />
       <Tabs.Screen
        name="haroscope"
        options={{
          title: t.horoscope,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "",
          href: null,
        }}
      />
  
      
      <Tabs.Screen
        name="astrologer-details"
        options={{
          title: '',
          href: null,
        }}
      />
       <Tabs.Screen
        name="wallet"
        options={{
          title: '',
          href: null,
        }}
      />
       <Tabs.Screen
        name="help"
     
        options={{
          title: '',
          href: null,
        }}
      />
    </Tabs>
  );
}
