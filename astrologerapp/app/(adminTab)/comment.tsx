import React, { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
const API_BASE_URL = "https://bhavishyakatha.in/express/api";
/* =========================================================
   TYPES
   ========================================================= */

type CommentItem = {
  id: string;

  userId: string | null;
  userName: string;

  astrologerId: string | null;
  astrologerName: string;
  astrologerPhoto: string | null;

  rating: number;

  comment: string;

  createdAt: string;

  reply: string | null;
  replyCreatedAt: string | null;

  isReplied: boolean;
};

type Astrologer = {
  id: string;
  name: string;
  photo: string | null;
};

type StatusFilter = "all" | "replied" | "unreplied";

type SortType = "newest" | "oldest" | "highest_rating" | "lowest_rating";

/* =========================================================
   HELPERS
   ========================================================= */

const formatDate = (date: string | null) => {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const formatDateTime = (date: string | null) => {
  if (!date) return "";

  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/* =========================================================
   COMPONENT
   ========================================================= */

export default function CommentController() {
  /* ---------------- DATA ---------------- */

  const [comments, setComments] = useState<CommentItem[]>([]);

  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);

  /* ---------------- LOADING ---------------- */

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);

  /* ---------------- PAGINATION ---------------- */

  const [page, setPage] = useState(1);

  const [hasNextPage, setHasNextPage] = useState(false);

  const LIMIT = 20;

  /* ---------------- SEARCH ---------------- */

  const [search, setSearch] = useState("");

  /* ---------------- FILTERS ---------------- */

  const [status, setStatus] = useState<StatusFilter>("all");

  const [astrologerId, setAstrologerId] = useState("all");

  const [sort, setSort] = useState<SortType>("newest");

  /* ---------------- MODALS ---------------- */

  const [filterModal, setFilterModal] = useState(false);

  const [sortModal, setSortModal] = useState(false);

  const [replyModal, setReplyModal] = useState(false);

  /* ---------------- SELECTED COMMENT ---------------- */

  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(
    null,
  );

  const [replyText, setReplyText] = useState("");

  const [savingReply, setSavingReply] = useState(false);

  /* =========================================================
     FETCH COMMENTS
     ========================================================= */

  const fetchComments = useCallback(
    async (pageNumber = 1, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();

        params.append("page", String(pageNumber));

        params.append("limit", String(LIMIT));

        params.append("sort", sort);

        params.append("status", status);

        if (astrologerId && astrologerId !== "all") {
          params.append("astrologerId", astrologerId);
        }

        if (search.trim()) {
          params.append("search", search.trim());
        }

        const response = await fetch(
          `${API_BASE_URL}/comments/admin?${params.toString()}`,
        );

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || "Failed to fetch comments");
        }

        const newComments = json.data || [];

        if (append) {
          setComments((previous) => [...previous, ...newComments]);
        } else {
          setComments(newComments);
        }

        setPage(pageNumber);

        setHasNextPage(Boolean(json.pagination?.hasNextPage));
      } catch (error) {
        console.error("Fetch comments error:", error);

        Alert.alert("Error", "Failed to load comments");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, status, astrologerId, sort],
  );

  /* =========================================================
     FETCH ASTROLOGERS
     ========================================================= */

  const fetchAstrologers = useCallback(async () => {
    try {
      const response = await fetch(
`${API_BASE_URL}/comments/admin/astrologers`
      );

      const json = await response.json();

      if (response.ok && json.success) {
        setAstrologers(json.data || []);
      }
    } catch (error) {
      console.error("Fetch astrologers error:", error);
    }
  }, []);

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    fetchAstrologers();
  }, [fetchAstrologers]);

  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  /* =========================================================
     REFRESH
     ========================================================= */

  const handleRefresh = () => {
    setRefreshing(true);

    fetchComments(1, false);
  };

  /* =========================================================
     LOAD MORE
     ========================================================= */

  const handleLoadMore = () => {
    if (loadingMore || !hasNextPage) {
      return;
    }

    fetchComments(page + 1, true);
  };

  /* =========================================================
     OPEN REPLY MODAL
     ========================================================= */

  const openReplyModal = (item: CommentItem) => {
    setSelectedComment(item);

    setReplyText(item.reply || "");

    setReplyModal(true);
  };

  /* =========================================================
     SAVE REPLY
     ========================================================= */

  const saveReply = async () => {
    if (!selectedComment) {
      return;
    }

    const cleanReply = replyText.replace(/\s+/g, " ").trim();

    if (!cleanReply) {
      Alert.alert("Required", "Please enter a reply");

      return;
    }

    if (cleanReply.length > 1000) {
      Alert.alert("Too Long", "Reply cannot exceed 1000 characters");

      return;
    }

    try {
      setSavingReply(true);

      const isEdit = Boolean(selectedComment.reply);

      const url = `${API_BASE_URL}/comments/admin/${selectedComment.id}/reply`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          reply: cleanReply,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to save reply");
      }

      /* Update local item */

      setComments((previous) =>
        previous.map((item) => {
          if (item.id !== selectedComment.id) {
            return item;
          }

          return {
            ...item,

            reply: cleanReply,

            replyCreatedAt: new Date().toISOString(),

            isReplied: true,
          };
        }),
      );

      setReplyModal(false);

      setSelectedComment(null);

      setReplyText("");

      Alert.alert(
        "Success",
        isEdit ? "Reply updated successfully" : "Reply added successfully",
      );
    } catch (error) {
      console.error("Save reply error:", error);

      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save reply",
      );
    } finally {
      setSavingReply(false);
    }
  };

  /* =========================================================
     DELETE REPLY
     ========================================================= */

  const deleteReply = (item: CommentItem) => {
    Alert.alert("Delete Reply", "Are you sure you want to delete this reply?", [
      {
        text: "Cancel",
        style: "cancel",
      },

      {
        text: "Delete",
        style: "destructive",

        onPress: async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/comments/admin/${item.id}/reply`,
              {
                method: "DELETE",
              },
            );

            const json = await response.json();

            if (!response.ok || !json.success) {
              throw new Error(json.message || "Failed to delete reply");
            }

            setComments((previous) =>
              previous.map((comment) => {
                if (comment.id !== item.id) {
                  return comment;
                }

                return {
                  ...comment,

                  reply: null,

                  replyCreatedAt: null,

                  isReplied: false,
                };
              }),
            );

            Alert.alert("Success", "Reply deleted successfully");
          } catch (error) {
            console.error("Delete reply error:", error);

            Alert.alert("Error", "Failed to delete reply");
          }
        },
      },
    ]);
  };

  const deleteWholeComment = (item: CommentItem) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to permanently delete this whole comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/comments/admin/${item.id}`,
                { method: "DELETE" },
              );
              const json = await response.json();

              if (!response.ok || !json.success) {
                throw new Error(json.message || "Failed to delete comment");
              }

              setComments((previous) =>
                previous.filter((comment) => comment.id !== item.id),
              );
              Alert.alert("Success", "Comment deleted successfully");
            } catch (error) {
              console.error("Delete whole comment error:", error);
              Alert.alert("Error", "Failed to delete comment");
            }
          },
        },
      ],
    );
  };

  /* =========================================================
     ASTROLOGER NAME
     ========================================================= */

  const selectedAstrologer = astrologers.find(
    (item) => item.id === astrologerId,
  );

  /* =========================================================
     RENDER COMMENT
     ========================================================= */

  const renderComment = ({ item }: { item: CommentItem }) => {
    return (
      <View style={styles.commentCard}>
        {/* HEADER */}

        <View style={styles.commentHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.userName}
            </Text>

            <View style={styles.astrologerRow}>
              <Ionicons name="person" size={13} color="#6B21A8" />

              <Text style={styles.astrologerName} numberOfLines={1}>
                {item.astrologerName}
              </Text>
            </View>
          </View>

          {/* STATUS */}

          <View
            style={[
              styles.statusBadge,

              item.isReplied ? styles.repliedBadge : styles.unrepliedBadge,
            ]}
          >
            <Text
              style={item.isReplied ? styles.repliedText : styles.unrepliedText}
            >
              {item.isReplied ? "✓ Replied" : "Not Replied"}
            </Text>
          </View>
        </View>

        {/* RATING */}

        <View style={styles.ratingRow}>
          <Text style={styles.stars}>
            {"★".repeat(Math.min(Math.max(item.rating, 0), 5))}
          </Text>

          <Text style={styles.ratingText}>{item.rating}/5</Text>
        </View>

        {/* COMMENT */}

        <View style={styles.commentBox}>
          <Text style={styles.commentLabel}>User Comment</Text>

          <Text style={styles.commentText}>{item.comment}</Text>

          <Text style={styles.dateText}>{formatDateTime(item.createdAt)}</Text>

          <TouchableOpacity
            style={styles.deleteWholeCommentButton}
            onPress={() => deleteWholeComment(item)}
          >
            <Ionicons name="trash-outline" size={15} color="#B91C1C" />
            <Text style={styles.deleteWholeCommentText}>Delete comment</Text>
          </TouchableOpacity>
        </View>

        {/* REPLY */}

        {item.reply ? (
          <View style={styles.replyBox}>
            <View style={styles.replyHeader}>
              <View style={styles.replyTitleRow}>
                <Ionicons name="sparkles" size={16} color="#7E22CE" />

                <Text style={styles.replyTitle}>Bhavishya Katha</Text>
              </View>
            </View>

            <Text style={styles.replyText}>{item.reply}</Text>

            <Text style={styles.replyDate}>
              {formatDateTime(item.replyCreatedAt)}
            </Text>

            <View style={styles.replyActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openReplyModal(item)}
              >
                <Ionicons name="create-outline" size={16} color="#fff" />

                <Text style={styles.actionButtonText}>Edit Reply</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteReply(item)}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />

                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => openReplyModal(item)}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#fff"
            />

            <Text style={styles.replyButtonText}>Reply to Comment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* =========================================================
     HEADER
     ========================================================= */

  const renderHeader = () => {
    return (
      <View>
        {/* TITLE */}

        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Comment Controller</Text>

            <Text style={styles.subtitle}>
              Manage user comments and Bhavishya Katha replies
            </Text>
          </View>

          <View style={styles.totalBadge}>
            <Ionicons name="chatbubbles" size={18} color="#fff" />
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh comments" onPress={handleRefresh} style={{ padding: 8 }}>
            <Ionicons name="refresh-outline" size={22} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search user, astrologer or comment..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* FILTER BUTTONS */}

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModal(true)}
          >
            <Ionicons name="filter" size={17} color="#4A148C" />

            <Text style={styles.filterButtonText}>
              {selectedAstrologer ? selectedAstrologer.name : "Filters"}
            </Text>

            <Ionicons name="chevron-down" size={15} color="#4A148C" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={17} color="#4A148C" />

            <Text style={styles.filterButtonText}>
              {sort === "newest"
                ? "Newest"
                : sort === "oldest"
                  ? "Oldest"
                  : sort === "highest_rating"
                    ? "Highest Rating"
                    : "Lowest Rating"}
            </Text>

            <Ionicons name="chevron-down" size={15} color="#4A148C" />
          </TouchableOpacity>
        </View>

        {/* ACTIVE FILTER */}

        {(status !== "all" || astrologerId !== "all") && (
          <View style={styles.activeFilterRow}>
            {status !== "all" && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>
                  {status === "replied" ? "Replied" : "Not Replied"}
                </Text>

                <TouchableOpacity onPress={() => setStatus("all")}>
                  <Ionicons name="close" size={14} color="#4A148C" />
                </TouchableOpacity>
              </View>
            )}

            {astrologerId !== "all" && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>
                  {selectedAstrologer?.name}
                </Text>

                <TouchableOpacity onPress={() => setAstrologerId("all")}>
                  <Ionicons name="close" size={14} color="#4A148C" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  /* =========================================================
     FOOTER
     ========================================================= */

  const renderFooter = () => {
    if (!loadingMore) {
      return null;
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4A148C" />

        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  /* =========================================================
     EMPTY
     ========================================================= */

  const renderEmpty = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={60} color="#D1D5DB" />

        <Text style={styles.emptyTitle}>No comments found</Text>

        <Text style={styles.emptyText}>
          Try changing your search or filters.
        </Text>
      </View>
    );
  };

  /* =========================================================
     MAIN
     ========================================================= */

  return (
    <SafeAreaView edges={["top","bottom"]} style={styles.container}>
      {loading && comments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A148C" />

          <Text style={styles.loadingText}>Loading comments...</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#4A148C"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* =====================================================
          FILTER MODAL
         ===================================================== */}

      <Modal
        visible={filterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModal(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Filter Comments</Text>

            {/* STATUS */}

            <Text style={styles.optionTitle}>Reply Status</Text>

            <View style={styles.optionRow}>
              {(["all", "replied", "unreplied"] as StatusFilter[]).map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionChip,

                      status === option && styles.optionChipActive,
                    ]}
                    onPress={() => setStatus(option)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,

                        status === option && styles.optionChipTextActive,
                      ]}
                    >
                      {option === "all"
                        ? "All"
                        : option === "replied"
                          ? "Replied"
                          : "Not Replied"}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            {/* ASTROLOGER */}

            <Text style={styles.optionTitle}>Astrologer</Text>

            <ScrollView
              style={styles.astrologerList}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.astrologerOption,

                  astrologerId === "all" && styles.astrologerOptionActive,
                ]}
                onPress={() => setAstrologerId("all")}
              >
                <Text style={styles.astrologerOptionText}>All Astrologers</Text>

                {astrologerId === "all" && (
                  <Ionicons name="checkmark-circle" size={21} color="#4A148C" />
                )}
              </TouchableOpacity>

              {astrologers.map((astrologer) => (
                <TouchableOpacity
                  key={astrologer.id}
                  style={[
                    styles.astrologerOption,

                    astrologerId === astrologer.id &&
                      styles.astrologerOptionActive,
                  ]}
                  onPress={() => setAstrologerId(astrologer.id)}
                >
                  <Text style={styles.astrologerOptionText}>
                    {astrologer.name}
                  </Text>

                  {astrologerId === astrologer.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color="#4A148C"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          SORT MODAL
         ===================================================== */}

      <Modal
        visible={sortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModal(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Sort Comments</Text>

            {(
              [
                ["newest", "Newest First", "arrow-down"],
                ["oldest", "Oldest First", "arrow-up"],
                ["highest_rating", "Highest Rating", "star"],
                ["lowest_rating", "Lowest Rating", "star-outline"],
              ] as const
            ).map(([value, label, icon]) => (
              <TouchableOpacity
                key={value}
                style={styles.sortOption}
                onPress={() => {
                  setSort(value as SortType);

                  setSortModal(false);
                }}
              >
                <Ionicons name={icon as any} size={21} color="#4A148C" />

                <Text style={styles.sortOptionText}>{label}</Text>

                {sort === value && (
                  <Ionicons name="checkmark" size={21} color="#16A34A" />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          REPLY MODAL
         ===================================================== */}

      <Modal
        visible={replyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReplyModal(false)}
      >
        <KeyboardAvoidingView style={styles.replyModalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.replyModal}>
            {/* HEADER */}

            <View style={styles.replyModalHeader}>
              <View>
                <Text style={styles.replyModalTitle}>
                  {selectedComment?.reply ? "Edit Reply" : "Reply to Comment"}
                </Text>

                <Text style={styles.replyModalSubtitle}>
                  {selectedComment?.userName}
                  {" • "}
                  {selectedComment?.astrologerName}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setReplyModal(false)}>
                <Ionicons name="close" size={25} color="#555" />
              </TouchableOpacity>
            </View>

            {/* ORIGINAL COMMENT */}

            <View style={styles.originalComment}>
              <Text style={styles.originalLabel}>User Comment</Text>

              <Text style={styles.originalText}>
                {selectedComment?.comment}
              </Text>
            </View>

            {/* REPLY INPUT */}

            <Text style={styles.inputLabel}>Bhavishya Katha Reply</Text>

            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write your reply..."
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={styles.replyInput}
            />

            <Text style={styles.characterCount}>{replyText.length}/1000</Text>

            {/* BUTTONS */}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReplyModal(false)}
                disabled={savingReply}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveReply}
                disabled={savingReply}
              >
                {savingReply ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={17} color="#fff" />

                    <Text style={styles.saveButtonText}>
                      {selectedComment?.reply ? "Update Reply" : "Send Reply"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F5FA",
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },

  /* ---------------- TITLE ---------------- */

  titleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#321047",
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },

  totalBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#4A148C",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------------- SEARCH ---------------- */

  searchContainer: {
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E0EA",
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },

  /* ---------------- FILTER ---------------- */

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  filterButton: {
    flex: 1,
    height: 43,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E3DCEA",
    borderRadius: 11,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  filterButtonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#4A148C",
  },

  activeFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 12,
  },

  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  activeChipText: {
    color: "#4A148C",
    fontSize: 11,
    fontWeight: "700",
  },

  /* ---------------- COMMENT CARD ---------------- */

  commentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ECE7F0",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },

  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  userInfo: {
    flex: 1,
    marginRight: 10,
  },

  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#27212D",
  },

  astrologerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 5,
  },

  astrologerName: {
    fontSize: 12,
    color: "#6B21A8",
    fontWeight: "600",
  },

  /* ---------------- STATUS ---------------- */

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  repliedBadge: {
    backgroundColor: "#DCFCE7",
  },

  unrepliedBadge: {
    backgroundColor: "#FEF3C7",
  },

  repliedText: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "800",
  },

  unrepliedText: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "800",
  },

  /* ---------------- RATING ---------------- */

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },

  stars: {
    fontSize: 15,
    color: "#F59E0B",
    letterSpacing: 1,
  },

  ratingText: {
    fontSize: 11,
    color: "#777",
    fontWeight: "600",
  },

  /* ---------------- COMMENT ---------------- */

  commentBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8F7FA",
    borderRadius: 12,
  },

  commentLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 5,
  },

  commentText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#333",
  },

  deleteWholeCommentButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  deleteWholeCommentText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },

  dateText: {
    fontSize: 10,
    color: "#999",
    marginTop: 7,
  },

  /* ---------------- REPLY ---------------- */

  replyBox: {
    marginTop: 12,
    backgroundColor: "#FFF8EC",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FF9933",
  },

  replyHeader: {
    marginBottom: 7,
  },

  replyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  replyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B21A8",
  },

  replyText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#4B3A55",
  },

  replyDate: {
    fontSize: 10,
    color: "#999",
    marginTop: 7,
  },

  replyActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4A148C",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DC2626",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },

  actionButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  replyButton: {
    marginTop: 12,
    height: 42,
    backgroundColor: "#4A148C",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  replyButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  /* ---------------- FOOTER ---------------- */

  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },

  footerText: {
    fontSize: 12,
    color: "#777",
  },

  /* ---------------- EMPTY ---------------- */

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#555",
    marginTop: 15,
  },

  emptyText: {
    fontSize: 13,
    color: "#999",
    marginTop: 5,
  },

  /* ---------------- MODAL ---------------- */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  sheetHandle: {
    width: 45,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 18,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#321047",
    marginBottom: 20,
  },

  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#555",
    marginBottom: 9,
  },

  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },

  optionChip: {
    borderWidth: 1,
    borderColor: "#DDD",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },

  optionChipActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#4A148C",
  },

  optionChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  optionChipTextActive: {
    color: "#4A148C",
    fontWeight: "800",
  },

  astrologerList: {
    maxHeight: 280,
    marginBottom: 15,
  },

  astrologerOption: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  astrologerOptionActive: {
    backgroundColor: "#FAF7FF",
  },

  astrologerOptionText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
  },

  applyButton: {
    height: 47,
    backgroundColor: "#4A148C",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  applyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ---------------- SORT ---------------- */

  sortOption: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  sortOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },

  /* ---------------- REPLY MODAL ---------------- */

  replyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  replyModal: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
  },

  replyModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  replyModalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#321047",
  },

  replyModalSubtitle: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
  },

  originalComment: {
    backgroundColor: "#F7F5FA",
    borderRadius: 11,
    padding: 12,
    marginBottom: 15,
  },

  originalLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 5,
  },

  originalText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 19,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#555",
    marginBottom: 7,
  },

  replyInput: {
    height: 130,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#333",
  },

  characterCount: {
    fontSize: 10,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },

  cancelButton: {
    flex: 1,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "700",
  },

  saveButton: {
    flex: 1.5,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#4A148C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
