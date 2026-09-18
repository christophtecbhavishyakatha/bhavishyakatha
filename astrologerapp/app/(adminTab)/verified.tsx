import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  TextInput,
  Linking,
  Alert,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { SafeAreaView } from 'react-native-safe-area-context';

const API = 'https://bhavishyakatha.in/express/api/admin';

type StatusFilter = 'all' | 'active' | 'blocked';
type WalletSort = 'none' | 'low-high' | 'high-low';

export default function VerifiedAstrologers() {
  const [list, setList] = useState<any[]>([]);
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [rank, setRank] = useState('4');
  const [displayName, setDisplayName] = useState('');
  const [experience, setExperience] = useState('');
  const [audioCallRate, setAudioCallRate] = useState('20');
  const [audioPlatformFee, setAudioPlatformFee] = useState('5');
  const [videoCallRate, setVideoCallRate] = useState('30');
  const [videoPlatformFee, setVideoPlatformFee] = useState('7');
  const [chatRate, setChatRate] = useState('10');
  const [chatPlatformFee, setChatPlatformFee] = useState('2');
  const [isBlocked, setIsBlocked] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [walletSort, setWalletSort] = useState<WalletSort>('none');
const [totalAudio, setTotalAudio] = useState("30");
const [totalVideo, setTotalVideo] = useState("40");
const [totalChat, setTotalChat] = useState("20");

const [audioCommission, setAudioCommission] = useState("30");
const [videoCommission, setVideoCommission] = useState("30");
const [chatCommission, setChatCommission] = useState("30");
useFocusEffect(
  useCallback(() => {
    load();
  }, [])
);
  useEffect(() => {
    let data = [...list];
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        const fullName = (item.full_name || '').toLowerCase();
        const dpName = (item.dp_name || '').toLowerCase();
        const phone = (item.phone_number || '').toLowerCase();
        return fullName.includes(query) || dpName.includes(query) || phone.includes(query);
      });
    }
    if (statusFilter === 'active') data = data.filter(item => !item.blocked_by_admin);
    else if (statusFilter === 'blocked') data = data.filter(item => item.blocked_by_admin);

    if (walletSort === 'low-high') data.sort((a, b) => (a.wallet_balance || 0) - (b.wallet_balance || 0));
    else if (walletSort === 'high-low') data.sort((a, b) => (b.wallet_balance || 0) - (a.wallet_balance || 0));
    else data.sort((a, b) => b.astrologer_id - a.astrologer_id);

    setFilteredList(data);
  }, [searchQuery, statusFilter, walletSort, list]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/verified`);
      const json = await res.json();
console.log(json.data[0].category);
       setList(json.data || []);
      setFilteredList(json.data || []);
      setSelected(null);
    } catch (error) {
      setList([]);
      setFilteredList([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    if (!rank || parseFloat(rank) < 0 || parseFloat(rank) > 5) { alert('Please enter a valid rank between 0 and 5'); return; }
    if (!displayName.trim()) { alert('Please enter a display name'); return; }
    if (!experience || parseFloat(experience) < 0) { alert('Please enter valid experience (years)'); return; }
    try {
      setUpdating(true);
      const res = await fetch(`${API}/update/${selected.astrologer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank: parseFloat(rank),
          dp_name: displayName.trim(),
          experience: parseFloat(experience),
          audio_call_rate: parseFloat(audioCallRate),
          audio_platform_fee: parseFloat(audioPlatformFee),
          video_call_rate: parseFloat(videoCallRate),
          video_platform_fee: parseFloat(videoPlatformFee),
          chat_rate: parseFloat(chatRate),
          chat_platform_fee: parseFloat(chatPlatformFee),
          is_blocked: isBlocked,
          totalAudio: parseFloat(totalAudio),
          totalVideo: parseFloat(totalVideo),
          totalChat: parseFloat(totalChat),
          audioCommission: parseFloat(audioCommission),
          videoCommission: parseFloat(videoCommission),
          chatCommission: parseFloat(chatCommission),
        }),
      });
      if (res.ok) { alert('Astrologer updated successfully!'); setSelected(null); load(); }
      else alert('Failed to update astrologer');
    } catch { alert('Failed to update astrologer'); }
    finally { setUpdating(false); }
  };

  const handleBlockToggle = () => {
    if (!selected) return;
    const action = isBlocked ? 'unblock' : 'block';
    const name = selected.dp_name || selected.full_name || 'this astrologer';
    Alert.alert(
      `${action === 'block' ? 'Block' : 'Unblock'} Astrologer`,
      `Are you sure you want to ${action} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'block' ? 'Block' : 'Unblock',
          style: action === 'block' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setUpdating(true);
              const res = await fetch(`${API}/${action}/${selected.astrologer_id}`, { method: 'POST' });
              const json = await res.json();
              if (!json.status) { Alert.alert('Error', json.message || 'Action failed'); return; }
              Alert.alert('Success', json.message);
              load();
            } catch { Alert.alert('Error', 'Server error'); }
            finally { setUpdating(false); }
          },
        },
      ]
    );
  };

  const safeArray = (arr: any) => {
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'string') {
      try { const p = JSON.parse(arr); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  };

  const safeString = (str: any) => str || 'N/A';

  const renderStars = (rank: number) => {
    const full = Math.floor(rank);
    let stars = '';
    for (let i = 0; i < full; i++) stars += '⭐';
    return stars || '⭐';
  };

  const getInitialColor = (name: string) => {
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <View style={styles.loadingInner}>
          <View style={styles.loadingOrb} />
          <ActivityIndicator size="large" color="#6366F1" style={{ position: 'absolute' }} />
          <Text style={styles.loadingText}>Loading Astrologers</Text>
          <Text style={styles.loadingSubText}>Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.headerTitle}>Astrologers</Text>
            <Text style={styles.headerSubtitle}>
              {filteredList.length} of {list.length} verified
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>✦ Verified</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh verified astrologers" onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.statNumber, { color: '#6366F1' }]}>{list.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>
              {list.filter(i => !i.blocked_by_admin).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>
              {list.filter(i => i.blocked_by_admin).length}
            </Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Panel */}
        <View style={styles.filterPanel}>
          {/* Status */}
          <Text style={styles.filterGroupLabel}>Status</Text>
          <View style={styles.chipRow}>
            {(['all', 'active', 'blocked'] as StatusFilter[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, statusFilter === f && styles.chipActive]}
                onPress={() => setStatusFilter(f)}
              >
                <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>
                  {f === 'all' ? 'All' : f === 'active' ? '✓ Active' : '✕ Blocked'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dividerLine} />

          {/* Wallet Sort */}
          <Text style={styles.filterGroupLabel}>Wallet Balance</Text>
          <View style={styles.chipRow}>
            {(['none', 'low-high', 'high-low'] as WalletSort[]).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, walletSort === s && styles.chipActive]}
                onPress={() => setWalletSort(s)}
              >
                <Text style={[styles.chipText, walletSort === s && styles.chipTextActive]}>
                  {s === 'none' ? 'Default' : s === 'low-high' ? '↑ Low–High' : '↓ High–Low'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List */}
        {filteredList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔮</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Results Found' : 'No Verified Astrologers'}
            </Text>
            <Text style={styles.emptyDesc}>
              {searchQuery ? 'Try a different name or phone number' : 'No astrologers verified yet'}
            </Text>
          </View>
        ) : (
          filteredList.map((item, index) => {
            const categories = safeArray(item.categories);
            const fullName = safeString(item.full_name);
            const dpName = safeString(item.dp_name);
            const exp = safeString(item.experience);
            const blocked = item.blocked_by_admin || false;
            const initColor = getInitialColor(dpName);

            return (
              <View key={item.astrologer_id || index} style={[styles.card, blocked && styles.cardBlocked]}>
                {/* Blocked ribbon */}
                {blocked && <View style={styles.blockedRibbon}><Text style={styles.blockedRibbonText}>BLOCKED</Text></View>}

                <View style={styles.cardTop}>
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    {item.profile_photo ? (
                      <Image
                        source={{ uri: item.profile_photo }}
                        style={[styles.avatar, blocked && styles.avatarBlocked]}
                      />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: blocked ? '#9CA3AF' : initColor }]}>
                        <Text style={styles.avatarInitial}>
                          {dpName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.statusDot, blocked ? styles.statusDotBlocked : styles.statusDotActive]} />
                  </View>

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardDpName} numberOfLines={1}>{dpName}</Text>
                    <Text style={styles.cardFullName} numberOfLines={1}>{fullName}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone_number}`)}>
                      <Text style={styles.cardPhone}>📞 {item.phone_number}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }} >
