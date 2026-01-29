import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';
import type { Doctor } from '@/types';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // padding included

const SkeletonCard = () => (
  <View style={{ width: cardWidth }}>
    <View style={styles.cardBase}>
      <View style={[styles.image, { backgroundColor: '#e0e0e0' }]} />
      <View style={styles.infoCard}>
        <View style={{ height: 20, width: '80%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8 }} />
        <View style={{ height: 16, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 4 }} />
        <View style={{ height: 14, width: '70%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
      </View>
    </View>
  </View>
);

export default function AllDoctorsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
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

    const fetchDoctors = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('doctor_applications')
        .select('*')
        .eq('country', country)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching doctors:', error.message);
      } else {
        setDoctors(data ?? []);
      }
      setLoading(false)
    };

    fetchDoctors();

    const channel = supabase
      .channel('all-doctors-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_applications' }, fetchDoctors)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [country]);

  const renderItem = ({ item }: { item: Doctor }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/doctor/[id]',
          params: { 
            id: item.id,
            name: item.name || '',
            image: String(item.image || ''),
            specialty: item.specialty || '',
            location: JSON.stringify(item.location || []),
          },
        })
      }
      style={{ width: cardWidth }}
    >
      <View style={styles.cardBase}>
        {/* Image */}
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require('@/assets/images/two.jpg')
          }
          style={styles.image}
          resizeMode="cover"
        />

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.specialty && (
            <Text style={styles.specialty} numberOfLines={1}>
              {item.specialty}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          All Doctors
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View>
          <View style={styles.columnWrapper}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View style={styles.columnWrapper}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <View style={styles.columnWrapper}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      ) : (
        <FlatList
          data={doctors}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20 }}>
              No doctors found.
            </Text>
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
    borderWidth: 1,
    borderRadius: 20,
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
    paddingBottom: 16,
  },
  columnWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardBase: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 180,
  },
  infoCard: {
    padding: 10,
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 12,
    color: '#388E3C',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: 'Roboto-Medium',
  },
  location: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#757575',
  },
});
