import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Search, ArrowLeft, Globe, MapPin, Users, MessageCircle, Calendar, ChevronRight, Building2, Phone, Mail, ExternalLink, Edit, Save, X, Plus, Trash, Upload } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const CHAPTER_TYPES = [
  { id: 'all', name: 'All Chapters' },
  { id: 'university', name: 'University Chapters' },
  { id: 'regional', name: 'Regional Chapters' },
  { id: 'international', name: 'International' },
];

const FEATURED_CHAPTERS = [
  {
    id: '1',
    name: 'Greater Accra Chapter',
    type: 'regional',
    location: 'Accra, Ghana',
    members: 1200,
    image: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=800&auto=format&fit=crop&q=60',
    leadership: {
      president: 'Dr. Kwame Mensah',
      secretary: 'Mrs. Sarah Addo',
      treasurer: 'Mr. John Koffi',
    },
    contact: {
      email: 'accra@oaa.org',
      phone: '+233 20 123 4567',
    },
    upcomingEvents: [
      {
        title: 'Monthly Meeting',
        date: 'March 25, 2024',
      },
      {
        title: 'Community Outreach',
        date: 'April 10, 2024',
      },
    ],
    projects: [
      'School Renovation Project',
      'Mentorship Program',
      'Annual Scholarship Fund',
    ],
  },
  {
    id: '2',
    name: 'North America Chapter',
    type: 'international',
    location: 'Washington DC, USA',
    members: 850,
    image: 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&auto=format&fit=crop&q=60',
    leadership: {
      president: 'Dr. Michael Brown',
      secretary: 'Ms. Lisa Johnson',
      treasurer: 'Mr. David Chen',
    },
    contact: {
      email: 'namerica@oaa.org',
      phone: '+1 202 555 0123',
    },
    upcomingEvents: [
      {
        title: 'Annual Gala',
        date: 'May 15, 2024',
      },
    ],
    projects: [
      'Technology Innovation Fund',
      'Student Exchange Program',
    ],
  },
];

const REGIONAL_CHAPTERS = [
  {
    id: '1',
    name: 'Ashanti Region Chapter',
    location: 'Kumasi, Ghana',
    members: 800,
    image: 'https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=800&auto=format&fit=crop&q=60',
    activeProjects: 3,
  },
  {
    id: '2',
    name: 'Western Region Chapter',
    location: 'Takoradi, Ghana',
    members: 450,
    image: 'https://images.unsplash.com/photo-1580477667929-3ef27c684b7a?w=800&auto=format&fit=crop&q=60',
    activeProjects: 2,
  },
  {
    id: '3',
    name: 'Eastern Region Chapter',
    location: 'Koforidua, Ghana',
    members: 350,
    image: 'https://images.unsplash.com/photo-1499363536502-87642509e31b?w=800&auto=format&fit=crop&q=60',
    activeProjects: 4,
  },
];

const UNIVERSITY_CHAPTERS = [
  {
    id: '1',
    name: 'University of Ghana',
    location: 'Legon, Accra',
    members: 250,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    name: 'KNUST',
    location: 'Kumasi',
    members: 180,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60',
  },
];

