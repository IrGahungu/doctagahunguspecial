import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductGrid from '@/components/ProductGrid';
import { Product } from '@/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import * as SecureStore from "expo-secure-store";

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 16 padding on each side, 16 gap

// Skeleton component for a single product card
const SkeletonProductCard: React.FC = () => (
  <View style={[styles.skeletonCard, { width: cardWidth }]}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonInfo}>
      <View style={[styles.skeletonLine, { width: '80%' }]} />
      <View style={[styles.skeletonLine, { width: '50%', marginTop: 6 }]} />
    </View>
  </View>
);

// Skeleton component for the grid
const ProductGridSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <SkeletonProductCard />
    <SkeletonProductCard />
    <SkeletonProductCard />
    <SkeletonProductCard />
    <SkeletonProductCard />
    <SkeletonProductCard />
  </View>
);

export default function CategoryDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const navigation = useNavigation();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);


  useEffect(() => {
    if (!id || !country) { // Don't fetch until country is loaded
      setLoading(false);
      setError('Category ID is missing.');
      return;
    }

    const fetchProductsByCategory = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('medicines')
        .select('*')
        .eq('category_id', id)
        .eq('country', country);

      if (fetchError) {
        console.error('Error fetching products for category:', fetchError.message);
        setError('Failed to load products. Please try again.');
      } else if (data) {
        const productsData = data.map((p) => ({
          ...p,
          originalPrice: p.original_price,
        }));
        setProducts(productsData as Product[]);
      }

      setLoading(false);
    };

    fetchProductsByCategory();
  }, [id, country]);

  const renderContent = () => {
    if (loading) {
      return <ProductGridSkeleton />;
    }

    if (error) {
      return <View style={styles.centerContent}><Text style={styles.errorText}>{error}</Text></View>;
    }

    if (products.length === 0) {
      return <Text style={styles.noProducts}>No medicines found for this category.</Text>;
    }

    return <ProductGrid products={products} scrollEnabled={true} baseUrl={MEDICINE_URL_PREFIX} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Medicines for {name || '...'}
        </Text>
      </View>
      <Text style={styles.headerQuote}>
        "Dieu avec Gahungu, Votre Santé est assurée"
      </Text>
      <View style={styles.contentArea}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F7FA',
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    textAlign: 'center',
    marginRight: 40, // Balance the back button for centering
  },
  noProducts: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  headerQuote: {
    fontSize: 14,
    fontFamily: 'Roboto-Bold-Italic',
    color: '#666',
    textAlign: 'center',
    marginVertical: 5,
    marginLeft: 16,
  },
  contentArea: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  skeletonImage: {
    height: 120,
    backgroundColor: '#e0e0e0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  skeletonInfo: {
    padding: 12,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});