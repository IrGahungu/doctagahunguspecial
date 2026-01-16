import React, { useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Linking,
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
import ConfettiCannon from 'react-native-confetti-cannon';


type Location = {
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
};

type OpeningHour = {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
  is24Hours?: boolean;
};

type Pharmacy = {
  id: string;
  name: string;
  image: string | null;
  location: Location[] | null;
  accepted_insurances: string[] | null;
  opening_hours: OpeningHour[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_office: string | null;
  contact_website: string | null;
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
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
      if (!showDetails) {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
        return () => pulse.stop();
      }
    }, [showDetails]);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setError("Pharmacy ID not provided.");
      setLoading(false);
      return;
    }

    const incrementView = async () => {
      const { error } = await supabase.rpc('increment_pharmacy_view', { row_id: id });
      if (error) console.error('Error incrementing views:', error);
    };
    incrementView();

    const fetchPharmacyDetails = async () => {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from('pharmacy_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError) {
        console.error('Error fetching pharmacy details:', dbError);
        setError('Failed to load pharmacy information.');
      } else {
        let parsedLocation = data.location;
        if (typeof parsedLocation === 'string') {
          try {
            parsedLocation = JSON.parse(parsedLocation);
          } catch (e) {
            parsedLocation = [];
          }
        }

        let parsedInsurances = data.accepted_insurances;
        if (typeof parsedInsurances === 'string') {
          try {
            parsedInsurances = JSON.parse(parsedInsurances);
          } catch (e) {
            parsedInsurances = [];
          }
        }

        let parsedHours = data.opening_hours;
        if (typeof parsedHours === 'string') {
          try {
            parsedHours = JSON.parse(parsedHours);
          } catch (e) {
            parsedHours = [];
          }
        }

        setPharmacy({
          ...data,
          location: Array.isArray(parsedLocation) ? parsedLocation : [],
          accepted_insurances: Array.isArray(parsedInsurances) ? parsedInsurances : [],
          opening_hours: Array.isArray(parsedHours) ? parsedHours : [],
        } as Pharmacy);
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
          table: 'pharmacy_applications',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setPharmacy(null);
            setError('This pharmacy has been removed.');
          } else if (payload.new) {
            const newData = payload.new;
            let parsedLocation = newData.location;
            if (typeof parsedLocation === 'string') {
              try {
                parsedLocation = JSON.parse(parsedLocation);
              } catch (e) {
                parsedLocation = [];
              }
            }

            let parsedInsurances = newData.accepted_insurances;
            if (typeof parsedInsurances === 'string') {
              try {
                parsedInsurances = JSON.parse(parsedInsurances);
              } catch (e) {
                parsedInsurances = [];
              }
            }

            let parsedHours = newData.opening_hours;
            if (typeof parsedHours === 'string') {
              try {
                parsedHours = JSON.parse(parsedHours);
              } catch (e) {
                parsedHours = [];
              }
            }

            setPharmacy({
              ...newData,
              location: Array.isArray(parsedLocation) ? parsedLocation : [],
              accepted_insurances: Array.isArray(parsedInsurances) ? parsedInsurances : [],
              opening_hours: Array.isArray(parsedHours) ? parsedHours : [],
            } as Pharmacy);
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
    console.log("Starting payment process...");
    if (walletBalance === null || walletBalance < VIEW_FEE) {
      showToast("Insufficient wallet balance.");
      return;
    }
    if (!pinCode) {
      showToast("Please enter your PIN code.");
      return;
    }

    setIsPaying(true);
    console.log(`Attempting to pay ${VIEW_FEE} with PIN: ${pinCode}`);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        showToast("Authentication error. Please log in again.");
        router.push('/auth');
        return;
      }

      // Step 1: Verify the PIN first
      console.log("Step 1: Verifying PIN...");
      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin_code: pinCode }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || "Incorrect PIN.");
      }

      console.log("PIN verification successful.");

      // Step 2: If PIN is correct, proceed with deduction
      const deductionPayload = { amount: VIEW_FEE, reason: `View doctor ${id} details`, pin: pinCode };
      console.log("Step 2: Proceeding with deduction. Payload:", JSON.stringify(deductionPayload));
      const deductRes = await fetch(`${API_BASE_URL}/wallet/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deductionPayload),
      });

      if (!deductRes.ok) {
        console.error("Deduction failed. Status:", deductRes.status);
        const errorData = await deductRes.json();
        console.error("Deduction error response:", errorData);
        throw new Error(errorData.error || "Payment failed after PIN verification.");
      }

      // Success!
      setShowDetails(true);
      setShowConfetti(true);
      console.log("Payment successful! Unlocking details.");
      showToast("Payment successful!");
      handleModalClose();
    } catch (error: unknown) {
      let errorMessage = "An error occurred during payment.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("An error occurred during payment:", errorMessage);
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

  const handleContactPress = () => {
    Alert.alert('Alert', 'I may the app');
  };

  const openMap = (loc: Location) => {
    const query = loc.latitude && loc.longitude
      ? `${loc.latitude},${loc.longitude}`
      : `${loc.address || ''} ${loc.city || ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url);
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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {pharmacy.image ? (
              <Image source={{ uri: pharmacy.image }} style={styles.pharmacyImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>No Image Available</Text>
              </View>
            )}
            <View style={styles.detailsContainer}>
              {showDetails && (
                <Text style={styles.pharmacyName}>{pharmacy.name || 'Unknown Hospital'}</Text>
              )}
          {/* Locked Section */}
          <View style={styles.section}>
            <View style={styles.lockHeader}>
              {!showDetails && (
                <TouchableOpacity onPress={handleLockPress} style={{ alignItems: 'center', width: '100%', paddingVertical: 20 }}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Icon name="visibility" size={40} color="#4CAF50" />
                  </Animated.View>
                  <Text style={{ marginTop: 10, color: '#4CAF50', fontFamily: 'Roboto-Medium', fontSize: 16, textAlign: 'center' }}>
                    Click here to pay and view the doctor's details
                  </Text>
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

                  {pharmacy.location && pharmacy.location.length > 0 ? (
                    pharmacy.location.map((loc, idx) => (
                      <View key={idx} style={styles.locationItem}>
                        <Text style={styles.locationName}>{loc.city || "City not set"}</Text>
                        <Text style={styles.locationTime}>
                          {loc.address || "Address not set"}
                        </Text>
                        {loc.phone ? (
                          <Text style={[styles.locationStatus, { color: '#555', fontWeight: 'normal' }]}>
                            Tel: {loc.phone}
                          </Text>
                        ) : null}
                        <TouchableOpacity onPress={() => openMap(loc)} style={styles.mapButton}>
                          <Icon name="map" size={16} color="#fff" />
                          <Text style={styles.mapButtonText}>View on Map</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noData}>No location information available</Text>
                  )}
                </View>

                {/* Opening Hours */}
                <View style={{ marginTop: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Icon name="access-time" size={20} color="#4CAF50" />
                    <Text style={styles.subSectionTitle}>Opening Hours</Text>
                  </View>
                  <View style={{ marginLeft: 30 }}>
                    {pharmacy.opening_hours && pharmacy.opening_hours.length > 0 ? (
                      pharmacy.opening_hours.map((day, idx) => {
                        const isToday = day.day && day.day.toUpperCase() === ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()];
                        return (
                        <View key={idx} style={[
                          styles.hoursRow,
                          isToday && { backgroundColor: '#E8F5E9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: -6 }
                        ]}>
                          <Text style={[styles.dayText, isToday && { fontWeight: 'bold', color: '#2E7D32' }]}>
                            {day.day ? day.day.substring(0, 3) : ""}
                          </Text>
                          <Text style={[
                            styles.hoursText,
                            day.isClosed ? { color: 'red' } : { color: isToday ? '#2E7D32' : '#333' },
                            isToday && { fontWeight: 'bold' }
                          ]}>
                            {day.isClosed ? 'Closed' : day.is24Hours ? '24 Hours' : `${day.open} - ${day.close}`}
                          </Text>
                        </View>
                      )})
                    ) : (
                      <Text style={styles.noData}>Opening hours not available</Text>
                    )}
                  </View>
                </View>

                {/* Accepted Insurances */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 15 }}>
                  <Icon name="verified-user" style={styles.icon} color="#4CAF50" size={20} />
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

                {/* Contact Details */}
                <View style={{ marginTop: 10, marginBottom: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Icon name="contact-phone" size={20} color="#4CAF50" />
                    <Text style={styles.subSectionTitle}>Contact Details</Text>
                  </View>
                  <View style={{ marginLeft: 30 }}>
                    {pharmacy.contact_email ? (
                      <TouchableOpacity onPress={handleContactPress}>
                        <Text style={styles.contactText}>
                          Email: <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>{pharmacy.contact_email}</Text>
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {pharmacy.contact_phone ? (
                      <TouchableOpacity onPress={handleContactPress}>
                        <Text style={styles.contactText}>
                          Phone: <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>{pharmacy.contact_phone}</Text>
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {pharmacy.contact_office ? <Text style={styles.contactText}>Office: {pharmacy.contact_office}</Text> : null}
                    {pharmacy.contact_website ? (
                      <TouchableOpacity onPress={handleContactPress}>
                        <Text style={styles.contactText}>
                          Website: <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>{pharmacy.contact_website}</Text>
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {!pharmacy.contact_email && !pharmacy.contact_phone && !pharmacy.contact_office && !pharmacy.contact_website && <Text style={styles.noData}>No contact details available</Text>}
                  </View>
                </View>

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
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
          onAnimationEnd={() => setShowConfetti(false)}
        />
      )}
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
  contactText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingRight: 10,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    width: 50,
  },
  hoursText: {
    fontSize: 15,
    color: '#555',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  mapButtonText: { color: '#fff', marginLeft: 5, fontSize: 12, fontWeight: 'bold' },
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
