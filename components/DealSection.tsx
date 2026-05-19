import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Animated
} from 'react-native';
import { DealOfTheDay } from '@/types';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { translations, useLanguageStore } from '@/stores/languageStore';

const DealSkeleton = () => {
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

  return <Animated.View style={[styles.skeleton, { opacity: pulseAnim }, styles.dealImage]} />;
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
    <View style={styles.dealCard}>
      <View style={styles.imageContainer}>
        <DealSkeleton />
      </View>
      <View style={styles.dealInfo}>
        <Animated.View style={[styles.skeletonText, { width: '80%', opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonText, { width: '60%', opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonText, { width: '90%', opacity: pulseAnim }]} />
      </View>
    </View>
  );
};

const DealItem = ({ deal, baseUrl }: { deal: DealOfTheDay; baseUrl: string }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <TouchableOpacity style={styles.dealCard}>
      <View style={styles.imageContainer}>
        {hasError || !deal.image ? (
          <View style={[styles.dealImage, styles.placeholderImage]}>
            <Icon name="local-offer" size={40} color="#ccc" />
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: deal.image && !deal.image.startsWith('http') ? `${baseUrl}${deal.image}` : deal.image }} 
              style={styles.dealImage}
              onLoadStart={() => setIsImageLoading(true)}
              onLoadEnd={() => setIsImageLoading(false)}
              onError={() => {
                setHasError(true);
                setIsImageLoading(false);
              }}
            />
            {isImageLoading && (
              <View style={styles.loadingOverlay}>
                <DealSkeleton />
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle}>{deal.title}</Text>
        <Text style={styles.dealDiscount}>{deal.discount}</Text>
        <Text style={styles.dealTagline}>{deal.tagline}</Text>
      </View>
    </TouchableOpacity>
  );
};

interface DealSectionProps {
  title: string;
  viewAllLink?: string;
  baseUrl?: string;
}

const DealSection: React.FC<DealSectionProps> = ({ 
  title, 
  viewAllLink, 
  baseUrl = "",
}) => {
  const [deals, setDeals] = useState<DealOfTheDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  useEffect(() => {
    if (!country) return;

    const fetchDeals = async () => {
      setLoading(true);
      setFetchError(false);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('country', country)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deals:', error.message);
        setFetchError(true);
      } else if (data) {
        setDeals(data as DealOfTheDay[]);
      }
      setLoading(false);
    };

    fetchDeals();
  }, [country]);

  if (loading || fetchError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  if (!fetchError && deals.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>{t["no deals available"]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {deals.map((deal) => (
          <DealItem key={deal.id} deal={deal} baseUrl={baseUrl} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: '#212121',
    alignItems: 'center',
  },
  viewAll: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: '#2874F0',
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  dealCard: {
    width: 140,
    marginRight: 8,
  },
  dealImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageContainer: {
    width: '100%',
    height: 140,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
  },
  dealInfo: {
    alignItems: 'center',
  },
  dealTitle: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: '#212121',
    marginBottom: 2,
    textAlign: 'center',
  },
  dealDiscount: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 2,
    textAlign: 'center',
  },
  dealTagline: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    paddingHorizontal: 16,
    color: '#757575',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
});

export default DealSection;