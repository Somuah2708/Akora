import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Star, X } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: number;
  reviews?: number;
}

export default function CategoryScreen() {
  const router = useRouter();
  const { categoryName } = useLocalSearchParams<{ categoryName: string }>();
  const [products, setProducts] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchProducts = useCallback(async () => {
    if (!categoryName) return;
    
    // Prevent showing job/internship categories in marketplace
    const jobCategories = ['Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering'];
    const decodedCategory = decodeURIComponent(categoryName);
    
    if (jobCategories.includes(decodedCategory)) {
      setProducts([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Step 1: Fetch products by category
      const { data: productsData, error: productsError } = await supabase
        .from('products_services')
        .select('*')
        .eq('category_name', decodedCategory)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      if (!productsData || productsData.length === 0) {
        setProducts([]);
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
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching products by category:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (!fontsLoaded) {
    return null;
  }

  const formatPrice = (price: number) => {
    return `GHS ${price?.toLocaleString() || 0}`;
  };

  // Helper function to format relative time (same as home screen)
  const getRelativeTime = (dateString: string): string => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>{decodeURIComponent(categoryName || '')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found in this category</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => debouncedRouter.push(`/listing/${product.id}`)}
              >
                <Image 
                  source={{ uri: (product as any).image_urls?.[0] || product.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60' }} 
                  style={styles.productImage} 
                />
                {(product as any).condition && (product as any).condition !== 'not_applicable' && (
                  <View style={[
                    styles.conditionBadge, 
                    (product as any).condition === 'new' ? styles.conditionBadgeNew : styles.conditionBadgeUsed
                  ]}>
                    <Text style={styles.conditionBadgeText}>
                      {(product as any).condition === 'new' ? 'NEW' : 'USED'}
                    </Text>
                  </View>
                )}
                <View style={styles.productContent}>
                  <Text style={styles.price}>{formatPrice(product.price || 0)}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{product.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {(product as any).location_area || (product as any).location_city || (product as any).location_region || 'Location not set'}
                    </Text>
                  </View>
                  <Text style={styles.timeStamp}>
                    {getRelativeTime(product.created_at)}
                  </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 140,
  },
  conditionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  conditionBadgeNew: {
    backgroundColor: '#10B981',
  },
  conditionBadgeUsed: {
    backgroundColor: '#F59E0B',
  },
  conditionBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  timeStamp: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
});