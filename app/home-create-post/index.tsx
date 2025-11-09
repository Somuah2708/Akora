import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, X, Edit3, Video as VideoIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import MediaEditorModal from '@/components/MediaEditorModal';
import { LinearGradient } from 'expo-linear-gradient';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
}

const TrimmedVideoPreview = ({ uri, trimStart, trimEnd, muted }: { uri: string; trimStart: number; trimEnd: number; muted?: boolean }) => {
  const videoRef = useRef<Video | null>(null);
  const durationRef = useRef<number>(0);
  const playingRef = useRef(false);
  const onStatusUpdate = (status: any) => {
    if (!status?.isLoaded) return;
    if (status.durationMillis && !durationRef.current) {
      durationRef.current = status.durationMillis / 1000;
      videoRef.current?.setPositionAsync(trimStart * 1000).then(() => {
        videoRef.current?.playAsync();
        playingRef.current = true;
      }).catch(()=>{});
    }
    if (status.positionMillis && playingRef.current) {
      const pos = status.positionMillis / 1000;
      if (pos > trimEnd) {
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
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<{ uri: string; type: 'image' | 'video'; index: number } | null>(null);

  useEffect(() => {
    if (!user) {
      // Could redirect to login screen if desired
    }
  }, [user]);

  const pickMedia = async () => {
    if (media.length >= 20) {
      Alert.alert('Limit Reached', 'You can only add up to 20 items.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library permission is required.');
      return;
    }
    
    // Allow multiple selection of both images and videos
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos', 'images'] as any,
      allowsEditing: false,
      allowsMultipleSelection: true, // Enable multiple selection
      quality: 0.8,
      selectionLimit: Math.max(1, 20 - media.length), // Respect the 20 item limit
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
          // Open editor for the first selected item
          setCurrentEditItem({ uri: asset.uri, type: mediaType, index: -1 });
          setEditorVisible(true);
        } else {
          // Collect remaining items to add after editor closes
          itemsToAddDirectly.push({ uri: asset.uri, type: mediaType });
        }
      });
      
      // Add remaining items immediately
      if (itemsToAddDirectly.length > 0) {
        console.log('📦 Adding items directly:', itemsToAddDirectly.length, 'items');
        itemsToAddDirectly.forEach((item, idx) => {
          console.log(`  Item ${idx + 1}: ${item.type} - ${item.uri.substring(0, 50)}...`);
        });
        setMedia((prev) => {
          const updated = [...prev, ...itemsToAddDirectly];
          console.log('✅ Updated media array (after direct add):', updated.length, 'total items');
          return updated;
        });
      }
    }
  };

  const handleEditorDone = (result: { uri: string; type: 'image' | 'video'; trimStart?: number; trimEnd?: number; muted?: boolean }) => {
    if (!currentEditItem) return;
    console.log('🎨 Editor done with:', result.type);
    const base: MediaItem = { uri: result.uri, type: result.type };
    if (result.type === 'video') {
      if (result.trimStart != null && result.trimEnd != null) {
        base.trimStart = result.trimStart;
        base.trimEnd = result.trimEnd;
      }
      if (result.muted != null) base.muted = result.muted;
    }
    if (currentEditItem.index === -1) {
      setMedia((prev) => {
        const updated = [...prev, base];
        console.log('✅ Media after editor (new item):', updated.length, 'total items');
        updated.forEach((item, idx) => {
          console.log(`  Item ${idx}: ${item.type}`);
        });
        return updated;
      });
    } else {
      setMedia((prev) => prev.map((m, i) => (i === currentEditItem.index ? base : m)));
    }
    setEditorVisible(false);
    setCurrentEditItem(null);
  };

  const handleEditorClose = () => {
    setEditorVisible(false);
    setCurrentEditItem(null);
  };

  const editMedia = (index: number) => {
    const item = media[index];
    setCurrentEditItem({ uri: item.uri, type: item.type, index });
    setEditorVisible(true);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video'): Promise<string | null> => {
    try {
      console.log('📤 Starting upload for:', type, uri);
      const fileExt = type === 'image' ? 'jpg' : 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `posts/${fileName}`;
      
      // Read file as base64 using legacy API
      const base64 = await readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      console.log('✅ Read file as base64, length:', base64.length);
      
      // Decode base64 to ArrayBuffer
      const arrayBuffer = decode(base64);
      console.log('✅ Decoded to ArrayBuffer');
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(filePath, arrayBuffer, {
          contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
          upsert: false,
        });
      
      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }
      
      console.log('✅ Upload successful:', data);
      
      // Get public URL
      const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
      console.log('✅ Public URL:', urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (e: any) {
      console.error('❌ Upload failed:', e);
      Alert.alert('Upload Error', e.message || 'Failed to upload media');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to create a post.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Write something before posting.');
      return;
    }
    setIsSubmitting(true);
    try {
      console.log('📤 Starting submission with', media.length, 'media items');
      media.forEach((item, idx) => {
        console.log(`  Upload Item ${idx}: ${item.type}`);
      });
      
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      const mediaItems: Array<{ type: 'image' | 'video'; url: string }> = [];
      
      for (const item of media) {
        console.log(`📤 Uploading: ${item.type}`);
        const url = await uploadMedia(item.uri, item.type);
        if (url) {
          console.log(`✅ Uploaded ${item.type}: ${url.substring(0, 60)}...`);
          // Store in mixed media array (preserves order and type)
          mediaItems.push({ type: item.type, url });
          
          // Also store in separate arrays for backward compatibility
          if (item.type === 'image') imageUrls.push(url);
          else videoUrls.push(url);
        } else {
          console.error(`❌ Failed to upload ${item.type}`);
        }
      }
      
      console.log('📊 Upload summary:');
      console.log('  - Images:', imageUrls.length);
      console.log('  - Videos:', videoUrls.length);
      console.log('  - Media items:', mediaItems.length);
      console.log('  - Media items array:', JSON.stringify(mediaItems, null, 2));
      
      const postData: any = {
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrls[0] || null,
        image_urls: imageUrls.length ? imageUrls : null,
        video_url: videoUrls[0] || null,
        video_urls: videoUrls.length ? videoUrls : null,
        media_items: mediaItems.length ? mediaItems : null,
        youtube_url: null,
        youtube_urls: null,
        // Home feed: no category, visibility, highlights
      };
      const { error } = await supabase.from('posts').insert(postData);
      if (error) throw error;
      Alert.alert('Success', 'Post created!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      console.error('Create post error', e);
      Alert.alert('Error', e.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}> 
          <View style={styles.backButtonCircle}>
            <ArrowLeft size={22} color="#1E293B" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>New Post</Text>
          <Text style={styles.subtitle}>Share with everyone</Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitButton, (!content.trim() || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <TextInput
            style={styles.contentInput}
            placeholder="What's happening?"
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

        {media.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Media ({media.length}/20)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll} contentContainerStyle={styles.mediaScrollContent}>
              {media.map((item, index) => (
                <View key={index} style={styles.imagePreview}>
                  {item.type === 'video' ? (
                    item.trimStart != null && item.trimEnd != null ? (
                      <TrimmedVideoPreview uri={item.uri} trimStart={item.trimStart} trimEnd={item.trimEnd} muted={item.muted} />
                    ) : (
                      <Video source={{ uri: item.uri }} style={styles.previewImage} useNativeControls resizeMode={ResizeMode.COVER} isLooping isMuted={!!item.muted} />
                    )
                  ) : (
                    <Image source={{ uri: item.uri }} style={styles.previewImage} />
                  )}
                  <View style={styles.mediaOverlayMinimal}>
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeMedia(index)}>
                      <X size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editMediaButton} onPress={() => editMedia(index)}>
                      <Edit3 size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.imageCounter}><Text style={styles.imageCounterText}>{index + 1}</Text></View>
                  {item.type === 'video' && <View style={styles.videoIndicator}><VideoIcon size={14} color="#FFFFFF" /><Text style={styles.videoIndicatorText}>Video</Text></View>}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity style={[styles.addMediaCard, media.length >= 20 && styles.addMediaCardDisabled]} onPress={pickMedia} disabled={media.length >= 20}>
          <LinearGradient colors={media.length >= 20 ? ['#F1F5F9', '#F1F5F9'] : ['#EEF2FF', '#E0E7FF']} style={styles.addMediaGradient}>
            <View style={styles.addMediaIconCircle}><ImageIcon size={24} color={media.length >= 20 ? '#CBD5E1' : '#6366F1'} /></View>
            <View style={styles.addMediaTextContainer}>
              <Text style={[styles.addMediaTitle, media.length >= 20 && styles.addMediaTitleDisabled]}>{media.length === 0 ? 'Add Photos & Videos' : 'Add More Media'}</Text>
              <Text style={[styles.addMediaSubtitle, media.length >= 20 && styles.addMediaSubtitleDisabled]}>{media.length === 0 ? 'Mix images and videos in one post' : `${media.length}/20 items added`}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { padding: 4 },
  backButtonCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '600', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  submitButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#94A3B8' },
  formContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 140 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  contentInput: { minHeight: 160, fontSize: 16, color: '#0F172A' },
  characterCount: { alignItems: 'flex-end', marginTop: 8 },
  characterCountText: { fontSize: 12, color: '#64748B' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  imagesScroll: { },
  mediaScrollContent: { flexDirection: 'row', gap: 12 },
  imagePreview: { width: 180, height: 240, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  previewImage: { width: '100%', height: '100%' },
  mediaOverlayMinimal: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  removeImageButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editMediaButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  imageCounter: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  imageCounterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  videoIndicator: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  videoIndicatorText: { color: '#FFFFFF', fontSize: 12, marginLeft: 4 },
  addMediaCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  addMediaCardDisabled: { opacity: 0.6 },
  addMediaGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  addMediaIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  addMediaTextContainer: { flex: 1 },
  addMediaTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  addMediaTitleDisabled: { color: '#94A3B8' },
  addMediaSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  addMediaSubtitleDisabled: { color: '#94A3B8' },
  bottomSpacing: { height: 40 },
});
