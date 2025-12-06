import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Heart, ShoppingBag, Star, Trash2, Share2, ExternalLink, Sparkles, ArrowLeft, Eye, Search } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: number;
  reviews?: number;
}

interface FavoriteItem {
  id: string;
  user_id: string;
  product_service_id: string;
  created_at: string;
  product: ProductServiceWithUser;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, fetch favorites with product details
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('service_bookmarks')
        .select('*, product:products_services(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      // Get unique user IDs from products
      const userIds = [...new Set(favoritesData.map((fav: any) => fav.product?.user_id).filter(Boolean))];
      
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create profile map
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Format favorites with user data
      const formattedFavorites = favoritesData
        .filter((fav: any) => fav.product) // Only include favorites with valid products
        .map((fav: any) => ({
          ...fav,
          product: {
            ...fav.product,
            user: profilesMap.get(fav.product.user_id) || {
              id: fav.product.user_id,
              username: 'Unknown User',
              full_name: 'Unknown User',
              avatar_url: null,
            },
          },
        }));

      setFavorites(formattedFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  }, [fetchFavorites]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFavorite = async (favoriteId: string, productTitle: string) => {
    try {
      const { error } = await supabase
        .from('service_bookmarks')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      alert(`${productTitle} removed from favorites`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove from favorites');
    }
  };

  const handleViewProduct = (productId: string) => {
    debouncedRouter.push(`/services/${productId}`);
  };

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter(favorite => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const product = favorite.product;
    return (
      product.title.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category_name?.toLowerCase().includes(query)
    );
  });

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4169E1', '#5B7FE8']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <Text style={styles.headerSubtitle}>Save your favorite items</Text>
        </LinearGradient>
        <View style={styles.centered}>
          <ThumbsUp size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>Sign in to view favorites</Text>
          <Text style={styles.emptyText}>Create an account to save your favorite marketplace items</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => debouncedRouter.push('/auth/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4169E1', '#5B7FE8']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <Text style={styles.headerSubtitle}>Your saved items</Text>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button and Title */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButtonTop}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search favorites..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          {filteredFavorites.length} {filteredFavorites.length === 1 ? 'item' : 'items'} 
          {searchQuery ? ' found' : ' saved'}
        </Text>
        {favorites.length > 0 && (
          <View style={styles.favoritesBadgeSmall}>
            <ThumbsUp size={16} color="#14B8A6" fill="#14B8A6" />
            <Text style={styles.favoritesCountText}>{favorites.length}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <ThumbsUp size={80} color="#E5E7EB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>
              Browse the marketplace and tap the heart icon to save items you love
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => debouncedRouter.push('/services')}
            >
              <ShoppingBag size={20} color="#FFFFFF" />
              <Text style={styles.browseButtonText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : filteredFavorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={80} color="#E5E7EB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredFavorites.map((favorite) => {
              const product = favorite.product;
              return (
                <TouchableOpacity
                  key={favorite.id}
                  style={styles.card}
                  onPress={() => handleViewProduct(product.id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8F9FC']}
                    style={styles.cardGradient}
                  >
                    {/* Product Image */}
                    <View style={styles.imageContainer}>
                      {product.image_url ? (
                        <Image
                          source={{ uri: product.image_url }}
                          style={styles.productImage}
                        />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <ShoppingBag size={40} color="#CBD5E1" />
                        </View>
                      )}
                      
                      {/* Remove from favorites button */}
                      <TouchableOpacity
                        style={styles.removeFavoriteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(favorite.id, product.title);
                        }}
                      >
                        <ThumbsUp size={20} color="#14B8A6" fill="#14B8A6" />
                      </TouchableOpacity>

                      {/* Verified badge if applicable */}
                      {product.user?.full_name && (
                        <View style={styles.verifiedBadge}>
                          <Sparkles size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.cardContent}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{product.category_name || 'Service'}</Text>
                      </View>

                      <Text style={styles.productTitle} numberOfLines={2}>
                        {product.title}
                      </Text>

                      <Text style={styles.productDescription} numberOfLines={2}>
                        {product.description}
                      </Text>

                      {/* Seller Info */}
                      <View style={styles.sellerRow}>
                        <View style={styles.sellerAvatar}>
                          <Text style={styles.sellerInitial}>
                            {(product.user?.full_name || product.user?.username || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.sellerName} numberOfLines={1}>
                          {product.user?.full_name || product.user?.username || 'Unknown'}
                        </Text>
                      </View>

                      {/* Price and Rating */}
                      <View style={styles.bottomRow}>
                        <View style={styles.priceContainer}>
                          <Text style={styles.price}>₵{product.price}</Text>
                          <Text style={styles.priceUnit}>/hr</Text>
                        </View>
                        <View style={styles.ratingContainer}>
                          <Star size={14} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.ratingText}>
                            {product.rating || '4.8'}
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => handleViewProduct(product.id)}
                        >
                          <Eye size={18} color="#FFFFFF" />
                          <Text style={styles.viewButtonText}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  clearText: {
    fontSize: 20,
    color: '#666666',
    paddingHorizontal: 8,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  favoritesBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF1FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  favoritesCountText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  favoritesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  favoritesBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 24,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
    backgroundColor: '#4169E1',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  browseButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  clearSearchButton: {
    marginTop: 32,
    backgroundColor: '#4169E1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  clearSearchButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  signInButton: {
    marginTop: 32,
    backgroundColor: '#4169E1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFavoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#4169E1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  productDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sellerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitial: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#4169E1',
  },
  sellerName: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#4B5563',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#10B981',
  },
  priceUnit: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#92400E',
  },
  actionButtons: {
    gap: 8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  viewButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 24,
  },
});
