import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReportsContent from "../components/reportsContent";
import AppHeader from "../components/header";
import { normalizeLanguage, SupportedLanguage } from "../../lib/reportCatalog";

export default function ReportsScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<SupportedLanguage>("en");

  useFocusEffect(
    useCallback(() => {
      const loadLanguage = async () => {
        try {
          const savedLang = await AsyncStorage.getItem("user-language");
          setLanguage(normalizeLanguage(savedLang));
        } catch (error) {
          console.log("Error loading report language:", error);
        }
      };

      void loadLanguage();
    }, [])
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <AppHeader onProfilePress={() => router.push("/profile")} />
      <ReportsContent language={language} footerMode="back" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
});
