import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, User, ShoppingBag, Star, Headphones, Settings, KeyRound, Calendar, History, Bus, Pill } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import { API_BASE_URL } from "@/config"; // ✅ Import backend base URL
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import * as Progress from 'react-native-progress';
import { useLanguageStore, translations } from "@/stores/languageStore";


type UserProfile = {
  id: string;
  fullname: string;
  wallet_balance?: number;
  engagement_points?: number;
};

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
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
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={{ opacity: pulseAnim }}>{children}</Animated.View>;
};

const AccountSkeleton = () => (
  <ScrollView style={styles.content} contentContainerStyle={styles.scrollContentContainer}>
    <SkeletonPulse>
      <View style={[styles.monetizationCard, { height: 100 }]}>
        <View style={[styles.skeleton, { width: '50%', height: 18, marginBottom: 15, borderRadius: 4 }]} />
        <View style={[styles.skeleton, { width: '100%', height: 10, marginBottom: 15, borderRadius: 5 }]} />
        <View style={[styles.skeleton, { width: '30%', height: 12, alignSelf: 'flex-end', borderRadius: 4 }]} />
      </View>
    </SkeletonPulse>

    <View style={styles.menuSection}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonPulse key={i}>
          <View style={styles.menuItem}>
            <View style={[styles.skeleton, { width: 24, height: 24, borderRadius: 12, marginRight: 16 }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.skeleton, { width: '40%', height: 16, marginBottom: 6, borderRadius: 4 }]} />
              <View style={[styles.skeleton, { width: '70%', height: 12, borderRadius: 4 }]} />
            </View>
            <View style={[styles.skeleton, { width: 20, height: 20, borderRadius: 10 }]} />
          </View>
        </SkeletonPulse>
      ))}
    </View>
  </ScrollView>
);

