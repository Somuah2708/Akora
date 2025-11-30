import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Global locks to prevent concurrent picker operations
let isPickingMedia = false;
let isPickingDocument = false;

// Auto-reset locks on app start/hot reload
if (__DEV__) {
  // In development, reset on hot reload
  isPickingMedia = false;
  isPickingDocument = false;
}

// Export reset function for debugging
export function resetPickerLocks() {
  isPickingMedia = false;
  isPickingDocument = false;
}

// Request permissions
export async function requestMediaPermissions() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant media library access to upload photos/videos');
    return false;
  }
  return true;
}

export async function requestCameraPermissions() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant camera access to take photos/videos');
    return false;
  }
  return true;
}

export async function requestAudioPermissions() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant microphone access to record voice messages');
    return false;
  }
  return true;
}

// Pick image/video from gallery
export async function pickMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (isPickingMedia) {
    return null;
  }
  
  isPickingMedia = true;
  
  // Safety timeout to release lock after 60 seconds
  const timeout = setTimeout(() => {
    isPickingMedia = false;
  }, 60000);
  
  try {
    // Expo will automatically request permissions when needed
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 1,
      videoMaxDuration: 60, // 60 seconds max
    });
    
    if (!result.canceled && result.assets[0]) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error picking media:', error);
    Alert.alert('Error', 'Failed to pick media');
    return null;
  } finally {
    clearTimeout(timeout);
    isPickingMedia = false;
  }
}

// Take photo/video with camera
export async function takeMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (isPickingMedia) {
    return null;
  }
  
  isPickingMedia = true;
  
  // Safety timeout to release lock after 60 seconds
  const timeout = setTimeout(() => {
    isPickingMedia = false;
  }, 60000);
  
  try {
    // Expo will automatically request permissions when needed
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    
    if (!result.canceled && result.assets[0]) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error taking media:', error);
    Alert.alert('Error', 'Failed to take media');
    return null;
  } finally {
    clearTimeout(timeout);
    isPickingMedia = false;
  }
}

// Pick document from device
export async function pickDocument(): Promise<{
  uri: string;
  name: string;
  size: number;
  mimeType: string;
} | null> {
  if (isPickingDocument) {
    return null;
  }
  
  isPickingDocument = true;
  
  // Safety timeout to release lock after 60 seconds
  const timeout = setTimeout(() => {
    isPickingDocument = false;
  }, 60000);
  
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const doc = result.assets[0];

    // Check file size
    if (doc.size && doc.size > DOCUMENT_MAX_BYTES) {
      Alert.alert('File Too Large', `Maximum file size is ${DOCUMENT_MAX_BYTES / (1024 * 1024)}MB`);
      return null;
    }

    return {
      uri: doc.uri,
      name: doc.name,
      size: doc.size || 0,
      mimeType: doc.mimeType || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Error picking document:', error);
    Alert.alert('Error', 'Failed to pick document');
    return null;
  } finally {
    clearTimeout(timeout);
    isPickingDocument = false;
  }
}

// Upload media to Supabase Storage
export async function uploadMedia(
  uri: string,
  userId: string,
  type: 'image' | 'video',
  fileName?: string | null,
  mimeType?: string | null
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    // Determine extension
    const inferExtFromMime = (mt?: string | null) => {
      switch (mt) {
        case 'image/jpeg':
          return 'jpg';
        case 'image/png':
          return 'png';
        case 'image/heic':
        case 'image/heif':
          return 'heic';
        case 'video/mp4':
          return 'mp4';
        case 'video/quicktime':
          return 'mov';
        default:
          return type === 'image' ? 'jpg' : 'mp4';
      }
    };

    const extFromName = fileName && fileName.includes('.') ? fileName.split('.').pop() : null;
    const finalExt = (extFromName || inferExtFromMime(mimeType)) || (type === 'image' ? 'jpg' : 'mp4');
    const safeFileName = `${userId}_${timestamp}.${finalExt}`;
    const filePath = `messages/media/${userId}/${safeFileName}`;

    // Fetch the file as ArrayBuffer (React Native)
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Size guard (prevents 413 Payload too large)
    const size = bytes.byteLength;
    const max = type === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (size > max) {
      Alert.alert(
        'File too large',
        `${type === 'image' ? 'Image' : 'Video'} exceeds the ${Math.round(max / (1024*1024))}MB limit. Please choose a smaller file.`
      );
      return null;
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, bytes, {
        contentType: mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error uploading media:', error);
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.toLowerCase().includes('payload too large')) {
      Alert.alert('File too large', 'The selected media exceeds the maximum allowed size.');
    } else if (message.toLowerCase().includes('bucket not found')) {
      Alert.alert('Storage bucket missing', 'The chat-media bucket does not exist yet. Please run the storage migration.');
    } else {
      Alert.alert('Error', 'Failed to upload media');
    }
    return null;
  }
}

// Upload document to Supabase Storage
export async function uploadDocument(
  uri: string,
  userId: string,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  try {
    console.log('Starting document upload:', { fileName, mimeType, uri });
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `messages/documents/${userId}/${timestamp}_${sanitizedFileName}`;

    // Fetch the file as ArrayBuffer (React Native)
    console.log('Fetching file from URI...');
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    console.log('File fetched, size:', bytes.byteLength, 'bytes');

    // Size guard
    const size = bytes.byteLength;
    if (size > DOCUMENT_MAX_BYTES) {
      console.log('File too large:', size, '>', DOCUMENT_MAX_BYTES);
      Alert.alert(
        'File too large',
        `Document exceeds the ${Math.round(DOCUMENT_MAX_BYTES / (1024*1024))}MB limit.`
      );
      return null;
    }

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage:', filePath);
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    console.log('Upload successful, getting public URL...');
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    console.log('Public URL obtained:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error uploading document:', error);
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.toLowerCase().includes('payload too large')) {
      Alert.alert('File too large', 'The selected document exceeds the maximum allowed size.');
    } else if (message.toLowerCase().includes('bucket not found')) {
      Alert.alert('Storage Error', 'The chat-media storage bucket does not exist. Please contact support.');
    } else {
      Alert.alert('Upload Error', `Failed to upload document: ${message || 'Unknown error'}`);
    }
    return null;
  }
}

// Voice recording
let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<boolean> {
  try {
    // Clean up any existing recording first
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.log('Cleaned up existing recording');
      }
      recording = null;
    }

    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) return false;

    // Configure audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Start recording
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = newRecording;
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    Alert.alert('Error', 'Failed to start recording');
    recording = null;
    return false;
  }
}

export async function stopRecording(userId: string): Promise<string | null> {
  try {
    if (!recording) return null;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    if (!uri) return null;

    // Upload voice message to Supabase Storage
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}.m4a`;
    const filePath = `messages/voice/${userId}/${fileName}`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, blob, {
        contentType: 'audio/m4a',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error stopping recording:', error);
    Alert.alert('Error', 'Failed to save voice message');
    recording = null;
    return null;
  }
}

export async function cancelRecording() {
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
    }
  } catch (error) {
    console.error('Error canceling recording:', error);
  }
}

// Check if recording is in progress
export function isRecording(): boolean {
  return recording !== null;
}
