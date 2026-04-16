import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const HOSPITAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/hospital-images/";

const getFullImageUrl = (imagePath: any) => {
  if (!imagePath) return '';
  const path = String(imagePath);
  return path.startsWith('http') ? path : `${HOSPITAL_URL_PREFIX}${path}`;
};

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

const SkeletonCard = () => (
  <View style={[styles.card, { width: cardWidth }]}>
    <View style={[styles.image, styles.skeleton]} />
    <View style={styles.details}>
      <View style={[styles.skeleton, { height: 20, width: '90%', borderRadius: 4, marginBottom: 8, alignSelf: 'center' }]} />
      <View style={[styles.skeleton, { height: 16, width: '70%', borderRadius: 4, alignSelf: 'center' }]} />
    </View>
  </View>
);

export default function AllHospitalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  useEffect(() => {
    if (!country) return;

    const fetchHospitals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('hospital_applications')
        .select('id, name, image, country, service_summary, admission_process, partner_insurances, partner_pharmacies, contact_details, locations, available_services, available_blood_types, medical_equipment')
        .eq('country', country)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching hospitals:', error.message);
      } else if (data) {
        const formattedData = data.map(h => ({ ...h, bloodTypes: h.available_blood_types }));
        setHospitals(formattedData);
      }
      setLoading(false);
    };

    fetchHospitals();
    const channel = supabase
      .channel('all-hospitals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_applications', filter: `country=eq.${country}` }, fetchHospitals)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [country]);

  const renderItem = ({ item }: { item: Hospital }) => (
    <Pressable
      style={[styles.card, { width: cardWidth }]}
      onPress={() => {
        console.log('Navigating to hospital:', item.id, item.name);
        router.push({
          pathname: '/hospital/[id]',
          params: {
            id: item.id,
            name: item.name || '',
            image: getFullImageUrl(item.image),
            locations: JSON.stringify(item.locations || []),
          },
        });
      }}
    >
      {item.image ? (
        <Image source={{ uri: getFullImageUrl(item.image) }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Icon name="local-hospital" size={40} color="#ccc" />
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
        <Text style={styles.headerTitle} numberOfLines={1}>All Hospitals</Text>
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
          data={hospitals}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
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
  list: {
    paddingBottom: 16
  },
  columnWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
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
  image: {
    width: '100%',
    height: 120
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
  details: { 
    padding: 12 
  },
  title: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
    marginBottom: 4,
    textAlign:'center'
  },
  location: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: 'green',
    textAlign:'center'
  },
});