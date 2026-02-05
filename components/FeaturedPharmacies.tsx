import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

interface Props {
  title: string;
  onViewAll?: () => void;
  baseUrl?: string;
}

// This component only needs a subset of the full pharmacy data.
// Defining a local type makes the component's data requirements clear
// and resolves the TypeScript error.
type SimplePharmacy = {
  id: string;
  name: string;
  image: string | null;
};

const SkeletonCard = () => (
  <View style={[styles.cardBase, styles.defaultCard]}>
    <View style={[styles.image, styles.skeleton]} />
    <View style={styles.details}>
      <View style={[styles.skeleton, { height: 20, width: '80%', borderRadius: 4, alignSelf: 'center' }]} />
    </View>
  </View>
);

export default function FeaturedPharmacies({ title, onViewAll, baseUrl = "" }: Props) {
  const [items, setItems] = useState<SimplePharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      console.log('FeaturedPharmacies: Retrieved country from storage:', storedCountry);
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  useEffect(() => {
    if (!country) {
      console.log('FeaturedPharmacies: Country state is null/empty, skipping fetch.');
      return;
    }

    const fetchPharmacies = async () => {
      console.log('FeaturedPharmacies: Attempting to fetch for country:', country);
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacy_applications')
        .select('id, name, image')
        .eq('country', country)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        console.error('FeaturedPharmacies: Supabase error:', error);
      } else if (data) {
        console.log('FeaturedPharmacies: Successfully fetched data:', data);
        setItems(data);
      }
      setLoading(false);
    };

    fetchPharmacies();
  }, [country]);

  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  if (!loading && items.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>No Pharmacies available, Coming soon</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && <Pressable onPress={onViewAll}><Text style={styles.viewAll}>View All</Text></Pressable>}
      </View>
      {loading ? (
        <>
          <View style={styles.row}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View style={styles.row}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </>
      ) : (
        rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.cardBase, styles.defaultCard, pressed && Platform.OS !== 'android' && { opacity: 0.85 }]}
                android_ripple={{ color: '#e0e0e0' }}
                onPress={() => {
                  console.log('Navigating to pharmacy:', item.id, item.name);
                  router.push({
                    pathname: '/pharmacy/[id]',
                    params: { id: item.id }
                  });
                }}
              >
                {item.image ? (
                  <Image source={{ uri: item.image && !item.image.startsWith('http') ? `${baseUrl}${item.image}` : item.image }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.placeholderImage]}>
                    <Icon name="local-pharmacy" size={40} color="#ccc" />
                  </View>
                )}
                <View style={styles.details}><Text style={styles.name} numberOfLines={2}>{item.name}</Text></View>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { 
    marginTop: 16, 
    paddingHorizontal: 16, 
    backgroundColor: '#fff', 
    paddingBottom: 10,
    borderRadius: 20,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12, 
    paddingTop: 12 
  },
  title: { 
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: '#212121',
    alignItems: 'center',
  },
  viewAll: { 
    fontSize: 14, 
    color: 'blue' 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 16 
  },
  cardBase: { 
    width: '48%', 
    marginHorizontal: 4, 
    marginBottom: 16, 
    borderRadius: 12, 
    backgroundColor: 'white', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 4, 
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden' 
  },
  defaultCard: { 
    height: 200 
  },
  image: { 
    width: '100%', 
    height: 120, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12 
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
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: { 
    fontSize: 16, 
    fontWeight: '500', 
    textAlign: 'center', 
    color: '#212121' 
  },
  noDataText: {
    textAlign: 'center',
    padding: 16,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
  location: { 
    fontSize: 12, 
    color: '#777', 
    textAlign: 'center', 
    marginTop: 2 
  },
});