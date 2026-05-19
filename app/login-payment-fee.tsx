import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
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
import { translations, useLanguageStore } from '@/stores/languageStore';

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);
  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const LoginFeeSkeleton = () => (
  <SkeletonPulse>
    <View style={{ alignItems: 'center', marginBottom: 40 }}>
      <View style={[styles.skeletonLine, { width: 60, height: 60, borderRadius: 30, marginBottom: 16 }]} />
      <View style={[styles.skeletonLine, { width: '60%', height: 24, marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { width: '80%', height: 16 }]} />
    </View>
    <View style={[styles.card, { height: 180, justifyContent: 'center' }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={[styles.skeletonLine, { width: '30%', height: 20 }]} />
        <View style={[styles.skeletonLine, { width: '30%', height: 20 }]} />
      </View>
      <View style={styles.divider} />
      <View style={[styles.skeletonLine, { width: '100%', height: 60, borderRadius: 12 }]} />
    </View>
    <View style={[styles.skeletonLine, { width: '100%', height: 60, borderRadius: 30, marginTop: 40 }]} />
  </SkeletonPulse>
);

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
  const [hasError, setHasError] = useState(false);
  
  // New states for privacy and PIN
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinPurpose, setPinPurpose] = useState<'reveal' | 'pay' | null>(null);
  const [pin, setPin] = useState('');
  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const currency = currencyMap[country] || 'USD';

  const fetchData = useCallback(async () => {
    try {
      setHasError(false);
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
          await SecureStore.setItemAsync('cached_access_fee', feeData.fee.toString());
        }
      }

      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setWalletBalance(Number(data.wallet_balance));
        setUserId(data.id);
        setIsDefaultPin(data.is_default_pin);

        // ✅ Check if the access fee was already paid within the last 24 hours
        const lastPayment = await SecureStore.getItemAsync(`last_login_payment_${data.id}`);
        if (lastPayment) {
          const timeElapsed = Date.now() - parseInt(lastPayment, 10);
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (timeElapsed < twentyFourHours) {
            router.replace('/(tabs)');
            return;
          }
        }

        // Cache for offline/bad network use
        await SecureStore.setItemAsync(`cached_balance_${data.id}`, data.wallet_balance.toString());
        await SecureStore.setItemAsync('userId', data.id);
      } else {
        throw new Error("Failed to fetch profile");
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setHasError(true);
      // Try to load cached data for bad network
      const cachedFee = await SecureStore.getItemAsync('cached_access_fee');
      if (cachedFee) setFee(Number(cachedFee));
      
      const storedUserId = await SecureStore.getItemAsync('userId');
      if (storedUserId) {
        setUserId(storedUserId);
        const cachedBal = await SecureStore.getItemAsync(`cached_balance_${storedUserId}`);
        if (cachedBal) setWalletBalance(Number(cachedBal));

        // ✅ Check payment validity when network is unavailable
        const lastPayment = await SecureStore.getItemAsync(`last_login_payment_${storedUserId}`);
        if (lastPayment) {
          const timeElapsed = Date.now() - parseInt(lastPayment, 10);
          if (timeElapsed < 24 * 60 * 60 * 1000) {
            router.replace('/(tabs)');
            return;
          }
        }
      }
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
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a 4-digit PIN',
      });
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
        try {
          const data = await res.json();
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: data.error || 'Incorrect PIN',
          });
          setPin('');
        } catch (e) {
          // Network issue during verify - trust user for payment entry
          if (pinPurpose === 'pay') {
            setPinModalVisible(false);
            await executePayment();
          } else {
            Toast.show({
              type: 'info',
              text1: 'Connection Weak',
              text2: 'Cannot verify PIN right now.',
            });
            setPin('');
          }
        }
      }
    } catch (err) {
      if (pinPurpose === 'pay') {
        setPinModalVisible(false);
        await executePayment();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Connection failed',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async () => {
    const newLocalBalance = walletBalance - fee;
    if (walletBalance < fee) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `You need ${fee} ${currency} to enter.`,
      });
      return;
    }

    setLoading(true);
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

      if (res.ok) {
        // Store payment timestamp for 24-hour validity
        if (userId) {
          await SecureStore.setItemAsync(`last_login_payment_${userId}`, Date.now().toString());
          await SecureStore.setItemAsync(`cached_balance_${userId}`, newLocalBalance.toString());
        }

        setWalletBalance(newLocalBalance);
        Toast.show({
          type: 'success',
          text1: 'Payment Successful',
          text2: 'Welcome to Gahungu Pharmacy!',
        });
        router.replace('/(tabs)');
      } else {
        const data = await res.json();
        Toast.show({
          type: 'error',
          text1: 'Payment Failed',
          text2: data.error || 'Something went wrong',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Internet Required',
        text2: 'Please connect to the internet to validate access.',
      });
    } finally {
      setLoading(false);
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
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `You need ${fee} ${currency} to enter.`,
      });
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
      <SafeAreaView style={styles.container}>
        <LoginFeeSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ShieldCheck size={48} color="#4CAF50" /> {/* No translation needed for icon */}
        <Text style={styles.title}>{t["secure access fee"]}</Text>
        <Text style={styles.subtitle}>
          {t["access fee message"]}
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
            <View style={styles.walletHeader}> {/* No translation needed for icon */}
              <Wallet size={20} color="#212121" /> {/* No translation needed for icon */}
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
              {/* No translation needed for icon */}
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
              ? t["default pin notice"]
              : t["fee support message"]}
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
            <Text style={styles.payButtonText}>{isDefaultPin ? t["change pin to continue"] : t["pay and enter app"]}</Text>
            <ArrowRight size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <LogOut size={20} color="#d32f2f" />
        <Text style={styles.logoutText}>{t.logout}</Text>
      </TouchableOpacity>

      {hasError && (
        <TouchableOpacity
          style={styles.retryButton} 
          onPress={() => { setFetchingData(true); fetchData(); }}
        >
          <PlusCircle size={20} color="#F44336" />
          <Text style={styles.retryText}>Retry Connection</Text>
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
            <Text style={styles.modalTitle}>{t["wallet security"]}</Text>
            <Text style={styles.modalSubtitle}>
              {pinPurpose === 'pay' ? t["enter pin to pay"] : t["enter pin to show balance"]}
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
              <Text style={styles.forgotPinText}>{t["forgot pin"]}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={handleCloseModal}>
                <Text>{t.cancel}</Text>
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
            <Text style={styles.modalTitle}>{t["contact admin"]}</Text>
            <Text style={styles.modalSubtitle}>
              {t["contact admin whatsapp"]}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSupportModalVisible(false)}>
                <Text>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalVerify} onPress={() => { handleWhatsAppContact(); setSupportModalVisible(false); }}>
                <Text style={styles.modalVerifyText}>{t.verify}</Text>
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
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  retryText: { color: '#F44336', fontSize: 16, fontWeight: '600' },
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
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});
