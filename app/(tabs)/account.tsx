import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, User, ShoppingBag, Star, Headphones, Settings, KeyRound, Calendar } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import { API_BASE_URL } from "@/config"; // ✅ Import backend base URL
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import Header from "@/components/Header";


type UserProfile = {
  id: string;
  fullname: string;
  wallet_balance?: number;
};

export default function AccountScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const menuItems = [
    { id: "1", title: "Orders", icon: ShoppingBag, info: "Check your order status"},
    { id: "6", title: "My Appointments", icon: Calendar, info: "View your scheduled doctor visits", route: "/appointments" },
    { id: "2", title: "Reviews", icon: Star, info: "See what others are saying about the app", route: "/reviews" },
    { id: "5", title: "Transaction PIN", icon: KeyRound, info: "Set or change your payment PIN", route: "/pin-management" },
    { id: "3", title: "Customer Support", icon: Headphones, info: "Gahungu is glad to help", route: "/support" },
    { id: "4", title: "Settings", icon: Settings, info: "App settings and preferences", route: "/settings" },
    
  ];

  // Fetch profile from backend
  useFocusEffect(
    useCallback(() => {
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
            useAuthStore.getState().setUserId(data.id); // ✅ Save user ID to global store
          } else {
            // Don't show an alert on focus, just log it. An alert can be annoying.
            console.error("Failed to fetch profile:", data.error);
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    }, [router])
  );

  const handleMenuItemPress = (item: (typeof menuItems)[0]) => {
    if (item.title === "Orders") {
      Toast.show({
        type: "info",
        text1: "Loading Orders",
        text2: "Dr. Gahungu ariko arabikora",
      });
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <User size={40} />
          </View>
          {isLoading ? (
            <View style={styles.profileInfo}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.fullname || "Guest"}</Text>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => router.push("/update-profile")}
              >
                <Text style={styles.updateButtonText}>Update Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
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
              <ChevronRight size={22} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F7FA" },
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
});
