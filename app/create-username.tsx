import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import { useLanguageStore, translations } from '@/stores/languageStore';
import { ArrowLeft } from 'lucide-react-native';

export default function CreateUsernameScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  useEffect(() => {
    const fetchCurrentUsername = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setCurrentUsername(data.username);
          setUsername(data.username || ''); // Pre-fill if already exists
        }
      } catch (err) {
        console.error('Error fetching current username:', err);
      }
    };
    fetchCurrentUsername();
  }, []);

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert(t.error || 'Error', t["username required"] || 'Username cannot be empty.');
      return;
    }

    // Basic client-side validation
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      Alert.alert(t.error || 'Error', t["username format error"] || 'Username must be 3-15 characters long and can only contain letters, numbers, and underscores.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert(t["auth error"] || 'Authentication Error', t["login to continue"] || 'Please log in to continue.');
        router.replace('/auth');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/update-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        Alert.alert(t.success || 'Success', t["username updated success"] || 'Username updated successfully!');
        router.back(); // Go back to the previous screen (Explore)
      } else {
        const errorData = await response.json();
        Alert.alert(t.error || 'Error', errorData.error || (t["failed to update username"] || 'Failed to update username. Please try again.'));
      }
    } catch (err) {
      console.error('Error updating username:', err);
      Alert.alert(t.error || 'Error', t["connection error"] || 'Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color="#212121" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{currentUsername ? t["update username"] : t["create username"]}</Text>
            </View>

            <Text style={styles.label}>{t.username}</Text>
            <TextInput
              style={styles.input}
              placeholder={t["enter username"] || "Enter your desired username"}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              maxLength={15}
            />
            <Text style={styles.hintText}>{t["username hint"] || "3-15 characters, letters, numbers, and underscores only."}</Text>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{currentUsername ? t.update : t["create username"]}</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
  keyboardAvoidingView: { flex: 1 },
  inner: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, position: 'absolute', top: 50, left: 20, right: 20 },
  backButton: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#212121' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#212121' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  hintText: { fontSize: 12, color: '#757575', marginTop: 5, marginBottom: 20 },
  submitButton: { backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});