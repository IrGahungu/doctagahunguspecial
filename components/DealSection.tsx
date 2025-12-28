import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { DealOfTheDay } from '@/types';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

const SkeletonCard = () => (
  <View style={styles.dealCard}>
    <View style={[styles.dealImage, { backgroundColor: '#e0e0e0' }]} />
    <View style={styles.dealInfo}>
      <View style={{ height: 16, width: '80%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 4 }} />
      <View style={{ height: 16, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 4 }} />
      <View style={{ height: 14, width: '90%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
    </View>
  </View>
);

interface DealSectionProps {
  title: string;
  viewAllLink?: string;
}

const DealSection: React.FC<DealSectionProps> = ({ 
  title, 
  viewAllLink, 
}) => {
  const [deals, setDeals] = useState<DealOfTheDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('country', country)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deals:', error.message);
      } else if (data) {
        setDeals(data as DealOfTheDay[]);
      }
      setLoading(false);
    };

    fetchDeals();
  }, [country]);

  if (loading) {
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

  if (deals.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noDataText}>No Deals available, Coming soon</Text>
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
          <TouchableOpacity key={deal.id} style={styles.dealCard}>
            <Image source={{ uri: deal.image }} style={styles.dealImage} />
            <View style={styles.dealInfo}>
              <Text style={styles.dealTitle}>{deal.title}</Text>
              <Text style={styles.dealDiscount}>{deal.discount}</Text>
              <Text style={styles.dealTagline}>{deal.tagline}</Text>
            </View>
          </TouchableOpacity>
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