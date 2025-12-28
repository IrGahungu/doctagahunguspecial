import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, User, Download } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

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
          <Text style={styles.doctorName} numberOfLines={1}>{item.doctor_name || 'Unknown Doctor'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getMainStatusColor(status) }]}>
          <Text style={styles.statusText}>
            {(status === 'confirmed' || status === 'completed') ? 'Confirmed' : (status === 'cancelled' ? 'Cancelled' : 'Pending')}
          </Text>
        </View>
      </View>

      {item.ticket_number && (
        <View style={styles.ticketContainer}>
          <Text style={styles.ticketLabel}>Ticket Number:</Text>
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
            {item.type === 'online' ? 'Online Consultation' : 'In-Office Visit'}
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
          <Text style={styles.qrLabel}>{item.doctor_name} with Dr. Gahungu App</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(status === 'confirmed' || status === 'completed') ? (
            <View style={[styles.statusBadge, { backgroundColor: getSubStatusColor(status) }]}>
              <Text style={styles.statusText}>{status === 'completed' ? 'Complete' : 'Incomplete'}</Text>
            </View>
          ) : status === 'cancelled' ? (
            <View style={[styles.statusBadge, { backgroundColor: '#607D8B' }]}>
              <Text style={styles.statusText}>Refunded</Text>
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
            Paid: {item.amount.toLocaleString()} FBU
          </Text>
        )}
      </View>
    </View>
  );
};

export default function AppointmentsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchBookings = async () => {
    try {
      let userId = null;
      
      // 1. Try to get Supabase user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else {
        // 2. If not, try to get Custom Backend user
        const token = await SecureStore.getItemAsync("token");
        if (token) {
           const res = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            userId = data.id || data._id || data.user_id;
          }
        }
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error.message);
      } else {
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error in fetchBookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

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
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No appointments found.</Text>
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
});
