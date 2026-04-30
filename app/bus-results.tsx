import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bus, Calendar as CalendarIcon, MapPin } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';

export default function BusResultsScreen() {
  const router = useRouter();
  const { from, to, date } = useLocalSearchParams<{ from: string, to: string, date: string }>();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchBuses = async () => {
      setLoading(true);
      const searchFrom = (from || '').trim();
      const searchTo = (to || '').trim();
      
      // Use local date parts to avoid UTC timezone shifts from .toISOString()
      const d = date ? new Date(date) : null;
      const searchDate = d ? 
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` 
        : null;

      console.log('🔍 Searching Supabase for:', { searchFrom, searchTo, searchDate });

      try {
        let query = supabase
          .from('buses')
          .select('*')
          .ilike('origin', searchFrom ? `%${searchFrom}%` : '%')
          .ilike('destination', searchTo ? `%${searchTo}%` : '%');

        if (searchDate) {
          query = query.eq('departure_date', searchDate);
        }

        const { data, error } = await query;

        if (error) throw error;
        console.log('✅ Found buses:', data?.length || 0);
        setResults(data || []);
      } catch (err: any) {
        console.error('Error fetching buses:', err.message);
        Toast.show({ type: 'error', text1: 'Fetch Error', text2: 'Could not load bus schedules.' });
      } finally {
        setLoading(false);
      }
    };

    fetchBuses();
  }, [from, to, date]);

  const formattedDate = date ? new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '';

  const handleOpenSeatMap = (bus: any) => {
    router.push({
      pathname: '/bus-seat-selection',
      params: {
        id: bus.id,
        company: bus.company,
        price: Number(bus.price).toString(),
        from: bus.origin,
        to: bus.destination,
        date: date,
        totalSeats: (bus.seats || bus.capacity || 30).toString()
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{from} to {to}</Text>
          <Text style={styles.headerSubtitle}>{formattedDate}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Finding best routes...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.resultsCount}>{results.length} Buses Available</Text>
          
          {results.length > 0 ? (
            results.map((bus) => (
              <View key={bus.id} style={styles.busCard}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.busCompany}>{bus.company}</Text>
                    <Text style={styles.busType}>{bus.bus_type}</Text>
                  </View>
                  <Text style={styles.busPrice}>BIF {Number(bus.price).toLocaleString()}</Text>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{bus.departure_time}</Text>
                    <View style={styles.line} />
                    <Text style={styles.timeText}>{bus.duration}</Text>
                  </View>
                  <View style={styles.stationColumn}>
                    <View style={styles.stationRow}>
                      <MapPin size={16} color="#4CAF50" />
                      <Text style={styles.stationText}>{bus.origin} Main Terminal</Text>
                    </View>
                    <View style={styles.stationRow}>
                      <MapPin size={16} color="#F44336" />
                      <Text style={styles.stationText}>{bus.destination} Central Station</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.bookButton}
                  onPress={() => handleOpenSeatMap(bus)}
                >
                  <Text style={styles.bookButtonText}>Select Seat</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Bus size={64} color="#ccc" />
              <Text style={styles.emptyText}>No buses found for this specific route on this date.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                <Text style={styles.retryButtonText}>Try another route</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#E0F7FA' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Roboto-Bold', color: '#212121' },
  headerSubtitle: { fontSize: 12, color: '#757575' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#757575', fontFamily: 'Roboto-Medium' },
  resultsCount: { fontSize: 14, color: '#757575', marginBottom: 16, fontFamily: 'Roboto-Medium' },
  busCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  busCompany: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#212121' },
  busType: { fontSize: 12, color: '#4CAF50', fontFamily: 'Roboto-Medium' },
  busPrice: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#2e7d32' },
  routeContainer: { flexDirection: 'row', marginBottom: 20 },
  timeColumn: { alignItems: 'center', marginRight: 16 },
  timeText: { fontSize: 12, color: '#212121', fontWeight: 'bold' },
  line: { width: 2, height: 30, backgroundColor: '#eee', marginVertical: 4 },
  stationColumn: { flex: 1, justifyContent: 'space-between' },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stationText: { fontSize: 14, color: '#424242' },
  bookButton: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  bookButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Roboto-Bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', color: '#757575', marginTop: 16, marginHorizontal: 40 },
  retryButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#4CAF50' },
  retryButtonText: { color: '#4CAF50', fontWeight: 'bold' }
});