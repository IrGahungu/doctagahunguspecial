import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Keyboard, Dimensions, Image, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import SearchResults from '@/components/SearchResults';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguageStore, translations } from '@/stores/languageStore';

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";
const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";
const HOSPITAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/hospital-images/";
const DOCTOR_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/doctor-images/";
const INSURANCE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/insurance-images/";

type Suggestion = {
  name: string;
  image?: string;
  type: 'medicine' | 'pharmacy' | 'hospital' | 'doctor' | 'insurance';
  id?: string; // Added for keyExtractor
};

type RecentSearchItem = {
  name: string;
  type: string;
  image?: string;
};

const RECENT_SEARCH_LIMIT = 10; // Limit the number of recent searches
const RECENT_SEARCH_KEY = 'recent_searches';

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const SearchSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonTextContainer}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  </SkeletonPulse>
);

const RecentSearchesSkeleton = () => (
  <View style={styles.recentSearchesContainer}>
    <View style={styles.recentSearchesHeader}>
      <View style={[styles.skeletonLine, { width: 120, height: 18, marginBottom: 10 }]} />
    </View>
    <SkeletonPulse>
      <View style={styles.recentSearchesGrid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[styles.recentSearchChip, { borderColor: '#f5f5f5' }]}>
            <View style={[styles.recentSearchImage, { backgroundColor: '#e0e0e0' }]} />
            <View style={styles.skeletonTextContainer}>
              <View style={[styles.skeletonLine, { width: '100%', height: 12 }]} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  </View>
);

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]); // Suggestions from API
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]); // Stored recent searches
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const getImageSourceForType = (type: string, imagePath?: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return { uri: imagePath };
    switch (type) {
      case 'medicine': return { uri: `${MEDICINE_URL_PREFIX}${imagePath}` };
      case 'pharmacy': return { uri: `${PHARMACY_URL_PREFIX}${imagePath}` };
      case 'hospital': return { uri: `${HOSPITAL_URL_PREFIX}${imagePath}` };
      case 'doctor': return { uri: `${DOCTOR_URL_PREFIX}${imagePath}` };
      case 'insurance': return { uri: `${INSURANCE_URL_PREFIX}${imagePath}` };
      default: return null;
    }
  };

  // Function to load recent searches from SecureStore
  const loadRecentSearches = useCallback(async () => {
    try {
      const storedSearches = await SecureStore.getItemAsync(RECENT_SEARCH_KEY);
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      } else {
        setRecentSearches([]);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
      setRecentSearches([]); // Fallback to empty array on error
    }
  }, []);

  // Function to save a new search term to SecureStore
  const saveRecentSearch = useCallback(async (searchItem: RecentSearchItem) => {
    if (!searchItem.name.trim()) return;

    setRecentSearches(prevSearches => {
      // Remove duplicates and add the new term to the front
      const newSearches = [ 
        searchItem,
        ...prevSearches.filter(s => s.name.toLowerCase() !== searchItem.name.toLowerCase())
      ].slice(0, RECENT_SEARCH_LIMIT); // Keep only the latest N searches

      SecureStore.setItemAsync(RECENT_SEARCH_KEY, JSON.stringify(newSearches)).catch(error => {
        console.error('Failed to save recent searches:', error);
      });
      return newSearches;
    });
  }, []);

  const clearRecentSearches = useCallback(async () => {
    await SecureStore.deleteItemAsync(RECENT_SEARCH_KEY);
    setRecentSearches([]);
  }, []);

  // Initial setup: fetch country, load recent searches, and focus input
  useEffect(() => {
    const init = async () => {
      setIsInitialLoad(true);
      const stored = await SecureStore.getItemAsync('user_country');
      setCountry(stored ? stored.trim() : null);
      await loadRecentSearches();
      setIsInitialLoad(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    init();
  }, [loadRecentSearches]);

  // Suggestions Logic
  useEffect(() => {
    let active = true;
    if (query.length < 2 || isSearching) {
      setSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsFetchingSuggestions(true);
      try {
        const [stockRes, pharmacyRes, hospitalRes, doctorRes, insuranceRes] = await Promise.all([
          supabase.from('stock').select('name, image').ilike('name', `%${query}%`).limit(10),
          supabase.from('pharmacy_applications').select('name, image').ilike('name', `%${query}%`).eq('status', 'approved').limit(5),
          supabase.from('hospital_applications').select('name, image, available_blood_types, medical_equipment')
            .or(`name.ilike.%${query}%,available_blood_types.ilike.%${query}%,medical_equipment.ilike.%${query}%`)
            .eq('status', 'approved')
            .limit(5),
          supabase.from('doctor_applications').select('name, specialty, image')
            .or(`name.ilike.%${query}%,specialty.ilike.%${query}%`)
            .eq('status', 'approved')
            .limit(10),
          supabase.from('insurance_applications').select('name, image')
            .ilike('name', `%${query}%`)
            .eq('status', 'approved')
            .limit(5),
        ]);

        if (!active) return;

        const combined: Suggestion[] = [
          ...(stockRes.data?.map(i => ({ name: i.name, image: i.image, type: 'medicine' as const })) || []),
          ...(pharmacyRes.data?.map(i => ({ name: i.name, image: i.image, type: 'pharmacy' as const })) || []),
          ...(hospitalRes.data?.map(i => ({ name: i.name, image: i.image, type: 'hospital' as const })) || []),
          ...(doctorRes.data?.map(i => ({ name: i.name, image: i.image, type: 'doctor' as const })) || []),
          ...(insuranceRes.data?.map(i => ({ name: i.name, image: i.image, type: 'insurance' as const })) || []),
        ];
        
        const unique = Array.from(new Map(combined.map(s => [s.name, s])).values());
        setSuggestions(unique);
      } finally {
        if (active) setIsFetchingSuggestions(false);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, isSearching]);

  const performFinalSearch = async (searchTerm: string, initialType?: string, initialImage?: string) => {
    if (!searchTerm.trim() || !country) return;
    
    Keyboard.dismiss();
    setIsLoading(true);
    setSearchError(null); // Clear previous errors
    setIsSearching(true);
    saveRecentSearch({ name: searchTerm, type: initialType || 'general', image: initialImage }); // Save the search term with type and image
    setSuggestions([]);

    // Multi-search logic
    const names = searchTerm.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);
    const term = `%${names.join('%')}%`; 

    try {
        const [meds, pharms, hosps, docs, ins] = await Promise.all([
            // Medicine search supports multi
            supabase.from('stock').select('*, pharmacy:pharmacy_applications!stock_pharmacy_id_fkey(id, name, country)')
                .ilike('name', `%${names.join('%')}%`) // Simple multi-match
                .eq('in_stock', true)
                .ilike('pharmacy.country', country || ''),
            supabase.from('pharmacy_applications').select('*').ilike('country', country || '').eq('status', 'approved').ilike('name', term),
            supabase.from('hospital_applications').select('*').ilike('country', country || '').eq('status', 'approved')
                .or(`name.ilike.${term},available_blood_types.ilike.${term},medical_equipment.ilike.${term}`),
            supabase.from('doctor_applications').select('*').ilike('country', country || '').eq('status', 'approved').or(`name.ilike.${term},specialty.ilike.${term}`),
            supabase.from('insurance_applications').select('*').ilike('country', country || '').eq('status', 'approved').ilike('name', term),
        ]);

        // Group medicines by name to show "Available in X pharmacies"
        const medicinesMap = new Map<string, any>();
        (meds.data || []).forEach((item: any) => {
            // Clean name for grouping (remove trailing dots/punctuation and normalize case)
            const nameKey = item.name.trim().toLowerCase().replace(/[.,]$/, "");
            const price = Number(item.price);
            
            // Format image URL
            const imageUrl = item.image 
                ? (item.image.startsWith('http') ? item.image : `${MEDICINE_URL_PREFIX}${item.image}`) 
                : null;

            if (!medicinesMap.has(nameKey)) {
                medicinesMap.set(nameKey, {
                    ...item,
                    image: imageUrl,
                    price: price,
                    name: item.name.replace(/[.,]$/, "").trim(), // Normalized display name
                    pharmacies: [],
                    insurances: item.insurances ? (typeof item.insurances === 'string' ? JSON.parse(item.insurances) : item.insurances) : [],
                });
            }

            const currentMed = medicinesMap.get(nameKey);

            // Merge insurances from all matching pharmacies
            if (item.insurances) {
                const itemInsurances = typeof item.insurances === 'string' ? JSON.parse(item.insurances) : item.insurances;
                const combinedInsurances = new Set([...(currentMed.insurances || []), ...itemInsurances]);
                currentMed.insurances = Array.from(combinedInsurances);
            }

            if (item.pharmacy) {
                currentMed.pharmacies.push({
                    id: item.pharmacy.id,
                    name: item.pharmacy.name,
                    price: price,
                    stockId: item.id,
                    image: item.pharmacy.image ? (item.pharmacy.image.startsWith('http') ? item.pharmacy.image : `${PHARMACY_URL_PREFIX}${item.pharmacy.image}`) : null
                });
            }

            // Track lowest price and corresponding stock item ID
            if (price < currentMed.price) {
                currentMed.price = price;
                currentMed.id = item.id;
            }
        });

        const processImages = (data: any[], prefix: string, type: string) => (data || []).map(i => ({
            ...i,
            type,
            speciality: i.specialty, // Map specialty column for doctors
            image: i.image ? (i.image.startsWith('http') ? i.image : `${prefix}${i.image}`) : null
        }));

        setSearchError(null); // Clear error if search is successful
        setResults({
            medicines: Array.from(medicinesMap.values()),
            pharmacies: processImages(pharms.data || [], PHARMACY_URL_PREFIX, 'pharmacy'),
            hospitals: processImages(hosps.data || [], HOSPITAL_URL_PREFIX, 'hospital'),
            doctors: processImages(docs.data || [], DOCTOR_URL_PREFIX, 'doctor'),
            insurances: processImages(ins.data || [], INSURANCE_URL_PREFIX, 'insurance'),
        });
    } catch (err) {
        setSearchError("Connexion is weak, go back and search again");
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsSearching(false);
    setIsFetchingSuggestions(false);
    setResults(null);
    setSearchError(null); // Clear error when clearing search
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <TextInput
            ref={inputRef}
            style={styles.searchPlaceholder}
            placeholderTextColor="#757575" // No translation needed for icon
            placeholder={t.searchPlaceholder}
            value={query}
            onChangeText={(text) => {
                setQuery(text);
                if (isSearching) setIsSearching(false);
            }}
            onSubmitEditing={() => performFinalSearch(query)}
            returnKeyType="search"
          />
          {isFetchingSuggestions ? (
            <ActivityIndicator size="small" color="#2874F0" />
          ) : query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <X size={20} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <SearchSkeleton />
      ) : searchError ? (
        <View style={styles.center}> {/* No translation needed for icon */}
          <Icon name="wifi-off" size={60} color="#BDBDBD" /> {/* No translation needed for icon */}
          <Text style={styles.errorText}>{searchError}</Text>
          <Text style={styles.emptyText}>Please check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => performFinalSearch(query)}>
            <Icon name="refresh" size={20} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isSearching && results ? (
        <SearchResults 
            results={results} 
            query={query} 
            onClose={() => setIsSearching(false)} 
        />
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          ListHeaderComponent={
            query.length === 0 && !isFetchingSuggestions ? (
              isInitialLoad ? (
                <RecentSearchesSkeleton />
              ) : recentSearches.length > 0 ? ( // No translation needed for icon
              <View style={styles.recentSearchesContainer}> {/* No translation needed for icon */}
                <View style={styles.recentSearchesHeader}>
                  <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
                  <TouchableOpacity onPress={clearRecentSearches} style={styles.clearAllButton}>
                    <Text style={styles.clearAllButtonText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentSearchesGrid}> 
                  {recentSearches.map((item, index) => {
                    const imageSource = getImageSourceForType(item.type, item.image);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.recentSearchChip}
                        onPress={() => {
                          setQuery(item.name);
                          performFinalSearch(item.name, item.type, item.image);
                        }}
                      >
                        {imageSource ? (
                          <Image source={imageSource} style={styles.recentSearchImage} />
                        ) : (
                          null // Removed the Search icon, only show image or nothing
                        )}
                        <Text style={styles.recentSearchText} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null) : null
          }
          data={suggestions}
          keyExtractor={(item) => `${item.type}-${item.name}`}
          renderItem={({ item }) => (
            <TouchableOpacity 
                style={styles.suggestionItem} 
                onPress={() => { // Pass type and image when a suggestion is selected
                    setQuery(item.name); 
                    performFinalSearch(item.name, item.type, item.image);
                }}
            >
              {item.image ? (
                <Image 
                  source={{ 
                    uri: item.image.startsWith('http') 
                      ? item.image 
                      : `${item.type === 'medicine' ? MEDICINE_URL_PREFIX : 
                           item.type === 'pharmacy' ? PHARMACY_URL_PREFIX : 
                           item.type === 'hospital' ? HOSPITAL_URL_PREFIX : 
                           item.type === 'doctor' ? DOCTOR_URL_PREFIX : 
                           INSURANCE_URL_PREFIX}${item.image}` 
                  }}
                  style={styles.suggestionImage}
                />
              ) : (
                <Search size={18} color="#9E9E9E" style={{ marginRight: 15 }} />
              )}
              <Text style={styles.suggestionText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length < 2 ? ( // If query is less than 2 characters
                (recentSearches.length === 0 && !isInitialLoad) ? ( // And no recent searches or not initial load
                  <View style={styles.center}> {/* No translation needed for icon */}
                    <Icon name="search" size={60} color="#BDBDBD" /> {/* No translation needed for icon */}
                    <Text style={styles.emptyText}>Type at least 2 characters to see suggestions</Text>
                </View>
                ) : null // Otherwise, render nothing (null)
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  backButton: {
    marginRight: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'black',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2874F0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    elevation: 4,
    height: 45,
  },
  searchPlaceholder: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    letterSpacing: 0,
    padding: 0,
    color: 'black',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAFA',
  },
  suggestionImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#424242',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    color: '#757575',
    fontSize: 14,
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 14,
  },
  errorText: {
    marginTop: 15,
    color: '#F44336',
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
  ,
  recentSearchesContainer: {
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllButtonText: {
    fontSize: 14,
    color: '#2874F0',
  },
  recentSearchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12, // Adjusted for image padding
    gap: 8,
  },
  recentSearchChip: {
    width: (Dimensions.get('window').width - 24 - 16 - 10) / 3, // Adjusted for 3 items per row with gaps
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row', // Added for image beside text
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  recentSearchImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  recentSearchIcon: {
    marginRight: 6,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 14,
    color: '#616161',
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonLine: {
    height: 16,
    width: '80%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});