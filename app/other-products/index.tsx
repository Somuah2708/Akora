import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Star, Heart, Package } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { SAMPLE_PRODUCTS } from '@/lib/marketplace';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: string;
  reviews?: number;
}

export default function OtherProductsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [products, setProducts] = useState<ProductServiceWithUser[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('service_bookmarks')
        .select('service_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const bookmarkedSet = new Set(data?.map(b => b.service_id) || []);
      setBookmarkedItems(bookmarkedSet);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  }, [user]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      // Create sample user profile
      const sampleUser: Profile = {
        id: 'sample-user',
        username: 'akora_demo',
        full_name: 'Akora Demo',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        created_at: new Date().toISOString(),
      };

      const sampleProductsWithUser = SAMPLE_PRODUCTS.map(product => ({
        ...product,
        user_id: sampleUser.id,
        user: sampleUser,
      })) as unknown as ProductServiceWithUser[];

      try {
        // Fetch from database
        const { data: dbProducts, error } = await supabase
          .from('products_services')
          .select(`
            *,
            user:profiles(*)
          `);

        if (error) throw error;

        const formattedProducts = (dbProducts || []).map(product => ({
          ...product,
          user: product.user as unknown as Profile,
          rating: product.rating?.toString() || '4.5',
          reviews: product.reviews || 0,
        })) as ProductServiceWithUser[];

        const allProducts = [...formattedProducts, ...sampleProductsWithUser];

        // Get featured businesses
        const featuredUserIds = new Set();
        const featured = allProducts
          .filter(item => item.is_featured)
          .filter(item => {
            if (!featuredUserIds.has(item.user_id)) {
              featuredUserIds.add(item.user_id);
              return true;
            }
            return false;
          })
          .slice(0, 5);

        setFeaturedBusinesses(featured.length > 0 ? featured : sampleProductsWithUser.slice(0, 5));
        setProducts(allProducts);
      } catch (dbError) {
        console.log('Database fetch failed, using sample products only:', dbError);
        setFeaturedBusinesses(sampleProductsWithUser.slice(0, 5));
        setProducts(sampleProductsWithUser);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleBookmark = async (productId: string) => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to bookmark items');
      return;
    }

    try {
      const isBookmarked = bookmarkedItems.has(productId);

      // Optimistic update - update UI immediately
      if (isBookmarked) {
        setBookmarkedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        setBookmarkedItems(prev => new Set([...prev, productId]));
      }

      // Then update the database
      if (isBookmarked) {
        const { error } = await supabase
          .from('service_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('product_service_id', productId);

        if (error) {
          // Revert on error
          setBookmarkedItems(prev => new Set([...prev, productId]));
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('service_bookmarks')
          .insert({
            user_id: user.id,
            product_service_id: productId,
          });

        if (error) {
          // Revert on error
          setBookmarkedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
          throw error;
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  // Calculate other products (not featured, not in first 6 popular)
  const getOtherProducts = () => {
    const featuredIds = new Set(featuredBusinesses.map(b => b.id));
    const popularIds = new Set(products.slice(0, 6).map(p => p.id));
    
    return products.filter(
      product => !featuredIds.has(product.id) && !popularIds.has(product.id)
    );
  };

  const otherProducts = getOtherProducts();

  useEffect(() => {
    fetchProducts();
    fetchBookmarks();
  }, [fetchProducts, fetchBookmarks]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const formatPrice = (price: number) => {
    return `₵${price}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => debouncedRouter.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Package size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Other Products & Services</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.headerSubtitle}>
          {otherProducts.length} {otherProducts.length === 1 ? 'item' : 'items'} available
        </Text>
      </LinearGradient>

      {/* Products Grid */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Loading other products...</Text>
          </View>
        ) : otherProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No other products</Text>
            <Text style={styles.emptyText}>
              All available products are featured or popular
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {otherProducts.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => debouncedRouter.push(`/services/${product.id}`)}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ 
                    uri: product.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60' 
                  }} 
                  style={styles.productImage} 
                />
                <TouchableOpacity
                  style={styles.favoriteIcon}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleBookmark(product.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Heart 
                    size={20} 
                    color={bookmarkedItems.has(product.id) ? '#EF4444' : '#FFFFFF'} 
                    fill={bookmarkedItems.has(product.id) ? '#EF4444' : 'none'}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
                <View style={styles.productContent}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.title}
                  </Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.productFooter}>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.rating}>{product.rating}</Text>
                      <Text style={styles.reviews}>({product.reviews})</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        debouncedRouter.push(`/services/${product.id}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  reviews: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  price: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
  viewButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
