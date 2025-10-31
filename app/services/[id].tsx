import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, Star, Heart, ShoppingCart, MapPin, Clock, Award, Share2, MessageCircle, Phone, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { SAMPLE_PRODUCTS } from '@/lib/marketplace';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: string;
  reviews?: number;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<ProductServiceWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    fetchProductDetails();
    checkBookmarkStatus();
  }, [id]);

  // Re-check bookmark status when user changes or component refocuses
  useEffect(() => {
    checkBookmarkStatus();
  }, [user, id]);

  // Re-check bookmark status when page comes into focus (navigating back)
  useFocusEffect(
    useCallback(() => {
      checkBookmarkStatus();
    }, [user, id])
  );

  const fetchProductDetails = async () => {
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

      // Try to find in sample products first
      const sampleProduct = SAMPLE_PRODUCTS.find(p => p.id === id);
      
      if (sampleProduct) {
        setProduct({
          ...sampleProduct,
          user_id: sampleUser.id,
          user: sampleUser,
          image_url: sampleProduct.image_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_featured: false,
          is_premium_listing: false,
          is_approved: true,
        } as ProductServiceWithUser);
        setLoading(false);
        return;
      }

      // If not in samples, try database
      try {
        const { data: dbProduct, error } = await supabase
          .from('products_services')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (dbProduct) {
          // Try to fetch user profile
          let userProfile: Profile | undefined = undefined;
          if (dbProduct.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', dbProduct.user_id)
              .single();
            if (profileData) userProfile = profileData as Profile;
          }
          setProduct({
            ...dbProduct,
            user: userProfile,
            rating: dbProduct.rating?.toString() || '4.5',
            reviews: dbProduct.reviews || 0,
          } as ProductServiceWithUser);
        }
      } catch (dbError) {
        console.log('Product not found in database');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('service_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_service_id', id as string)
        .single();

      if (data) {
        setIsBookmarked(true);
      }
    } catch (error) {
      // Not bookmarked
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to bookmark items');
      return;
    }

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('service_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('product_service_id', id as string);

        if (error) throw error;
        setIsBookmarked(false);
      } else {
        const { error } = await supabase
          .from('service_bookmarks')
          .insert({
            user_id: user.id,
            product_service_id: id as string,
          });

        if (error) throw error;
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  const handleAddToCart = () => {
    Alert.alert('Added to Cart', `${product?.title} has been added to your cart`);
  };

  const handleContactSeller = () => {
    Alert.alert('Contact Seller', 'Message feature coming soon!');
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatPrice = (price: number) => {
    return `₵${price}`;
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => Alert.alert('Share', 'Share feature coming soon!')} style={styles.headerButton}>
            <Share2 size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleBookmark} style={styles.headerButton}>
            <Heart 
              size={22} 
              color={isBookmarked ? '#EF4444' : '#000000'}
              fill={isBookmarked ? '#EF4444' : 'none'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Product Image */}
        <Image 
          source={{ uri: product.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800' }} 
          style={styles.productImage}
        />

        {/* Product Info Card */}
        <View style={styles.contentCard}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category_name}</Text>
          </View>

          {/* Title and Price */}
          <Text style={styles.productTitle}>{product.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{formatPrice(product.price || 0)}</Text>
            <Text style={styles.priceUnit}>/hour</Text>
          </View>

          {/* Rating and Reviews */}
          <View style={styles.ratingSection}>
            <View style={styles.ratingContainer}>
              <Star size={18} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>{product.rating || '4.5'}</Text>
              <Text style={styles.reviewsText}>({product.reviews || 0} reviews)</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Award size={16} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Seller</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seller Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <View style={styles.sellerCard}>
              <Image 
                source={{ uri: product.user?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }}
                style={styles.sellerAvatar}
              />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{product.user?.full_name || 'Anonymous'}</Text>
                <Text style={styles.sellerUsername}>@{product.user?.username || 'user'}</Text>
                <View style={styles.sellerStats}>
                  <View style={styles.statItem}>
                    <Star size={14} color="#FFB800" fill="#FFB800" />
                    <Text style={styles.statText}>4.9</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Award size={14} color="#4169E1" />
                    <Text style={styles.statText}>98% positive</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Buttons */}
            <View style={styles.contactButtons}>
              <TouchableOpacity style={styles.contactButton} onPress={handleContactSeller}>
                <MessageCircle size={18} color="#4169E1" />
                <Text style={styles.contactButtonText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactButton} onPress={() => Alert.alert('Call', 'Phone feature coming soon!')}>
                <Phone size={18} color="#4169E1" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {product.user?.email && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Mail size={16} color="#4169E1" />
                  <Text style={styles.detailLabel}>Email</Text>
                </View>
                <Text style={styles.detailValue}>{product.user.email}</Text>
              </View>
            )}
            {product.user?.phone && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Phone size={16} color="#10B981" />
                  <Text style={styles.detailLabel}>Phone</Text>
                </View>
                <Text style={styles.detailValue}>{product.user.phone}</Text>
              </View>
            )}
            {!product.user?.email && !product.user?.phone && (
              <Text style={styles.noContactText}>No contact information available</Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Additional Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <MapPin size={16} color="#666666" />
                <Text style={styles.detailLabel}>Location</Text>
              </View>
              <Text style={styles.detailValue}>Accra, Ghana</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Clock size={16} color="#666666" />
                <Text style={styles.detailLabel}>Response Time</Text>
              </View>
              <Text style={styles.detailValue}>Within 1 hour</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Award size={16} color="#666666" />
                <Text style={styles.detailLabel}>Experience</Text>
              </View>
              <Text style={styles.detailValue}>5+ years</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {/* Removed Add to Cart button from details page */}
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
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  productImage: {
    width: width,
    height: width * 0.8,
    backgroundColor: '#F5F5F5',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF1FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  productTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
    lineHeight: 32,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  productPrice: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginLeft: 8,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  reviewsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  sellerCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sellerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  sellerUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#D1D5DB',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4169E1',
    backgroundColor: '#FFFFFF',
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  noContactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  priceInfo: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  bottomPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
  addToCartButton: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addToCartText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 24,
  },
  backHomeButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backHomeText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
