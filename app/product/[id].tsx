import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  Dimensions,
  TextInput,
  ActivityIndicator,
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
import ConfettiCannon from 'react-native-confetti-cannon';


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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const showToast = useToastStore(state => state.showToast);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const storedCountry = await SecureStore.getItemAsync("user_country");
      setCountry(storedCountry);
    };

    fetchCountry();
  }, []);

  useEffect(() => {
    if (!showDetails) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showDetails]);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      // 1. Fetch the stock item to get basic details
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('id', id)
        .single();

      if (stockError) {
        console.error('Error fetching product details:', stockError.message);
        setProduct(null);
      } else if (stockData) {
        // 2. Fetch all stocks with the same name to list all pharmacies
        const userCountry = await SecureStore.getItemAsync("user_country");
        
        const { data: allStocks } = await supabase
            .from('stock')
            .select(`
                *,
                pharmacy:pharmacy_applications!stock_pharmacy_id_fkey (
                    id, name, image, location, accepted_insurances, country
                )
            `)
            .ilike('name', stockData.name)
            .eq('in_stock', true);

        let pharmacyList: any[] = [];

        if (allStocks) {
             pharmacyList = allStocks
                .filter((item: any) => item.pharmacy && (!userCountry || item.pharmacy.country === userCountry))
                .map((item: any) => {
                    const pData = item.pharmacy;
                    
                    let parsedLocation = [];
                    try {
                        parsedLocation = typeof pData.location === 'string' ? JSON.parse(pData.location) : pData.location || [];
                    } catch (e) { parsedLocation = []; }

                    let parsedInsurances = [];
                    try {
                        parsedInsurances = typeof pData.accepted_insurances === 'string' ? JSON.parse(pData.accepted_insurances) : pData.accepted_insurances || [];
                    } catch (e) { parsedInsurances = []; }

                    let productInsurances = null;
                    if (item.insurances) {
                        try {
                            productInsurances = typeof item.insurances === 'string' ? JSON.parse(item.insurances) : item.insurances;
                        } catch (e) { productInsurances = null; }
                    }
                    const finalInsurances = (Array.isArray(productInsurances) && productInsurances.length > 0) ? productInsurances : parsedInsurances;

                    return {
                        id: pData.id,
                        name: pData.name,
                        image: pData.image,
                        locations: Array.isArray(parsedLocation) ? parsedLocation.map((l: any) => `${l.city || ''} ${l.address || ''}`.trim()).filter(Boolean) : [],
                        insurances: Array.isArray(finalInsurances) ? finalInsurances : [],
                        price: item.price,
                        originalPrice: item.original_price,
                        stockId: item.id,
                        medicineId: item.medicine_id
                    };
                });
        }

        // Sort by price ascending
        pharmacyList.sort((a, b) => a.price - b.price);

        const transformedProduct = {
          id: stockData.id,
          name: stockData.name,
          price: stockData.price,
          originalPrice: stockData.original_price,
          image: stockData.image,
          description: stockData.description,
          pharmacies: pharmacyList,
        };
        setProduct(transformedProduct as unknown as Product);

        // Auto-select the pharmacy that matches the current stock ID (the one clicked)
        const currentPharmacy = pharmacyList.find((p: any) => p.stockId === stockData.id);
        if (currentPharmacy) {
          setSelectedPharmacyId(currentPharmacy.id);
        }
      }
      setLoading(false);
    };

    fetchProduct();

    const channel = supabase
      .channel(`product-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock', filter: `id=eq.${id}` }, () => fetchProduct())
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

  // Lock modal handler
  const handleLockPress = async () => {
    setIsModalVisible(true);
    setIsBalanceLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        showToast("Please log in to view details.");
        router.push('/auth');
        setIsModalVisible(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(Number(data.wallet_balance) || 0);
      } else {
        showToast("Could not fetch wallet balance.");
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      showToast("An error occurred.");
      setIsModalVisible(false);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  // Handle payment to view
  const handleConfirmViewPayment = async () => {
    console.log("Starting payment process...");
    if (walletBalance === null || walletBalance < VIEW_FEE) {
      showToast(walletBalance === null ? "Unable to verify wallet balance." : "Insufficient wallet balance.");
      return;
    }
    if (!pinCode) {
      showToast("Please enter your PIN code.");
      return;
    }

    setIsPaying(true);
    console.log(`Attempting to pay ${VIEW_FEE} with PIN: ${pinCode}`);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        showToast("Authentication error. Please log in again.");
        router.push('/auth');
        return;
      }

      // Step 1: Verify the PIN first
      console.log("Step 1: Verifying PIN...");
      const verifyRes = await fetch(`${API_BASE_URL}/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin_code: pinCode }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || "Incorrect PIN.");
      }

      console.log("PIN verification successful.");

      // Step 2: If PIN is correct, proceed with deduction
      const deductionPayload = { amount: VIEW_FEE, reason: `View product ${id} details`, pin: pinCode };
      console.log("Step 2: Proceeding with deduction. Payload:", JSON.stringify(deductionPayload));
      const deductRes = await fetch(`${API_BASE_URL}/wallet/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deductionPayload),
      });

      if (!deductRes.ok) {
        console.error("Deduction failed. Status:", deductRes.status);
        const errorData = await deductRes.json();
        console.error("Deduction error response:", errorData);
        throw new Error(errorData.error || "Payment failed after PIN verification.");
      }

      // Success!
      setShowDetails(true);
      setShowConfetti(true);
      console.log("Payment successful! Unlocking details.");
      showToast("Payment successful!");
      handleModalClose();
    } catch (error: unknown) {
      let errorMessage = "An error occurred during payment.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("An error occurred during payment:", errorMessage);
      Alert.alert("Payment Failed", errorMessage);
    } finally {
      setIsPaying(false);
    }
  };

  // Modal close handler
  const handleModalClose = () => {
    setIsModalVisible(false);
    setPinCode(''); // Clear PIN on modal close
  };

  const [quantity, setQuantity] = useState(1);

  // Animation state
  const [showAnimation, setShowAnimation] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });

  // Refs for measuring
  const cartIconRef = useRef<View>(null);
  const addToCartBtnRef = useRef<View>(null);

  // Cart store
  const cartCount = useCartStore(state => state.cartCount);
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = () => {
    if (product) {
      if (!selectedPharmacyId) {
        showToast("Please select a pharmacy first.");
        return;
      }

      const selectedPharmacy = (product.pharmacies || []).find(p => p.id === selectedPharmacyId);
      if (!selectedPharmacy) {
        showToast("Selected pharmacy not found.");
        return;
      }

      const productToAdd = {
        ...product,
        id: (selectedPharmacy as any).stockId,
        price: (selectedPharmacy as any).price,
        medicine_id: (selectedPharmacy as any).medicineId,
      };

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

      addToCart(productToAdd, quantity);
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
          {showDetails ? (
            <>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.description}>{product.description}</Text>
            </>
          ) : (
            null
          )}

          {/* Available At Lock */}
          <View style={styles.section}>
            <View style={styles.lockHeader}>
              {!showDetails && (
                <TouchableOpacity onPress={handleLockPress} style={{ alignItems: 'center', width: '100%', paddingVertical: 20 }}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Icon name="visibility" size={40} color="#4CAF50" />
                  </Animated.View>
                  <Text style={{ marginTop: 10, color: '#4CAF50', fontFamily: 'Roboto-Medium', fontSize: 16, textAlign: 'center' }}>
                    Click here to pay and view the medecine's details
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {showDetails && (
              product.pharmacies && product.pharmacies.length > 0 ? (
                product.pharmacies.map((pharmacy) => (
                  <View key={pharmacy.id} style={styles.pharmacyRow}>
                    <TouchableOpacity
                      style={styles.selectionContainer}
                      onPress={() => setSelectedPharmacyId(pharmacy.id)}
                    >
                      <Icon name={selectedPharmacyId === pharmacy.id ? "radio-button-checked" : "radio-button-unchecked"} size={24} color={selectedPharmacyId === pharmacy.id ? "#4CAF50" : "#9e9e9e"} />
                    </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pharmacyCard,
                      selectedPharmacyId === pharmacy.id && styles.selectedPharmacyCard
                    ]}
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
                      <View style={{ alignItems: 'flex-end' }}>
                        {(pharmacy as any).price && (
                          <Text style={styles.pharmacyPrice}>
                             {(pharmacy as any).price.toLocaleString()} {getCurrency(country)}
                          </Text>
                        )}
                        {(pharmacy as any).originalPrice > (pharmacy as any).price && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Text style={styles.pharmacyOriginalPrice}>
                              {(pharmacy as any).originalPrice.toLocaleString()} {getCurrency(country)}
                            </Text>
                            <Text style={styles.pharmacyDiscount}>
                              {Math.round((((pharmacy as any).originalPrice - (pharmacy as any).price) / (pharmacy as any).originalPrice) * 100)}% OFF
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.pharmacyDetails}>
                      <View style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Icon name="location-on" size={16} color="#4CAF50" />
                          <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#616161' }}>Locations</Text>
                        </View>
                        <View style={{ paddingLeft: 24 }}>
                          {(pharmacy as any).locations && (pharmacy as any).locations.length > 0
                            ? (pharmacy as any).locations.map((loc: string, i: number) => (
                                <Text key={i} style={styles.detailTextList}>{loc}</Text>
                              ))
                            : <Text style={styles.detailTextList}>{pharmacy.location || 'Location not specified'}</Text>
                          }
                        </View>
                      </View>
                      {pharmacy.insurances?.length > 0 && (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Icon name="verified-user" size={16} color="#4CAF50" />
                            <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#616161' }}>Insurances</Text>
                          </View>
                          <View style={{ paddingLeft: 24 }}>
                            {pharmacy.insurances.map((ins: string, i: number) => (
                              <Text key={i} style={styles.detailTextList}>➢ {ins}</Text>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No pharmacies listed</Text>
              )
            )}
          </View>
          <Pressable
              style={styles.carButton}
              onPress={() => showToast('Dr. IR. Gahungu ariko arabikora.', 1000)}
            >
              <Text style={styles.carButtonText}>Fyonda ngaha uhamagare umuduga ugushikana</Text>
            </Pressable>
        </View>

        {showDetails && (
          <>

            <View ref={addToCartBtnRef}>
              <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
                <Text style={styles.addToCartText}>
                  Add to Cart
                  {selectedPharmacyId && product?.pharmacies?.find(p => p.id === selectedPharmacyId)
                    ? ` - ${(product.pharmacies.find(p => p.id === selectedPharmacyId) as any).price.toLocaleString()} ${getCurrency(country)}`
                    : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView >
      {/* Animation component */}
      {
        showAnimation && (
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
        )
      }
      {/* Lock Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeIcon} onPress={handleModalClose}>
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
                      (isPaying || (walletBalance !== null && walletBalance < VIEW_FEE)) && styles.disabledButton
                    ]}
                    onPress={handleConfirmViewPayment}
                    disabled={isPaying}
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
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
          onAnimationEnd={() => setShowConfetti(false)}
        />
      )}

      <Toast />
    </View >
  );
}

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
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionContainer: {
    paddingRight: 10,
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  selectedPharmacyCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#e8f5e9',
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
  pharmacyPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#2e7d32',
    marginLeft: 8,
  },
  pharmacyOriginalPrice: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#9e9e9e',
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  pharmacyDiscount: {
    fontSize: 12,
    fontFamily: 'Roboto-Bold',
    color: '#f44336',
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
  detailTextList: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: 'purple',
    marginBottom: 2,
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

  carButton: {
    marginTop: 16,
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: 'green'
  },
  carButtonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
    textAlign: 'center',
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
