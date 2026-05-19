import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, Bell, Palette, Languages, Globe, ArrowLeft } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore'; // This is used in handleLogout
import { useLanguageStore, translations, Language } from '@/stores/languageStore';
import CountryPicker from '@/components/CountryPicker';

const COUNTRIES = [
  "Burundi",
  //"Rwanda",
  //"Congo",
  //"Tanzania",
  //"Kenya",
  //"Somaliya",
  //"South Soudan",
];

export default function SettingsScreen() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState('');
  const { language, setLanguage } = useLanguageStore();
  const t = translations[language];

  const handleLogout = () => {
    Alert.alert(
      t.confirmLogout,
      t.logoutMessage,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => { //
            // Also clear the selected country on logout
            useAuthStore.getState().setUserId(null);
            useCartStore.getState().clearItems();
            await SecureStore.deleteItemAsync("token");
            router.replace("/auth");
          },
        },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    const loadCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync('user_country');
      if (storedCountry) {
        setSelectedCountry(storedCountry);
      }
    };
    loadCountry();
  }, []);

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    await SecureStore.setItemAsync('user_country', country);
    // After changing the country, navigate to the home screen.
    // The home screen is already set up to refresh its content
    // when it comes into focus, so it will automatically update.
    router.push('/(tabs)');
  };

  const handleLanguagePress = () => {
    Alert.alert(
      t.language,
      "Select your preferred language / Hitamo ururimi / Choisissez votre langue",
      [
        { text: "English", onPress: () => setLanguage('en') },
        { text: "Kirundi", onPress: () => setLanguage('rn') },
        { text: "Français", onPress: () => setLanguage('fr') },
        { text: t.cancel, style: "cancel" },
      ]
    );
  };

  const getLanguageName = (code: Language) => {
    if (code === 'rn') return 'Kirundi';
    if (code === 'fr') return 'Français';
    return 'English';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <Globe size={22} color="#757575" />
            <Text style={styles.settingText}>{t.dataCountry}</Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <CountryPicker countries={COUNTRIES} selectedValue={selectedCountry} onValueChange={handleCountryChange} />
          </View>
        </View>
        <View style={styles.section}>
          {/* <View style={styles.settingItem}>
            <Bell size={22} color="#757575" />
            <Text style={styles.settingText}>Push Notifications</Text>
            <Switch trackColor={{ false: '#767577', true: '#81c784' }} thumbColor={'#4CAF50'} />
          </View> */}
          {/*<View style={styles.settingItem}>
            <Palette size={22} color="#757575" />
            <Text style={styles.settingText}>Dark Mode</Text>
            <Switch trackColor={{ false: '#767577', true: '#81c784' }} thumbColor={'#4CAF50'} />
          </View>*/}
          <TouchableOpacity style={styles.settingItem} onPress={handleLanguagePress}>
            <Languages size={22} color="#757575" />
            <Text style={styles.settingText}>{t.language}</Text>
            <Text style={styles.languageText}>{getLanguageName(language)}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="white" />
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
    color: '#212121',
  },
  languageText: {
    fontSize: 16,
    color: '#757575',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});