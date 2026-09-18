import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

const API_BASE = "https://bhavishyakatha.in/express";
const PHOTO_API = `${API_BASE}/api/astrologer/photos`;

type PhotoItem = {
  id: number | string;
  astrologer_id: string;
  image_path: string;
  image_url: string;
  original_name: string;
  file_size: number;
  created_at: string;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFileExtension = (asset: ImagePicker.ImagePickerAsset) => {
  const name = asset.fileName || asset.uri.split("/").pop() || "";
  const nameParts = name.split(".");
  if (nameParts.length > 1) {
    return nameParts[nameParts.length - 1].toLowerCase();
  }

  if (asset.mimeType === "image/png") return "png";
  if (asset.mimeType === "image/webp") return "webp";
  return "jpg";
};

const uriToBlob = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error("Could not read selected image."));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send();
  });

export default function PhotosScreen() {
  const [userId, setUserId] = useState<string>("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const loadPhotos = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const storedUserId = await AsyncStorage.getItem("user_id");
      if (!storedUserId) {
        setPhotos([]);
        setUserId("");
        return;
      }

      setUserId(storedUserId);

      const response = await fetch(
        `${PHOTO_API}/astrologer/${encodeURIComponent(storedUserId)}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load photos.");
      }

      setPhotos(result.data || []);
    } catch (error) {
      console.error("Load photos error:", error);
      Alert.alert("Error", "Could not load astrologer photos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPhotos(true);
    }, [loadPhotos])
  );

  const pickAndUploadPhoto = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (pickerResult.canceled || !pickerResult.assets.length) {
        return;
      }

      const selectedAsset = pickerResult.assets[0];
      const activeUserId = userId || (await AsyncStorage.getItem("user_id")) || "";

      if (!activeUserId) {
        Alert.alert("Session Missing", "Please login again and retry.");
        return;
      }

      setUploading(true);

      const extension = getFileExtension(selectedAsset);
      const uploadName =
        selectedAsset.fileName ||
        `astrologer-photo-${Date.now()}.${extension}`;
      const blob = await uriToBlob(selectedAsset.uri);

      const response = await fetch(
        `${PHOTO_API}/upload?astrologer_id=${encodeURIComponent(activeUserId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": selectedAsset.mimeType || "image/jpeg",
            "x-file-name": encodeURIComponent(uploadName),
          },
          body: blob,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Upload failed.");
      }

      await loadPhotos(true);
      Alert.alert("Uploaded", "Photo uploaded successfully.");
    } catch (error) {
      console.error("Upload photo error:", error);
      Alert.alert("Upload Failed", "Could not upload this photo.");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photo: PhotoItem) => {
    try {
      const activeUserId = userId || (await AsyncStorage.getItem("user_id")) || "";
      if (!activeUserId) {
        Alert.alert("Session Missing", "Please login again and retry.");
        return;
      }

      setDeletingId(photo.id);

      const response = await fetch(
        `${PHOTO_API}/${encodeURIComponent(String(photo.id))}?astrologer_id=${encodeURIComponent(
          activeUserId
        )}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed.");
      }

      setPhotos((currentPhotos) =>
        currentPhotos.filter((item) => item.id !== photo.id)
      );
      Alert.alert("Deleted", "Photo removed successfully.");
    } catch (error) {
      console.error("Delete photo error:", error);
      Alert.alert("Delete Failed", "Could not delete this photo.");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (photo: PhotoItem) => {
    Alert.alert(
      "Delete Photo",
      "This photo will be removed from the astrologer gallery.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePhoto(photo),
        },
      ]
    );
  };

  const renderPhotoCard = ({ item }: { item: PhotoItem }) => {
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.image_url }} style={styles.photo} />

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.original_name || "Astrologer photo"}
          </Text>
          <Text style={styles.cardMeta}>{formatFileSize(item.file_size)}</Text>
          <Text style={styles.cardMeta}>{formatDate(item.created_at)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
          onPress={() => confirmDelete(item)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading photo manager...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>PHOTO MANAGER</Text>
        <Text style={styles.title}>Manage  Photos</Text>
        <Text style={styles.subtitle}>
          Upload  photos from your device and remove old ones anytime.
        </Text>

        <View style={styles.headerFooter}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Total Photos</Text>
            <Text style={styles.statValue}>{photos.length}</Text>
          </View>

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={pickAndUploadPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={photos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPhotoCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPhotos(false)}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No photos uploaded yet</Text>
            <Text style={styles.emptyText}>
              Add the first astrologer photo to start building the gallery.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ECF3FF",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#ECF3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#37517E",
  },
  headerCard: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#102A43",
    shadowColor: "#102A43",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
    color: "#9FB3C8",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F0F4F8",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#BCCCDC",
  },
  headerFooter: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statPill: {
    backgroundColor: "#243B53",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#9FB3C8",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
    color: "#F0F4F8",
  },
  uploadButton: {
    backgroundColor: "#F9703E",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 132,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  photo: {
    width: "100%",
    height: 220,
    backgroundColor: "#D9E2EC",
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 13,
    color: "#486581",
    marginBottom: 4,
  },
  deleteButton: {
    margin: 16,
    marginTop: 14,
    backgroundColor: "#D64545",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#486581",
  },
});
