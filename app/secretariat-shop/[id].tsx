import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Linking } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShoppingCart, Heart, Star, Package, Truck, Shield, Plus, Minus, Phone, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, type SecretariatShopProduct, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

interface ShopProductWithUser extends SecretariatShopProduct {
  user?: Profile;
}

// Sample products - same as in secretariat shop
const SOUVENIR_PRODUCTS = [
  {
    id: '1',
    name: 'Alumni Branded Polo Shirt',
    description: 'High-quality cotton polo with embroidered school logo',
    fullDescription: 'Premium quality cotton polo shirt featuring the official school emblem. Available in multiple sizes and colors. Perfect for casual wear or alumni events. Made from 100% breathable cotton for maximum comfort.',
    priceUSD: 35.99,
    priceGHS: 395.63, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&auto=format&fit=crop&q=60',
    images: [
      'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=60',
    ],
    category: 'Clothing',
    rating: 4.8,
    reviews: 124,
    inStock: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy Blue', 'Black', 'White'],
  },
  {
    id: '2',
    name: 'Commemorative Mug',
    description: 'Ceramic mug featuring the school crest and motto',
    fullDescription: 'Beautiful ceramic mug with the school crest and motto printed in vibrant colors. Microwave and dishwasher safe. Perfect for your morning coffee or tea. Makes a great gift for fellow alumni.',
    priceUSD: 15.99,
    priceGHS: 175.73, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&auto=format&fit=crop&q=60',
    images: [
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&auto=format&fit=crop&q=60',
    ],
    category: 'Homeware',
    rating: 4.5,
    reviews: 89,
    inStock: true,
    sizes: ['One Size'],
    capacity: '350ml',
  },
  {
    id: '3',
    name: 'Leather Notebook',
    description: 'Premium leather-bound notebook with embossed logo',
    fullDescription: 'Elegant leather-bound notebook with embossed school logo. Features 200 pages of high-quality paper suitable for writing or sketching. Perfect for meetings, journaling, or note-taking.',
    priceUSD: 24.99,
    priceGHS: 274.63, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60',
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60',
    ],
    category: 'Stationery',
    rating: 4.9,
    reviews: 156,
    inStock: true,
    sizes: ['A5', 'A4'],
    pages: 200,
  },
  {
    id: '4',
    name: 'Anniversary Yearbook',
    description: 'Special edition commemorating school milestones',
    fullDescription: 'Limited edition anniversary yearbook featuring the history and milestones of our prestigious institution. Includes historical photos, notable alumni profiles, and memorable events. A collector\'s item.',
    priceUSD: 49.99,
    priceGHS: 549.39, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=60',
    images: [
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=60',
    ],
    category: 'Books',
    rating: 5.0,
    reviews: 203,
    inStock: true,
    sizes: ['Standard'],
    pages: 250,
  },
  {
    id: '5',
    name: 'School Crest Lapel Pin',
    description: 'Elegant metal pin featuring the school crest',
    fullDescription: 'Beautifully crafted metal lapel pin featuring the official school crest. Perfect for formal occasions, reunions, or everyday wear. Comes with secure fastening mechanism.',
    priceUSD: 12.99,
    priceGHS: 142.76, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1601591219083-d9d11b6a8852?w=800&auto=format&fit=crop&q=60',
    images: [
      'https://images.unsplash.com/photo-1601591219083-d9d11b6a8852?w=800&auto=format&fit=crop&q=60',
    ],
    category: 'Accessories',
    rating: 4.7,
    reviews: 67,
    inStock: true,
    sizes: ['One Size'],
    material: 'Metal alloy with gold plating',
  },
  {
    id: '6',
    name: 'Alumni Hoodie',
    description: 'Comfortable hoodie with school colors and logo',
    fullDescription: 'Cozy and stylish hoodie featuring school colors and embroidered logo. Made from soft cotton-polyester blend. Perfect for cooler weather and showing your school pride.',
    priceUSD: 45.99,
    priceGHS: 505.43, // Updated: 1 USD = 10.99 GHS (1 GHS = 0.091 USD)
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=60',
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop&q=60',
    ],
    category: 'Clothing',
    rating: 4.6,
    reviews: 142,
    inStock: true,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Navy Blue', 'Grey', 'Black'],
  },
];

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [product, setProduct] = useState<ShopProductWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [currency, setCurrency] = useState<'USD' | 'GHS'>('USD');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fetchProduct = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secretariat_shop_products')
        .select('*')
        .eq('id', id as string)
        .single();

      if (error) throw error;

      if (data) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', data.user_id)
          .single();

        setProduct({
          ...data,
          user: profile || undefined,
        } as ShopProductWithUser);
      }
    } catch (error: any) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const price = currency === 'USD' ? product.price_usd : product.price_ghs;
  const currencySymbol = currency === 'USD' ? '$' : '₵';

  const handleContactViaPhone = () => {
    if (product.contact_info) {
      const phoneNumber = product.contact_info.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const slideIndex = Math.round(
                event.nativeEvent.contentOffset.x / Dimensions.get('window').width
              );
              setSelectedImage(slideIndex);
            }}
            scrollEventThrottle={16}
            style={styles.mainImageScroll}
          >
            {(product.images || []).map((img: string, index: number) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={styles.mainImage}
              />
            ))}
          </ScrollView>
          
          {/* Pagination Dots */}
          {product.images.length > 1 && (
            <View style={styles.paginationDots}>
              {product.images.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    selectedImage === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
          
          {product.images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScroll}
            >
              {product.images.map((img: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(index)}
                  style={[
                    styles.thumbnail,
                    selectedImage === index && styles.thumbnailActive,
                  ]}
                >
                  <Image source={{ uri: img }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          {/* Rating - only show for products with ratings */}
          {product.rating > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color="#FFC107"
                    fill={star <= Math.floor(product.rating) ? '#FFC107' : 'none'}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {product.rating} ({product.reviews} reviews)
              </Text>
            </View>
          )}
          
          {/* User Posted Badge */}
          {product.isUserPosted && (
            <View style={styles.userPostedBadge}>
              <Text style={styles.userPostedText}>Posted by Community Member</Text>
            </View>
          )}

          {/* Currency Toggle */}
          <View style={styles.currencySection}>
            <Text style={styles.sectionLabel}>Currency</Text>
            <View style={styles.currencyToggle}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  currency === 'USD' && styles.currencyButtonActive,
                ]}
                onPress={() => setCurrency('USD')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    currency === 'USD' && styles.currencyButtonTextActive,
                  ]}
                >
                  USD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  currency === 'GHS' && styles.currencyButtonActive,
                ]}
                onPress={() => setCurrency('GHS')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    currency === 'GHS' && styles.currencyButtonTextActive,
                  ]}
                >
                  GHS (₵)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>
              {currencySymbol}{price.toFixed(2)}
            </Text>
          </View>

          {/* Stock Quantity */}
          <View style={styles.stockSection}>
            <Text style={styles.sectionLabel}>Stock Availability</Text>
            <View style={styles.stockRow}>
              <Package size={18} color="#10B981" />
              <Text style={styles.stockText}>
                {product.quantity} {product.quantity === 1 ? 'item' : 'items'} in stock
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <Package size={20} color="#4169E1" />
              <Text style={styles.featureText}>Free pickup at Secretariat</Text>
            </View>
            <View style={styles.featureItem}>
              <Truck size={20} color="#4169E1" />
              <Text style={styles.featureText}>Home delivery available</Text>
            </View>
            <View style={styles.featureItem}>
              <Shield size={20} color="#4169E1" />
              <Text style={styles.featureText}>100% Authentic</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar - Contact to Order */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.contactButtonFull}
          onPress={handleContactViaPhone}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.contactGradient}
          >
            <Phone size={20} color="#FFFFFF" />
            <Text style={styles.contactText}>Call to Order</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  mainImageScroll: {
    width: width,
    height: width,
  },
  mainImage: {
    width: width,
    height: width,
    resizeMode: 'cover',
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  thumbnailScroll: {
    padding: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#4169E1',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoSection: {
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  productName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  currencySection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  currencyToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#4169E1',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  currencyButtonTextActive: {
    color: '#FFFFFF',
  },
  priceSection: {
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
  optionSection: {
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  colorButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  colorButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  colorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  colorTextActive: {
    color: '#FFFFFF',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  stockSection: {
    marginBottom: 24,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  stockText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#15803D',
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  featuresSection: {
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  userPostedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  userPostedText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2E7D32',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  contactButton: {
    flex: 1,
  },
  contactButtonFull: {
    flex: 1,
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  contactText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginTop: 100,
  },
});