<Text style={styles.category}>
  {item.category
    ? item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()
    : ""}
</Text>
{item.founding && (
  <Text style={styles.foundingText}>Founding</Text>
)}
</View>
                  {/* Wallet */}
                  <View style={styles.walletBubble}>
                    <Text style={styles.walletAmount}>₹{item.wallet_balance ?? 0}</Text>
                    <Text style={styles.walletLabel}>Wallet</Text>
                  </View>
                </View>

                {/* Meta Row */}
                <View style={styles.cardMeta}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>
                      {exp !== 'N/A' ? `${exp} yrs` : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaText}>{renderStars(item.rank || 4)} {item.rank || 4}</Text>
                  </View>
                  {categories.length > 0 && (
                    <View style={[styles.metaPill, { flex: 1 }]}>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {categories.join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => {
                    setSelected(item);
                    setDisplayName(item.dp_name || item.full_name || '');
                    setExperience(item.experience ? String(item.experience) : '');
                    setRank(item.rank ? String(item.rank) : '4');
                    setAudioCallRate(item.audio_call_rate ? String(item.audio_call_rate) : '20');
                    setAudioPlatformFee(item.audio_platform_fee ? String(item.audio_platform_fee) : '5');
                    setVideoCallRate(item.video_call_rate ? String(item.video_call_rate) : '30');
                    setVideoPlatformFee(item.video_platform_fee ? String(item.video_platform_fee) : '7');
                    setChatRate(item.chat_rate ? String(item.chat_rate) : '10');
                    setChatPlatformFee(item.chat_platform_fee ? String(item.chat_platform_fee) : '2');
                    setIsBlocked(item.blocked_by_admin || false);
                    setTotalAudio(String(item.totalAudio || 0));
setTotalVideo(String(item.totalVideo || 0));
setTotalChat(String(item.totalChat || 0));

setAudioCommission(String(item.audio_call_platform_commission || 30));
setVideoCommission(String(item.video_call_platform_commission || 30));
setChatCommission(String(item.chat_platform_commission || 30));
                  }}
                >
                  <Text style={styles.editBtnText}>View & Edit Details →</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── MODAL ─── */}
      <Modal visible={!!selected} animationType="slide" transparent>
        {selected && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {/* Drag handle */}
              <View style={styles.dragHandle} />

<TouchableOpacity
  style={styles.closeButton}
  onPress={() => setSelected(null)}
  disabled={updating}
>
  <Text style={styles.closeButtonText}>✕ </Text>
</TouchableOpacity>


              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboard}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatarWrap}>
                    {selected.profile_photo ? (
                      <Image source={{ uri: selected.profile_photo }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatarPlaceholder, { backgroundColor: getInitialColor(safeString(selected.full_name)) }]}>
                        <Text style={styles.modalAvatarInitial}>
                          {safeString(selected.full_name).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalName}>{safeString(selected.dp_name)}</Text>
                  <Text style={styles.modalSubName}>{safeString(selected.full_name)}</Text>
                </View>

                {/* Basic Info */}
                <View style={styles.infoCard}>
                  <InfoRow icon="🪪" label="Astrologer ID" value={String(selected.astrologer_id)} />
                  <InfoRow icon="📱" label="Phone" value={safeString(selected.phone_number)} last />
                </View>

                {/* Display Name */}
                <FieldSection label="Display Name (Public)">
                  <TextInput
                    style={styles.fieldInput}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Public display name"
                    placeholderTextColor="#9CA3AF"
                  />
                </FieldSection>

                {/* Experience */}
                <FieldSection label="Experience (Years)">
                  <TextInput
                    style={styles.fieldInput}
                    value={experience}
                    onChangeText={setExperience}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 5"
                    placeholderTextColor="#9CA3AF"
                  />
                </FieldSection>

                {/* Rank */}
                <FieldSection label="Rank (0 – 5)">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1 }]}
                      value={rank}
                      onChangeText={setRank}
                      keyboardType="decimal-pad"
                      placeholder="0.0 – 5.0"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.starPreview}>{renderStars(parseFloat(rank) || 4)}</Text>
                  </View>
                </FieldSection>

                {/* Tags */}
                {safeArray(selected.languages).length > 0 && (
                  <FieldSection label="Languages">
                    <Text style={styles.fieldText}>{safeArray(selected.languages).join(', ')}</Text>
                  </FieldSection>
                )}

                {safeArray(selected.categories).length > 0 && (
                  <FieldSection label="Categories">
                    <View style={styles.tagWrap}>
                      {safeArray(selected.categories).map((c: string, i: number) => (
                        <View key={i} style={styles.tagPill}><Text style={styles.tagPillText}>{c}</Text></View>
                      ))}
                    </View>
                  </FieldSection>
                )}

                {safeArray(selected.specializations).length > 0 && (
                  <FieldSection label="Specializations">
                    <View style={styles.tagWrap}>
                      {safeArray(selected.specializations).map((s: string, i: number) => (
                        <View key={i} style={[styles.tagPill, styles.tagPillBlue]}><Text style={[styles.tagPillText, { color: '#1D4ED8' }]}>{s}</Text></View>
                      ))}
                    </View>
                  </FieldSection>
                )}

                {/* ─── Pricing (upgraded UI, same logic) ─── */}
                <View style={styles.pricingHeaderRow}>
                  <View style={styles.pricingHeaderIconWrap}>
                    <Text style={styles.pricingHeaderIcon}>💰</Text>
                  </View>
                  <View>
                    <Text style={styles.pricingHeader}>Pricing & Commission</Text>
                    <Text style={styles.pricingSubheader}>Set total rate — split is calculated automatically</Text>
                  </View>
                </View>

                {[
                  {
                    icon: '📞', label: 'Audio Call', accent: '#6366F1', tint: '#EEF2FF',
                    rate: audioCallRate, setRate: setAudioCallRate,
                    fee: audioPlatformFee, setFee: setAudioPlatformFee,
                    total: totalAudio, setTotal: setTotalAudio,
                    commission: audioCommission, setCommission: setAudioCommission,
                  },
                  {
                    icon: '📹', label: 'Video Call', accent: '#EC4899', tint: '#FDF2F8',
                    rate: videoCallRate, setRate: setVideoCallRate,
                    fee: videoPlatformFee, setFee: setVideoPlatformFee,
                    total: totalVideo, setTotal: setTotalVideo,
                    commission: videoCommission, setCommission: setVideoCommission,
                  },
                  {
                    icon: '💬', label: 'Chat', accent: '#10B981', tint: '#ECFDF5',
                    rate: chatRate, setRate: setChatRate,
                    fee: chatPlatformFee, setFee: setChatPlatformFee,
                    total: totalChat, setTotal: setTotalChat,
                    commission: chatCommission, setCommission: setChatCommission,
                  },
                ].map(({ icon, label, accent, tint, rate, setRate, fee, setFee, total, setTotal, commission, setCommission }) => (
                  <View key={label} style={styles.pricingCard}>
                    {/* Card title */}
                    <View style={styles.pricingCardHeader}>
                      <View style={[styles.pricingIconBadge, { backgroundColor: tint }]}>
                        <Text style={styles.pricingIconText}>{icon}</Text>
                      </View>
                      <Text style={styles.pricingCardTitle}>{label}</Text>
                    </View>

                    {/* Total rate input */}
                    <Text style={styles.pricingFieldLabel}>Total Rate</Text>
                    <View style={[styles.totalInputWrap, { borderColor: accent }]}>
                      <Text style={[styles.currencyPrefix, { color: accent }]}>₹</Text>
                      <TextInput
                        style={styles.totalInput}
                        value={total}
                        onChangeText={(value) => {
                          setTotal(value);
                          updatePricing(value, commission, setRate, setFee);
                        }}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.perMinLabel}>/ min</Text>
                    </View>

                    {/* Commission selector */}
                    <Text style={[styles.pricingFieldLabel, { marginTop: 16 }]}>Platform Commission</Text>
                    <View style={styles.commissionRow}>
                      {[30, 35, 40, 45, 50].map(option => (
                        <TouchableOpacity
                          key={option}
                          style={[
  styles.commissionChip,
  Number(commission) === option && {
    backgroundColor: accent,
    borderColor: accent,
  },
]}
                          onPress={() => {
                            setCommission(String(option));
                            updatePricing(total, String(option), setRate, setFee);
                          }}
                        >
 <Text
  style={[
    styles.commissionChipText,
    Number(commission) === option &&
      styles.commissionChipTextActive,
  ]}
>
  {option}%
</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Calculated breakdown */}
                    <View style={styles.breakdownRow}>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Astrologer Gets</Text>
                        <View style={styles.breakdownValueWrap}>
                          <Text style={styles.breakdownCurrency}>₹</Text>
                          <TextInput
                            style={styles.breakdownValue}
                            editable={false}
                            value={rate}
                            onChangeText={setRate}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                      <View style={styles.breakdownDivider} />
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Platform Fee</Text>
                        <View style={styles.breakdownValueWrap}>
                          <Text style={styles.breakdownCurrency}>₹</Text>
                          <TextInput
                            style={styles.breakdownValue}
                            editable={false}
                            value={fee}
                            onChangeText={setFee}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Block / Unblock */}
                <TouchableOpacity
                  style={[styles.blockToggleBtn, isBlocked ? styles.unblockToggleBtn : styles.blockActiveBtn]}
                  onPress={handleBlockToggle}
                  disabled={updating}
                >
                  <Text style={styles.blockToggleText}>
                    {isBlocked ? '✅ Unblock Astrologer' : '🚫 Block Astrologer'}
                  </Text>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelAction}
                    onPress={() => setSelected(null)}
                    disabled={updating}
                  >
                    <Text style={styles.cancelActionText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveAction}
                    onPress={handleUpdate}
                    disabled={updating}
                  >
                    {updating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.saveActionText}>💾 Save Changes</Text>
                    }
                  </TouchableOpacity>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

/* ─── Small helper components ─── */
const updatePricing = (
  total: string,
  commission: string,
  setRate: any,
  setPlatformFee: any
) => {
  const t = parseFloat(total || "0");
  const c = parseFloat(commission || "0");

  const platform = (t * c) / 100;
  const astrologer = t - platform;

  setPlatformFee(platform.toFixed(2));
  setRate(astrologer.toFixed(2));
}; 
const InfoRow = ({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) => (
  <View style={[infoRowStyle.row, last && { borderBottomWidth: 0 }]}>
    <Text style={infoRowStyle.icon}>{icon}</Text>
    <Text style={infoRowStyle.label}>{label}</Text>
    <Text style={infoRowStyle.value}>{value}</Text>
  </View>
);

const infoRowStyle = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  icon: { fontSize: 16, marginRight: 8 },
  label: { flex: 1, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  value: { fontSize: 13, color: '#111827', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});

const FieldSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={fStyle.wrap}>
    <Text style={fStyle.label}>{label}</Text>
    {children}
  </View>
);

const fStyle = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
});

