import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function MainScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({
    medicines: [],
    pharmacies: [],
    hospitals: [],
    doctors: [],
    insurances: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [contentKey, setContentKey] = useState(0); // Key to force re-render
  const [country, setCountry] = useState<string | null>(null);

  // Fetch the user's selected country
  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };
    fetchCountry();
  }, [contentKey]); // Refetch country on manual refresh

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults({ medicines: [], pharmacies: [], hospitals: [], doctors: [], insurances: [] });
      }
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, country]); // Re-trigger search if country changes

  const performSearch = async (query: string) => {
    if (!country) return; // Do not search if no country is selected

    setIsSearchLoading(true);
    const searchTerm = `%${query}%`;

    try {
      const [medicinesRes, pharmaciesRes, hospitalsRes, doctorsRes, insurancesRes] =
        await Promise.all([
          supabase.from('medicines').select('*').eq('country', country).ilike('name', searchTerm),
          supabase.from('pharmacies').select('*').eq('country', country).ilike('name', searchTerm),
          supabase.from('hospitals').select('*').eq('country', country).ilike('name', searchTerm),
          supabase.from('doctor_applications').select('*').eq('country', country).or(`name.ilike.${searchTerm},specialty.ilike.${searchTerm}`),
          supabase.from('insurances').select('*').eq('country', country).ilike('name', searchTerm),
        ]);

      const results = {
        medicines: (medicinesRes.data || []).map((item) => ({ ...item, type: 'medicine' as const })),
        pharmacies: (pharmaciesRes.data || []).map((item) => ({ ...item, type: 'pharmacy' as const, address: item.location })),
        hospitals: (hospitalsRes.data || []).map((item) => ({ ...item, type: 'hospital' as const, address: item.location, speciality: (item.specialties || []).join(', ') })),
        doctors: (doctorsRes.data || []).map((item) => ({ ...item, type: 'doctor' as const, address: item.location, speciality: item.specialty })),
        insurances: (insurancesRes.data || []).map((item) => ({ ...item, type: 'insurance' as const })),
      };

      setSearchResults(results as any);
    } catch (error) {
      console.error("Error performing search:", error);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Real-time subscriptions for all relevant tables
  useEffect(() => {
    // Function to trigger a refresh
    const triggerRefresh = () => {
      console.log('Real-time change detected, refreshing content...');
      setContentKey(prevKey => prevKey + 1);
    };

    const tablesToWatch = [
      'medicines', 'doctor_applications', 'pharmacies', 'hospitals', 
      'insurances', 'deals', 'banners', 'categories'
    ];

    const channels = tablesToWatch.map(table => 
      supabase
        .channel(`realtime-index-screen:${table}`) // Use a unique channel name prefix
        .on('postgres_changes', { event: '*', schema: 'public', table }, triggerRefresh)
        .subscribe()
    );

    // Cleanup function to remove subscriptions when the component unmounts
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const hasSearchResults = Object.values(searchResults).some(
    (results) => results.length > 0
  );

  const handleScroll = () => {
    Keyboard.dismiss();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // By changing the key, we force the entire main content section to unmount and remount.
    // This will trigger all the `useEffect` hooks in the child components, causing them to refetch their data.
    setContentKey(prevKey => prevKey + 1);
    // We'll turn off the refreshing indicator after a short delay.
    // This is a pragmatic approach since we don't have a central loading state
    // to know exactly when all child components have finished their fetching.
    setTimeout(() => {
      setRefreshing(false);
    }, 2000); // Adjust time as needed
  }, []);

  // Main content renderer
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
      <View style={styles.spacer} />
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              placeholder="Ronderera hano na Gahungu Search..."
              placeholderTextColor="#888"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearching(true)}
              onBlur={() => {
                if (!hasSearchResults) setIsSearching(false);
              }}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
                Keyboard.dismiss();
              }}>
                <Icon name="close" size={20} color="#888" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
        {isSearching || hasSearchResults ? (
          isSearchLoading ? (
            <SearchResults 
              results={{ medicines: [], pharmacies: [], hospitals: [], doctors: [], insurances: [] }} 
              query={searchQuery} 
              isLoading={true} 
              onClose={() => {}} 
            />
          ) : (
            <SearchResults 
              results={searchResults} 
              query={searchQuery}
              onClose={() => {
                setSearchQuery('');
                setIsSearching(false);
                Keyboard.dismiss();
              }}
            />
          )
        ) : (
          <FlatList
            data={[]}
            renderItem={null}
            ListHeaderComponent={renderMainContent()}
            ListFooterComponent={<View style={{ height: 50 }} />}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={handleScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4CAF50']} // Android spinner color
                tintColor={'#4CAF50'} // iOS spinner color
              />
            }
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E0F7FA',
  },
  searchContainer: { 
    backgroundColor: '#E0F7FA', 
    paddingHorizontal: 16, 
    paddingVertical: 10,
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 30, 
    paddingHorizontal: 15, 
    paddingVertical: 10,
    outlineColor: "black",
    outlineStyle: "solid",
    outlineWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#333',
    letterSpacing: 0.5, // Adjust or remove this to change spacing
  },
  spacer: { 
    height: 20 
  },
});
