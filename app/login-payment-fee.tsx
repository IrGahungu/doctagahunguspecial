import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Wallet, ShieldCheck, ArrowRight, Eye, EyeOff, PlusCircle, LogOut } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import { supabase } from '@/lib/supabase';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

const LOGIN_FEE_MAP: { [country: string]: number } = {
  Burundi: 1000,
  Rwanda: 500,
  Tanzania: 300,
  Kenya: 200,
  Sudan: 5000,
  Congo: 10000,
  Somalia: 5000,
};

const currencyMap: { [country: string]: string } = {
  Burundi: 'FBU',
  Rwanda: 'RWF',
  Tanzania: 'TSH',
  Kenya: 'KSH',
};

export default function LoginPaymentFeeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [country, setCountry] = useState<string>('Burundi');
  const [userId, setUserId] = useState<string | null>(null);
  const [fee, setFee] = useState<number>(1000);
  const [isDefaultPin, setIsDefaultPin] = useState<boolean>(false);
  
  // New states for privacy and PIN
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinPurpose, setPinPurpose] = useState<'reveal' | 'pay' | null>(null);
  const [pin, setPin] = useState('');
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const currency = currencyMap[country] || 'USD';

  const fetchData = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const storedCountry = await SecureStore.getItemAsync('user_country');
      if (storedCountry) setCountry(storedCountry);

      if (!token) {
        router.replace('/auth');
        return;
      }

      // Fetch dynamic access fee
      if (storedCountry) {
        const { data: feeData, error: feeError } = await supabase
          .from('service_fees')
          .select('fee')
          .eq('country', storedCountry)
          .eq('service_type', 'access')
          .single();
        
        if (!feeError && feeData) {
          setFee(Number(feeData.fee));
        }
      }

      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setWalletBalance(Number(data.wallet_balance));
        setUserId(data.id);
        setIsDefaultPin(data.is_default_pin);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFetchingData(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Real-time updates for the access fee
  useEffect(() => {
    if (!country) return;
    
    const feeChannel = supabase
      .channel('access-fee-updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'service_fees', 
          filter: `country=eq.${country}` 
        },
        (payload) => {
          const updatedFee = payload.new as any;
          if (updatedFee && updatedFee.service_type === 'access') {
            setFee(Number(updatedFee.fee));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feeChannel);
    };
  }, [country]);

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }
    
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin_code: pin }),
      });

      if (res.ok) {
        setPinModalVisible(false);
        
        if (pinPurpose === 'reveal') {
          setIsBalanceVisible(true);
          setPin('');
        } else if (pinPurpose === 'pay') {
          await executePayment();
        }
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Incorrect PIN');
        setPin('');
      }
    } catch (err) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async () => {
    if (walletBalance < fee) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${fee} ${currency} to enter. Your current balance is ${walletBalance} ${currency}. Please contact support to top up.`
      );
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await fetch(`${API_BASE_URL}/wallet/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: fee,
          reason: 'App Access Login Fee',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        /*
        // Store payment timestamp for 24-hour validity
        if (userId) {
          await SecureStore.setItemAsync(`last_login_payment_${userId}`, Date.now().toString());
        }
        */

        Toast.show({
          type: 'success',
          text1: 'Payment Successful',
          text2: 'Welcome to Gahungu Pharmacy!',
        });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Payment Failed', data.error || 'Something went wrong');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setPin('');
      setPinPurpose(null);
    }
  };

  const handleCloseModal = () => {
    setPinModalVisible(false);
    setPin('');
    setPinPurpose(null);
  };

  const handlePayFeePress = () => {
    if (isDefaultPin) {
      Alert.alert(
        'Security Alert',
        'Your PIN is currently "1616" (default). For your security, you must change it before you can pay the access fee.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change PIN', onPress: () => router.push({ pathname: '/pin-management', params: { forceChangeDefaultPin: 'true' } }) },
        ]
      );
      return;
    }

    if (walletBalance < fee) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${fee} ${currency} to enter. Your current balance is ${walletBalance} ${currency}. Please contact support to top up.`
      );
      return;
    }
    setPinPurpose('pay');
    setPinModalVisible(true);
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            // Clear global state and token
            useAuthStore.getState().setUserId(null);
            useCartStore.getState().clearItems();
            await SecureStore.deleteItemAsync("token");
            router.replace("/auth");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleWhatsAppContact = () => {
    Linking.openURL('https://wa.me/25777990118');
  };

  if (fetchingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ShieldCheck size={48} color="#4CAF50" />
        <Text style={styles.title}>Secure Access Fee</Text>
        <Text style={styles.subtitle}>
          To ensure the best service, a small login access fee is required to continue.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Access Fee</Text>
          <Text style={styles.feeAmount}>{fee.toLocaleString()} {currency}</Text>
        </View>
        
        <View style={styles.divider} />

        <View style={styles.walletInfo}>
          <View style={styles.walletRow}>
            <View style={styles.walletHeader}>
              <Wallet size={20} color="#212121" />
              <Text style={styles.walletTitle}>Gahungu Wallet</Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => {
                if (isBalanceVisible) {
                  setIsBalanceVisible(false);
                } else {
                  setPinPurpose('reveal');
                  setPinModalVisible(true);
                }
              }}
              style={styles.eyeButton}
            >
              {isBalanceVisible ? <EyeOff size={20} color="#4CAF50" /> : <Eye size={20} color="#757575" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceText}>
            Available Balance: <Text style={styles.balanceValue}>
              {isBalanceVisible ? `${walletBalance.toLocaleString()} ${currency}` : '****'}
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {isDefaultPin 
              ? 'Notice: Your default wallet PIN is 1616. Please change it to continue.'
              : 'This fee supports the maintenance of Dr. Gahungu\'s pharmacy network and 24/7 availability.'}
          </Text>
        </View>
      </View>

      {isDefaultPin && (
        <View style={styles.warningBox}>
          <ShieldCheck size={20} color="#F44336" />
          <Text style={styles.warningText}>Default PIN: 1616. Change it now!</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.payButton, loading && styles.disabledButton]} 
        onPress={handlePayFeePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.payButtonText}>{isDefaultPin ? 'Change PIN to Continue' : 'Pay & Enter App'}</Text>
            <ArrowRight size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <LogOut size={20} color="#d32f2f" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {walletBalance < fee && (
        <TouchableOpacity 
          style={styles.addMoneyButton} 
          onPress={() => Toast.show({ type: 'info', text1: 'Redirecting...', text2: 'Please use the main wallet to add funds.' })}
        >
          <PlusCircle size={20} color="#2196F3" />
          <Text style={styles.addMoneyText}>Add Money to Wallet</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={pinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Wallet Security</Text>
            <Text style={styles.modalSubtitle}>
              {pinPurpose === 'pay' ? 'Enter PIN to authorize payment' : 'Enter PIN to show balance'}
            </Text>
            
            <TextInput
              style={styles.pinInput}
              value={pin}
              placeholder="****"
              placeholderTextColor="#ccc"
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoFocus
            />

            <TouchableOpacity 
              onPress={() => { setPinModalVisible(false); setSupportModalVisible(true); }} 
              style={styles.forgotPinContainer}
            >
              <Text style={styles.forgotPinText}>Forgot PIN?</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={handleCloseModal}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalVerify} onPress={handlePinSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalVerifyText}>Verify</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={supportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Contact Admin</Text>
            <Text style={styles.modalSubtitle}>
              Would you like to open WhatsApp to contact the admin at +25777990118?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSupportModalVisible(false)}>
                <Text>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalVerify} onPress={() => { handleWhatsAppContact(); setSupportModalVisible(false); }}>
                <Text style={styles.modalVerifyText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA', padding: 24, justifyContent: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F7FA' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#212121', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#616161', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  feeLabel: { fontSize: 18, color: '#212121' },
  feeAmount: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  walletInfo: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 12 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletTitle: { fontSize: 16, fontWeight: '600', color: '#212121' },
  eyeButton: { padding: 4 },
  balanceText: { fontSize: 14, color: '#757575' },
  balanceValue: { fontWeight: 'bold', color: '#2e7d32' },
  infoBox: { paddingHorizontal: 8 },
  infoText: { fontSize: 12, color: '#9E9E9E', textAlign: 'center', fontStyle: 'italic' },
  infoContainer: { marginTop: 24, height: 40 },
  payButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 12,
    elevation: 2,
  },
  disabledButton: { backgroundColor: '#A5D6A7' },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  addMoneyText: { color: '#2196F3', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#757575', marginBottom: 20 },
  pinInput: { width: '80%', height: 50, borderBottomWidth: 2, borderBottomColor: '#4CAF50', fontSize: 24, textAlign: 'center', marginBottom: 30, letterSpacing: 10 },
  modalActions: { flexDirection: 'row', gap: 20, width: '100%' },
  modalCancel: { flex: 1, height: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', borderRadius: 10, marginBottom: 20 },
  modalVerify: { flex: 1, height: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', borderRadius: 10, marginBottom: 20 },
  modalVerifyText: { color: '#fff', fontWeight: 'bold' },
  forgotPinContainer: { marginBottom: 20 },
  forgotPinText: { color: '#757575', fontSize: 14, textDecorationLine: 'underline' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  logoutText: { color: '#d32f2f', fontSize: 16, fontWeight: '600' },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  warningText: { flex: 1, fontSize: 13, color: '#E65100', fontWeight: 'bold' },
});
