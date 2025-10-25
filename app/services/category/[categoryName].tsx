import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star } from 'lucide-react-native';
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
    
    try {
      setLoading(true);
      
      // Step 1: Fetch products by category
      const { data: productsData, error: productsError } = await supabase
        .from('products_services')
        .select('*')
        .eq('category_name', decodeURIComponent(categoryName))
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
    return `$${price}${price % 1 === 0 ? '' : '/hr'}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>{decodeURIComponent(categoryName || '')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found in this category</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => (
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
                  <Text style={styles.price}>{formatPrice(product.price)}</Text>
                  <View style={styles.productFooter}>
                    <View style={styles.ratingContainer}>
                      <Star size={12} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.rating}>{product.rating}</Text>
                      <Text style={styles.reviews}>({product.reviews})</Text>
                    </View>
                    <TouchableOpacity style={styles.viewButton}>
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
  businessName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  reviews: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  viewButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});