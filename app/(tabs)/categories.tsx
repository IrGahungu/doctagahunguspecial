import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import Header from '@/components/Header';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 16 padding on each side, 16 gap

// Skeleton component for a single category card
const SkeletonCategoryCard: React.FC = () => (
  <View style={[styles.categoryCard, styles.skeletonCard, { width: cardWidth }]}>
    <View style={styles.skeletonIcon} />
    <View style={styles.skeletonName} />
  </View>
);

// Skeleton component for the category grid
const CategoryGridSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
    <SkeletonCategoryCard />
  </View>
);

type Category = {
  id: string;
  name: string;
  icon?: string; // emoji
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
      return; // Optionally handle error state for UI
    }
    const formatted = data.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.image, // emoji
    }));
    setCategories(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();

    // Set up real-time subscription
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        fetchCategories
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCategoryPress = (category: Category) => {
    console.log('[CategoriesScreen] Navigating to category:', category.name, 'with ID:', category.id);
    router.push({
      pathname: '/category/[id]',
      params: { id: category.id, name: category.name }
    });
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />
      <Text style={styles.pageTitle}>All Categories</Text>
      {loading ? (
        <CategoryGridSkeleton />
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Added space for tab bar
  },
  pageTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 20,
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 16,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 8
  },
  categoryName: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: '#212121',
    textAlign: 'center'
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: '#f0f0f0', // Lighter gray for skeleton background
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 50, // Approximate size of the emoji icon
    height: 50,
    borderRadius: 25, // Make it circular
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
  },
  skeletonName: {
    width: '70%', // Approximate width of the category name
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});