export default function AccountScreen() {
  console.log('[AccountScreen] Rendering...');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  
  const { engagementPoints, postsLikedToday, storiesViewedToday, epEarnedToday, syncFromDatabase, initializeStats } = useAuthStore();

  const [showOrdersButton, setShowOrdersButton] = useState(false);
  const [showMyAppointmentsButton, setShowMyAppointmentsButton] = useState(false);
  const [showBookBusButton, setShowBookBusButton] = useState(false);
  const [showMyBusTicketsButton, setShowMyBusTicketsButton] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [monetizationGoal, setMonetizationGoal] = useState(50000);
  const router = useRouter();
  const language = useLanguageStore(state => state.language);
  const t: any = translations[language];

  const menuItems = [
    { id: "1", title: t["my orders"], icon: ShoppingBag, info: t["orders description"], route: "/orders" },
    { id: "6", title: t["my appointments"], icon: Calendar, info: t["appointments description"], route: "/appointments" },
    { id: "7", title: t["view my transactions"], icon: History, info: t["transactions description"], route: "/transactions" },
    { id: "8", title: t["book a jk bus"], icon: Bus, info: t["bus booking description"], route: "/bus-booking" },
    //{ id: "11", title: t["my prescriptions"], icon: Pill, info: "Search for multiple medicines", route: "/prescriptions" },
    { id: "9", title: t["my bus tickets"], icon: Bus, info: t["bus tickets description"], route: "/bus-tickets" },
    { id: "2", title: t.reviews, icon: Star, info: t["reviews description"], route: "/reviews" },
    { id: "5", title: t["transaction pin"], icon: KeyRound, info: t["pin description"], route: "/pin-management" },
    { id: "3", title: t["customer support"], icon: Headphones, info: t["support description"], route: "/support" },
    { id: "10", title: t["update profile"], icon: User, info: t["update profile description"], route: "/update-profile" },
    { id: "4", title: t.settings, icon: Settings, info: t["settings description"], route: "/settings" },
  ];

  // Fetch profile from backend
  useFocusEffect(
    useCallback(() => {
      setDisplayProgress(0);
      const fetchProfile = async () => {
        setIsLoading(true);
        try {
          await initializeStats();
          await syncFromDatabase();

          const token = await SecureStore.getItemAsync("token");
          if (!token) {
            router.replace("/auth");
            return;
          }

          // Fetch User Data
          const res = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = await res.json();

          if (res.ok) {
            setProfile(userData);
            useAuthStore.getState().setUserId(userData.id);

            // Fetch active orders count
            const { count } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userData.id)
              .in('status', ['pending', 'processing', 'confirmed', 'shipped']);
            setActiveOrdersCount(count || 0);
          } else {
            console.error("Failed to fetch profile:", userData.error);
          }

          // Fetch Config/Settings
          const settingsRes = await fetch(`${API_BASE_URL}/api/config/engagement-settings`);
          let currentGoal = monetizationGoal;
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            setShowOrdersButton(!!settingsData.show_orders_button);
            setShowMyAppointmentsButton(!!settingsData.show_my_appointments_button);
            setShowBookBusButton(!!settingsData.show_book_bus_button);
            setShowMyBusTicketsButton(!!settingsData.show_my_bus_tickets_button);
            currentGoal = settingsData.monetization_goal || 50000;
            setMonetizationGoal(currentGoal);
          }

          // Animate progress
          setTimeout(() => {
            setDisplayProgress(Math.min(engagementPoints / currentGoal, 1));
          }, 400);

        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    }, [router, engagementPoints, monetizationGoal, initializeStats, syncFromDatabase])
  );

  // Real-time subscription for button visibility settings
  useEffect(() => {
    const syncChannel = supabase.channel('account-button-visibility')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings'
      }, (payload: any) => {
        if (payload.new && payload.new.key) {
          const { key, value } = payload.new;
          const isVisible = value === 'true'; // Explicitly check for 'true'
          if (key === 'show_orders_button') { console.log('[AccountScreen] Real-time Update for Orders:', isVisible); setShowOrdersButton(isVisible); }
          if (key === 'show_my_appointments_button') { console.log('[AccountScreen] Real-time Update for My Appointments:', isVisible); setShowMyAppointmentsButton(isVisible); }
          if (key === 'show_book_bus_button') { console.log('[AccountScreen] Real-time Update for Book Bus:', isVisible); setShowBookBusButton(isVisible); }
          if (key === 'show_my_bus_tickets_button') { console.log('[AccountScreen] Real-time Update for My Bus Tickets:', isVisible); setShowMyBusTicketsButton(isVisible); }
        }
      }).subscribe();

    return () => { 
      supabase.removeChannel(syncChannel);
    };
  }, []);


  // Real-time subscription for active orders count
  useEffect(() => {
    if (!profile?.id) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .in('status', ['pending', 'processing', 'confirmed', 'shipped']);
      setActiveOrdersCount(count || 0);
    };

    const channel = supabase
      .channel(`orders-count-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${profile.id}` },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const handleMenuItemPress = (item: (typeof menuItems)[0]) => {
    if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      {isLoading ? (
        <AccountSkeleton />
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContentContainer}>
          <TouchableOpacity 
            style={styles.monetizationCard} 
            onPress={() => router.push({
              pathname: '/wallet-details',
              params: { 
                engagementPoints: (engagementPoints || 0).toString(), 
                monetizationGoal: (monetizationGoal || 0).toString(),
                postsLikedToday: (postsLikedToday || 0).toString(),
                storiesViewedToday: (storiesViewedToday || 0).toString(),
                epEarnedToday: (epEarnedToday || 0).toString(),
              }
            })}
          >
          <View style={styles.monetizationHeader}>
            <Text style={styles.monetizationTitle}>{t["monetization goal"]}</Text>
            <Text style={styles.monetizationValue}>{Math.round(Math.min(engagementPoints / monetizationGoal, 1) * 100)}%</Text>
          </View>
          <Progress.Bar 
            progress={displayProgress} 
            width={null} 
            height={10} 
            borderRadius={5}
            color="#4CAF50"
            unfilledColor="#E0F7FA"
            borderColor="transparent"
            animated={true}
            animationType="timing"
          />
          <Text style={styles.monetizationSubtext}>
            {engagementPoints.toLocaleString()} / {monetizationGoal.toLocaleString()} EP
          </Text>
        </TouchableOpacity>

        <View style={styles.menuSection}>
          {menuItems.map((item) => {
            // Determine if the menu item should be hidden based on admin settings (Toggleable items: 1, 6, 8, 9)
            const isHidden = (
              (item.id === "1" && !showOrdersButton) ||
              (item.id === "6" && !showMyAppointmentsButton) ||
              (item.id === "8" && !showBookBusButton) ||
              (item.id === "9" && !showMyBusTicketsButton)
            );

            if (isHidden) return null;

            return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item)}
            >
              <View style={styles.menuIconContainer}>
                <item.icon size={22} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuInfo}>{item.info}</Text>
              </View>
              {item.id === "1" && activeOrdersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeOrdersCount}</Text>
                </View>
              )}
              <ChevronRight size={22} />
            </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.versionText}>{t.version} 1.0.0</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F7FA" },
  scrollContentContainer: { paddingBottom: 90 }, // Added padding for tab bar
  content: { flex: 1 },
  profileSection: {
    backgroundColor: "white",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "bold", color: "#212121" },
  walletBalance: { fontSize: 14, color: "#2e7d32", marginVertical: 4 },
  profileEmail: { fontSize: 14, color: "#2874F0", marginBottom: 4 },
  updateButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  monetizationCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  monetizationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  monetizationTitle: {
    fontSize: 16,
    fontFamily: "Roboto-Bold",
    color: "#212121",
  },
  monetizationValue: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#4CAF50",
  },
  monetizationSubtext: {
    fontSize: 12,
    color: "#757575",
    marginTop: 8,
    textAlign: "right",
  },
  
  updateButtonText: { fontSize: 12, color: "white" },
  menuSection: { backgroundColor: "white", marginTop: 8, borderRadius: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuIconContainer: { marginRight: 16 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  menuInfo: { fontSize: 12, color: "#757575" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "red",
    marginTop: 16,
    padding: 16,
    marginHorizontal: 80,
    borderRadius: 10,
  },
  logoutText: { fontSize: 16, color: "white", marginLeft: 8, fontWeight: "bold" },
  versionText: { fontSize: 12, color: "#9E9E9E", textAlign: "center", marginTop: 16 },
  badge: {
    backgroundColor: "#FF5252",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  skeleton: {
    backgroundColor: "#e0e0e0",
  },
});
