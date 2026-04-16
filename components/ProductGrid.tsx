import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { Product } from '@/types';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const numColumns = 2;
const ITEM_WIDTH = (width - 32) / numColumns;

interface ProductGridProps {
  title?: string;
  products?: Product[];
  scrollEnabled?: boolean;
  baseUrl?: string;
}

const currencyMap: { [country: string]: string } = {
  Burundi: 'FBU',
  //Rwanda: 'RWF',
  //Tanzania: 'TSH',
  //Kenya: 'KSH',
  //Sudan: 'SDF',
  //Congo: 'FRC',
  //Somalia: 'FSM',
};

const getCurrency = (country: string | null): string => {
  return country ? currencyMap[country] || 'USD' : 'USD';
};

const ProductGrid: React.FC<ProductGridProps> = ({ title, products: productsProp, scrollEnabled = false, baseUrl = "" }) => {
  const [products, setProducts] = useState<Product[]>(productsProp || []);
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pharmacyIds, setPharmacyIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);

      if (storedCountry) {
        // Pre-fetch pharmacy IDs for this country once to optimize real-time refreshes
        const { data: pharmacies } = await supabase
          .from('pharmacy_applications')
          .select('id')
          .eq('country', storedCountry);

        if (pharmacies) {
          setPharmacyIds(pharmacies.map((p) => p.id));
        }
      }
    };

    fetchCountry();
  }, []);

  const fetchProducts = useCallback(async (isSilent = false) => {
    if (productsProp && !isSilent) {
      setProducts(productsProp);
      setLoading(false);
      return;
    }

    if (!country) return;

    if (!isSilent) setLoading(true);

    let currentPharmacyIds = pharmacyIds;

    // If state is empty, fetch them now
    if (currentPharmacyIds.length === 0) {
      const { data: pharmacies } = await supabase
        .from('pharmacy_applications')
        .select('id')
        .eq('country', country);
      currentPharmacyIds = pharmacies?.map((p) => p.id) || [];
      setPharmacyIds(currentPharmacyIds);
    }

    if (currentPharmacyIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .in('pharmacy_id', currentPharmacyIds)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error fetching products:', error.message);
    } else if (data) {
      // Map snake_case from DB to camelCase for the component
      const productsData = data.map((p) => ({
        ...p,
        originalPrice: p.original_price,
      }));
      setProducts(productsData as Product[]);
    } else {
      setProducts([]);
    }
    setLoading(false);
  }, [country, productsProp, pharmacyIds]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Internal real-time subscription for stock changes
  useEffect(() => {
    if (!country) return;

    const channel = supabase
      .channel(`public:stock:country=${country}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'stock' }, 
        (payload: any) => {
        console.log(`[ProductGrid] Real-time ${payload.eventType} detected on stock.`, payload.new?.id);
        fetchProducts(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ProductGrid] Subscribed to real-time stock updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [country, fetchProducts]);

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/product/[id]',
      params: {
        id: product.id,
        name: product.name, // Added name parameter
        image: product.image ? product.image.toString() : '',
        price: product.price.toString(),
        description: product.description || 'No description available',
        pharmacies: JSON.stringify(product.pharmacies || []),
        insurances: JSON.stringify(product.insurances || []),
        discountPercentage: product.discountPercentage?.toString() || '0',
        originalPrice: product.originalPrice?.toString() || '0'
      }
    });
  };

  const renderProduct = ({ item }: { item: Product }) => {

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image && !item.image.toString().startsWith('http') ? `${baseUrl}${item.image}` : item.image.toString() }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text numberOfLines={2} style={styles.productTitle}>
            {item.title || item.name} {/* Fallback to name if title is empty */}
          </Text>
          <View style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>See Details</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!loading && products.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.sectionTitle}>{title}</Text>}
        <Text style={styles.noDataText}>No Products available, Coming soon</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingTop: 16,
    paddingBottom: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#212121',
  },
  gridContainer: {
    paddingHorizontal: 8,
  },
  productCard: {
    width: ITEM_WIDTH,
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Roboto-Regular',
  },
  assuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2874F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  assuredText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Roboto-Medium',
  },
  productInfo: {
    padding: 8,
  },
  productTitle: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: '#212121',
    marginBottom: 4,
    height: 40,
    textAlign: 'center'
  },
  detailsButton: {
    marginTop: 4,
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  price: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: '#212121',
    marginLeft: 10,

  },
  originalPrice: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#757575',
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  discount: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: '#388E3C',
    marginLeft: 10
  },
  freeDelivery: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#757575',
    marginBottom: 6,
  },
  cartButton: {
    marginTop: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  cartButtonText: {
    color: '#000',
    fontSize: 14,
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

export default ProductGrid;