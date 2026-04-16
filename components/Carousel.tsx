import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, ScrollView, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent, Text } from 'react-native';
import { supabase } from "@/lib/supabase";
import * as SecureStore from "expo-secure-store";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH;
const AUTO_SCROLL_INTERVAL = 3000;

type Banner = {
  id: string;
  image: string;
  link: string;
  country: string;
};

interface CarouselProps {
  baseUrl?: string;
}

const Carousel: React.FC<CarouselProps> = ({ baseUrl = "" }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  //
  // Fetch selected country
  //
  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  //
  // Fetch banners function (used by both initial load & realtime)
  //
  const fetchBanners = async () => {
    if (!country) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('country', country)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching banners:', error.message);
    } else if (data) {
      setBanners(data);
      setActiveIndex(0); // Reset to first slide if data changes
    }

    setLoading(false);
  };

  //
  // Initial fetch when country is available
  //
  useEffect(() => {
    if (country) {
      fetchBanners();
    }
  }, [country]);

  //
  // 🔥 Silent realtime refresh
  //
  useRealtimeRefresh('banners', fetchBanners);

  //
  // Auto-scroll logic
  //
  useEffect(() => {
    if (banners.length === 0) return;

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      setActiveIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: ITEM_WIDTH * nextIndex,
        animated: true,
      });
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(timer);
  }, [activeIndex, banners.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / ITEM_WIDTH);
    setActiveIndex(index);
  };

  //
  // Loading State
  //
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.slide, styles.imageWrapper, { backgroundColor: '#e0e0e0' }]} />
      </View>
    );
  }

  //
  // Empty State
  //
  if (banners.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.slide, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text>No Banners Available</Text>
        </View>
      </View>
    );
  }

  //
  // Render
  //
  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {banners.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.slide}>
            <View style={styles.imageWrapper}>
              {item.image ? (
                <Image
                  source={{
                    uri:
                      item.image && !item.image.startsWith('http')
                        ? `${baseUrl}${item.image}`
                        : item.image,
                  }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                  <Icon name="image" size={60} color="#ccc" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    backgroundColor: '#E0F7FA',
  },
  slide: {
    width: ITEM_WIDTH,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '95%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: 'gray',
    borderRadius: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 10,
    width: '100%',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'gray',
  },
  paginationDotActive: {
    backgroundColor: 'green',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default Carousel;