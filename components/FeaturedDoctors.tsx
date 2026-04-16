import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  image?: string;
};

interface Props {
  title: string;
  items?: Doctor[];
  onViewAll?: () => void;
  baseUrl?: string;
}

const SkeletonCard = () => (
  <View style={{ width: '48%', marginHorizontal: 4, marginBottom: 16 }}>
    <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 }}>
      <View style={{ width: '100%', height: 180, backgroundColor: '#e0e0e0' }} />
      <View style={{ padding: 10, alignItems: 'center' }}>
        <View style={{ width: '70%', height: 16, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
        <View style={{ width: '40%', height: 12, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
      </View>
    </View>
  </View>
);

export default function FeaturedDoctors({ title, items: itemsProp, onViewAll, baseUrl = "" }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  useEffect(() => {
    if (itemsProp) {
      setDoctors(itemsProp.slice(0, 4));
      setLoading(false);
      return;
    }
    
    if (!country) return;

    const fetchDoctors = async () => {
      console.log('Fetching doctors for country:', country);
      setLoading(true);
      const { data, error } = await supabase
        .from('doctor_applications')
        .select('*')
        .ilike('country', country.trim())
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        console.error('Error fetching doctors:', error.message);
      } else {
        console.log('Doctors fetched:', data?.length);
        setDoctors(data || []);
      }
      setLoading(false);
    };
    fetchDoctors();
  }, [itemsProp, country]);

  // Split into rows of 2
  const rows: Doctor[][] = [];
  for (let i = 0; i < doctors.length; i += 2) {
    rows.push(doctors.slice(i, i + 2));
  }

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.row}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (!loading && doctors.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>No Doctors available, Coming soon</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && (
          <Pressable onPress={onViewAll}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        )}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((doctor) => (
            <Pressable
              key={doctor.id}
              style={({ pressed }) => [
                styles.cardBase,
                pressed && Platform.OS !== 'android' && { opacity: 0.85 },
              ]}
              android_ripple={{ color: '#e0e0e0' }}
              onPress={() => {
                router.push({
                  pathname: '/doctor/[id]',
                  params: {
                    id: doctor.id,
                    name: doctor.name,
                    image: doctor.image || '',
                    specialty: doctor.specialty || '',
                  },
                });
              }}
            >
              <Image
                source={
                  doctor.image
                    ? { uri: doctor.image && !doctor.image.startsWith('http') ? `${baseUrl}${doctor.image}` : doctor.image }
                    : require('@/assets/images/two.jpg')
                }
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.infoContainer}>
                <Text style={styles.name}>{doctor.name}</Text>
                {doctor.specialty && (
                  <Text style={styles.specialty}>{doctor.specialty}</Text>
                )}
                <View style={styles.detailsButton}>
                  <Text style={styles.detailsButtonText}>See Details</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
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
    paddingTop: 12,
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: '#212121',
    alignItems: 'center',
  },
  viewAll: {
    fontSize: 14,
    color: 'blue',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardBase: {
    width: '48%',
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '70%',
    height: 180,
    alignSelf: 'center',
    borderRadius: 12,
    marginBottom: 8,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  specialty: {
    fontSize: 12,
    color: '#388E3C',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Roboto-Medium',
  },
  detailsButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
  },
  noDataText: {
    textAlign: 'center',
    padding: 16,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
});
