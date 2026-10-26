
import React from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getReportCatalog,
  getReportScreenTranslations,
  ReportCategory,
  SupportedLanguage,
} from "../../lib/reportCatalog";

type Props = {
  language: SupportedLanguage;
};

type FilterCategory = "all" | ReportCategory;

export default function ReportsContent({
  language,
}: Props) {
  const router = useRouter();

  const t = getReportScreenTranslations(language);
  const reports = getReportCatalog(language);

  const [selectedCategory, setSelectedCategory] =
    React.useState<FilterCategory>("all");

  const openFreeKundali = () => {
    router.push("/report/free-kundali" as any);
  };

  const openReport = (reportSlug: string) => {
    router.push(`/report/${reportSlug}` as any);
  };

  const filters: Array<{
    key: FilterCategory;
    label: string;
  }> = [
    {
      key: "all",
      label: t.allReports,
    },
    {
      key: "basic",
      label: t.categories.basic.replace(" Reports", ""),
    },
    {
      key: "life",
      label: t.categories.life.replace(" Reports", ""),
    },
    {
      key: "family",
      label: t.categories.family.replace(" Reports", ""),
    },
    {
      key: "special",
      label: t.categories.special.replace(" Reports", ""),
    },
  ];

  const categories: ReportCategory[] = [
    "basic",
    "life",
    "family",
    "special",
  ];

  const visibleCategories =
    selectedCategory === "all"
      ? categories
      : [selectedCategory];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
       

        {/* =========================
            FILTER
        ========================== */}

        <View style={styles.filterContainer}>
  {/*       <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {filters.map((filter) => {
              const selected =
                selectedCategory === filter.key;

              return (
                <TouchableOpacity
                  key={filter.key}
                  activeOpacity={0.8}
                  onPress={() =>
                    setSelectedCategory(filter.key)
                  }
                  style={[
                    styles.filterButton,
                    selected &&
                      styles.filterButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected &&
                        styles.filterTextSelected,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          */}  
        </View>

        {/* =========================
            REPORT SECTIONS
        ========================== */}

        {visibleCategories.map((category) => {
          const categoryReports = reports.filter(
            (report) =>
              report.category === category
          );

          if (!categoryReports.length) {
            return null;
          }

          return (
            <View
              key={category}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>
                {t.categories[category]}
              </Text>

              <View style={styles.grid}>
                {categoryReports.map((report) => {
                  const isFree =
                    report.finalPrice === 0;

                  return (
                    <TouchableOpacity
                      key={report.slug}
                      activeOpacity={0.9}
                      style={styles.card}
                      onPress={
                        report.slug === "free-kundali"
                          ? openFreeKundali
                          : () =>
                              openReport(report.slug)
                      }
                    >
                      {/* =========================
                          IMAGE
                      ========================== */}

                      <View
                        style={styles.imageContainer}
                      >
                        <Image
                          source={report.image}
                          style={styles.reportImage}
                          resizeMode="cover"
                        />

                        {/* DISCOUNT BADGE */}

                        {isFree ? (
                          <View style={[styles.discountBadge, styles.freeBadge]}>
                            <Feather name="award" size={17} color="#FFFFFF" />
                            <Text style={styles.discountText}>FREE</Text>
                          </View>
                        ) : (
                          <View
                            style={styles.discountBadge}
                          >
                            <Text
                              style={
                                styles.discountText
                              }
                            >
                              {report.discountPercentage}%
                              OFF
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* =========================
                          CARD CONTENT
                      ========================== */}

                      <View
                        style={styles.cardContent}
                      >
                        <Text
                          style={styles.cardTitle}
                          numberOfLines={2}
                        >
                          {report.title}
                        </Text>

                        <Text
                          style={styles.cardDescription}
                          numberOfLines={3}
                        >
                          {report.description}
                        </Text>

                        <View style={styles.featureRow}>
                          <View style={styles.featureItem}>
                            <View style={styles.featureIcon}><Feather name="calendar" size={19} color="#6D28D9" /></View>
                            <Text style={styles.featureText}>Detailed{"\n"}Birth Chart</Text>
                          </View>
                          <View style={styles.featureDivider} />
                          <View style={styles.featureItem}>
                            <View style={styles.featureIcon}><Feather name="bar-chart-2" size={19} color="#6D28D9" /></View>
                            <Text style={styles.featureText}>Key Planet{"\n"}Insights</Text>
                          </View>
                          <View style={styles.featureDivider} />
                      {/*     <View style={styles.featureItem}>
                            <View style={styles.featureIcon}><Feather name="file-text" size={19} color="#6D28D9" /></View>
                            <Text style={styles.featureText}>Personalized{"\n"}Summary</Text>
                          </View>
                          */}
                        </View>

                        {/* =========================
                            PRICE
                        ========================== */}

                        <View
                          style={styles.priceRow}
                        >
                          {isFree ? (
                            <View style={styles.freeNotice}>
                              <Feather name="gift" size={24} color="#16A34A" />
                              <View style={styles.freeNoticeText}>
                                <Text style={styles.freeNoticeTitle}>Completely Free for All Users</Text>
                                <Text style={styles.freeNoticeSubtitle}>No charges, no hidden costs</Text>
                              </View>
                            </View>
                          ) : (
                            <>
                              <Text
                                style={
                                  styles.finalPrice
                                }
                              >
                                ₹{report.finalPrice}
                              </Text>

                              <Text
                                style={
                                  styles.originalPrice
                                }
                              >
                                ₹
                                {
                                  report.originalPrice
                                }
                              </Text>
                            </>
                          )}
                        </View>

                        {/* =========================
                            CTA
                        ========================== */}

                        <View
                          style={styles.cta}
                        >
                          <Text
                            style={styles.ctaText}
                          >
                            {isFree
                              ? t.getFreeKundali
                              : t.getReport}
                          </Text>
                          <Feather name="arrow-right" size={21} color="#FFFFFF" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  /* =========================
     HEADER
  ========================== */

  header: {
    paddingTop: 8,
    paddingBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
  },

  /* =========================
     FILTER
  ========================== */

  filterContainer: {
    marginBottom: 22,
  },

  filterContent: {
    paddingRight: 8,
    gap: 8,
  },

  filterButton: {
    minHeight: 38,
    paddingHorizontal: 17,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  filterButtonSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  filterTextSelected: {
    color: "#FFFFFF",
  },

  /* =========================
     SECTION
  ========================== */

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },

  /* =========================
     GRID
  ========================== */

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  /* =========================
     CARD
  ========================== */

  card: {
    width: "100%",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",

    elevation: 2,

    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  /* =========================
     IMAGE
  ========================== */

  imageContainer: {
    width: "100%",
    height: 235,
    position: "relative",
    backgroundColor: "#E2E8F0",
  },

  reportImage: {
    width: "100%",
    height: "100%",
  },

  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 24,

    backgroundColor: "#EF4444",
  },

  freeBadge: {
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 2,
    borderColor: "#86EFAC",
  },

  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  /* =========================
     CARD CONTENT
  ========================== */

  cardContent: {
    padding: 18,
  },

  cardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#1E293B",
  },

  cardDescription: {
    marginTop: 7,
    minHeight: 42,

    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  /* =========================
     PRICE
  ========================== */

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 7,
    width: "100%",
  },

  finalPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  originalPrice: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },

  freePrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16A34A",
  },

  freePriceGroup: {
    gap: 2,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    paddingVertical: 4,
  },

  featureItem: {
    flex: 1,
    alignItems: "center",
  },

  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  featureText: {
    color: "#334155",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },

  featureDivider: {
    width: 1,
    height: 55,
    backgroundColor: "#E2E8F0",
  },

  freeNotice: {
    flex: 1,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ECFDF3",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  freeNoticeText: {
    flex: 1,
  },

  freeNoticeTitle: {
    color: "#15803D",
    fontSize: 14,
    fontWeight: "800",
  },

  freeNoticeSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
  },

  noChargeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  noChargeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16A34A",
  },

  /* =========================
     CTA
  ========================== */

  cta: {
    marginTop: 14,
    height: 54,
    borderRadius: 27,

    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,

    backgroundColor: "#7C3AED",
  },

  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
