import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Assuming this is correct for your icons
import { router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from "@/config"; // ✅ Import backend base URL
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguageStore, translations } from '@/stores/languageStore';

const getMenuItems = (t: any) => [
  { name: t.doctors, icon: 'doctor', backgroundColor: '#FFF9C4', route: '/doctors' },
  { name: t.pharmacies, icon: 'hospital-building', backgroundColor: '#C8E6C9', route: '/pharmacies' },
  { name: t.hospitals, icon: 'hospital-box', backgroundColor: '#B3E5FC', route: '/hospitals' },
  { name: t.insurances, icon: 'shield-plus', backgroundColor: '#E0E0E0', route: '/insurances' },
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

const { width } = Dimensions.get('window');

const FloatingParticle = ({ startX, duration, size, color, delay }: { startX: number, duration: number, size: number, color: string, delay: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -200,
          duration: duration,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -20,
        left: startX,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.5,
        transform: [{ translateY }],
        zIndex: -1,
      }}
    />
  );
};

const Firework = ({ startX, delay, color }: { startX: number, delay: number, color: string }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      anim.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.delay(Math.random() * 1500)
      ]).start(loop);
    };
    loop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [20, -120],
    extrapolate: 'clamp',
  });

  const projectileOpacity = anim.interpolate({
    inputRange: [0, 0.5, 0.51],
    outputRange: [1, 1, 0],
  });

  const explosionScale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.1, 2],
  });

  const explosionOpacity = anim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 0],
  });

  return (
    <View style={{ position: 'absolute', left: startX, bottom: 0 }}>
      <Animated.View style={{
        width: 4, height: 8, backgroundColor: color, borderRadius: 2,
        transform: [{ translateY }],
        opacity: projectileOpacity,
      }} />
      <Animated.View style={{
        position: 'absolute',
        left: -20, top: -120, width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: explosionScale }],
        opacity: explosionOpacity,
      }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <View key={i} style={{
            position: 'absolute',
            height: 4, width: 4, borderRadius: 2, backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }, { translateY: -12 }]
          }} />
        ))}
      </Animated.View>
    </View>
  );
};

