import { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
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


type UserProfile = {
  id: string;
  fullname: string;
  wallet_balance?: number;
  engagement_points?: number;
};

export default function AccountScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [engagementPoints, setEngagementPoints] = useState(0);
  const [dailyStats, setDailyStats] = useState({
    postsLikedToday: 0,
    storiesViewedToday: 0,
    epEarnedToday: 0,
  });
  const [showOrdersButton, setShowOrdersButton] = useState(false);
  const [showMyAppointmentsButton, setShowMyAppointmentsButton] = useState(false);
  const [showBookBusButton, setShowBookBusButton] = useState(false);
  const [showMyBusTicketsButton, setShowMyBusTicketsButton] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [monetizationGoal, setMonetizationGoal] = useState(50000);
  const router = useRouter();

  const menuItems = [
    { id: "1", title: "Orders", icon: ShoppingBag, info: "Check your order status", route: "/orders" },
    { id: "6", title: "My Appointments", icon: Calendar, info: "View your scheduled doctor visits", route: "/appointments" },
    { id: "7", title: "View My Transactions", icon: History, info: "Check your wallet history", route: "/transactions" },
    { id: "8", title: "Book a JK BUS", icon: Bus, info: "Travel with comfort", route: "/bus-booking" },
    //{ id: "11", title: "My Prescriptions", icon: Pill, info: "Search for multiple medicines", route: "/prescriptions" },
    { id: "9", title: "My Bus Tickets", icon: Bus, info: "View your reserved seats", route: "/bus-tickets" },
    { id: "2", title: "Reviews", icon: Star, info: "See what others are saying about the app", route: "/reviews" },
    { id: "5", title: "Transaction PIN", icon: KeyRound, info: "Set or change your payment PIN", route: "/pin-management" },
    { id: "3", title: "Customer Support", icon: Headphones, info: "Gahungu is glad to help", route: "/support" },
    { id: "10", title: "Update Profile", icon: User, info: "Manage your personal information", route: "/update-profile" },
    { id: "4", title: "Settings", icon: Settings, info: "App settings and preferences", route: "/settings" },
  ];

  // Fetch profile from backend
  useFocusEffect(
    useCallback(() => {
      setDisplayProgress(0);
      const fetchProfile = async () => {
        setIsLoading(true);
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          // If no token, redirect to login. This is a good safeguard.
          router.replace("/auth");
          return;
        }

        try {
          const res = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setProfile(data);
            setEngagementPoints(data.engagement_points || 0);

            // Fetch button visibility from correct config endpoint to stay in sync
            const settingsRes = await fetch(`${API_BASE_URL}/api/config/engagement-settings`);
            if (settingsRes.ok) {
              const settingsData = await settingsRes.json();
              // Update visibility states based on API config (force boolean conversion)
              setShowOrdersButton(!!settingsData.show_orders_button);
              setShowMyAppointmentsButton(!!settingsData.show_my_appointments_button);
              setShowBookBusButton(!!settingsData.show_book_bus_button);
              setShowMyBusTicketsButton(!!settingsData.show_my_bus_tickets_button);
              setMonetizationGoal(settingsData.monetization_goal || 50000);
            }

            useAuthStore.getState().setUserId(data.id); // ✅ Save user ID to global store

            // Fetch active orders count
            const { count } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', data.id)
              .in('status', ['pending', 'processing', 'confirmed', 'shipped']);
            setActiveOrdersCount(count || 0);
          } else {
            console.error("Failed to fetch profile:", data.error);
          }

          // Always fetch Engagement Points and Daily Stats for the Progress Bar from local storage
          const points = await SecureStore.getItemAsync('totalEngagementPoints');
          const pl = await SecureStore.getItemAsync('postsLikedToday');
          const sv = await SecureStore.getItemAsync('storiesViewedToday');
          const ep = await SecureStore.getItemAsync('epEarnedToday');

          const currentPoints = parseInt(points || '0');
          setEngagementPoints(currentPoints);
          setDailyStats({
            postsLikedToday: parseInt(pl || '0'),
            storiesViewedToday: parseInt(sv || '0'),
            epEarnedToday: parseInt(ep || '0'),
          });

          const currentGoal = monetizationGoal; // Use the most recent state value

          // Animate the progress bar after a short delay to allow screen transition to settle
          setTimeout(() => {
            setDisplayProgress(Math.min(currentPoints / currentGoal, 1));
          }, 400);
        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    }, [router])
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
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContentContainer}>

        <TouchableOpacity 
          style={styles.monetizationCard} 
          onPress={() => router.push({
            pathname: '/wallet-details',
            params: { 
              engagementPoints: engagementPoints.toString(), 
              monetizationGoal: monetizationGoal.toString(),
              ...dailyStats 
            }
          })}
        >
          <View style={styles.monetizationHeader}>
            <Text style={styles.monetizationTitle}>Monetization Goal</Text>
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
              {item.title === "Orders" && activeOrdersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeOrdersCount}</Text>
                </View>
              )}
              <ChevronRight size={22} />
            </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
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
});
