import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, Target, Info, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const GOAL_CATEGORIES = [
  { id: '1', name: 'Career' },
  { id: '2', name: 'Education' },
  { id: '3', name: 'Personal' },
  { id: '4', name: 'Health' },
  { id: '5', name: 'Financial' },
];

export default function CreateGoalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [isVisionBoard, setIsVisionBoard] = useState(false);
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

  useEffect(() => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to create goals.');
      router.replace('/');
      return;
    }
  }, [user, router]);

  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your goal');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your goal');
      return;
    }
    
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Format the goal data
      const goalData = {
        user_id: user?.id,
        title: title.trim(),
        description: description.trim(),
        price: null,
        image_url: imageUrl.trim() || null,
        category_name: `Goal - ${category}`,
        is_featured: isVisionBoard, // Use is_featured to mark vision board items
        is_premium_listing: false,
        is_approved: true, // Auto-approve user's own goals
      };
      
      // Add deadline to description if provided
      if (deadline.trim()) {
        goalData.description = `Deadline: ${deadline.trim()} | ${goalData.description}`;
      }

      const { error } = await supabase
        .from('products_services')
        .insert(goalData);

      if (error) throw error;

      Alert.alert(
        'Success', 
        isVisionBoard ? 'Vision board item created successfully!' : 'Goal created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', error.message || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || !user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>{isVisionBoard ? 'Add to Vision Board' : 'Create New Goal'}</Text>
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!title.trim() || !description.trim() || !category || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!title.trim() || !description.trim() || !category || isSubmitting}
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
          <Target size={24} color="#4169E1" />
          <Text style={styles.infoTitle}>{isVisionBoard ? 'Add to Vision Board' : 'Create New Goal'}</Text>
          <Text style={styles.infoText}>
            {isVisionBoard 
              ? 'Add aspirations and dreams to your vision board for inspiration.' 
              : 'Define clear goals with specific milestones to track your progress.'}
          </Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a title for your goal"
            placeholderTextColor="#666666"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your goal in detail"
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
            {GOAL_CATEGORIES.map((cat) => (
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
          <Text style={styles.label}>Deadline (Optional)</Text>
          <View style={styles.inputWithIcon}>
            <Calendar size={20} color="#666666" />
            <TextInput
              style={styles.iconInput}
              placeholder="Enter deadline (e.g., December 2024)"
              placeholderTextColor="#666666"
              value={deadline}
              onChangeText={setDeadline}
            />
          </View>
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
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Add to Vision Board</Text>
          <TouchableOpacity 
            style={[styles.switchTrack, isVisionBoard && styles.switchTrackActive]}
            onPress={() => setIsVisionBoard(!isVisionBoard)}
          >
            <View style={[styles.switchThumb, isVisionBoard && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Info size={20} color="#666666" />
          <Text style={styles.infoText}>
            {isVisionBoard 
              ? 'Vision board items represent your aspirations and dreams. They serve as visual reminders of what you\'re working towards.' 
              : 'Goals should be specific, measurable, achievable, relevant, and time-bound (SMART).'}
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: '#4169E1',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
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
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});