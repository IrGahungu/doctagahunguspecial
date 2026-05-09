import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
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

const DoctorSkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
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
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return <Animated.View style={[styles.skeleton, { opacity: pulseAnim }]} />;
};

const SkeletonCard = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.cardBase, styles.skeletonCard]}>
      <View style={styles.imageContainer}>
        <DoctorSkeleton />
      </View>
      <View style={styles.infoContainer}>
        <Animated.View style={[styles.skeletonText, { width: '80%', opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonText, { width: '60%', opacity: pulseAnim, marginTop: 4 }]} />
      </View>
    </View>
  );
};

const DoctorItem = ({ doctor, baseUrl }: { doctor: Doctor; baseUrl: string }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <Pressable
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
      <View style={styles.imageContainer}>
        {hasError || !doctor.image ? (
          <View style={[styles.image, styles.placeholderImage]}>
            <Icon name="person" size={40} color="#ccc" />
          </View>
        ) : (
          <>
            <Image source={{ uri: doctor.image && !doctor.image.startsWith('http') ? `${baseUrl}${doctor.image}` : doctor.image }} style={styles.image} resizeMode="cover" onLoadStart={() => setIsImageLoading(true)} onLoadEnd={() => setIsImageLoading(false)} onError={() => setHasError(true)} />
            {isImageLoading && <View style={styles.loadingOverlay}><DoctorSkeleton /></View>}
          </>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{doctor.name}</Text>
        {doctor.specialty && <Text style={styles.specialty}>{doctor.specialty}</Text>}
        <View style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>See Details</Text>
        </View>
      </View>
    </Pressable>
  );
};

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
            <DoctorItem key={doctor.id} doctor={doctor} baseUrl={baseUrl} />
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
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  skeletonCard: {
    height: 220, // Approximate height of a loaded card
    justifyContent: 'space-between',
  },
  image: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  skeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 8,
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
  skeletonText: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
});
