import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, KeyRound } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/config";
import { useLanguageStore, translations } from '@/stores/languageStore';

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

const PinSkeleton = () => (
  <View style={styles.content}>
    <SkeletonPulse>
      <View style={[styles.skeleton, { width: 60, height: 60, borderRadius: 30, alignSelf: 'center', marginBottom: 20 }]} />
      <View style={[styles.skeleton, { width: '60%', height: 24, alignSelf: 'center', marginBottom: 8, borderRadius: 4 }]} />
      <View style={[styles.skeleton, { width: '80%', height: 16, alignSelf: 'center', marginBottom: 32, borderRadius: 4 }]} />
      
      <View style={[styles.skeleton, { width: 100, height: 14, marginBottom: 8, borderRadius: 4 }]} />
      <View style={[styles.skeleton, { width: '100%', height: 50, borderRadius: 8, marginBottom: 16 }]} />
      
      <View style={[styles.skeleton, { width: '100%', height: 50, borderRadius: 20, marginTop: 20 }]} />
    </SkeletonPulse>
  </View>
);

const PinManagementScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasPin, setHasPin] = useState(true);
  const [isCheckingPin, setIsCheckingPin] = useState(params.forceChangeDefaultPin !== 'true');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  // Determine if the user is forced to change the default PIN
  const isForcedDefaultPinChange = params.forceChangeDefaultPin === 'true';

  // Check if user already has a PIN
  useEffect(() => {
    const checkHasPin = async () => {
      setIsCheckingPin(true);
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/has-pin`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) {
          setHasPin(data.hasPin);
        } else {
          console.error("Error checking PIN:", data.error);
        }
      } catch (err) {
        console.error("Error checking PIN:", err);
      } finally {
        setIsCheckingPin(false);
      }
    };

    if (!isForcedDefaultPinChange) checkHasPin(); // Only check if not forced to change default
  }, []);

  // Step 1: Verify old PIN
  const handleVerifyPin = async () => {
    if (!oldPin) return Alert.alert(t.error || "Error", t["enter current pin message"]);

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      const res = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin_code: oldPin }), // <-- FIXED
      });

      const data = await res.json();

      if (res.ok) {
        setIsPinVerified(true);
        Alert.alert(t.yes || "Success", t["change PIN"]);
      } else {
        Alert.alert(t.error || "Error", t["incorrect pin"]);
      }
    } catch (err) {
      Alert.alert(t.error || "Error", "Failed to verify PIN");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set new PIN
  const handleUpdatePin = async () => {
    if (!newPin || !confirmPin) {
      return Alert.alert(t.error || "Error", t["fill all fields"]);
    }
    if (newPin !== confirmPin) {
      return Alert.alert(t.error || "Error", t["pin mismatch"]);
    }
    if (!/^\d{4}$/.test(newPin)) {
      return Alert.alert(t.error || "Error", t["pin must"]);
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      const res = await fetch(`${API_BASE_URL}/set-pin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin_code: newPin }), // <-- FIXED
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(t.yes || "Success", t["pin updated"]);
        setOldPin("");
        setNewPin("");
        setConfirmPin("");
        setIsPinVerified(false);
        router.back();
      } else {
        Alert.alert(t.error || "Error", data.error || "Could not update PIN");
      }
    } catch (err) {
      Alert.alert(t.error || "Error", "Failed to update PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCheckingPin ? '...' : (hasPin ? t["change pin"] : t["create pin"])}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isCheckingPin ? (
        <PinSkeleton />
      ) : (
      <View style={styles.content}>
        <KeyRound size={60} color="#4CAF50" style={{ alignSelf: 'center', marginBottom: 20 }} />

        {hasPin && !isPinVerified && !isForcedDefaultPinChange ? (
          <>
            <Text style={styles.title}>{t["verify current pin"]}</Text>
            <Text style={styles.subtitle}>{t["enter current pin message"]}</Text>
            <Text style={styles.inputLabel}>{t["current pin"]}</Text>
            <TextInput
              value={oldPin}
              onChangeText={setOldPin}
              placeholder="****"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              style={styles.input}
            />
            <TouchableOpacity onPress={handleVerifyPin} style={styles.saveButton} disabled={loading || isPinVerified}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t["verify pin"]}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>{hasPin ? t["set new pin"] : t["set transaction pin"]}</Text>
            <Text style={styles.subtitle}>{t["pin authorization message"]}</Text>

            <Text style={styles.inputLabel}>{t["new pin"]}</Text>
            <TextInput
              value={newPin}
              onChangeText={setNewPin}
              placeholder="****"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>{t["confirm new pin"]}</Text>
            <TextInput
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="****"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              style={styles.input}
            />

            <TouchableOpacity onPress={handleUpdatePin} style={styles.saveButton} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{hasPin ? t["update pin"] : t["save pin"]}</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  inputLabel: { fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, marginBottom: 16, fontSize: 18, textAlign: 'center', letterSpacing: 10 },
  saveButton: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});

export default PinManagementScreen;
