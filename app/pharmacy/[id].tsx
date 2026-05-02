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

const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";

export default function PharmacyDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const showToast = useToastStore(state => state.showToast);
  const [showCallCarButton, setShowCallCarButton] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/engagement-settings`);
        if (res.ok) {
          const data = await res.json();
          setShowCallCarButton(data.show_call_car_button_pharmacy !== false);
        }
      } catch (error) { console.error(error); }
    };
    fetchSettings();

    const channel = supabase.channel('pharmacy-call-car-visibility')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings', 
        filter: 'key=eq.show_call_car_button_pharmacy' 
      }, (payload: any) => {
        if (payload.new) {
          setShowCallCarButton(payload.new.value !== 'false');
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
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
              <Image source={{ uri: pharmacy.image && !pharmacy.image.startsWith('http') ? `${PHARMACY_URL_PREFIX}${pharmacy.image}` : pharmacy.image }} style={styles.pharmacyImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>No Image Available</Text>
              </View>
            )}
            <View style={styles.detailsContainer}>
          <Text style={styles.pharmacyName}>{pharmacy.name || 'Unknown Pharmacy'}</Text>
          <View style={styles.section}>
                
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
    backgroundColor: '#E0F7FA',
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
