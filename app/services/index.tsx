import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Animated, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Filter, ArrowDownWideNarrow as SortDesc, MapPin, SearchSlash, ArrowLeft, Briefcase, GraduationCap, Wrench, Palette, Coffee, Stethoscope, Book, Camera, Plus, ShoppingBag } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { SAMPLE_PRODUCTS } from '@/lib/marketplace';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from 'react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CATEGORIES = [
  // Services
  { id: '1', name: 'Business Services', icon: Briefcase, type: 'service' },
  { id: '2', name: 'Education & Tutoring', icon: GraduationCap, type: 'service' },
  { id: '3', name: 'Technical Services', icon: Wrench, type: 'service' },
  { id: '4', name: 'Creative & Design', icon: Palette, type: 'service' },
  { id: '5', name: 'Food & Catering', icon: Coffee, type: 'service' },
  { id: '6', name: 'Healthcare', icon: Stethoscope, type: 'service' },
  { id: '7', name: 'Publishing', icon: Book, type: 'service' },
  { id: '8', name: 'Photography', icon: Camera, type: 'service' },
  // Products
  { id: '9', name: 'Electronics', icon: Camera, type: 'product' },
  { id: '10', name: 'Clothing & Fashion', icon: ShoppingBag, type: 'product' },
  { id: '11', name: 'Books & Media', icon: Book, type: 'product' },
  { id: '12', name: 'Home & Garden', icon: Coffee, type: 'product' },
  { id: '13', name: 'Sports & Outdoors', icon: Wrench, type: 'product' },
  { id: '14', name: 'Health & Beauty', icon: Stethoscope, type: 'product' },
  { id: '15', name: 'Toys & Games', icon: Palette, type: 'product' },
  { id: '16', name: 'Automotive', icon: Wrench, type: 'product' },
];

interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: number;
  reviews?: number;
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductServiceWithUser[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [sortOption, setSortOption] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'any' | 'new' | 'used'>('any');
  
  // Animation ref for shopping bag
  const bagScale = useRef(new Animated.Value(1)).current;
  const bagRotation = useRef(new Animated.Value(0)).current;
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Step 1: Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from('products_services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      if (!productsData || productsData.length === 0) {
        const sampleWithUser = SAMPLE_PRODUCTS.map(sample => ({
          ...(sample as any),
          user: {
            id: 'sample-user-id',
            username: 'akora_marketplace',
            full_name: 'Akora Marketplace',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
            created_at: new Date().toISOString(),
          } as Profile,
        })) as unknown as ProductServiceWithUser[];

        setProducts(sampleWithUser);
        setFeaturedBusinesses([]);
        return;
      }
      
      // Step 2: Get unique user IDs and fetch profiles
      const userIds = [...new Set(productsData.map(product => product.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Step 3: Create a map of profiles for quick lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
      
      // Step 4: Combine products with their user profiles and parse image URLs
      const formattedProducts = productsData.map(item => {
        // Parse image_url if it's a JSON array, otherwise use as-is
        let imageUrl = item.image_url;
        if (imageUrl && imageUrl.startsWith('[')) {
          try {
            const imageArray = JSON.parse(imageUrl);
            imageUrl = Array.isArray(imageArray) && imageArray.length > 0 ? imageArray[0] : imageUrl;
          } catch (e) {
            console.log('Failed to parse image_url as JSON, using as-is');
          }
        }
        
        return {
          ...item,
          image_url: imageUrl,
          user: profilesMap.get(item.user_id) as Profile,
          rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Random rating between 4.0 and 5.0
          reviews: Math.floor(Math.random() * 150) + 10, // Random number of reviews
        };
      }).filter(item => item.user); // Filter out items without valid user data
      
      // Filter featured businesses (unique user_ids with featured listings)
      const featuredUserIds = new Set();
      const featured = formattedProducts
        .filter(item => item.is_featured)
        .filter(item => {
          if (!featuredUserIds.has(item.user_id)) {
            featuredUserIds.add(item.user_id);
            return true;
          }
          return false;
        })
        .slice(0, 5); // Limit to 5 featured businesses
      
      setFeaturedBusinesses(featured);
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchProducts();
    fetchUserProfile();
  }, [fetchProducts, fetchUserProfile]);

  const handleCategoryPress = (categoryId: string) => {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    if (category) {
      router.push(`/services/category/${encodeURIComponent(category.name)}`);
    }
  };

  const handleAddListing = () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to add a listing');
      return;
    }
    router.push('/services/create');
  };

  // Animate shopping bag with bounce and swing effect
  useEffect(() => {
    // Create a looping animation
    const animateBag = () => {
      // Bounce animation
      Animated.sequence([
        Animated.timing(bagScale, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bagScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Swing animation
      Animated.sequence([
        Animated.timing(bagRotation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bagRotation, {
          toValue: -1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(bagRotation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // Animate on mount
    animateBag();

    // Repeat animation every 3 seconds
    const interval = setInterval(animateBag, 3000);

    return () => clearInterval(interval);
  }, [bagScale, bagRotation]);

  // Filter products based on selected category, search query, and filters
  const filteredProducts = products
    .filter(product => {
      const matchesType =
        typeFilter === 'all' ? true : (product as any).type === typeFilter;

      const matchesCategory = selectedCategory 
        ? (() => {
            const category = CATEGORIES.find(cat => cat.id === selectedCategory);
            return category && product.category_name === category.name;
          })()
        : true;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = query === '' 
        ? true
        : product.title.toLowerCase().includes(query) ||
          (product.description || '').toLowerCase().includes(query) ||
          (product.category_name || '').toLowerCase().includes(query);
      const numericMin = minPrice ? Number(minPrice.replace(/[^0-9.]/g, '')) : null;
      const numericMax = maxPrice ? Number(maxPrice.replace(/[^0-9.]/g, '')) : null;
      const priceValue = product.price ?? 0;
      const matchesMin = numericMin != null ? priceValue >= numericMin : true;
      const matchesMax = numericMax != null ? priceValue <= numericMax : true;

      const matchesCondition =
        conditionFilter === 'any'
          ? true
          : ((product as any).condition || 'not_applicable') === conditionFilter;

      return (
        matchesType &&
        matchesCategory &&
        matchesSearch &&
        matchesMin &&
        matchesMax &&
        matchesCondition
      );
    })
    .sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'price_low') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortOption === 'price_high') {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });

  if (!fontsLoaded) {
    return null;
  }

  const formatPrice = (price: number) => {
    if (!price || price <= 0) return 'Price on request';
    return `GHS ${price.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      {/* Filters modal */}
      <Modal
        visible={isFilterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.filterOverlay}>
          <TouchableOpacity
            style={styles.filterBackdrop}
            activeOpacity={1}
            onPress={() => setIsFilterVisible(false)}
          />
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity
                onPress={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  setConditionFilter('any');
                  setIsFilterVisible(false);
                }}
              >
                <Text style={styles.filterClearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price range (GHS)</Text>
              <View style={styles.priceRowFilter}>
                <View style={styles.priceFieldWrapper}>
                  <Text style={styles.priceFieldPrefix}>Min</Text>
                  <TextInput
                    style={styles.priceFieldInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
                <View style={styles.priceFieldWrapper}>
                  <Text style={styles.priceFieldPrefix}>Max</Text>
                  <TextInput
                    style={styles.priceFieldInput}
                    placeholder="Any"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Condition</Text>
              <View style={styles.typeToggleRow}>
                {[
                  { key: 'any', label: 'Any' },
                  { key: 'new', label: 'New' },
                  { key: 'used', label: 'Used' },
                ].map((opt) => {
                  const selected = conditionFilter === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.typeChip,
                        selected && styles.typeChipSelected,
                      ]}
                      onPress={() => setConditionFilter(opt.key as 'any' | 'new' | 'used')}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          selected && styles.typeChipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => setIsFilterVisible(false)}
            >
              <Text style={styles.applyFilterText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/hub')} style={styles.backButton}>
            <ArrowLeft size={24} color="#020617" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Akora Marketplace</Text>
            <Text style={styles.subtitle}>Buy & sell within the Akora community</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search in Products & Services"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                <SearchSlash size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterVisible(true)}>
            <Filter size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          <View style={styles.sortLeft}>
            <MapPin size={16} color="#64748B" />
            <Text style={styles.sortText}>Ghana • All locations</Text>
          </View>
          <View style={styles.sortRightRow}>
            <View style={styles.typeToggleRow}>
              {[
                { key: 'all', label: 'All' },
                { key: 'product', label: 'Products' },
                { key: 'service', label: 'Services' },
              ].map((opt) => {
                const selected = typeFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.typeChip,
                      selected && styles.typeChipSelected,
                    ]}
                    onPress={() => setTypeFilter(opt.key as 'all' | 'product' | 'service')}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        selected && styles.typeChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => {
                if (sortOption === 'newest') setSortOption('price_low');
                else if (sortOption === 'price_low') setSortOption('price_high');
                else setSortOption('newest');
              }}
            >
              <SortDesc size={18} color="#0F172A" />
              <Text style={styles.sortButtonText}>
                {sortOption === 'newest' && 'Newest'}
                {sortOption === 'price_low' && 'Price: Low to High'}
                {sortOption === 'price_high' && 'Price: High to Low'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          return (
            <TouchableOpacity 
              key={category.id} 
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.selectedCategoryButton
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <View style={[
                styles.categoryIcon,
                selectedCategory === category.id && styles.selectedCategoryIcon
              ]}>
                <IconComponent size={24} color={selectedCategory === category.id ? "#FFFFFF" : "#000000"} />
              </View>
              <Text style={[
                styles.categoryName,
                selectedCategory === category.id && styles.selectedCategoryName
              ]}>{category.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest listings</Text>
        </View>

        <View style={styles.productsGrid}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading products & services...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTextTitle}>No listings found</Text>
              <Text style={styles.emptyTextSubtitle}>
                {selectedCategory 
                  ? 'Try changing the category or filters.'
                  : 'Be the first to post something in the marketplace!'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => router.push(`/listing/${product.id}`)}
              >
                <Image 
                  source={{ uri: (product as any).image_urls?.[0] || product.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60' }} 
                  style={styles.productImage} 
                />
                <View style={styles.productContent}>
                  <Text style={styles.price}>{formatPrice(product.price || 0)}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{product.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {product.location_area || product.location_city || product.location_region || 'Location not set'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
      </ScrollView>
      
      {/* Add Listing Button - Fixed Position */}
      {user && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleAddListing}
        >
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.floatingButtonText}>Add Listing</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#020617',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  clearSearchButton: {
    paddingHorizontal: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#E5EDFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sortLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  sortButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1D4ED8',
  },
  typeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    padding: 2,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeChipSelected: {
    backgroundColor: '#FFFFFF',
  },
  typeChipText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  typeChipTextSelected: {
    color: '#111827',
  },
  categoriesScroll: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  categoryButton: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: '#4169E1',
  },
  selectedCategoryIcon: {
    backgroundColor: '#FFFFFF',
  },
  selectedCategoryName: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  categoryName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    textAlign: 'center',
    width: 80,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  reviews: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: '100%',
    height: 140,
  },
  productContent: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#16A34A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  loadingContainer: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTextTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyTextSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4169E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  listingsCounter: {
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    gap: 8,
  },
  listingsCounterText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  filterBackdrop: {
    flex: 1,
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  filterClearText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  priceRowFilter: {
    flexDirection: 'row',
    gap: 12,
  },
  priceFieldWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  priceFieldPrefix: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  priceFieldInput: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  applyFilterButton: {
    marginTop: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  applyFilterText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});