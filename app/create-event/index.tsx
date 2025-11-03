import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, Calendar, Clock, MapPin, Tag, Info, Plus, X, DollarSign, Users, Phone, Mail, Package } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

const EVENT_CATEGORIES = [
  { id: '1', name: 'School Events' },
  { id: '2', name: 'Alumni Board' },
  { id: '3', name: 'Individual Events' },
  { id: '4', name: 'Sports' },
  { id: '5', name: 'Cultural' },
];

const MAX_IMAGES = 20;

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isVerified, isChecking } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');
  const [timezone, setTimezone] = useState('GMT');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ticket & Pricing
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [ticketPrice, setTicketPrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD');
  const [capacity, setCapacity] = useState('');
  
  // Packages/Perks
  const [packages, setPackages] = useState<string[]>(['']);
  
  // Event Agenda
  const [agendaItems, setAgendaItems] = useState<string[]>(['']);
  
  // Speakers/Hosts
  const [speakers, setSpeakers] = useState<{ name: string; title: string }[]>([{ name: '', title: '' }]);
  
  // Contact Information
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Images (from gallery)
  const [imageUris, setImageUris] = useState<string[]>([]);
  
  // Image URLs
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Image picker from gallery
  const pickImages = async () => {
    if (imageUris.length >= MAX_IMAGES) {
      Alert.alert('Maximum Images', `You can only upload up to ${MAX_IMAGES} images`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      const totalImages = [...imageUris, ...newImages];
      
      if (totalImages.length > MAX_IMAGES) {
        Alert.alert('Too Many Images', `You can only upload up to ${MAX_IMAGES} images. Only the first ${MAX_IMAGES - imageUris.length} will be added.`);
        setImageUris([...imageUris, ...newImages.slice(0, MAX_IMAGES - imageUris.length)]);
      } else {
        setImageUris(totalImages);
      }
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  // Currency conversion rates (approximate)
  const CURRENCY_RATES: { [key: string]: number } = {
    'GHS': 1,
    'USD': 0.082,
  };

  const convertCurrency = (amount: string, from: string, to: string): string => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0.00';
    const inGHS = numAmount / CURRENCY_RATES[from];
    const converted = inGHS * CURRENCY_RATES[to];
    return converted.toFixed(2);
  };

  // Add/remove packages
  const addPackage = () => {
    if (packages.length < 10) {
      setPackages([...packages, '']);
    }
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index: number, value: string) => {
    const updated = [...packages];
    updated[index] = value;
    setPackages(updated);
  };

  // Add/remove agenda items
  const addAgendaItem = () => {
    if (agendaItems.length < 20) {
      setAgendaItems([...agendaItems, '']);
    }
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, value: string) => {
    const updated = [...agendaItems];
    updated[index] = value;
    setAgendaItems(updated);
  };

  // Add/remove speakers
  const addSpeaker = () => {
    if (speakers.length < 10) {
      setSpeakers([...speakers, { name: '', title: '' }]);
    }
  };

  const removeSpeaker = (index: number) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const updateSpeaker = (index: number, field: 'name' | 'title', value: string) => {
    const updated = [...speakers];
    updated[index][field] = value;
    setSpeakers(updated);
  };

  // Add/remove image URLs
  const addImageUrl = () => {
    if (imageUrls.length < MAX_IMAGES) {
      setImageUrls([...imageUrls, '']);
    }
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const updateImageUrl = (index: number, value: string) => {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    
    if (!organizer.trim()) {
      Alert.alert('Error', 'Please enter an organizer name');
      return;
    }
    
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter an event location');
      return;
    }
    
    if (!date.trim()) {
      Alert.alert('Error', 'Please enter an event date');
      return;
    }
    
    if (!hour || !minute) {
      Alert.alert('Error', 'Please enter the event time (hour and minute)');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter an event description');
      return;
    }
    
    if (!category) {
      Alert.alert('Error', 'Please select an event category');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare event data
      const formattedTime = hour && minute ? `${hour}:${minute} ${period} ${timezone}` : time.trim();
      const convertedPrice = !isFreeEvent && ticketPrice ? convertCurrency(ticketPrice, currency, secondaryCurrency) : '0.00';
      
      const eventData = {
        title: title.trim(),
        organizer: organizer.trim(),
        location: location.trim(),
        locationUrl: locationUrl.trim(),
        date: date.trim(),
        time: formattedTime,
        description: description.trim(),
        category: category,
        isFree: isFreeEvent,
        ticketPrice: isFreeEvent ? 'Free' : ticketPrice.trim(),
        currency: currency,
        secondaryCurrency: secondaryCurrency,
        convertedPrice: convertedPrice,
        capacity: capacity.trim(),
        packages: packages.filter(item => item.trim() !== ''),
        agenda: agendaItems.filter(item => item.trim() !== ''),
        speakers: speakers.filter(s => s.name.trim() !== '' || s.title.trim() !== ''),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        galleryImages: imageUris,
        imageUrls: imageUrls.filter(url => url.trim() !== ''),
      };
      
      // Format the description to include all data as JSON for storage
      const formattedDescription = JSON.stringify(eventData);
      
      // Get first available image
      const firstImage = imageUrls.find(url => url.trim() !== '') || null;
      
      // Insert the event
      const { data: newEvent, error: eventError } = await supabase
        .from('products_services')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: formattedDescription,
          price: null,
          image_url: firstImage,
          category_name: `Event - ${category}`,
          is_featured: false,
          is_premium_listing: false,
          is_approved: false,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create a notification for the event submission
      try {
        await supabase
          .from('products_services')
          .insert({
            user_id: user?.id,
            title: `New Event: ${title.trim()}`,
            description: `${organizer.trim()} is hosting "${title.trim()}" on ${date.trim()} at ${formattedTime}. Location: ${location.trim()}`,
            price: null,
            image_url: firstImage,
            category_name: 'Notification - Event',
            is_featured: false,
            is_premium_listing: false,
            is_approved: true, // Notifications are auto-approved
          });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the whole submission if notification fails
      }

      // Show success message
      Alert.alert(
        '✓ Success!', 
        `Your event "${title.trim()}" has been submitted successfully and posted to the Event Calendar!`
      );
      
      // Navigate to event calendar page in secretariat
      setTimeout(() => {
        router.push('/secretariat/event-calendar' as any);
      }, 500);
    } catch (error: any) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error.message || 'Failed to submit event');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || isChecking || !isVerified) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }]}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Submit Event</Text>
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!title.trim() || !organizer.trim() || !location.trim() || !date.trim() || !hour || !minute || !description.trim() || !category || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !organizer.trim() || !location.trim() || !date.trim() || !hour || !minute || !description.trim() || !category || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Send size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.infoCard}>
          <Calendar size={24} color="#4169E1" />
          <Text style={styles.infoTitle}>Submit New Event</Text>
          <Text style={styles.infoText}>
            Your submission will be reviewed by administrators before being published.
          </Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the event title"
            placeholderTextColor="#666666"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Organizer</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the organizing body or person"
            placeholderTextColor="#666666"
            value={organizer}
            onChangeText={setOrganizer}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="Enter event location"
              placeholderTextColor="#666666"
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>
          <Text style={styles.labelHint}>Location URL (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://maps.google.com/... or venue website"
            placeholderTextColor="#666666"
            value={locationUrl}
            onChangeText={setLocationUrl}
            keyboardType="url"
            autoCapitalize="none"
            maxLength={300}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Date</Text>
          <Text style={styles.labelHint}>Select month, day, and year</Text>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerField}>
              <Text style={styles.datePickerLabel}>Month</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="MM"
                placeholderTextColor="#999"
                value={date.split('-')[1] || ''}
                onChangeText={(text) => {
                  const parts = date.split('-');
                  const month = text.replace(/[^0-9]/g, '').slice(0, 2);
                  setDate(`${parts[0] || '2025'}-${month}-${parts[2] || '01'}`);
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.datePickerField}>
              <Text style={styles.datePickerLabel}>Day</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="DD"
                placeholderTextColor="#999"
                value={date.split('-')[2] || ''}
                onChangeText={(text) => {
                  const parts = date.split('-');
                  const day = text.replace(/[^0-9]/g, '').slice(0, 2);
                  setDate(`${parts[0] || '2025'}-${parts[1] || '01'}-${day}`);
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.datePickerField}>
              <Text style={styles.datePickerLabel}>Year</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY"
                placeholderTextColor="#999"
                value={date.split('-')[0] || ''}
                onChangeText={(text) => {
                  const parts = date.split('-');
                  const year = text.replace(/[^0-9]/g, '').slice(0, 4);
                  setDate(`${year}-${parts[1] || '01'}-${parts[2] || '01'}`);
                }}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>
          {date && (
            <Text style={styles.datePreview}>
              Selected: {new Date(date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.labelHint}>Select hour, minute, AM/PM, and timezone</Text>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerField}>
              <Text style={styles.timePickerLabel}>Hour</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="HH"
                placeholderTextColor="#999"
                value={hour}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '').slice(0, 2);
                  if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 12)) {
                    setHour(num);
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timePickerField}>
              <Text style={styles.timePickerLabel}>Minute</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="MM"
                placeholderTextColor="#999"
                value={minute}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '').slice(0, 2);
                  if (num === '' || parseInt(num) <= 59) {
                    setMinute(num);
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.timePickerField}>
              <Text style={styles.timePickerLabel}>Period</Text>
              <View style={styles.periodSelector}>
                <TouchableOpacity
                  style={[styles.periodButton, period === 'AM' && styles.periodButtonActive]}
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[styles.periodButtonText, period === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodButton, period === 'PM' && styles.periodButtonActive]}
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[styles.periodButtonText, period === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.labelHint}>Timezone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timezoneScroll}>
              {['GMT', 'GMT+1', 'GMT+2', 'GMT+3', 'GMT-5 (EST)', 'GMT-8 (PST)', 'GMT+8', 'GMT+9'].map((tz) => (
                <TouchableOpacity
                  key={tz}
                  style={[styles.timezoneButton, timezone === tz && styles.timezoneButtonActive]}
                  onPress={() => setTimezone(tz)}
                >
                  <Text style={[styles.timezoneButtonText, timezone === tz && styles.timezoneButtonTextActive]}>{tz}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {hour && minute && (
            <Text style={styles.timePreview}>
              Selected Time: {hour}:{minute.padStart(2, '0')} {period} {timezone}
            </Text>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide details about the event"
            placeholderTextColor="#666666"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        {/* Event Packages/Perks Section */}
        <View style={styles.sectionHeader}>
          <Package size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Event Packages & Perks</Text>
        </View>
        
        <Text style={styles.sectionHint}>Add included items or perks (e.g., Free food, Swag bag, Parking)</Text>
        
        {packages.map((pkg, index) => (
          <View key={index} style={styles.packageItemContainer}>
            <TextInput
              style={[styles.input, styles.packageInput]}
              placeholder={`Package/Perk ${index + 1} (e.g., Free lunch & refreshments)`}
              placeholderTextColor="#666666"
              value={pkg}
              onChangeText={(value) => updatePackage(index, value)}
              maxLength={150}
            />
            {packages.length > 1 && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removePackage(index)}
              >
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {packages.length < 10 && (
          <TouchableOpacity style={styles.addButton} onPress={addPackage}>
            <Plus size={20} color="#4169E1" />
            <Text style={styles.addButtonText}>Add Package/Perk</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {EVENT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  category === cat.name && styles.selectedCategoryChip
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Text 
                  style={[
                    styles.categoryChipText,
                    category === cat.name && styles.selectedCategoryChipText
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Ticket & Pricing Section */}
        <View style={styles.sectionHeader}>
          <DollarSign size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Ticket & Pricing</Text>
        </View>
        
        <View style={styles.formGroup}>
          <View style={styles.freeEventToggle}>
            <TouchableOpacity 
              style={[styles.toggleButton, isFreeEvent && styles.toggleButtonActive]}
              onPress={() => setIsFreeEvent(true)}
            >
              <Text style={[styles.toggleText, isFreeEvent && styles.toggleTextActive]}>Free Event</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, !isFreeEvent && styles.toggleButtonActive]}
              onPress={() => setIsFreeEvent(false)}
            >
              <Text style={[styles.toggleText, !isFreeEvent && styles.toggleTextActive]}>Paid Event</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {!isFreeEvent && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ticket Price</Text>
              <View style={styles.currencyContainer}>
                <View style={styles.currencyInputGroup}>
                  <Text style={styles.currencyLabel}>Primary Currency</Text>
                  <View style={styles.currencyRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
                      {['GHS', 'USD'].map((curr) => (
                        <TouchableOpacity
                          key={curr}
                          style={[styles.currencyButton, currency === curr && styles.currencyButtonActive]}
                          onPress={() => setCurrency(curr)}
                        >
                          <Text style={[styles.currencyButtonText, currency === curr && styles.currencyButtonTextActive]}>{curr}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#666666"
                    value={ticketPrice}
                    onChangeText={setTicketPrice}
                    keyboardType="decimal-pad"
                    maxLength={10}
                  />
                </View>
                
                <View style={styles.currencyInputGroup}>
                  <Text style={styles.currencyLabel}>Convert to</Text>
                  <View style={styles.currencyRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
                      {['GHS', 'USD'].map((curr) => (
                        <TouchableOpacity
                          key={curr}
                          style={[styles.currencyButton, secondaryCurrency === curr && styles.currencyButtonActive]}
                          onPress={() => setSecondaryCurrency(curr)}
                        >
                          <Text style={[styles.currencyButtonText, secondaryCurrency === curr && styles.currencyButtonTextActive]}>{curr}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  {ticketPrice && (
                    <View style={styles.convertedPriceContainer}>
                      <Text style={styles.convertedPriceLabel}>Converted Price:</Text>
                      <Text style={styles.convertedPrice}>
                        {secondaryCurrency} {convertCurrency(ticketPrice, currency, secondaryCurrency)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </>
        )}
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Capacity (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter maximum number of attendees"
            placeholderTextColor="#666666"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        
        {/* Event Agenda Section */}
        <View style={styles.sectionHeader}>
          <Calendar size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Event Agenda</Text>
        </View>
        
        <Text style={styles.sectionHint}>Add agenda items to outline the event schedule</Text>
        
        {agendaItems.map((item, index) => (
          <View key={index} style={styles.agendaItemContainer}>
            <TextInput
              style={[styles.input, styles.agendaInput]}
              placeholder={`Agenda item ${index + 1} (e.g., 9:00 AM - Registration)`}
              placeholderTextColor="#666666"
              value={item}
              onChangeText={(value) => updateAgendaItem(index, value)}
              maxLength={200}
            />
            {agendaItems.length > 1 && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeAgendaItem(index)}
              >
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {agendaItems.length < 20 && (
          <TouchableOpacity style={styles.addButton} onPress={addAgendaItem}>
            <Plus size={20} color="#4169E1" />
            <Text style={styles.addButtonText}>Add Agenda Item</Text>
          </TouchableOpacity>
        )}
        
        {/* Speakers/Hosts Section */}
        <View style={styles.sectionHeader}>
          <Users size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Speakers & Hosts</Text>
        </View>
        
        <Text style={styles.sectionHint}>Add speakers, hosts, or special guests</Text>
        
        {speakers.map((speaker, index) => (
          <View key={index} style={styles.speakerContainer}>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Speaker/Host Name"
              placeholderTextColor="#666666"
              value={speaker.name}
              onChangeText={(value) => updateSpeaker(index, 'name', value)}
              maxLength={100}
            />
            <TextInput
              style={styles.input}
              placeholder="Title/Role (e.g., Keynote Speaker, Alumni President)"
              placeholderTextColor="#666666"
              value={speaker.title}
              onChangeText={(value) => updateSpeaker(index, 'title', value)}
              maxLength={100}
            />
            {speakers.length > 1 && (
              <TouchableOpacity 
                style={styles.removeSpeakerButton}
                onPress={() => removeSpeaker(index)}
              >
                <X size={16} color="#EF4444" />
                <Text style={styles.removeButtonText}>Remove Speaker</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {speakers.length < 10 && (
          <TouchableOpacity style={styles.addButton} onPress={addSpeaker}>
            <Plus size={20} color="#4169E1" />
            <Text style={styles.addButtonText}>Add Speaker/Host</Text>
          </TouchableOpacity>
        )}
        
        {/* Contact Information Section */}
        <View style={styles.sectionHeader}>
          <Phone size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Contact Information</Text>
        </View>
        
        <Text style={styles.sectionHint}>Provide contact details for attendees</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email</Text>
          <View style={styles.inputWithIcon}>
            <Mail size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="event@example.com"
              placeholderTextColor="#666666"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Phone</Text>
          <View style={styles.inputWithIcon}>
            <Phone size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="+233 XX XXX XXXX"
              placeholderTextColor="#666666"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>
        </View>
        
        {/* Images from Gallery Section */}
        <View style={styles.sectionHeader}>
          <ImageIcon size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Event Images (Gallery)</Text>
        </View>
        
        <Text style={styles.sectionHint}>Select up to {MAX_IMAGES} images from your gallery</Text>
        
        <View style={styles.imageGrid}>
          {imageUris.map((uri, index) => {
            const isHttpImage = uri?.startsWith('http');
            return (
              <View key={index} style={styles.imageItem}>
                {isHttpImage ? (
                  <Image source={{ uri }} style={styles.uploadedImage} />
                ) : (
                  <View style={[styles.uploadedImage, styles.imagePlaceholder]}>
                    <Package size={32} color="#4169E1" />
                    <Text style={styles.placeholderText}>Image {index + 1}</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          })}
          
          {imageUris.length < MAX_IMAGES && (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
              <View style={styles.uploadPlaceholder}>
                <ImageIcon size={32} color="#4169E1" />
                <Text style={styles.uploadText}>Add Image</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Image URLs Section */}
        <View style={styles.sectionHeader}>
          <ImageIcon size={20} color="#4169E1" />
          <Text style={styles.sectionTitle}>Event Images (URLs)</Text>
        </View>
        
        <Text style={styles.sectionHint}>Add up to {MAX_IMAGES} image URLs</Text>
        
        {imageUrls.map((url, index) => (
          <View key={index} style={styles.urlContainer}>
            <TextInput
              style={[styles.input, styles.urlInput]}
              placeholder={`Image URL ${index + 1}`}
              placeholderTextColor="#666666"
              value={url}
              onChangeText={(value) => updateImageUrl(index, value)}
              autoCapitalize="none"
            />
            {imageUrls.length > 1 && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeImageUrl(index)}
              >
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {imageUrls.length < MAX_IMAGES && (
          <TouchableOpacity style={styles.addButton} onPress={addImageUrl}>
            <Plus size={20} color="#4169E1" />
            <Text style={styles.addButtonText}>Add Image URL</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#666666" />
          <Text style={styles.infoTextFlex}>
            Your submission will be reviewed by administrators before being published. This helps ensure all events are legitimate and valuable to our community.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitEventButton,
            (!title.trim() || !organizer.trim() || !location.trim() || !date.trim() || !hour || !minute || !description.trim() || !category || isSubmitting) && styles.submitEventButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !organizer.trim() || !location.trim() || !date.trim() || !hour || !minute || !description.trim() || !category || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Send size={20} color="#FFFFFF" />
              <Text style={styles.submitEventButtonText}>Submit Event</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  datePickerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerField: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#DBDBDB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  datePreview: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
    marginTop: 8,
    textAlign: 'center',
  },
  timePickerContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  timePickerField: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#DBDBDB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 14,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  periodButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  timezoneScroll: {
    marginTop: 8,
  },
  timezoneButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  timezoneButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  timezoneButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  timezoneButtonTextActive: {
    color: '#FFFFFF',
  },
  timePreview: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
    marginTop: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    height: 120,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  iconInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedCategoryChip: {
    backgroundColor: '#4169E1',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
  },
  infoTextFlex: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  sectionHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  freeEventToggle: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4169E1',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  agendaItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  agendaInput: {
    flex: 1,
  },
  packageItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  packageInput: {
    flex: 1,
  },
  currencyContainer: {
    gap: 16,
  },
  currencyInputGroup: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  currencyLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  currencyRow: {
    marginBottom: 12,
  },
  currencyScroll: {
    flexGrow: 0,
  },
  currencyButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  currencyButtonActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  currencyButtonTextActive: {
    color: '#FFFFFF',
  },
  priceInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  convertedPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  convertedPriceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  convertedPrice: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  speakerContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  removeSpeakerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginTop: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4169E1',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginTop: 4,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  urlInput: {
    flex: 1,
  },
  submitEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitEventButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  submitEventButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});