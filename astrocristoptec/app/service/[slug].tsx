import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getReportScreenTranslations, normalizeLanguage, SupportedLanguage } from "../../lib/reportCatalog";

export default function ReportDetailScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  useFocusEffect(useCallback(() => { AsyncStorage.getItem("user-language").then((value) => setLanguage(normalizeLanguage(value))); }, []));
  const t = getReportScreenTranslations(language);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View style={styles.content}>
        <Text style={styles.title}>{t.comingSoon}</Text>
        <Text style={styles.message}>{t.comingSoonMessage}</Text>
        <TouchableOpacity style={styles.button} onPress={() => Alert.alert(t.comingSoon, t.comingSoonMessage)}><Text style={styles.buttonText}>{t.title}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.replace("/(tabs)/reports")}><Text style={styles.linkText}>{t.title}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" }, content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#1E293B" }, message: { marginTop: 10, fontSize: 15, lineHeight: 22, textAlign: "center", color: "#64748B" },
  button: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: "#4B7BEC" }, buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" }, link: { marginTop: 18 }, linkText: { color: "#4B7BEC", fontWeight: "600" },
});
