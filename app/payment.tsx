import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from '@/components/Toast';
import { useToastStore } from '@/stores/toastStore';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const { doctorName, date, time, type, consultationFee } = useLocalSearchParams<{
    doctorName?: string;
    date?: string;
    time?: string;
    type?: 'online' | 'in-office';
    consultationFee?: string;
  }>();
  const showToast = useToastStore((state) => state.showToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const handlePayment = (method: 'Gahungu Wallet' | 'Gahungu Card') => {
    console.log(`Processing payment for ${doctorName} on ${date} at ${time} (${type}) with ${method}`);
    showToast('DR. IR. Gahungu ariko arabijengajenga,vuba birakora!', 7000);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top, paddingBottom: 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        {/* Placeholder for right icon to balance layout */}
        <View style={styles.headerRightPlaceholder} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Doctor</Text>
            <Text style={styles.detailValue}>{doctorName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{type === 'online' ? 'Online' : 'In-Office'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Consultation Fee(To be Fixed by Doctors)</Text>
            <Text style={styles.detailValue}>{consultationFee}</Text>
          </View>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.buttonsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressedButton,
              ]}
              onPress={() => handlePayment('Gahungu Wallet')}
            >
              <Text style={styles.buttonText}>Pay with Gahungu Wallet</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressedButton,
              ]}
              onPress={() => handlePayment('Gahungu Card')}
            >
              <Text style={styles.buttonText}>Pay with Gahungu Card</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#E0F7FA',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40, // Same width as backButton for balance
  },
  scrollContent: {
    paddingBottom: 16,
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#212121',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pressedButton: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
    textAlign: 'center',
  },
});