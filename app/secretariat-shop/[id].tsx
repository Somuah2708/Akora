import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShoppingCart, Heart, Star, Package, Truck, Shield, Plus, Minus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { addToCart, getCartCount, resetCartViewedStatus } from '@/lib/secretariatCart';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

// Sample products - same as in secretariat shop
const SOUVENIR_PRODUCTS = [
  {
    id: '1',
    name: 'Alumni Branded Polo Shirt',
    description: 'High-quality cotton polo with embroidered school logo',
    fullDescription: 'Premium quality cotton polo shirt featuring the official school emblem. Available in multiple sizes and colors. Perfect for casual wear or alumni events. Made from 100% breathable cotton for maximum comfort.',
    priceUSD: 35.99,
    priceGHS: 430.00,
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
    priceGHS: 190.00,
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
    priceGHS: 300.00,
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
    priceGHS: 600.00,
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
    priceGHS: 155.00,
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
    priceGHS: 550.00,
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
  const params = useLocalSearchParams();
  const productId = params.id as string;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [currency, setCurrency] = useState<'USD' | 'GHS'>('USD');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const product = SOUVENIR_PRODUCTS.find(p => p.id === productId);

  const loadCartCount = async () => {
    const count = await getCartCount();
    setCartCount(count);
  };

  useEffect(() => {
    loadCartCount();
    if (product?.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
    if (product?.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
  }, [product]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !product) {
    return null;
  }

  const price = currency === 'USD' ? product.priceUSD : product.priceGHS;
  const currencySymbol = currency === 'USD' ? '$' : '₵';

  const handleAddToCart = async () => {
    try {
      await addToCart({
        id: `cart_${Date.now()}`,
        productId: product.id,
        name: product.name,
        description: product.description,
        price: price,
        currency: currency,
        image: product.image,
        category: product.category,
      });

      // Reset cart viewed status when adding new item
      await resetCartViewedStatus();

      const count = await getCartCount();
      setCartCount(count);

      Alert.alert(
        'Added to Cart',
        `${quantity} x ${product.name} has been added to your cart.`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'View Cart', onPress: () => router.push('/cart') },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/cart')}
        >
          <ShoppingCart size={24} color="#000000" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: product.images[selectedImage] }}
            style={styles.mainImage}
          />
          {product.images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScroll}
            >
              {product.images.map((img, index) => (
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

          {/* Rating */}
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

          {/* Sizes */}
          {product.sizes && (
            <View style={styles.optionSection}>
              <Text style={styles.sectionLabel}>Size</Text>
              <View style={styles.optionsRow}>
                {product.sizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionButton,
                      selectedSize === size && styles.optionButtonActive,
                    ]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedSize === size && styles.optionTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Colors */}
          {product.colors && (
            <View style={styles.optionSection}>
              <Text style={styles.sectionLabel}>Color</Text>
              <View style={styles.optionsRow}>
                {product.colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      selectedColor === color && styles.colorButtonActive,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    <Text
                      style={[
                        styles.colorText,
                        selectedColor === color && styles.colorTextActive,
                      ]}
                    >
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{product.fullDescription}</Text>
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

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus size={20} color="#666666" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Plus size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4169E1', '#5B7FE8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addToCartGradient}
          >
            <ShoppingCart size={20} color="#FFFFFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
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
  },
  mainImage: {
    width: width,
    height: width,
    resizeMode: 'cover',
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
