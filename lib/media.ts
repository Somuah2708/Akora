import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import { captureException, addBreadcrumb } from './sentry';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * FIXED: No-freeze approach
 * Request permissions FIRST, THEN launch picker
 */

// ==================== CAMERA ====================
export async function takeMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  console.log('📷 Checking camera permission...');

  // Step 1: Request permission FIRST (this prevents freeze)
  const camPerm = await ImagePicker.requestCameraPermissionsAsync();
  console.log('📷 Permission result:', camPerm.status);

  if (camPerm.status !== 'granted') {
    Alert.alert(
      'Camera Permission Required',
      'Please enable camera access in Settings > Privacy > Camera > Akora'
    );
    return null;
  }

  // Step 2: NOW launch camera (permission already granted, no freeze)
  console.log('📷 Launching camera...');

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'] as any,
      quality: 0.7,
      allowsEditing: false,
    });

    console.log('📷 Camera result:', result.canceled ? 'cancelled' : 'success');

    if (result.canceled) {
      return null;
    }

    if (result.assets?.[0]) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('📷 Camera error:', error);
    captureException(error as Error, { function: 'takeMedia', platform: Platform.OS });
    Alert.alert('Error', 'Failed to open camera');
    return null;
  }
}

// ==================== GALLERY ====================
export async function pickMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  console.log('🖼️ Checking media library permission...');

  // Step 1: Request permission FIRST
  const mediaPerm = await MediaLibrary.requestPermissionsAsync();
  console.log('🖼️ Permission result:', mediaPerm.status);

  if (mediaPerm.status !== 'granted') {
    Alert.alert(
      'Photos Permission Required',
      'Please enable photos access in Settings > Privacy > Photos > Akora'
    );
    return null;
  }

  // Step 2: NOW launch gallery
  console.log('🖼️ Launching photo library...');

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'] as any,
      quality: 0.7,
      allowsEditing: false,
      selectionLimit: 1,
    });

    console.log('🖼️ Gallery result:', result.canceled ? 'cancelled' : 'success');

    if (result.canceled) {
      return null;
    }

    if (result.assets?.[0]) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('🖼️ Gallery error:', error);
    captureException(error as Error, { function: 'pickMedia', platform: Platform.OS });
    Alert.alert('Error', 'Failed to open photo library');
    return null;
  }
}

// ==================== DOCUMENTS ====================
export async function pickDocument(): Promise<{
  uri: string;
  name: string;
  size: number;
  mimeType: string;
} | null> {
  try {
    console.log('📄 [Documents] Opening document picker...');

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      console.log('📄 [Documents] User cancelled');
      return null;
    }

    if (!result.assets || result.assets.length === 0) {
      return null;
    }

    const doc = result.assets[0];

    // Validate file size
    if (doc.size && doc.size > DOCUMENT_MAX_BYTES) {
      const sizeMB = (DOCUMENT_MAX_BYTES / (1024 * 1024)).toFixed(0);
      Alert.alert('File Too Large', `Maximum file size is ${sizeMB}MB. Please choose a smaller file.`);
      return null;
    }

    console.log('📄 [Documents] Document selected:', doc.name);

    return {
      uri: doc.uri,
      name: doc.name,
      size: doc.size || 0,
      mimeType: doc.mimeType || 'application/octet-stream',
    };
  } catch (error) {
    console.error('📄 [Documents] Error:', error);
    captureException(error as Error, { function: 'pickDocument', platform: Platform.OS });
    Alert.alert('Error', 'Failed to pick document. Please try again.');
    return null;
  }
}

// ==================== AUDIO RECORDING ====================
export async function requestAudioPermissions() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant microphone access to record voice messages');
    return false;
  }
  return true;
}

// ==================== UPLOAD WITH PROGRESS ====================
// WhatsApp-style upload with percentage progress and compression

