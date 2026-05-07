import React, { useEffect, useState, useRef} from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Pressable, Modal, ActivityIndicator, TextInput, Animated, Linking, Dimensions, Platform } from 'react-native';
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

type Hospital = {
  id: string;
  name: string | null;
  image: string | null;
  country: string | null;
  service_summary: string | null;
  admission_process: string | null;
  partner_insurances: string | null;
  partner_pharmacies: string | null;
  contact_details: string | null;
  locations: string | null;
  available_services: string | null;
  available_blood_types: string | null;
  medical_equipment: string | null;

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

const HOSPITAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/hospital-images/";

export default function HospitalDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);
  const [showCallCarButton, setShowCallCarButton] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/engagement-settings`);
        if (res.ok) {
          const data = await res.json();
          setShowCallCarButton(data.show_call_car_button_hospital !== false);
        }
      } catch (error) { console.error(error); }
    };
    fetchSettings();

    const channel = supabase.channel('hospital-call-car-visibility')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings', 
        filter: 'key=eq.show_call_car_button_hospital' 
      }, (payload: any) => {
        if (payload.new) {
          setShowCallCarButton(payload.new.value !== 'false');
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (id) {
      supabase.rpc('increment_hospital_views', { row_id: id }).then(({ error }) => {
        if (error) console.error('Error incrementing views:', error);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;


    const fetchHospital = async () => {
      const { data, error } = await supabase
        .from('hospital_applications')
        .select('id, name, image, country, service_summary, admission_process, partner_insurances, partner_pharmacies, contact_details, locations, available_services, available_blood_types, medical_equipment')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching hospital details:', error.message);
        setHospital(null);
      } else if (data) {
        setHospital(data);
      }
      setLoading(false);
    };

    fetchHospital();

    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });

    const channel = supabase
      .channel(`hospital-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_applications', filter: `id=eq.${id}` }, fetchHospital)
      .subscribe();

    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
      supabase.removeChannel(channel);
    };
  }, [id, navigation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Hospital not found.</Text>
      </View>
    );
  }

  // Parse JSON data for display
  let parsedContact: { email?: string; phone?: string; office?: string; website?: string } = {};
  let parsedInsurances: string[] = [];
  let parsedPharmacies: string[] = [];
  let parsedLocations: { type: string; city: string; address: string; phone: string; latitude: string; longitude: string }[] = [];
  let parsedServices: { name: string; description: string }[] = [];
  let parsedBloodTypes: string[] = [];
  let parsedEquipment: { name: string; status: string }[] = [];

  if (hospital) {
    
    try {
      if (hospital.contact_details && hospital.contact_details.trim().startsWith('{')) {
        parsedContact = JSON.parse(hospital.contact_details);
      } else if (hospital.contact_details) {
        parsedContact = { office: hospital.contact_details };
      }
    } catch (e) { console.error("Error parsing contact", e); }

    try {
      if (hospital.partner_insurances && hospital.partner_insurances.trim().startsWith('[')) {
        parsedInsurances = JSON.parse(hospital.partner_insurances);
      } else if (hospital.partner_insurances) {
        // Fallback for legacy text
        parsedInsurances = hospital.partner_insurances.split('\n').map(s => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
      }
    } catch (e) { parsedInsurances = []; }

    try {
      if (hospital.partner_pharmacies && hospital.partner_pharmacies.trim().startsWith('[')) {
        parsedPharmacies = JSON.parse(hospital.partner_pharmacies);
      } else if (hospital.partner_pharmacies) {
        // Fallback for legacy text
        parsedPharmacies = hospital.partner_pharmacies.split('\n').map(s => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
      }
    } catch (e) { parsedPharmacies = []; }

    try {
      if (hospital.locations) {
        parsedLocations = typeof hospital.locations === 'string' 
          ? JSON.parse(hospital.locations) 
          : hospital.locations;
      }
    } catch (e) { parsedLocations = []; }

    try {
      if (hospital.available_services) {
        parsedServices = JSON.parse(hospital.available_services);
      }
    } catch (e) { parsedServices = []; }

    try {
      if (hospital.available_blood_types) {
        parsedBloodTypes = JSON.parse(hospital.available_blood_types);
      }
    } catch (e) { parsedBloodTypes = []; }

    try {
      if (hospital.medical_equipment) {
        parsedEquipment = JSON.parse(hospital.medical_equipment);
      }
    } catch (e) { parsedEquipment = []; }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Hospital Details</Text>

        {/* Placeholder for right icon to balance layout */}
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {hospital.image ? (
          <Image source={{ uri: hospital.image && !hospital.image.startsWith('http') ? `${HOSPITAL_URL_PREFIX}${hospital.image}` : hospital.image }} style={styles.hospitalImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}
        <View style={styles.detailsContainer}>
          <Text style={styles.hospitalName}>{hospital.name || 'Unknown Hospital'}</Text>
          {/* Locked Section */}
          <View style={styles.section}>
              <View>

                {/* Service Summary */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>📋 Service Summary</Text>
                  <Text style={styles.infoText}>{hospital.service_summary || 'N/A'}</Text>
                </View>

                {/* Admission Process */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>📄 Admission Process</Text>
                  <Text style={styles.infoText}>{hospital.admission_process || 'N/A'}</Text>
                </View>

                {/* Available Services */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🛠️ Available Services</Text>
                  {parsedServices.length > 0 ? (
                    parsedServices.map((service, idx) => (
                      <View key={idx} style={{ marginBottom: 8 }}>
                        <Text style={[styles.infoText, { fontFamily: 'Roboto-Bold' }]}>• {service.name}</Text>
                        {service.description ? <Text style={[styles.infoText, { fontSize: 13, color: '#666', marginLeft: 10 }]}>{service.description}</Text> : null}
                      </View>
                    ))
                  ) : <Text style={styles.infoText}>N/A</Text>}
                </View>

                {/* Available Blood Types */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🩸 Available Blood Types</Text>
                  {parsedBloodTypes.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {parsedBloodTypes.map((bt, idx) => (
                        <View key={idx} style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2' }}>
                          <Text style={{ color: '#C62828', fontFamily: 'Roboto-Medium', fontSize: 12 }}>{bt}</Text>
                        </View>
                      ))}
                    </View>
                  ) : <Text style={styles.infoText}>N/A</Text>}
                </View>

                {/* Medical Equipment */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🩺 Medical Equipment</Text>
                  {parsedEquipment.length > 0 ? (
                    parsedEquipment.map((eq, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee' }}>
                        <Text style={[styles.infoText, { flex: 1 }]}>{eq.name}</Text>
                        <View style={{ backgroundColor: eq.status === 'Operational' ? '#E8F5E9' : '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: eq.status === 'Operational' ? '#C8E6C9' : '#FFE0B2' }}>
                          <Text style={{ fontSize: 10, color: eq.status === 'Operational' ? '#2E7D32' : '#EF6C00', fontFamily: 'Roboto-Medium' }}>{eq.status}</Text>
                        </View>
                      </View>
                    ))
                  ) : <Text style={styles.infoText}>N/A</Text>}
                </View>

                {/* Partner Insurances */}
                <View style={styles.infoBlock}>
                  <Text style={styles.infoTitle}>🏥 Insurances</Text>
                  {parsedInsurances.length > 0 ? (
                    parsedInsurances.map((item, idx) => (
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
                  <Text style={styles.infoTitle}>🏢 Locations</Text>
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
                  ) : <Text style={styles.infoText}>No locations available.</Text>}
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
          </View>

          {showCallCarButton && (
          <Pressable
            style={styles.carButton}
            onPress={() => showToast('Dr. IR. Gahungu ariko arabikora.', 1000)}
          >
            <Text style={styles.carButtonText}>Fyonda ngaha uhamagare umuduga ugushikana</Text>
          </Pressable>
          )}
          
        </View>
      </ScrollView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  hospitalImage: {
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
  hospitalName: {
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
  visitJetonButton: {
    marginTop: 10, // Added margin to separate from the carButton
    flex: 1,
    backgroundColor: '#007BFF', // A different color to distinguish
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: '#0056b3', // Darker blue border
    borderWidth: 1,
  },
  visitJetonButtonText: {
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