import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useRef, useState } from 'react';
import { SplashScreen, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, Globe, Users, Lock, X, ChevronDown, Video as VideoIcon, Edit3, Sparkles, MessageSquare } from 'lucide-react-native';
import MediaEditorModal from '@/components/MediaEditorModal';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { INTEREST_LIBRARY } from '@/lib/interest-data';
import { useAuth } from '@/hooks/useAuth';
import { isCloudinaryConfigured, processVideoWithCloudinary } from '@/lib/cloudinary';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const CATEGORY_GROUPS = INTEREST_LIBRARY.map((category) => ({
  id: category.id,
  label: category.label,
  subcategories: category.subcategories ?? [],
}));

type CategoryOption = {
  value: string;
  label: string;
  isSubcategory: boolean;
};

const CATEGORY_OPTIONS: CategoryOption[] = CATEGORY_GROUPS.flatMap((group) => {
  const entries: CategoryOption[] = [
    { value: group.id, label: group.label, isSubcategory: false },
  ];

  group.subcategories.forEach((sub) => {
    entries.push({
      value: sub.id,
      label: `${group.label} • ${sub.label}`,
      isSubcategory: true,
    });
  });

  return entries;
});

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see this post' },
  { value: 'friends_only', label: 'Friends Only', icon: Users, description: 'Only your friends can see this' },
  { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see this' },
];

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  // Optional edit metadata for videos
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
  originalDuration?: number;
  // Indicates we couldn't process locally and need server-side (Cloudinary) transform
  requiresServerProcessing?: boolean;
}

