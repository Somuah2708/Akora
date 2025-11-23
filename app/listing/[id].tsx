import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, MessageCircle, Share2, Edit, Trash2, Save, X, MapPin, Mail, Phone } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

interface ProductServiceWithUser extends ProductService {
  user: Profile;
}

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<ProductServiceWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      
      const { data: listingData, error: listingError } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (listingError) throw listingError;

      if (listingData) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', listingData.user_id)
          .single();

        if (userError) throw userError;

        setListing({ ...listingData, user: userData });
        setEditedTitle(listingData.title);
        setEditedDescription(listingData.description);
        setEditedPrice(listingData.price?.toString() || '0');
        setSelectedImageIndex(0); // Reset to first image when listing loads
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      Alert.alert('Error', 'Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(listing?.title || '');
    setEditedDescription(listing?.description || '');
    setEditedPrice(listing?.price?.toString() || '0');
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim() || !editedDescription.trim() || !editedPrice.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('products_services')
        .update({
          title: editedTitle.trim(),
          description: editedDescription.trim(),
          price: Number(editedPrice),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Listing updated successfully');
      setIsEditing(false);
      await fetchListing();
    } catch (error) {
      console.error('Error updating listing:', error);
      Alert.alert('Error', 'Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
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
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Listing deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  const handleContact = () => {
    Alert.alert('Contact Seller', 'This feature will allow you to message the seller.');
  };

  const handleShare = () => {
    Alert.alert('Share Listing', 'This feature will allow you to share this listing.');
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backToMarketButton}>
          <Text style={styles.backToMarketText}>Back to Marketplace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.id === listing.user_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Listing Details</Text>
        {isOwner && !isEditing && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
              <Edit size={20} color="#4169E1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Trash2 size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
        )}
        {isEditing && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCancelEdit} style={styles.headerButton}>
              <X size={20} color="#666666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveEdit} style={styles.headerButton} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#4169E1" />
              ) : (
                <Save size={20} color="#4169E1" />
              )}
            </TouchableOpacity>
          </View>
        )}
        {!isOwner && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {(() => {
          // Get images from image_urls array (new format) or image_url (legacy)
          let images: string[] = [];
          
          // Try image_urls array first (new format)
          if (listing.image_urls && Array.isArray(listing.image_urls) && listing.image_urls.length > 0) {
            images = listing.image_urls;
          } 
          // Fallback to image_url (legacy format)
          else if (listing.image_url) {
            if (listing.image_url.startsWith('[')) {
              try {
                images = JSON.parse(listing.image_url);
              } catch (e) {
                images = [listing.image_url];
              }
            } else {
              images = [listing.image_url];
            }
          }
          
          // Fallback image if none provided
          if (images.length === 0) {
            images = ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'];
          }

          return (
            <>
              {/* Main Image Display with Swipeable Gallery */}
              <View style={styles.mainImageContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const offsetX = event.nativeEvent.contentOffset.x;
                    const imageWidth = event.nativeEvent.layoutMeasurement.width;
                    const index = Math.round(offsetX / imageWidth);
                    setSelectedImageIndex(index);
                  }}
                  scrollEventThrottle={16}
                  style={styles.imageScrollView}
                >
                  {images.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      style={styles.mainImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                
                {/* Image Counter Badge (always show) */}
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {selectedImageIndex + 1} / {images.length}
                  </Text>
                </View>
              </View>
              
              {/* Image Gallery Thumbnails */}
              {images.length > 1 && (
                <View style={styles.imageGalleryContainer}>
                  <Text style={styles.galleryTitle}>All Images ({images.length})</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageGallery}
                    contentContainerStyle={styles.imageGalleryContent}
                  >
                    {images.map((imageUri, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedImageIndex(index)}
                        style={[
                          styles.galleryImageContainer,
                          selectedImageIndex === index && styles.selectedGalleryImage
                        ]}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.galleryImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          );
        })()}

        <View style={styles.detailsContainer}>
          {isEditing ? (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Enter title"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Enter description"
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Price ($)</Text>
                <TextInput
                  style={styles.input}
                  value={editedPrice}
                  onChangeText={setEditedPrice}
                  placeholder="Enter price"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              
              <View style={styles.sellerInfo}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerInitial}>
                    {listing.user?.full_name?.[0] || 'A'}
                  </Text>
                </View>
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerName}>{listing.user?.full_name || 'Unknown'}</Text>
                  <Text style={styles.sellerRole}>Verified Seller</Text>
                </View>
                {!isOwner && (
                  <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                    <MessageCircle size={20} color="#4169E1" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Price</Text>
                {listing.pricing_type === 'contact' ? (
                  <View>
                    <Text style={styles.callForPriceText}>Call for Price</Text>
                    <Text style={styles.callForPriceSubtext}>Contact seller for pricing</Text>
                  </View>
                ) : listing.pricing_type === 'negotiable' ? (
                  <View>
                    <Text style={styles.priceValue}>GHS {listing.price?.toLocaleString()}</Text>
                    <Text style={styles.negotiableLabel}>Price Negotiable</Text>
                  </View>
                ) : (
                  <Text style={styles.priceValue}>GHS {listing.price?.toLocaleString()}</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{listing.description}</Text>
              </View>

              {listing.location && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.locationContainer}>
                    <MapPin size={16} color="#4169E1" />
                    <Text style={styles.locationText}>{listing.location}</Text>
                  </View>
                </View>
              )}

              {(listing.contact_email || listing.contact_phone) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  {listing.contact_email && (
                    <TouchableOpacity style={styles.contactInfoItem}>
                      <Mail size={16} color="#4169E1" />
                      <Text style={styles.contactInfoText}>{listing.contact_email}</Text>
                    </TouchableOpacity>
                  )}
                  {listing.contact_phone && (
                    <TouchableOpacity style={[styles.contactInfoItem, listing.contact_email && { marginTop: 8 }]}>
                      <Phone size={16} color="#4169E1" />
                      <Text style={styles.contactInfoText}>{listing.contact_phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{listing.category_name}</Text>
                </View>
              </View>

              {!isOwner && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleContact}>
                    <MessageCircle size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Contact Seller</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
                    <Share2 size={20} color="#4169E1" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  mainImageContainer: {
    width: '100%',
    height: 350,
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  imageScrollView: {
    flex: 1,
  },
  mainImage: {
    width: Dimensions.get('window').width,
    height: 350,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  imageGalleryContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  galleryTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imageGallery: {
    marginVertical: 0,
  },
  imageGalleryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  galleryImageContainer: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    marginRight: 8,
  },
  selectedGalleryImage: {
    borderColor: '#4169E1',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  galleryImage: {
    width: 80,
    height: 80,
  },
  detailsContainer: {
    padding: 16,
  },
  listingTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerInitial: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  sellerRole: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  callForPriceText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#FF9500',
  },
  callForPriceSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 4,
  },
  negotiableLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#34C759',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    lineHeight: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333333',
    flex: 1,
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  contactInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4169E1',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
  },
  backToMarketButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToMarketText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
