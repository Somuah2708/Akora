import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, Calendar, Clock, MapPin, Tag, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';

SplashScreen.preventAutoHideAsync();

const EVENT_CATEGORIES = [
  { id: '1', name: 'School Events' },
  { id: '2', name: 'Alumni Board' },
  { id: '3', name: 'Individual Events' },
  { id: '4', name: 'Sports' },
  { id: '5', name: 'Cultural' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isVerified, isChecking } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
    
    if (!time.trim()) {
      Alert.alert('Error', 'Please enter an event time');
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
      
      // Format the description to include organizer, location, and time
      const formattedDescription = `${organizer.trim()} | ${location.trim()} | ${time.trim()} | ${description.trim()}`;
      
      // Insert the event
      const { data: newEvent, error: eventError } = await supabase
        .from('products_services')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: formattedDescription,
          price: null, // Events don't have a price
          image_url: imageUrl.trim() || null,
          category_name: `Event - ${category}`,
          is_featured: false,
          is_premium_listing: false,
          is_approved: false, // Requires admin approval
        })
        .select()
        .single();

      if (eventError) throw eventError;

      Alert.alert(
        'Submission Successful', 
        'Your event has been submitted for review. An administrator will review and approve it shortly.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
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
            (!title.trim() || !organizer.trim() || !location.trim() || !date.trim() || !time.trim() || !description.trim() || !category || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !organizer.trim() || !location.trim() || !date.trim() || !time.trim() || !description.trim() || !category || isSubmitting}
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
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.inputWithIcon}>
            <Calendar size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="Enter event date (e.g., April 15, 2024)"
              placeholderTextColor="#666666"
              value={date}
              onChangeText={setDate}
              maxLength={100}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Time</Text>
          <View style={styles.inputWithIcon}>
            <Clock size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="Enter event time (e.g., 10:00 AM - 2:00 PM)"
              placeholderTextColor="#666666"
              value={time}
              onChangeText={setTime}
              maxLength={100}
            />
          </View>
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
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Image URL (Optional)</Text>
          <View style={styles.inputWithIcon}>
            <ImageIcon size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="Enter image URL"
              placeholderTextColor="#666666"
              value={imageUrl}
              onChangeText={setImageUrl}
            />
          </View>
          {imageUrl.trim() !== '' && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewLabel}>Preview:</Text>
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.imagePreview}
                onError={() => Alert.alert('Invalid Image URL', 'The provided URL does not contain a valid image.')}
              />
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#666666" />
          <Text style={styles.infoTextFlex}>
            Your submission will be reviewed by administrators before being published. This helps ensure all events are legitimate and valuable to our community.
          </Text>
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
});