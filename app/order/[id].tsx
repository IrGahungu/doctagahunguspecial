import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextStyle, Image, ActivityIndicator, RefreshControl, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/config";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "@/lib/supabase";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";

type OrderStatus = "Pending" | "Accepted" | "Cancelled" | "Packed" | "On the way" | "Delivered";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_image_url: string;
  pharmacy?: Pharmacy;
  status?: string;
};

type Pharmacy = {
  name: string;
};

type Order = {
  id: string;
  created_at: string;
  status: OrderStatus;
  total_amount: number;
  items: OrderItem[];
  subtotal: number;
  service_fee: number;
  pharmacy?: Pharmacy;
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

const OrderDetailSkeleton = () => (
  <SkeletonPulse>
    <View style={styles.scrollContainer}>
      <View style={styles.card}>
        <View style={[styles.skeletonLine, { width: '40%', height: 20, marginBottom: 15 }]} />
        {[1, 2, 3, 4, 5].map((_, i) => (
          <View key={i} style={[styles.detailRow, { marginBottom: 12 }]}>
            <View style={[styles.skeletonLine, { width: '30%', height: 16 }]} />
            <View style={[styles.skeletonLine, { width: '40%', height: 16 }]} />
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <View style={[styles.skeletonLine, { width: '30%', height: 20, marginBottom: 15 }]} />
        {[1, 2].map((_, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={[styles.skeletonLine, { width: 50, height: 50, borderRadius: 8, marginRight: 12 }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.skeletonLine, { width: '70%', height: 16, marginBottom: 8 }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 12 }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  </SkeletonPulse>
);

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async (isSilent = false) => {
    if (!id) return;

    try {
      if (!isSilent) setLoading(true);

      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        console.warn("No auth token found, redirecting to auth.");
        router.replace("/auth");
        return;
      }

      console.log(`Fetching details for order ID: ${id}`);

      const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      console.log("Raw API Order Data:", JSON.stringify(data, null, 2));

      if (!res.ok) {
        const errMsg = data?.error || "Failed to fetch order details.";
        console.error(`Error fetching order ${id}:`, errMsg);
        setError(errMsg);
        return;
      }

      // Fetch latest status for items from order_items table
      if (data.items && data.items.length > 0) {
        let itemsData;
        const itemIds = data.items.map((item: OrderItem) => item.id);
        
        // Try fetching with Supabase client
        const { data: sbData, error: sbError } = await supabase
          .from('order_items')
          .select('id, status')
          .in('id', itemIds);

        itemsData = sbData;

        // Fallback: If Supabase client returned empty (likely RLS/Session issue), try direct REST fetch
        if ((!itemsData || itemsData.length === 0) && !sbError) {
          console.log("Supabase client returned empty, trying direct REST fetch...");
          const supabaseUrl = (supabase as any).supabaseUrl;
          const supabaseKey = (supabase as any).supabaseKey;
          
          if (supabaseUrl && supabaseKey) {
            const idsParam = `(${itemIds.join(',')})`;
            console.log("Attempting REST fetch for item IDs:", idsParam);
            
            // Attempt 1: With Token
            let directRes = await fetch(`${supabaseUrl}/rest/v1/order_items?select=id,status&id=in.${idsParam}`, {
              headers: { "apikey": supabaseKey, "Authorization": `Bearer ${token}` }
            });

            // Attempt 2: If Token is invalid (401), try without it (Anon access)
            if (!directRes.ok && directRes.status === 401) {
              console.log("Token rejected (401), retrying with Anon key only...");
              directRes = await fetch(`${supabaseUrl}/rest/v1/order_items?select=id,status&id=in.${idsParam}`, {
                headers: { "apikey": supabaseKey }
              });
            }

            if (directRes.ok) {
              itemsData = await directRes.json();
              console.log("Direct REST fetch success:", JSON.stringify(itemsData));
            } else {
              console.error("Direct REST fetch failed:", directRes.status, await directRes.text());
            }
          }
        }

        if (itemsData && itemsData.length > 0) {
          console.log("Supabase items data:", itemsData);
          const statusMap = new Map(itemsData.map((i: { id: any; status: any; }) => [String(i.id), i.status]));
          data.items = data.items.map((item: OrderItem) => ({
            ...item,
            status: statusMap.get(String(item.id)) || item.status || data.status || 'Pending',
          }));
        } else {
          console.warn("Could not fetch item statuses. Check RLS policies if data exists.");
        }
      }

      console.log("Final Merged Order Data:", JSON.stringify(data, null, 2));
      setOrder(data);
    } catch (err) {
      console.error("Exception in fetchOrderDetails:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrderDetails();

    if (!id) return;

    const channel = supabase
      .channel(`order-details-${id}`)

      // 🔁 Order-level updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Real-time order update:", payload.new);
          fetchOrderDetails(true);
        }
      )

      // 🔁 Item-level updates (status changes)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${id}`,
        },
        (payload) => {
          console.log("Real-time order item update:", payload.new);
          fetchOrderDetails(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchOrderDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true); // 'order' is possibly 'null'.
    fetchOrderDetails();
  }, [fetchOrderDetails]);

 const downloadOrderDetails = async () => {
  if (!order) return;
  const o = order; // ✅ TypeScript now knows this is NOT null

  const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .subtitle { font-size: 14px; color: #555; }
            .section { margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { font-weight: bold; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Dr Gahungu App</div>
            <div class="subtitle">Order #${String(order.id).substring(0, 8)}</div>
          </div>
          
          <div class="section">
            <div class="row"><span class="label">Date:</span> <span>${new Date(order.created_at).toLocaleString()}</span></div>
          </div>

          <div class="section">
            <h3>Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items && order.items.length > 0 ? order.items.map(item => `
                  <tr>
                    <td>
                      ${item.product_name || 'Item'}<br/>
                      <small>${item.pharmacy ? `Sold by: ${item.pharmacy.name}` : ''}</small>
                      <br/><small>Status: ${item.status || order.status || 'Pending'}</small>
                    </td>
                    <td>${item.quantity}</td>
                    <td>BIF ${item.price}</td>
                    <td>BIF ${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('') : ''}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="row"><span class="label">Subtotal:</span> <span>BIF ${Number(order.subtotal || 0).toFixed(2)}</span></div>
            <div class="row"><span class="label">Service Fee:</span> <span>BIF ${Number(order.service_fee || 0).toFixed(2)}</span></div>
            <div class="row total-row"><span class="label">Total Amount:</span> <span>BIF ${Number(order.total_amount || 0).toFixed(2)}</span></div>
          </div>

          <div class="section" style="text-align: center; margin-top: 30px;">
            <h3>Verification QR Code</h3>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}" alt="QR Code" />
          </div>
        </body>
      </html>
    `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Error downloading order details:', error);
    alert('Failed to generate PDF');
  }
};

const getStatusStyle = (status: OrderStatus): TextStyle => {
  switch (status) {
    case "Pending":
      return { color: "red", fontWeight: "bold" };
    case "Accepted":
      return { color: "royalblue", fontWeight: "bold" };
    case "Cancelled":
      return { color: "grey", fontWeight: "bold" };
    case "Packed":
      return { color: "orange", fontWeight: "bold" };
    case "On the way":
    case "Delivered":
      return { color: "green", fontWeight: "bold" };
    default:
      return { color: "gray" };
  }
};

if (loading || (error && !order)) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>
      <OrderDetailSkeleton />
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
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
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
              <Image 
                source={{ 
                  uri: item.product_image_url?.startsWith('http') 
                    ? item.product_image_url 
                    : `${MEDICINE_URL_PREFIX}${item.product_image_url}` 
                }} 
                style={styles.itemImage} 
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                {item.pharmacy && (
                  <Text style={styles.itemPharmacy}>Sold by: {item.pharmacy.name}</Text>
                )}
                <Text style={[{ fontSize: 12, marginBottom: 2 }, getStatusStyle((item.status as OrderStatus) || order.status || 'Pending')]}>
                  Status: {item.status || order.status || 'Pending'}
                </Text>
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                BIF {(Number(item.price || 0) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))
        ) : (<Text style={styles.detailValue}>No items found in this order.</Text>)}
      </View>

      {(order.status === 'Accepted' || order.status === 'On the way' || order.status === 'Delivered') && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Confirmation</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={String(order.id)}
              size={200}
              color="black"
              backgroundColor="white"
            />
            <Text style={styles.qrHelpText}>Present this QR code at the pharmacy for verification.</Text>
          </View>
          <TouchableOpacity style={styles.downloadButton} onPress={downloadOrderDetails}>
            <Text style={styles.downloadButtonText}>Download Invoice</Text>
          </TouchableOpacity>
        </View>
      )}
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
  itemPharmacy: { fontSize: 12, color: "#4CAF50", marginBottom: 2 },
  itemQuantity: { fontSize: 14, color: "#757575" },
  itemPrice: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#212121" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrHelpText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  downloadButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skeletonLine: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});
