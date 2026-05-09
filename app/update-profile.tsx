import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

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

const ProfileSkeleton = () => (
  <View style={styles.content}>
    <SkeletonPulse>
      <View style={[styles.skeleton, { width: 150, height: 28, alignSelf: 'center', marginBottom: 30, borderRadius: 4 }]} />
      <View style={[styles.skeleton, { width: '100%', height: 50, borderRadius: 10, marginBottom: 15 }]} />
      <View style={[styles.skeleton, { width: '100%', height: 50, borderRadius: 10, marginBottom: 15 }]} />
      <View style={[styles.skeleton, { width: '60%', height: 50, borderRadius: 25, alignSelf: 'center', marginTop: 10 }]} />
    </SkeletonPulse>
  </View>
);

export default function UpdateProfileScreen() {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);

  // ✅ Fetch current profile data
  const fetchProfile = useCallback(async () => {
    setIsFetching(true);
    setHasError(false);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        router.replace('/auth');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch profile");

      const data = await res.json();
      setFullname(data.fullname || "");
      setWhatsappNumber(data.whatsapp_number || "");
    } catch (err) {
      console.error(err);
      setHasError(true);
    } finally {
      setIsFetching(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ✅ Update profile
  const handleUpdate = async () => {
    if (!fullname.trim()) {
      Alert.alert("Validation Error", "Full name is required.");
      return;
    }

    if (!whatsappNumber.trim() || !whatsappNumber.startsWith("+") || whatsappNumber.length < 10) {
      Alert.alert("Validation Error", "Please enter a valid WhatsApp number starting with '+' followed by your country code (e.g., +25777990118).");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        Alert.alert("Error", "Not logged in");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullname,
          whatsapp_number: whatsappNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }

      const data = await res.json();

      Alert.alert(
        "✅ Success",
        `Profile updated! Your number is now ${data.is_verified ? "verified" : "not verified"
        }.`
      );

      router.back();
    } catch (err: any) {
      Alert.alert("❌ Error", err.message || "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      {isFetching ? (
        <ProfileSkeleton />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile information.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <View style={styles.content}>
      <Text style={styles.title}>Update Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullname}
        onChangeText={setFullname}
      />

      <TextInput
        style={styles.input}
        placeholder="WhatsApp Number (e.g., +257...)"
        value={whatsappNumber}
        onChangeText={setWhatsappNumber}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Updating..." : "Save Changes"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F7FA",
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#222",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: "#222",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 50,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 15,
  },
  cancelButtonText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Regular',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});
