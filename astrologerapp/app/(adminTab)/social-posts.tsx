import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = "https://bhavishyakatha.in/express/api/admin";
const MAX_IMAGE_SIZE_KB = 180;

type SocialComment = {
  id: number;
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
  status: "scheduled" | "published" | "inactive";
  commentCount: number;
  comments: SocialComment[];
};

type SocialPostsResponse = {
  success: boolean;
  message?: string;
  data?: SocialPost[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTimeLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${mins}`;
};

const getImageUri = (base64?: string) =>
  base64 ? `data:image/jpeg;base64,${base64}` : "";

// ─── Inline Date-Time Picker ────────────────────────────────────────────────
function DateTimePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const parseOrNow = () => {
    const d = new Date(value.replace(" ", "T"));
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [pickerDate, setPickerDate] = useState<Date>(parseOrNow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) {
      const merged = new Date(selected);
      merged.setHours(pickerDate.getHours(), pickerDate.getMinutes());
      setPickerDate(merged);
      onChange(formatDateTimeLocal(merged));
      if (Platform.OS === "android") setShowTimePicker(true);
    }
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selected) {
      const merged = new Date(pickerDate);
      merged.setHours(selected.getHours(), selected.getMinutes());
      setPickerDate(merged);
      onChange(formatDateTimeLocal(merged));
    }
  };

  return (
    <View style={styles.dtPickerWrap}>
      <Text style={styles.dtLabel}>Scheduled Date & Time</Text>
      <View style={styles.dtRow}>
        <TouchableOpacity
          style={styles.dtButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={15} color="#7C3AED" />
          <Text style={styles.dtButtonText}>
            {pickerDate.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dtButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Feather name="clock" size={15} color="#7C3AED" />
          <Text style={styles.dtButtonText}>
            {pickerDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dtPreview}>
        <Feather name="check-circle" size={13} color="#6D28D9" />
        <Text style={styles.dtPreviewText}>{value || "Not set"}</Text>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}

// ─── Date Filter Picker ──────────────────────────────────────────────────────
function DateFilterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const parseOrToday = () => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [pickerDate, setPickerDate] = useState<Date>(parseOrToday);
  const [showPicker, setShowPicker] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) {
      setPickerDate(selected);
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, "0");
      const d = String(selected.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <View style={styles.filterDateWrap}>
      <TouchableOpacity
        style={[styles.filterDateButton, value ? styles.filterDateButtonActive : null]}
        onPress={() => setShowPicker(true)}
      >
        <Feather name="calendar" size={15} color={value ? "#7C3AED" : "#64748B"} />
        <Text style={[styles.filterDateText, value ? styles.filterDateTextActive : null]}>
          {value
            ? pickerDate.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Filter by date"}
        </Text>
      </TouchableOpacity>

      {value ? (
        <TouchableOpacity style={styles.clearFilterButton} onPress={() => onChange("")}>
          <Feather name="x" size={14} color="#64748B" />
        </TouchableOpacity>
      ) : null}

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SocialPostsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [content, setContent] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [dateFilter, setDateFilter] = useState("");
  const [showLatestComments, setShowLatestComments] = useState(false);
  const [latestCommentsLoading, setLatestCommentsLoading] = useState(false);

  const loadPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_BASE}/social/posts`);
      const json = (await response.json()) as SocialPostsResponse;

      if (!response.ok || !json.success || !json.data)
        throw new Error(json.message || "Unable to load posts");

      setPosts(json.data);
      setExpandedComments({});
    } catch (error) {
      console.error("Load admin social posts error:", error);
      Alert.alert("Error", "Unable to load posts right now");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPosts();
    }, [loadPosts])
  );

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        base64: true,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      let width = 900;
      let quality = 0.8;
      let compressed = null;

      while (true) {
        compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width } }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (!compressed.base64) throw new Error("Image conversion failed");

        const sizeKB = (compressed.base64.length * 3) / 4 / 1024;
        if (sizeKB <= MAX_IMAGE_SIZE_KB || quality <= 0.2 || width <= 300) break;

        quality -= 0.1;
        width -= 120;
      }

      setImageBase64(compressed?.base64 || "");
    } catch (error) {
      console.error("Pick image error:", error);
      Alert.alert("Image Error", "Unable to select image");
    }
  };

  const submitPost = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent && !imageBase64) {
      Alert.alert("Post Required", "Add text, image, or both");
      return;
    }

    if (scheduleEnabled && !publishAt.trim()) {
      Alert.alert("Schedule Required", "Please pick a date and time");
      return;
    }

    try {
      setSubmittingPost(true);
      const adminId = await AsyncStorage.getItem("admin_id");
      if (!adminId) { router.replace("/login"); return; }

      const response = await fetch(`${API_BASE}/social/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId,
          content: trimmedContent,
          imageBase64,
          publishAt: scheduleEnabled ? publishAt.trim() : "",
        }),
      });

      const json = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to save post");

      setContent("");
      setImageBase64("");
      setScheduleEnabled(false);
      setPublishAt("");
      Alert.alert("Success", json.message || "Post saved successfully");
      await loadPosts();
    } catch (error) {
      console.error("Create social post error:", error);
      Alert.alert("Save Failed", error instanceof Error ? error.message : "Unable to save post");
    } finally {
      setSubmittingPost(false);
    }
  };

  const submitReply = async (commentId: number) => {
    const reply = (replyDrafts[commentId] || "").trim();
    if (!reply) { Alert.alert("Reply Required", "Please enter a reply"); return; }

    try {
      setReplyingCommentId(commentId);
      const adminId = await AsyncStorage.getItem("admin_id");
      if (!adminId) { router.replace("/login"); return; }

      const response = await fetch(`${API_BASE}/social/comments/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, reply }),
      });

      const json = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to save reply");

      setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
      await loadPosts(true);
    } catch (error) {
      console.error("Reply to social comment error:", error);
      Alert.alert("Reply Failed", error instanceof Error ? error.message : "Unable to save reply");
    } finally {
      setReplyingCommentId(null);
    }
  };

  const deletePost = async (postId: number) => {
    try {
      const adminId = await AsyncStorage.getItem("admin_id");
      if (!adminId) { router.replace("/login"); return; }

      setDeletingPostId(postId);

      const response = await fetch(`${API_BASE}/social/posts/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      const json = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to delete post");

      await loadPosts(true);
    } catch (error) {
      console.error("Delete social post error:", error);
      Alert.alert("Delete Failed", error instanceof Error ? error.message : "Unable to delete post");
    } finally {
      setDeletingPostId(null);
    }
  };

  const confirmDeletePost = (postId: number) => {
    Alert.alert("Delete Post", "Do you want to delete this post and all its comments?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deletePost(postId) },
    ]);
  };

  const deleteComment = async (commentId: number) => {
    try {
      const adminId = await AsyncStorage.getItem("admin_id");
      if (!adminId) { router.replace("/login"); return; }

      setDeletingCommentId(commentId);

      const response = await fetch(`${API_BASE}/social/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      const json = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to delete comment");

      await loadPosts(true);
    } catch (error) {
      console.error("Delete social comment error:", error);
      Alert.alert("Delete Failed", error instanceof Error ? error.message : "Unable to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const confirmDeleteComment = (commentId: number) => {
    Alert.alert("Delete Comment", "Do you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteComment(commentId) },
    ]);
  };

  const deleteReply = async (commentId: number) => {
    try {
      const adminId = await AsyncStorage.getItem("admin_id");
      if (!adminId) { router.replace("/login"); return; }

      setDeletingReplyId(commentId);
      const response = await fetch(`${API_BASE}/social/comments/${commentId}/reply`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      const json = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Unable to delete admin reply");
      }

      setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
      await loadPosts(true);
    } catch (error) {
      console.error("Delete social admin reply error:", error);
      Alert.alert("Delete Failed", error instanceof Error ? error.message : "Unable to delete admin reply");
    } finally {
      setDeletingReplyId(null);
    }
  };

  const confirmDeleteReply = (commentId: number) => {
    Alert.alert("Delete Admin Reply", "Do you want to remove this reply from the database?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteReply(commentId) },
    ]);
  };

  const getDateKey = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizedDateFilter = dateFilter.trim();
  const filteredPosts = normalizedDateFilter
    ? posts.filter((post) => getDateKey(post.publishAt) === normalizedDateFilter)
    : posts;

  const latestComments = posts
    .flatMap((post) => (post.comments || []).map((comment) => ({ comment, post })))
    .sort((a, b) => {
      const first = new Date(a.comment.createdAt).getTime();
      const second = new Date(b.comment.createdAt).getTime();
      return (Number.isNaN(second) ? 0 : second) - (Number.isNaN(first) ? 0 : first);
    });

  const openLatestComments = async () => {
    setShowLatestComments(true);
    setLatestCommentsLoading(true);
    try {
      await loadPosts(true);
    } finally {
      setLatestCommentsLoading(false);
    }
  };

  // ── Status helpers ──────────────────────────────────────────────────────────
  const statusConfig = {
    published: { bg: "#DCFCE7", text: "#15803D", dot: "#22C55E", label: "Published" },
    scheduled:  { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B", label: "Scheduled" },
    inactive:   { bg: "#F1F5F9", text: "#475569", dot: "#94A3B8", label: "Inactive" },
  } as const;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            {showLatestComments ? "Latest Comments" : "Social Posts"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {showLatestComments ? "Review and reply to recent comments" : "Publish now or schedule future posts"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.latestCommentsButton}
          onPress={() => {
            if (showLatestComments) {
              setShowLatestComments(false);
            } else {
              void openLatestComments();
            }
          }}
        >
          <Feather
            name={showLatestComments ? "arrow-left" : "message-square"}
            size={16}
            color="#7C3AED"
          />
          <Text style={styles.latestCommentsButtonText}>
            {showLatestComments ? "Posts" : "Latest comments"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshIconButton}
          onPress={() => void loadPosts(true)}
        >
          <Feather name="refresh-cw" size={18} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPosts(true)}
            colors={["#7C3AED"]}
            tintColor="#7C3AED"
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Compose Card ── */}
        {showLatestComments ? (
          <View style={styles.latestCommentsSection}>
            <View style={styles.latestCommentsIntro}>
              <Text style={styles.latestCommentsTitle}>Latest comments</Text>
              <Text style={styles.latestCommentsSubtitle}>
                {latestComments.length} comment{latestComments.length === 1 ? "" : "s"}, newest first
              </Text>
            </View>
            {latestCommentsLoading ? (
              <View style={styles.latestCommentsLoading}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.latestCommentsLoadingText}>Loading latest comments...</Text>
              </View>
            ) : latestComments.length ? latestComments.map(({ comment, post }) => (
              <View key={comment.id} style={styles.latestCommentCard}>
                <View style={styles.latestCommentHeader}>
                  <View style={styles.commentAvatarWrap}>
                    <Text style={styles.commentAvatarText}>{comment.userName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentTopText}>
                    <Text style={styles.commentName}>{comment.userName}</Text>
                    <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteCommentButton}
                    onPress={() => confirmDeleteComment(comment.id)}
                    disabled={deletingCommentId === comment.id}
                  >
                    {deletingCommentId === comment.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Feather name="trash-2" size={13} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.latestCommentText}>{comment.comment}</Text>
                <View style={styles.originalPostPreview}>
                  <Text style={styles.originalPostLabel}>Original post</Text>
                  <Text style={styles.originalPostText} numberOfLines={2}>{post.content || "Image post"}</Text>
                </View>
                {comment.adminReply ? (
                  <View style={styles.replyCard}>
                    <View style={styles.replyHeaderRow}>
                      <Text style={styles.replyName}>Admin reply</Text>
                      <TouchableOpacity
                        style={styles.deleteReplyButton}
                        onPress={() => confirmDeleteReply(comment.id)}
                        disabled={deletingReplyId === comment.id}
                      >
                        {deletingReplyId === comment.id ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Feather name="trash-2" size={13} color="#DC2626" />
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.replyText}>{comment.adminReply}</Text>
                  </View>
                ) : null}
                <TextInput
                  value={replyDrafts[comment.id] || ""}
                  onChangeText={(value) => setReplyDrafts((current) => ({ ...current, [comment.id]: value }))}
                  placeholder={comment.adminReply ? "Edit reply..." : "Reply to this comment..."}
                  placeholderTextColor="#94A3B8"
                  style={styles.replyInput}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.latestCommentActions}>
                  <TouchableOpacity
                    style={styles.originalPostButton}
                    onPress={() => {
                      setShowLatestComments(false);
                      setExpandedComments((current) => ({ ...current, [post.id]: true }));
                    }}
                  >
                    <Feather name="external-link" size={13} color="#6D28D9" />
                    <Text style={styles.originalPostButtonText}>View original post</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.replyButton, replyingCommentId === comment.id && styles.buttonDisabled]}
                    onPress={() => void submitReply(comment.id)}
                    disabled={replyingCommentId === comment.id}
                  >
                    {replyingCommentId === comment.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="send" size={13} color="#FFFFFF" />
                        <Text style={styles.replyButtonText}>Reply</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Feather name="message-circle" size={28} color="#C4B5FD" />
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>New comments will appear here.</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={[styles.composeCard, showLatestComments && styles.hidden]}>
          <View style={styles.composeCardHeader}>
            <View style={styles.composeTitleRow}>
              <View style={styles.composeDot} />
              <Text style={styles.cardTitle}>Create Post</Text>
            </View>
          </View>

          <TextInput
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="Share something with your community…"
            placeholderTextColor="#94A3B8"
            style={styles.postInput}
            textAlignVertical="top"
            maxLength={5000}
          />

          {imageBase64 ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: getImageUri(imageBase64) }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageOverlay}
                onPress={() => setImageBase64("")}
              >
                <Feather name="x" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.composeActionsRow}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={() => void pickImage()}>
              <Feather name="image" size={16} color="#7C3AED" />
              <Text style={styles.imagePickerText}>
                {imageBase64 ? "Change" : "Add Image"}
              </Text>
            </TouchableOpacity>

            <View style={styles.scheduleToggleRow}>
              <Text style={styles.scheduleToggleLabel}>Schedule</Text>
              <Switch
                value={scheduleEnabled}
                onValueChange={setScheduleEnabled}
                trackColor={{ false: "#E2E8F0", true: "#C4B5FD" }}
                thumbColor={scheduleEnabled ? "#7C3AED" : "#CBD5E1"}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
            </View>
          </View>

          {scheduleEnabled ? (
            <DateTimePickerField value={publishAt} onChange={setPublishAt} />
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, submittingPost && styles.buttonDisabled]}
            onPress={() => void submitPost()}
            disabled={submittingPost}
            activeOpacity={0.85}
          >
            {submittingPost ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather
                  name={scheduleEnabled ? "clock" : "send"}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  {scheduleEnabled ? "Schedule Post" : "Publish Now"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Feed ── */}
        <View style={[styles.feedSection, showLatestComments && styles.hidden]}>
          <View style={styles.filterHeader}>
            <Text style={styles.cardTitle}>All Posts</Text>
            <DateFilterField value={dateFilter} onChange={setDateFilter} />
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loaderText}>Loading posts…</Text>
            </View>
          ) : filteredPosts.length ? (
            filteredPosts.map((post) => {
              const isExpanded = Boolean(expandedComments[post.id]);
              const visibleComments = isExpanded ? post.comments : [];
              const cfg = statusConfig[post.status] ?? statusConfig.inactive;

              return (
                <View key={post.id} style={styles.postCard}>
                  {/* Top row */}
                  <View style={styles.postTopRow}>
                    <View style={styles.postAvatarWrap}>
                      <Text style={styles.postAvatarText}>
                        {post.authorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.postMeta}>
                      <Text style={styles.postAuthor}>{post.authorName}</Text>
                      <Text style={styles.postDate}>
                        {formatDate(post.publishAt)}
                      </Text>
                    </View>
                    <View style={styles.postActionsTop}>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                        <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteIconButton}
                        onPress={() => confirmDeletePost(post.id)}
                        disabled={deletingPostId === post.id}
                      >
                        {deletingPostId === post.id ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Feather name="trash-2" size={15} color="#DC2626" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {post.content ? (
                    <Text style={styles.postContent}>{post.content}</Text>
                  ) : null}

                  {post.imageBase64 ? (
                    <Image
                      source={{ uri: getImageUri(post.imageBase64) }}
                      style={styles.postImage}
                    />
                  ) : null}

                  {/* Comment count strip */}
                  <View style={styles.commentStripRow}>
                    <Feather name="message-circle" size={14} color="#64748B" />
                    <Text style={styles.commentCount}>
                      {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                    </Text>
                  </View>

                  {/* Comments */}
                  {visibleComments.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentTopRow}>
                        <View style={styles.commentAvatarWrap}>
                          <Text style={styles.commentAvatarText}>
                            {comment.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.commentTopText}>
                          <Text style={styles.commentName}>{comment.userName}</Text>
                          <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteCommentButton}
                          onPress={() => confirmDeleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id}
                        >
                          {deletingCommentId === comment.id ? (
                            <ActivityIndicator size="small" color="#DC2626" />
                          ) : (
                            <Feather name="trash-2" size={13} color="#DC2626" />
                          )}
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.commentText}>{comment.comment}</Text>

                      {comment.adminReply ? (
                        <View style={styles.replyCard}>
                          <View style={styles.replyHeaderRow}>
                            <Feather name="corner-down-right" size={12} color="#7C3AED" />
                            <Text style={styles.replyName}>
                              {comment.adminReplyName || "Bhabisya Katha"}
                            </Text>
                            <Text style={styles.replyDate}>
                              · {formatDate(comment.adminReplyAt)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteReplyButton}
                            onPress={() => confirmDeleteReply(comment.id)}
                            disabled={deletingReplyId === comment.id}
                          >
                            {deletingReplyId === comment.id ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Feather name="trash-2" size={13} color="#DC2626" />
                            )}
                          </TouchableOpacity>
                          <Text style={styles.replyText}>{comment.adminReply}</Text>
                        </View>
                      ) : null}

                      <TextInput
                        value={replyDrafts[comment.id] || ""}
                        onChangeText={(value) =>
                          setReplyDrafts((current) => ({ ...current, [comment.id]: value }))
                        }
                        placeholder="Reply as Bhabisya Katha…"
                        placeholderTextColor="#94A3B8"
                        style={styles.replyInput}
                        multiline
                        textAlignVertical="top"
                      />

                      <TouchableOpacity
                        style={[
                          styles.replyButton,
                          replyingCommentId === comment.id && styles.buttonDisabled,
                        ]}
                        onPress={() => void submitReply(comment.id)}
                        disabled={replyingCommentId === comment.id}
                        activeOpacity={0.85}
                      >
                        {replyingCommentId === comment.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Feather name="send" size={13} color="#FFFFFF" />
                            <Text style={styles.replyButtonText}>Send Reply</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}

                  {post.commentCount === 0 && (
                    <Text style={styles.emptyComments}>No comments yet</Text>
                  )}

                  {post.commentCount > 0 ? (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() =>
                        setExpandedComments((current) => ({
                          ...current,
                          [post.id]: !isExpanded,
                        }))
                      }
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color="#7C3AED"
                      />
                      <Text style={styles.viewAllButtonText}>
                        {isExpanded
                          ? "Hide comments"
                          : `View ${post.commentCount} comment${post.commentCount === 1 ? "" : "s"}`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Feather name="inbox" size={28} color="#C4B5FD" />
              </View>
              <Text style={styles.emptyTitle}>
                {dateFilter ? "No posts on this date" : "No posts yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {dateFilter
                  ? "Try another date or clear the filter."
                  : "Create the first post to start the feed."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  latestCommentsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
  },
  latestCommentsButtonText: {
    color: "#6D28D9",
    fontSize: 11,
    fontWeight: "800",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 12,
    color: "#94A3B8",
  },

  // Scroll content
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },

  // Compose card
  composeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  composeCardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  composeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    minWidth: 0,
  },
  composeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7C3AED",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  postInput: {
    minHeight: 110,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FAFBFF",
    lineHeight: 22,
  },

  // Image preview
  previewWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  removeImageOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Compose bottom row
  composeActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    flexShrink: 1,
  },
  imagePickerText: {
    color: "#6D28D9",
    fontWeight: "700",
    fontSize: 13,
  },
  scheduleToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  scheduleToggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },

  // DateTime picker field
  dtPickerWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FAFBFF",
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
  },
  dtLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dtRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dtButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  dtButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B21B6",
  },
  dtPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dtPreviewText: {
    fontSize: 12,
    color: "#6D28D9",
    fontWeight: "600",
  },

  // Primary button
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    marginTop: 14,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.65,
  },

  // Feed section
  hidden: {
    display: "none",
  },
  latestCommentsSection: {
    gap: 12,
  },
  latestCommentsIntro: {
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  latestCommentsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4C1D95",
  },
  latestCommentsSubtitle: {
    marginTop: 4,
    color: "#7C3AED",
    fontSize: 13,
  },
  latestCommentsLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  latestCommentsLoadingText: {
    color: "#6D28D9",
    fontSize: 14,
    fontWeight: "700",
  },
  latestCommentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  latestCommentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  latestCommentText: {
    marginTop: 12,
    color: "#1E293B",
    fontSize: 15,
    lineHeight: 22,
  },
  originalPostPreview: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#A78BFA",
  },
  originalPostLabel: {
    color: "#6D28D9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  originalPostText: {
    marginTop: 3,
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  latestCommentActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
  },
  originalPostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
  },
  originalPostButtonText: {
    color: "#6D28D9",
    fontSize: 12,
    fontWeight: "700",
  },
  feedSection: {
    gap: 12,
  },
  filterHeader: {
    gap: 10,
  },

  // Date filter
  filterDateWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  filterDateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  filterDateButtonActive: {
    borderColor: "#C4B5FD",
    backgroundColor: "#F5F3FF",
  },
  filterDateText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  filterDateTextActive: {
    color: "#6D28D9",
  },
  clearFilterButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Loader
  loaderWrap: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Post card
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  postTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  postAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7C3AED",
  },
  postActionsTop: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 1,
  },
  postMeta: {
    flex: 1,
    minWidth: 0,
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  postDate: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  deleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  postContent: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: "#1E293B",
  },
  postImage: {
    marginTop: 14,
    width: "100%",
    height: 240,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  commentStripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  commentCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },

  // Comment card
  commentCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  commentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4338CA",
  },
  commentTopText: {
    flex: 1,
    minWidth: 0,
  },
  commentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  commentDate: {
    marginTop: 1,
    fontSize: 11,
    color: "#94A3B8",
  },
  commentText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },
  deleteCommentButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  // Reply card
  replyCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    borderLeftWidth: 3,
    borderLeftColor: "#7C3AED",
  },
  replyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  replyName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5B21B6",
  },
  replyDate: {
    fontSize: 11,
    color: "#7C3AED",
  },
  replyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#4C1D95",
  },

  // Reply input
  replyInput: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    minHeight: 68,
    fontSize: 14,
  },
  replyButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#6D28D9",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: "#6D28D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  replyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  deleteReplyButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },

  // Misc
  emptyComments: {
    marginTop: 10,
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
  },
  viewAllButtonText: {
    color: "#7C3AED",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 19,
  },
});
