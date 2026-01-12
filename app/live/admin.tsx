import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { Plus, ArrowLeft, Edit2, Trash2, Calendar, Upload, Save, X, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

interface Livestream {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  stream_url: string;
  host_name: string;
  category: string | null;
  is_live: boolean;
  start_time: string;
  viewer_count: number;
  created_at: string;
}

interface StreamForm {
  title: string;
  description: string;
  thumbnail_url: string;
  stream_url: string;
  host_name: string;
  is_live: boolean;
}

export default function AdminLiveStreamScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStream, setEditingStream] = useState<Livestream | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [form, setForm] = useState<StreamForm>({
    title: '',
    description: '',
    thumbnail_url: '',
    stream_url: '',
    host_name: '',
    is_live: false,
  });

  useEffect(() => {
    // Wait for auth to initialize
    if (user && profile) {
      checkAdminAccess();
      fetchStreams();
    }
  }, [user, profile]);

  const checkAdminAccess = async () => {
    console.log('[Admin] Checking access...', { 
      user: user?.id, 
      profile_role: profile?.role, 
      profile_is_admin: profile?.is_admin 
    });

    if (!user || !profile) {
      console.log('[Admin] No user or profile found, redirecting...');
      Alert.alert('Access Denied', 'Please log in to access admin panel.');
      debouncedRouter.back();
      return;
    }

    // Check both role and is_admin flag (same as home screen)
    const isAdmin = profile.role === 'admin' || profile.is_admin === true;
    
    console.log('[Admin] Admin check result:', isAdmin);

    if (!isAdmin) {
      console.log('[Admin] Access denied - not an admin');
      Alert.alert('Access Denied', 'You do not have admin privileges.');
      debouncedRouter.back();
    } else {
      console.log('[Admin] Access granted!');
    }
  };

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('livestreams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      Alert.alert('Error', 'Failed to load streams.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadThumbnail(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const uploadThumbnail = async (uri: string) => {
    try {
      setUploadingImage(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Decode base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      const fileName = `livestream-${Date.now()}.jpg`;
      const filePath = `livestream-thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(filePath);

      setForm({ ...form, thumbnail_url: publicUrl });
      Alert.alert('Success', 'Thumbnail uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload thumbnail.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.stream_url.trim()) {
      Alert.alert('Missing Fields', 'Please enter at least a title and stream URL.');
      return;
    }

    try {
      setSubmitting(true);

      const streamData = {
        title: form.title,
        description: form.description,
        thumbnail_url: form.thumbnail_url,
        stream_url: form.stream_url,
        host_name: form.host_name || profile?.full_name || user?.user_metadata?.full_name || 'Admin',
        is_live: form.is_live,
        start_time: new Date().toISOString(),
        viewer_count: 0,
      };

      if (editingStream) {
        // Update existing stream
        const { error } = await supabase
          .from('livestreams')
          .update(streamData)
          .eq('id', editingStream.id);

        if (error) throw error;
        Alert.alert('Success', 'Stream updated successfully!');
      } else {
        // Create new stream
        const { error } = await supabase
          .from('livestreams')
          .insert([streamData]);

        if (error) throw error;
        Alert.alert('Success', 'Stream created successfully!');
      }

      resetForm();
      fetchStreams();
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save stream.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (stream: Livestream) => {
    setEditingStream(stream);
    setForm({
      title: stream.title,
      description: stream.description || '',
      thumbnail_url: stream.thumbnail_url || '',
      stream_url: stream.stream_url,
      host_name: stream.host_name,
      is_live: stream.is_live,
    });
    setShowModal(true);
  };

  const handleDelete = (stream: Livestream) => {
    Alert.alert(
      'Delete Stream',
      `Are you sure you want to delete "${stream.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('livestreams')
                .delete()
                .eq('id', stream.id);

              if (error) throw error;
              Alert.alert('Success', 'Stream deleted successfully!');
              fetchStreams();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete stream.');
            }
          },
        },
      ]
    );
  };

  const handleToggleLive = async (stream: Livestream) => {
    try {
      const { error } = await supabase
        .from('livestreams')
        .update({ 
          is_live: !stream.is_live,
        })
        .eq('id', stream.id);

      if (error) throw error;
      fetchStreams();
    } catch (error) {
      Alert.alert('Error', 'Failed to update stream status.');
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      thumbnail_url: '',
      stream_url: '',
      host_name: '',
      is_live: false,
    });
    setEditingStream(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Manage Live Streams</Text>
          <Text style={styles.headerSubtitle}>{streams.length} total streams</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Stream List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {streams.length === 0 ? (
          <View style={styles.emptyState}>
            <Play size={48} color="#CCCCCC" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Streams Yet</Text>
            <Text style={styles.emptyDescription}>
              Tap the + button to create your first live stream
            </Text>
          </View>
        ) : (
          <View style={styles.streamList}>
            {streams.map((stream) => (
              <View key={stream.id} style={styles.streamCard}>
                <Image
                  source={{ uri: stream.thumbnail_url || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400' }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                
                {stream.is_live && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}

                <View style={styles.streamInfo}>
                  <Text style={styles.streamTitle} numberOfLines={2}>{stream.title}</Text>
                  
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => handleToggleLive(stream)}
                    >
                      <Text style={styles.toggleButtonText}>
                        {stream.is_live ? 'End Stream' : 'Go Live'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(stream)}
                    >
                      <Edit2 size={16} color="#8B0000" strokeWidth={2} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(stream)}
                    >
                      <Trash2 size={16} color="#FF3B30" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm}>
              <X size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingStream ? 'Edit Stream' : 'New Stream'}
            </Text>
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#8B0000" />
              ) : (
                <Save size={24} color="#8B0000" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Thumbnail */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Thumbnail</Text>
              <TouchableOpacity 
                style={styles.thumbnailPicker}
                onPress={handlePickImage}
                disabled={uploadingImage}
              >
                {form.thumbnail_url ? (
                  <Image
                    source={{ uri: form.thumbnail_url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    {uploadingImage ? (
                      <ActivityIndicator size="large" color="#8B0000" />
                    ) : (
                      <>
                        <Upload size={32} color="#999999" strokeWidth={1.5} />
                        <Text style={styles.uploadText}>Tap to upload thumbnail (16:9)</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter stream title"
                value={form.title}
                onChangeText={(text) => setForm({ ...form, title: text })}
                placeholderTextColor="#999999"
              />
            </View>

            {/* YouTube/Stream URL */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>YouTube/Stream URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/watch?v=..."
                value={form.stream_url}
                onChangeText={(text) => setForm({ ...form, stream_url: text })}
                placeholderTextColor="#999999"
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={styles.hint}>Paste the YouTube live stream or video URL</Text>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter stream description"
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                placeholderTextColor="#999999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Category removed by request */}

            {/* Host Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Host Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name or organization"
                value={form.host_name}
                onChangeText={(text) => setForm({ ...form, host_name: text })}
                placeholderTextColor="#999999"
              />
            </View>

            {/* Live Status */}
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.label}>Stream is Live</Text>
                  <Text style={styles.hint}>Toggle when stream starts/ends</Text>
                </View>
                <Switch
                  value={form.is_live}
                  onValueChange={(value) => setForm({ ...form, is_live: value })}
                  trackColor={{ false: '#E5E5E5', true: '#8B0000' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.modalFooter} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Inter-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  streamList: {
    padding: 16,
  },
  streamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#000000',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  streamInfo: {
    padding: 12,
  },
  streamTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalFooter: {
    height: 40,
  },
  formGroup: {
    marginTop: 24,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 6,
  },
  thumbnailPicker: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
