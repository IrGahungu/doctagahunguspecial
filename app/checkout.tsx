import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { useCartStore } from '@/stores/cartStore';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '@/config';
import * as SecureStore from 'expo-secure-store';
import ConfettiCannon from 'react-native-confetti-cannon';

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

const CheckoutSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.content}>
      <View style={[styles.summaryCard, { height: 180 }]}>
        <View style={[styles.skeletonLine, { width: '60%', height: 18, marginBottom: 15 }]} />
        <View style={[styles.skeletonLine, { width: '80%', height: 14, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '70%', height: 14, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 18, marginTop: 10 }]} />
      </View>

      <View style={[styles.paymentMethodCard, { height: 60, marginBottom: 24 }]}>
        <View style={[styles.skeletonLine, { width: 30, height: 30, borderRadius: 15, marginRight: 12 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 20 }]} />
      </View>
      <View style={[styles.skeletonLine, { width: '100%', height: 55, borderRadius: 15 }]} />
    </View>
  </SkeletonPulse>
);

export default function CheckoutScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearItems);
  const { total, subtotal, serviceFee } = useLocalSearchParams<{
    total: string;
    subtotal: string;
    serviceFee: string;
  }>();

  const [isLoading, setIsLoading] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const handleInitiatePayment = async () => {
   
        if (!total || !subtotal || !serviceFee) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Missing order details.',
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
              text2: 'Please log in to complete your order.',
            });
            router.replace('/auth');
            return;
          }
    
          // 1️⃣ Fetch wallet balance
          const walletRes = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
    
          const walletText = await walletRes.text();
          console.log('Wallet raw response:', walletText.slice(0, 300));
          let walletData;
          try {
            walletData = JSON.parse(walletText);
          } catch (err) {
            console.error('Failed to parse wallet JSON:', err);
            Toast.show({
              type: 'error',
              text1: 'Wallet Error',
              text2: 'Unexpected server response.',
            });
            return;
          }
    
          if (!walletRes.ok || walletData.wallet_balance === undefined) {
            Toast.show({
              type: 'error',
              text1: 'Wallet Error',
              text2: walletData.error || 'Failed to fetch wallet balance.',
            });
            return;
          }
    
          const balance = Number(walletData.wallet_balance);
          const orderTotal = parseFloat(Array.isArray(total) ? total[0] : total);
    
          if (balance < orderTotal) {
            Toast.show({
              type: 'error',
              text1: 'Insufficient Balance',
              text2: 'Please add funds to your wallet before confirming.',
            });
            return;
          }
    
          // If balance is sufficient, show PIN modal
          setPin('');
          setIsPinModalVisible(true);
        } catch (error) {
          console.error('Payment initiation error:', error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to verify wallet balance.',
          });
        } finally {
          setIsLoading(false);
        }
  };

  const handleVerifyAndPay = async () => {
    const orderTotal = parseFloat(Array.isArray(total) ? total[0] : total);
    if (!pin || pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      
      // 1️⃣ Verify PIN
      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin_code: pin }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect.');
        setIsLoading(false);
        return;
      }

      // 2️⃣ Create order
          const orderDetails = {
            items: items.map((item) => ({
              stock_id: (item.product as any).stock_id || item.product.id,
              quantity: item.quantity,
              price: Number(item.product.price),
            })),
            subtotal: parseFloat(Array.isArray(subtotal) ? subtotal[0] : subtotal),
            service_fee: parseFloat(Array.isArray(serviceFee) ? serviceFee[0] : serviceFee),
            total_amount: orderTotal,
            payment_method: 'wallet',
          };
    
          console.log('Sending order payload:', JSON.stringify(orderDetails, null, 2));

          const orderRes = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(orderDetails),
          });
    
          const orderText = await orderRes.text();
          console.log('Order creation raw response:', orderText.slice(0, 300));
          let orderData;
          try {
            orderData = JSON.parse(orderText);
          } catch (err) {
            console.error('Failed to parse order JSON:', err);
            Toast.show({
              type: 'error',
              text1: 'Order Error',
              text2: 'Unexpected server response.',
            });
            return;
          }
    
          if (!orderRes.ok) {
            // Use the error message from the server if available
            Toast.show({
              type: 'error',
              text1: 'Order Failed',
              text2: orderData.error || 'Failed to create order. Please try again.',
            });
            return;
          }
    
          clearCart();
          setIsPinModalVisible(false);
          setShowConfetti(true);
    
          Toast.show({
            type: 'success',
            text1: 'Payment Successful 🎉',
            text2: `Your order #${orderData.order_id} has been placed!`,
          });
    
          setTimeout(() => router.replace('/orders'), 3000);
        } catch (error) {
          console.error('Payment confirmation error:', error);
          Toast.show({
            type: 'error',
            text1: 'Payment Failed',
            text2: 'Please try again.',
          });
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
        <Text style={styles.headerTitle}>Confirm Payment</Text>
      </View>

      {isLoading ? (
        <CheckoutSkeleton />
      ) : (
        <>
          {showConfetti && <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} />}

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>BIF {parseFloat(subtotal).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Medicine Service Fee</Text>
                <Text style={styles.summaryValue}>BIF {parseFloat(serviceFee).toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>BIF {parseFloat(total).toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.paymentMethodCard}>
              <Wallet size={24} color="#4CAF50" />
              <Text style={styles.paymentMethodText}>Paying with Gahungu Wallet</Text>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleInitiatePayment}
            >
              <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}

      <Modal
        visible={isPinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Wallet PIN</Text>
            <Text style={styles.modalSubtitle}>Please enter your 4-digit PIN to confirm payment.</Text>
            
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
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setIsPinModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.verifyButton]} 
                onPress={handleVerifyAndPay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Pay</Text>
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
  header: { backgroundColor: '#E0F7FA', paddingTop: 40, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16, elevation: 2, borderWidth: 1, position: 'absolute', left: 16, top: 16, zIndex: 1 },
  headerTitle: { flex: 1, fontFamily: 'Roboto-Medium', fontSize: 18, color: 'black', top: -15, textAlign: 'center' },
  content: { padding: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  skeletonLine: { backgroundColor: '#e0e0e0', borderRadius: 4 },
  summaryTitle: { fontSize: 18, fontFamily: 'Roboto-Bold', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 16, fontFamily: 'Roboto-Regular', color: '#616161' },
  summaryValue: { fontSize: 16, fontFamily: 'Roboto-Medium' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  totalLabel: { fontSize: 18, fontFamily: 'Roboto-Bold' },
  totalValue: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#4CAF50' },
  paymentMethodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, elevation: 2 },
  paymentMethodText: { fontSize: 16, fontFamily: 'Roboto-Medium', marginLeft: 12 },
  confirmButton: { backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
  disabledButton: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Roboto-Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontFamily: 'Roboto-Bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  pinInput: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 16, fontSize: 24, textAlign: 'center', letterSpacing: 10, marginBottom: 24, fontFamily: 'Roboto-Bold' },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', marginRight: 12 },
  verifyButton: { backgroundColor: '#4CAF50', marginLeft: 12 },
  cancelButtonText: { color: '#333', fontFamily: 'Roboto-Medium', fontSize: 16 },
  verifyButtonText: { color: '#fff', fontFamily: 'Roboto-Medium', fontSize: 16 },
});
