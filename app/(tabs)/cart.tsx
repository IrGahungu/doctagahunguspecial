import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { ShoppingCart, ArrowLeft, Plus, Minus, CreditCard, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/stores/cartStore';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';
import { useLanguageStore, translations } from '@/stores/languageStore';
import { supabase } from '@/lib/supabase';

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";
const { width } = Dimensions.get('window');

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

const CartSkeleton = () => (
  <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
    <View style={{ padding: 16 }}>
      {[1, 2].map((i) => (
        <SkeletonPulse key={i}>
          <View style={styles.cartItem}>
            <View style={[styles.productImage, styles.skeleton]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={[styles.skeleton, { width: '60%', height: 16, marginBottom: 8, borderRadius: 4 }]} />
              <View style={[styles.skeleton, { width: '40%', height: 14, marginBottom: 12, borderRadius: 4 }]} />
              <View style={[styles.skeleton, { width: 80, height: 32, borderRadius: 16 }]} />
            </View>
          </View>
        </SkeletonPulse>
      ))}
    </View>
    
    <SkeletonPulse>
      <View style={[styles.subtotalCard, { height: 100, justifyContent: 'center', gap: 10 }]}>
        <View style={[styles.skeleton, { width: '100%', height: 14, borderRadius: 4 }]} />
        <View style={[styles.skeleton, { width: '100%', height: 14, borderRadius: 4 }]} />
        <View style={[styles.skeleton, { width: '100%', height: 16, borderRadius: 4 }]} />
      </View>
    </SkeletonPulse>

    <SkeletonPulse>
      <View style={[styles.paymentCard, { height: 120, justifyContent: 'center', gap: 10 }]}>
        <View style={[styles.skeleton, { width: '100%', height: 45, borderRadius: 10 }]} />
        <View style={[styles.skeleton, { width: '100%', height: 45, borderRadius: 10 }]} />
      </View>
    </SkeletonPulse>
  </ScrollView>
);

const currencyMap: { [country: string]: string } = {
  Burundi: 'FBU',
  //Rwanda: 'RWF',
  //Tanzania: 'TSH',
  //Kenya: 'KSH',
  //Sudan: 'SDF',
  //Congo: 'FRC',
  //Somalia: 'FSM',
};

const getCurrency = (country: string | null): string => {
  return country ? currencyMap[country] || 'USD' : 'USD';
};

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore(state => state.items);
  const addToCart = useCartStore(state => state.addToCart);
  const removeFromCart = useCartStore(state => state.removeFromCart);

  // Payment selection state
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [serviceFee, setServiceFee] = useState<number>(500);
  const language = useLanguageStore(state => state.language);
  const t = translations[language];

  // ✅ Fetch wallet balance from /me
  const fetchWalletBalance = useCallback(async () => {
    setLoadingBalance(true);
    setHasError(false);
    try {
      const token = await SecureStore.getItemAsync('token');
      const storedCountry = await SecureStore.getItemAsync('user_country');
      setCountry(storedCountry);
      if (!token) {
        console.log('⚠️ No token found, user may not be logged in.');
        setLoadingBalance(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.wallet_balance !== undefined) {
        setWalletBalance(Number(data.wallet_balance));
        console.log('💰 Wallet balance fetched:', data.wallet_balance);
      } else {
        console.error('❌ Failed to fetch balance:', data.error || data);
        setHasError(true);
      }

      // Fetch dynamic service fee for medicine
      if (storedCountry) {
        const { data: feeData, error: feeError } = await supabase
          .from('service_fees')
          .select('fee')
          .eq('country', storedCountry)
          .eq('service_type', 'medicine')
          .single();
        
        if (!feeError && feeData) {
          setServiceFee(Number(feeData.fee));
        }
      }
    } catch (err) {
      console.error('Balance fetch error:', err);
      setHasError(true);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  // Calculate subtotal and service fee
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const total = subtotal + serviceFee;

  // Handlers for quantity
  const handleIncrease = (item: { product: any; quantity?: number }) => {
    addToCart(item.product, 1);
  };

  const handleDecrease = (item: { product: any; quantity: number }) => {
    if (item.quantity > 1) {
      addToCart(item.product, -1);
    } else {
      removeFromCart(item.product.id);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedMethod) return;

    if (selectedMethod === 'bank') {
      Toast.show({
        type: 'info',
        text1: 'Coming Soon',
        text2: 'Dr. Gahungu is working on it',
      });
    } else if (selectedMethod === 'wallet') {
      if (walletBalance === null || walletBalance < total) {
        Toast.show({
          type: 'error',
          text1: 'Insufficient Balance',
          text2: 'Please add money to your wallet.',
        });
        return;
      }
      // Proceed to a confirmation/checkout screen
      router.push({
        pathname: '/checkout',
        params: {
          total: total.toString(),
          subtotal: subtotal.toString(),
          serviceFee: serviceFee.toString(),
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t["my cart"]}</Text>
      </View>

      {loadingBalance ? (
        <CartSkeleton />
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t["failed to load wallet data"]}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWalletBalance}>
            <Text style={styles.retryButtonText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <ShoppingCart size={80} /> {/* No translation needed for icon */}
              <Text style={styles.emptyCartTitle}>{t["cart empty"]}</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/')}
              > {/* No translation needed for icon */}
                <Text style={styles.browseButtonText}>{t["browse products"]}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ padding: 16 }}>
                {items.map((item) => (
                  <View key={item.product.id} style={styles.cartItem}>
                    {item.product.image ? (
                      <Image
                        source={typeof item.product.image === 'string' 
                          ? { uri: item.product.image.startsWith('http') 
                              ? item.product.image 
                              : `${MEDICINE_URL_PREFIX}${item.product.image}` }
                          : item.product.image}
                        style={styles.productImage}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <ShoppingCart size={32} color="#aaa" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.productName}>{item.product.name}</Text> {/* No translation needed for icon */}
                      <Text style={styles.productPrice}>
                        {getCurrency(country)} {parseFloat(String(item.product.price)).toFixed(2)}
                      </Text>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => handleDecrease(item)} // No translation needed for icon
                        >
                          <Minus size={18} color="#212121" /> {/* No translation needed for icon */}
                        </TouchableOpacity>
                        <Text style={styles.productQty}>{item.quantity}</Text> {/* No translation needed for icon */}
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => handleIncrease(item)}
                        >
                          <Plus size={18} color="#212121" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Subtotal Card */}
              <View style={styles.subtotalCard}>
                <View style={styles.subtotalRow}> {/* No translation needed for icon */}
                  <Text style={styles.subtotalLabel}>{t.subtotal}:</Text>
                  <Text style={styles.subtotalValue}>{getCurrency(country)} {subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.subtotalRow}> {/* No translation needed for icon */}
                  <Text style={styles.subtotalLabel}>{t["medicine service fee"]}:</Text>
                  <Text style={styles.subtotalValue}>{getCurrency(country)} {serviceFee.toFixed(2)}</Text>
                </View>
                <View style={styles.subtotalRow}> {/* No translation needed for icon */}
                  <Text style={[styles.subtotalLabel, { fontWeight: 'bold' }]}>{t.total}:</Text>
                  <Text style={[styles.subtotalValue, { fontWeight: 'bold' }]}>{getCurrency(country)} {total.toFixed(2)}</Text>
                </View>
              </View>

              {/* Payment Method Card */}
              <View style={styles.paymentCard}>
                <Text style={styles.paymentTitle}>{t["choose payment method"]}</Text>

                {/* Bank Payment */}
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    selectedMethod === 'bank' && styles.selectedOption,
                  ]}
                  onPress={() => setSelectedMethod('bank')}
                > {/* No translation needed for icon */}
                  <CreditCard size={22} color={selectedMethod === 'bank' ? 'blue' : '#212121'} /> {/* No translation needed for icon */}
                  <Text style={[
                    styles.paymentOptionText, // No translation needed for icon
                    selectedMethod === 'bank' && { color: 'blue' }
                  ]}>
                    Bank Payment
                  </Text>
                </TouchableOpacity>

                {/* Wallet Payment */}
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    selectedMethod === 'wallet' && styles.selectedOption,
                  ]}
                  onPress={() => setSelectedMethod('wallet')}
                > {/* No translation needed for icon */}
                  <Wallet size={22} color={selectedMethod === 'wallet' ? 'blue' : '#212121'} /> {/* No translation needed for icon */}
                  <Text style={[
                    styles.paymentOptionText, // No translation needed for icon
                    selectedMethod === 'wallet' && { color: 'blue' }
                  ]}>
                    Gahungu Wallet (Balance: {getCurrency(country)} {walletBalance ? walletBalance.toLocaleString() : 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Proceed to Payment Button */}
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  { opacity: selectedMethod ? 1 : 0.5 }
                ]}
                onPress={handleProceedToPayment}
                disabled={!selectedMethod}
              >
                <Text style={styles.paymentButtonText}>{t["proceed to payment"]}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA' },
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
  content: { flex: 1 },
  emptyCart: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyCartTitle: {
    fontFamily: 'Roboto-Medium',
    fontSize: 20,
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  browseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  browseButtonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  imagePlaceholder: {
    width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee',
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontFamily: 'Roboto-Medium', fontSize: 16, color: '#212121', marginBottom: 4 },
  productPrice: { fontFamily: 'Roboto-Regular', fontSize: 14, color: '#2e7d32', marginBottom: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qtyButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f5f5',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0',
  },
  productQty: { fontFamily: 'Roboto-Medium', fontSize: 16, color: '#212121', marginHorizontal: 12, minWidth: 24, textAlign: 'center' },
  subtotalCard: {
    backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07, shadowRadius: 2, elevation: 2,
    marginTop: 8, marginHorizontal: 16, borderRadius: 12, marginBottom: 8,
  },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subtotalLabel: { fontFamily: 'Roboto-Bold', fontSize: 16, color: '#212121' },
  subtotalValue: { fontFamily: 'Roboto-Bold', fontSize: 16, color: '#2e7d32' },
  paymentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  paymentTitle: { fontFamily: 'Roboto-Bold', fontSize: 16, marginBottom: 12, color: '#212121' },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  selectedOption: { borderColor: '#4CAF50', borderWidth: 2 },
  paymentOptionText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 15,
    marginLeft: 10,
    color: '#212121',
  },
  paymentButton: {
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 90,
    backgroundColor: '#4CAF50',
    marginHorizontal: 45,
  },
  paymentButtonText: { fontFamily: 'Roboto-Bold', fontSize: 16, color: '#fff' },
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
