import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Animated, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, ShoppingCart, Sparkles, Lock, Heart, Share2, Tag } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { getCartItems, updateCartItemQuantity, removeFromCart, clearCart, SecretariatCartItem, markCartAsViewed, getFavorites, toggleFavorite } from '@/lib/secretariatCart';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<SecretariatCartItem[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'GHS'>('USD');
  const [favorites, setFavorites] = useState<string[]>([]);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadCart = async () => {
    const items = await getCartItems();
    setCartItems(items);
    
    // Load favorites
    const favoriteIds = await getFavorites();
    setFavorites(favoriteIds);
    
    // Mark cart as viewed when user opens the cart page
    await markCartAsViewed();
  };

  useEffect(() => {
    loadCart();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

  const updateQuantity = async (itemId: string, change: number) => {
    const item = cartItems.find(i => i.id === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        await updateCartItemQuantity(itemId, newQuantity);
        await loadCart();
      }
    }
  };

  const removeItem = async (itemId: string, itemName: string) => {
    if (confirm(`Are you sure you want to remove "${itemName}" from your cart?`)) {
      try {
        const updatedItems = await removeFromCart(itemId);
        setCartItems(updatedItems);
        
        // Also reload to ensure consistency
        await loadCart();
      } catch (error) {
        console.error('Error removing item:', error);
        alert('Failed to remove item from cart');
      }
    }
  };

  const handleToggleFavorite = async (productId: string) => {
    await toggleFavorite(productId);
    const updatedFavorites = await getFavorites();
    setFavorites(updatedFavorites);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1; // 10% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  // Currency conversion rate (approximately 16.3 GHS = 1 USD as of November 2025)
  const EXCHANGE_RATE = 16.3;

  const convertPrice = (price: number, fromCurrency: 'USD' | 'GHS', toCurrency: 'USD' | 'GHS') => {
    if (fromCurrency === toCurrency) return price;
    if (fromCurrency === 'USD' && toCurrency === 'GHS') {
      return price * EXCHANGE_RATE;
    }
    if (fromCurrency === 'GHS' && toCurrency === 'USD') {
      return price / EXCHANGE_RATE;
    }
    return price;
  };

  const calculateSubtotalInDisplayCurrency = () => {
    return cartItems.reduce((sum, item) => {
      const itemPrice = convertPrice(item.price, item.currency, displayCurrency);
      return sum + itemPrice * item.quantity;
    }, 0);
  };

  const calculateTaxInDisplayCurrency = () => {
    return calculateSubtotalInDisplayCurrency() * 0.1;
  };

  const calculateTotalInDisplayCurrency = () => {
    return calculateSubtotalInDisplayCurrency() + calculateTaxInDisplayCurrency();
  };

  const getDisplayCurrencySymbol = () => {
    return displayCurrency === 'USD' ? '$' : '₵';
  };

  const getCartCurrency = () => {
    // Return the currency of the first item, or USD as default
    return cartItems.length > 0 ? cartItems[0].currency : 'USD';
  };

  const getCurrencySymbol = () => {
    return getCartCurrency() === 'USD' ? '$' : '₵';
  };

  const handleCheckout = () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to proceed with checkout');
      return;
    }
    
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Add some items to proceed.');
      return;
    }

    // Navigate to checkout page with cart totals in display currency
    router.push({
      pathname: '/checkout' as any,
      params: {
        subtotal: calculateSubtotalInDisplayCurrency().toFixed(2),
        tax: calculateTaxInDisplayCurrency().toFixed(2),
        total: calculateTotalInDisplayCurrency().toFixed(2),
        currency: displayCurrency,
      },
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Shopping Cart</Text>
          </View>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Currency Toggle */}
      {cartItems.length > 0 && (
        <View style={styles.currencyContainer}>
          <Text style={styles.currencyLabel}>Display Total in:</Text>
          <View style={styles.currencyToggle}>
            <TouchableOpacity
              style={[styles.currencyButton, displayCurrency === 'USD' && styles.activeCurrencyButton]}
              onPress={() => setDisplayCurrency('USD')}
            >
              <Text style={[styles.currencyButtonText, displayCurrency === 'USD' && styles.activeCurrencyButtonText]}>
                USD ($)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.currencyButton, displayCurrency === 'GHS' && styles.activeCurrencyButton]}
              onPress={() => setDisplayCurrency('GHS')}
            >
              <Text style={[styles.currencyButtonText, displayCurrency === 'GHS' && styles.activeCurrencyButtonText]}>
                GHS (₵)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <ShoppingBag size={80} color="#E0E0E0" />
            <Sparkles size={32} color="#4169E1" style={styles.sparkleIcon} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Browse the marketplace and add items to your cart</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/services')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4169E1', '#5B7FE8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shopButtonGradient}
            >
              <Sparkles size={20} color="#FFFFFF" />
              <Text style={styles.shopButtonText}>Shop Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Animated.ScrollView 
            style={[styles.cartList, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Cart Header Info */}
            <View style={styles.cartHeaderInfo}>
              <View style={styles.cartHeaderLeft}>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemsCountLarge}>{cartItems.length}</Text>
                </View>
                <View>
                  <Text style={styles.itemsText}>{cartItems.length === 1 ? 'Item' : 'Items'} in Cart</Text>
                  <Text style={styles.inCartText}>Ready for checkout</Text>
                </View>
              </View>
              <View style={styles.freeShippingBadge}>
                <Sparkles size={14} color="#10B981" />
                <Text style={styles.freeShippingText}>Free Service</Text>
              </View>
            </View>

            {/* Cart Items Grid */}
            {cartItems.map((item, index) => (
              <Animated.View 
                key={item.id} 
                style={[
                  styles.cartItemCard,
                  { 
                    opacity: fadeAnim,
                    transform: [{ 
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 30 + (index * 10)],
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    {/* Image Section with Badge */}
                    <View style={styles.imageSection}>
                      <Image source={{ uri: item.image }} style={styles.itemImageLarge} />
                      <View style={styles.imageBadge}>
                        <Tag size={12} color="#4169E1" />
                        <Text style={styles.imageBadgeText}>{item.category}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeItem(item.id, item.name)}
                        style={styles.removeButton}
                        activeOpacity={0.8}
                      >
                        <Trash2 size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                      <View style={styles.titleRow}>
                        <Text style={styles.itemTitleLarge} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <TouchableOpacity 
                          style={styles.favoriteButton}
                          onPress={() => handleToggleFavorite(item.productId)}
                          activeOpacity={0.7}
                        >
                          <Heart 
                            size={20} 
                            color={favorites.includes(item.productId) ? "#FF3B30" : "#CCCCCC"}
                            fill={favorites.includes(item.productId) ? "#FF3B30" : "transparent"}
                          />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>

                      {/* Price and Quantity Row */}
                      <View style={styles.bottomRow}>
                        <View style={styles.priceSection}>
                          <Text style={styles.priceLabel}>Price</Text>
                          <View style={styles.priceRowLarge}>
                            <Text style={styles.itemPriceLarge}>
                              {item.currency === 'USD' ? '$' : '₵'}{item.price.toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.quantitySection}>
                          <Text style={styles.quantityLabel}>Quantity</Text>
                          <View style={styles.quantityControlModern}>
                            <TouchableOpacity
                              onPress={() => updateQuantity(item.id, -1)}
                              style={styles.quantityButtonModern}
                              activeOpacity={0.7}
                            >
                              <Minus size={18} color="#4169E1" strokeWidth={3} />
                            </TouchableOpacity>
                            <View style={styles.quantityDisplayBox}>
                              <Text style={styles.quantityModern}>{item.quantity}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => updateQuantity(item.id, 1)}
                              style={styles.quantityButtonModern}
                              activeOpacity={0.7}
                            >
                              <Plus size={18} color="#4169E1" strokeWidth={3} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Subtotal with Highlight */}
                      <View style={styles.itemSubtotal}>
                        <Text style={styles.subtotalLabel}>Item Total</Text>
                        <Text style={styles.subtotalValue}>
                          {item.currency === 'USD' ? '$' : '₵'}{(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            ))}

            {/* Modern Summary Footer - moved inside ScrollView */}
            <View style={styles.footerContainer}>
              <View style={styles.promoSection}>
                <View style={styles.promoIcon}>
                  <Sparkles size={16} color="#4169E1" />
                </View>
                <Text style={styles.promoText}>Add promo code at checkout</Text>
              </View>

              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    {getDisplayCurrencySymbol()}{calculateSubtotalInDisplayCurrency().toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax (10%)</Text>
                  <Text style={styles.summaryValue}>
                    {getDisplayCurrencySymbol()}{calculateTaxInDisplayCurrency().toFixed(2)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    {getDisplayCurrencySymbol()}{calculateTotalInDisplayCurrency().toFixed(2)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.checkoutButton} 
                onPress={handleCheckout}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#4169E1', '#5B7FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.checkoutButtonGradient}
                >
                  <Lock size={20} color="#FFFFFF" />
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomPadding} />
          </Animated.ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  cartBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shopButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  shopButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  cartList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  cartHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  itemCountBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  itemsCountLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#4169E1',
    lineHeight: 32,
  },
  itemsText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  inCartText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#10B981',
  },
  freeShippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  freeShippingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#10B981',
  },
  cartItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardGradient: {
    borderRadius: 20,
  },
  imageBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(65, 105, 225, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  quantityDisplayBox: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4169E1',
    minWidth: 60,
    alignItems: 'center',
  },
  imageSection: {
    position: 'relative',
    marginBottom: 16,
  },
  itemImageLarge: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  infoSection: {
    gap: 12,
  },
  itemCategory: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#4169E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemTitleLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1A1A1A',
    lineHeight: 28,
  },
  itemDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitial: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#4169E1',
  },
  itemSellerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  priceRowLarge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  itemPriceLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1A1A1A',
  },
  perHourText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  quantitySection: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  quantityControlModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  quantityButtonModern: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityModern: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A',
    minWidth: 32,
    textAlign: 'center',
  },
  itemSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  subtotalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  subtotalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#4169E1',
  },
  bottomPadding: {
    height: 100,
  },
  footerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 280,
  },
  promoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  promoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#4169E1',
  },
  summarySection: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 6,
  },
  totalLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#4169E1',
  },
  checkoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 52,
  },
  checkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    minHeight: 52,
  },
  checkoutButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  currencyLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  activeCurrencyButton: {
    backgroundColor: '#4169E1',
  },
  currencyButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  activeCurrencyButtonText: {
    color: '#FFFFFF',
  },
});
