import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from '@/components/Toast';
import { useToastStore } from '@/stores/toastStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';

type InsurancePlan = {
  type: string;
  price: number;
  description: string;
  coverage?: string[];
};

type InsuranceLocation = {
  location: string;
  plans: InsurancePlan[];
};

type Insurance = {
  id: string;
  name: string | null;
  image: string | null;
  locations: InsuranceLocation[] | null;
};

export default function InsuranceDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [insurance, setInsurance] = useState<Insurance | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);

  // State for the lock mechanism
  const [showDetails, setShowDetails] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const VIEW_FEE = 500;
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchInsurance = async () => {
      const { data, error } = await supabase
        .from('insurances')
        .select('id, name, image, locations')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching insurance details:', error.message);
        setInsurance(null);
      } else if (data) {
        setInsurance(data);
      }
      setLoading(false);
    };

    fetchInsurance();

    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });

    const channel = supabase
      .channel(`insurance-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insurances', filter: `id=eq.${id}` }, fetchInsurance)
      .subscribe();

    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
      supabase.removeChannel(channel);
    };
  }, [id, navigation]);

  // Lock modal handler
  const handleLockPress = async () => {
    setIsModalVisible(true);
    setIsBalanceLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        showToast("Please log in to view details.");
        router.push('/auth');
        setIsModalVisible(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.wallet_balance || 0);
        setWalletBalance(Number(data.wallet_balance) || 0);
      } else {
        showToast("Could not fetch wallet balance.");
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      showToast("An error occurred.");
      setIsModalVisible(false);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  // Handle payment to view
  const handleConfirmViewPayment = async () => {
    if (walletBalance === null || walletBalance < VIEW_FEE) {
      showToast("Insufficient wallet balance.");
      return;
    }
    if (!pinCode) {
      showToast("Please enter your PIN code.");
      return;
    }


    setIsPaying(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        showToast("Authentication error. Please log in again.");
        router.push('/auth');
        return;
      }

      // Step 1: Verify the PIN first
      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: pinCode }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || "Incorrect PIN.");
      }

      // Step 2: If PIN is correct, proceed with deduction
      const deductRes = await fetch(`${API_BASE_URL}/wallet/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: VIEW_FEE, reason: `View insurance ${id} details` }),
      });

      if (!deductRes.ok) {
        const errorData = await deductRes.json();
        throw new Error(errorData.error || "Payment failed after PIN verification.");
      }

      // Success!
      setShowDetails(true);
      showToast("Payment successful!");
      handleModalClose();
    } catch (error: unknown) {
      let errorMessage = "An error occurred during payment.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert("Payment Failed", errorMessage);
    } finally {
      setIsPaying(false);
    }
  };

  // Modal close handler
  const handleModalClose = () => {
    setIsModalVisible(false);
    setPinCode(''); // Clear PIN on modal close
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading...</Text>
      </View>
    );
  }

  if (!insurance) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Insurance not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Insurance Details</Text>

        {/* Placeholder for right icon to balance layout */}
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {insurance.image ? (
          <Image source={{ uri: insurance.image }} style={styles.insuranceImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}
        <View style={styles.detailsContainer}>
          <Text style={styles.insuranceName}>{insurance.name || 'Unknown Insurance'}</Text>
          {/* Locked Section */}
          <View style={styles.section}>
            <View style={styles.lockHeader}>
              <Text style={styles.sectionTitle}>Locations and Plans</Text>
              {!showDetails && (
                <TouchableOpacity onPress={handleLockPress}>
                  <Icon name="lock" size={24} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>
            {showDetails && (
              insurance.locations && insurance.locations.length > 0 ? (
                insurance.locations.map((location, index) => (
                  <View key={index} style={styles.locationContainer}>
                    <Text style={styles.locationTitle}>{location.location}</Text>
                    {location.plans.map((plan, planIndex) => (
                      <View key={planIndex} style={styles.planContainer}>
                        <Text style={styles.planType}>
                          {plan.type ? plan.type.charAt(0).toUpperCase() + plan.type.slice(1) : ''} Plan
                        </Text>
                        <Text style={styles.planPrice}>BIF {plan.price?.toLocaleString()}/month</Text>
                        <Text style={styles.planDescription}>{plan.description}</Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : <Text style={styles.noData}>No locations or plans listed</Text>
            )}
          </View>
          <Pressable
            style={styles.carButton}
            onPress={() => showToast('Dr. IR. Gahungu ariko arabikora.', 1000)}
          >
            <Text style={styles.carButtonText}>Fyonda ngaha uhamagare umuduga ugushikana</Text>
          </Pressable>
        </View>
      </ScrollView>
      {/* Lock Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeIcon} onPress={handleModalClose}>
              <Icon name="close" size={24} color="#212121" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Unlock Information</Text>
            {isBalanceLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.modalText}>
                  Pay <Text style={{ fontWeight: 'bold' }}>{VIEW_FEE} FBU</Text> to view with Gahungu Wallet.
                </Text>
                <Text style={styles.balanceText}>
                  Your balance: {walletBalance?.toLocaleString() ?? '...'} FBU
                </Text>
                <TextInput
                  style={styles.pinCodeInput}
                  placeholder="Enter your PIN code"
                  keyboardType="number-pad"
                  secureTextEntry={true}
                  value={pinCode}
                  onChangeText={setPinCode}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleModalClose} disabled={isPaying}>
                    <Text style={[styles.modalButtonText, { color: '#212121' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, (isPaying || (walletBalance !== null && walletBalance < VIEW_FEE)) && styles.disabledButton]}
                    onPress={handleConfirmViewPayment}
                    disabled={isPaying || (walletBalance !== null && walletBalance < VIEW_FEE)}
                  >
                    {isPaying ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Pay</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    zIndex: 1,
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
    flex: 1,
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    textAlign: 'center'
  },
  headerRightPlaceholder: {
    width: 40, // Same width as backButton for balance
  },
  scrollContent: {
    paddingBottom: 60
  },
  insuranceImage: {
    width: '95%',
    alignSelf: 'center',
    height: 250,
    borderRadius: 20,
    marginVertical: 16,
  },
  placeholderImage: {
    width: '95%',
    alignSelf: 'center',
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto-Regular'
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insuranceName: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 12
  },
  section: {
    marginBottom: 12,
  },
  lockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
  },
  locationContainer: {
    marginBottom: 12
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#388E3C',
    marginBottom: 8
  },
  planContainer: {
    marginLeft: 16,
    marginBottom: 8
  },
  planType: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#212121'
  },
  planPrice: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#2e7d32',
    marginTop: 2
  },
  planDescription: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginTop: 2
  },
  noData: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    fontStyle: 'italic'
  },
  carButton: {
    marginTop: 16,
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: 'green'
  },
  carButtonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
    color: '#212121',
    marginTop: 8,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    textAlign: 'center',
    marginBottom: 8,
    color: '#424242',
  },
  balanceText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#616161',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#eeeeee',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
  pinCodeInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    width: '80%',
    textAlign: 'center',
  },
});