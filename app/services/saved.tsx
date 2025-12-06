import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, X } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductServiceWithUser extends ProductService {
  user: Profile;
}

// Helper function to format relative time
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

export default function SavedListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedListings, setSavedListings] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const { isRefreshing, handleRefresh } = useRefresh({
    onRefresh: async () => {
      await fetchSavedListings();
    },
  });

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (user) {
      fetchSavedListings();
    }
  }, [user]);

  const fetchSavedListings = async () => {
    try {
      setLoading(true);

      // Fetch saved listing IDs
      const { data: savedData, error: savedError } = await supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;

      if (!savedData || savedData.length === 0) {
        setSavedListings([]);
        return;
      }

      const listingIds = savedData.map(item => item.listing_id);

      // Fetch the actual listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('products_services')
        .select('*')
        .in('id', listingIds);

      if (listingsError) throw listingsError;

      // Fetch user profiles
      const userIds = [...new Set(listingsData?.map(listing => listing.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      const formattedListings = listingsData?.map(item => ({
        ...item,
        user: profilesMap.get(item.user_id) as Profile,
      })).filter(item => item.user);

      setSavedListings(formattedListings || []);
    } catch (error) {
      console.error('Error fetching saved listings:', error);
      Alert.alert('Error', 'Failed to load saved listings');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', user?.id)
        .eq('listing_id', listingId);

      if (error) throw error;

      // Remove from local state
      setSavedListings(savedListings.filter(listing => listing.id !== listingId));
    } catch (error) {
      console.error('Error removing saved listing:', error);
      Alert.alert('Error', 'Failed to remove listing');
    }
  };

  const formatPrice = (price: number) => {
    return `GHS ${price?.toLocaleString() || 0}`;
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Saved Listings</Text>
          <Text style={styles.subtitle}>{savedListings.length} item{savedListings.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4169E1"
            colors={['#4169E1']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading saved listings...</Text>
          </View>
        ) : savedListings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No saved listings</Text>
            <Text style={styles.emptyText}>Save listings to view them later</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {savedListings.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <TouchableOpacity
                  style={styles.unsaveButton}
                  onPress={() => handleUnsave(product.id)}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => debouncedRouter.push(`/listing/${product.id}`)}
                  style={styles.cardContent}
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
              </View>
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
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
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
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
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
  cardContent: {
    flex: 1,
  },
  unsaveButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
