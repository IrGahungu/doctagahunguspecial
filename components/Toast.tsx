import React from 'react';
import { View, Text, StyleSheet, Platform, ToastAndroid } from 'react-native';
import { useToastStore } from '@/stores/toastStore';

export default function Toast() {
  const { isVisible, message } = useToastStore();

  if (!isVisible) return null;

  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
    return null;
  }

  // iOS: Custom toast
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 250,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#fff',
  },
});