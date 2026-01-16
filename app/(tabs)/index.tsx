import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl,
} from 'react-native';
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
import SearchResults from '@/components/SearchResults';

import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

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

//
// =======================
// COMPONENT
// =======================
//

export default function MainScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [country, setCountry] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchResultsState>({
    medicines: [],
    pharmacies: [],
    hospitals: [],
    doctors: [],
    insurances: [],
  });

  //
  // Fetch selected country
  //
  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync('user_country');
      setCountry(storedCountry);
    };
    fetchCountry();
  }, [contentKey]);

  //
  // Debounced search
  //
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults({
          medicines: [],
          pharmacies: [],
          hospitals: [],
          doctors: [],
          insurances: [],
        });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, country]);

  //
  // SEARCH FUNCTION
  //
  const performSearch = async (query: string) => {
    if (!country) return;

    setIsSearchLoading(true);
    const term = `%${query}%`;

    try {
      const [
        medicinesRes,
        pharmaciesRes,
        hospitalsRes,
        doctorsRes,
        insurancesRes,
      ] = await Promise.all([
        supabase
          .from('stock')
            .select(`
                    *,
                    pharmacy:pharmacy_applications!stock_pharmacy_id_fkey (
                    id,
                    name,
                    country
            )
          `)
          .ilike('name', `%${query}%`)
          .eq('in_stock', true)
          .eq('pharmacy.country', country),

      supabase
        .from('pharmacy_applications')
        .select('*')
        .eq('country', country)
        .ilike('name', term),

        supabase
          .from('hospital_applications')
          .select('*')
          .eq('country', country)
          .ilike('name', term),

        supabase
          .from('doctor_applications')
          .select('*')
          .eq('country', country)
          .or(`name.ilike.${term},specialty.ilike.${term}`),

        supabase
          .from('insurance_applications')
          .select('*')
          .eq('country', country)
          .ilike('name', term),
      ]);

  // Group medicines by name to avoid duplicates
  const medicinesMap = new Map<string, Medicine>();

  (medicinesRes.data || []).forEach((item) => {
    const nameKey = item.name.trim().toLowerCase();
    const price = Number(item.price);

    if (!medicinesMap.has(nameKey)) {
      medicinesMap.set(nameKey, {
        id: item.id,
        name: item.name,
        type: 'medicine',
        image: item.image ?? undefined,
        price: price,
        originalPrice: Number(item.original_price),
        categoryId: item.category ?? undefined,
        pharmacies: [],
        insurances: item.insurances ? JSON.parse(item.insurances) : [],
      });
    }

    const currentMed = medicinesMap.get(nameKey)!;

    // Add pharmacy details to the list
    if (item.pharmacy) {
      currentMed.pharmacies.push({
        id: item.pharmacy.id,
        name: item.pharmacy.name,
        price: price,
        stockId: item.id,
      });
    }

    // Update to show the lowest price available
    if (price < currentMed.price) {
      currentMed.price = price;
      currentMed.originalPrice = Number(item.original_price);
    }
  });

  const results: SearchResultsState = {
    medicines: Array.from(medicinesMap.values()),

    pharmacies: (pharmaciesRes.data || []).map((item): Pharmacy => ({
      id: item.id,
      name: item.name,
      image: item.image ?? undefined,
      type: 'pharmacy',

    })),

    hospitals: (hospitalsRes.data || []).map((item): Hospital => ({
      id: item.id,
      name: item.name,
      image: item.image ?? undefined,
      type: 'hospital',
      address: item.location,
      speciality: (item.specialties || []).join(', '),
    })),

    doctors: (doctorsRes.data || []).map((item): Doctor => ({
      id: item.id,
      name: item.name,
      image: item.image ?? undefined,
      type: 'doctor',
      address: item.location,
      speciality: item.specialty,
    })),

    insurances: (insurancesRes.data || []).map((item): Insurance => ({
      id: item.id,
      name: item.name,
      image: item.image ?? undefined,
      type: 'insurance',
    })),
  };

  setSearchResults(results);
} catch (err) {
  console.error('Search error:', err);
} finally {
  setIsSearchLoading(false);
}
  };

//
// Pull-to-refresh
//
const onRefresh = useCallback(() => {
  setRefreshing(true);
  setContentKey((k) => k + 1);
  setTimeout(() => setRefreshing(false), 1500);
}, []);

const hasSearchResults = Object.values(searchResults).some(
  (arr) => arr.length > 0
);

//
// MAIN CONTENT
//
const renderMainContent = () => (
  <View key={contentKey}>
    <Carousel />
    <CategorySlider />
    <DealSection title="Deals of the Day" />
    <ProductGrid title="Recommended for You" />
    <FeaturedPharmacies title="Featured Pharmacies" />
    <FeaturedHospitals />
    <FeaturedDoctors title="Featured Doctors" />
    <FeaturedInsurances />
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

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#2874F0" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ronderera hano na Gahungu Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearching(true)}
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
            >
              <Icon name="close" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching || hasSearchResults ? (
        <SearchResults
          results={searchResults}
          query={searchQuery}
          isLoading={isSearchLoading}
          onClose={() => {
            setSearchQuery('');
            setIsSearching(false);
          }}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderMainContent()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    color: 'black',
  },
});
