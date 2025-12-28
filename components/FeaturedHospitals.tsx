import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
// The global `Hospital` type from `@/types` likely defines `image` as `ImageSourcePropType`
// to support local assets (e.g., require('./image.png')). However, this component
// only fetches remote image URLs (strings) from Supabase.
// Defining a local type that accurately reflects the fetched data resolves the type mismatch.
type FeaturedHospital = {
  id: string;
  name: string | null;
  image: string | null;
  location: string | null;
  specialties: string[] | null;
  insurances: string[] | null;
  bloodTypes: string[] | null;
};
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={[styles.image, styles.skeleton]} />
    <View style={styles.details}>
      <View style={[styles.skeleton, { height: 20, width: '80%', borderRadius: 4, alignSelf: 'center' }]} />
    </View>
  </View>
);

export default function FeaturedHospitals() {
  const [hospitals, setHospitals] = useState<FeaturedHospital[]>([]);
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
        .from('hospitals')
        .select('id, name, image, location, specialties, insurances, blood_types')
        .eq('country', country)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        console.error('Error fetching featured hospitals:', error.message);
      } else if (data) {
        const formattedData = data.map((h) => ({ ...h, bloodTypes: h.blood_types }));
        setHospitals(formattedData);
      }
      setLoading(false);
    };

    fetchHospitals();
  }, [country]);

  const renderItem = ({ item }: { item: FeaturedHospital }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && Platform.OS !== 'android' && { opacity: 0.85 },
      ]}
      android_ripple={{ color: '#e0e0e0' }}
      onPress={() => {
        console.log('Navigating to hospital:', item.id, item.name);
        router.push({
          pathname: '/hospital/[id]' as const,
          params: {
            id: item.id,
            name: item.name || '',
            image: item.image || '',
            location: JSON.stringify(item.location || []),
            specialties: JSON.stringify(item.specialties || []),
            insurances: JSON.stringify(item.insurances || []),
            bloodTypes: JSON.stringify(item.bloodTypes || []),
          },
        });
      }}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Featured Hospitals</Text>
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (!loading && hospitals.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Featured Hospitals</Text>
        <Text style={styles.noDataText}>No Hospitals available, Coming soon</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Featured Hospitals</Text>
      <FlatList
        data={hospitals}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingVertical: 16 
  },
  header: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  list: { 
    paddingHorizontal: 16 
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: 200,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginHorizontal: 4,
    marginBottom: 16,
    shadowOpacity: 0.2,
    elevation: 4,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  image: { 
    width: '100%', 
    height: 120, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12 
  },
  details: { 
    padding: 12 
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: '#212121',
    alignItems: 'center',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
  location: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#757575',
  },
  noDataText: {
    textAlign: 'center',
    paddingHorizontal: 16,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
});