import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, FlatList, Keyboard, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X, ChevronRight, Pill } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialIcons'; // For medicine/pharmacy icons
import Carousel from '@/components/Carousel';

const { width } = Dimensions.get('window');

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

const BANNER_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/banner-images/";
const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";
const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const PrescriptionSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.resultsList}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.medicineCard, { height: 160 }]}>
          <View style={styles.medicineHeader}>
            <View style={[styles.skeletonLine, { width: 60, height: 60, borderRadius: 8, marginRight: 12 }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.skeletonLine, { width: '70%', height: 18, marginBottom: 8 }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 16 }]} />
            </View>
          </View>
          <View style={[styles.skeletonLine, { width: '100%', height: 1, marginVertical: 10 }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 14, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '60%', height: 20, borderRadius: 4 }]} />
        </View>
      ))}
    </View>
  </SkeletonPulse>
);

type MedicinePharmacy = {
  id: string;
  name: string;
  price: number;
  stockId: string;
  image?: string;
  location?: string;
};

type MedicineResult = {
  id: string;
  name: string;
  image?: string;
  price: number;
  originalPrice: number;
  pharmacies: MedicinePharmacy[];
  insurances: string[];
};

export default function PrescriptionsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<MedicineResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync('user_country');
      setCountry(storedCountry ? storedCountry.trim() : null);
    };
    fetchCountry();
  }, []);

  const performMultiSearch = useCallback(async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    if (!country) {
      console.warn("Country not set, cannot perform search.");
      return;
    }

    setIsLoading(true);
    Keyboard.dismiss();
    const medicineNames = searchText.split(/[\n,;]+/).map(name => name.trim()).filter(Boolean);

    if (medicineNames.length === 0) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const allMedicineResults: MedicineResult[] = [];

    try {
      for (const medName of medicineNames) {
        const { data: stockData, error } = await supabase
          .from('stock')
          .select(`
            *,
            pharmacy:pharmacy_applications!stock_pharmacy_id_fkey (
              id, name, image, location, accepted_insurances, country
            )
          `)
          .ilike('name', `%${medName}%`)
          .eq('in_stock', true)
          .ilike('pharmacy.country', country || '');

        if (error) {
          console.error(`Error searching for ${medName}:`, error);
          continue;
        }

        const medicinesMap = new Map<string, MedicineResult>();

        (stockData || []).forEach((item) => {
          const nameKey = item.name.trim().toLowerCase().replace(/[.,]$/, "");
          const price = Number(item.price);

          if (!medicinesMap.has(nameKey)) {
            medicinesMap.set(nameKey, {
              id: item.id, // This might be problematic if multiple stocks have same name but different IDs. For simplicity, taking first.
              name: item.name.replace(/[.,]$/, "").trim(),
              image: item.image ?? undefined,
              price: price,
              originalPrice: Number(item.original_price),
              pharmacies: [],
              insurances: item.insurances ? JSON.parse(item.insurances) : [],
            });
          }

          const currentMed = medicinesMap.get(nameKey)!;

          if (item.pharmacy) {
            let parsedLocation = [];
            try {
                parsedLocation = typeof item.pharmacy.location === 'string' ? JSON.parse(item.pharmacy.location) : item.pharmacy.location || [];
            } catch (e) { parsedLocation = []; }

            currentMed.pharmacies.push({
              id: item.pharmacy.id,
              name: item.pharmacy.name,
              price: price,
              stockId: item.id,
              image: item.pharmacy.image ?? undefined,
              location: Array.isArray(parsedLocation) ? parsedLocation.map((l: any) => `${l.city || ''} ${l.address || ''}`.trim()).filter(Boolean).join(', ') : '',
            });
          }

          if (price < currentMed.price) {
            currentMed.price = price;
            currentMed.originalPrice = Number(item.original_price);
          }
        });
        allMedicineResults.push(...Array.from(medicinesMap.values()));
      }
      setSearchResults(allMedicineResults);
    } catch (err) {
      console.error('Multi-search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchText, country]);

  const renderMedicineResult = ({ item }: { item: MedicineResult }) => (
    <View style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        {item.image ? (
          <Image
            source={{ uri: item.image.startsWith('http') ? item.image : `${MEDICINE_URL_PREFIX}${item.image.replace(/^\//, '')}` }}
            style={styles.medicineImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.medicineImagePlaceholder}>
            <Icon name="medication" size={24} color="#555" />
          </View>
        )}
        <View style={styles.medicineHeaderText}>
          <Text style={styles.medicineName}>{item.name}</Text>
          <Text style={styles.medicinePrice}>
            {getCurrency(country)} {item.price.toFixed(2)}
            {item.originalPrice > item.price && (
              <Text style={styles.medicineOriginalPrice}> {item.originalPrice.toFixed(2)}</Text>
            )}
          </Text>
        </View>
      </View>

      {item.pharmacies.length > 0 && (
        <View style={styles.pharmaciesSection}>
          <Text style={styles.sectionSubTitle}>Available at:</Text>
          {item.pharmacies.map((pharmacy) => (
            <TouchableOpacity
              key={pharmacy.stockId}
              style={styles.pharmacyItem}
              onPress={() => router.push({
                pathname: '/product/[id]',
                params: { id: pharmacy.stockId }
              })}
            >
              {pharmacy.image ? (
                <Image
                  source={{ uri: pharmacy.image.startsWith('http') ? pharmacy.image : `${PHARMACY_URL_PREFIX}${pharmacy.image.replace(/^\//, '')}` }}
                  style={styles.pharmacyIcon}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.pharmacyIconPlaceholder}>
                  <Icon name="local-pharmacy" size={16} color="#555" />
                </View>
              )}
              <View style={styles.pharmacyDetails}>
                <Text style={styles.pharmacyNameSmall}>{pharmacy.name}</Text>
                <Text style={styles.pharmacyPriceSmall}>{getCurrency(country)} {pharmacy.price.toFixed(2)}</Text>
                {pharmacy.location && <Text style={styles.pharmacyLocationSmall}>{pharmacy.location}</Text>}
              </View>
              <ChevronRight size={18} color="#9e9e9e" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {item.insurances.length > 0 && (
        <View style={styles.insurancesSection}>
          <Text style={styles.sectionSubTitle}>Covered by:</Text>
          <View style={styles.insuranceTags}>
            {item.insurances.map((insurance, index) => (
              <View key={index} style={styles.insuranceTag}>
                <Text style={styles.insuranceTagText}>{insurance}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Prescriptions</Text>
      </View>

      <Carousel baseUrl={BANNER_URL_PREFIX} />

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter medicine names (comma or new line separated)"
          multiline
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity style={styles.searchButton} onPress={performMultiSearch}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Search size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <PrescriptionSkeleton />
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderMedicineResult}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : (
        !isLoading && searchText.trim() !== '' && (
          <View style={styles.noResults}>
            <Icon name="search-off" size={40} color="#ccc" />
            <Text style={styles.noResultsText}>No results found for your prescriptions.</Text>
            <Text style={styles.noResultsSubText}>Try different spellings or fewer items.</Text>
          </View>
        )
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 60,
    maxHeight: 120,
    marginRight: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
    paddingBottom: 100, // For tab bar
  },
  medicineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  medicineImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicineHeaderText: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  medicinePrice: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: 4,
  },
  medicineOriginalPrice: {
    fontSize: 14,
    color: '#9e9e9e',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  pharmaciesSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  pharmacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  pharmacyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  pharmacyIconPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pharmacyDetails: {
    flex: 1,
  },
  pharmacyNameSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  pharmacyPriceSmall: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  pharmacyLocationSmall: {
    fontSize: 11,
    color: '#666',
  },
  insurancesSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  insuranceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  insuranceTag: {
    backgroundColor: '#e8f5e9',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  insuranceTagText: {
    fontSize: 12,
    color: '#2e7d32',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#555',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});