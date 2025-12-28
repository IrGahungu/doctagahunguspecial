import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextStyle,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabase";

type OrderStatus = "Delivered" | "Packed" | "Pending";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_image_url: string;
};

type Order = {
  id: string;
  created_at: string;
  status: OrderStatus;
  total_amount: number;
  items: OrderItem[];
  subtotal: number;
  service_fee: number;
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          router.replace("/auth");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
        } else {
          setError(data.error || "Failed to fetch order details.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();

    // Set up real-time subscription for this specific order
    const channel = supabase
      .channel(`order-details-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          console.log("Real-time update for order:", payload.new);
          setOrder((currentOrder) => ({ ...currentOrder, ...(payload.new as Order) }));
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  const getStatusStyle = (status: OrderStatus): TextStyle => {
    switch (status) {
      case "Delivered":
        return { color: "green", fontWeight: "bold" };
      case "Packed":
        return { color: "orange", fontWeight: "bold" };
      case "Pending":
        return { color: "red", fontWeight: "bold" };
      default:
        return { color: "gray" };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Not Found</Text>
        </View>
        <View style={styles.centered}>
          <Text>{error || "Order details could not be found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order #</Text>
            <Text style={styles.detailValue}>{String(order.id).substring(0, 8)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, getStatusStyle(order.status)]}>
              {order.status}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal</Text>
            <Text style={styles.detailValue}>BIF {Number(order.subtotal || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Fee</Text>
            <Text style={styles.detailValue}>BIF {Number(order.service_fee || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>BIF {Number(order.total_amount || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>
          {order.items && order.items[0] !== null ? (
            order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Image source={{ uri: item.product_image_url }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  BIF {(Number(item.price || 0) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))
          ) : (<Text style={styles.detailValue}>No items found in this order.</Text>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E0F7FA" },
  header: {
    backgroundColor: '#E0F7FA',
    paddingTop: 40,
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
    marginRight: 16,
    elevation: 2,
    borderWidth: 1,
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Roboto-Medium',
    fontSize: 18,
    color: 'black',
    top: -15,
    textAlign: 'center',
  },
  scrollContainer: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: { fontSize: 16, color: "#757575" },
  detailValue: { fontSize: 16, color: "#212121" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, color: "#212121" },
  itemQuantity: { fontSize: 14, color: "#757575" },
  itemPrice: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
});
