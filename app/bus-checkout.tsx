import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
} from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Wallet, Bus, MapPin, Calendar, CheckCircle, AlertCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '@/config';
import * as SecureStore from 'expo-secure-store';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuthStore } from '@/stores/authStore';

export default function BusCheckoutScreen() {
  const router = useRouter();
  const { id, company, from, to, date, selectedSeats, total, subtotal, serviceFee } = useLocalSearchParams<{
    id: string;
    company: string;
    from: string;
    to: string;
    date: string;
    selectedSeats: string;
    total: string;
    subtotal: string;
    serviceFee: string;
  }>();

  const seats = JSON.parse(Array.isArray(selectedSeats) ? selectedSeats[0] : (selectedSeats || '[]'));
  const [isLoading, setIsLoading] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const currentUserId = useAuthStore((state) => state.userId);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [minEpRequired, setMinEpRequired] = useState<number>(5000); // Default fallback
  const fadeScale = useRef(new Animated.Value(0)).current;
  const [engagementPoints, setEngagementPoints] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const safeTotal = parseFloat(Array.isArray(total) ? total[0] : (total || '0'));
  const safeServiceFee = parseFloat(Array.isArray(serviceFee) ? serviceFee[0] : (serviceFee || '0'));
  const safeSubtotal = parseFloat(Array.isArray(subtotal) ? subtotal[0] : (subtotal || '0'));
  const safeDate = Array.isArray(date) ? date[0] : date;
  const safeCompany = Array.isArray(company) ? company[0] : company;
  const safeFrom = Array.isArray(from) ? from[0] : from;
  const safeTo = Array.isArray(to) ? to[0] : to;

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

const BusCheckoutSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.content}>
      <View style={[styles.ticketCard, { height: 200 }]}>
        <View style={[styles.skeletonLine, { width: '50%', height: 20, marginBottom: 20 }]} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={[styles.skeletonLine, { width: '30%', height: 16 }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 16 }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={[styles.skeletonLine, { width: '40%', height: 14 }]} />
          <View style={[styles.skeletonLine, { width: '40%', height: 14 }]} />
        </View>
      </View>

      <View style={[styles.summaryCard, { height: 180 }]}>
        <View style={[styles.skeletonLine, { width: '60%', height: 18, marginBottom: 15 }]} />
        <View style={[styles.skeletonLine, { width: '80%', height: 14, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '70%', height: 14, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 18, marginTop: 10 }]} />
      </View>

      <View style={[styles.skeletonLine, { width: '100%', height: 55, borderRadius: 15, marginTop: 20 }]} />
    </View>
  </SkeletonPulse>
);

  // Fetch user's engagement points on component mount
  useEffect(() => {
    const fetchUserEngagementPoints = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token || !currentUserId) return;

        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.engagement_points !== undefined) {
          setEngagementPoints(data.engagement_points);
          setUserId(data.id); // Also set userId here
          setError(null); // Clear any previous errors
        }

        // Fetch the dynamic threshold from backend
        const configRes = await fetch(`${API_BASE_URL}/config/bus-booking-threshold`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const configData = await configRes.json();
        if (configRes.ok && configData.min_ep_required) {
          setMinEpRequired(configData.min_ep_required);
          setError(null); // Clear any previous errors
        }
      } catch (error) {
        console.error('Error fetching engagement points:', error);
        setError('Failed to load eligibility details.');
      }
    };
    fetchUserEngagementPoints();

    const timer = setTimeout(() => {
      setIsCheckingEligibility(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isCheckingEligibility) {
      Animated.spring(fadeScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }).start();
    }
  }, [isCheckingEligibility]);

  const handleInitiatePayment = async () => {
    if (!safeTotal || !id) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Missing booking details.',
      });
      return;
    }

    if (engagementPoints < minEpRequired) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Engagement Points',
        text2: `You need ${minEpRequired.toLocaleString()} EP to book. Earn more by watching stories, viewing posts, and liking content!`,
        visibilityTime: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please log in to book.',
          visibilityTime: 3000,
        });
        router.replace('/auth');
        return;
      }

      const walletRes = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const walletData = await walletRes.json();

      if (!walletRes.ok) {
        Toast.show({
          type: 'error',
          text1: 'Wallet Error',
          visibilityTime: 3000,
          text2: walletData.error || 'Failed to fetch balance.',
        });
        return;
      }

      if (Number(walletData.wallet_balance) < Number(safeTotal)) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Balance',
          visibilityTime: 3000,
          text2: 'Please add funds to your wallet.',
        });
        return;
      }

      // Show PIN modal
      setPin('');
      setIsPinModalVisible(true);

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        visibilityTime: 3000,
        text2: 'Failed to verify wallet balance.',
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleVerifyAndPay = async () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      return;
    }

    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        throw new Error('Authentication expired. Please log in again.');
      }

      /* ================================
         1️⃣ Verify PIN
         ================================ */

      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin_code: pin }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(
          verifyData.error || 'The PIN you entered is incorrect.'
        );
      }

      /* ================================
         2️⃣ Call Backend Booking API
         ================================ */

      const bookingRes = await fetch(`${API_BASE_URL}/bus/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bus_id: Array.isArray(id) ? id[0] : id,
          seats: seats,
          travel_date: safeDate,
          total_amount: safeTotal,
        }),
      });

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        throw new Error(bookingData.error || 'Booking failed.');
      }

      /* ================================
         3️⃣ Success UI
         ================================ */

      setIsPinModalVisible(false);
      setShowConfetti(true);

      Toast.show({
        type: 'success',
        text1: 'Booking Confirmed 🎉',
        text2: `Reserved ${seats.length} seats for your trip!`,
      });

      setTimeout(() => {
        router.replace('/bus-tickets' as any);
      }, 3000);

    } catch (error: any) {
      console.error('Bus checkout error:', error);

      setIsPinModalVisible(false);

      setTimeout(() => {
        Alert.alert(
          'Booking Failed',
          error.message ||
          'Something went wrong while reserving your seat.'
        );
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
      </View>

      {(isLoading || isCheckingEligibility || error) ? (
        <BusCheckoutSkeleton />
      ) : (
        <>
      {showConfetti && <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} />}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.ticketCard}>
          <View style={styles.busHeader}>
            <Bus size={24} color="#4CAF50" />
            <Text style={styles.companyName}>{safeCompany}</Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>From</Text>
              <Text style={styles.routeCity}>{safeFrom}</Text>
            </View>
            <View style={styles.routeDivider}>
              <View style={styles.dot} />
              <View style={styles.line} />
              <MapPin size={16} color="#F44336" />
            </View>
            <View style={[styles.routeItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.routeLabel}>To</Text>
              <Text style={styles.routeCity}>{safeTo}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Calendar size={16} color="#757575" />
              <Text style={styles.infoText}>{safeDate ? new Date(safeDate).toLocaleDateString() : 'N/A'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.seatLabel}>Seats: </Text>
              <Text style={styles.seatValue}>{Array.isArray(seats) ? seats.join(', ') : ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Seat Price x {seats.length}</Text>
            <Text style={styles.summaryValue}>BIF {safeSubtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bus Service Fee</Text>
            <Text style={styles.summaryValue}>BIF {safeServiceFee.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>BIF {safeTotal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.paymentMethod}>
          <Wallet size={24} color="#4CAF50" />
          <Text style={styles.paymentText}>Pay from Gahungu Wallet</Text>
        </View>

        <View style={styles.epMessageContainer}>
          {isCheckingEligibility ? (
            <View style={styles.epMessageRow}>
              <ActivityIndicator size="small" color="#4CAF50" style={styles.epIcon} />
              <Text style={styles.epCheckingText}>Checking your eligibility...</Text>
            </View>
          ) : engagementPoints >= minEpRequired ? (
            <Animated.View style={[styles.epMessageRow, { opacity: fadeScale, transform: [{ scale: fadeScale }] }]}>
              <CheckCircle size={18} color="#4CAF50" style={styles.epIcon} />
              <Text style={styles.epEligibleText}>
                Your current EP is {engagementPoints.toLocaleString()}, you are eligible to book.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: fadeScale, transform: [{ scale: fadeScale }], alignItems: 'center' }}>
              <View style={styles.epMessageRow}>
                <AlertCircle size={18} color="#F44336" style={styles.epIcon} />
                <Text style={styles.epWarningText}>
                  Your current EP is less than {minEpRequired.toLocaleString()}.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/explore')}
                style={styles.earnEpLink}
              >
                <Text style={styles.earnEpLinkText}>Click here to increase your EP by watching stories, viewing posts and liking posts.</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>


        <TouchableOpacity
          style={[styles.payButton, (isLoading || isCheckingEligibility || engagementPoints < minEpRequired) && styles.disabledBtn]}
          onPress={handleInitiatePayment}
          disabled={isLoading || isCheckingEligibility || engagementPoints < minEpRequired}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Confirm & Pay</Text>}
        </TouchableOpacity>
      </ScrollView>
      </>
      )}

      <Modal visible={isPinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              placeholder="****"
              placeholderTextColor="#ccc"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsPinModalVisible(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyAndPay} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify & Pay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16, elevation: 2, borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', flex: 1, textAlign: 'center', marginRight: 56 },
  content: { padding: 16 },
  ticketCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3 },
  busHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  companyName: { fontSize: 18, fontFamily: 'Roboto-Bold' },
  routeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  routeItem: { flex: 1 },
  routeLabel: { fontSize: 12, color: '#757575' },
  routeCity: { fontSize: 16, fontFamily: 'Roboto-Bold' },
  routeDivider: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  line: { width: 2, height: 30, backgroundColor: '#eee' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 15 },
  infoCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: '#757575' },
  seatLabel: { color: '#757575', fontSize: 14 },
  seatValue: { fontFamily: 'Roboto-Bold', color: '#4CAF50' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  skeletonLine: { backgroundColor: '#e0e0e0', borderRadius: 4 },
  summaryTitle: { fontSize: 16, fontFamily: 'Roboto-Bold', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#757575' },
  summaryValue: { fontSize: 14, color: '#212121', fontFamily: 'Roboto-Medium' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 10 },
  totalLabel: { fontSize: 18, fontFamily: 'Roboto-Bold' },
  totalValue: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#4CAF50' },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, gap: 12, marginBottom: 24 },
  paymentText: { fontSize: 16, fontFamily: 'Roboto-Medium', color: '#212121' },
  payButton: { backgroundColor: '#4CAF50', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  payButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Roboto-Bold' },
  disabledBtn: { backgroundColor: '#A5D6A7' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 20, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'Roboto-Bold', marginBottom: 10 },
  pinInput: { borderBottomWidth: 2, borderBottomColor: '#4CAF50', width: '60%', textAlign: 'center', fontSize: 24, letterSpacing: 10, marginVertical: 20 },
  modalButtons: { flexDirection: 'row', gap: 20 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#eee', justifyContent: 'center' },
  verifyBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 10 },
  verifyBtnText: { color: '#fff' }
  ,
  engagementPointsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  engagementPointsText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 10,
  },
  earnMoreButton: {
    backgroundColor: '#FFC107', // A warm color to attract attention
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  earnMoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
  },
  epMessageContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  epMessageRow: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  epCheckingText: {
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    color: '#757575',
    textAlign: 'center',
  },
  epEligibleText: {
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    color: '#4CAF50',
    textAlign: 'center',
  },
  epWarningText: {
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    color: '#F44336',
    textAlign: 'center',
    // Removed marginBottom: 8, as marginTop is added to earnEpLink
  },
  earnEpLink: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFC107',
    marginTop: 8, // Added marginTop for spacing
  },
  earnEpLinkText: {
    fontSize: 13,
    fontFamily: 'Roboto-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  epIcon: {
    marginBottom: 8,
  },
});