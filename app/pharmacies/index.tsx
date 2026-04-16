import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Dimensions, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";

const getFullImageUrl = (imagePath: any) => {
  if (!imagePath) return '';
  const path = String(imagePath);
  return path.startsWith('http') ? path : `${PHARMACY_URL_PREFIX}${path}`;
};

type Pharmacy = {
  id: string;
  name: string;
  image: string | null;
  location: string | null;
  accepted_insurances: string[] | null;
};

const SkeletonCard = () => (
  <View style={[styles.card, { width: cardWidth }]}>
    <View style={[styles.image, styles.skeleton]} />
    <View style={styles.details}>
      <View style={[styles.skeleton, { height: 20, width: '80%', borderRadius: 4, alignSelf: 'center' }]} />
    </View>
  </View>
);

export default function AllPharmaciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  const fetchPharmacies = useCallback(async () => {
    if (!country) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacy_applications')
      .select('*')
      .ilike('country', country.trim()) // Case-insensitive and trimmed
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pharmacies:', error.message);
    } else if (data) {
      setPharmacies(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [country]);

  useEffect(() => {
    if (!country) return;

    fetchPharmacies();
    
    // Subscribe to changes for this specific country
    const channel = supabase.channel('all-pharmacies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_applications', filter: `country=eq.${country.trim()}` }, fetchPharmacies)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [country, fetchPharmacies]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPharmacies();
  };

  const renderItem = ({ item }: { item: Pharmacy }) => (
    <Pressable
      style={[styles.card, { width: cardWidth }]}
      onPress={() => {
        router.push({
          pathname: '/pharmacy/[id]',
          params: { id: item.id },
        });
      }}
    >
      {item.image ? (
        <Image source={{ uri: getFullImageUrl(item.image) }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Icon name="local-pharmacy" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>All Pharmacies</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      {loading ? (
        <View>
          <View style={styles.columnWrapper}><SkeletonCard /><SkeletonCard /></View>
          <View style={styles.columnWrapper}><SkeletonCard /><SkeletonCard /></View>
          <View style={styles.columnWrapper}><SkeletonCard /><SkeletonCard /></View>
          <View style={styles.columnWrapper}><SkeletonCard /><SkeletonCard /></View>
        </View>
      ) : (
        <FlatList
          data={pharmacies}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
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
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  list: { paddingBottom: 16 },
  columnWrapper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: { width: '100%', height: 120 },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
  details: { padding: 12 },
  title: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
    marginBottom: 4,
    textAlign: 'center',
  },
  location: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#757575',
  },
});