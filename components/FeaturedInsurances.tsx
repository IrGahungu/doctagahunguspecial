import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Local type for data fetched from Supabase
type FeaturedInsurance = {
  id: string;
  name: string | null;
  image: string | null;
  status?: string;
  country?: string;
};

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={[styles.image, styles.skeleton]} />
    <View style={styles.details}>
      <View style={[styles.skeleton, { height: 20, width: '80%', borderRadius: 4, alignSelf: 'center' }]} />
    </View>
  </View>
);

export default function FeaturedInsurances() {
  const [insurances, setInsurances] = useState<FeaturedInsurance[]>([]);
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
    const fetchInsurances = async () => {
      console.log('[FeaturedInsurances] Fetching... | Country Filter:', country);
      setLoading(true);
      
      let query = supabase
        .from('insurance_applications')
        .select('id, name, image, status, country')
        
        .order('created_at', { ascending: false })
        .limit(4);

      if (country) {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[FeaturedInsurances] Error:', error.message);
      } else if (data) {
        console.log(`[FeaturedInsurances] Success. Found ${data.length} records.`);
        if (data.length === 0) {
          const { count } = await supabase.from('insurance_applications').select('*', { count: 'exact', head: true });
          console.log('[FeaturedInsurances] Diagnostic: Total rows in table:', count);
          const { data: sample } = await supabase.from('insurance_applications').select('name, status, country').limit(5);
          console.log('[FeaturedInsurances] Diagnostic: Sample rows:', JSON.stringify(sample, null, 2));
        } else {
          console.log('[FeaturedInsurances] Data:', JSON.stringify(data, null, 2));
        }
        setInsurances(data);
      }
      setLoading(false);
    };

    fetchInsurances();
  }, [country]);

  const renderItem = ({ item }: { item: FeaturedInsurance }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && Platform.OS !== 'android' && { opacity: 0.85 },
      ]}
      android_ripple={{ color: '#e0e0e0' }}
      onPress={() => {
        console.log('Navigating to insurance:', item.id, item.name);
        router.push({
          pathname: '/insurance/[id]' as const,
          params: {
            id: item.id,
            name: item.name || '',
            image: item.image || ''
          },
        });
      }}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Icon name="shield" size={40} color="#ccc" />
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
        <Text style={styles.header}>Featured Insurances</Text>
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (!loading && insurances.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Featured Insurances</Text>
        <Text style={styles.noDataText}>No Insurances available, Coming soon</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Featured Insurances</Text>
      <FlatList
        data={insurances}
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
    paddingVertical: 16 ,
    marginBottom: 40,
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
  noDataText: {
    textAlign: 'center',
    paddingHorizontal: 16,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
});