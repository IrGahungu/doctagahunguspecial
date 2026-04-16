import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Progress from 'react-native-progress'; // Need to install this: `npx expo install react-native-progress`

export default function WalletDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const engagementPoints = parseInt(params.engagementPoints as string || '0');
  const postsLikedToday = parseInt(params.postsLikedToday as string || '0');
  const storiesViewedToday = parseInt(params.storiesViewedToday as string || '0');
  const epEarnedToday = parseInt(params.epEarnedToday as string || '0');

  const MONETIZATION_GOAL = 50000;
  const progressPercentage = Math.min(engagementPoints / MONETIZATION_GOAL, 1);
  const pointsToReachGoal = MONETIZATION_GOAL - engagementPoints;

  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // 1. Reset progress to 0 on mount
    setDisplayProgress(0);
    
    // 2. Wait for the screen transition to finish (500ms) before filling
    const timer = setTimeout(() => {
      setDisplayProgress(progressPercentage);
    }, 500);

    return () => clearTimeout(timer);
  }, [progressPercentage]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Engagement Points</Text>
        {/* Placeholder for alignment */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            {engagementPoints.toLocaleString()} / {MONETIZATION_GOAL.toLocaleString()} EP
          </Text>
          <Text style={styles.motivationText}>
            {pointsToReachGoal > 0
              ? `Just ${pointsToReachGoal.toLocaleString()} EP to reach your goal! Keep it up! 💪`
              : `Congratulations! You've reached your monetization goal! 🎉`}
          </Text>
          <Text style={styles.monetizationInfo}>
            Note: After reaching {MONETIZATION_GOAL.toLocaleString()} EP, you will be able to turn your points into money and withdraw it.
          </Text>
        </View>

        {/* Daily Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Today's Engagement</Text>
          <Text style={styles.summaryItem}>You liked {postsLikedToday} Posts today.</Text>
          <Text style={styles.summaryItem}>You viewed {storiesViewedToday} Stories today.</Text>
          <Text style={styles.summaryItem}>You earned {epEarnedToday} EP today.</Text>
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
    padding: 16,
    marginTop: 50, // Increased space between title/header and container to 50
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
});