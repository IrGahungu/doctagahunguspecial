import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { useLanguageStore, translations } from '@/stores/languageStore';

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

const PharmacySkeleton = () => {
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

  return <Animated.View style={[styles.skeleton, { opacity: pulseAnim }, styles.image]} />;
};

const SkeletonCard = () => (
  <View style={[styles.cardBase, styles.defaultCard]}>
    <View style={styles.imageContainer}>
      <PharmacySkeleton />
    </View>
    <View style={styles.details}>
      <View style={[styles.skeletonText, { width: '80%', alignSelf: 'center' }]} />
      <View style={[styles.skeletonText, { width: '60%', alignSelf: 'center', marginTop: 4 }]} />
    </View>
  </View>
);

const PharmacyItem = ({ item, baseUrl }: { item: SimplePharmacy; baseUrl: string }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  return (
    <Pressable
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
      <View style={styles.imageContainer}>
        {hasError || !item.image ? (
          <View style={[styles.image, styles.placeholderImage]}>
            <Icon name="local-pharmacy" size={40} color="#ccc" />
          </View>
        ) : (
          <>
            <Image 
              source={{ uri: item.image && !item.image.startsWith('http') ? `${baseUrl}${item.image}` : item.image }} 
              style={styles.image} 
              resizeMode="cover" 
              onLoadStart={() => setIsImageLoading(true)} 
              onLoadEnd={() => {
                setIsImageLoading(false);
                setHasError(false);
              }} 
              onError={() => {
                setHasError(true);
                setIsImageLoading(false);
              }} 
            />
            {isImageLoading && (
              <View style={styles.loadingOverlay}>
                <PharmacySkeleton />
              </View>
            )}
          </>
        )}
      </View>
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <View style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>{t["see details"]}</Text>
        </View>
      </View>
    </Pressable>
  );
};

export default function FeaturedPharmacies({ title, onViewAll, baseUrl = "" }: Props) {
  const [items, setItems] = useState<SimplePharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

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
        .ilike('country', country.trim())
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

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
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
      </View>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>{t["no pharmacies available"]}</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && <Pressable onPress={onViewAll}><Text style={styles.viewAll}>View All</Text></Pressable>}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item) => (
            <PharmacyItem key={item.id} item={item} baseUrl={baseUrl} />
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
    paddingTop: 12 
  },
  title: { 
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
  image: { 
    width: '100%', 
    height: 120, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12 
  },
  imageContainer: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    width: '100%',
    height: '100%',
    borderRadius: 12, // Match card border radius
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
  },
  defaultCard: { 
    height: 220 
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
  detailsButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
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