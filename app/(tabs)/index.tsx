import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '@/components/Header';
import Carousel from '@/components/Carousel';
import CategorySlider from '@/components/CategorySlider';
import DealSection from '@/components/DealSection';
import ProductGrid from '@/components/ProductGrid';
import FeaturedDoctors from '@/components/FeaturedDoctors';
import FeaturedPharmacies from '@/components/FeaturedPharmacies';
import FeaturedHospitals from '@/components/FeaturedHospitals';
import FeaturedInsurances from '@/components/FeaturedInsurances';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useLanguageStore, translations } from '@/stores/languageStore';
//
// =======================
// TYPES
// =======================
//

type MedicinePharmacy = {
  id: string;
  name: string;
  price: number;
  stockId: string;
};

type Medicine = {
  id: string;
  name: string;
  type: 'medicine';
  image?: string;
  price: number;
  originalPrice: number;
  categoryId?: string;
  pharmacies: MedicinePharmacy[];
  insurances: string[];
};

type Pharmacy = {
  id: string;
  name: string;
  image?: string;
  type: 'pharmacy';
  address?: string;
};

type Hospital = {
  id: string;
  name: string;
  type: 'hospital';
  image?: string;
  address?: string;
  speciality?: string;
};

type Doctor = {
  id: string;
  name: string;
  type: 'doctor';
  address?: string,
  image?: string;
  speciality?: string;
};

type Insurance = {
  id: string;
  name: string;
  image?: string;
  type: 'insurance';
};

type SearchResultsState = {
  medicines: Medicine[];
  pharmacies: Pharmacy[];
  hospitals: Hospital[];
  doctors: Doctor[];
  insurances: Insurance[];
};

const BANNER_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/banner-images/";
const DEAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/deal-images/";
const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";
const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";
const HOSPITAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/hospital-images/";
const DOCTOR_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/doctor-images/";
const INSURANCE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/insurance-images/";

//
// =======================
// COMPONENT
// =======================
//

export default function MainScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [country, setCountry] = useState<string | null>(null);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  //
  // Fetch selected country
  //
  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync('user_country');
      console.log(`[MainScreen] contentKey: ${contentKey} | Stored Country: ${storedCountry}`);
      setCountry(storedCountry);
    };
    fetchCountry();
  }, [contentKey]);

  //
  // 🔥 Auto-refresh every 2 minutes
  //
  useFocusEffect(
    useCallback(() => {
    const REFRESH_INTERVAL = 60 * 60 * 1000; // 2 minutes
    console.log(`[MainScreen] 🟢 Screen focused. Starting auto-refresh timer (${REFRESH_INTERVAL}ms).`);

    const intervalId = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[MainScreen] 🔄 AUTO-REFRESH TRIGGERED at ${timestamp}. Incrementing key...`);
      
      setContentKey((k) => k + 1);
    }, REFRESH_INTERVAL);

    return () => {
      console.log('[MainScreen] Screen blurred. Clearing auto-refresh interval.');
      clearInterval(intervalId);
    };
    }, [])
  );

//
// Pull-to-refresh
//
const onRefresh = useCallback(() => {
  setRefreshing(true);
  setContentKey((k) => k + 1);
  setTimeout(() => setRefreshing(false), 1500);
}, []);

//
// MAIN CONTENT
//
const renderMainContent = () => (
  <View key={contentKey}>
    <Carousel baseUrl={BANNER_URL_PREFIX} /> {/* No title prop */}
    <CategorySlider/> {/* No title prop */}
    <DealSection title={t["deals of the day"]} baseUrl={DEAL_URL_PREFIX} />
    <ProductGrid title={t["recommended for you"]} baseUrl={MEDICINE_URL_PREFIX} />
    <FeaturedPharmacies title={t["featured pharmacies"]} baseUrl={PHARMACY_URL_PREFIX} />
    <FeaturedHospitals title={t["featured hospitals"]} baseUrl={HOSPITAL_URL_PREFIX} />
    <FeaturedDoctors title={t["featured doctors"]} baseUrl={DOCTOR_URL_PREFIX} />
    <FeaturedInsurances title={t["featured insurances"]} baseUrl={INSURANCE_URL_PREFIX} /> {/* Title is inside component */}
    <View style={{ height: 20 }} />
  </View>
);

//
// UI
//
return (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.container}>
      <Header />

      <TouchableOpacity 
        style={styles.searchContainer} 
        activeOpacity={0.9} 
        onPress={() => router.push('/search')}
      >
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#2874F0" /> {/* No translation needed for icon */}
          <Text style={styles.searchPlaceholder}>{t.searchPlaceholderText}</Text>
        </View>
      </TouchableOpacity>

        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderMainContent()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
    </View>
  </TouchableWithoutFeedback>
);
}

//
// =======================
// STYLES
// =======================
//

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#2874F0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    elevation: 4,
  },
  searchPlaceholder: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    letterSpacing: 0,
    padding: 0,
    color: '#757575',
  },
});
