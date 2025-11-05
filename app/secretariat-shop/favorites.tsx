import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Heart, ShoppingCart, Plus } from 'lucide-react-native';
import { getFavorites, toggleFavorite, addToCart, resetCartViewedStatus, getCartCount, markCartAsViewed } from '@/lib/secretariatCart';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

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

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currency, setCurrency] = useState<'USD' | 'GHS'>('USD');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const loadFavorites = async () => {
    const favoriteIds = await getFavorites();
    setFavorites(favoriteIds);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
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

  const favoriteProducts = SOUVENIR_PRODUCTS.filter(product => 
    favorites.includes(product.id)
  );

  const handleToggleFavorite = async (productId: string) => {
    await toggleFavorite(productId);
    await loadFavorites();
  };

  const handleAddToCart = async (product: typeof SOUVENIR_PRODUCTS[0]) => {
    try {
      const price = currency === 'USD' ? product.priceUSD : product.priceGHS;
      
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
      
      await resetCartViewedStatus();
      
      Alert.alert(
        'Added to Cart',
        `${product.name} has been added to your cart.`,
        [
          { text: 'Continue', style: 'cancel' },
          { 
            text: 'View Cart', 
            onPress: async () => {
              await markCartAsViewed();
              router.push('/cart');
            }
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  return (
    <View style={styles.container}>
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
            <Text style={styles.title}>My Favorites</Text>
            <Text style={styles.subtitle}>{favorites.length} {favorites.length === 1 ? 'item' : 'items'}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Currency Toggle */}
      <View style={styles.currencyToggle}>
        <TouchableOpacity
          style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonActive]}
          onPress={() => setCurrency('USD')}
        >
          <Text style={[styles.currencyButtonText, currency === 'USD' && styles.currencyButtonTextActive]}>
            USD ($)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.currencyButton, currency === 'GHS' && styles.currencyButtonActive]}
          onPress={() => setCurrency('GHS')}
        >
          <Text style={[styles.currencyButtonText, currency === 'GHS' && styles.currencyButtonTextActive]}>
            GHS (₵)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {favoriteProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyDescription}>
              Start adding items to your favorites by tapping the heart icon on products
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/secretariat-shop')}
            >
              <LinearGradient
                colors={['#4169E1', '#5B7FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shopButtonGradient}
              >
                <ShoppingCart size={20} color="#FFFFFF" />
                <Text style={styles.shopButtonText}>Browse Shop</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          favoriteProducts.map((product) => (
            <View key={product.id} style={styles.favoriteCard}>
              <TouchableOpacity 
                onPress={() => router.push(`/secretariat-shop/${product.id}` as any)}
                style={styles.cardContent}
              >
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.productFooter}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.currencySymbol}>
                        {currency === 'USD' ? '$' : '₵'}
                      </Text>
                      <Text style={styles.priceText}>
                        {(currency === 'USD' ? product.priceUSD : product.priceGHS).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.categoryBadge}>{product.category}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => handleToggleFavorite(product.id)}
                >
                  <Heart size={20} color="#FF3B30" fill="#FF3B30" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={() => handleAddToCart(product)}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  currencyToggle: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  currencyButtonActive: {
    borderColor: '#4169E1',
    backgroundColor: '#E6F0FF',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  currencyButtonTextActive: {
    color: '#4169E1',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    marginBottom: 32,
  },
  shopButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
    lineHeight: 18,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginRight: 2,
  },
  priceText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
  categoryBadge: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 12,
    gap: 12,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  addToCartText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
