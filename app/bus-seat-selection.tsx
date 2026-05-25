import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { useLanguageStore, translations } from '@/stores/languageStore';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const BusSeatSelectionSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.legendContainer}>
      <View style={[styles.skeletonLine, { width: '25%', height: 16 }]} />
      <View style={[styles.skeletonLine, { width: '25%', height: 16 }]} />
      <View style={[styles.skeletonLine, { width: '25%', height: 16 }]} />
    </View>
    <View style={[styles.busIllustration, { height: 400, justifyContent: 'center', alignItems: 'center' }]}>
      <View style={styles.driverSection}>
        <View style={[styles.skeletonLine, { width: 30, height: 30, borderRadius: 15 }]} />
      </View>
      <View style={styles.gridContainer}>
        {[...Array(12)].map((_, i) => (
          <View key={i} style={[styles.skeletonLine, { width: (SCREEN_WIDTH - 120) / 3, height: 45, borderRadius: 8 }]} />
        ))}
      </View>
    </View>
    <View style={styles.footer}>
      <View style={[styles.skeletonLine, { width: '40%', height: 20 }]} />
      <View style={[styles.skeletonLine, { width: '40%', height: 45, borderRadius: 12 }]} />
    </View>
  </SkeletonPulse>
);

export default function BusSeatSelectionScreen() {
  const router = useRouter();
  const { id, company, price, from, to, date, totalSeats } = useLocalSearchParams<{ 
    id: string, 
    company: string, 
    price: string,
    from: string,
    to: string,
    date: string,
    totalSeats: string
  }>();

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [reservedSeats, setReservedSeats] = useState<number[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [serviceFee, setServiceFee] = useState<number>(500);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  const [loading, setLoading] = useState(true);

  const seatsCount = useMemo(() => parseInt(Array.isArray(totalSeats) ? totalSeats[0] : (totalSeats || '30'), 10), [totalSeats]);

  // Dynamically determine columns based on capacity
  const numColumns = useMemo(() => {
    if (seatsCount <= 16) return 2;
    if (seatsCount <= 30) return 3;
    return 4;
  }, [seatsCount]);

  // Set VIP rows (e.g., first 2 rows) and calculate dynamic seat width
  const vipRows = useMemo(() => (seatsCount >= 20 ? 2 : 1), [seatsCount]);
  const vipCount = vipRows * numColumns;
  const seatWidth = (SCREEN_WIDTH - 120) / numColumns;

  // Define seat structure
  const seatLayout = useMemo(() => {
    return Array.from({ length: seatsCount }, (_, i) => ({
      id: i + 1,
      number: `${i + 1}`,
      isReserved: reservedSeats.includes(i + 1),
      type: (i + 1) <= vipCount ? 'VIP' : 'Standard',
    }));
  }, [reservedSeats, seatsCount, vipCount]);

  const travelDate = useMemo(() => date ? new Date(date).toISOString().split('T')[0] : null, [date]);

  const fetchReservedSeats = useCallback(async () => {
    if (!id || !travelDate) return;
    try {
      const { data, error } = await supabase
        .from('bus_reservations')
        .select('seat_number')
        .eq('bus_id', id)
        .eq('travel_date', travelDate)
        .neq('status', 'cancelled');

      if (error) throw error;
      setReservedSeats(data?.map(r => r.seat_number) || []);
    } catch (err) {
      console.error('Error updating reservations:', err);
    }
  }, [id, travelDate]);

  // Real-time listener for reservations on this bus and date
  useRealtimeRefresh('bus_reservations', fetchReservedSeats, id && travelDate ? `bus_id=eq.${id}&travel_date=eq.${travelDate}` : undefined);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const storedCountry = await SecureStore.getItemAsync('user_country');
        setCountry(storedCountry);

        await fetchReservedSeats();

        if (storedCountry) {
          const { data: feeData, error: feeError } = await supabase
            .from('service_fees')
            .select('fee')
            .eq('service_type', 'bus')
            .eq('country', storedCountry)
            .single();
          
          if (!feeError && feeData) {
            setServiceFee(Number(feeData.fee));
          }
        }
      } catch (err) {
        console.error('Error fetching reservations:', err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [fetchReservedSeats]);

  const basePrice = parseFloat(price || '0');

  const totalAmount = useMemo(() => {
    return selectedSeats.reduce((sum, seatId) => {
      const seat = seatLayout.find(s => s.id === seatId);
      const currentPrice = seat?.type === 'VIP' ? basePrice * 1.5 : basePrice;
      return sum + currentPrice;
    }, 0);
  }, [selectedSeats, basePrice, seatLayout]);

  const toggleSeat = (seatId: number) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(prev => prev.filter(id => id !== seatId));
    } else {
      if (selectedSeats.length >= 5) {
        return Toast.show({ type: 'error', text1: 'Limit Reached', text2: 'You can book up to 5 seats at once.' });
      }
      setSelectedSeats(prev => [...prev, seatId]);
    }
  };

  const handleConfirm = () => {
    const subtotal = totalAmount;
    const total = subtotal + serviceFee;

    router.push({
      pathname: '/bus-checkout',
      params: {
        id,
        company,
        from,
        to,
        date,
        selectedSeats: JSON.stringify(selectedSeats),
        subtotal: subtotal.toString(),
        serviceFee: serviceFee.toString(),
        total: total.toString(),
        totalSeats: totalSeats // Keep it passing for consistency
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
          <Text style={styles.headerTitle}>{t["select your seat"]}</Text>
          <Text style={styles.headerSubtitle}>{company} • {from} to {to}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}><View style={[styles.seatLegend, styles.seatAvailable]} /><Text style={styles.legendLabel}>{t.available}</Text></View>
        <View style={styles.legendItem}><View style={[styles.seatLegend, styles.seatReserved]} /><Text style={styles.legendLabel}>{t.reserved}</Text></View>
        <View style={styles.legendItem}><View style={[styles.seatLegend, styles.seatSelected]} /><Text style={styles.legendLabel}>{t.selected}</Text></View>
        <View style={styles.legendItem}><View style={[styles.seatLegend, styles.seatVIP]} /><Text style={styles.legendLabel}>{t.vip}</Text></View>
      </View>

      {loading ? ( // Render skeleton if loading
        <BusSeatSelectionSkeleton />
      ) : (
      <ScrollView contentContainerStyle={styles.seatScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.busIllustration}>
          <View style={styles.driverSection}>
            <View style={styles.steeringWheel} />
          </View>
          
          <View style={styles.gridContainer}>
            {seatLayout.map((seat, index) => {
              const isSelected = selectedSeats.includes(seat.id);
              const isReserved = seat.isReserved;
              const isVIP = seat.type === 'VIP';

              return (
                <View key={seat.id} style={{ alignItems: 'center' }}>
                  {index === 0 && vipCount > 0 && <Text style={styles.sectionLabel}>VIP SECTION (1.5x Price)</Text>}
                  {index === vipCount && <View style={styles.sectionDivider}><Text style={styles.sectionLabel}>STANDARD SECTION</Text></View>}
                  
                  <TouchableOpacity
                    disabled={isReserved}
                    style={[
                      styles.seatBox,
                      { width: seatWidth },
                      isVIP && styles.seatVIP,
                      isReserved && styles.seatReserved,
                      isSelected && (isVIP ? styles.seatVIPSelected : styles.seatSelected),
                      // Calculate aisle margin based on the middle column
                      (index % numColumns === Math.floor(numColumns / 2) - 1) && { marginRight: 25 }
                    ]}
                    onPress={() => toggleSeat(seat.id)}
                  >
                    <Text style={[
                      styles.seatText, 
                      isVIP && !isSelected && !isReserved && styles.seatTextVIP,
                      (isSelected || isReserved) && { color: '#fff' }
                    ]}>
                      {seat.number}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.selectedCount}>{selectedSeats.length} {t["seats selected"]}</Text>
          <Text style={styles.totalPrice}>BIF {totalAmount.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.confirmButton, selectedSeats.length === 0 && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={selectedSeats.length === 0}
        >
          <Text style={styles.confirmBtnText}>{t["confirm booking"]}</Text>
        </TouchableOpacity>
      </View>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#E0F7FA' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#212121' },
  headerSubtitle: { fontSize: 12, color: '#757575' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginBottom: 20, padding: 10, backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, elevation: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seatLegend: { width: 16, height: 16, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#757575', fontFamily: 'Roboto-Medium' },
  seatScroll: { paddingHorizontal: 16, paddingBottom: 40 },
  busIllustration: { borderWidth: 2, borderColor: '#ddd', borderRadius: 25, padding: 20, backgroundColor: '#fff' },
  driverSection: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15, alignItems: 'flex-end', paddingRight: 20 },
  steeringWheel: { width: 30, height: 30, borderRadius: 15, borderWidth: 4, borderColor: '#757575' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  seatBox: { 
    height: 45, 
    backgroundColor: '#E8F5E9', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  seatAvailable: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9' },
  seatReserved: { backgroundColor: '#BDBDBD', borderColor: '#9E9E9E' },
  seatSelected: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
  seatVIP: { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' },
  seatVIPSelected: { backgroundColor: '#FBC02D', borderColor: '#F57F17' },
  seatText: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32' },
  seatTextVIP: { color: '#F57F17' },
  sectionLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Roboto-Bold',
    color: '#9E9E9E',
    marginVertical: 15,
    letterSpacing: 1.5,
  },
  sectionDivider: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 20,
    paddingTop: 5,
  },
  footer: { 
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  selectedCount: { fontSize: 12, color: '#757575', fontFamily: 'Roboto-Medium' },
  totalPrice: { fontSize: 22, fontFamily: 'Roboto-Bold', color: '#2E7D32' },
  confirmButton: { 
    backgroundColor: '#4CAF50', 
    paddingHorizontal: 25, 
    paddingVertical: 14, 
    borderRadius: 15,
  },
  disabledBtn: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  skeletonLine: { backgroundColor: '#e0e0e0', borderRadius: 4 },
});