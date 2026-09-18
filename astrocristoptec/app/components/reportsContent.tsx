import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  getReportCatalog,
  getReportScreenTranslations,
  SupportedLanguage,
} from "../../lib/reportCatalog";

type ReportsContentProps = {
  language: SupportedLanguage;
  footerMode?: "back" | "astrologers" | "none";
};

export default function ReportsContent({
  language,
  footerMode = "none",
}: ReportsContentProps) {
  const router = useRouter();
  const t = getReportScreenTranslations(language);
  const reportCatalog = getReportCatalog(language);
  const yourReports = [
    {
      id: "1",
      title: reportCatalog[0]?.title ?? "",
      status: t.yourReportStatusProcessing,
      icon: "clock",
      color: "#FFA500",
    },
    {
      id: "2",
      title: reportCatalog[1]?.title ?? "",
      status: t.yourReportStatusCompleted,
      icon: "check-circle",
      color: "#28A745",
    },
  ];

  const footer =
    footerMode === "back"
      ? {
          title: t.continueExploring,
          subtitle: t.continueExploringSubtitle,
          icon: "arrow-left" as const,
          onPress: () => router.back(),
        }
      : footerMode === "astrologers"
        ? {
            title: t.continueExploring,
            subtitle: t.continueExploringSubtitle,
            icon: "arrow-right" as const,
            onPress: () => router.push("/(tabs)" as any),
          }
        : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.premiumReports}</Text>
        <Text style={styles.sectionSubtitle}>{t.premiumReportsSubtitle}</Text>

        <View style={styles.grid}>
          {reportCatalog.map((service) => (
            <TouchableOpacity
              key={service.slug}
              style={styles.reportCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/service/${service.slug}` as any)}
            >
              <View
                style={[
                  styles.reportIcon,
                  { backgroundColor: service.color + "20" },
                ]}
              >
                <Feather
                  name={service.icon as any}
                  size={24}
                  color={service.color}
                />
              </View>
              <Text style={styles.reportTitle}>{service.title}</Text>
              <Text style={styles.price}>{"\u20B9"}{service.price}</Text>
              <Text style={styles.tag}>{service.delivery}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.yourReports}</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.sectionAction}>{t.viewAll}</Text>
          </TouchableOpacity>
        </View>

        {yourReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.orderCard}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.orderTitle}>{report.title}</Text>
              <Text style={[styles.orderStatus, { color: report.color }]}>
                {report.status}
              </Text>
            </View>
            <Feather name={report.icon as any} size={20} color={report.color} />
          </TouchableOpacity>
        ))}
      </View>

      {footer ? (
        <TouchableOpacity style={styles.ctaCard} onPress={footer.onPress}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>{footer.title}</Text>
            <Text style={styles.ctaSubtitle}>{footer.subtitle}</Text>
          </View>
          <Feather name={footer.icon} size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    marginBottom: 14,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B7BEC",
    flexShrink: 0,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  reportCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    elevation: 2,
    minWidth: 0,
  },
  reportIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    alignSelf: "stretch",
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 8,
  },
  tag: {
    fontSize: 10,
    marginTop: 8,
    backgroundColor: "#FFE066",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    color: "#5F4B00",
    fontWeight: "600",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
    gap: 10,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    flexShrink: 1,
  },
  orderStatus: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "600",
  },
  ctaCard: {
    backgroundColor: "#4B7BEC",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaContent: {
    flex: 1,
    paddingRight: 12,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  ctaSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    lineHeight: 20,
  },
});
