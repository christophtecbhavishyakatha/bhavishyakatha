import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { CLIENT_API_BASE_URL } from "../../lib/api";

type SocialComment = {
  id: number;
  userId: number;
  userName: string;
  comment: string;
  createdAt: string;
  adminReply?: string;
  adminReplyAt?: string | null;
  adminReplyName?: string;
};

type SocialPost = {
  id: number;
  authorName: string;
  content: string;
  imageBase64?: string;
  publishAt: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  status: string;
  commentCount: number;
  comments: SocialComment[];
};

type SocialPostsResponse = {
  success: boolean;
  message?: string;
  data?: SocialPost[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

const PAGE_SIZE = 10;

const formatDate = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getImageUri = (base64?: string) =>
  base64 ? `data:image/jpeg;base64,${base64}` : "";

export default function SocialFeed() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<
    Record<number, string>
  >({});
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [submittingPostId, setSubmittingPostId] = useState<number | null>(
    null
  );

  // Fullscreen image
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(
    null
  );

  const loadFeed = useCallback(
    async (offset = 0, replace = false, resetExpandedComments = false) => {
      try {
        if (replace) {
          if (offset === 0) {
            setRefreshing(true);
          } else {
            setLoadingMore(true);
          }
        } else {
          setLoading(true);
        }

        const [savedUserId, response] = await Promise.all([
          AsyncStorage.getItem("user_id"),
          fetch(
            `${CLIENT_API_BASE_URL}/social/posts?limit=${PAGE_SIZE}&offset=${offset}`
          ),
        ]);

        setUserId(savedUserId || "");

        const json = (await response.json()) as SocialPostsResponse;

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.message || "Unable to load posts");
        }

        if (resetExpandedComments) {
          setExpandedComments({});
        }

        setPosts((current) => {
          if (offset === 0 || !replace) {
            return json.data || [];
          }

          const seen = new Set(current.map((post) => post.id));

          const nextPosts = (json.data || []).filter(
            (post) => !seen.has(post.id)
          );

          return [...current, ...nextPosts];
        });

        setHasMore(Boolean(json.pagination?.hasMore));
      } catch (error) {
        console.log("Load social feed error:", error);
        Alert.alert("Error", "Unable to load posts right now");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadFeed(0, false, true);
    }, [loadFeed])
  );

  const handleLoadMore = () => {
    if (loading || refreshing || loadingMore || !hasMore || !posts.length) {
      return;
    }

    void loadFeed(posts.length, true);
  };

  const submitComment = async (postId: number) => {
    const comment = (commentDrafts[postId] || "").trim();

    if (!userId) {
      router.push("/login");
      return;
    }

    if (!comment) {
      Alert.alert("Comment Required", "Please write a comment first");
      return;
    }

    try {
      setSubmittingPostId(postId);

      const response = await fetch(
        `${CLIENT_API_BASE_URL}/social/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            comment,
          }),
        }
      );

      const json = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Unable to post comment");
      }

      setCommentDrafts((current) => ({
        ...current,
        [postId]: "",
      }));

      setExpandedComments((current) => ({
        ...current,
        [postId]: true,
      }));

      await loadFeed(0, false, false);
    } catch (error) {
      console.log("Submit social comment error:", error);

      Alert.alert(
        "Comment Failed",
        error instanceof Error
          ? error.message
          : "Unable to post comment"
      );
    } finally {
      setSubmittingPostId(null);
    }
  };

  const renderComment = (comment: SocialComment) => (
    <View key={comment.id} style={styles.commentCard}>
      <Text style={styles.commentName}>{comment.userName}</Text>

      {/* <Text style={styles.commentDate}>
        {formatDate(comment.createdAt)}
      </Text> */}

      <Text style={styles.commentText}>{comment.comment}</Text>

      {comment.adminReply ? (
        <View style={styles.replyCard}>
          <Text style={styles.replyName}>
            {comment.adminReplyName || "Bhavishya Katha"}
          </Text>
{/* 
          <Text style={styles.replyDate}>
            {formatDate(comment.adminReplyAt)}
          </Text>
*/}
          <Text style={styles.replyText}>{comment.adminReply}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderPost = ({ item: post }: { item: SocialPost }) => {
    const isExpanded = Boolean(expandedComments[post.id]);

    const visibleComments = isExpanded ? post.comments : [];

    return (
      <View style={styles.postCard}>
        {/* POST HEADER */}
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Feather name="bell" size={18} color="#1D4ED8" />
          </View>

          <View style={styles.postMeta}>
            <Text style={styles.authorName}>{post.authorName}</Text>

            {/* 
            <Text style={styles.postDate}>
              {formatDate(post.publishAt)}
            </Text>
            */}
          </View>
        </View>

        {/* POST CONTENT */}
        {post.content ? (
          <Text style={styles.postContent}>{post.content}</Text>
        ) : null}

        {/* ================================================= */}
        {/* POST IMAGE */}
        {/* ================================================= */}

        {post.imageBase64 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              setFullscreenImage(getImageUri(post.imageBase64));
            }}
          >
            <Image
              source={{
                uri: getImageUri(post.imageBase64),
              }}
              style={styles.postImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : null}

        {/* COMMENT COUNT */}
        <Text style={styles.commentCount}>
          {post.commentCount} comment
          {post.commentCount === 1 ? "" : "s"}
        </Text>

        {/* COMMENTS */}
        {visibleComments.length ? (
          visibleComments.map(renderComment)
        ) : post.commentCount === 0 ? (
          <Text style={styles.emptyCommentText}>
            No comments yet. Start the conversation.
          </Text>
        ) : null}

        {/* VIEW ALL COMMENTS */}
        {post.commentCount > 0 ? (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() =>
              setExpandedComments((current) => ({
                ...current,
                [post.id]: !isExpanded,
              }))
            }
          >
            <Text style={styles.viewAllButtonText}>
              {isExpanded
                ? "Hide comments"
                : `View all comments (${post.commentCount})`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* COMMENT COMPOSER */}
        {userId ? (
          <View style={styles.commentComposer}>
            <TextInput
              value={commentDrafts[post.id] || ""}
              onChangeText={(value) =>
                setCommentDrafts((current) => ({
                  ...current,
                  [post.id]: value,
                }))
              }
              placeholder="Write a public comment..."
              style={styles.commentInput}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.commentButton,
                submittingPostId === post.id &&
                  styles.commentButtonDisabled,
              ]}
              onPress={() => void submitComment(post.id)}
              disabled={submittingPostId === post.id}
            >
              <Text style={styles.commentButtonText}>
                {submittingPostId === post.id
                  ? "Posting..."
                  : "Comment"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginPromptText}>
              Log in to comment on this post
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      {/* ===================================================== */}
      {/* FULLSCREEN IMAGE ZOOM VIEWER */}
      {/* ===================================================== */}

      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          {fullscreenImage ? (
            <ImageViewer
              imageUrls={[
                {
                  url: fullscreenImage,
                },
              ]}
              enableImageZoom={true}
              enableSwipeDown={true}
              onSwipeDown={() => {
                setFullscreenImage(null);
              }}
              onCancel={() => {
                setFullscreenImage(null);
              }}
              backgroundColor="#000000"
              saveToLocalByLongPress={false}
              enablePreload={true}
              //renderIndicator={() => null}
              doubleClickInterval={250}
            />
          ) : null}

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            style={styles.closeImageButton}
            activeOpacity={0.8}
            onPress={() => {
              setFullscreenImage(null);
            }}
          >
            <Text style={styles.closeImageButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* SOCIAL FEED */}
      {/* ===================================================== */}

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={styles.content}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void loadFeed(0, true, true)
            }
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator
                size="large"
                color="#2563EB"
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No posts available
              </Text>

              <Text style={styles.emptySubtitle}>
                Admin posts will appear here once they are
                published.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator
                size="small"
                color="#2563EB"
              />
            </View>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 36,
    gap: 16,
    backgroundColor: "#F8FAFC",
    marginTop: "-1%",
  },

  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#0F172A",
    marginBottom: 16,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1D4ED8",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#CBD5E1",
  },

  loaderWrap: {
    paddingVertical: 50,
    alignItems: "center",
  },

  footerLoader: {
    paddingVertical: 16,
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },

  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  postMeta: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },

  authorName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flexShrink: 1,
  },

  postDate: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  postContent: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 24,
    color: "#1E293B",
  },

  postImage: {
    marginTop: 14,
    width: "100%",
    height: 250,
    borderRadius: 18,
    backgroundColor: "#FEFEFE",
  },

  commentCount: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  commentCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
  },

  commentName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  commentDate: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  commentText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },

  replyCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#E0E7FF",
  },

  replyName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
  },

  replyDate: {
    marginTop: 3,
    fontSize: 11,
    color: "#3730A3",
  },

  replyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#312E81",
  },

  emptyCommentText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  viewAllButton: {
    marginTop: 10,
    alignSelf: "flex-start",
  },

  viewAllButtonText: {
    color: "#2563EB",
    fontWeight: "700",
  },

  commentComposer: {
    marginTop: 14,
  },

  commentInput: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
  },

  commentButton: {
    marginTop: 10,
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    maxWidth: "100%",
  },

  commentButtonDisabled: {
    opacity: 0.7,
  },

  commentButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  loginPrompt: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  loginPromptText: {
    color: "#1D4ED8",
    fontWeight: "700",
    textAlign: "center",
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },

  // =========================================================
  // FULLSCREEN IMAGE VIEWER
  // =========================================================

  imageViewerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  closeImageButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 10,
  },

  closeImageButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
  },
});