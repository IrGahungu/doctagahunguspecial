import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bus, MapPin, Calendar as CalendarIcon, Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguageStore, translations } from '@/stores/languageStore';

const POPULAR_ROUTES = [
  { from: 'Bujumbura', to: 'Gitega' },
  { from: 'Gitega', to: 'Bujumbura' },
  { from: 'Bujumbura', to: 'Ngozi' },
  { from: 'Ngozi', to: 'Bujumbura' },
];

export default function BusBookingScreen() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  const onChange = (event: any, selectedDate?: Date) => {
    setShow(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSelectRoute = (route: { from: string; to: string }) => {
    setFrom(route.from);
    setTo(route.to);
  };

  const handleSearch = () => {
    if (!from || !to) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please enter both origin and destination.',
      });
      return;
    }

    router.push({
      pathname: '/bus-results',
      params: { 
        from: from.trim(), 
        to: to.trim(), 
        date: date.toISOString() 
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t["book a jk bus"]}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <Bus size={60} color="#4CAF50" />
          <Text style={styles.heroTitle}>{t["travel with comfort"]}</Text>
          <Text style={styles.heroSubtitle}>{t["safe and reliable journeys"]}</Text>
        </View>

        <View style={styles.popularSection}>
          <Text style={styles.popularTitle}>Popular Routes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularScroll}>
            {POPULAR_ROUTES.map((route, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.routeChip}
                onPress={() => handleSelectRoute(route)}
              >
                <Text style={styles.routeChipText}>
                  {route.from} → {route.to}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.bookingCard}>
          <View style={styles.inputGroup}>
            <View style={styles.iconBox}>
              <MapPin size={20} color="#757575" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t.from}</Text>
              <TextInput
                style={styles.input}
                placeholder="Origin City"
                value={from}
                onChangeText={setFrom}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <View style={styles.iconBox}>
              <MapPin size={20} color="#F44336" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t.to}</Text>
              <TextInput
                style={styles.input}
                placeholder="Destination City"
                value={to}
                onChangeText={setTo}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.inputGroup} // No translation needed for icon
            activeOpacity={0.7}
            onPress={() => setShow(true)}
          >
            <View style={styles.iconBox}>
              <CalendarIcon size={20} color="#2874F0" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Departure Date</Text>
              <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>

          {show && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChange}
              minimumDate={new Date()}
            />
          )}

          <TouchableOpacity 
            style={styles.searchButton} // No translation needed for icon
            onPress={handleSearch}
          >
            <Search size={20} color="#fff" />
            <Text style={styles.searchButtonText}>{t["search buses"]}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{t["why choose jk bus"]}</Text>
          <Text style={styles.infoItem}>• Air-conditioned modern fleet</Text>
          <Text style={styles.infoItem}>• Experienced and professional drivers</Text>
          <Text style={styles.infoItem}>• Real-time GPS tracking for safety</Text>
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'black', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Roboto-Bold', textAlign: 'center', color: '#212121' },
  content: { padding: 16 },
  heroSection: { alignItems: 'center', marginVertical: 20 },
  heroTitle: { fontSize: 22, fontFamily: 'Roboto-Bold', color: '#212121', marginTop: 10 },
  heroSubtitle: { fontSize: 14, color: '#757575', textAlign: 'center', marginTop: 4 },
  popularSection: { marginBottom: 20 },
  popularTitle: { fontSize: 16, fontFamily: 'Roboto-Bold', color: '#212121', marginBottom: 10, marginLeft: 4 },
  popularScroll: { paddingBottom: 5 },
  routeChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  routeChipText: { color: '#4CAF50', fontFamily: 'Roboto-Medium', fontSize: 13 },
  bookingCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconBox: { width: 40, alignItems: 'center' },
  inputWrapper: { flex: 1, marginLeft: 8 },
  inputLabel: { fontSize: 12, color: '#757575', fontFamily: 'Roboto-Medium' },
  input: { fontSize: 16, color: '#212121', paddingVertical: 4, fontFamily: 'Roboto-Regular' },
  dateText: { fontSize: 16, color: '#212121', paddingVertical: 4, fontFamily: 'Roboto-Regular' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 40 },
  searchButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  searchButtonText: { color: 'white', fontSize: 16, fontFamily: 'Roboto-Bold' },
  infoBox: { marginTop: 30, padding: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12 },
  infoTitle: { fontSize: 16, fontFamily: 'Roboto-Bold', color: '#212121', marginBottom: 10 },
  infoItem: { fontSize: 14, color: '#555', marginBottom: 6, fontFamily: 'Roboto-Regular' },
  resultsSection: { marginTop: 24 },
  resultsTitle: { fontSize: 18, fontFamily: 'Roboto-Bold', color: '#212121', marginBottom: 12 },
  busCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  busMainInfo: { flex: 1 },
  busCompany: { fontSize: 14, color: '#4CAF50', fontFamily: 'Roboto-Bold' },
  busRoute: { fontSize: 16, color: '#212121', fontFamily: 'Roboto-Medium', marginVertical: 4 },
  busTime: { fontSize: 13, color: '#757575' },
  busPriceInfo: { alignItems: 'flex-end', justifyContent: 'center' },
  busPrice: { fontSize: 16, fontFamily: 'Roboto-Bold', color: '#212121', marginBottom: 8 },
  bookNowButton: { 
    backgroundColor: '#007BFF', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  bookNowText: { color: '#fff', fontSize: 12, fontFamily: 'Roboto-Bold' },
  noResultsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center' },
  noResultsText: { color: '#757575', fontFamily: 'Roboto-Regular' },
});