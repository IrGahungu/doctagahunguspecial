import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Progress from 'react-native-progress'; // Need to install this: `npx expo install react-native-progress`
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabase";
import { useLanguageStore, translations } from '@/stores/languageStore';
import { useAuthStore } from "@/stores/authStore";

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);
  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const WalletSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.monetizationGoalCard}>
      <View style={[styles.skeletonLine, { width: 150, height: 20, marginBottom: 10 }]} />
      <View style={[styles.skeletonLine, { width: 100, height: 16 }]} />
    </View>
    <View style={styles.progressBarContainer}>
      <View style={[styles.skeletonLine, { width: '100%', height: 15, borderRadius: 15, marginBottom: 15 }]} />
      <View style={[styles.skeletonLine, { width: 120, height: 18, marginBottom: 10 }]} />
      <View style={[styles.skeletonLine, { width: '80%', height: 14, marginBottom: 10 }]} />
      <View style={[styles.skeletonLine, { width: '100%', height: 40, marginTop: 10 }]} />
    </View>
  </SkeletonPulse>
);

export default function WalletDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = useAuthStore((state) => state.userId);

  const [engagementPoints, setEngagementPoints] = useState(parseInt(params.engagementPoints as string || '0'));
  const postsLikedToday = parseInt(params.postsLikedToday as string || '0');
  const storiesViewedToday = parseInt(params.storiesViewedToday as string || '0');
  const epEarnedToday = parseInt(params.epEarnedToday as string || '0');
  
  const [monetizationGoal, setMonetizationGoal] = useState(parseInt(params.monetizationGoal as string || '50000'));
  const [displayProgress, setDisplayProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const progressPercentage = Math.min(engagementPoints / monetizationGoal, 1);
  const pointsToReachGoal = monetizationGoal - engagementPoints;

  useEffect(() => {
    const fetchGoal = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/engagement-settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.monetization_goal !== undefined) {
            setMonetizationGoal(data.monetization_goal);
          }
        }
      } catch (err) {
        console.error("Failed to fetch monetization goal:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoal();
  }, []);

  // Real-time listener for monetization goal and engagement points
  useEffect(() => {
    // 1. Listen for global settings changes (monetization goal)
    const settingsChannel = supabase
      .channel('settings-goal-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: 'key=eq.monetization_goal',
        },
        (payload: any) => {
          if (payload.new && payload.new.value !== undefined) {
            setMonetizationGoal(parseInt(payload.new.value || '0', 10));
          }
        }
      )
      .subscribe();

    // 2. Listen for current user's engagement points changes
    let userChannel: any;
    if (userId) {
      userChannel = supabase
        .channel(`user-points-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.engagement_points !== undefined) {
              setEngagementPoints(payload.new.engagement_points);
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(settingsChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, [userId]);

  useEffect(() => {
    if (!hasMounted) {
      // Wait for the screen transition to finish (500ms) before filling the first time
      const timer = setTimeout(() => {
        setDisplayProgress(progressPercentage);
        setHasMounted(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // For real-time updates after mounting, update immediately
      setDisplayProgress(progressPercentage);
    }
  }, [progressPercentage, hasMounted]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t["my engagement points"]}</Text>
        {/* Placeholder for alignment */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <WalletSkeleton />
        ) : (
          <>
            <View style={styles.monetizationGoalCard}>
              <Text style={styles.progressTitle}>Monetization Goal</Text>
              <Text style={styles.summaryItem}>Threshold: {monetizationGoal.toLocaleString()} EP</Text>
            </View>

        <View style={styles.progressBarContainer}>
          <Progress.Bar 
            progress={displayProgress} 
            width={null} // Takes full width
            height={15} // Increased height for better visibility
            borderRadius={15}
            color="#4CAF50"
            unfilledColor="#E0F7FA"
            borderColor="transparent" // Remove border to let shadow define the shape
            animated={true}
            animationType="timing"
          />
          <Text style={styles.progressText}>
            {engagementPoints.toLocaleString()} / {monetizationGoal.toLocaleString()} {t.ep}
          </Text>
          <Text style={styles.motivationText}>
            {pointsToReachGoal > 0
              ? `Just ${pointsToReachGoal.toLocaleString()} ${t["points to reach goal"]}`
              : t["goal reached"]}
          </Text>
          <Text style={styles.monetizationInfo}>
            Note: After reaching {monetizationGoal.toLocaleString()} {t.ep}, you will be able to turn your points into money and withdraw it.
          </Text>
        </View>
          </>
        )}

        {/* Daily Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Daily Summary</Text>
          <Text style={styles.summaryItem}>• Posts Liked Today: {postsLikedToday}</Text>
          <Text style={styles.summaryItem}>• Stories Viewed Today: {storiesViewedToday}</Text>
          <Text style={styles.summaryItem}>• Points Earned Today: {epEarnedToday.toLocaleString()} EP</Text>
          <Text style={styles.summaryMessage}>
            Keep it up dear,our Team loves you!!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E0F7FA',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center', // Keep this for horizontal centering
    color: '#212121',
  },
  scrollContent: {
    padding: 16,
  },
  monetizationGoalCard: { // New style for the first card (title only)
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 10, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // More pronounced shadow
    shadowOpacity: 0.2, // Increased opacity
    shadowRadius: 6, // Increased radius
    elevation: 5, // Increased elevation
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#212121',
    textAlign: 'center', // Center the title
  },
  progressText: {
    fontSize: 18, // Slightly larger
    fontWeight: 'bold',
    marginTop: 8,
    color: '#4CAF50',
  },
  motivationText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '600', // Make it a bit bolder
    textAlign: 'center',
    marginTop: 8,
  },
  monetizationInfo: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#212121',
    textAlign: 'center',
  },
  summaryItem: {
    fontSize: 15,
    color: '#424242',
    marginBottom: 5,
  },
  summaryMessage: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});