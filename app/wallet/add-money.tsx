import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Keyboard,
  TouchableWithoutFeedback 
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/config";
import { useToastStore } from '@/stores/toastStore';
import Toast from '@/components/Toast';

export default function AddMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const router = useRouter();

  const showToast = useToastStore((state) => state.showToast);

  const handleAddMoney = () => {
    showToast("Dr. IR. Gahungu ariko arabikora.");
  };

  // Fetch profile from backend to get the wallet balance
  useFocusEffect(
    useCallback(() => {
      const fetchProfile = async () => {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          router.replace("/auth");
          return;
        }

        try {
          const res = await fetch(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setWalletBalance(data.wallet_balance || 0);
            setWalletBalance(Number(data.wallet_balance) || 0);
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
        }
      };

      fetchProfile();
    }, [router])
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        {/* Back Arrow */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size={28} color="black" />
        </TouchableOpacity>

        {/* Wallet Header */}
        <View style={styles.header}>
          <Icon name="wallet-plus" size={32} color="#4CAF50" />
          <Text style={styles.headerText}>Add Money to Gahungu Wallet</Text>
          <Text style={styles.balanceText}>Current Balance: {walletBalance.toLocaleString()} FBU</Text>
        </View>

        {/* Amount Input */}
        <View style={styles.inputRow}>
          <Text style={styles.label}>Enter Amount:</Text>
          <TextInput
            style={styles.inputInline}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter any amount"
            maxLength={6}
          />
        </View>

        {/* Transaction Input */}
        <View style={styles.inputRow}>
          <Text style={styles.label}>Transaction ID:</Text>
          <TextInput
            style={styles.inputInline}
            keyboardType="numeric"
            value={transactionId}
            onChangeText={setTransactionId}
            placeholder="Optional"
            maxLength={10}
          />
        </View>

        {/* Add Money Button (Inactive but styled) */}
        <TouchableOpacity style={styles.disabledButton} onPress={handleAddMoney}>
          <Text style={styles.buttonText}>Add Money</Text>
        </TouchableOpacity>

        {/* Toast component for cross-platform notifications */}
        <Toast />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
    marginTop: 50,
    borderWidth: 1, 
   },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2874F0',
    marginTop: 8,
  },
  balanceText: {
    fontSize: 16,
    marginTop: 4,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#212121',
    fontWeight: 'bold',
    marginLeft: 25,
  },
  inputInline: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
    marginHorizontal: 20,
  },
  disabledButton: {
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 85,
    marginHorizontal: 45,
    backgroundColor: '#4CAF50', // Green
    opacity: 0.7, // Slight gray effect
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
