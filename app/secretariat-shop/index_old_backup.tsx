import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect, Link } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, ShoppingBag, Search, Filter, DollarSign, Truck, Package, Heart, Plus, Minus, ShoppingCart, X, PlusCircle } from 'lucide-react-native';
import { addToCart, getCartCount, hasCartBeenViewed, resetCartViewedStatus, getFavorites, toggleFavorite, markCartAsViewed } from '@/lib/secretariatCart';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const SOUVENIR_PRODUCTS = [
  {
    id: '1',
    name: 'Alumni Branded Polo Shirt',
    description: 'High-quality cotton polo with embroidered school logo',
    priceUSD: 35.99,
    priceGHS: 395.63, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&auto=format&fit=crop&q=60',
    category: 'Clothing',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: '2',
    name: 'Commemorative Mug',
    description: 'Ceramic mug featuring the school crest and motto',
    priceUSD: 15.99,
    priceGHS: 175.73, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&auto=format&fit=crop&q=60',
    category: 'Homeware',
    sizes: ['One Size'],
  },
  {
    id: '3',
    name: 'Leather Notebook',
    description: 'Premium leather-bound notebook with embossed logo',
    priceUSD: 24.99,
    priceGHS: 274.63, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60',
    category: 'Stationery',
    sizes: ['A5', 'A4'],
  },
  {
    id: '4',
    name: 'Anniversary Yearbook',
    description: 'Special edition commemorating school milestones',
    priceUSD: 49.99,
    priceGHS: 549.39, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=60',
    category: 'Books',
    sizes: ['Standard'],
  },
  {
    id: '5',
    name: 'School Crest Lapel Pin',
    description: 'Elegant metal pin featuring the school crest',
    priceUSD: 12.99,
    priceGHS: 142.76, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1601591219083-d9d11b6a8852?w=800&auto=format&fit=crop&q=60',
    category: 'Accessories',
    sizes: ['One Size'],
  },
  {
    id: '6',
    name: 'Alumni Hoodie',
    description: 'Comfortable hoodie with school colors and logo',
    priceUSD: 45.99,
    priceGHS: 505.43, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=60',
    category: 'Clothing',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
];

const DELIVERY_OPTIONS = [
  {
    id: '1',
    title: 'Home Delivery',
    description: 'Get your items delivered to your doorstep',
    icon: Truck,
    estimatedTime: '3-5 business days',
    fee: '$5.99',
  },
  {
    id: '2',
    title: 'Pickup at Secretariat',
    description: 'Collect your items from the Alumni Secretariat',
    icon: Package,
    estimatedTime: 'Available next business day',
    fee: 'Free',
  },
];

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Items' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'homeware', name: 'Homeware' },
  { id: 'stationery', name: 'Stationery' },
  { id: 'books', name: 'Books' },
];

