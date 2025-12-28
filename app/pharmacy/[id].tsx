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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import { useToastStore } from '@/stores/toastStore';
import Toast from '@/components/Toast';

type Location = {
  name: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
};

type Pharmacy = {
  id: string;
  name: string;
  image: string | null;
  locations: Location[] | null;
  accepted_insurances: string[] | null;
};

export default function PharmacyDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const showToast = useToastStore(state => state.showToast);

  // State for the lock mechanism
  const [showDetails, setShowDetails] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const VIEW_FEE = 500;
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setError("Pharmacy ID not provided.");
      setLoading(false);
      return;
    }

    const fetchPharmacyDetails = async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError) {
        console.error('Error fetching pharmacy details:', dbError);
        setError('Failed to load pharmacy information.');
      } else {
        setPharmacy(data as Pharmacy);
      }
      setLoading(false);
    };

    fetchPharmacyDetails();

    // Real-time subscription
    const channel = supabase
      .channel(`pharmacy-details-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pharmacies',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPharmacy(null);
            setError('This pharmacy has been removed.');
          } else if (payload.new) {
            setPharmacy(payload.new as Pharmacy);
          }
        }
      )
      .subscribe();

    const parentNav = navigation.getParent();
    parentNav?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      supabase.removeChannel(channel);
      parentNav?.setOptions({ tabBarStyle: undefined });
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
        body: JSON.stringify({ amount: VIEW_FEE, reason: `View pharmacy ${id} details` }),
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

  if (error || !pharmacy) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: 'red' }}>
          {error || 'Pharmacy not found.'}
        </Text>
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

        <Text style={styles.headerTitle}>Pharmacy Details</Text>

        {/* Placeholder for right icon to balance layout */}
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Section */}
        {pharmacy.image ? (
          <Image
            source={{ uri: pharmacy.image }}
            style={styles.pharmacyImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="local-pharmacy" size={40} color="#666" />
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {/* Pharmacy Name */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Icon name="local-pharmacy" size={25} color='red' style={styles.icon} />
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
          </View>

          {/* Locked Section */}
          <View style={styles.section}>
            <View style={styles.lockHeader}>
              <Text style={styles.sectionTitle}>Location & Insurance Details</Text>
              {!showDetails && (
                <TouchableOpacity onPress={handleLockPress}>
                  <Icon name="lock" size={24} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>

            {showDetails && (
              <>
                {/* Locations */}
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Icon name="location-on" size={20} color="#4CAF50" />
                    <Text style={styles.subSectionTitle}>Locations</Text>
                  </View>

                  {pharmacy.locations && pharmacy.locations.length > 0 ? (
                    pharmacy.locations.map((loc, idx) => (
                      <View key={idx} style={styles.locationItem}>
                        <Text style={styles.locationName}>{loc.name}</Text>
                        <Text style={styles.locationTime}>
                          {loc.openingTime} - {loc.closingTime}
                        </Text>
                        <Text
                          style={[
                            styles.locationStatus,
                            { color: loc.isOpen ? 'green' : 'red' },
                          ]}
                        >
                          {loc.isOpen ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noData}>No location information available</Text>
                  )}
                </View>

                {/* Accepted Insurances */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 15 }}>
                  <Icon name="verified-user" style={styles.icon} color='red' />
                  <Text style={styles.subSectionTitle}>Accepted Insurances</Text>
                </View>
                {pharmacy.accepted_insurances && pharmacy.accepted_insurances.length > 0 ? (
                  pharmacy.accepted_insurances.map((insurance, index) => (
                    <View key={index} style={styles.insuranceItem}>
                      <Icon name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.insuranceText}>{insurance}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noData}>No insurance information available</Text>
                )}
              </>
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
                  Pay <Text style={{ fontWeight: 'bold' }}> {VIEW_FEE} FBU</Text> to view with Gahungu Wallet.
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
    backgroundColor: '#E0F7FA',
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
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40, // Same width as backButton for balance
  },
  scrollContent: {
    paddingBottom: 16,
  },
  pharmacyImage: {
    width: '95%',
    alignSelf: 'center',
    height: 250,
    borderRadius: 20,
    marginVertical: 16,
  },
  placeholderImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto-Regular',
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
    marginBottom: 50,
  },
  pharmacyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  lockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subSectionTitle: {
    fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333'
  },
  locationItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginLeft: 30,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationTime: {
    fontSize: 14,
    color: '#555',
  },
  locationStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  insuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 30,
  },
  insuranceText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#555',
  },
  noData: {
    color: '#888',
    fontStyle: 'italic',
    marginLeft: 30,
  },
  icon: {
    marginRight: 8,
    fontSize: 25,
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