export default function Header() {
  console.log('[Header Component] Rendering...');
  const language = useLanguageStore(state => state.language);
  const t = translations[language];
  const [fullname, setFullname] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<'Excellent' | 'Not Good' | 'Checking...'>('Checking...');
  const [country, setCountry] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { //
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [blinkAnim]);

  const checkNetwork = async () => {
    setNetworkStatus('Checking...');
    const start = Date.now();
    try {
      // Perform a lightweight HEAD request to check latency
      const response = await fetch(`${API_BASE_URL}/`, { 
        method: 'HEAD', 
        cache: 'no-cache' 
      });
      const duration = Date.now() - start;
      
      if (response.ok && duration < 600) {
        setNetworkStatus('Excellent');
      } else {
        setNetworkStatus('Not Good');
      }
    } catch (err) {
      setNetworkStatus('Not Good');
    }
  };

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
      checkNetwork();
    }, [])
  );

  // Periodic network check every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkNetwork();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 10 }]}>
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: -1 }]} pointerEvents="none">
        <FloatingParticle startX={width * 0.05} duration={2500} size={20} color="#FFCDD2" delay={0} />
        <FloatingParticle startX={width * 0.1} duration={2800} size={22} color="#EF9A9A" delay={1200} />
        <FloatingParticle startX={width * 0.15} duration={3000} size={18} color="#E1BEE7" delay={500} />
        <FloatingParticle startX={width * 0.2} duration={2600} size={24} color="#CE93D8" delay={1800} />
        <FloatingParticle startX={width * 0.25} duration={2200} size={22} color="#BBDEFB" delay={200} />
        <FloatingParticle startX={width * 0.3} duration={2900} size={19} color="#90CAF9" delay={1400} />
        <FloatingParticle startX={width * 0.35} duration={2800} size={15} color="#C8E6C9" delay={800} />
        <FloatingParticle startX={width * 0.4} duration={2400} size={23} color="#A5D6A7" delay={2000} />
        <FloatingParticle startX={width * 0.45} duration={2600} size={25} color="#FFF9C4" delay={100} />
        <FloatingParticle startX={width * 0.5} duration={2700} size={20} color="#FFF59D" delay={1600} />
        <FloatingParticle startX={width * 0.55} duration={2900} size={19} color="#FFCCBC" delay={600} />
        <FloatingParticle startX={width * 0.6} duration={2500} size={21} color="#FFAB91" delay={2200} />
        <FloatingParticle startX={width * 0.65} duration={2700} size={21} color="#D1C4E9" delay={300} />
        <FloatingParticle startX={width * 0.7} duration={2300} size={18} color="#B39DDB" delay={1900} />
        <FloatingParticle startX={width * 0.75} duration={3100} size={16} color="#B2DFDB" delay={900} />
        <FloatingParticle startX={width * 0.8} duration={2600} size={20} color="#80CBC4" delay={1300} />
        <FloatingParticle startX={width * 0.85} duration={2400} size={24} color="#F0F4C3" delay={400} />
        <FloatingParticle startX={width * 0.9} duration={2800} size={22} color="#E6EE9C" delay={1700} />
        <FloatingParticle startX={width * 0.95} duration={3200} size={17} color="#FFECB3" delay={700} />
        <Firework startX={width * 0.1} color="#FF5252" delay={1200} />
        <Firework startX={width * 0.15} color="#FF4081" delay={2500} />
        <Firework startX={width * 0.3} color="#FFAB40" delay={300} />
        <Firework startX={width * 0.4} color="#E040FB" delay={1800} />
        <Firework startX={width * 0.5} color="#FFD740" delay={1500} />
        <Firework startX={width * 0.6} color="#69F0AE" delay={2200} />
        <Firework startX={width * 0.7} color="#FF5252" delay={200} />
        <Firework startX={width * 0.8} color="#40C4FF" delay={1000} />
        <Firework startX={width * 0.9} color="#FFAB40" delay={800} />
      </View>

      <View style={styles.headerTopSection}>
        <View style={styles.headerRow}>
          <View style={styles.leftInfoContainer}>
            {isLoggedIn ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.welcomeText}>
                  {t["murahawe ikaze kwa Dr. Gahungu:"]} {' '}
                  {!isLoading && fullname}
                </Text>
                {isLoading && (
                  <ActivityIndicator size="small" color="#4CAF50" style={{ marginLeft: 4 }} />
                )}
              </View>
            ) : (
              <Text style={styles.welcomeText}>{t["murahawe ikaze kwa Dr. Gahungu:"]}</Text>
            )}

            <View style={[styles.networkTester, { borderColor: networkStatus === 'Excellent' ? '#4CAF50' : networkStatus === 'Checking...' ? '#FFA000' : '#F44336' }]}>
              <Animated.View style={[
                styles.statusDot, 
                { 
                  backgroundColor: networkStatus === 'Excellent' ? '#4CAF50' : networkStatus === 'Checking...' ? '#FFA000' : '#F44336',
                  opacity: blinkAnim 
                }
              ]} />
              <Text style={[styles.networkText, { color: networkStatus === 'Excellent' ? '#4CAF50' : networkStatus === 'Checking...' ? '#FFA000' : '#F44336' }]}>
                Live: {networkStatus}
              </Text>
            </View>
          </View>

          {isLoggedIn && (
            <TouchableOpacity
              style={styles.walletContainer}
              activeOpacity={0.7}
            >
              <Icon name="wallet" size={24} color="#4CAF50" />
              <Text style={styles.walletAmount}>
                 {walletBalance.toLocaleString()} {getCurrency(country)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isLoggedIn && country && (
          <View style={styles.locationRow}>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.locationButton}>
              <Icon name="map-marker" size={12} color="#4CAF50" />
              <Text style={styles.locationText}>{country}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.container}>
        {getMenuItems(t).map((item, index) => (
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTopSection: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfoContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  networkTester: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 3,
  },
  networkText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2874F0',
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
    borderWidth: 1,
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fff',
  },
  locationText: {
    fontSize: 10,
    color: 'black',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
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