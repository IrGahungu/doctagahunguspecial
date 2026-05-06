import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Keyboard, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import SearchResults from '@/components/SearchResults';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";
const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";
const HOSPITAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/hospital-images/";
const DOCTOR_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/doctor-images/";
const INSURANCE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/insurance-images/";

type Suggestion = {
  name: string;
  image?: string;
  type: 'medicine' | 'pharmacy' | 'hospital' | 'doctor' | 'insurance';
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const stored = await SecureStore.getItemAsync('user_country');
      setCountry(stored ? stored.trim() : null);
    };
    fetchCountry();
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

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
          supabase.from('stock').select('name, image').ilike('name', `%${query}%`).limit(3),
          supabase.from('pharmacy_applications').select('name, image').ilike('name', `%${query}%`).limit(2),
          supabase.from('hospital_applications').select('name, image')
            .or(`name.ilike.%${query}%,available_blood_types.ilike.%${query}%,medical_equipment.ilike.%${query}%`)
            .limit(2),
          supabase.from('doctor_applications').select('name, specialty, image')
            .or(`name.ilike.%${query}%,specialty.ilike.%${query}%`)
            .limit(2),
          supabase.from('insurance_applications').select('name, image').ilike('name', `%${query}%`).limit(2),
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

  const performFinalSearch = async (searchTerm: string) => {
    if (!searchTerm.trim() || !country) return;
    
    Keyboard.dismiss();
    setIsLoading(true);
    setIsSearching(true);
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
            supabase.from('pharmacy_applications').select('*').ilike('country', country || '').ilike('name', term),
            supabase.from('hospital_applications').select('*').ilike('country', country || '')
                .or(`name.ilike.${term},available_blood_types.ilike.${term},medical_equipment.ilike.${term}`),
            supabase.from('doctor_applications').select('*').ilike('country', country || '').or(`name.ilike.${term},specialty.ilike.${term}`),
            supabase.from('insurance_applications').select('*').ilike('country', country || '').ilike('name', term),
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
            speciality: i.specialty || i.speciality, // Map specialty column for doctors
            image: i.image ? (i.image.startsWith('http') ? i.image : `${prefix}${i.image}`) : null
        }));

        setResults({
            medicines: Array.from(medicinesMap.values()),
            pharmacies: processImages(pharms.data || [], PHARMACY_URL_PREFIX, 'pharmacy'),
            hospitals: processImages(hosps.data || [], HOSPITAL_URL_PREFIX, 'hospital'),
            doctors: processImages(docs.data || [], DOCTOR_URL_PREFIX, 'doctor'),
            insurances: processImages(ins.data || [], INSURANCE_URL_PREFIX, 'insurance'),
        });
    } catch (err) {
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
            placeholderTextColor="#757575"
            placeholder="Search medicines, doctors, pharmacies..."
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Searching the database...</Text>
        </View>
      ) : isSearching && results ? (
        <SearchResults 
            results={results} 
            query={query} 
            onClose={() => setIsSearching(false)} 
        />
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => `${item.type}-${item.name}`}
          renderItem={({ item }) => (
            <TouchableOpacity 
                style={styles.suggestionItem} 
                onPress={() => {
                    setQuery(item.name);
                    performFinalSearch(item.name);
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
            query.length < 2 ? (
                <View style={styles.center}>
                    <Icon name="search" size={60} color="#BDBDBD" />
                    <Text style={styles.emptyText}>Type at least 2 characters to see suggestions</Text>
                </View>
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
  }
});