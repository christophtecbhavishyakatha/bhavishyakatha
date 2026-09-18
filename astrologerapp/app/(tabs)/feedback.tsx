import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";

interface Feedback {
  id: number;
  user_id: number;
  clientName: string;
  comment: string;
  date: string;
  reply?: string | null;
  reply_created_at?: string | null;
}

interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface SelfAnalysisResponse {
  success: boolean;

  astrologer: {
    id: number;
    phone_number: string;
    rank: number;
    rank_display: string;
    category: string;
    founding: number;
    profile_completed: number;
    is_phone_verified: number;
    is_admin_verified: number;
  };

  rating: {
    average: number;
    total: number;
    distribution: RatingDistribution;
  };

  comments: Array<{
    id: number;
    user_id: number;
    user_name: string;
    comment: string;
    created_at: string;
    reply?: string | null;
    reply_created_at?: string | null;
  }>;
}

export default function FeedbackScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [ratingCount, setRatingCount] = useState<
    { rating: number; count: number }[]
  >([
    { rating: 5, count: 0 },
    { rating: 4, count: 0 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ]);

  useFocusEffect(
    useCallback(() => {
      loadFeedback();
    }, [])
  );

  // ==========================================
  // FORMAT DATE
  // ==========================================
  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // LOAD SELF ANALYSIS
  // ==========================================
  const loadFeedback = async () => {
    try {
      setLoading(true);

      const astrologerId = await AsyncStorage.getItem("user_id");

      console.log("Astrologer ID:", astrologerId);

      if (!astrologerId) {
        console.log("Astrologer ID not found");
        return;
      }

      const response = await fetch(
        `https://bhavishyakatha.in/express/astrologer/selfanalysis/${astrologerId}`
      );

      const data: SelfAnalysisResponse = await response.json();

      console.log("Self Analysis Response:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          (data as any)?.message || "Failed to fetch feedback"
        );
      }

      // ==========================================
      // RATING
      // ==========================================
      setAverageRating(Number(data.rating?.average || 0));

      setTotalReviews(Number(data.rating?.total || 0));

      // ==========================================
      // RATING DISTRIBUTION
      // ==========================================
      setRatingCount([
        {
          rating: 5,
          count: Number(data.rating?.distribution?.[5] || 0),
        },
        {
          rating: 4,
          count: Number(data.rating?.distribution?.[4] || 0),
        },
        {
          rating: 3,
          count: Number(data.rating?.distribution?.[3] || 0),
        },
        {
          rating: 2,
          count: Number(data.rating?.distribution?.[2] || 0),
        },
        {
          rating: 1,
          count: Number(data.rating?.distribution?.[1] || 0),
        },
      ]);

      // ==========================================
      // COMMENTS
      // ==========================================
      const formattedFeedbacks: Feedback[] = (
        data.comments || []
      ).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        clientName: item.user_name || "Client",
        comment: item.comment || "",
        date: formatDate(item.created_at),
        reply: item.reply,
        reply_created_at: item.reply_created_at,
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error("Feedback loading error:", error);

      setFeedbacks([]);
      setAverageRating(0);
      setTotalReviews(0);

      setRatingCount([
        { rating: 5, count: 0 },
        { rating: 4, count: 0 },
        { rating: 3, count: 0 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REFRESH
  // ==========================================
  const onRefresh = async () => {
    setRefreshing(true);

    await loadFeedback();

    setRefreshing(false);
  };

  // ==========================================
  // RENDER STARS
  // ==========================================
  const renderStars = (rating: number, size = 18) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            style={[
              styles.star,
              {
                fontSize: size,
                color: star <= rating ? "#F5C842" : "#5B526A",
              },
            ]}
          >
            ★
          </Text>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top","bottom"]} style={styles.safeArea}>
      <LinearGradient
        colors={["#1A0533", "#2D0A5E", "#160430"]}
        style={styles.fullFlex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F5C842"
            />
          }
        >
          {/* ==========================================
              HEADER
          ========================================== */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerSub}>✦ CLIENT REVIEWS ✦</Text>

              <Text style={styles.headerTitle}>
                Client Feedback
              </Text>
            </View>

            <View style={styles.headerOrb}>
              <Text style={styles.headerOrbText}>💬</Text>
            </View>
          </View>

          {/* ==========================================
              RATING SUMMARY
          ========================================== */}
          <View style={styles.ratingCard}>
            <LinearGradient
              colors={[
                "rgba(245,200,66,0.14)",
                "rgba(124,58,237,0.14)",
              ]}
              style={styles.ratingGradient}
            >
              {/* LEFT */}
              <View style={styles.ratingLeft}>
                <Text style={styles.averageRating}>
                  {averageRating.toFixed(1)}
                </Text>

                {renderStars(averageRating, 20)}

                <Text style={styles.totalReviews}>
                  {totalReviews} Client Reviews
                </Text>
              </View>

              <View style={styles.ratingDivider} />

              {/* DISTRIBUTION */}
              <View style={styles.ratingDistribution}>
                {ratingCount.map((item) => {
                  const percentage =
                    totalReviews > 0
                      ? (item.count / totalReviews) * 100
                      : 0;

                  return (
                    <View
                      key={item.rating}
                      style={styles.ratingRow}
                    >
                      <Text style={styles.ratingNumber}>
                        {item.rating} ★
                      </Text>

                      <View
                        style={styles.progressBackground}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${percentage}%`,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.ratingCount}>
                        {item.count}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          </View>

          {/* ==========================================
              SECTION TITLE
          ========================================== */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Client Reviews
            </Text>

            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>
                {totalReviews}
              </Text>
            </View>
          </View>

          {/* ==========================================
              LOADING
          ========================================== */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color="#F5C842"
              />

              <Text style={styles.loadingText}>
                Loading feedback...
              </Text>
            </View>
          ) : feedbacks.length === 0 ? (
            /* ==========================================
               EMPTY
            ========================================== */
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💬</Text>

              <Text style={styles.emptyTitle}>
                No Feedback Yet
              </Text>

              <Text style={styles.emptyText}>
                Client reviews will appear here after
                consultations.
              </Text>
            </View>
          ) : (
            /* ==========================================
               FEEDBACK LIST
            ========================================== */
            <View style={styles.feedbackContainer}>
              {feedbacks.map((feedback) => (
                <View
                  key={feedback.id}
                  style={styles.feedbackCard}
                >
                  {/* CLIENT HEADER */}
                  <View style={styles.clientHeader}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {feedback.clientName
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>
                        {feedback.clientName}
                      </Text>

                      <View style={styles.ratingDateRow}>
                        <Text style={styles.dateText}>
                          {feedback.date}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* CLIENT COMMENT */}
                  <View style={styles.commentContainer}>
                    <Text style={styles.quoteIcon}>
                      “
                    </Text>

                    <Text style={styles.comment}>
                      {feedback.comment}
                    </Text>
                  </View>

                  {/* ======================================
                      ASTROLOGER REPLY
                  ====================================== */}
                  {feedback.reply ? (
                    <View style={styles.replyContainer}>
                      <View style={styles.replyHeader}>
                        <Text style={styles.replyIcon}>
                          ↳
                        </Text>

                        <Text style={styles.replyTitle}>
                          Your Reply
                        </Text>

                        {feedback.reply_created_at ? (
                          <Text style={styles.replyDate}>
                            {formatDate(
                              feedback.reply_created_at
                            )}
                          </Text>
                        ) : null}
                      </View>

                      <Text style={styles.replyText}>
                        {feedback.reply}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* FOOTER */}
          <Text style={styles.footer}>✦ ✦ ✦</Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1A0533",
  },

  fullFlex: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  /* ==========================================
     HEADER
  ========================================== */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  backIcon: {
    color: "#F5C842",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "300",
  },

  headerTextContainer: {
    flex: 1,
  },

  headerSub: {
    fontSize: 9,
    color: "#F5C842",
    letterSpacing: 2.5,
    fontWeight: "600",
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#F3F0FF",
  },

  headerOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(245,200,66,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(245,200,66,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerOrbText: {
    fontSize: 20,
  },

  /* ==========================================
     RATING
  ========================================== */

  ratingCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(245,200,66,0.25)",
  },

  ratingGradient: {
    padding: 20,
    flexDirection: "row",
  },

  ratingLeft: {
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
  },

  averageRating: {
    color: "#F5C842",
    fontSize: 38,
    fontWeight: "800",
  },

  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  star: {
    marginRight: 2,
  },

  totalReviews: {
    color: "#B9A9CA",
    fontSize: 11,
    marginTop: 7,
    textAlign: "center",
  },

  ratingDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 15,
  },

  ratingDistribution: {
    flex: 1,
    justifyContent: "center",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
  },

  ratingNumber: {
    width: 35,
    color: "#DDD6FE",
    fontSize: 11,
  },

  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#F5C842",
    borderRadius: 10,
  },

  ratingCount: {
    width: 20,
    textAlign: "right",
    color: "#A89BB7",
    fontSize: 10,
  },

  /* ==========================================
     SECTION
  ========================================== */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#F3F0FF",
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },

  reviewBadge: {
    backgroundColor: "rgba(124,58,237,0.3)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },

  reviewBadgeText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ==========================================
     FEEDBACK
  ========================================== */

  feedbackContainer: {
    gap: 12,
  },

  feedbackCard: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
  },

  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  clientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#5B21B6",
    borderWidth: 1.5,
    borderColor: "#F5C842",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  clientAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  clientInfo: {
    flex: 1,
  },

  clientName: {
    color: "#F3F0FF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  ratingDateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateText: {
    color: "#8F819F",
    fontSize: 10,
  },

  /* ==========================================
     COMMENT
  ========================================== */

  commentContainer: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },

  quoteIcon: {
    color: "#F5C842",
    fontSize: 30,
    lineHeight: 28,
    marginRight: 5,
  },

  comment: {
    flex: 1,
    color: "#CFC5D9",
    fontSize: 13,
    lineHeight: 20,
  },

  /* ==========================================
     REPLY
  ========================================== */

  replyContainer: {
    marginTop: 14,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "rgba(245,200,66,0.06)",
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#F5C842",
  },

  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  replyIcon: {
    color: "#F5C842",
    fontSize: 18,
    marginRight: 6,
  },

  replyTitle: {
    color: "#F5C842",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },

  replyDate: {
    color: "#8F819F",
    fontSize: 9,
  },

  replyText: {
    color: "#CFC5D9",
    fontSize: 12,
    lineHeight: 19,
  },

  /* ==========================================
     LOADING
  ========================================== */

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },

  loadingText: {
    color: "#B9A9CA",
    marginTop: 12,
    fontSize: 13,
  },

  /* ==========================================
     EMPTY
  ========================================== */

  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.25)",
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#F3F0FF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },

  emptyText: {
    color: "#A89BB7",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  /* ==========================================
     FOOTER
  ========================================== */

  footer: {
    textAlign: "center",
    color: "rgba(245,200,66,0.4)",
    fontSize: 16,
    letterSpacing: 8,
    marginTop: 25,
  },
});