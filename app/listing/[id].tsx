import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, TextInput, Dimensions, Linking, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Star, MessageCircle, Share2, Edit, Trash2, Save, X, MapPin, Mail, Phone, Camera, Plus, ChevronDown, Bookmark } from 'lucide-react-native';
import { supabase, type ProductService, type Profile, type Region, type City } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

interface ProductServiceWithUser extends ProductService {
  user: Profile;
}

// Helper function to format condition display
const formatCondition = (condition?: string): string => {
  switch (condition) {
    case 'new':
      return 'Brand New';
    case 'used':
      return 'Used';
    case 'not_applicable':
      return 'N/A';
    default:
      return 'N/A';
  }
};

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

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<ProductServiceWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const imageScrollViewRef = useRef<ScrollView>(null);
  
  // Edit form states
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedPricingType, setEditedPricingType] = useState<'fixed' | 'negotiable' | 'contact'>('fixed');
  const [editedCondition, setEditedCondition] = useState<'new' | 'used' | 'not_applicable'>('not_applicable');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedListingType, setEditedListingType] = useState<'product' | 'service'>('product');
  const [editedContactPhone, setEditedContactPhone] = useState('');
  const [editedContactWhatsapp, setEditedContactWhatsapp] = useState('');
  const [editedImageUris, setEditedImageUris] = useState<string[]>([]);
  
  // Location states
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editedRegionId, setEditedRegionId] = useState<string>('');
  const [editedCityId, setEditedCityId] = useState<string>('');
  const [isRegionPickerVisible, setIsRegionPickerVisible] = useState(false);
  const [isCityPickerVisible, setIsCityPickerVisible] = useState(false);

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
    fetchLocations();
  }, [id]);

  useEffect(() => {
    // Re-check saved status when user changes or when returning to screen
    if (user && id) {
      checkIfSaved();
    }
  }, [user, id]);

  const fetchLocations = async () => {
    try {
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (regionsError) throw regionsError;
      setRegions(regionsData || []);

      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (citiesError) throw citiesError;
      setCities(citiesData || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

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
        setEditedPricingType((listingData as any).pricing_type || 'fixed');
        setEditedCondition((listingData as any).condition || 'not_applicable');
        setEditedCategory(listingData.category_name);
        setEditedListingType(listingData.type || 'product');
        setEditedContactPhone((listingData as any).contact_phone || '');
        setEditedContactWhatsapp((listingData as any).contact_whatsapp || '');
        setEditedRegionId((listingData as any).region_id || '');
        setEditedCityId((listingData as any).city_id || '');
        
        // Set images from image_urls array
        let images: string[] = [];
        if ((listingData as any).image_urls && Array.isArray((listingData as any).image_urls)) {
          images = (listingData as any).image_urls;
        } else if (listingData.image_url) {
          images = [listingData.image_url];
        }
        setEditedImageUris(images);
        setSelectedImageIndex(0);
      }

      // Check if listing is saved (separate from listing fetch to avoid blocking)
      if (user && id) {
        checkIfSaved();
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      Alert.alert('Error', 'Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async () => {
    if (!user || !id) return;

    try {
      const { data: savedData, error } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when no record exists
      
      if (!error) {
        setIsSaved(!!savedData);
      }
    } catch (error) {
      console.error('Error checking saved status:', error);
      // Don't show alert, just fail silently
    }
  };

  const toggleSave = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to save listings');
      return;
    }

    try {
      if (isSaved) {
        // Show message that it's already saved
        Alert.alert('Already Saved', 'This item is already in your saved listings');
        return;
      }

      // Check if already saved in database (in case state is out of sync)
      const { data: existingData } = await supabase
        .from('saved_listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .single();

      if (existingData) {
        // Already saved in database, update local state
        setIsSaved(true);
        Alert.alert('Already Saved', 'This item is already in your saved listings');
        return;
      }

      // Save
      const { error } = await supabase
        .from('saved_listings')
        .insert({
          user_id: user.id,
          listing_id: id,
        });

      if (error) throw error;
      setIsSaved(true);
      Alert.alert('Saved!', 'Item added to your saved listings');
    } catch (error) {
      console.error('Error toggling save:', error);
      // Check if it's a duplicate key error
      if ((error as any)?.code === '23505') {
        setIsSaved(true);
        Alert.alert('Already Saved', 'This item is already in your saved listings');
      } else {
        Alert.alert('Error', 'Failed to save listing');
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (listing) {
      setEditedTitle(listing.title);
      setEditedDescription(listing.description);
      setEditedPrice(listing.price?.toString() || '0');
      setEditedPricingType((listing as any).pricing_type || 'fixed');
      setEditedCondition((listing as any).condition || 'not_applicable');
      setEditedCategory(listing.category_name);
      setEditedListingType(listing.type || 'product');
      setEditedContactPhone((listing as any).contact_phone || '');
      setEditedContactWhatsapp((listing as any).contact_whatsapp || '');
      setEditedRegionId((listing as any).region_id || '');
      setEditedCityId((listing as any).city_id || '');
      
      let images: string[] = [];
      if ((listing as any).image_urls && Array.isArray((listing as any).image_urls)) {
        images = (listing as any).image_urls;
      } else if (listing.image_url) {
        images = [listing.image_url];
      }
      setEditedImageUris(images);
    }
  };

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - editedImageUris.length,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map(asset => asset.uri);
      setEditedImageUris([...editedImageUris, ...newUris]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setEditedImageUris(editedImageUris.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim() || !editedDescription.trim()) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    if (editedPricingType !== 'contact' && !editedPrice.trim()) {
      Alert.alert('Error', 'Please enter a price or select "Call for Price"');
      return;
    }

    if (!editedCategory.trim()) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (editedImageUris.length === 0) {
      Alert.alert('Error', 'Please add at least one image');
      return;
    }

    try {
      setIsSaving(true);

      // Upload new images that are local URIs (not already uploaded)
      let uploadedUrls: string[] = [];
      for (const uri of editedImageUris) {
        // If it's already a supabase URL, keep it
        if (uri.includes('supabase')) {
          uploadedUrls.push(uri);
        } else {
          // Upload new image
          const response = await fetch(uri);
          const blob = await response.blob();
          
          // Convert blob to ArrayBuffer using FileReader
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
          });

          const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, arrayBuffer, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrl);
        }
      }

      const numericPrice = editedPricingType === 'contact' ? 0 : Number(editedPrice);

      // Verify user owns this listing
      if (listing?.user_id !== user?.id) {
        Alert.alert('Error', 'You do not have permission to edit this listing');
        return;
      }

      const { error } = await supabase
        .from('products_services')
        .update({
          title: editedTitle.trim(),
          description: editedDescription.trim(),
          price: numericPrice,
          pricing_type: editedPricingType,
          condition: editedCondition,
          category_name: editedCategory.trim(),
          type: editedListingType,
          contact_phone: editedContactPhone.trim() || null,
          contact_whatsapp: editedContactWhatsapp.trim() || null,
          region_id: editedRegionId || null,
          city_id: editedCityId || null,
          image_url: uploadedUrls[0] || null,
          image_urls: uploadedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user?.id);

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
              debouncedRouter.back();
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  const handleWhatsAppContact = () => {
    if (!listing.contact_whatsapp) {
      Alert.alert('No WhatsApp', 'Seller has not provided a WhatsApp number.');
      return;
    }

    // Remove any non-numeric characters from the phone number
    const phoneNumber = listing.contact_whatsapp.replace(/[^0-9]/g, '');
    
    // Open WhatsApp with the seller's number
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on this device.');
        }
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert('Error', 'Failed to open WhatsApp.');
      });
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
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backToMarketButton}>
          <Text style={styles.backToMarketText}>Back to Marketplace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.id === listing.user_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Listing Details</Text>
        {!isOwner && !isEditing && (
          <TouchableOpacity onPress={toggleSave} style={styles.saveButton}>
            <Star size={24} color={isSaved ? "#14B8A6" : "#666666"} fill={isSaved ? "#14B8A6" : "none"} />
          </TouchableOpacity>
        )}
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
                  ref={imageScrollViewRef}
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
                        onPress={() => {
                          setSelectedImageIndex(index);
                          // Scroll main image to selected index
                          const { width } = Dimensions.get('window');
                          imageScrollViewRef.current?.scrollTo({
                            x: index * width,
                            animated: true,
                          });
                        }}
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
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Images Section */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Images ({editedImageUris.length}/5)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePickerScroll}>
                  {editedImageUris.map((uri, index) => (
                    <View key={index} style={styles.editImageContainer}>
                      <Image source={{ uri }} style={styles.editImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <X size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {editedImageUris.length < 5 && (
                    <TouchableOpacity style={styles.addImageButton} onPress={handlePickImages}>
                      <Camera size={24} color="#4169E1" />
                      <Text style={styles.addImageText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Enter title"
                  placeholderTextColor="#999999"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Describe your item or service"
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category *</Text>
                <TextInput
                  style={styles.input}
                  value={editedCategory}
                  onChangeText={setEditedCategory}
                  placeholder="e.g., Electronics, Fashion"
                  placeholderTextColor="#999999"
                />
              </View>

              {/* Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, editedListingType === 'product' && styles.chipSelected]}
                    onPress={() => setEditedListingType('product')}
                  >
                    <Text style={[styles.chipText, editedListingType === 'product' && styles.chipTextSelected]}>
                      Product
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, editedListingType === 'service' && styles.chipSelected]}
                    onPress={() => setEditedListingType('service')}
                  >
                    <Text style={[styles.chipText, editedListingType === 'service' && styles.chipTextSelected]}>
                      Service
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Condition */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Condition</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: 'new', label: 'New' },
                    { key: 'used', label: 'Used' },
                    { key: 'not_applicable', label: 'N/A' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.chip, editedCondition === opt.key && styles.chipSelected]}
                      onPress={() => setEditedCondition(opt.key as any)}
                    >
                      <Text style={[styles.chipText, editedCondition === opt.key && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Pricing Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pricing</Text>
                <View style={styles.chipRow}>
                  {[
                    { key: 'fixed', label: 'Fixed Price' },
                    { key: 'negotiable', label: 'Negotiable' },
                    { key: 'contact', label: 'Call for Price' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.chip, editedPricingType === opt.key && styles.chipSelected]}
                      onPress={() => setEditedPricingType(opt.key as any)}
                    >
                      <Text style={[styles.chipText, editedPricingType === opt.key && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price */}
              {editedPricingType !== 'contact' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Price (GHS) *</Text>
                  <TextInput
                    style={styles.input}
                    value={editedPrice}
                    onChangeText={setEditedPrice}
                    placeholder="Enter price"
                    placeholderTextColor="#999999"
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Location - Region */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Region</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setIsRegionPickerVisible(true)}
                >
                  <MapPin size={20} color={editedRegionId ? '#4169E1' : '#9CA3AF'} />
                  <Text style={[styles.locationButtonText, editedRegionId && styles.locationButtonTextSelected]}>
                    {regions.find(r => r.id === editedRegionId)?.name || 'Select region'}
                  </Text>
                  <ChevronDown size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Location - City */}
              {editedRegionId && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>City</Text>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => setIsCityPickerVisible(true)}
                  >
                    <MapPin size={20} color={editedCityId ? '#4169E1' : '#9CA3AF'} />
                    <Text style={[styles.locationButtonText, editedCityId && styles.locationButtonTextSelected]}>
                      {cities.find(c => c.id === editedCityId)?.name || 'Select city'}
                    </Text>
                    <ChevronDown size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Contact Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Contact Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editedContactPhone}
                  onChangeText={setEditedContactPhone}
                  placeholder="e.g., +233 XX XXX XXXX"
                  placeholderTextColor="#999999"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Contact WhatsApp */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>WhatsApp Number</Text>
                <TextInput
                  style={styles.input}
                  value={editedContactWhatsapp}
                  onChangeText={setEditedContactWhatsapp}
                  placeholder="e.g., +233 XX XXX XXXX"
                  placeholderTextColor="#999999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>
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
                </View>
              </View>

              <View style={styles.timestampSection}>
                <Text style={styles.timestampText}>
                  Posted {getRelativeTime(listing.created_at)}
                </Text>
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

              {listing.condition && listing.condition !== 'not_applicable' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Condition</Text>
                  <View style={[styles.categoryBadge, listing.condition === 'new' ? styles.newBadge : styles.usedBadge]}>
                    <Text style={[styles.categoryText, listing.condition === 'new' ? styles.newBadgeText : styles.usedBadgeText]}>
                      {formatCondition(listing.condition)}
                    </Text>
                  </View>
                </View>
              )}

              {!isOwner && listing.contact_whatsapp && (
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.whatsappButton} 
                    onPress={() => Alert.alert('Coming Soon', 'Chat feature is coming soon!')}
                  >
                    <Text style={styles.whatsappButtonText}>💬 Chat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Region Picker Modal */}
      <Modal visible={isRegionPickerVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Region</Text>
              <TouchableOpacity onPress={() => setIsRegionPickerVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setEditedRegionId(region.id);
                    setEditedCityId(''); // Reset city when region changes
                    setIsRegionPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{region.name}</Text>
                  {editedRegionId === region.id && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={isCityPickerVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setIsCityPickerVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {cities
                .filter(city => city.region_id === editedRegionId)
                .map((city) => (
                  <TouchableOpacity
                    key={city.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setEditedCityId(city.id);
                      setIsCityPickerVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{city.name}</Text>
                    {editedCityId === city.id && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  saveButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
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
  timestampSection: {
    marginBottom: 16,
  },
  timestampText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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
  newBadge: {
    backgroundColor: '#D1FAE5',
  },
  newBadgeText: {
    color: '#059669',
  },
  usedBadge: {
    backgroundColor: '#FEF3C7',
  },
  usedBadgeText: {
    color: '#D97706',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
  imagePickerScroll: {
    marginTop: 8,
  },
  editImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  editImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  locationButtonTextSelected: {
    color: '#0F172A',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  checkMark: {
    fontSize: 20,
    color: '#4169E1',
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
