import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

type Category = {
  id: string;
  name: string;
  icon?: string; // emoji from 'image' column
};

const CategoryItem = ({ category }: { category: Category }) => {
  // useRef is used to persist the animated value across re-renders
  const scale = React.useRef(new Animated.Value(1)).current;

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
          <Text style={styles.categoryIcon}>{category.icon}</Text>
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

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  const fetchCategories = async () => {
    if (!country) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, image')
      .eq('country', country)
      .order('created_at', { ascending: true })
      .limit(8); // Fetch only up to 8 categories

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    const formatted = data.map((cat: any) => ({ id: cat.id, name: cat.name, icon: cat.image }));
    setCategories(formatted || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [country]);

  if (!loading && categories.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No categories available, Coming Soon</Text>
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
    justifyContent: 'space-between',
    marginTop: 8,
    borderRadius: 20,
  },
  categoryItem: {
    width: '23%',
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
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
});

export default CategorySlider;