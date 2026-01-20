import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Linking } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, ThumbsUp, MapPin, Clock, ShieldAlert, Share2, MessagesSquare, Phone, MessageSquareMore } from 'lucide-react-native';
import { supabase, type ProductService, type Profile, getDisplayName } from '@/lib/supabase';
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
  const [otherListings, setOtherListings] = useState<ProductServiceWithUser[]>([]);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

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

  const fetchProduct = useCallback(async () => {
    if (!id) return;

    try {
      // Try from sample products first
      const fromSample = SAMPLE_PRODUCTS.find((p) => String(p.id) === String(id));
      if (fromSample) {
        const sampleWithUser: ProductServiceWithUser = {
          ...(fromSample as any),
          user: {
            id: 'sample-user-id',
            username: 'akora_marketplace',
            full_name: 'Akora Marketplace',
            avatar_url:
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
            created_at: new Date().toISOString(),
          } as Profile,
        };
        setProduct(sampleWithUser);
        return;
      }

      // Otherwise fetch from DB
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id as string)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        console.log('Product not found in database');
        setProduct(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', data.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProduct({
        ...(data as any),
        user: (profile as Profile) || ({} as Profile),
      } as ProductServiceWithUser);

      // Fetch other listings from same seller
      const { data: others, error: othersError } = await supabase
        .from('products_services')
        .select('*')
        .eq('user_id', data.user_id)
        .neq('id', data.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!othersError && others && others.length > 0) {
        const othersWithUser: ProductServiceWithUser[] = others.map((item) => ({
          ...(item as any),
          user: (profile as Profile) || ({} as Profile),
        }));
        setOtherListings(othersWithUser);
      } else {
        setOtherListings([]);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const handleCallSeller = () => {
    const phone = (product as any)?.contact_phone || (product as any)?.phone;
    if (!phone) {
      Alert.alert('No phone number', 'This seller has not added a phone number yet.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not open the dialer on this device.');
    });
  };

  const handleWhatsAppSeller = () => {
    const raw = (product as any)?.contact_whatsapp || (product as any)?.phone;
    if (!raw) {
      Alert.alert('No WhatsApp', 'This seller has not added a WhatsApp number yet.');
      return;
    }
    const phone = raw.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp.');
    });
  };

  const handleMessageOnAkora = () => {
    Alert.alert('Coming soon', 'In-app messaging for marketplace listings will be available soon.');
  };

  const handleReportAd = () => {
    Alert.alert(
      'Report this ad',
      'If this ad looks suspicious, please report it to the Akora team.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            console.log('Ad reported', id);
            Alert.alert('Thank you', 'We have received your report.');
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchProduct();
    checkBookmarkStatus();
  }, [fetchProduct]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => debouncedRouter.back()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatPrice = (price: number) => {
    if (!price || price <= 0) return 'Price on request';
    return `GHS ${price.toLocaleString()}`;
  };

  const imageUrls = (product as any)?.image_urls || (product.image_url ? [product.image_url] : ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800']);

  const isOwner = user && product && user.id === product.user_id;
  const isAdmin = (user as any)?.is_admin;

  const handleDeleteListing = async () => {
    if (!product) return;

    Alert.alert(
      'Delete this ad?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products_services')
                .delete()
                .eq('id', product.id);

              if (error) throw error;
              Alert.alert('Deleted', 'The listing has been removed.');
              debouncedRouter.replace('/services');
            } catch (err) {
              console.error('Error deleting listing', err);
              Alert.alert('Error', 'Could not delete this listing.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#020617" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => Alert.alert('Share', 'Share feature coming soon!')} style={styles.headerButton}>
            <Share2 size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleBookmark} style={styles.headerButton}>
            <ThumbsUp 
              size={20} 
              color={isBookmarked ? '#14B8A6' : '#0F172A'}
              fill={isBookmarked ? '#14B8A6' : 'none'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image gallery (simple horizontal scroll) */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.galleryScroll}
        >
          {imageUrls.map((url, index) => (
            <Image
              key={`${url}-${index}`}
              source={{ uri: url }}
              style={styles.productImage}
            />
          ))}
        </ScrollView>

        {/* Main Card */}
        <View style={styles.contentCard}>
          <View style={styles.categoryRow}>
            {product.category_name && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1}>{product.category_name}</Text>
              </View>
            )}
          </View>

          <Text style={styles.productPrice}>{formatPrice(product.price || 0)}</Text>
          <Text style={styles.productTitle}>{product.title}</Text>

          <View style={styles.metaRowTop}>
            <View style={styles.metaItemRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText} numberOfLines={1}>
                {(product as any).location_area || (product as any).location_city || (product as any).location_region || 'Ghana'}
              </Text>
            </View>
            <View style={styles.metaItemRow}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                Posted recently
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description || 'No description provided.'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Seller */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.sellerCard}>
              <Image 
                source={{ uri: product.user?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }}
                style={styles.sellerAvatar}
              />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{product.user ? getDisplayName(product.user) : 'Akora seller'}</Text>
                <Text style={styles.sellerMeta}>Member of Akora community</Text>
              </View>
            </View>

            <View style={styles.contactButtonsRow}>
              <TouchableOpacity style={styles.primaryContactButton} onPress={handleCallSeller}>
                <Phone size={18} color="#FFFFFF" />
                <Text style={styles.primaryContactText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryContactButton} onPress={handleWhatsAppSeller}>
                <MessagesSquare size={18} color="#16A34A" />
                <Text style={styles.secondaryContactText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {(isOwner || isAdmin) && (
              <View style={styles.ownerActionsRow}>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.ownerActionButton}
                    onPress={() => debouncedRouter.push(`/services/edit/${product.id}`)}
                  >
                    <Text style={styles.ownerActionText}>Edit ad</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.ownerActionButton, styles.ownerActionDanger]}
                  onPress={handleDeleteListing}
                >
                  <Text style={[styles.ownerActionText, styles.ownerActionDangerText]}>
                    Delete ad
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Safety & Report */}
          <View style={styles.section}>
            <View style={styles.safetyHeaderRow}>
              <Text style={styles.sectionTitle}>Safety tips</Text>
              <TouchableOpacity onPress={handleReportAd} style={styles.reportButton}>
                <ShieldAlert size={16} color="#DC2626" />
                <Text style={styles.reportButtonText}>Report this ad</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.safetyList}>
              <Text style={styles.safetyItem}>• Meet in a public place.</Text>
              <Text style={styles.safetyItem}>• Inspect the item carefully before paying.</Text>
              <Text style={styles.safetyItem}>• Do not share sensitive personal information.</Text>
              <Text style={styles.safetyItem}>• Use trusted payment methods when possible.</Text>
            </View>
          </View>

          {otherListings.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>More from this seller</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.moreFromScroll}
                >
                  {otherListings.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.moreItemCard}
                      onPress={() => debouncedRouter.push(`/services/${item.id}`)}
                    >
                      <Image
                        source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800' }}
                        style={styles.moreItemImage}
                      />
                      <View style={styles.moreItemContent}>
                        <Text style={styles.moreItemPrice} numberOfLines={1}>
                          {formatPrice(item.price || 0)}
                        </Text>
                        <Text style={styles.moreItemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  galleryScroll: {
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#F3F4F6',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -18,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1D4ED8',
  },
  productPrice: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#16A34A',
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 10,
  },
  metaRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    color: '#0F172A',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 22,
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
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  sellerMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  contactButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  primaryContactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#16A34A',
  },
  primaryContactText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryContactText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  noContactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 8,
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEF2F2',
  },
  reportButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
  safetyList: {
    marginTop: 4,
    gap: 2,
  },
  safetyItem: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
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
  ownerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 12,
  },
  ownerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  ownerActionDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  ownerActionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  ownerActionDangerText: {
    color: '#DC2626',
  },
  moreFromScroll: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  moreItemCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  moreItemImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3F4F6',
  },
  moreItemContent: {
    padding: 8,
  },
  moreItemPrice: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#16A34A',
  },
  moreItemTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginTop: 2,
  },
});
