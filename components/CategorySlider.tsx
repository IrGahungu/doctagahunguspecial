import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

type Category = {
  id: string;
  name: string;
  icon?: string;
};

const CategoryItem = ({ category }: { category: Category }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        router.push({
          pathname: '/category/[id]',
          params: { id: category.id, name: category.name },
        });
      }}
    >
      <Animated.View style={[styles.categoryItem, { transform: [{ scale }] }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.categoryIcon}>
            {category.icon ? String(category.icon) : '📦'}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.categoryName}>
          {category.name}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const CategorySlider: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use a ref for country to avoid stale closures in real-time callbacks
  const countryRef = useRef<string | null>(null);

  useEffect(() => {
    countryRef.current = country;
  }, [country]);

  //
  // Fetch Country
  //
  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };
    fetchCountry();
  }, []);

  //
  // Fetch Categories Function (Reusable)
  //
  const fetchCategories = useCallback(async (isSilent: any = false) => {
    const currentCountry = countryRef.current;
    if (!currentCountry) return;

    console.log(`[CategorySlider] Fetching categories for: ${currentCountry} (Silent: ${!!isSilent})`);

    // When triggered by real-time, isSilent receives the payload object. 
    // We ensure it remains silent unless explicitly called with false.
    // If isSilent is an object (Supabase payload), we treat it as a silent refresh.
    const silent = (typeof isSilent === 'boolean' ? isSilent : (typeof isSilent === 'object' && isSilent !== null));
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, image')
      .eq('country', currentCountry)
      .order('created_at', { ascending: true })
      .limit(8);

    if (error) {
      console.error('[CategorySlider] Error fetching:', error);
      setLoading(false);
      return;
    }

    const formatted = (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.image,
    }));

    setCategories(formatted);
    setLoading(false);
  }, []);

  //
  // Initial Fetch
  //
  useEffect(() => {
    if (country) {
      console.log("[CategorySlider] Component mounted/updated. Fetching categories for:", country);
      fetchCategories();
    }
  }, [country, fetchCategories]);

  //
  // 🔥 Realtime Refresh
  //
  useRealtimeRefresh('categories', () => {
    console.log("[CategorySlider] Real-time event detected on 'categories' table.");
    fetchCategories(true);
  });

  //
  // Empty State
  //
  if (!loading && categories.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>
          No categories available, Coming Soon
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {categories.map((category) => (
        <CategoryItem key={category.id} category={category} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 8,
    borderRadius: 20,
  },
  categoryItem: {
    width: '25%',
    marginBottom: 16,
    alignItems: 'center',
  },
  iconCircle: {
    backgroundColor: '#e0e0e0',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIcon: {
    fontSize: 24,
    color: '#333',
  },
  categoryName: {
    fontWeight: 'bold',
    fontSize: 11,
    color: '#212121',
    textAlign: 'center',
  },
  noDataText: {
    width: '100%',
    textAlign: 'center',
    color: '#757575',
    fontSize: 14,
  },
});

export default CategorySlider;