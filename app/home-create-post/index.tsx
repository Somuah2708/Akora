import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useRef, useState } from 'react';
import { SplashScreen, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, Video as VideoIcon, Edit3, MessageSquare, X } from 'lucide-react-native';
import MediaEditorModal from '@/components/MediaEditorModal';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { isCloudinaryConfigured, processVideoWithCloudinary } from '@/lib/cloudinary';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

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

export default function HomeCreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ autoPick?: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<{ uri: string; type: 'image' | 'video'; index: number } | null>(null);
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
    // Optional: Auth sanity log
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session:', session?.user?.id);
      console.log('User from hook:', user?.id);
    };
    checkAuth();
  }, [user]);

  // Auto-open media picker if requested (first-time only)
  useEffect(() => {
    let opened = false;
    const tryOpen = async () => {
      if (!opened && params?.autoPick === '1' && fontsLoaded && user && media.length === 0) {
        opened = true;
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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos', 'images'] as any,
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.8,
      videoExportPreset: (ImagePicker as any).VideoExportPreset?.MediumQuality || undefined,
    } as any);

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      setCurrentEditItem({ uri: asset.uri, type: mediaType, index: -1 });
      setEditorVisible(true);
    }
  };

  const handleEditorDone = (result: { uri: string; type: 'image' | 'video'; trimStart?: number; trimEnd?: number; muted?: boolean; originalDuration?: number; requiresServerProcessing?: boolean }) => {
    if (currentEditItem) {
      if (currentEditItem.index === -1) {
        const newMedia: MediaItem = {
          uri: result.uri,
          type: result.type,
          ...(result.type === 'video' ? { trimStart: result.trimStart, trimEnd: result.trimEnd, muted: result.muted, originalDuration: result.originalDuration, ...(result.requiresServerProcessing ? { requiresServerProcessing: true } : {}) } : {}),
        };
        setMedia([...media, newMedia]);
      } else {
        const updated = [...media];
        updated[currentEditItem.index] = {
          ...updated[currentEditItem.index],
          uri: result.uri,
          ...(result.type === 'video' ? { trimStart: result.trimStart, trimEnd: result.trimEnd, muted: result.muted, originalDuration: result.originalDuration, ...(result.requiresServerProcessing ? { requiresServerProcessing: true } : {}) } : {}),
        };
        setMedia(updated);
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
    setCurrentEditItem({ uri: mediaItem.uri, type: mediaItem.type, index });
    setEditorVisible(true);
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video'): Promise<string | null> => {
    try {
      console.log('📤 Starting upload for:', uri, 'type:', type);
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Failed to fetch media: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      const size = arrayBuffer.byteLength;
      console.log('📦 ArrayBuffer created, size:', size);
      if (type === 'video' && size > 80 * 1024 * 1024) {
        Alert.alert('Video Too Large', 'Please select a shorter or smaller video (under ~80MB).');
        return null;
      }

      const fileExt = uri.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const inferContentType = (ext: string, t: 'image' | 'video') => {
        const e = (ext || '').toLowerCase();
        if (t === 'video') {
          if (e.includes('mp4') || e.includes('m4v')) return 'video/mp4';
          if (e.includes('mov')) return 'video/quicktime';
          if (e.includes('webm')) return 'video/webm';
          return 'video/mp4';
        }
        if (e.includes('png')) return 'image/png';
        if (e.includes('webp')) return 'image/webp';
        if (e.includes('jpeg') || e.includes('jpg')) return 'image/jpeg';
        return 'image/jpeg';
      };

      const contentType = inferContentType(fileExt, type);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, arrayBuffer, { contentType, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      console.log('✅ Upload successful:', uploadData);

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      console.log('🔗 Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('❌ Error uploading media:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload media');
      return null;
    }
  };

  const handleSubmit = async () => {
    console.log('Home Create Post submit');
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
      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrls: string[] = [];

      if (media.length > 0) {
        for (const mediaItem of media) {
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
            } catch (e) {
              console.warn('Cloudinary processing failed, falling back to direct upload:', e);
              url = await uploadMedia(mediaItem.uri, mediaItem.type);
            }
          } else {
            url = await uploadMedia(mediaItem.uri, mediaItem.type);
          }
          if (url) {
            if (mediaItem.type === 'video') {
              uploadedVideoUrls.push(url);
            } else {
              uploadedImageUrls.push(url);
            }
          }
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
        category: 'general',
        visibility: 'public',
      } as const;

      console.log('Inserting home post:', postData);
      const { data, error } = await supabase.from('posts').insert(postData).select();
      if (error) throw error;

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <ArrowLeft size={22} color="#1E293B" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Create Post</Text>
          <Text style={styles.subtitle}>Home feed • quick share</Text>
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
            placeholder="What's on your mind? Share something..."
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

                  <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.mediaOverlay}>
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeMedia(index)}>
                      <X size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editMediaButton} onPress={() => editMedia(index)}>
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
        <TouchableOpacity style={[styles.addMediaCard, media.length >= 20 && styles.addMediaCardDisabled]} onPress={pickMedia} disabled={media.length >= 20}>
          <LinearGradient colors={media.length >= 20 ? ['#F1F5F9', '#F1F5F9'] : ['#EEF2FF', '#E0E7FF']} style={styles.addMediaGradient}>
            <View style={styles.addMediaIconCircle}>
              <ImageIcon size={24} color={media.length >= 20 ? '#CBD5E1' : '#6366F1'} />
            </View>
            <View style={styles.addMediaTextContainer}>
              <Text style={[styles.addMediaTitle, media.length >= 20 && styles.addMediaTitleDisabled]}>
                {media.length === 0 ? 'Add Photos & Videos' : 'Add More Media'}
              </Text>
              <Text style={[styles.addMediaSubtitle, media.length >= 20 && styles.addMediaSubtitleDisabled]}>
                {media.length === 0 ? 'Capture moments to share' : `${media.length}/20 items added`}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Media Editor Modal */}
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
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
  backButton: { padding: 4 },
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
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  title: { fontSize: 22, fontFamily: 'Inter-SemiBold', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#64748B', marginTop: 2 },
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
  submitButtonDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
  formContainer: { flex: 1 },
  scrollContent: { padding: 16 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#0F172A' },
  contentInput: { minHeight: 140, fontSize: 16, fontFamily: 'Inter-Regular', color: '#0F172A', lineHeight: 24, textAlignVertical: 'top' },
  characterCount: { alignItems: 'flex-end', marginTop: 8 },
  characterCountText: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#94A3B8' },
  imagesScroll: { flexGrow: 0, marginHorizontal: -20, paddingHorizontal: 20 },
  mediaScrollContent: { paddingRight: 20 },
  imagePreview: { position: 'relative', marginRight: 12, borderRadius: 16, overflow: 'hidden', width: 260, height: 340, backgroundColor: '#F1F5F9' },
  previewImage: { width: '100%', height: '100%' },
  mediaOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 80, flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  removeImageButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239, 68, 68, 0.95)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  editMediaButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99, 102, 241, 0.95)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  imageCounter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 36, alignItems: 'center' },
  imageCounterText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter-SemiBold' },
  videoIndicator: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(239, 68, 68, 0.95)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoIndicatorText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  addMediaCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  addMediaCardDisabled: { opacity: 0.5 },
  addMediaGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  addMediaIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  addMediaTextContainer: { flex: 1 },
  addMediaTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#0F172A', marginBottom: 4 },
  addMediaTitleDisabled: { color: '#94A3B8' },
  addMediaSubtitle: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#64748B' },
  addMediaSubtitleDisabled: { color: '#CBD5E1' },
  bottomSpacing: { height: 40 },
});
