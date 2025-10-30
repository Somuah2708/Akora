import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Animated } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Filter, ShoppingBag, Star, MessageCircle, Share2, ArrowLeft, ChevronRight, Briefcase, GraduationCap, Wrench, Palette, Coffee, Stethoscope, Book, Camera, Plus, CircleAlert as AlertCircle } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from 'react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CATEGORIES = [
  { id: '1', name: 'Business Services', icon: Briefcase },
  { id: '2', name: 'Education & Tutoring', icon: GraduationCap },
  { id: '3', name: 'Technical Services', icon: Wrench },
  { id: '4', name: 'Creative & Design', icon: Palette },
  { id: '5', name: 'Food & Catering', icon: Coffee },
  { id: '6', name: 'Healthcare', icon: Stethoscope },
  { id: '7', name: 'Publishing', icon: Book },
  { id: '8', name: 'Photography', icon: Camera },
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
  const [products, setProducts] = useState<ProductServiceWithUser[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
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
      
      // Step 1: Fetch all products (exclude job listings - only show items where listing_type is null)
      const { data: productsData, error: productsError } = await supabase
        .from('products_services')
        .select('*')
        .is('listing_type', null) // Only products/services (not jobs)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      if (!productsData) {
        setProducts([]);
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
      
      // Step 4: Combine products with their user profiles
      const formattedProducts = productsData.map(item => ({
        ...item,
        user: profilesMap.get(item.user_id) as Profile,
        rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Random rating between 4.0 and 5.0
        reviews: Math.floor(Math.random() * 150) + 10, // Random number of reviews
      })).filter(item => item.user); // Filter out items without valid user data
      
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
    
    router.push('/create-listing');
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

  // Filter products based on selected category
  const filteredProducts = selectedCategory 
    ? products.filter(product => {
        const category = CATEGORIES.find(cat => cat.id === selectedCategory);
        return category && product.category_name === category.name;
      })
    : products;

  if (!fontsLoaded) {
    return null;
  }

  const formatPrice = (price: number) => {
    return `$${price}${price % 1 === 0 ? '' : '/hr'}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Akora Marketplace</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
        >
          <Animated.View
            style={{
              transform: [
                { scale: bagScale },
                {
                  rotate: bagRotation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  }),
                },
              ],
            }}
          >
            <ShoppingBag size={24} color="#000000" />
          </Animated.View>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>2</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products and services..."
            placeholderTextColor="#666666"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#666666" />
        </TouchableOpacity>
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
          <Text style={styles.sectionTitle}>Featured Businesses</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading featured businesses...</Text>
            </View>
          ) : featuredBusinesses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No featured businesses yet</Text>
            </View>
          ) : (
            featuredBusinesses.map((business) => (
              <TouchableOpacity key={business.id} style={styles.featuredCard}>
                <Image source={{ uri: business.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60' }} style={styles.featuredImage} />
                <View style={styles.featuredBadge}>
                  <Star size={12} color="#FFB800" fill="#FFB800" />
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
                <View style={styles.featuredInfo}>
                  <Image 
                    source={{ 
                      uri: business.user?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60'
                    }} 
                    style={styles.businessAvatar} 
                  />
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{business.title}</Text>
                    <Text style={styles.businessOwner}>by {business.user?.full_name || business.user?.username}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.rating}>{business.rating}</Text>
                      <Text style={styles.reviews}>({business.reviews})</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Products & Services</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.productsGrid}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading products & services...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedCategory 
                  ? 'No products or services in this category yet' 
                  : 'No products or services available yet'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <Image 
                  source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60' }} 
                  style={styles.productImage} 
                />
                <View style={styles.productContent}>
                  <Text style={styles.productName} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.businessName} numberOfLines={1}>
                    {product.user?.full_name || product.user?.username}
                  </Text>
                  <Text style={styles.price}>{formatPrice(product.price || 0)}</Text>
                  <View style={styles.productFooter}>
                    <View style={styles.ratingContainer}>
                      <Star size={12} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.rating}>{product.rating}</Text>
                      <Text style={styles.reviews}>({product.reviews})</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton}>
                      <Text style={styles.addButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
      
      {/* Add Listing Button */}
      {user && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleAddListing}
        >
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.floatingButtonText}>Add Listing</Text>
        </TouchableOpacity>
      )}
      
    </ScrollView>
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
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
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
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
  featuredContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: width - 80,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  featuredInfo: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  businessAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  businessOwner: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
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
    gap: 16,
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
  },
  productImage: {
    width: '100%',
    height: 150,
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
  price: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
});