export async function uploadMedia(
  uri: string,
  userId: string,
  type: 'image' | 'video',
  fileName?: string | null,
  mimeType?: string | null,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    
    // Progress: 0-10% - Preparing file
    onProgress?.(5);
    
    let processedUri = uri;
    
    // WhatsApp-style: Compress images before upload (faster upload, less data)
    if (type === 'image') {
      console.log('🖼️ Compressing image for faster upload...');
      onProgress?.(10);
      
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1920 } }], // Max width 1920px (WhatsApp quality)
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      processedUri = compressed.uri;
      console.log('✅ Image compressed');
    }
    
    // Progress: 10-20% - Reading file
    onProgress?.(15);
    
    const inferExtFromMime = (mt?: string | null) => {
      switch (mt) {
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/heic':
        case 'image/heif': return 'heic';
        case 'video/mp4': return 'mp4';
        case 'video/quicktime': return 'mov';
        default: return type === 'image' ? 'jpg' : 'mp4';
      }
    };

    const extFromName = fileName?.includes('.') ? fileName.split('.').pop() : null;
    const finalExt = (extFromName || inferExtFromMime(mimeType)) || (type === 'image' ? 'jpg' : 'mp4');
    const safeFileName = `${userId}_${timestamp}.${finalExt}`;
    const filePath = `messages/media/${userId}/${safeFileName}`;

    // Fetch file as blob (faster than ArrayBuffer)
    const response = await fetch(processedUri);
    const blob = await response.blob();
    
    onProgress?.(20);

    // Size check
    const size = blob.size;
    const max = type === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (size > max) {
      Alert.alert(
        'File too large',
        `${type === 'image' ? 'Image' : 'Video'} exceeds ${Math.round(max / (1024*1024))}MB limit.`
      );
      return null;
    }

    console.log(`📤 Uploading ${type} (${(size / 1024).toFixed(0)}KB)...`);

    // Progress: 20-90% - Uploading
    // Supabase doesn't support upload progress natively, so we simulate it
    const uploadSimulation = setInterval(() => {
      onProgress?.((prev) => {
        const current = prev || 20;
        return Math.min(current + 10, 90); // Increment by 10% up to 90%
      });
    }, 300); // Update every 300ms (feels fast like WhatsApp)

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, blob, {
        contentType: mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
        upsert: false,
      });

    clearInterval(uploadSimulation);

    if (error) throw error;

    // Progress: 90-100% - Getting URL
    onProgress?.(95);

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    onProgress?.(100);
    console.log('✅ Upload complete');

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    captureException(error as Error, { 
      function: 'uploadMedia', 
      type, 
      platform: Platform.OS,
      fileSize: error.fileSize,
      fileName 
    });
    Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
    return null;
  }
}

export async function uploadDocument(
  uri: string,
  userId: string,
  fileName: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    onProgress?.(5);
    
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `messages/documents/${userId}/${timestamp}_${sanitizedFileName}`;

    onProgress?.(15);
    
    const response = await fetch(uri);
    const blob = await response.blob();
    
    onProgress?.(20);

    const size = blob.size;
    if (size > DOCUMENT_MAX_BYTES) {
      Alert.alert('File too large', `Maximum ${Math.round(DOCUMENT_MAX_BYTES / (1024*1024))}MB`);
      return null;
    }

    console.log(`📤 Uploading document (${(size / 1024).toFixed(0)}KB)...`);

    const uploadSimulation = setInterval(() => {
      onProgress?.((prev) => {
        const current = prev || 20;
        return Math.min(current + 10, 90);
      });
    }, 300);

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: false,
      });

    clearInterval(uploadSimulation);

    if (error) throw error;

    onProgress?.(95);

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    onProgress?.(100);
    console.log('✅ Document upload complete');

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('❌ Document upload error:', error);
    captureException(error as Error, { 
      function: 'uploadDocument', 
      platform: Platform.OS,
      fileName,
      mimeType 
    });
    Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
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
    captureException(error as Error, { function: 'startRecording', platform: Platform.OS });
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
    captureException(error as Error, { function: 'stopRecording', platform: Platform.OS, userId });
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
