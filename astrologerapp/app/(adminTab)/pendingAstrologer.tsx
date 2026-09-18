import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  TextInput, Linking,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
const API = 'https://bhavishyakatha.in/express/api/admin';
const COMMISSION_OPTIONS = [30, 35, 40, 45, 50];

const parseAmount = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateCommissionAmount = (totalCharge: string, commissionPercent: string) => {
  return (parseAmount(totalCharge) * parseAmount(commissionPercent)) / 100;
};

const calculateAstrologerCharge = (totalCharge: string, commissionPercent: string) => {
  return Math.max(0, parseAmount(totalCharge) - calculateCommissionAmount(totalCharge, commissionPercent));
};

export default function PendingAstrologers() {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Charges and rank state
  const [rank, setRank] = useState('4');
  const [displayName, setDisplayName] = useState('');
  const [experience, setExperience] = useState('');
  const [audioTotalCharge, setAudioTotalCharge] = useState('20');
  const [audioCommission, setAudioCommission] = useState('30');
  const [videoTotalCharge, setVideoTotalCharge] = useState('30');
  const [videoCommission, setVideoCommission] = useState('30');
  const [chatTotalCharge, setChatTotalCharge] = useState('10');
  const [chatCommission, setChatCommission] = useState('30');

useFocusEffect(
  useCallback(() => {
    load();
  }, [])
);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/pending`);
      const json = await res.json();
      console.log("Pending astrologers response:", json);
      setList(json.data || []);
    } catch (error) {
      console.error("Error loading astrologers:", error);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleVerify = async () => {
    if (!selected) return;
    
    // Validate inputs
    if (!rank || parseFloat(rank) < 0 || parseFloat(rank) > 5) {
      alert('Please enter a valid rank between 0 and 5');
      return;
    }
    
    if (!displayName.trim()) {
      alert('Please enter a display name for the astrologer');
      return;
    }
    
    if (!experience || parseFloat(experience) < 0) {
      alert('Please enter valid experience (years)');
      return;
    }
    if (!audioTotalCharge || parseFloat(audioTotalCharge) < 0) {
      alert('Please enter valid audio total charge');
      return;
    }
    if (!audioCommission || parseFloat(audioCommission) < 0 || parseFloat(audioCommission) > 100) {
      alert('Please enter a valid audio commission percentage (0-100)');
      return;
    }
    if (!videoTotalCharge || parseFloat(videoTotalCharge) < 0) {
      alert('Please enter valid video total charge');
      return;
    }
    if (!videoCommission || parseFloat(videoCommission) < 0 || parseFloat(videoCommission) > 100) {
      alert('Please enter a valid video commission percentage (0-100)');
      return;
    }
    if (!chatTotalCharge || parseFloat(chatTotalCharge) < 0) {
      alert('Please enter valid chat total charge');
      return;
    }
    if (!chatCommission || parseFloat(chatCommission) < 0 || parseFloat(chatCommission) > 100) {
      alert('Please enter a valid chat commission percentage (0-100)');
      return;
    }
    try {
      setVerifying(true);
      const res = await fetch(`${API}/verify/${selected.astrologer_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank: parseFloat(rank),
          dp_name: displayName.trim(),
          experience: parseFloat(experience),
          audio_total_charge: parseAmount(audioTotalCharge),
          audio_commission_percent: parseAmount(audioCommission),
          audio_platform_fee: calculateCommissionAmount(audioTotalCharge, audioCommission),
          audio_call_rate: calculateAstrologerCharge(audioTotalCharge, audioCommission),
          video_total_charge: parseAmount(videoTotalCharge),
          video_commission_percent: parseAmount(videoCommission),
          video_platform_fee: calculateCommissionAmount(videoTotalCharge, videoCommission),
          video_call_rate: calculateAstrologerCharge(videoTotalCharge, videoCommission),
          chat_total_charge: parseAmount(chatTotalCharge),
          chat_commission_percent: parseAmount(chatCommission),
          chat_platform_fee: calculateCommissionAmount(chatTotalCharge, chatCommission),
          chat_rate: calculateAstrologerCharge(chatTotalCharge, chatCommission),
        }),
      });
      
      if (res.ok) {
        setList(prev => prev.filter(item => item.astrologer_id !== selected.astrologer_id));
        setSelected(null);
        resetCharges();
        alert('Astrologer verified successfully!');
        load();
      } else {
        alert('Failed to verify astrologer');
      }
    } catch (error) {
      console.error("Error verifying astrologer:", error);
      alert('Failed to verify astrologer');
    } finally {
      setVerifying(false);
    }
  };

  const resetCharges = () => {
    setRank('4');
    setDisplayName('');
    setExperience('');
    setAudioTotalCharge('20');
    setAudioCommission('30');
    setVideoTotalCharge('30');
    setVideoCommission('30');
    setChatTotalCharge('10');
    setChatCommission('30');
  };

  // Helper functions
  const safeArray = (arr: any) => {
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'string') {
      try {
        const parsed = JSON.parse(arr);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const safeString = (str: any) => str || 'N/A';
  
  const renderStars = (rank: number) => {
    const fullStars = Math.floor(rank);
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
      stars += ',';
    }
    
    return stars || 'N/A';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading pending astrologers...</Text>
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}></Text>
        <Text style={styles.emptyTitle}>No Pending Astrologers</Text>
        <Text style={styles.emptySubtitle}>
          All astrologers have been verified
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top','bottom']}>    
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Pending Verifications ({list.length})</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh pending astrologers" onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>
        
        {list.map((item, index) => {
          const categories = safeArray(item.categories);
          const fullName = safeString(item.full_name);
          const experienceValue = safeString(item.experience);
          const profilePhoto = item.profile_photo;
          
          return (
            <View key={item.astrologer_id || index} style={styles.card}>
              <View style={styles.cardContent}>
                {/* Profile Photo */}
                <View style={styles.photoContainer}>
                  {profilePhoto ? (
                    <Image 
                      source={{ uri: profilePhoto }} 
                      style={styles.profilePhoto}
                    />
                  ) : (
                    <View style={styles.placeholderPhoto}>
                      <Text style={styles.placeholderText}>
                        {fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.cardHeader}>
                    <View style={styles.nameSection}>
                      <Text style={styles.name}>{fullName}</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${item.phone_number}`)}
                      >
                        <Text style={styles.phone}>{item.phone_number}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Pending</Text>
                    </View>
                  </View>

                  <Text style={styles.experience}>
                    {experienceValue !== 'N/A' ? `${experienceValue} years experience` : 'Experience not specified'}
                  </Text>

                  {categories.length > 0 && (
                    <Text style={styles.categories}>
                      {categories.join(' , ')}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  setSelected(item);
                  
                  // Pre-fill with dp_name if exists, otherwise suggest using full_name
                  setDisplayName( item.full_name || '');
                  setExperience(item.experience ? String(item.experience) : '');
                  setRank('4');
                  setAudioTotalCharge('20');
                  setAudioCommission('30');
                  setVideoTotalCharge('30');
                  setVideoCommission('30');
                  setChatTotalCharge('10');
                  setChatCommission('30');
                }}
              >
                <Text style={styles.btnText}>View Details & Verify</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelected(null);
          resetCharges();
        }}
      >
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setSelected(null);
                  resetCharges();
                }}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Text style={styles.modalCloseText}>X</Text>
              </TouchableOpacity>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Profile Photo in Modal */}
                <View style={styles.modalPhotoSection}>
                  {selected.profile_photo ? (
                    <Image 
                      source={{ uri: selected.profile_photo }} 
                      style={styles.modalProfilePhoto}
                    />
                  ) : (
                    <View style={styles.modalPlaceholderPhoto}>
                      <Text style={styles.modalPlaceholderText}>
                        {safeString(selected.full_name).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalTitle}>Astrologer Profile</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  <DetailRow label="Full Name" value={safeString(selected.full_name)} />
                  <DetailRow label="Phone Number" value={safeString(selected.phone_number)} />
                  <DetailRow label="Profile Completed" value={selected.profile_completed ? 'Yes' : 'No'} />
                </View>

                {/* Editable Display Name - REQUIRED FIELD */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Set Display Name (Public Name) *</Text>
                  <Text style={styles.helpText}>
                    This name will be shown to users. It can be the same as full name or different.
                  </Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Display Name:</Text>
                    <TextInput
                      style={[styles.input, { marginRight: 0 }]}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Enter public display name"
                    />
                  </View>
                </View>

                {/* Editable Experience */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Set Experience *</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Years:</Text>
                    <TextInput
                      style={[styles.input, { marginRight: 0 }]}
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="decimal-pad"
                      placeholder="Enter years of experience"
                    />
                  </View>
                </View>

                {/* Rank Input */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Set Rank *</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Rank (0-5):</Text>
                    <TextInput
                      style={styles.input}
                      value={rank}
                      onChangeText={setRank}
                      keyboardType="decimal-pad"
                      placeholder="4.0"
                    />
                  </View>
                </View>

                {safeArray(selected.languages).length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Languages</Text>
                    <Text style={styles.detailText}>
                      {safeArray(selected.languages).join(', ')}
                    </Text>
                  </View>
                )}

                {safeArray(selected.categories).length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={styles.tagContainer}>
                      {safeArray(selected.categories).map((cat: string, idx: number) => (
                        <View key={idx} style={styles.tag}>
                          <Text style={styles.tagText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {safeArray(selected.specializations).length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Specializations</Text>
                    <View style={styles.tagContainer}>
                      {safeArray(selected.specializations).map((spec: string, idx: number) => (
                        <View key={idx} style={[styles.tag, styles.tagSpecial]}>
                          <Text style={styles.tagText}>{spec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Pricing Inputs */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Set Pricing *</Text>

                  {[{
                    icon: '📞',
                    label: 'Audio Call',
                    totalCharge: audioTotalCharge,
                    setTotalCharge: setAudioTotalCharge,
                    commission: audioCommission,
                    setCommission: setAudioCommission,
                  }, {
                    icon: '📹',
                    label: 'Video Call',
                    totalCharge: videoTotalCharge,
                    setTotalCharge: setVideoTotalCharge,
                    commission: videoCommission,
                    setCommission: setVideoCommission,
                  }, {
                    icon: '💬',
                    label: 'Chat',
                    totalCharge: chatTotalCharge,
                    setTotalCharge: setChatTotalCharge,
                    commission: chatCommission,
                    setCommission: setChatCommission,
                  }].map(({ icon, label, totalCharge, setTotalCharge, commission, setCommission }) => (
                    <View key={label} style={styles.priceInputSection}>
                      <Text style={styles.priceInputTitle}>{icon} {label}</Text>

                      <View style={styles.priceInputGroup}>
                        <Text style={styles.priceInputLabel}>Total Charge (₹)</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={totalCharge}
                          onChangeText={setTotalCharge}
                          keyboardType="decimal-pad"
                          placeholder="0"
                        />
                      </View>

                      <Text style={styles.priceInputLabel}>Commission %</Text>
                      <View style={styles.commissionRow}>
                        {COMMISSION_OPTIONS.map(option => (
                          <TouchableOpacity
                            key={`${label}-${option}`}
                            style={[
                              styles.commissionChip,
                              commission === String(option) && styles.commissionChipActive,
                            ]}
                            onPress={() => setCommission(String(option))}
                          >
                            <Text
                              style={[
                                styles.commissionChipText,
                                commission === String(option) && styles.commissionChipTextActive,
                              ]}
                            >
                              {option}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.commissionPreview}>
                        Platform fee: ₹{calculateCommissionAmount(totalCharge, commission).toFixed(2)}
                      </Text>
                      <Text style={styles.commissionPreview}>
                        Astrologer charge: ₹{calculateAstrologerCharge(totalCharge, commission).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() => {
                      setSelected(null);
                      resetCharges();
                    }}
                    disabled={verifying}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.verifyBtn]}
                  onPress={handleVerify}
                  disabled={verifying}
                >
                    {verifying ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnText}>Verify Astrologer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
    </>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  photoContainer: {
    marginRight: 0,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
  },
  placeholderPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  nameSection: {
    flex: 1,
    minWidth: 0,
  },
  name: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#111827',
    flexShrink: 1,
  },
  phone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  experience: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 1,
  },
  badgeText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
  categories: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    padding: 12,
    borderRadius: 8,
  },
  btnText: { 
    color: '#fff', 
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: { 
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: -18,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 5,
  },
  modalCloseText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalPhotoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalProfilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    borderWidth: 4,
    borderColor: '#7C3AED',
  },
  modalPlaceholderPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#5B21B6',
  },
  modalPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },

  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 120,
    maxWidth: '100%',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },

  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    width: 100,
    maxWidth: '100%',
  },
  input: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginRight: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagSpecial: {
    backgroundColor: '#DBEAFE',
  },
  tagText: {
    fontSize: 13,
    color: '#5B21B6',
    fontWeight: '500',
  },

  priceInputSection: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  priceInputTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  priceInputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priceInputGroup: {
    flex: 1,
    minWidth: 120,
  },
  priceInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  priceInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  commissionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  commissionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commissionChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  commissionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  commissionChipTextActive: {
    color: '#FFFFFF',
  },
  commissionPreview: {
    fontSize: 13,
    color: '#6B7280',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#DC2626',
  },
  verifyBtn: {
    backgroundColor: '#16A34A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: { padding: 8 },
  modalKeyboard: { flex: 1 },
});

