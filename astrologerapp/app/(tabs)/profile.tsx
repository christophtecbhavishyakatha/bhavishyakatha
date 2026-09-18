import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { LinearGradient } from 'expo-linear-gradient';

interface ProfileData {
  name: string;
  phone: string;
  profilePhoto: string | null;
  languages: string[];
  categories: string[];
  specializations: string[];
  experience?: string;
}

export default function AstrologerProfile() {
  const [loading, setLoading] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const API_BASE = "https://bhavishyakatha.in/express";

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        router.replace('/login');
        return;
      }
      setLoading(true);
      const res = await fetch(`${API_BASE}/astrologer/profile/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      console.log('Profile API response:', result);
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch profile');
      }
      const data = result.data;
      setProfileData({
        name: data.full_name,
        phone: data.phone,
        profilePhoto: data.profile_photo,
        languages: data.languages || [],
        categories: data.categories || [],
        specializations: data.specializations || [],
        experience: data.experience || "",
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem("user_id");
              if (userId) {
                await fetch("https://bhavishyakatha.in/express/astrologer/status/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: userId,
                    status: "offline",
                    audio: 0,
                    video: 0,
                    chat: 0,
                  }),
                });
              }
              await AsyncStorage.multiRemove([
                "user_id", "user_name", "user_phone", "user_photo",
                "user_languages", "user_categories", "user_specializations",
              ]);
              router.replace("/login");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleBankDetails = () => {
    router.replace('/bank-details');
  };

  const handleEditProfile = () => {
    router.push({
      pathname: "/login",
      params: { stepParam: "register", mode: "edit" },
    });
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <LinearGradient colors={['#1A0533', '#2D0A5E', '#1A0533']} style={styles.fullFlex}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingOrb}>
              <ActivityIndicator size="large" color="#F5C842" />
            </View>
            <Text style={styles.loadingText}>Reading the stars...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <LinearGradient colors={['#1A0533', '#2D0A5E', '#1A0533']} style={styles.fullFlex}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>✦ Failed to load profile ✦</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <LinearGradient colors={['#1A0533', '#2D0A5E', '#160430']} style={styles.fullFlex}>
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSub}>✦ ASTROLOGER PORTAL ✦</Text>
              <Text style={styles.headerTitle}>My Profile</Text>
            </View>
            <View style={styles.headerOrb} />
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            {/* Decorative top bar */}
            <LinearGradient
              colors={['#F5C842', '#E8A020', '#F5C842']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.cardTopBar}
            />

            {/* Photo */}
            <View style={styles.photoWrapper}>
              <View style={styles.photoRing}>
                {profileData.profilePhoto ? (
                  <Image source={{ uri: profileData.profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>
                      {profileData.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <TouchableOpacity style={styles.editPhotoButton} onPress={handleEditProfile}>
                <Text style={styles.editPhotoIcon}>✏️</Text>
              </TouchableOpacity>
            </View>

            {/* Name & Info */}
            <Text style={styles.profileName}>{profileData.name}</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>📱 +91 {profileData.phone}</Text>
              </View>
            </View>

            {profileData.experience ? (
              <View style={styles.experienceBadge}>
                <Text style={styles.experienceIcon}>⭐</Text>
                <Text style={styles.experienceText}>
                  {profileData.experience} Years of Experience
                </Text>
              </View>
            ) : null}

            {/* Edit Button */}
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.editButtonGradient}
              >
                <Text style={styles.editButtonText}>✦ Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Details Section */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>✦ EXPERTISE ✦</Text>

            {profileData.languages.length > 0 && (
              <View style={styles.detailSection}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailDot}>◆</Text>
                  <Text style={styles.detailTitle}>Languages Known</Text>
                </View>
                <View style={styles.tagContainer}>
                  {profileData.languages.map((lang: string) => (
                    <View key={lang} style={styles.tag}>
                      <Text style={styles.tagText}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profileData.categories.length > 0 && (
              <View style={styles.detailSection}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailDot}>◆</Text>
                  <Text style={styles.detailTitle}>Categories</Text>
                </View>
                <View style={styles.tagContainer}>
                  {profileData.categories.map((cat: string) => (
                    <View key={cat} style={styles.tag}>
                      <Text style={styles.tagText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profileData.specializations.length > 0 && (
              <View style={styles.detailSection}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailDot}>◆</Text>
                  <Text style={styles.detailTitle}>Specializations</Text>
                </View>
                <View style={styles.tagContainer}>
                  {profileData.specializations.map((spec: string) => (
                    <View key={spec} style={styles.tag}>
                      <Text style={styles.tagText}>{spec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>


            <TouchableOpacity style={styles.actionButton} onPress={handleBankDetails} activeOpacity={0.85}>
              <LinearGradient
                colors={['#065F46', '#059669']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>🏦</Text>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>Bank Details</Text>
                  <Text style={styles.actionSub}>Manage payment info</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>


   <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/feedback')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#eb7f3b', '#0669d9']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>Client Feedback</Text>
                  <Text style={styles.actionSub}>See all feedback</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>

            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/support')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#92400E', '#D97706']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>🎫</Text>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>Raise Ticket</Text>
                  <Text style={styles.actionSub}>Get support help</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/QuickMessage')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#815d46', '#be7e33']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>⚡</Text>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>Quick Message</Text>
                  <Text style={styles.actionSub}>Manage quick message</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleLogout} activeOpacity={0.85}>
              <LinearGradient
                colors={['#7F1D1D', '#DC2626']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionIcon}>🚪</Text>
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>Logout</Text>
                  <Text style={styles.actionSub}>Sign out of account</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>✦ ✦ ✦</Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A0533',
  },
  fullFlex: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderWidth: 1,
    borderColor: '#F5C842',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#C4A7E7',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 16,
    color: '#F87171',
    marginBottom: 20,
    letterSpacing: 1,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    gap: 12,
  },
  headerSub: {
    fontSize: 10,
    color: '#F5C842',
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F3F0FF',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  headerOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245,200,66,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,200,66,0.4)',
  },

  // Profile Card
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.2)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardTopBar: {
    height: 3,
    width: '120%',
    marginBottom: 28,
    alignSelf: 'stretch',
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 18,
  },
  photoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: '#F5C842',
    padding: 3,
    shadowColor: '#F5C842',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 42,
    color: '#fff',
    fontWeight: '800',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2D0A5E',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F5C842',
  },
  editPhotoIcon: {
    fontSize: 13,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F0FF',
    marginBottom: 12,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  infoBadge: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    maxWidth: '100%',
  },
  infoBadgeText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,200,66,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    marginBottom: 20,
    marginTop: 4,
    maxWidth: '100%',
  },
  experienceIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  experienceText: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  editButton: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '70%',
    minWidth: 180,
    maxWidth: '100%',
  },
  editButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Details Card
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    marginBottom: 16,
  },
  detailsCardTitle: {
    fontSize: 11,
    color: '#F5C842',
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 18,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailDot: {
    color: '#7C3AED',
    fontSize: 10,
    marginRight: 8,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C4B5FD',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
  },
  tagText: {
    color: '#DDD6FE',
    fontSize: 13,
    fontWeight: '500',
  },

  // Action Buttons
  actionContainer: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  actionChevron: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 26,
    fontWeight: '300',
  },

  // Footer
  footer: {
    textAlign: 'center',
    color: 'rgba(245,200,66,0.4)',
    fontSize: 16,
    letterSpacing: 8,
    marginTop: 8,
  },
});