// Component to present a trimmed segment preview without needing a physically trimmed file.
const TrimmedVideoPreview = ({ uri, trimStart, trimEnd, muted }: { uri: string; trimStart: number; trimEnd: number; muted?: boolean }) => {
  const videoRef = useRef<Video | null>(null);
  const durationRef = useRef<number>(0);
  const playingRef = useRef(false);

  const onStatusUpdate = (status: any) => {
    if (!status || !status.isLoaded) return;
    if (status.durationMillis && !durationRef.current) {
      durationRef.current = status.durationMillis / 1000;
      // Seek to trimStart once video loads
      videoRef.current?.setPositionAsync(trimStart * 1000).then(() => {
        videoRef.current?.playAsync();
        playingRef.current = true;
      }).catch(() => {});
    }
    if (status.positionMillis && playingRef.current) {
      const pos = status.positionMillis / 1000;
      if (pos > trimEnd) {
        // Loop back within trimmed window
        videoRef.current?.setPositionAsync(trimStart * 1000).catch(()=>{});
      }
    }
  };

  return (
    <Video
      ref={(r) => (videoRef.current = r)}
      source={{ uri }}
      style={styles.previewImage}
      resizeMode={ResizeMode.COVER}
      isMuted={!!muted}
      shouldPlay={false}
      isLooping
      onPlaybackStatusUpdate={onStatusUpdate}
    />
  );
};

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ highlight?: string; autoPick?: string; ht?: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<{ uri: string; type: 'image' | 'video'; index: number } | null>(null);
  const [category, setCategory] = useState('general');
  const [visibility, setVisibility] = useState('friends_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [addToHighlights, setAddToHighlights] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState('');
  
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
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session:', session?.user?.id);
      console.log('User from hook:', user?.id);
    };
    checkAuth();
  }, [user]);

  // Preconfigure when launched for creating a highlight directly
  useEffect(() => {
    if (params?.highlight === '1') {
      setAddToHighlights(true);
      if (typeof params.ht === 'string' && params.ht.length > 0) {
        try {
          setHighlightTitle(decodeURIComponent(params.ht));
        } catch {
          setHighlightTitle(params.ht);
        }
      }
    }
  }, [params?.highlight, params?.ht]);

  // Auto-open media picker if requested (first-time only)
  useEffect(() => {
    let opened = false;
    const tryOpen = async () => {
      if (!opened && params?.autoPick === '1' && fontsLoaded && user && media.length === 0) {
        opened = true;
        // slight delay to ensure UI is ready
        setTimeout(() => {
          pickMedia();
        }, 200);
      }
    };
    tryOpen();
  }, [params?.autoPick, fontsLoaded, user, media.length]);

  const pickMedia = async () => {
    if (media.length >= 20) {
      Alert.alert('Limit Reached', 'You can only add up to 20 images/videos per post.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload media.');
      return;
    }

    // Allow multiple selection of both images and videos
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos', 'images'] as any,
      allowsEditing: false,
      allowsMultipleSelection: true, // Enable multiple selection for mixed media
      quality: 0.8,
      selectionLimit: Math.max(1, 20 - media.length), // Respect the 20 item limit
      // Prefer smaller, stream-friendly videos to improve upload/playback reliability
      videoExportPreset: (ImagePicker as any).VideoExportPreset?.MediumQuality || undefined,
    } as any);

    if (!result.canceled && result.assets.length > 0) {
      // Show helpful tip on first use
      if (media.length === 0 && result.assets.length > 1) {
        const hasImages = result.assets.some(a => a.type === 'image');
        const hasVideos = result.assets.some(a => a.type === 'video');
        if (hasImages && hasVideos) {
          Alert.alert(
            '🎉 Mixed Media Post!',
            'You selected both images and videos. They will be combined in one post!',
            [{ text: 'Got it!', style: 'default' }]
          );
        }
      }
      
      // Collect items to add (excluding the first one which will be edited)
      const itemsToAddDirectly: MediaItem[] = [];
      
      // Process all selected assets
      result.assets.forEach((asset, index) => {
        if (media.length + itemsToAddDirectly.length >= 20) {
          if (index === 0) return; // Still allow first item for editing
          Alert.alert('Limit Reached', 'Maximum 20 items per post. Some items were not added.');
          return;
        }
        
        const mediaType = asset.type === 'video' ? 'video' : 'image';
        
        if (index === 0) {
          // Open editor for the first selected item (WhatsApp-style)
          setCurrentEditItem({
            uri: asset.uri,
            type: mediaType,
            index: -1, // -1 means new item, not editing existing
          });
          setEditorVisible(true);
        } else {
          // Collect remaining items to add after editor closes
          itemsToAddDirectly.push({ 
            uri: asset.uri, 
            type: mediaType,
            ...(mediaType === 'video' ? {} : {})
          });
        }
      });
      
      // Add remaining items immediately
      if (itemsToAddDirectly.length > 0) {
        setMedia((prev) => [...prev, ...itemsToAddDirectly]);
      }
    }
  };

  const handleEditorDone = (result: { uri: string; type: 'image' | 'video'; trimStart?: number; trimEnd?: number; muted?: boolean; originalDuration?: number; requiresServerProcessing?: boolean }) => {
    if (currentEditItem) {
      if (currentEditItem.index === -1) {
        // Adding new media
        const newMedia: MediaItem = {
          uri: result.uri,
          type: result.type,
          ...(result.type === 'video' ? { trimStart: result.trimStart, trimEnd: result.trimEnd, muted: result.muted, originalDuration: result.originalDuration, ...(result.requiresServerProcessing ? { requiresServerProcessing: true } : {}) } : {}),
        };
        setMedia([...media, newMedia]);
      } else {
        // Editing existing media
        const updatedMedia = [...media];
        updatedMedia[currentEditItem.index] = {
          ...updatedMedia[currentEditItem.index],
          uri: result.uri,
          ...(result.type === 'video' ? { trimStart: result.trimStart, trimEnd: result.trimEnd, muted: result.muted, originalDuration: result.originalDuration, ...(result.requiresServerProcessing ? { requiresServerProcessing: true } : {}) } : {}),
        };
        setMedia(updatedMedia);
      }
    }
    setEditorVisible(false);
    setCurrentEditItem(null);
  };

  const handleEditorClose = () => {
    setEditorVisible(false);
    setCurrentEditItem(null);
  };

  const editMedia = (index: number) => {
    const mediaItem = media[index];
    setCurrentEditItem({
      uri: mediaItem.uri,
      type: mediaItem.type,
      index,
    });
    setEditorVisible(true);
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video'): Promise<string | null> => {
    try {
      console.log('📤 Starting upload for:', uri, 'type:', type);
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const arrayBufferSize = arrayBuffer.byteLength;
      console.log('📦 ArrayBuffer created, size:', arrayBufferSize);

      // Basic guard: avoid extremely large uploads that are likely to fail
      if (type === 'video' && arrayBufferSize > 80 * 1024 * 1024) { // 80MB
        Alert.alert(
          'Video Too Large',
          'Please select a shorter or smaller video (under ~80MB). Try recording in a lower quality or trimming duration.'
        );
        return null;
      }
      
  const fileExt = uri.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;
      
      console.log('📁 Uploading to path:', filePath);

      const inferContentType = (ext: string, t: 'image' | 'video') => {
        const e = (ext || '').toLowerCase();
        if (t === 'video') {
          if (e.includes('mp4') || e.includes('m4v')) return 'video/mp4';
          if (e.includes('mov')) return 'video/quicktime';
          if (e.includes('webm')) return 'video/webm';
          return 'video/mp4';
        }
        // image
        if (e.includes('png')) return 'image/png';
        if (e.includes('webp')) return 'image/webp';
        if (e.includes('jpeg') || e.includes('jpg')) return 'image/jpeg';
        return 'image/jpeg';
      };

      const contentType = inferContentType(fileExt, type);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('✅ Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('❌ Error uploading media:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      Alert.alert('Upload Error', error.message || 'Failed to upload media');
      return null;
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button pressed');
    console.log('Content:', content);
    console.log('User:', user?.id);
    console.log('Media:', media.length);
    console.log('Category:', category);
    console.log('Visibility:', visibility);

    if (!content.trim()) {
      Alert.alert('Error', 'Post content cannot be empty');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Starting post creation...');
      
      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrls: string[] = [];
      let uploadedMediaItems: Array<{ type: 'image' | 'video'; url: string }> = [];
      
      if (media.length > 0) {
        console.log('Processing media...');
        // Process all media
        for (const mediaItem of media) {
          // Upload local images and videos
          console.log('Uploading media:', mediaItem.uri, 'type:', mediaItem.type);
          let url: string | null = null;
          if (
            mediaItem.type === 'video' &&
            mediaItem.trimStart != null &&
            mediaItem.trimEnd != null &&
            mediaItem.trimEnd > mediaItem.trimStart &&
            (mediaItem as any).requiresServerProcessing &&
            isCloudinaryConfigured()
          ) {
            try {
              url = await processVideoWithCloudinary(mediaItem.uri, {
                trimStart: mediaItem.trimStart,
                trimEnd: mediaItem.trimEnd,
                muted: mediaItem.muted,
              });
              console.log('Cloudinary processed URL:', url);
            } catch (e) {
              console.warn('Cloudinary processing failed, falling back to direct upload:', e);
              url = await uploadMedia(mediaItem.uri, mediaItem.type);
            }
          } else {
            // Default path: upload as-is (already edited on-device or no edits required)
            url = await uploadMedia(mediaItem.uri, mediaItem.type);
          }
          if (url) {
            console.log('Media uploaded:', url);
            // Store in mixed media array (preserves order and type)
            uploadedMediaItems.push({ type: mediaItem.type, url });
            
            // Also store in separate arrays for backward compatibility
            if (mediaItem.type === 'video') {
              uploadedVideoUrls.push(url);
            } else {
              uploadedImageUrls.push(url);
            }
          } else {
            console.log('Failed to upload media:', mediaItem.uri);
          }
        }
        
        if (uploadedMediaItems.length === 0 && media.length > 0) {
          Alert.alert('Warning', 'Failed to process media. Post will be created without media.');
        }
      }
      
      const postData = {
        user_id: user.id,
        content: content.trim(),
        image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
        video_url: uploadedVideoUrls.length > 0 ? uploadedVideoUrls[0] : null,
        video_urls: uploadedVideoUrls.length > 0 ? uploadedVideoUrls : null,
        youtube_url: null,
        youtube_urls: null,
        media_items: uploadedMediaItems.length > 0 ? uploadedMediaItems : null,
        category,
        visibility,
      };
      
      console.log('Inserting post:', postData);
      
      const { data, error } = await supabase.from('posts').insert(postData).select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Post created successfully:', data);

      // Optionally add to highlights
      try {
        if (addToHighlights && data && data.length > 0) {
          const post = data[0];
          const { error: hErr } = await supabase.from('profile_highlights').insert({
            user_id: user.id,
            title: (highlightTitle || 'Highlight').slice(0, 40),
            visible: true,
            pinned: false,
            post_id: post.id,
          });
          if (hErr) {
            console.error('Add to highlights error:', hErr);
          }
        }
      } catch (e) {
        console.warn('Failed to add to highlights:', e);
      }

      Alert.alert('Success', 'Post added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded || !user) {
    return null;
  }

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.value === category);
  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility);
  const VisibilityIcon = selectedVisibility?.icon || Globe;

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft size={22} color="#1E293B" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Create Post</Text>
          <Text style={styles.subtitle}>Share your thoughts</Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitButton, (!content.trim() || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Content Input Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={20} color="#6366F1" />
            <Text style={styles.cardTitle}>Your Story / Caption</Text>
          </View>
          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind? Share something amazing..."
            placeholderTextColor="#94A3B8"
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={2000}
            textAlignVertical="top"
          />
          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>{content.length}/2000</Text>
          </View>
        </View>
        
        {/* Media Preview Section */}
        {media.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ImageIcon size={20} color="#10B981" />
              <Text style={styles.cardTitle}>Media ({media.length}/20)</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScroll}
              contentContainerStyle={styles.mediaScrollContent}
            >
              {media.map((mediaItem, index) => (
                <View key={index} style={styles.imagePreview}>
                  {mediaItem.type === 'video' ? (
                    mediaItem.trimStart != null && mediaItem.trimEnd != null ? (
                      <TrimmedVideoPreview
                        uri={mediaItem.uri}
                        trimStart={mediaItem.trimStart}
                        trimEnd={mediaItem.trimEnd}
                        muted={mediaItem.muted}
                      />
                    ) : (
                      <Video
                        source={{ uri: mediaItem.uri }}
                        style={styles.previewImage}
                        useNativeControls
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        isMuted={!!mediaItem.muted}
                      />
                    )
                  ) : (
                    <Image source={{ uri: mediaItem.uri }} style={styles.previewImage} />
                  )}
                  
                  <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={styles.mediaOverlay}
                  >
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeMedia(index)}
                    >
                      <X size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editMediaButton}
                      onPress={() => editMedia(index)}
                    >
                      <Edit3 size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </LinearGradient>

                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>{index + 1}</Text>
                  </View>
                  
                  {mediaItem.type === 'video' && (
                    <View style={styles.videoIndicator}>
                      <VideoIcon size={14} color="#FFFFFF" />
                      <Text style={styles.videoIndicatorText}>Video</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Add Media Button */}
        <TouchableOpacity 
          style={[styles.addMediaCard, media.length >= 20 && styles.addMediaCardDisabled]} 
          onPress={pickMedia}
          disabled={media.length >= 20}
        >
          <LinearGradient
            colors={media.length >= 20 ? ['#F1F5F9', '#F1F5F9'] : ['#EEF2FF', '#E0E7FF']}
            style={styles.addMediaGradient}
          >
            <View style={styles.addMediaIconCircle}>
              <ImageIcon size={24} color={media.length >= 20 ? '#CBD5E1' : '#6366F1'} />
            </View>
            <View style={styles.addMediaTextContainer}>
              <Text style={[styles.addMediaTitle, media.length >= 20 && styles.addMediaTitleDisabled]}>
                {media.length === 0 ? 'Add Photos & Videos' : 'Add More Media'}
              </Text>
              <Text style={[styles.addMediaSubtitle, media.length >= 20 && styles.addMediaSubtitleDisabled]}>
                {media.length === 0 ? 'Mix images and videos in one post' : `${media.length}/20 items added`}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          {/* Category Selection */}
          <View style={styles.card}>
            <Text style={styles.settingSectionTitle}>Post Settings</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setShowCategoryPicker(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={styles.settingIconEmoji}>🏷️</Text>
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Category</Text>
                  <Text style={styles.settingValue}>{selectedCategory?.label}</Text>
                </View>
              </View>
              <ChevronDown size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            {/* Visibility Selection */}
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setShowVisibilityPicker(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: '#E0E7FF' }]}>
                  <VisibilityIcon size={18} color="#6366F1" />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Visibility</Text>
                  <Text style={styles.settingValue}>{selectedVisibility?.label}</Text>
                </View>
              </View>
              <ChevronDown size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            {/* Highlights Toggle */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setAddToHighlights(!addToHighlights)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconCircle, { backgroundColor: addToHighlights ? '#FEF3C7' : '#F3F4F6' }]}>
                  <Sparkles size={18} color={addToHighlights ? '#F59E0B' : '#9CA3AF'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Add to Highlights</Text>
                  <Text style={styles.settingValue}>
                    {addToHighlights ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggle, addToHighlights && styles.toggleActive]}>
                <View style={[styles.toggleCircle, addToHighlights && styles.toggleCircleActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Highlight Title Input */}
          {addToHighlights && (
            <View style={[styles.card, styles.highlightTitleCard]}>
              <TextInput
                style={styles.highlightTitleInput}
                placeholder="Give your highlight a title..."
                placeholderTextColor="#94A3B8"
                maxLength={40}
                value={highlightTitle}
                onChangeText={setHighlightTitle}
              />
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {CATEGORY_GROUPS.map((group) => {
                const groupSelected = category === group.id;
                const subcategories = group.subcategories ?? [];
                return (
                  <View key={group.id} style={styles.publishCategoryGroup}>
                    <TouchableOpacity
                      style={[
                        styles.publishCategoryOption,
                        groupSelected && styles.publishCategoryOptionSelected,
                      ]}
                      onPress={() => {
                        setCategory(group.id);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.publishCategoryOptionText,
                          groupSelected && styles.publishCategoryOptionTextSelected,
                        ]}
                      >
                        {group.label}
                      </Text>
                    </TouchableOpacity>

                    {subcategories.length > 0 && (
                      <View style={styles.publishCategoryChildren}>
                        {subcategories.map((sub) => {
                          const isSelected = category === sub.id;
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.publishCategorySubOption,
                                isSelected && styles.publishCategoryOptionSelected,
                              ]}
                              onPress={() => {
                                setCategory(sub.id);
                                setShowCategoryPicker(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.publishCategorySubOptionText,
                                  isSelected && styles.publishCategoryOptionTextSelected,
                                ]}
                              >
                                {sub.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visibility Picker Modal */}
      <Modal
        visible={showVisibilityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Visibility</Text>
              <TouchableOpacity onPress={() => setShowVisibilityPicker(false)}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {VISIBILITY_OPTIONS.map((vis) => {
                const Icon = vis.icon;
                return (
                  <TouchableOpacity
                    key={vis.value}
                    style={[
                      styles.modalOption,
                      visibility === vis.value && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setVisibility(vis.value);
                      setShowVisibilityPicker(false);
                    }}
                  >
                    <View style={styles.visibilityOption}>
                      <Icon size={20} color={visibility === vis.value ? '#475569' : '#64748B'} />
                      <View style={styles.visibilityOptionText}>
                        <Text style={[
                          styles.modalOptionText,
                          visibility === vis.value && styles.modalOptionTextSelected
                        ]}>
                          {vis.label}
                        </Text>
                        <Text style={styles.visibilityOptionDescription}>
                          {vis.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Media Editor Modal - WhatsApp Style */}
      {currentEditItem && (
        <MediaEditorModal
          visible={editorVisible}
          uri={currentEditItem.uri}
          type={currentEditItem.type}
          onClose={handleEditorClose}
          onDone={handleEditorDone}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  contentInput: {
    minHeight: 140,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  imagesScroll: {
    flexGrow: 0,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  mediaScrollContent: {
    paddingRight: 20,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    width: 260,
    height: 340,
    backgroundColor: '#F1F5F9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  removeImageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  editMediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 36,
    alignItems: 'center',
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoIndicatorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addMediaCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  addMediaCardDisabled: {
    opacity: 0.5,
  },
  addMediaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  addMediaIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addMediaTextContainer: {
    flex: 1,
  },
  addMediaTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  addMediaTitleDisabled: {
    color: '#94A3B8',
  },
  addMediaSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  addMediaSubtitleDisabled: {
    color: '#CBD5E1',
  },
  settingsSection: {
    marginTop: 8,
  },
  settingSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  settingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconEmoji: {
    fontSize: 20,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#6366F1',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  highlightTitleCard: {
    paddingVertical: 12,
  },
  highlightTitleInput: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    padding: 0,
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  modalScroll: {
    maxHeight: 400,
    padding: 20,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  publishCategoryGroup: {
    marginBottom: 16,
  },
  publishCategoryOption: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  publishCategoryOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  publishCategoryOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  publishCategoryOptionTextSelected: {
    color: '#6366F1',
  },
  publishCategoryChildren: {
    marginTop: 10,
    marginLeft: 16,
    gap: 10,
  },
  publishCategorySubOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  publishCategorySubOptionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  modalOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  modalOptionTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: '#6366F1',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  visibilityOptionText: {
    flex: 1,
  },
  visibilityOptionDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 4,
  },
});