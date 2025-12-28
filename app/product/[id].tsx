import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { Alert } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pharmacy, Product } from '@/types';
import { useToastStore } from '@/stores/toastStore';
import Toast from '@/components/Toast';
import { useCartStore } from '@/stores/cartStore';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/config';

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

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const VIEW_FEE = 500;
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select(`
          id, name, title, price, original_price, image, description,
          medicine_pharmacies (
            locations,
            insurances,
            pharmacies ( id, name, image, accepted_insurances )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product details:', error.message);
        setProduct(null);
      } else if (data) {
        const transformedProduct = {
          ...data,
          originalPrice: data.original_price,
          pharmacies: data.medicine_pharmacies.map((mp: any) => ({
            ...(mp.pharmacies || {}),
            insurances: mp.insurances || [],
            locations: mp.locations || [],
          })),
        };
        setProduct(transformedProduct as unknown as Product);
      }
      setLoading(false);
    };

    fetchProduct();

    const channel = supabase
      .channel(`product-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines', filter: `id=eq.${id}` }, () => fetchProduct())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicine_pharmacies', filter: `medicine_id=eq.${id}` }, () => fetchProduct())
      .subscribe();

    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      supabase.removeChannel(channel);
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [id, navigation]);

  const [quantity, setQuantity] = useState(1);

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });

  // Lock modal states
  const [lockModalType, setLockModalType] = useState<'insurances' | 'pharmacies' | null>(null);
  const [showInsurances, setShowInsurances] = useState(false);
  const [showPharmacies, setShowPharmacies] = useState(false);

  // Refs for measuring
  const cartIconRef = useRef<View>(null);
  const addToCartBtnRef = useRef<View>(null);

  // Cart store
  const cartCount = useCartStore(state => state.cartCount);
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = () => {
    if (product) {
      setTimeout(() => {
        if (addToCartBtnRef.current && cartIconRef.current) {
          addToCartBtnRef.current.measure((fx, fy, width, height, px, py) => {
            setStartPos({ x: px, y: py });
            if (cartIconRef.current) {
              cartIconRef.current.measure((cfx, cfy, cwidth, cheight, cpx, cpy) => {
                setEndPos({ x: cpx, y: cpy });
                setShowAnimation(true);
                animation.setValue(0);
                Animated.timing(animation, {
                  toValue: 1,
                  duration: 800,
                  useNativeDriver: true,
                }).start(() => {
                  setShowAnimation(false);
                });
              });
            }
          });
        }
      }, 50);

      addToCart(product, quantity);
      useToastStore.getState().showToast("Product added to cart!");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Product not found.</Text>
      </View>
    );
  }

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const allInsurances = Array.from(
    new Set(
      (product.pharmacies || [])
        .flatMap(pharmacy => pharmacy.insurances || [])
        .filter(Boolean)
    )
  );

  // Calculate animated position
  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [startPos.x, endPos.x],
  });
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [startPos.y, endPos.y],
  });

  // Lock modal handler
  const handleLockPress = async (type: 'insurances' | 'pharmacies') => {
    setLockModalType(type);
    setIsBalanceLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        useToastStore.getState().showToast("Please log in to view details.");
        router.push('/auth');
        setLockModalType(null);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.wallet_balance || 0);
        setWalletBalance(Number(data.wallet_balance) || 0);
      } else {
        useToastStore.getState().showToast("Could not fetch wallet balance.");
        setLockModalType(null);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      useToastStore.getState().showToast("An error occurred.");
      setLockModalType(null);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  // Handle payment to view
  const handleConfirmViewPayment = async () => {
    if (walletBalance === null || walletBalance < VIEW_FEE) {
      useToastStore.getState().showToast("Insufficient wallet balance.");
      return;
    }

    if (!pinCode) {
      useToastStore.getState().showToast("Please enter your PIN code.");
      return;
    }

    setIsPaying(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        useToastStore.getState().showToast("Authentication error. Please log in again.");
        router.push('/auth');
        return;
      }

      // Step 1: Verify the PIN first
      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: pinCode }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || "Incorrect PIN.");
      }

      // Step 2: If PIN is correct, proceed with deduction
      const deductRes = await fetch(`${API_BASE_URL}/wallet/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: VIEW_FEE, reason: `View product ${id} details` }),
      });

      if (!deductRes.ok) {
        const errorData = await deductRes.json();
        throw new Error(errorData.error || "Payment failed after PIN verification.");
      }

      // Success!
      if (lockModalType === 'pharmacies') setShowPharmacies(true);
      if (lockModalType === 'insurances') setShowInsurances(true);
      useToastStore.getState().showToast("Payment successful!");
      handleModalClose();
    } catch (error: unknown) {
      let errorMessage = "An error occurred during payment.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert("Payment Failed", errorMessage);
    } finally {
      setIsPaying(false);
    }
  };

  // Modal close handler
  const handleModalClose = () => {
    setLockModalType(null);
    setPinCode(''); // Clear PIN on modal close
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Product Details</Text>

        <View style={styles.headerIconContainer} ref={cartIconRef}>
          <TouchableOpacity onPress={() => router.push('/cart')}>
            <Icon name="shopping-cart" size={28} color="gray" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {product.image ? (
          <Image
            source={{ uri: product.image as string }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="medication" size={40} color="#666" />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}


        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}> {parseFloat(String(product.price)).toFixed(2)} {getCurrency(country)}</Text>
            {hasDiscount && (
              <>
                <Text style={styles.originalPrice}> {parseFloat(String(product.originalPrice)).toFixed(2)} {getCurrency(country)}</Text>
                <Text style={styles.discountPercentage}>{discountPercentage}% OFF</Text>
              </>
            )}
          </View>
          <Text style={styles.description}>{product.description}</Text>

          {/* Available At Lock */}
          <View style={styles.section}>
            <View style={styles.lockHeader}>
              <Text style={styles.sectionTitle}>Available At</Text>
              <TouchableOpacity onPress={() => handleLockPress('pharmacies')}>
                <Icon name="lock" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>
            {showPharmacies && (
              product.pharmacies && product.pharmacies.length > 0 ? (
                product.pharmacies.map((pharmacy) => (
                  <TouchableOpacity
                    key={pharmacy.id}
                    style={styles.pharmacyCard}
                    onPress={() => router.push({
                      pathname: '/pharmacy/[id]',
                      params: { id: pharmacy.id }
                    })}
                  >
                    <View style={styles.pharmacyHeader}>
                      {pharmacy.image ? (
                        <Image
                          source={{ uri: pharmacy.image as string }}
                          style={styles.pharmacyImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.pharmacyImagePlaceholder}>
                          <Icon name="local-pharmacy" size={24} color="#666" />
                        </View>
                      )}
                      <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                    </View>
                    <View style={styles.pharmacyDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="location-on" size={16} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {(pharmacy as any).locations && (pharmacy as any).locations.length > 0
                            ? (pharmacy as any).locations.join(', ')
                            : pharmacy.location || 'Location not specified'}
                        </Text>
                      </View>
                      {pharmacy.insurances?.length > 0 && (
                        <View style={styles.detailRow}>
                          <Icon name="verified-user" size={16} color="#4CAF50" />
                          <Text style={styles.detailText}>
                            {pharmacy.insurances.join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noDataText}>No pharmacies listed</Text>
              )
            )}
          </View>
        </View>
        <View ref={addToCartBtnRef}>
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Animation component */}
      {showAnimation && (
        <Animated.View
          style={{
            position: 'absolute',
            zIndex: 100,
            transform: [
              { translateX },
              { translateY }
            ],
          }}
          pointerEvents="none"
        >
          <Icon name="shopping-cart" size={30} color="green" />
        </Animated.View>
      )}
      {/* Lock Modal */}
      <Modal
        visible={!!lockModalType}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Cross icon to close modal */}
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={handleModalClose}
            >
              <Icon name="close" size={24} color="#212121" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Unlock Information</Text>
            
            {isBalanceLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.modalText}>
                  Pay <Text style={{ fontWeight: 'bold' }}>{VIEW_FEE} {getCurrency(country)}</Text> to view with Gahungu Wallet.
                </Text>
                <Text style={styles.balanceText}>
                  Your balance: {walletBalance?.toLocaleString() ?? '...'} {getCurrency(country)}
                </Text>

                <TextInput
                  style={styles.pinCodeInput}
                  placeholder="Enter your PIN code"
                  keyboardType="number-pad"
                  secureTextEntry={true}
                  value={pinCode}
                  onChangeText={setPinCode}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleModalClose}
                    disabled={isPaying}
                  >
                    <Text style={[styles.modalButtonText, { color: '#212121' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      (isPaying || (walletBalance !== null && walletBalance < VIEW_FEE) || pinCode.length !== 4) && styles.disabledButton
                    ]}
                    onPress={handleConfirmViewPayment}
                    disabled={isPaying || (walletBalance !== null && walletBalance < VIEW_FEE)}
                  >
                    {isPaying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonText}>Pay</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Toast />
    </View>
  );
}

import { ActivityIndicator } from 'react-native';
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    textAlign: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'green',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  imageContainer: {
    backgroundColor: '#E0F7FA',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto-Regular',
    marginTop: 8,
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 22,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
    color: '#424242',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#2e7d32',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#9e9e9e',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountPercentage: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#f44336',
  },
  description: {
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    color: '#616161',
    marginBottom: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#212121',
    marginBottom: 12,
  },
  lockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  insuranceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  insuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  insuranceText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#2e7d32',
    marginLeft: 4,
  },
  pharmacyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
  },
  pharmacyImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  pharmacyImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pharmacyName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#212121',
    flex: 1,
  },
  pharmacyDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#616161',
    marginLeft: 8,
    flex: 1,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#616161',
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
  },
  addToCartButton: {
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 30,
    backgroundColor: '#4CAF50',
    marginHorizontal: 45,
  },
  addToCartText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
    color: '#212121',
    marginTop: 8,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    textAlign: 'center',
    marginBottom: 8,
    color: '#424242',
  },
  balanceText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#616161',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#eeeeee',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
  pinCodeInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    width: '80%',
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
