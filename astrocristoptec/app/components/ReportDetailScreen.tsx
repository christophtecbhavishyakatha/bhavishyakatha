import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getReportCatalogBySlug, getReportScreenTranslations, normalizeLanguage, ReportSlug, SupportedLanguage } from "../../lib/reportCatalog";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReportDetailScreen({ reportName }: { reportName: ReportSlug }) {
  const router = useRouter();
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  useFocusEffect(useCallback(() => { AsyncStorage.getItem("user-language").then((value) => setLanguage(normalizeLanguage(value))); }, []));
  const t = getReportScreenTranslations(language);
  const report = getReportCatalogBySlug(language)[reportName];

  if (!report) return null;
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <Text style={styles.topTitle}>{report.title}</Text><View style={styles.backButton} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
       
        <Image source={report.image} style={styles.image} resizeMode="cover" />
        <Text style={styles.intro}>{t.reportIntro(report.title)}</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.whatReport(report.title)}</Text>
          <Text style={styles.body}>{report.description}</Text>
          <Text style={[styles.sectionTitle, styles.spacedTitle]}>{t.whyReport(report.title)}</Text>
          <Text style={styles.body}>{t.reportDetailsBody}</Text>
          <View style={styles.benefits}>{t.reportBenefits(report.title).map((benefit) => <View key={benefit} style={styles.benefitRow}><Text style={styles.check}>✓</Text><Text style={styles.benefitText}>{benefit}</Text></View>)}</View>
        </View>
        <TouchableOpacity style={[styles.cta, { backgroundColor: "#7C3AED" }]} onPress={() => Alert.alert(t.comingSoon, t.comingSoonMessage)}><Text style={styles.ctaText}>{t.getReport}</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" }, topBar: { height: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" }, backText: { fontSize: 36, lineHeight: 36, color: "#1E293B" }, topTitle: { maxWidth: "72%", fontSize: 17, fontWeight: "700", color: "#1E293B", textAlign: "center" }, content: { padding: 16, paddingBottom: 30 }, hero: { padding: 20, borderRadius: 20, alignItems: "center" }, iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" }, title: { marginTop: 14, fontSize: 26, fontWeight: "800", color: "#1E293B", textAlign: "center" }, category: { marginTop: 6, fontSize: 14, color: "#64748B" }, image: { width: "100%", height: 220, marginTop: 18, borderRadius: 18 }, intro: { marginTop: 18, fontSize: 15, lineHeight: 23, color: "#64748B" }, card: { marginTop: 18, padding: 18, borderRadius: 18, backgroundColor: "#FFFFFF", elevation: 2 }, sectionTitle: { fontSize: 19, fontWeight: "700", color: "#1E293B" }, spacedTitle: { marginTop: 20 }, body: { marginTop: 9, fontSize: 14, lineHeight: 22, color: "#64748B" }, benefits: { marginTop: 17, gap: 11 }, benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 }, check: { color: "#7C3AED", fontSize: 18, fontWeight: "800" }, benefitText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#475569" }, cta: { marginTop: 18, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }, ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