export default function SecretariatShopScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'GHS'>('USD');
  const [showCartBadge, setShowCartBadge] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [postedItems, setPostedItems] = useState<any[]>([]);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [filterCurrency, setFilterCurrency] = useState<'USD' | 'GHS'>('USD');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const loadCartCount = async () => {
    const count = await getCartCount();
    setCartCount(count);
    
    // Check if cart has been viewed
    const viewed = await hasCartBeenViewed();
    setShowCartBadge(!viewed && count > 0);
    
    // Load favorites
    const favoriteIds = await getFavorites();
    setFavorites(favoriteIds);
    
    // Load posted items
    const storedItems = await AsyncStorage.getItem('secretariat_posted_items');
    if (storedItems) {
      setPostedItems(JSON.parse(storedItems));
    }
  };

  useEffect(() => {
    loadCartCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCartCount();
    }, [])
  );

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Get all unique sizes from products
  const allProducts = [...SOUVENIR_PRODUCTS, ...postedItems];
  const allSizes = Array.from(new Set(allProducts.flatMap(p => p.sizes)));

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setPriceRange({ min: '', max: '' });
    setFilterCurrency('USD');
  };

  const filteredProducts = allProducts.filter(product => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.sizes.some((size: string) => size.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }

    // Filter by category
    if (activeCategory !== 'all' && product.category.toLowerCase() !== activeCategory) {
      return false;
    }

    // Filter by selected categories from filter modal
    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(product.category)) {
        return false;
      }
    }

    // Filter by selected sizes
    if (selectedSizes.length > 0) {
      if (!product.sizes.some((size: string) => selectedSizes.includes(size))) {
        return false;
      }
    }

    // Filter by price range
    if (priceRange.min || priceRange.max) {
      const price = filterCurrency === 'USD' ? product.priceUSD : product.priceGHS;
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      
      if (price < min || price > max) {
        return false;
      }
    }
    
    return true;
  });

  const handleAddToCart = async (product: any) => {
    try {
      const price = currency === 'USD' ? product.priceUSD : product.priceGHS;
      
      await addToCart({
        id: `cart_${Date.now()}`,
        productId: product.id,
        name: product.name,
        description: product.description,
        price: price,
        currency: currency,
        image: product.images ? product.images[0] : product.image,
        category: product.category,
      });
      
      // Reset cart viewed status when adding new item
      await resetCartViewedStatus();
      
      const count = await getCartCount();
      setCartCount(count);
      setShowCartBadge(true);
      
      Alert.alert(
        'Added to Cart',
        `${product.name} has been added to your cart.`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { 
            text: 'View Cart', 
            onPress: async () => {
              await markCartAsViewed();
              debouncedRouter.push('/cart');
            }
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleToggleFavorite = async (productId: string) => {
    await toggleFavorite(productId);
    const updatedFavorites = await getFavorites();
    setFavorites(updatedFavorites);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Secretariat Shop</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.favoritesButton}
            onPress={() => debouncedRouter.push('/secretariat-shop/favorites')}
          >
            <Heart 
              size={24} 
              color="#FF3B30" 
              fill={favorites.length > 0 ? "#FF3B30" : "transparent"}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={async () => {
              await markCartAsViewed();
              debouncedRouter.push('/cart');
            }}
          >
            <ShoppingBag size={24} color="#000000" />
            {showCartBadge && cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search souvenirs..."
            placeholderTextColor="#666666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterIconButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Filter size={20} color="#666666" />
          {(selectedCategories.length > 0 || selectedSizes.length > 0 || priceRange.min || priceRange.max) && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedCategories.length + selectedSizes.length + (priceRange.min || priceRange.max ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Toggle */}
      <View style={styles.currencyContainer}>
        <View style={styles.currencyToggle}>
          <TouchableOpacity
            style={[styles.currencyButton, currency === 'USD' && styles.activeCurrencyButton]}
            onPress={() => setCurrency('USD')}
          >
            <Text style={[styles.currencyButtonText, currency === 'USD' && styles.activeCurrencyButtonText]}>
              USD ($)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyButton, currency === 'GHS' && styles.activeCurrencyButton]}
            onPress={() => setCurrency('GHS')}
          >
            <Text style={[styles.currencyButtonText, currency === 'GHS' && styles.activeCurrencyButtonText]}>
              GHS (₵)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Item Button */}
        <View style={styles.postItemContainer}>
          <TouchableOpacity 
            style={styles.postItemButton}
            onPress={() => {
              console.log('Navigating to post-item');
              debouncedRouter.push('/secretariat-shop/post-item');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postItemGradient}
            >
              <PlusCircle size={20} color="#FFFFFF" />
              <Text style={styles.postItemText}>Post Item to Shop</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* My Items Button */}
        <View style={styles.myItemsContainer}>
          <TouchableOpacity 
            style={styles.myItemsButton}
            onPress={() => debouncedRouter.push('/secretariat-shop/my-posted-items')}
            activeOpacity={0.8}
          >
            <View style={styles.myItemsContent}>
              <Package size={20} color="#10B981" />
              <Text style={styles.myItemsText}>My Items</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories as first item in scrollable content */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {PRODUCT_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.activeCategoryButton,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.productsGrid}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => debouncedRouter.push(`/secretariat-shop/${product.id}`)}
              >
                <Image 
                  source={{ uri: product.images ? product.images[0] : product.image }} 
                  style={styles.productImage} 
                />
                <TouchableOpacity 
                  style={styles.productFavoriteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(product.id);
                  }}
                >
                  <Heart 
                    size={20} 
                    color={favorites.includes(product.id) ? "#FF3B30" : "#FFFFFF"}
                    fill={favorites.includes(product.id) ? "#FF3B30" : "transparent"}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
                <View style={styles.productContent}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
                  <View style={styles.productFooter}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.currencySymbol}>
                        {currency === 'USD' ? '$' : '₵'}
                      </Text>
                      <Text style={styles.priceText}>
                        {(currency === 'USD' ? product.priceUSD : product.priceGHS).toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => handleAddToCart(product)}
                    >
                      <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery & Pickup Options</Text>
          {DELIVERY_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <TouchableOpacity 
                key={option.id} 
                style={styles.deliveryCard}
                onPress={() => {
                  if (option.id === '1') {
                    debouncedRouter.push('/secretariat-shop/delivery');
                  } else if (option.id === '2') {
                    debouncedRouter.push('/secretariat-shop/pickup');
                  }
                }}
              >
                <View style={styles.deliveryIcon}>
                  <IconComponent size={24} color="#4169E1" />
                </View>
                <View style={styles.deliveryContent}>
                  <Text style={styles.deliveryTitle}>{option.title}</Text>
                  <Text style={styles.deliveryDescription}>{option.description}</Text>
                  <View style={styles.deliveryDetails}>
                    <Text style={styles.deliveryTime}>{option.estimatedTime}</Text>
                    <Text style={styles.deliveryFee}>{option.fee}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.infoCard}>
            <ShoppingBag size={24} color="#4169E1" />
            <Text style={styles.infoTitle}>About Our Products</Text>
            <Text style={styles.infoText}>
              All items are officially licensed and a portion of each sale supports alumni initiatives and scholarship programs.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <View style={styles.filterOptions}>
                  {PRODUCT_CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.filterChip,
                        selectedCategories.includes(category.name) && styles.filterChipActive
                      ]}
                      onPress={() => toggleCategory(category.name)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedCategories.includes(category.name) && styles.filterChipTextActive
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Size Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Size</Text>
                <View style={styles.filterOptions}>
                  {allSizes.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.filterChip,
                        selectedSizes.includes(size) && styles.filterChipActive
                      ]}
                      onPress={() => toggleSize(size)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedSizes.includes(size) && styles.filterChipTextActive
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.currencySelector}>
                  <TouchableOpacity
                    style={[
                      styles.currencySelectorButton,
                      filterCurrency === 'USD' && styles.currencySelectorButtonActive
                    ]}
                    onPress={() => setFilterCurrency('USD')}
                  >
                    <Text style={[
                      styles.currencySelectorText,
                      filterCurrency === 'USD' && styles.currencySelectorTextActive
                    ]}>
                      USD ($)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.currencySelectorButton,
                      filterCurrency === 'GHS' && styles.currencySelectorButtonActive
                    ]}
                    onPress={() => setFilterCurrency('GHS')}
                  >
                    <Text style={[
                      styles.currencySelectorText,
                      filterCurrency === 'GHS' && styles.currencySelectorTextActive
                    ]}>
                      GHS (₵)
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.priceRangeInputs}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Min</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={priceRange.min}
                      onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: text }))}
                    />
                  </View>
                  <Text style={styles.priceRangeSeparator}>-</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Max</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="999"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={priceRange.max}
                      onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: text }))}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  favoritesButton: {
    padding: 8,
    position: 'relative',
  },
  favoritesBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoritesBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  postItemContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  postItemButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  postItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  postItemText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  myItemsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  myItemsButton: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10B981',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myItemsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  myItemsText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  currencyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 2,
  },
  currencyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  activeCurrencyButton: {
    backgroundColor: '#4169E1',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  activeCurrencyButtonText: {
    color: '#FFFFFF',
  },
  filterIconButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4169E1',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesScroll: {
    marginBottom: 16,
    marginTop: 8,
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  activeCategoryButton: {
    backgroundColor: '#4169E1',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  productFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  priceText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  deliveryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deliveryContent: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  deliveryDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  deliveryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  deliveryFee: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginTop: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  currencySelectorButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencySelectorButtonActive: {
    backgroundColor: '#EBF0FF',
    borderColor: '#4169E1',
  },
  currencySelectorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  currencySelectorTextActive: {
    color: '#4169E1',
    fontFamily: 'Inter-SemiBold',
  },
  priceRangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceRangeSeparator: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});