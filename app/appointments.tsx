import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, User, Download } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useLanguageStore, translations } from '@/stores/languageStore';

type Booking = {
  id: string;
  doctor_name: string;
  doctor_image?: string;
  date: string;
  time: string;
  type: 'online' | 'in-office';
  status: string;
  amount: number;
  created_at: string;
  ticket_number?: string;
};

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const AppointmentSkeleton = () => (
  <View style={styles.listContent}>
    {[1, 2, 3].map((i) => (
      <SkeletonPulse key={i}>
        <View style={[styles.card, { height: 180 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.skeleton, { width: '60%', height: 20, borderRadius: 4 }]} />
            <View style={[styles.skeleton, { width: 80, height: 24, borderRadius: 12 }]} />
          </View>
          <View style={[styles.skeleton, { width: '100%', height: 1, marginVertical: 12 }]} />
          <View style={{ gap: 10 }}>
            <View style={[styles.skeleton, { width: '40%', height: 16, borderRadius: 4 }]} />
            <View style={[styles.skeleton, { width: '50%', height: 16, borderRadius: 4 }]} />
          </View>
        </View>
      </SkeletonPulse>
    ))}
  </View>
);

const getMainStatusColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s === 'confirmed' || s === 'completed') return '#4CAF50';
  if (s === 'cancelled') return '#F44336';
  return '#FFC107';
};

const getSubStatusColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s === 'completed') return '#9C27B0';
  return '#FF9800';
};

const AppointmentItem = ({ item }: { item: Booking }) => {
  const viewRef = useRef<View>(null);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const status = item.status?.toLowerCase() || '';
  const isConfirmed = status === 'confirmed' || status === 'completed';
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const handleDownload = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please allow access to save the ticket.');
          return;
        }
      }

      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Ticket saved to gallery!');
    } catch (error) {
      console.error('Error saving ticket:', error);
      Alert.alert('Error', 'Failed to save ticket.');
    }
  };

  return (
    <View style={styles.card} ref={viewRef} collapsable={false}>
      <View style={styles.cardHeader}>
        <View style={styles.doctorInfo}>
          <User size={20} color="#4CAF50" style={{ marginRight: 8 }} />
          <Text style={styles.doctorName} numberOfLines={1}>{item.doctor_name || t["unknown doctor"]}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getMainStatusColor(status) }]}>
          <Text style={styles.statusText}>
            {(status === 'confirmed' || status === 'completed') ? t.confirmed : (status === 'cancelled' ? t.cancelled : t.pending)}
          </Text>
        </View>
      </View>

      {item.ticket_number && (
        <View style={styles.ticketContainer}>
          <Text style={styles.ticketLabel}>{t["ticket number"]}:</Text>
          <Text style={styles.ticketValue}>{item.ticket_number}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Calendar size={16} color="#757575" />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={16} color="#757575" />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MapPin size={16} color="#757575" />
          <Text style={styles.detailText}>
            {item.type === 'online' ? t["online consultation"] : t["in-office visit"]}
          </Text>
        </View>
      </View>

      {isConfirmed && (
        <View style={styles.qrContainer}>
          <QRCode
            value={JSON.stringify({
              id: item.id,
              ticket: item.ticket_number,
              doctor: item.doctor_name,
              date: item.date,
              time: item.time
            })}
            size={100}
          />
          <Text style={styles.qrLabel}>{item.doctor_name} {t["with melana"]}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(status === 'confirmed' || status === 'completed') ? (
            <View style={[styles.statusBadge, { backgroundColor: getSubStatusColor(status) }]}>
              <Text style={styles.statusText}>{status === 'completed' ? t.complete : t.incomplete}</Text>
            </View>
          ) : status === 'cancelled' ? (
            <View style={[styles.statusBadge, { backgroundColor: '#607D8B' }]}>
              <Text style={styles.statusText}>{t.refunded}</Text>
            </View>
          ) : <View />}
          
          {isConfirmed && (
            <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
              <Download size={16} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>

        {item.amount > 0 && (
          <Text style={[
            styles.amountText,
            status === 'cancelled' && { color: '#757575' }
          ]}>
            {t.paid}: {item.amount.toLocaleString()} FBU
          </Text>
        )}
      </View>
    </View>
  );
};

export default function AppointmentsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      let currentUserId = userId;
      
      if (!currentUserId) {
        // 1. Try to get Supabase user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentUserId = user.id;
        } else {
          // 2. If not, try to get Custom Backend user
          const token = await SecureStore.getItemAsync("token");
          if (token) {
             const res = await fetch(`${API_BASE_URL}/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              currentUserId = data.id || data._id || data.user_id;
            }
          }
        }
        if (currentUserId) setUserId(currentUserId);
      }

      if (!currentUserId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error.message);
        setHasError(true);
      } else {
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time subscription for booking updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-appointments-channel')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'bookings', 
          filter: `user_id=eq.${userId}` 
        },
        (payload) => {
          console.log('Appointment update received!', payload);
          fetchBookings();
        }
      ).subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [userId, fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t["my appointments"]}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <AppointmentSkeleton />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t["failed to load appointments"]}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t["no appointments found"]}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={({ item }) => <AppointmentItem item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E0F7FA',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    textTransform: 'capitalize',
  },
  ticketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  ticketLabel: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#2E7D32',
    marginRight: 8,
  },
  ticketValue: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#1B5E20',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#616161',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  qrLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
  },
  downloadButton: {
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    marginLeft: 8,
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#4CAF50',
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Regular',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});