/* ─── Styles ─── */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F3FF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  /* Loading */
  loadingContainer: { flex: 1, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  loadingInner: { alignItems: 'center', justifyContent: 'center' },
  loadingOrb: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', position: 'absolute' },
  loadingText: { marginTop: 60, fontSize: 17, fontWeight: '700', color: '#3730A3' },
  loadingSubText: { marginTop: 4, fontSize: 13, color: '#818CF8' },

  /* Header */
  headerSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, paddingBottom: 16,
    gap: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E1B4B', letterSpacing: -0.5, flexShrink: 1 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  headerBadge: {
    backgroundColor: '#6366F1', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  /* Stats */
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: 92, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '600' },

  /* Search */
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 12,
    shadowColor: '#6366F1', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, color: '#9CA3AF', fontWeight: '700' },

  /* Filter Panel */
  filterPanel: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#EEF2FF',
  },
  filterGroupLabel: {
    fontSize: 11, fontWeight: '700', color: '#818CF8',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#4F46E5' },
  dividerLine: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  /* Empty */
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E1B4B', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },

  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#EEF2FF', overflow: 'hidden',
  },
  cardBlocked: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  blockedRibbon: {
    position: 'absolute', top: 14, right: -24, backgroundColor: '#EF4444',
    paddingHorizontal: 32, paddingVertical: 3, transform: [{ rotate: '30deg' }],
  },
  blockedRibbonText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  avatarContainer: { position: 'relative', marginRight: 0 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#E0E7FF' },
  avatarBlocked: { opacity: 0.5 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statusDot: {
    width: 12, height: 12, borderRadius: 6,
    position: 'absolute', bottom: 2, right: 2,
    borderWidth: 2, borderColor: '#fff',
  },
  statusDotActive: { backgroundColor: '#10B981' },
  statusDotBlocked: { backgroundColor: '#EF4444' },

  cardInfo: { flex: 1, minWidth: 0 },
  cardDpName: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  cardFullName: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  cardPhone: { fontSize: 13, color: '#6366F1', marginTop: 4, fontWeight: '500' },

  walletBubble: {
    backgroundColor: '#EEF2FF', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
    flexShrink: 1,
  },
  walletAmount: { fontSize: 15, fontWeight: '800', color: '#4F46E5' },
  walletLabel: { fontSize: 10, color: '#818CF8', fontWeight: '600', marginTop: 1 },

  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metaPill: {
    backgroundColor: '#F5F3FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  metaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
foundingText:{fontSize:12, color:'#F59E0B', fontWeight:'600', right:0},
  editBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
category:{color:'#4F46E5', fontSize:12, fontWeight:'600',  right:0},
  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 10, 50, 0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '92%',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E7FF',
    alignSelf: 'center', marginBottom: 20,
  },

  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalAvatarWrap: {
    shadowColor: '#6366F1', shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, marginBottom: 12,
  },
  modalAvatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: '#6366F1',
  },
  modalAvatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#4F46E5',
  },
  modalAvatarInitial: { fontSize: 38, fontWeight: '800', color: '#fff' },
  modalName: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  modalSubName: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  infoCard: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },

  fieldInput: {
    backgroundColor: '#F5F3FF', borderWidth: 1.5, borderColor: '#C7D2FE',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },
  fieldText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  starPreview: { fontSize: 20 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    backgroundColor: '#EDE9FE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  tagPillBlue: { backgroundColor: '#DBEAFE' },
  tagPillText: { fontSize: 12, color: '#5B21B6', fontWeight: '600' },

  /* ── Pricing section (upgraded) ── */
  pricingHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14, marginTop: 4,
  },
  pricingHeaderIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  pricingHeaderIcon: { fontSize: 18 },
  pricingHeader: { fontSize: 16, fontWeight: '800', color: '#1E1B4B' },
  pricingSubheader: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  pricingCard: {
    backgroundColor: '#FAFAFB', borderRadius: 18,
    padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF0F5',
    shadowColor: '#6366F1', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  pricingCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  pricingIconBadge: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  pricingIconText: { fontSize: 16 },
  pricingCardTitle: { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },

  pricingFieldLabel: {
    fontSize: 11, color: '#9CA3AF', fontWeight: '700',
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8,
  },

  totalInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#C7D2FE',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
  },
  currencyPrefix: { fontSize: 18, fontWeight: '800', marginRight: 4 },
  totalInput: {
    flex: 1, fontSize: 20, fontWeight: '800', color: '#111827',
    paddingVertical: 10,
  },
  perMinLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginLeft: 6 },

  breakdownRow: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 14, overflow: 'hidden',
  },
  breakdownItem: { flex: 1, paddingVertical: 10, paddingHorizontal: 12 },
  breakdownDivider: { width: 1, backgroundColor: '#E5E7EB' },
  breakdownLabel: {
    fontSize: 10, color: '#9CA3AF', fontWeight: '700',
    letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4,
  },
  breakdownValueWrap: { flexDirection: 'row', alignItems: 'center' },
  breakdownCurrency: { fontSize: 13, color: '#6B7280', fontWeight: '700', marginRight: 2 },
  breakdownValue: {
    fontSize: 14, fontWeight: '800', color: '#374151',
    padding: 0, flex: 1,
  },

  blockToggleBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 12,
  },
  blockActiveBtn: { backgroundColor: '#EF4444' },
  unblockToggleBtn: { backgroundColor: '#10B981' },
  blockToggleText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cancelAction: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelActionText: { color: '#6B7280', fontWeight: '700', fontSize: 15 },
  saveAction: {
    flex: 2, backgroundColor: '#4F46E5', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  commissionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  commissionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },

  commissionChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },

  commissionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },

  commissionChipTextActive: {
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: -26,
  alignSelf: 'center',
  marginTop: 10,
  marginBottom: 20,
  backgroundColor: '#EF4444',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 24,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

  closeButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '700',
  },
  refreshButton: { padding: 8, marginLeft: 8 },
  modalKeyboard: { flex: 1 },
});
