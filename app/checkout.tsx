import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { useCartStore } from '@/stores/cartStore';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '@/config';
import * as SecureStore from 'expo-secure-store';

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

  const handleConfirmPayment = async () => {
    Toast.show({
      type: 'info',
      text1: 'Processing...',
      text2: 'Dr.Gahungu ariko arabikora',
    });

    // The rest of the payment logic is disabled for now.
    // To re-enable, uncomment the block below.
    /*
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
          const orderTotal = parseFloat(total);
    
          if (balance < orderTotal) {
            Toast.show({
              type: 'error',
              text1: 'Insufficient Balance',
              text2: 'Please add funds to your wallet before confirming.',
            });
            return;
          }
    
          // 2️⃣ Create order (backend will handle wallet deduction)
          const orderDetails = {
            items: items.map((item) => ({
              medicine_id: item.product.id,
              quantity: item.quantity,
              price: item.product.price,
            })),
            subtotal: parseFloat(subtotal),
            service_fee: parseFloat(serviceFee),
            total_amount: orderTotal,
            payment_method: 'wallet',
          };
    
    
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
    
          Toast.show({
            type: 'success',
            text1: 'Payment Successful 🎉',
            text2: `Your order #${orderData.order_id} has been placed!`,
          });
    
          setTimeout(() => router.replace('/orders'), 1500);
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
    */
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Payment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>BIF {parseFloat(subtotal).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
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
          style={[styles.confirmButton, isLoading && styles.disabledButton]}
          onPress={handleConfirmPayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
});
