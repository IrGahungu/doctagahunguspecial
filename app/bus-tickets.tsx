import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Bus, MapPin, Calendar, Clock, Ticket as TicketIcon, Info, Download } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type BusTicket = {
  id: string;
  seat_number: number;
  travel_date: string;
  status: string;
  ticket_number?: string; // Add ticket_number
  buses: {
    company: string;
    origin: string;
    destination: string;
    departure_time: string;
    duration: string;
    bus_type: string;
  };
};

const TicketItem = ({ item, isNew }: { item: BusTicket; isNew?: boolean }) => {
  const viewRef = useRef<View>(null);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const isConfirmed = item.status === 'confirmed';

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
    <View style={styles.ticketCard} ref={viewRef} collapsable={false}>
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View style={styles.companyInfo}>
          <Bus size={20} color="#4CAF50" />
          <Text style={styles.companyName}>{item.buses.company}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isConfirmed && (
            <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
              <Download size={16} color="#4CAF50" />
            </TouchableOpacity>
          )}
          <View style={[
            styles.statusBadge, 
            item.status === 'confirmed' ? styles.statusConfirmed : 
            styles.statusPending
          ]}>
            <Text style={[styles.statusText, { color: item.status === 'confirmed' ? '#2E7D32' : '#F57F17' }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <Text style={styles.routeLabel}>Origin</Text>
          <Text style={styles.routeCity}>{item.buses.origin}</Text>
        </View>
        
        <View style={styles.routeDivider}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <MapPin size={16} color="#F44336" />
        </View>

        <View style={[styles.routePoint, { alignItems: 'flex-end' }]}>
          <Text style={styles.routeLabel}>Destination</Text>
          <Text style={styles.routeCity}>{item.buses.destination}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Calendar size={14} color="#757575" />
          <Text style={styles.infoValue}>{new Date(item.travel_date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.infoItem}>
          <Clock size={14} color="#757575" />
          <Text style={styles.infoValue}>{item.buses.departure_time}</Text>
        </View>
        <View style={styles.infoItem}>
          <TicketIcon size={14} color="#4CAF50" />
          <View>
            <Text style={styles.seatValue}>Seat {item.seat_number}</Text>
            {isConfirmed && item.ticket_number && (
              <Text style={styles.ticketIdSmall}>ID: {item.ticket_number}</Text>
            )}
          </View>
        </View>
      </View>

      {isConfirmed && (
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({
                ticketId: item.id,
                bus: item.buses.company,
                seat: item.seat_number,
                date: item.travel_date,
                ticketNumber: item.ticket_number,
              })}
              size={80}
            />
          </View>
          <View style={styles.qrInfo}>
            <Text style={styles.qrText}>Scan at boarding</Text>
            <Text style={styles.busType}>{item.buses.bus_type} Service</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default function BusTicketsScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<BusTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [newTicketIds, setNewTicketIds] = useState<Set<string>>(new Set());

  const fetchTickets = useCallback(async () => {
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const token = await SecureStore.getItemAsync('token');
        if (!token) {
          router.replace('/auth');
          return;
        }
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          currentUserId = data.id;
          setUserId(data.id);
        }
      }

      if (!currentUserId) return;

      const { data, error } = await supabase
        .from('bus_reservations')
        .select(`
          id,
          seat_number,
          travel_date,
          ticket_number,
          status,
          buses (
            company,
            origin,
            destination,
            departure_time,
            duration,
            bus_type
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data as any || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, router]);

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [fetchTickets])
  );

  useRealtimeRefresh(
    'bus_reservations',
    useCallback((payload) => {
      if (payload.eventType === 'UPDATE') {
        const updated = payload.new as any;

        // Instantly update local state for the modified ticket
        setTickets((currentTickets) =>
          currentTickets.map((t) =>
            t.id === updated.id
              ? { ...t, status: updated.status, ticket_number: updated.ticket_number }
              : t
          )
        );

        // Add a "NEW" badge and schedule its removal
        setNewTicketIds((prev) => new Set(prev).add(updated.id));
        setTimeout(() => {
          setNewTicketIds((prev) => {
            const next = new Set(prev);
            next.delete(updated.id);
            return next;
          });
        }, 10000);
      }
      
      // Background sync to ensure data consistency
      fetchTickets();
    }, [fetchTickets]),
    userId ? `user_id=eq.${userId}` : undefined
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/account' as any)} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bus Tickets</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={({ item }) => <TicketItem item={item} isNew={newTicketIds.has(item.id)} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bus size={64} color="#ccc" />
              <Text style={styles.emptyText}>You don't have any tickets yet.</Text>
              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => router.push('/bus-booking')}
              >
                <Text style={styles.bookButtonText}>Book a JK BUS</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Roboto-Bold', color: '#212121' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  ticketCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  companyInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companyName: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#212121' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusConfirmed: { backgroundColor: '#E8F5E9' },
  statusCancelled: { backgroundColor: '#FFEBEE' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 12, fontFamily: 'Roboto-Medium', textTransform: 'capitalize' },
  routeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  routePoint: { flex: 1 },
  routeLabel: { fontSize: 10, color: '#757575', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  routeCity: { fontSize: 16, fontFamily: 'Roboto-Bold', color: '#212121' },
  routeDivider: { flex: 0.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  line: { width: 1, height: 30, backgroundColor: '#eee' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 15, marginBottom: 15 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: { fontSize: 13, color: '#616161', fontFamily: 'Roboto-Medium' },
  seatValue: { fontSize: 13, fontFamily: 'Roboto-Bold', color: '#4CAF50' },
  qrSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', padding: 12, borderRadius: 12, gap: 15 },
  qrContainer: { backgroundColor: '#fff', padding: 5, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  qrInfo: { flex: 1 },
  qrText: { fontSize: 14, fontFamily: 'Roboto-Bold', color: '#212121' },
  busType: { fontSize: 12, color: '#757575', marginTop: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#757575', fontFamily: 'Roboto-Regular', marginTop: 16, marginBottom: 24 },
  bookButton: { backgroundColor: '#4CAF50', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 25 },
  bookButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Roboto-Bold' },
  cancelledNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },
  cancelledText: { fontSize: 12, color: '#757575', fontStyle: 'italic' },
  downloadButton: { padding: 8, backgroundColor: '#E8F5E9', borderRadius: 20 },
  ticketIdSmall: { 
    fontSize: 10, 
    fontFamily: 'Roboto-Medium', 
    color: '#757575',
    marginTop: 2 
  },
  newBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Roboto-Bold',
  },
});