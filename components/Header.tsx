import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Assuming this is correct for your icons
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from "@/config"; // ✅ Import backend base URL
import * as SecureStore from "expo-secure-store";

const menuItems = [
  { name: 'Doctors', icon: 'doctor', backgroundColor: '#FFF9C4', route: '/doctors' },
  { name: 'Pharmacies', icon: 'hospital-building', backgroundColor: '#C8E6C9', route: '/pharmacies' },
  { name: 'Hospitals', icon: 'hospital-box', backgroundColor: '#B3E5FC', route: '/hospitals' },
  { name: 'Insurances', icon: 'shield-plus', backgroundColor: '#E0E0E0', route: '/insurances' },
];

const currencyMap: { [country: string]: string } = {
  Burundi: 'FBU',
  //Rwanda: 'RWF',
  //Tanzania: 'TSH',
  //Kenya: 'KSH',
  //Sudan: 'SDF',
  //Congo: 'FRC',
  //Somalia: 'FSM',
};

const getCurrency = (country: string | null): string => {
  return country ? currencyMap[country] || 'USD' : 'USD';
};

export default function Header() {
  const [fullname, setFullname] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [country, setCountry] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      console.log("🔍 Starting profile fetch...");
      setIsLoading(true);
      const token = await SecureStore.getItemAsync("token");
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
      console.log("🪪 Token from secure store:", token); // token stored after login
      if (!token) {
        console.log("⚠️ No token found — user is not logged in");
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("📦 Raw response object:", res);


      if (!res.ok) {
        console.log("❌ Failed to fetch profile. Status:", res.status);
        const errorText = await res.text();
        console.log("🧾 Error response:", errorText);
        return;
      }

      const data = await res.json();

      console.log("✅ Parsed profile data from backend:", data);

      // Log individual fields for clarity
      console.log("🧑 Fullname:", data.fullname);
      console.log("💰 Wallet balance (raw):", data.wallet_balance);

      setFullname(data.fullname);
      setWalletBalance(Number(data.wallet_balance) || 0);

      console.log("🎯 State updated → fullname:", data.fullname, "| wallet:", data.wallet_balance);

    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // useFocusEffect will refetch the data every time the screen comes into view,
  // ensuring the balance is always up-to-date after any changes.
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerTopSection}>
        <View style={styles.headerRow}>
          {isLoggedIn ? (
            <>
              <Text style={styles.welcomeText}>
                Murahawe ikaze kwa Dr. Gahungu: {' '}
                {isLoading ? (
                  <View style={styles.loadingIndicatorContainer}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                  </View>
                ) : (
                  fullname
                )}
              </Text>
              <TouchableOpacity
                style={styles.walletContainer}
                onPress={() => router.push('/wallet/add-money')}
                activeOpacity={0.7}
              >
                <Icon name="wallet" size={24} color="#4CAF50" />
                <Text style={styles.walletAmount}>
                   {walletBalance.toLocaleString()} {getCurrency(country)}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.welcomeText}>
              Murahawe ikaze kwa Dr. Gahungu
            </Text>
          )}
        </View>
        {isLoggedIn && country && (
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={12} color="#4CAF50" />
            <Text style={styles.locationText}>{country}</Text>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={styles.changeLocationText}>
                [click here to change]
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.container}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { backgroundColor: item.backgroundColor }]}
            onPress={() => router.push(item.route as any)}
          >
            <Icon name={item.icon} size={24} color="#000" />
            <Text style={styles.menuText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    margin: 12,
  },
  headerTopSection: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2874F0',
    textAlign: 'center',
    flex: 1,
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
    elevation: 2,
  },
  walletAmount: {
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#2874F0',
    fontSize: 12,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 10,
    color: 'black',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  changeLocationText: {
    fontSize: 10,
    color: '#2874F0',
    marginLeft: 4,
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#E0F7FA',
    borderRadius: 16,
    gap: 8,
    justifyContent: 'center',
  },
  menuItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    marginTop: 6,
    color: '#000',
    fontSize: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Keep this to center the ActivityIndicator within the container
    alignItems: 'center', // Center vertically

  },
});