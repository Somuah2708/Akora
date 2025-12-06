import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useAuth } from '@/hooks/useAuth';
import { supabase, type Region, type City } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  X,
  MapPin,
  Check,
} from 'lucide-react-native';

const CATEGORIES = [
  // Services
  'Business Services',
  'Education & Tutoring',
  'Technical Services',
  'Creative & Design',
  'Food & Catering',
  'Healthcare',
  // Products
  'Electronics',
  'Clothing & Fashion',
  'Books & Media',
  'Home & Garden',
  'Sports & Outdoors',
  'Health & Beauty',
  'Toys & Games',
  'Automotive',
  'Other',
];

type ListingType = 'product' | 'service';

type Condition = 'new' | 'used' | 'not_applicable';

type PricingType = 'fixed' | 'negotiable' | 'contact';

export default function CreateListingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState<PricingType>('fixed');
  const [listingType, setListingType] = useState<ListingType>('product');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<Condition>('not_applicable');
  const [locationCity, setLocationCity] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic location states
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [isRegionPickerVisible, setIsRegionPickerVisible] = useState(false);
  const [isCityPickerVisible, setIsCityPickerVisible] = useState(false);
  const [isAddRegionVisible, setIsAddRegionVisible] = useState(false);
  const [isAddCityVisible, setIsAddCityVisible] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newCityName, setNewCityName] = useState('');

  // Fetch regions and cities from database
  const fetchLocations = useCallback(async () => {
    try {
      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (regionsError) throw regionsError;
      setRegions(regionsData || []);

      // Fetch cities
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
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Get selected region/city names
  const selectedRegionName = regions.find(r => r.id === selectedRegionId)?.name || '';
  const selectedCityName = cities.find(c => c.id === selectedCityId)?.name || '';

  // Get cities for selected region
  const citiesForRegion = cities.filter(c => c.region_id === selectedRegionId);

  // Handle adding new region
  const handleAddNewRegion = async () => {
    if (!newRegionName.trim()) {
      Alert.alert('Missing Information', 'Please enter a region name');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to add a region');
      return;
    }

    try {
      // Check if region already exists
      const existingRegion = regions.find(r => 
        r.name.toLowerCase() === newRegionName.trim().toLowerCase()
      );

      if (existingRegion) {
        Alert.alert('Region Exists', 'This region already exists. Please select it from the list.');
        setIsAddRegionVisible(false);
        setNewRegionName('');
        return;
      }

      const { data, error } = await supabase.rpc('add_new_location', {
        p_region_name: newRegionName.trim(),
        p_city_name: 'Main City', // Placeholder city
        p_user_id: user.id
      });

      if (error) throw error;

      Alert.alert(
        'Success!',
        `Region "${newRegionName}" has been added!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsAddRegionVisible(false);
              setNewRegionName('');
              fetchLocations(); // Refresh locations
              if (data) {
                setSelectedRegionId(data.region_id);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error adding region:', error);
      Alert.alert('Error', error.message || 'Failed to add region');
    }
  };

  // Handle adding new city
  const handleAddNewCity = async () => {
    if (!newCityName.trim()) {
      Alert.alert('Missing Information', 'Please enter a city name');
      return;
    }

    if (!selectedRegionId) {
      Alert.alert('Select Region First', 'Please select a region before adding a city');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to add a city');
      return;
    }

    try {
      // Check if city already exists in this region
      const existingCity = cities.find(c => 
        c.region_id === selectedRegionId && 
        c.name.toLowerCase() === newCityName.trim().toLowerCase()
      );

      if (existingCity) {
        Alert.alert('City Exists', 'This city already exists in the selected region. Please select it from the list.');
        setIsAddCityVisible(false);
        setNewCityName('');
        return;
      }

      const selectedRegion = regions.find(r => r.id === selectedRegionId);
      
      const { data, error } = await supabase.rpc('add_new_location', {
        p_region_name: selectedRegion?.name || '',
        p_city_name: newCityName.trim(),
        p_user_id: user.id
      });

      if (error) throw error;

      Alert.alert(
        'Success!',
        `City "${newCityName}" has been added to ${selectedRegion?.name}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsAddCityVisible(false);
              setNewCityName('');
              fetchLocations(); // Refresh locations
              if (data) {
                setSelectedCityId(data.city_id);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error adding city:', error);
      Alert.alert('Error', error.message || 'Failed to add city');
    }
  };

  const canSubmit =
    !!user &&
    title.trim().length > 3 &&
    description.trim().length > 10 &&
    category.trim().length > 0 &&
    (pricingType === 'contact' || price.trim().length > 0); // Price optional if "Call for Price"

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to be signed in to post an ad.');
      return;
    }

    if (!canSubmit) {
      Alert.alert('Missing details', 'Please fill in the required fields to continue.');
      return;
    }

    // Validate price only if not "Call for Price"
    let numericPrice = 0;
    if (pricingType !== 'contact') {
      numericPrice = Number(price.replace(/[^0-9.]/g, ''));
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        Alert.alert('Invalid price', 'Please enter a valid price in GHS.');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Handle image uploads if any local files selected
      let uploadedUrls: string[] = [];
      if (imageUris.length > 0) {
        const results: string[] = [];
        for (const uri of imageUris) {
          if (!uri.startsWith('file:')) {
            // Already a URL (unlikely on create), just keep it
            results.push(uri);
            continue;
          }

          try {
            const fileExt = uri.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const path = `products/${user.id}/${fileName}`;

            // For React Native, read file and convert to ArrayBuffer using FileReader
            const response = await fetch(uri);
            const fileBlob = await response.blob();
            
            // Convert blob to ArrayBuffer using FileReader
            const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (reader.result instanceof ArrayBuffer) {
                  resolve(reader.result);
                } else {
                  reject(new Error('Failed to read file'));
                }
              };
              reader.onerror = reject;
              reader.readAsArrayBuffer(fileBlob);
            });

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(path, arrayBuffer, {
                contentType: 'image/jpeg',
              });

            if (uploadError) {
              console.error('Error uploading image', uploadError);
              Alert.alert('Upload Warning', `Could not upload image: ${fileName}`);
              continue;
            }

            const { data: publicUrlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(path);

            if (publicUrlData?.publicUrl) {
              results.push(publicUrlData.publicUrl);
            }
          } catch (imgError: any) {
            console.error('Error processing image:', imgError);
            Alert.alert('Image Error', 'Failed to process one or more images');
          }
        }
        uploadedUrls = results;
      }

      const { data, error } = await supabase
        .from('products_services')
        .insert({
          title: title.trim(),
          description: description.trim(),
          price: pricingType === 'contact' ? 0 : numericPrice, // Store 0 for "Call for Price"
          pricing_type: pricingType, // Store pricing type (will add to database)
          category_name: category,
          type: listingType,
          condition,
          region_id: selectedRegionId || null,
          city_id: selectedCityId || null,
          location: selectedCityName && selectedRegionName 
            ? `${selectedCityName}, ${selectedRegionName}` 
            : (locationCity.trim() || null),
          location_city: selectedCityName || locationCity.trim() || null,
          location_region: selectedRegionName || locationRegion.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_whatsapp: contactWhatsapp.trim() || null,
          image_url: uploadedUrls[0] || null,
          image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating listing', error);
        Alert.alert('Could not post ad', error.message || 'Please try again later.');
        return;
      }

      Alert.alert('Ad posted', 'Your listing has been created successfully.', [
        {
          text: 'View listing',
          onPress: () => {
            if (data?.id) {
              debouncedRouter.replace(`/services/${data.id}`);
            } else {
              debouncedRouter.back();
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error('Unexpected error creating listing', err);
      Alert.alert('Something went wrong', 'Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Region Picker Modal */}
      <Modal
        visible={isRegionPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRegionPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsRegionPickerVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Region</Text>
              <TouchableOpacity onPress={() => setIsRegionPickerVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  style={styles.optionItem}
                  onPress={() => {
                    setSelectedRegionId(region.id);
                    setSelectedCityId(''); // Reset city when region changes
                    setIsRegionPickerVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{region.name}</Text>
                  {selectedRegionId === region.id && (
                    <Check size={20} color="#4169E1" />
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Add New Region Button */}
              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={() => {
                  setIsRegionPickerVisible(false);
                  setIsAddRegionVisible(true);
                }}
              >
                <Plus size={20} color="#4169E1" />
                <Text style={styles.addOptionText}>Add your region</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={isCityPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCityPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsCityPickerVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City / Town</Text>
              <TouchableOpacity onPress={() => setIsCityPickerVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {citiesForRegion.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={styles.optionItem}
                  onPress={() => {
                    setSelectedCityId(city.id);
                    setIsCityPickerVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{city.name}</Text>
                  {selectedCityId === city.id && (
                    <Check size={20} color="#4169E1" />
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Add New City Button */}
              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={() => {
                  setIsCityPickerVisible(false);
                  setIsAddCityVisible(true);
                }}
              >
                <Plus size={20} color="#4169E1" />
                <Text style={styles.addOptionText}>Add your city</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Region Modal */}
      <Modal
        visible={isAddRegionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddRegionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsAddRegionVisible(false)}
          />
          <View style={styles.addLocationSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Region</Text>
              <TouchableOpacity onPress={() => setIsAddRegionVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.addLocationDescription}>
              Can't find your region? Add it here and it will be available for everyone!
            </Text>

            <TextInput
              style={styles.addLocationInput}
              placeholder="Enter region name (e.g., Greater Accra)"
              placeholderTextColor="#94A3B8"
              value={newRegionName}
              onChangeText={setNewRegionName}
              autoCapitalize="words"
              autoFocus
            />

            <TouchableOpacity
              style={styles.addLocationSubmitButton}
              onPress={handleAddNewRegion}
            >
              <Text style={styles.addLocationSubmitText}>Add Region</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add City Modal */}
      <Modal
        visible={isAddCityVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddCityVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsAddCityVisible(false)}
          />
          <View style={styles.addLocationSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New City</Text>
              <TouchableOpacity onPress={() => setIsAddCityVisible(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.addLocationDescription}>
              Add your city to {selectedRegionName}. It will be available for all users!
            </Text>

            <TextInput
              style={styles.addLocationInput}
              placeholder="Enter city name (e.g., Madina, Kumasi)"
              placeholderTextColor="#94A3B8"
              value={newCityName}
              onChangeText={setNewCityName}
              autoCapitalize="words"
              autoFocus
            />

            <TouchableOpacity
              style={styles.addLocationSubmitButton}
              onPress={handleAddNewCity}
            >
              <Text style={styles.addLocationSubmitText}>Add City</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
          <ArrowLeft size={20} color="#020617" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Post an ad</Text>
          <Text style={styles.headerSubtitle}>Share a product or service with Akoras</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!user && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Sign in to continue</Text>
            <Text style={styles.noticeText}>
              You need an Akora account to post listings. Please sign in from the
              account tab first.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic details</Text>

          <Text style={styles.label}>Listing type</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'product', label: 'Product' },
              { key: 'service', label: 'Service' },
            ].map((opt) => {
              const selected = listingType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setListingType(opt.key as ListingType)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you offering?"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {CATEGORIES.map((c) => {
              const selected = c === category;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setCategory(selected ? '' : c)}
                >
                  <Text
                    style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the item or service, condition, and any details buyers should know."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          
          {/* Pricing Type Selection */}
          <Text style={styles.label}>Price Type *</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'fixed', label: 'Fixed Price', desc: 'Set a specific price' },
              { key: 'negotiable', label: 'Negotiable', desc: 'Open to offers' },
              { key: 'contact', label: 'Call for Price', desc: 'Buyer contacts you' },
            ].map((opt) => {
              const selected = pricingType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.priceTypeChip, selected && styles.priceTypeChipSelected]}
                  onPress={() => setPricingType(opt.key as PricingType)}
                >
                  <Text style={[styles.priceTypeLabel, selected && styles.priceTypeLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.priceTypeDesc, selected && styles.priceTypeDescSelected]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Show price input only for fixed and negotiable */}
          {(pricingType === 'fixed' || pricingType === 'negotiable') && (
            <>
              <Text style={styles.label}>
                Price (GHS) {pricingType === 'negotiable' ? '(Starting)' : '*'}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.pricePrefix}>GHS</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType={Platform.select({ ios: 'decimal-pad', android: 'numeric' })}
                  value={price}
                  onChangeText={setPrice}
                />
                {pricingType === 'negotiable' && (
                  <Text style={styles.negotiableTag}>or best offer</Text>
                )}
              </View>
            </>
          )}

          {/* Call for Price message */}
          {pricingType === 'contact' && (
            <View style={styles.contactPriceInfo}>
              <Text style={styles.contactPriceText}>
                💬 Buyers will contact you directly for pricing information
              </Text>
              <Text style={styles.contactPriceSubtext}>
                Make sure to provide accurate contact details below
              </Text>
            </View>
          )}

          <Text style={styles.label}>Condition</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'new', label: 'New' },
              { key: 'used', label: 'Used' },
              { key: 'not_applicable', label: 'Not applicable' },
            ].map((opt) => {
              const selected = condition === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCondition(opt.key as Condition)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          {/* Region Picker */}
          <Text style={styles.label}>Region *</Text>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => setIsRegionPickerVisible(true)}
          >
            <MapPin size={20} color={selectedRegionName ? '#4169E1' : '#9CA3AF'} />
            <Text style={[
              styles.locationButtonText,
              selectedRegionName && styles.locationButtonTextSelected
            ]}>
              {selectedRegionName || 'Select your region'}
            </Text>
            <ChevronDown size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* City Picker */}
          {selectedRegionId && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>City / Town *</Text>
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={() => setIsCityPickerVisible(true)}
              >
                <MapPin size={20} color={selectedCityName ? '#4169E1' : '#9CA3AF'} />
                <Text style={[
                  styles.locationButtonText,
                  selectedCityName && styles.locationButtonTextSelected
                ]}>
                  {selectedCityName || 'Select your city'}
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}
          
          <Text style={styles.helperText}>
            Can't find your location? You can add it when you select the picker.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone buyers can call"
            placeholderTextColor="#9CA3AF"
            keyboardType={Platform.select({ ios: 'phone-pad', android: 'phone-pad' })}
            value={contactPhone}
            onChangeText={setContactPhone}
          />

          <Text style={styles.label}>WhatsApp number</Text>
          <TextInput
            style={styles.input}
            placeholder="Number for WhatsApp chats"
            placeholderTextColor="#9CA3AF"
            keyboardType={Platform.select({ ios: 'phone-pad', android: 'phone-pad' })}
            value={contactWhatsapp}
            onChangeText={setContactWhatsapp}
          />

          <Text style={styles.helperText}>
            These numbers will be shown on your ad so interested Akoras can reach you
            directly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {imageUris.map((uri, idx) => (
              <View key={idx} style={styles.photoItem}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setImageUris((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.photoAddButton}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert(
                    'Permission required',
                    'We need access to your photos to upload images.'
                  );
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  quality: 0.8,
                });
                if (!result.canceled && result.assets) {
                  setImageUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
                }
              }}
            >
              <Plus size={20} color="#9CA3AF" />
              <Text style={styles.photoAddText}>Add photos</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Upload images from your gallery. First image will be the cover photo.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!canSubmit || isSubmitting || !user) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting || !user}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Posting...</Text>
            </>
          ) : (
            <Text style={styles.submitButtonText}>Post ad</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#1D4ED8',
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricePrefix: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
  },
  negotiableTag: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginLeft: 8,
  },
  priceTypeChip: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  priceTypeChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1D4ED8',
  },
  priceTypeLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  priceTypeLabelSelected: {
    color: '#1D4ED8',
  },
  priceTypeDesc: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  priceTypeDescSelected: {
    color: '#3B82F6',
  },
  contactPriceInfo: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginTop: 8,
  },
  contactPriceText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  contactPriceSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#78350F',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  photoItem: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddButton: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  noticeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  locationButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  locationButtonTextSelected: {
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  optionsList: {
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  addOptionText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  addLocationSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  addLocationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  addLocationInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  addLocationSubmitButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addLocationSubmitText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
