import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import ProductGrid from '@/components/ProductGrid';

export default function CategoryProductsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Category ID is missing.");
      return;
    }

    const fetchProductsByCategory = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('medicines')
        .select('*')
        .eq('category_id', id);

      if (fetchError) {
        console.error('Error fetching products for category:', fetchError.message);
        setError('Failed to load products. Please try again.');
      } else if (data) {
        // Map snake_case from DB to camelCase for the component
        const productsData = data.map((p) => ({
          ...p,
          originalPrice: p.original_price,
        }));
        setProducts(productsData as Product[]);
      }

      setLoading(false);
    };

    fetchProductsByCategory();
  }, [id]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    if (error) {
      return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
    }

    if (products.length === 0) {
      return <View style={styles.center}><Text style={styles.emptyText}>No products found in this category.</Text></View>;
    }

    return <ProductGrid products={products} scrollEnabled={true} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: name || 'Category' }} />
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#757575', textAlign: 'center' },
});