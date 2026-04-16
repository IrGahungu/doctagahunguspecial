import { useState, useEffect,useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextStyle, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import { supabase } from '@/lib/supabase';

type OrderStatus = "Pending" | "Accepted" | "Cancelled" | "Packed" | "On the way" | "Delivered";

type Order = {
  id: string;
  created_at: string;
  status?: OrderStatus;
  total_amount: number;
};

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        router.replace('/auth');
        return;
      }
      // Also fetch user ID for subscription filter
      if (!userId) {
        const userRes = await fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
        const userData = await userRes.json();
        if (userRes.ok) setUserId(userData.id);
      }

      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Log the raw response text to see what the server is actually sending
      const responseText = await res.text(); // Read the body once

      try {
        const data = JSON.parse(responseText); // Manually parse the text
        if (res.ok) {
          setOrders(data);
        } else {
          // Log both the parsed error and the raw text
          console.error('Failed to fetch orders. Server says:', data.error);
          console.error('Raw server response:', responseText);
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        console.error('Raw server response that failed parsing:', responseText);
      }
    } catch (err) {
      // This will catch network errors or JSON parsing errors
      console.error('Network or parsing error while fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [router, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Real-time subscription for order updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-orders-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('Order update received!', payload);
          // Refetch all orders to ensure data consistency
          fetchOrders();
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchOrders]
  );

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderItem} onPress={() => router.push(`/order/${item.id}` as any)}>
      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>Order #{String(item.id || '').substring(0, 8)}</Text>
        <Text style={styles.orderDate}>Placed on: {new Date(item.created_at).toLocaleDateString()}</Text>
        <Text style={styles.orderTotal}>Total: BIF {Number(item.total_amount || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.checkStatusText}>Check your order status</Text>
        <ChevronRight size={22} color="#757575" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You have no orders yet.</Text>
              <TouchableOpacity onPress={() => router.push('/')}>
                <Text style={styles.browseButton}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          }
          onRefresh={fetchOrders}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    backgroundColor: '#E0F7FA',
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    position: 'absolute',
    left: 16,
    top: 50, // Adjust as needed based on safe area
    zIndex: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Roboto-Medium',
    fontSize: 20,
    top: 15,
    color: 'black',
    textAlign: 'center',
  },
  
  listContainer: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  orderInfo: { flex: 1 },
  orderId: { fontFamily: 'Roboto-Medium', fontSize: 16, color: '#212121', marginBottom: 4 },
  orderDate: { fontFamily: 'Roboto-Regular', fontSize: 14, color: '#757575', marginBottom: 4 },
  orderTotal: { fontFamily: 'Roboto-Regular', fontSize: 14, color: '#757575' },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  checkStatusText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: '#4CAF50',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
});