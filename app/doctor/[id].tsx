import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
  Dimensions,
} from 'react-native';
import { Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toastStore'; // Ensure this is before Toast
import Toast from '@/components/Toast';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import ConfettiCannon from 'react-native-confetti-cannon';
import MapView, { Marker } from 'react-native-maps';

const currencyMap: { [country: string]: string } = {
  Burundi: 'FBU',
  //Rwanda: 'RWF',
  //Tanzania: 'TSH',
  //Kenya: 'KSH',
  //Sudan: 'SDF',
  //Congo: 'FRC',
  //Somalia: 'FSM',
};

const getCurrency = (country: string | null): string => {
  return country ? currencyMap[country] || 'USD' : 'USD';
};

type Availability = {
  date: string;
  times: string[];
  booking_type?: "online" | "in-office" | "both";
  consultation_fee_online?: number | string;
  consultation_fee_offline?: number | string;
};

type Doctor = {
  id: string;
  name: string | null;
  image: string | null;
  specialty: string | null;
  location: any[] | null;
  bio: string | null;
  booking_type: "online" | "in-office" | "both" | null;
  availability: Availability[] | null;
  consultation_fee_online: number | null;
  consultation_fee_offline: number | null;
};

export default function DoctorDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string, location?: string }>();
  const { id } = params;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);

  // State for the lock mechanism
  const [showDetails, setShowDetails] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const VIEW_FEE = 500;
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [bookingType, setBookingType] = useState<'online' | 'in-office' | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };
    fetchCountry();
  }, []);

  useEffect(() => {
    if (paymentSuccess) {
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      checkmarkScale.setValue(0);
    }
  }, [paymentSuccess]);

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
      supabase.rpc('increment_doctor_views', { row_id: id }).then(({ error }) => {
        if (error) console.error('Error incrementing views:', error);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchDoctor = async () => {
      // Helper to parse array fields which might be strings from Supabase
      const parseArrayField = (field: any) => {
        if (Array.isArray(field)) return field; // Already an array
        if (typeof field === 'string') {
          try {
            const parsed = JSON.parse(field); // Try parsing from navigation params
            if (Array.isArray(parsed)) return parsed;
          } catch (e) { /* Not a JSON string, proceed to next check */ }
        }
        if (typeof field === 'string') return field.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        return [];
      };
      const { data: rawData, error } = await supabase
        .from('doctor_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching doctor:', error.message);
        setDoctor(null);
      } else {
        console.log('Fetched doctor data:', rawData);
        const data = {
          ...rawData,
          location: parseArrayField(rawData.location || params.location),
          // Explicitly convert to numbers to ensure math works
          consultation_fee_online: Number(rawData.consultation_fee_online || 0),
          consultation_fee_offline: Number(rawData.consultation_fee_offline || 0),
        };
        setDoctor(data as Doctor);
      }
      setLoading(false);
    };

    fetchDoctor();

    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });

    const channel = supabase
      .channel(`doctor-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_applications', filter: `id=eq.${id}` }, fetchDoctor)
      .subscribe();

    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
      supabase.removeChannel(channel);
    };
  }, [id, navigation, params.location]);

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

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const availabilityMap = useMemo(() => {
    if (!doctor?.availability) return {};
    return doctor.availability.reduce((acc, curr) => {
      if (curr.date && curr.times) {
        acc[curr.date] = curr.times;
      }
      return acc;
    }, {} as Record<string, string[]>);
  }, [doctor?.availability]);

  const markedDates = useMemo(() => {
    const marks = Object.keys(availabilityMap).reduce(
      (acc, date) => {
        acc[date] = { marked: true, dotColor: '#4CAF50' };
        return acc;
      },
      // Provide a type for the accumulator to avoid the implicit 'any' error.
      {} as Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string; }>
    );

    if (selectedDate) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#4CAF50' };
    }
    return marks;
  }, [availabilityMap, selectedDate]);

  const selectedAvailability = useMemo(() => {
    if (!selectedDate || !doctor?.availability) return null;
    return doctor.availability.find(a => a.date === selectedDate);
  }, [selectedDate, doctor?.availability]);

  const handleBook = async (type: 'online' | 'in-office') => {
    if (selectedDate && selectedTime && doctor) {
      setBookingType(type);
      setIsBookingModalVisible(true);
      setPinCode('');
      
      setIsBalanceLoading(true);
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          showToast("Please log in to book.");
          router.push('/auth');
          setIsBookingModalVisible(false);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setWalletBalance(Number(data.wallet_balance) || 0);
          setCurrentUserId(data.id || data._id || data.user_id); // Store user ID from backend
        } else {
          showToast("Could not fetch wallet balance.");
        }
      } catch (error) {
        console.error("Failed to fetch wallet balance:", error);
      } finally {
        setIsBalanceLoading(false);
      }
    }
  };

  const getFee = (slotFee: any, globalFee: any) => {
    if (slotFee !== undefined && slotFee !== null && slotFee !== "") {
      return Number(slotFee);
    }
    return Number(globalFee || 0);
  };

  const handleConfirmBookingPayment = async () => {
    // Use specific fee from availability if present, otherwise fallback to global doctor fee
    const feeOnline = getFee(selectedAvailability?.consultation_fee_online, doctor?.consultation_fee_online);
    const feeOffline = getFee(selectedAvailability?.consultation_fee_offline, doctor?.consultation_fee_offline);
    
    const bookingFee = bookingType === 'online' ? feeOnline : feeOffline;
    console.log('Starting booking payment. Fee:', bookingFee, 'Balance:', walletBalance);

    if (walletBalance === null || walletBalance < bookingFee) {
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
      if (!token) throw new Error("Authentication error.");

      // 0. Check for duplicate booking
      const { data: { user } } = await supabase.auth.getUser();
      const userIdToUse = user?.id || currentUserId;

      if (userIdToUse) {
        const { data: existingBookings, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', userIdToUse)
          .eq('doctor_id', doctor?.id)
          .eq('date', selectedDate)
          .eq('time', selectedTime)
          .neq('status', 'cancelled')
          .limit(1);

        if (checkError) throw new Error("Failed to check existing bookings.");
        if (existingBookings && existingBookings.length > 0) throw new Error("You already have a booking with this doctor at this time.");
      }

      // 1. Verify PIN
      console.log('Verifying PIN...');
      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin_code: pinCode }),
      });
      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        throw new Error(errData.error || "Incorrect PIN.");
      }

      // 2. Deduct Wallet
      if (bookingFee > 0) {
        console.log('Deducting wallet...');
        const deductRes = await fetch(`${API_BASE_URL}/wallet/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: bookingFee, reason: `Booking Dr. ${doctor?.name}`, pin: pinCode }),
        });
        if (!deductRes.ok) {
          const errData = await deductRes.json();
          console.error('Wallet deduction failed:', errData);
          throw new Error(errData.error || "Payment failed.");
        }
      } else {
        console.log('Booking is free, skipping wallet deduction.');
      }

      // 3. Insert Booking into Supabase
      console.log('Inserting booking into Supabase...');

      const { error } = await supabase.from('bookings').insert({
        user_id: userIdToUse,
        doctor_id: doctor?.id,
        doctor_name: doctor?.name,
        date: selectedDate,
        time: selectedTime,
        type: bookingType,
        amount: bookingFee,
        status: 'pending',
      });

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      setPaymentSuccess(true);
      setTimeout(() => {
        setIsBookingModalVisible(false);
        setPaymentSuccess(false);
        router.push('/appointments');
      }, 4000);
    } catch (error: any) {   
      Alert.alert("Booking Failed", error.message || "An error occurred.");
    } finally {
      setIsPaying(false);
    }
  };

  // Strict availability checks to ensure we don't fall back to defaults when a date is selected
  const isOnlineAvailable = useMemo(() => {
    if (selectedDate) {
      // If date selected, strictly use slot configuration
      if (!selectedAvailability) return false;
      const type = selectedAvailability.booking_type;
      return !type || type === 'online' || type === 'both';
    }
    // No date selected, use global defaults
    return doctor?.booking_type === 'online' || doctor?.booking_type === 'both';
  }, [selectedDate, selectedAvailability, doctor]);

  const isInOfficeAvailable = useMemo(() => {
    if (selectedDate) {
      if (!selectedAvailability) return false;
      const type = selectedAvailability.booking_type;
      return type === 'in-office' || type === 'both';
    }
    return doctor?.booking_type === 'in-office' || doctor?.booking_type === 'both';
  }, [selectedDate, selectedAvailability, doctor]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading...</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Doctor not found.</Text>
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

        <Text style={styles.headerTitle}>Doctor Profile</Text>

        {/* Placeholder for right icon to balance layout */}
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {doctor.image ? (
          <Image
            source={{ uri: doctor.image }}
            style={styles.doctorImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.detailsContainer}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="person" size={22} color="green" style={{ marginRight: 8, marginBottom: 6 }} />
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  {doctor.location && doctor.location.length > 0 ? (
                    doctor.location.map((loc, index) => (
                      <View key={index} style={{ marginBottom: 6 }}>
                        {typeof loc === 'string' ? (
                          <Text style={styles.doctorLocation}>• {loc}</Text>
                        ) : (
                          <View style={styles.locationCard}>
                            {loc.latitude && loc.longitude && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude)) && (
                              <View style={styles.mapContainer}>
                                <MapView
                                  style={styles.map}
                                  initialRegion={{
                                    latitude: Number(loc.latitude),
                                    longitude: Number(loc.longitude),
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                  }}
                                >
                                  <Marker
                                    coordinate={{ latitude: Number(loc.latitude), longitude: Number(loc.longitude) }}
                                    title={loc.type || 'Location'}
                                    description={loc.address}
                                  />
                                </MapView>
                              </View>
                            )}
                            <Text style={styles.locationType}>{loc.type || 'Location'} {loc.city ? `- ${loc.city}` : ''}</Text>
                            <Text style={styles.locationAddress}>{loc.address}</Text>
                            {loc.phone ? <Text style={styles.locationPhone}>📞 {loc.phone}</Text> : null}
                            {loc.latitude && loc.longitude && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude)) && (
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
                                style={{ marginTop: 5 }}
                              >
                                <Text style={{ color: '#1E88E5', textDecorationLine: 'underline', fontSize: 13, fontFamily: 'Roboto-Medium' }}>Open in Google Maps</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.doctorLocation}>No locations specified.</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
                  <Icon name="info" size={20} color="green" style={{ marginRight: 8, marginBottom: 6 }} />
                  <Text style={styles.bioTitle}>About</Text>
                </View>
                <Text style={styles.bio}>
                  {doctor.bio || `Dr. ${doctor.name} is a dedicated ${doctor.specialty?.toLowerCase()} professional.`}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                  <Icon name="event-available" size={20} color="green" style={{ marginRight: 8 }} />
                  <Text style={styles.sectionTitle}>Availability & Booking</Text>
                </View>
                 <Calendar
                   style={styles.calendar}
                   markedDates={markedDates}
                   onDayPress={(day) => {
                     setSelectedDate(day.dateString);
                     setSelectedTime(null);
                   }}
                   theme={{
                     calendarBackground: '#fff',
                     textSectionTitleColor: '#212121',
                     selectedDayBackgroundColor: '#4CAF50',
                     selectedDayTextColor: '#fff',
                     todayTextColor: '#0288D1',
                     dayTextColor: '#212121',
                     textDisabledColor: '#B0BEC5',
                     dotColor: '#4CAF50',
                     selectedDotColor: '#fff',
                     arrowColor: '#4CAF50',
                     monthTextColor: '#212121',
                     textDayFontFamily: 'Roboto-Regular',
                     textMonthFontFamily: 'Roboto-Bold',
                     textDayHeaderFontFamily: 'Roboto-Medium',
                   }}
                 />
                 {selectedDate && availabilityMap[selectedDate] && (
                   <View style={styles.timeSlotsContainer}>
                     <Text style={styles.timeSlotsTitle}>Available Times</Text>
                     <View style={styles.timeSlots}>
                       {availabilityMap[selectedDate].map((time) => (
                         <Pressable
                           key={time}
                           style={[
                             styles.timeSlot,
                             selectedTime === time && styles.selectedTimeSlot,
                           ]}
                           onPress={() => setSelectedTime(time)}
                         >
                           <Text
                             style={[
                               styles.timeSlotText,
                               selectedTime === time && styles.selectedTimeSlotText,
                             ]}
                           >
                             {time}
                           </Text>
                         </Pressable>
                       ))}
                     </View>
                   </View>
                 )}
                 <View style={styles.buttonsContainer}>
                   {isOnlineAvailable && (
                     <Pressable
                       style={({ pressed }) => [
                         styles.button,
                         !(selectedDate && selectedTime) && styles.disabledButton,
                         pressed && selectedDate && selectedTime && styles.pressedButton,
                       ]}
                       onPress={() => handleBook('online')}
                       disabled={!(selectedDate && selectedTime)}
                     >
                       <Text style={styles.buttonText}>Book Online</Text>
                        
                     </Pressable>
                   )}
                   {isInOfficeAvailable && (
                     <Pressable

                       style={({ pressed }) => [
                         styles.button,
                         !(selectedDate && selectedTime) && styles.disabledButton,
                         pressed && selectedDate && selectedTime && styles.pressedButton,
                       ]}
                       onPress={() => handleBook('in-office')}
                       disabled={!(selectedDate && selectedTime)}

                     >
                       <Text style={styles.buttonText}>Book In Office</Text>
                     </Pressable>
                   )}
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
                   Pay <Text style={{ fontWeight: 'bold' }}>{VIEW_FEE} {getCurrency(country)}</Text> to view with Gahungu Wallet.
                 </Text>
                 <Text style={styles.balanceText}>
                   Your balance: {walletBalance?.toLocaleString() ?? '...'} {getCurrency(country)}
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
                     style={[styles.modalButton, (isPaying || (walletBalance !== null && walletBalance < VIEW_FEE) || pinCode.length !== 4) && styles.disabledButton]}
                     onPress={handleConfirmViewPayment}
                     disabled={isPaying || (walletBalance !== null && walletBalance < VIEW_FEE) || pinCode.length !== 4}
                   >
                     {isPaying ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Pay</Text>}
                   </TouchableOpacity>
                    </View>
                  </View>
             )}
           </View>
         </View>
       </Modal>

       {/* Booking Modal */}
       <Modal
         visible={isBookingModalVisible}
         transparent
         animationType="slide"
         onRequestClose={() => setIsBookingModalVisible(false)}
       >
         <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
           <View style={styles.modalOverlay}>
             <KeyboardAvoidingView
               behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
               style={{ width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 }}
             >
               <View style={styles.modalContent}>
                 {paymentSuccess ? (
                   <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                     <ConfettiCannon count={200} origin={{x: -10, y: 0}} fadeOut={true} />
                     <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                       <Icon name="check-circle" size={80} color="#4CAF50" />
                     </Animated.View>
                     <Text style={[styles.modalTitle, { marginTop: 20, marginBottom: 10 }]}>Payment Successful!</Text>
                     <Text style={styles.modalText}>Redirecting to appointments...</Text>
                   </View>
                 ) : (
                   <>
                 <TouchableOpacity style={styles.closeIcon} onPress={() => setIsBookingModalVisible(false)}>
                   <Icon name="close" size={24} color="#212121" />
                 </TouchableOpacity>
                 
                 <Text style={styles.modalTitle}>Confirm Booking</Text>
                 
                 <View style={{ width: '100%', marginBottom: 20, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8 }}>
                   <Text style={styles.modalText}>Doctor: <Text style={{ fontWeight: 'bold' }}>{doctor.name}</Text></Text>
                   <Text style={styles.modalText}>Date: <Text style={{ fontWeight: 'bold' }}>{selectedDate}</Text></Text>
                   <Text style={styles.modalText}>Time: <Text style={{ fontWeight: 'bold' }}>{selectedTime}</Text></Text>
                   <Text style={styles.modalText}>Type: <Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{bookingType}</Text></Text>
                   <View style={{ height: 1, backgroundColor: '#ddd', marginVertical: 8 }} />
                   <Text style={styles.modalText}>Consultation Fee: <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                     {bookingType === 'online' 
                        ? getFee(selectedAvailability?.consultation_fee_online, doctor.consultation_fee_online)
                        : getFee(selectedAvailability?.consultation_fee_offline, doctor.consultation_fee_offline)
                     } {getCurrency(country)}
                   </Text></Text>
                 </View>

                 <View style={{ alignItems: 'center', width: '100%' }}>
                     <TextInput
                       style={styles.pinCodeInput}
                       placeholder="Enter PIN to Pay"
                       keyboardType="number-pad"
                       secureTextEntry={true}
                       value={pinCode}
                       onChangeText={setPinCode}
                       maxLength={4}
                     />

                     <TouchableOpacity
                       style={[styles.bookingActionButton, (isPaying || (walletBalance !== null && walletBalance < (bookingType === 'online' 
                          ? getFee(selectedAvailability?.consultation_fee_online, doctor.consultation_fee_online)
                          : getFee(selectedAvailability?.consultation_fee_offline, doctor.consultation_fee_offline)
                        )) || !pinCode) && styles.disabledButton]}
                       onPress={handleConfirmBookingPayment} 
                       disabled={isPaying || (walletBalance !== null && walletBalance < (bookingType === 'online' 
                          ? getFee(selectedAvailability?.consultation_fee_online, doctor.consultation_fee_online)
                          : getFee(selectedAvailability?.consultation_fee_offline, doctor.consultation_fee_offline)
                        )) || !pinCode}
                     >
                       {isPaying ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookingActionButtonText}>Pay & Book</Text>} 
                     </TouchableOpacity>
                 </View>
                   </>
                 )}
               </View>
             </KeyboardAvoidingView>
           </View>
         </TouchableWithoutFeedback>
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
  doctorImage: {
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
  doctorName: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 8,
  },
  infoBlock: {
    marginLeft: 30,
  },
  doctorSpecialty: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#4CAF50',
    marginBottom: 4,
  },
  doctorLocation: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#757575',
    marginBottom: 4,
  },
  bioTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    marginLeft: 30,
  },
  section: {
    marginTop: 12,
  },
  lockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginBottom: 12,
    color: '#212121',
  },
  calendar: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeSlotsContainer: {
    marginBottom: 16,
  },
  timeSlotsTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
    marginBottom: 8,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  selectedTimeSlot: {
    backgroundColor: '#4CAF50',
    borderColor: 'green',
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#212121',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: 'green',
  },
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  pressedButton: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
    textAlign: 'center',
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
    letterSpacing: 2,
  },
  bookingActionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  bookingActionButtonText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#fff',
  },
  locationCard: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  locationType: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#555',
  },
  locationPhone: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#388E3C',
    marginTop: 2,
  },
  mapContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