export default function ChaptersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeType, setActiveType] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedChapter, setEditedChapter] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [featuredChapters, setFeaturedChapters] = useState([]);
  const [regionalChapters, setRegionalChapters] = useState([]);
  const [universityChapters, setUniversityChapters] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    fetchChapters();
  }, [user]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      
      // Fetch chapters from circles table where category starts with "Chapter -"
      const { data, error } = await supabase
        .from('circles')
        .select(`
          *,
          circle_members(count)
        `)
        .like('category', 'Chapter -%');
      
      if (error) throw error;
      
      // Process chapters and check membership status
      const processedChapters = await Promise.all(
        (data || []).map(async (chapter) => {
          let is_member = false;
          let has_pending_request = false;
          
          if (user) {
            // Check if user is a member
            const { data: memberData } = await supabase
              .from('circle_members')
              .select('*')
              .eq('circle_id', chapter.id)
              .eq('user_id', user.id)
              .single();
            
            is_member = !!memberData;
            
            // Check if user has a pending request
            if (!is_member && chapter.is_private) {
              const { data: requestData } = await supabase
                .from('circle_join_requests')
                .select('*')
                .eq('circle_id', chapter.id)
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .single();
              
              has_pending_request = !!requestData;
            }
          }
          
          // Extract chapter type from category (format: "Chapter - Type")
          const typeParts = chapter.category.split(' - ');
          const type = typeParts.length > 1 ? typeParts[1].toLowerCase() : 'regional';
          
          return {
            ...chapter,
            type,
            members: chapter.circle_members?.length || 0,
            is_member,
            has_pending_request,
            leadership: {
              president: 'Chapter President',
              secretary: 'Chapter Secretary',
              treasurer: 'Chapter Treasurer'
            },
            contact: {
              email: `${chapter.name.toLowerCase().replace(/\s+/g, '')}@oaa.org`,
              phone: '+233 20 123 4567'
            },
            upcomingEvents: [
              {
                title: 'Monthly Meeting',
                date: 'March 25, 2024'
              }
            ],
            projects: [
              'Community Outreach',
              'Mentorship Program'
            ]
          };
        })
      );
      
      // If no chapters from database, use placeholder data
      if (processedChapters.length === 0) {
        const placeholderChapters = [
          ...FEATURED_CHAPTERS,
          ...REGIONAL_CHAPTERS,
          ...UNIVERSITY_CHAPTERS
        ];
        setChapters(placeholderChapters);
      } else {
        setChapters(processedChapters);
      }
      
    } catch (error) {
      console.error('Error fetching chapters:', error);
      // Fall back to placeholder data
      const placeholderChapters = [
        ...FEATURED_CHAPTERS,
        ...REGIONAL_CHAPTERS,
        ...UNIVERSITY_CHAPTERS
      ];
      setChapters(placeholderChapters);
    } finally {
      setLoading(false);
    }
  };

  const joinChapter = async (chapter) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a chapter');
      return;
    }
    
    try {
      if (chapter.is_private) {
        // Create join request
        const { error } = await supabase
          .from('circle_join_requests')
          .insert([
            {
              circle_id: chapter.id,
              user_id: user.id,
            }
          ]);
        
        if (error) throw error;
        
        Alert.alert('Success', 'Join request sent! The chapter admin will review your request.');
      } else {
        // Join directly
        const { error } = await supabase
          .from('circle_members')
          .insert([
            {
              circle_id: chapter.id,
              user_id: user.id,
            }
          ]);
        
        if (error) throw error;
        
        Alert.alert('Success', 'You have joined the chapter!');
      }
      
      fetchChapters();
    } catch (error) {
      console.error('Error joining chapter:', error);
      Alert.alert('Error', 'Failed to join chapter');
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleChapterPress = (chapter) => {
    setSelectedChapter(chapter);
    setModalVisible(true);
    setIsEditing(false);
  };

  const handleEditChapter = () => {
    setEditedChapter({
      ...selectedChapter,
      leadership: selectedChapter.leadership || {},
      contact: selectedChapter.contact || {},
      gallery: selectedChapter.gallery || [],
      events: selectedChapter.events || [],
      projects: selectedChapter.projects || [],
      achievements: selectedChapter.achievements || [],
      stats: selectedChapter.stats || { members: selectedChapter.members || 0, events_count: 12, projects_count: 5 },
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedChapter(null);
  };

  const handleSaveChapter = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!editedChapter.name || !editedChapter.name.trim()) {
        Alert.alert('Validation Error', 'Chapter name is required');
        setIsSaving(false);
        return;
      }

      if (!editedChapter.description || !editedChapter.description.trim()) {
        Alert.alert('Validation Error', 'Chapter description is required');
        setIsSaving(false);
        return;
      }

      // Prepare leadership data with custom leaders
      const leadershipData = {
        president: editedChapter.leadership?.president || '',
        vicePresident: editedChapter.leadership?.vicePresident || '',
        secretary: editedChapter.leadership?.secretary || '',
        treasurer: editedChapter.leadership?.treasurer || '',
        customLeaders: (editedChapter.leadership?.customLeaders || []).filter(
          leader => leader.role && leader.name // Only save custom leaders with both role and name
        )
      };

      // Prepare contact data
      const contactData = {
        email: editedChapter.contact?.email || '',
        phone: editedChapter.contact?.phone || '',
        website: editedChapter.contact?.website || '',
        address: editedChapter.contact?.address || ''
      };

      // Prepare stats data
      const statsData = {
        members: editedChapter.stats?.members || 0,
        events_count: editedChapter.stats?.events_count || 0,
        projects_count: editedChapter.stats?.projects_count || 0
      };

      console.log('Saving chapter with data:', {
        name: editedChapter.name,
        description: editedChapter.description,
        location: editedChapter.location,
        image_url: editedChapter.image_url,
        leadership: leadershipData,
        contact: contactData,
        events: editedChapter.events,
        projects: editedChapter.projects,
        achievements: editedChapter.achievements,
        stats: statsData,
      });

      const updatePayload = {
        name: editedChapter.name.trim(),
        description: editedChapter.description.trim(),
        location: editedChapter.location?.trim() || null,
        image_url: editedChapter.image_url?.trim() || null,
        leadership: leadershipData,
        contact: contactData,
        gallery: editedChapter.gallery || [],
        events: (editedChapter.events || []).filter(event => event.title && event.date),
        projects: (editedChapter.projects || []).filter(project => project.name),
        achievements: (editedChapter.achievements || []).filter(achievement => achievement.title),
        stats: statsData,
      };

      const { data, error } = await supabase
        .from('circles')
        .update(updatePayload)
        .eq('id', selectedChapter.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        
        // Check if it's a permission error
        if (error.code === 'PGRST301' || error.message.includes('permission')) {
          Alert.alert(
            'Permission Denied',
            'You do not have permission to edit this chapter. Only the chapter creator can make changes.'
          );
        } else if (error.code === '42501') {
          Alert.alert(
            'Permission Denied',
            'You need to be logged in and be the chapter creator to edit this chapter.'
          );
        } else {
          throw error;
        }
        setIsSaving(false);
        return;
      }

      console.log('Chapter updated successfully:', data);

      Alert.alert('Success', 'Chapter updated successfully!');
      setIsEditing(false);
      
      // Update the selected chapter with the new data
      const updatedChapter = { ...selectedChapter, ...data };
      setSelectedChapter(updatedChapter);
      
      // Refresh the chapter list
      await fetchChapters();
    } catch (error) {
      console.error('Error updating chapter:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to update chapter. Please try again or contact support.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const pickAndUploadImage = async () => {
    try {
      console.log('[GalleryUpload] Button pressed');
      // Check if in editing mode
      if (!isEditing) {
        Alert.alert('Not in Edit Mode', 'Please click the Edit button first.');
        console.log('[GalleryUpload] Not in edit mode');
        return;
      }

      // Check if editedChapter is initialized
      if (!editedChapter) {
        Alert.alert('Error', 'Chapter data not loaded. Please try again.');
        console.log('[GalleryUpload] editedChapter not loaded');
        return;
      }

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[GalleryUpload] Permission status:', status);
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload images.'
        );
        console.log('[GalleryUpload] Permission not granted');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
        aspect: [16, 9],
      });
      console.log('[GalleryUpload] ImagePicker result:', result);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert('Cancelled', 'Image selection was cancelled.');
        console.log('[GalleryUpload] Image picker cancelled or no image selected');
        return;
      }

      const imageUri = result.assets[0].uri;
      console.log('[GalleryUpload] Selected image URI:', imageUri);
      // Upload the image
      await uploadImageToStorage(imageUri);
      console.log('[GalleryUpload] uploadImageToStorage finished');
    } catch (error) {
      console.error('[GalleryUpload] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickAndUploadCoverImage = async () => {
    try {
      console.log('[ChangeCover] Button pressed');
      // Check if in editing mode
      if (!isEditing) {
        Alert.alert('Not in Edit Mode', 'Please click the Edit button first.');
        console.log('[ChangeCover] Not in edit mode');
        return;
      }

      // Check if editedChapter is initialized
      if (!editedChapter) {
        Alert.alert('Error', 'Chapter data not loaded. Please try again.');
        console.log('[ChangeCover] editedChapter not loaded');
        return;
      }

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[ChangeCover] Permission status:', status);
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload images.'
        );
        console.log('[ChangeCover] Permission not granted');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
        aspect: [16, 9],
      });
      console.log('[ChangeCover] ImagePicker result:', result);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert('Cancelled', 'Image selection was cancelled.');
        console.log('[ChangeCover] Image picker cancelled or no image selected');
        return;
      }

      const imageUri = result.assets[0].uri;
      console.log('[ChangeCover] Selected image URI:', imageUri);
      // Upload the cover image
      await uploadCoverImageToStorage(imageUri);
      console.log('[ChangeCover] uploadCoverImageToStorage finished');
    } catch (error) {
      console.error('[ChangeCover] Error picking cover image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadCoverImageToStorage = async (uri: string) => {
    try {
      setUploadingImage(true);
      console.log('[ChangeCover] uploadCoverImageToStorage called with URI:', uri);

      if (!selectedChapter || !selectedChapter.id) {
        Alert.alert('Error', 'No chapter selected. Please try again.');
        setUploadingImage(false);
        console.log('[ChangeCover] No chapter selected');
        return;
      }

      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `cover-${Date.now()}.${fileExt}`;
      const filePath = `chapters/${selectedChapter.id}/${fileName}`;

      console.log('[ChangeCover] Starting cover image upload...');
      console.log('[ChangeCover] File path:', filePath);

      // Fetch the file as ArrayBuffer
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      console.log('[ChangeCover] Uploading cover image to chapter-images bucket...');
      console.log('[ChangeCover] File size:', arrayBuffer.byteLength, 'bytes');

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chapter-images')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[ChangeCover] Upload error:', error);
        if (error.message?.includes('not found') || error.message?.includes('bucket')) {
          Alert.alert(
            'Storage Not Configured',
            'The chapter-images storage bucket needs to be created. Please run the CREATE_CHAPTER_IMAGES_BUCKET.sql migration.'
          );
        } else if (error.message?.includes('policy')) {
          Alert.alert(
            'Permission Error',
            'Storage permissions are not configured correctly.'
          );
        } else {
          Alert.alert('Upload Failed', `Error: ${error.message || 'Unknown error'}`);
        }
        setUploadingImage(false);
        return;
      }

      console.log('[ChangeCover] Cover image uploaded successfully:', data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chapter-images')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      console.log('[ChangeCover] Public URL:', publicUrl);

      if (!publicUrl) {
        Alert.alert('Error', 'Failed to get public URL for uploaded image.');
        setUploadingImage(false);
        console.log('[ChangeCover] Failed to get public URL');
        return;
      }

      // Update the chapter's cover image
      setEditedChapter({
        ...editedChapter,
        image_url: publicUrl
      });
      console.log('[ChangeCover] setEditedChapter called');

      // Also update selectedChapter for immediate visual feedback
      setSelectedChapter({
        ...selectedChapter,
        image_url: publicUrl
      });
      console.log('[ChangeCover] setSelectedChapter called');

      Alert.alert('Success', 'Cover image updated successfully!');
    } catch (error: any) {
      console.error('[ChangeCover] Error uploading cover image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImageToStorage = async (uri: string) => {
    try {
      setUploadingImage(true);
      console.log('[GalleryUpload] uploadImageToStorage called with URI:', uri);

      if (!selectedChapter || !selectedChapter.id) {
        Alert.alert('Error', 'No chapter selected. Please try again.');
        setUploadingImage(false);
        console.log('[GalleryUpload] No chapter selected');
        return;
      }

      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chapters/${selectedChapter.id}/${fileName}`;

      console.log('[GalleryUpload] Starting image upload...');
      console.log('[GalleryUpload] File path:', filePath);
      console.log('[GalleryUpload] URI:', uri);

      // Fetch the file as ArrayBuffer for better compatibility
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      console.log('[GalleryUpload] Uploading to chapter-images bucket...');
      console.log('[GalleryUpload] File size:', arrayBuffer.byteLength, 'bytes');

      // Upload to Supabase Storage using ArrayBuffer
      const { data, error } = await supabase.storage
        .from('chapter-images')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
        });
      // ...existing code...
      Alert.alert('Success', 'Image uploaded and added to gallery!');
    } catch (error: any) {
      console.error('[GalleryUpload] Error uploading image:', error);
      let errorMessage = 'Failed to upload image. Please try again.';
      if (error.message) {
        if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Failed to read the image file. Please try selecting another image.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {selectedChapter && (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Hero Image with Gradient Overlay */}
              <View style={styles.heroContainer}>
                <Image source={{ uri: selectedChapter.image_url || selectedChapter.image }} style={styles.heroImage} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.heroGradient}
                >
                  <View style={styles.heroTopButtons}>
                    <TouchableOpacity 
                      style={styles.closeButtonHero}
                      onPress={() => setModalVisible(false)}
                    >
                      <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    {!isEditing ? (
                      <TouchableOpacity 
                        style={styles.editButtonHero}
                        onPress={handleEditChapter}
                      >
                        <Edit size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.editActionsHero}>
                        <TouchableOpacity 
                          style={styles.cancelButtonHero}
                          onPress={handleCancelEdit}
                        >
                          <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.saveButtonHero}
                          onPress={handleSaveChapter}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Save size={20} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  {isEditing && (
                    <TouchableOpacity 
                      style={styles.changeCoverButton}
                      onPress={pickAndUploadCoverImage}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Upload size={18} color="#FFFFFF" />
                          <Text style={styles.changeCoverButtonText}>Change Cover</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>{selectedChapter.name}</Text>
                    <View style={styles.heroSubInfo}>
                      <View style={styles.heroInfoItem}>
                        <MapPin size={16} color="#FFFFFF" />
                        <Text style={styles.heroInfoText}>{selectedChapter.location || 'Location not specified'}</Text>
                      </View>
                      <View style={styles.heroInfoItem}>
                        <Users size={16} color="#FFFFFF" />
                        <Text style={styles.heroInfoText}>{selectedChapter.members || 0} Members</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.modalBody}>
                {/* Chapter Name - Editable */}
                {isEditing && (
                  <View style={styles.editFormGroup}>
                    <Text style={styles.editLabel}>Chapter Name</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editedChapter?.name || ''}
                      onChangeText={(text) => setEditedChapter({...editedChapter, name: text})}
                      placeholder="Enter chapter name"
                      placeholderTextColor="#999999"
                    />
                  </View>
                )}

                {/* Location - Editable */}
                {isEditing && (
                  <View style={styles.editFormGroup}>
                    <Text style={styles.editLabel}>Location</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editedChapter?.location || ''}
                      onChangeText={(text) => setEditedChapter({...editedChapter, location: text})}
                      placeholder="Enter location"
                      placeholderTextColor="#999999"
                    />
                  </View>
                )}

                {/* Image URL - Editable */}
                {isEditing && (
                  <View style={styles.editFormGroup}>
                    <Text style={styles.editLabel}>Image URL</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editedChapter?.image_url || ''}
                      onChangeText={(text) => setEditedChapter({...editedChapter, image_url: text})}
                      placeholder="Enter image URL"
                      placeholderTextColor="#999999"
                    />
                  </View>
                )}

                {/* About Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>About</Text>
                  {isEditing ? (
                    <TextInput
                      style={[styles.editInput, styles.editTextArea]}
                      value={editedChapter?.description || ''}
                      onChangeText={(text) => setEditedChapter({...editedChapter, description: text})}
                      placeholder="Enter chapter description"
                      placeholderTextColor="#999999"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  ) : (
                    <Text style={styles.aboutText}>
                      {selectedChapter.description || `The ${selectedChapter.name} is a vibrant community of Akora members dedicated to fostering professional growth, networking, and community development. We bring together alumni from various backgrounds to create lasting impact in our region.`}
                    </Text>
                  )}
                </View>

                {/* Stats Row */}
                {isEditing ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Statistics</Text>
                    <View style={styles.editStatsForm}>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Members Count</Text>
                        <TextInput
                          style={styles.editInput}
                          value={String(editedChapter?.stats?.members || editedChapter?.members || 0)}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            stats: {...(editedChapter?.stats || {}), members: parseInt(text) || 0}
                          })}
                          placeholder="0"
                          keyboardType="number-pad"
                          placeholderTextColor="#999999"
                        />
                      </View>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Events Count</Text>
                        <TextInput
                          style={styles.editInput}
                          value={String(editedChapter?.stats?.events_count || 0)}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            stats: {...(editedChapter?.stats || {}), events_count: parseInt(text) || 0}
                          })}
                          placeholder="0"
                          keyboardType="number-pad"
                          placeholderTextColor="#999999"
                        />
                      </View>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Projects Count</Text>
                        <TextInput
                          style={styles.editInput}
                          value={String(editedChapter?.stats?.projects_count || 0)}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            stats: {...(editedChapter?.stats || {}), projects_count: parseInt(text) || 0}
                          })}
                          placeholder="0"
                          keyboardType="number-pad"
                          placeholderTextColor="#999999"
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Users size={24} color="#4169E1" />
                      <Text style={styles.statNumber}>{selectedChapter.stats?.members || selectedChapter.members || 0}</Text>
                      <Text style={styles.statLabel}>Members</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Calendar size={24} color="#10B981" />
                      <Text style={styles.statNumber}>{selectedChapter.stats?.events_count || selectedChapter.events_count || 12}</Text>
                      <Text style={styles.statLabel}>Events</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Building2 size={24} color="#F59E0B" />
                      <Text style={styles.statNumber}>{selectedChapter.stats?.projects_count || selectedChapter.projects_count || 5}</Text>
                      <Text style={styles.statLabel}>Projects</Text>
                    </View>
                  </View>
                )}

                {/* Photo Gallery */}
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.modalSectionTitle}>Photo Gallery</Text>
                    {isEditing && (
                      <View style={styles.galleryButtonsRow}>
                        <TouchableOpacity
                          style={styles.uploadFromDeviceButton}
                          onPress={pickAndUploadImage}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <ActivityIndicator size="small" color="#0F172A" />
                          ) : (
                            <>
                              <Upload size={16} color="#4169E1" />
                              <Text style={styles.addItemButtonText}>Upload</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.addItemButton}
                          onPress={() => {
                            const newGallery = [...(editedChapter?.gallery || []), ''];
                            setEditedChapter({...editedChapter, gallery: newGallery});
                          }}
                        >
                          <Plus size={16} color="#4169E1" />
                          <Text style={styles.addItemButtonText}>Add URL</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  {isEditing ? (
                    <View style={styles.editGalleryForm}>
                      {uploadingImage && (
                        <View style={styles.uploadingIndicator}>
                          <ActivityIndicator size="large" color="#0F172A" />
                          <Text style={styles.uploadingText}>Uploading image...</Text>
                        </View>
                      )}
                      {(editedChapter?.gallery || []).length === 0 ? (
                        <View style={styles.emptyGalleryEditState}>
                          <Text style={styles.emptyStateText}>No photos yet.</Text>
                          <Text style={styles.emptyStateSubtext}>Click "Upload" to add from device or "Add URL" to add a web image.</Text>
                        </View>
                      ) : (
                        (editedChapter?.gallery || []).map((imageUrl, index) => (
                          <View key={index} style={styles.editGalleryItemCard}>
                            <View style={styles.editGalleryPreviewContainer}>
                              {imageUrl && imageUrl.trim() !== '' ? (
                                <Image 
                                  source={{ uri: imageUrl }} 
                                  style={styles.editGalleryPreview}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.editGalleryPlaceholder}>
                                  <Text style={styles.editGalleryPlaceholderText}>No Image</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.editGalleryInputContainer}>
                              <Text style={styles.editLabel}>Photo {index + 1} URL</Text>
                              <TextInput
                                style={styles.editInput}
                                value={imageUrl}
                                onChangeText={(text) => {
                                  const newGallery = [...(editedChapter?.gallery || [])];
                                  newGallery[index] = text;
                                  setEditedChapter({...editedChapter, gallery: newGallery});
                                }}
                                placeholder="https://example.com/image.jpg"
                                placeholderTextColor="#999999"
                                multiline={false}
                              />
                              <TouchableOpacity
                                style={styles.deleteGalleryButton}
                                onPress={() => {
                                  const newGallery = (editedChapter?.gallery || []).filter((_, i) => i !== index);
                                  setEditedChapter({...editedChapter, gallery: newGallery});
                                }}
                              >
                                <Trash size={16} color="#EF4444" />
                                <Text style={styles.deleteGalleryButtonText}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  ) : (
                    <>
                      {selectedChapter.gallery && selectedChapter.gallery.length > 0 ? (
                        <View style={styles.galleryGrid}>
                          {selectedChapter.gallery.map((imageUrl, index) => (
                            <TouchableOpacity 
                              key={index} 
                              style={styles.galleryGridItem}
                              onPress={() => {
                                // TODO: Open full-screen image viewer
                                Alert.alert('Photo Gallery', `Viewing photo ${index + 1} of ${selectedChapter.gallery.length}`);
                              }}
                            >
                              <Image 
                                source={{ uri: imageUrl }} 
                                style={styles.galleryGridImage} 
                                resizeMode="cover"
                              />
                              <View style={styles.galleryImageOverlay}>
                                <Text style={styles.galleryImageCount}>{index + 1}/{selectedChapter.gallery.length}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyGalleryState}>
                          <Text style={styles.emptyStateText}>No photos available yet.</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Leadership Team */}
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.modalSectionTitle}>Leadership Team</Text>
                    {isEditing && (
                      <TouchableOpacity
                        style={styles.addItemButton}
                        onPress={() => {
                          const currentLeaders = editedChapter?.leadership?.customLeaders || [];
                          setEditedChapter({
                            ...editedChapter,
                            leadership: {
                              ...(editedChapter?.leadership || {}),
                              customLeaders: [...currentLeaders, { role: '', name: '', icon: '👤' }]
                            }
                          });
                        }}
                      >
                        <Plus size={16} color="#4169E1" />
                        <Text style={styles.addItemButtonText}>Add Leader</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {isEditing ? (
                    <View style={styles.editLeadershipForm}>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>President</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedChapter?.leadership?.president || ''}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            leadership: {...(editedChapter?.leadership || {}), president: text}
                          })}
                          placeholder="President name"
                          placeholderTextColor="#999999"
                        />
                      </View>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Vice President</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedChapter?.leadership?.vicePresident || ''}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            leadership: {...(editedChapter?.leadership || {}), vicePresident: text}
                          })}
                          placeholder="Vice President name"
                          placeholderTextColor="#999999"
                        />
                      </View>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Secretary</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedChapter?.leadership?.secretary || ''}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            leadership: {...(editedChapter?.leadership || {}), secretary: text}
                          })}
                          placeholder="Secretary name"
                          placeholderTextColor="#999999"
                        />
                      </View>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Treasurer</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedChapter?.leadership?.treasurer || ''}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            leadership: {...(editedChapter?.leadership || {}), treasurer: text}
                          })}
                          placeholder="Treasurer name"
                          placeholderTextColor="#999999"
                        />
                      </View>
                      
                      {/* Custom Leaders */}
                      {(editedChapter?.leadership?.customLeaders || []).map((leader, index) => (
                        <View key={index} style={styles.editCustomLeaderItem}>
                          <View style={styles.editEventHeader}>
                            <Text style={styles.editEventNumber}>Additional Leader {index + 1}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newLeaders = (editedChapter?.leadership?.customLeaders || []).filter((_, i) => i !== index);
                                setEditedChapter({
                                  ...editedChapter,
                                  leadership: {...(editedChapter?.leadership || {}), customLeaders: newLeaders}
                                });
                              }}
                            >
                              <Trash size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Role/Title</Text>
                            <TextInput
                              style={styles.editInput}
                              value={leader.role || ''}
                              onChangeText={(text) => {
                                const newLeaders = [...(editedChapter?.leadership?.customLeaders || [])];
                                newLeaders[index] = {...newLeaders[index], role: text};
                                setEditedChapter({
                                  ...editedChapter,
                                  leadership: {...(editedChapter?.leadership || {}), customLeaders: newLeaders}
                                });
                              }}
                              placeholder="e.g., Communications Director"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Name</Text>
                            <TextInput
                              style={styles.editInput}
                              value={leader.name || ''}
                              onChangeText={(text) => {
                                const newLeaders = [...(editedChapter?.leadership?.customLeaders || [])];
                                newLeaders[index] = {...newLeaders[index], name: text};
                                setEditedChapter({
                                  ...editedChapter,
                                  leadership: {...(editedChapter?.leadership || {}), customLeaders: newLeaders}
                                });
                              }}
                              placeholder="Leader name"
                              placeholderTextColor="#999999"
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.leadershipGrid}>
                      {[
                        { role: 'President', name: selectedChapter.leadership?.president || 'To be announced', icon: '👤' },
                        { role: 'Vice President', name: selectedChapter.leadership?.vicePresident || 'To be announced', icon: '👥' },
                        { role: 'Secretary', name: selectedChapter.leadership?.secretary || 'To be announced', icon: '📝' },
                        { role: 'Treasurer', name: selectedChapter.leadership?.treasurer || 'To be announced', icon: '💰' },
                        ...(selectedChapter.leadership?.customLeaders || [])
                      ].map((leader, index) => (
                        <View key={index} style={styles.leaderCard}>
                          <Text style={styles.leaderIcon}>{leader.icon}</Text>
                          <Text style={styles.leaderRole}>{leader.role}</Text>
                          <Text style={styles.leaderName}>{leader.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Upcoming Events */}
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.modalSectionTitle}>Upcoming Events</Text>
                    {!isEditing && (
                      <TouchableOpacity>
                        <Text style={styles.seeAllLink}>See All</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {isEditing ? (
                    <View style={styles.editEventsForm}>
                      {(editedChapter?.events || []).map((event, index) => (
                        <View key={index} style={styles.editEventItem}>
                          <View style={styles.editEventHeader}>
                            <Text style={styles.editEventNumber}>Event {index + 1}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newEvents = (editedChapter?.events || []).filter((_, i) => i !== index);
                                setEditedChapter({...editedChapter, events: newEvents});
                              }}
                            >
                              <Trash size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Event Title</Text>
                            <TextInput
                              style={styles.editInput}
                              value={event.title || ''}
                              onChangeText={(text) => {
                                const newEvents = [...(editedChapter?.events || [])];
                                newEvents[index] = {...newEvents[index], title: text};
                                setEditedChapter({...editedChapter, events: newEvents});
                              }}
                              placeholder="Event name"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Date</Text>
                            <TextInput
                              style={styles.editInput}
                              value={event.date || ''}
                              onChangeText={(text) => {
                                const newEvents = [...(editedChapter?.events || [])];
                                newEvents[index] = {...newEvents[index], date: text};
                                setEditedChapter({...editedChapter, events: newEvents});
                              }}
                              placeholder="Dec 15, 2025"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Time</Text>
                            <TextInput
                              style={styles.editInput}
                              value={event.time || ''}
                              onChangeText={(text) => {
                                const newEvents = [...(editedChapter?.events || [])];
                                newEvents[index] = {...newEvents[index], time: text};
                                setEditedChapter({...editedChapter, events: newEvents});
                              }}
                              placeholder="6:00 PM"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Expected Attendees</Text>
                            <TextInput
                              style={styles.editInput}
                              value={String(event.attendees || '')}
                              onChangeText={(text) => {
                                const newEvents = [...(editedChapter?.events || [])];
                                newEvents[index] = {...newEvents[index], attendees: parseInt(text) || 0};
                                setEditedChapter({...editedChapter, events: newEvents});
                              }}
                              placeholder="0"
                              keyboardType="number-pad"
                              placeholderTextColor="#999999"
                            />
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          const newEvents = [...(editedChapter?.events || []), { title: '', date: '', time: '', attendees: 0 }];
                          setEditedChapter({...editedChapter, events: newEvents});
                        }}
                      >
                        <Plus size={18} color="#4169E1" />
                        <Text style={styles.addButtonText}>Add Event</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {(selectedChapter.events && selectedChapter.events.length > 0 ? selectedChapter.events : [
                        { title: 'Chapter Networking Night', date: 'Dec 15, 2025', time: '6:00 PM', attendees: 45 },
                        { title: 'Annual General Meeting', date: 'Dec 28, 2025', time: '3:00 PM', attendees: 120 },
                        { title: 'Community Outreach', date: 'Jan 10, 2026', time: '10:00 AM', attendees: 30 },
                      ]).map((event, index) => (
                        <View key={index} style={styles.eventCard}>
                          <View style={styles.eventDateBox}>
                            <Text style={styles.eventMonth}>{event.date.split(' ')[0]}</Text>
                            <Text style={styles.eventDay}>{event.date.split(' ')[1].replace(',', '')}</Text>
                          </View>
                          <View style={styles.eventDetails}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <View style={styles.eventMetaRow}>
                              <View style={styles.eventMeta}>
                                <Calendar size={14} color="#666666" />
                                <Text style={styles.eventMetaText}>{event.time}</Text>
                              </View>
                              <View style={styles.eventMeta}>
                                <Users size={14} color="#666666" />
                                <Text style={styles.eventMetaText}>{event.attendees} attending</Text>
                              </View>
                            </View>
                          </View>
                          <TouchableOpacity style={styles.rsvpButton}>
                            <Text style={styles.rsvpButtonText}>RSVP</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {/* Active Projects */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Active Projects</Text>
                  {isEditing ? (
                    <View style={styles.editProjectsForm}>
                      {(editedChapter?.projects || []).map((project, index) => (
                        <View key={index} style={styles.editProjectItem}>
                          <View style={styles.editEventHeader}>
                            <Text style={styles.editEventNumber}>Project {index + 1}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newProjects = (editedChapter?.projects || []).filter((_, i) => i !== index);
                                setEditedChapter({...editedChapter, projects: newProjects});
                              }}
                            >
                              <Trash size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Project Name</Text>
                            <TextInput
                              style={styles.editInput}
                              value={project.name || ''}
                              onChangeText={(text) => {
                                const newProjects = [...(editedChapter?.projects || [])];
                                newProjects[index] = {...newProjects[index], name: text};
                                setEditedChapter({...editedChapter, projects: newProjects});
                              }}
                              placeholder="Project name"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Description</Text>
                            <TextInput
                              style={styles.editInput}
                              value={project.description || ''}
                              onChangeText={(text) => {
                                const newProjects = [...(editedChapter?.projects || [])];
                                newProjects[index] = {...newProjects[index], description: text};
                                setEditedChapter({...editedChapter, projects: newProjects});
                              }}
                              placeholder="Project description"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Progress (%)</Text>
                            <TextInput
                              style={styles.editInput}
                              value={String(project.progress || '')}
                              onChangeText={(text) => {
                                const newProjects = [...(editedChapter?.projects || [])];
                                newProjects[index] = {...newProjects[index], progress: parseInt(text) || 0};
                                setEditedChapter({...editedChapter, projects: newProjects});
                              }}
                              placeholder="0-100"
                              keyboardType="number-pad"
                              placeholderTextColor="#999999"
                            />
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          const newProjects = [...(editedChapter?.projects || []), { name: '', description: '', progress: 0 }];
                          setEditedChapter({...editedChapter, projects: newProjects});
                        }}
                      >
                        <Plus size={18} color="#4169E1" />
                        <Text style={styles.addButtonText}>Add Project</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {(selectedChapter.projects && selectedChapter.projects.length > 0 ? selectedChapter.projects : [
                        { name: 'Mentorship Program', description: 'Connecting experienced professionals with young alumni', progress: 75 },
                        { name: 'Scholarship Fund', description: 'Supporting students in need', progress: 60 },
                        { name: 'Community Development', description: 'Infrastructure projects in local communities', progress: 40 },
                      ]).map((project, index) => (
                        <View key={index} style={styles.projectCard}>
                          <Text style={styles.projectName}>{project.name}</Text>
                          <Text style={styles.projectDescription}>{project.description}</Text>
                          <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${project.progress}%` }]} />
                          </View>
                          <Text style={styles.progressText}>{project.progress}% Complete</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {/* Achievements */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Recent Achievements</Text>
                  {isEditing ? (
                    <View style={styles.editAchievementsForm}>
                      {(editedChapter?.achievements || []).map((achievement, index) => (
                        <View key={index} style={styles.editAchievementItem}>
                          <View style={styles.editEventHeader}>
                            <Text style={styles.editEventNumber}>Achievement {index + 1}</Text>
                            <TouchableOpacity
                              onPress={() => {
                                const newAchievements = (editedChapter?.achievements || []).filter((_, i) => i !== index);
                                setEditedChapter({...editedChapter, achievements: newAchievements});
                              }}
                            >
                              <Trash size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Achievement Title</Text>
                            <TextInput
                              style={styles.editInput}
                              value={achievement.title || ''}
                              onChangeText={(text) => {
                                const newAchievements = [...(editedChapter?.achievements || [])];
                                newAchievements[index] = {...newAchievements[index], title: text};
                                setEditedChapter({...editedChapter, achievements: newAchievements});
                              }}
                              placeholder="Achievement name"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Icon (Emoji)</Text>
                            <TextInput
                              style={styles.editInput}
                              value={achievement.icon || ''}
                              onChangeText={(text) => {
                                const newAchievements = [...(editedChapter?.achievements || [])];
                                newAchievements[index] = {...newAchievements[index], icon: text};
                                setEditedChapter({...editedChapter, achievements: newAchievements});
                              }}
                              placeholder="🏆"
                              placeholderTextColor="#999999"
                            />
                          </View>
                          <View style={styles.editFormGroup}>
                            <Text style={styles.editLabel}>Date</Text>
                            <TextInput
                              style={styles.editInput}
                              value={achievement.date || ''}
                              onChangeText={(text) => {
                                const newAchievements = [...(editedChapter?.achievements || [])];
                                newAchievements[index] = {...newAchievements[index], date: text};
                                setEditedChapter({...editedChapter, achievements: newAchievements});
                              }}
                              placeholder="Oct 2024"
                              placeholderTextColor="#999999"
                            />
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          const newAchievements = [...(editedChapter?.achievements || []), { title: '', icon: '🏆', date: '' }];
                          setEditedChapter({...editedChapter, achievements: newAchievements});
                        }}
                      >
                        <Plus size={18} color="#4169E1" />
                        <Text style={styles.addButtonText}>Add Achievement</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {(selectedChapter.achievements && selectedChapter.achievements.length > 0 ? selectedChapter.achievements : [
                        { title: 'Best Chapter Award 2024', icon: '🏆', date: 'Oct 2024' },
                        { title: 'Community Impact Recognition', icon: '⭐', date: 'Sep 2024' },
                        { title: 'Membership Growth Excellence', icon: '📈', date: 'Aug 2024' },
                      ]).map((achievement, index) => (
                        <View key={index} style={styles.achievementCard}>
                          <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                          <View style={styles.achievementInfo}>
                            <Text style={styles.achievementTitle}>{achievement.title}</Text>
                            <Text style={styles.achievementDate}>{achievement.date}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {/* Contact Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Get In Touch</Text>
                  {isEditing ? (
                    <View style={styles.editContactForm}>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Contact Email</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedChapter?.contact?.email || ''}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            contact: {...(editedChapter?.contact || {}), email: text}
                          })}
                          placeholder="chapter@email.com"
                          placeholderTextColor="#999999"
                          keyboardType="email-address"
                        />
                      </View>
                      <View style={styles.editFormGroup}>
                        <Text style={styles.editLabel}>Contact Phone</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedChapter?.contact?.phone || ''}
                          onChangeText={(text) => setEditedChapter({
                            ...editedChapter, 
                            contact: {...(editedChapter?.contact || {}), phone: text}
                          })}
                          placeholder="+233 XX XXX XXXX"
                          placeholderTextColor="#999999"
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.contactCard}>
                      <TouchableOpacity style={styles.contactRow}>
                        <View style={styles.contactIconContainer}>
                          <Mail size={20} color="#4169E1" />
                        </View>
                        <View style={styles.contactTextContainer}>
                          <Text style={styles.contactLabel}>Email</Text>
                          <Text style={styles.contactValue}>{selectedChapter.contact?.email || `${selectedChapter.name.toLowerCase().replace(/\s+/g, '')}@akora.org`}</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.contactRow}>
                        <View style={styles.contactIconContainer}>
                          <Phone size={20} color="#4169E1" />
                        </View>
                        <View style={styles.contactTextContainer}>
                          <Text style={styles.contactLabel}>Phone</Text>
                          <Text style={styles.contactValue}>{selectedChapter.contact?.phone || '+233 XX XXX XXXX'}</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.contactRow}>
                        <View style={styles.contactIconContainer}>
                          <MapPin size={20} color="#4169E1" />
                        </View>
                        <View style={styles.contactTextContainer}>
                          <Text style={styles.contactLabel}>Office</Text>
                          <Text style={styles.contactValue}>{selectedChapter.address || selectedChapter.location}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  {selectedChapter.is_member ? (
                    <>
                      <TouchableOpacity style={styles.primaryActionButton}>
                        <MessageCircle size={20} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>Open Chapter Chat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryActionButton}>
                        <Calendar size={20} color="#4169E1" />
                        <Text style={styles.secondaryActionText}>View Events Calendar</Text>
                      </TouchableOpacity>
                    </>
                  ) : selectedChapter.has_pending_request ? (
                    <View style={styles.pendingActionButton}>
                      <Text style={styles.pendingActionText}>Request Pending - We'll notify you soon</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.primaryActionButton}
                      onPress={() => joinChapter(selectedChapter)}
                    >
                      <Users size={20} color="#FFFFFF" />
                      <Text style={styles.primaryActionText}>
                        {selectedChapter.is_private ? 'Request to Join Chapter' : 'Join Chapter'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ height: 40 }} />
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  globeButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  typesScroll: {
    marginBottom: 24,
  },
  typesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  activeTypeButton: {
    backgroundColor: '#4169E1',
  },
  typeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  activeTypeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  featuredContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  chapterTypeTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  chapterTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    textTransform: 'capitalize',
  },
  featuredInfo: {
    padding: 16,
    gap: 8,
  },
  chapterName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  joinButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  memberBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  memberBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  memberBadgeSmall: {
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  memberBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  pendingBadgeSmall: {
    backgroundColor: '#F59E0B',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  pendingBadgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  chapterCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chapterImage: {
    width: 100,
    height: 100,
  },
  chapterInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  chapterCardName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  chapterDetails: {
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  universityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  universityCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  universityImage: {
    width: '100%',
    height: 120,
  },
  universityInfo: {
    padding: 12,
    gap: 4,
  },
  universityName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  universityDetails: {
    gap: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalScroll: {
    flex: 1,
  },
  heroContainer: {
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
  },
  heroTopButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  closeButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(65, 105, 225, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActionsHero: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(65, 105, 225, 0.9)',
    marginTop: 60,
    alignSelf: 'center',
  },
  changeCoverButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  editFormGroup: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  editTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  editLeadershipForm: {
    gap: 12,
  },
  editContactForm: {
    gap: 12,
  },
  editStatsForm: {
    gap: 12,
  },
  editGalleryForm: {
    gap: 12,
  },
  editGalleryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  editEventsForm: {
    gap: 16,
  },
  editEventItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  editEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editEventNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  editProjectsForm: {
    gap: 16,
  },
  editProjectItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  editAchievementsForm: {
    gap: 16,
  },
  editAchievementItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  heroTextContainer: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  heroSubInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  heroInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 28,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  galleryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  galleryItem: {
    marginRight: 12,
  },
  galleryImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  leadershipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  leaderCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  leaderIcon: {
    fontSize: 32,
  },
  leaderRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  leaderName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 12,
  },
  eventDateBox: {
    backgroundColor: '#4169E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  eventMonth: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  eventDay: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  eventDetails: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  rsvpButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rsvpButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  projectCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  projectName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 6,
  },
  projectDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  contactCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalActions: {
    gap: 12,
    marginTop: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryActionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  pendingActionButton: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: '#4169E1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  addItemButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  editCustomLeaderItem: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  editGalleryForm: {
    gap: 16,
  },
  editGalleryItemCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editGalleryPreviewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  editGalleryPreview: {
    width: '100%',
    height: '100%',
  },
  editGalleryPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  editGalleryPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  editGalleryInputContainer: {
    gap: 8,
  },
  deleteGalleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  deleteGalleryButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  galleryGridItem: {
    width: (width - 80) / 2,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  galleryGridImage: {
    width: '100%',
    height: '100%',
  },
  galleryImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  galleryImageCount: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyGalleryState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 4,
  },
  galleryButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadFromDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
    minWidth: 90,
    justifyContent: 'center',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  uploadingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0284C7',
  },
  emptyGalleryEditState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: 8,
  },
});