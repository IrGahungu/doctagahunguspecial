import React, { useEffect, useState, useRef} from 'react';
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
   Animated,
   Linking,
   Dimensions,
   Platform,
} from 'react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from '@/components/Toast';
import { useToastStore } from '@/stores/toastStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';
import MapView, { Marker } from 'react-native-maps';
import { API_BASE_URL } from '@/config';
import ConfettiCannon from 'react-native-confetti-cannon';

type Insurance = {
  id: string;
  name: string | null;
  image: string | null;
  country: string | null;
  insurance_plans: string | null;
  coverage_summary: string | null;
  claim_process: string | null;
  partner_hospitals: string | null;
  partner_pharmacies: string | null;
  contact_details: string | null;
  office_locations: string | null;
};

const formatPrice = (value: string) => {
  const rawValue = value.replace(/,/g, "");
  if (/^\d+$/.test(rawValue)) {
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return value;
};

const getCurrencyForCountry = (country: string | null) => {
  const c = (country || "").toLowerCase();
  if (c.includes("rwanda")) return "RWF";
  if (c.includes("burundi")) return "BIF";
  if (c.includes("kenya")) return "KES";
  if (c.includes("uganda")) return "UGX";
  if (c.includes("tanzania")) return "TZS";
  if (c.includes("congo") || c.includes("drc")) return "CDF";
  return "USD";
};

const INSURANCE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/insurance-images/";

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
    if (id) {
      supabase.rpc('increment_insurance_views', { row_id: id }).then(({ error }) => {
        if (error) console.error('Error incrementing views:', error);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;


    const fetchInsurance = async () => {
      const { data, error } = await supabase
        .from('insurance_applications')
        .select('id, name, image, country, insurance_plans, coverage_summary, claim_process, partner_hospitals, partner_pharmacies, contact_details, office_locations')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insurance_applications', filter: `id=eq.${id}` }, fetchInsurance)
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

  // Parse JSON data for display
  let parsedPlans: { title: string; description: string; price?: string; currency?: string }[] = [];
  let parsedContact: { email?: string; phone?: string; office?: string; website?: string } = {};
  let parsedHospitals: string[] = [];
  let parsedPharmacies: string[] = [];
  let parsedLocations: { type: string; city: string; address: string; phone: string; latitude: string; longitude: string }[] = [];

  if (insurance) {
    try {
      if (insurance.insurance_plans && insurance.insurance_plans.trim().startsWith('[')) {
        parsedPlans = JSON.parse(insurance.insurance_plans);
      } else if (insurance.insurance_plans) {
        parsedPlans = [{ title: 'Standard Plan', description: insurance.insurance_plans, price: '' }];
      }
    } catch (e) { console.error("Error parsing plans", e); }

    try {
      if (insurance.contact_details && insurance.contact_details.trim().startsWith('{')) {
        parsedContact = JSON.parse(insurance.contact_details);
      } else if (insurance.contact_details) {
        parsedContact = { office: insurance.contact_details };
      }
    } catch (e) { console.error("Error parsing contact", e); }

    try {
      if (insurance.partner_hospitals && insurance.partner_hospitals.trim().startsWith('[')) {
        parsedHospitals = JSON.parse(insurance.partner_hospitals);
      } else if (insurance.partner_hospitals) {
        // Fallback for legacy text
        parsedHospitals = insurance.partner_hospitals.split('\n').map(s => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
      }
    } catch (e) { parsedHospitals = []; }

    try {
      if (insurance.partner_pharmacies && insurance.partner_pharmacies.trim().startsWith('[')) {
        parsedPharmacies = JSON.parse(insurance.partner_pharmacies);
      } else if (insurance.partner_pharmacies) {
        // Fallback for legacy text
        parsedPharmacies = insurance.partner_pharmacies.split('\n').map(s => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
      }
    } catch (e) { parsedPharmacies = []; }

    try {
      if (insurance.office_locations) {
        parsedLocations = JSON.parse(insurance.office_locations);
      }
    } catch (e) { parsedLocations = []; }
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
          <Image source={{ uri: insurance.image && !insurance.image.startsWith('http') ? `${INSURANCE_URL_PREFIX}${insurance.image}` : insurance.image }} style={styles.insuranceImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}
        <View style={styles.detailsContainer}>
          {showDetails && (
            <Text style={styles.insuranceName}>{insurance.name || 'Unknown Insurance'}</Text>
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
                    Click here to pay and view the insurance's details
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {showDetails && (
              <View>
                {/* Insurance Plans */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🛡️ Insurance Type</Text>
                  {parsedPlans.length > 0 ? (
                    parsedPlans.map((plan, idx) => (
                      <View key={idx} style={styles.planItem}>
                        <View style={styles.planHeader}>
                          <Text style={styles.planTitle}>{plan.title}</Text>
                          {plan.price ? <Text style={styles.planPrice}>{formatPrice(plan.price)} {plan.currency || getCurrencyForCountry(insurance.country)}</Text> : null}
                        </View>
                        <Text style={styles.infoText}>{plan.description}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.infoText}>No plan details available.</Text>
                  )}
                </View>

                {/* Coverage Summary */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>📋 Coverage Summary</Text>
                  <Text style={styles.infoText}>{insurance.coverage_summary || 'N/A'}</Text>
                </View>

                {/* Claim Process */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>📄 Claim Process</Text>
                  <Text style={styles.infoText}>{insurance.claim_process || 'N/A'}</Text>
                </View>

                {/* Partner Hospitals */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🏥 Partner Hospitals</Text>
                  {parsedHospitals.length > 0 ? (
                    parsedHospitals.map((item, idx) => (
                      <Text key={idx} style={styles.infoText}>➢ {item}</Text>
                    ))
                  ) : <Text style={styles.infoText}>N/A</Text>}
                </View>

                {/* Partner Pharmacies */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>💊 Partner Pharmacies</Text>
                  {parsedPharmacies.length > 0 ? (
                    parsedPharmacies.map((item, idx) => (
                      <Text key={idx} style={styles.infoText}>➢ {item}</Text>
                    ))
                  ) : <Text style={styles.infoText}>N/A</Text>}
                </View>

                {/* Office Locations & Map */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🏢 Office Locations</Text>
                  {parsedLocations.length > 0 ? (
                    <View>
                      {parsedLocations.map((loc, i) => (
                        <View key={i} style={styles.locationItem}>
                          {loc.latitude && loc.longitude && !isNaN(parseFloat(loc.latitude)) && !isNaN(parseFloat(loc.longitude)) && (
                            <View style={styles.mapContainer}>
                              <MapView
                                style={styles.map}
                                initialRegion={{
                                  latitude: parseFloat(loc.latitude),
                                  longitude: parseFloat(loc.longitude),
                                  latitudeDelta: 0.01,
                                  longitudeDelta: 0.01,
                                }}
                              >
                                <Marker
                                  coordinate={{ latitude: parseFloat(loc.latitude), longitude: parseFloat(loc.longitude) }}
                                  title={loc.type}
                                  description={`${loc.city} - ${loc.address}`}
                                />
                              </MapView>
                            </View>
                          )}
                          <Text style={styles.locationType}>{loc.type} - {loc.city}</Text>
                          <Text style={styles.locationAddress}>{loc.address}</Text>
                          {loc.latitude && loc.longitude && !isNaN(parseFloat(loc.latitude)) && !isNaN(parseFloat(loc.longitude)) && (
                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert(
                                  "Leave App",
                                  "You are about to leave the app to open Google Maps. Do you want to continue?",
                                  [
                                    { text: "No", style: "cancel" },
                                    { text: "Yes", onPress: () => {
                                      const url = Platform.select({
                                        ios: `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`,
                                        android: `geo:${loc.latitude},${loc.longitude}?q=${loc.latitude},${loc.longitude}`
                                      });
                                      if (url) Linking.openURL(url);
                                    }}
                                  ]
                                );
                              }}
                              style={styles.mapButton}
                            >
                              <Text style={styles.mapButtonText}>Open in Google Maps</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : <Text style={styles.infoText}>No office locations available.</Text>}
                </View>

                {/* Contact Details */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>📞 Contact Details</Text>
                  <View style={styles.contactContainer}>
                    {parsedContact.email && (
                      <TouchableOpacity onPress={() => {
                        Alert.alert(
                          "Leave App",
                          "You may quit the app to send an email. Do you want to continue?",
                          [
                            { text: "No", style: "cancel" },
                            { text: "Yes", onPress: () => Linking.openURL(`mailto:${parsedContact.email}`) }
                          ]
                        );
                      }}>
                        <Text style={styles.contactText}>
                          <Text style={styles.contactLabel}>Email: </Text>
                          <Text style={{ color: '#1E88E5', textDecorationLine: 'underline' }}>{parsedContact.email}</Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                    {parsedContact.phone && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${parsedContact.phone}`)}>
                        <Text style={styles.contactText}>
                          <Text style={styles.contactLabel}>Phone: </Text>
                          <Text style={{ color: '#1E88E5', textDecorationLine: 'underline' }}>{parsedContact.phone}</Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                    {parsedContact.office && (
                      <Text style={styles.contactText}><Text style={styles.contactLabel}>Office: </Text>{parsedContact.office}</Text>
                    )}
                    {parsedContact.website && (
                      <TouchableOpacity onPress={() => {
                        Alert.alert(
                          "Leave App",
                          "You may quit the app to visit this website. Do you want to continue?",
                          [
                            { text: "No", style: "cancel" },
                            { text: "Yes", onPress: () => {
                              const url = parsedContact.website || '';
                              Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
                            }}
                          ]
                        );
                      }}>
                        <Text style={styles.contactText}>
                          <Text style={styles.contactLabel}>Web: </Text>
                          <Text style={{ color: '#1E88E5', textDecorationLine: 'underline' }}>{parsedContact.website}</Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!parsedContact.email && !parsedContact.phone && !parsedContact.office && !parsedContact.website && (
                      <Text style={styles.infoText}>No contact details available.</Text>
                    )}
                  </View>
                </View>
              </View>
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
  infoBlock: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#555',
    lineHeight: 20,
  },
  planItem: {
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
  },
  planPrice: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
    color: '#4CAF50',
  },
  contactContainer: {
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#555',
    marginBottom: 4,
  },
  contactLabel: {
    fontFamily: 'Roboto-Medium',
    color: '#333',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationType: { fontFamily: 'Roboto-Bold', color: '#212121', fontSize: 14 },
  locationAddress: { fontFamily: 'Roboto-Regular', color: '#555', fontSize: 13 },
  locationPhone: { fontFamily: 'Roboto-Regular', color: '#388E3C', fontSize: 13, marginTop: 2 },
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
  mapButton: {
    marginTop: 8,
    backgroundColor: '#1E88E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
  },
});