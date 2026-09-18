import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingScreen from './components/loadingScreen';
import { CallHistoryItem, fetchCallHistory } from '../lib/profileHistory';

export default function CallHistoryScreen() {
  const router = useRouter();
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadCallHistory = async () => {
        try {
          setLoading(true);
          const userId = await AsyncStorage.getItem('user_id');

          if (!userId) {
            router.replace('/login');
            return;
          }

          const data = await fetchCallHistory(userId);
          setCallHistory(data);
        } finally {
          setLoading(false);
        }
      };

      loadCallHistory();
    }, [router])
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4B7BEC" />
      <LoadingScreen loadingScreen={loading} />

      <LinearGradient colors={['#4B7BEC', '#667eea']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {callHistory.length ? (
            callHistory.map((call) => (
        <TouchableOpacity
          key={call.id}
          style={styles.listItem}
          activeOpacity={0.82}
          onPress={() =>
   router.push({
      pathname: "/(tabs)/astrologer-details",
      params:  { id: call.astrologerId },
    })
  }
        >
                          <View style={styles.iconCircle}>
                  <Feather
                    name={
                      call.type === 'video'
                        ? 'video'
                        : call.type === 'call'
                          ? 'phone'
                          : 'message-circle'
                    }
                    size={18}
                    color="#4B7BEC"
                  />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{call.astrologerName}</Text>
                  <Text style={styles.listDate}>
                    {call.duration} , {call.date}
                  </Text>
                  <Text style={styles.statusText}>{call.status}</Text>
                </View>
                <Text style={styles.amountText}>{"\u20B9"}{call.amount}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No call history yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    flex: 1,
    minWidth: 0,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  listDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#4B7BEC',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
    paddingVertical: 8,
  },
});
