import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getReportCatalogBySlug,
  getReportScreenTranslations,
  normalizeLanguage,
  ReportSlug,
  SupportedLanguage,
} from "../../lib/reportCatalog";

export default function ReportDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [language, setLanguage] = useState<SupportedLanguage>("en");

  useFocusEffect(
    useCallback(() => {
      const loadLanguage = async () => {
        try {
          const savedLang = await AsyncStorage.getItem("user-language");
          setLanguage(normalizeLanguage(savedLang));
        } catch (error) {
          console.log("Error loading report detail language:", error);
        }
      };

      void loadLanguage();
    }, [])
  );

  const t = getReportScreenTranslations(language);
  const reportCatalogBySlug = getReportCatalogBySlug(language);
  const report =
    slug && slug in reportCatalogBySlug
      ? reportCatalogBySlug[slug as ReportSlug]
      : undefined;

  if (!report) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.missingWrap}>
          <Text style={styles.missingTitle}>{t.reportNotFound}</Text>
          <Text style={styles.missingText}>{t.reportNotFoundMessage}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/reports")}
          >
            <Text style={styles.primaryButtonText}>{t.backToReports}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={report.color} />

      <View style={[styles.hero, { backgroundColor: report.color }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroIcon}>
          <Feather name={report.icon as any} size={28} color={report.color} />
        </View>
        <Text style={styles.heroTitle}>{report.title}</Text>
        <Text style={styles.heroSubtitle}>{report.description}</Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaLabel}>{t.price}</Text>
            <Text style={styles.metaValue}>{"\u20B9"}{report.price}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaLabel}>{t.delivery}</Text>
            <Text style={styles.metaValue}>{report.delivery}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.bestFor}</Text>
          <Text style={styles.cardText}>{report.idealFor}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.whatYouGet}</Text>
          {report.includes.map((item) => (
            <View key={item} style={styles.rowItem}>
              <Feather name="check-circle" size={18} color={report.color} />
              <Text style={styles.rowText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.keyHighlights}</Text>
          {report.highlights.map((item) => (
            <View key={item} style={styles.rowItem}>
              <Feather name="star" size={18} color={report.color} />
              <Text style={styles.rowText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.howItWorks}</Text>
          {t.steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: report.color }]}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.rowText}>{step}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: report.color }]}
          onPress={() =>
            Alert.alert(
              t.requestAlertTitle(report.shortTitle),
              t.requestAlertMessage
            )
          }
        >
          <Text style={styles.primaryButtonText}>
            {t.requestButton(report.shortTitle)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace("/reports")}
        >
          <Text style={styles.secondaryButtonText}>{t.backToReports}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 26,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.92)",
    marginTop: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  metaPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: 14,
  },
  metaLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  metaValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  missingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
  },
  missingText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
});
