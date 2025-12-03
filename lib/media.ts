import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Helper to provide mediaTypes in a way that works with both
// new and old expo-image-picker APIs across iOS/Android.
const getPickerMediaTypes = (): any => {
  if ((ImagePicker as any).MediaType) {
    const MT = (ImagePicker as any).MediaType;
    return [MT.Image, MT.Video];
  }

  // Fallback for older API: use deprecated MediaTypeOptions
  return ImagePicker.MediaTypeOptions.All;
};

/**
 * FIXED: No-freeze approach
 * Request permissions FIRST, THEN launch picker
 */

// ==================== CAMERA ====================
export async function takeMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  console.log('📷 [takeMedia] Function called');
  
  Sentry.addBreadcrumb({
    category: 'media',
    message: 'takeMedia() called',
    level: 'info',
    data: { platform: Platform.OS }
  });

  try {
    console.log('📷 [takeMedia] Checking camera permission...');
    Sentry.addBreadcrumb({
      category: 'permissions',
      message: 'Requesting camera permission',
      level: 'info'
    });

    // Step 1: Request permission FIRST (this prevents freeze)
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    console.log('📷 [takeMedia] Permission result:', camPerm.status);
    
    Sentry.addBreadcrumb({
      category: 'permissions',
      message: 'Camera permission result',
      level: camPerm.status === 'granted' ? 'info' : 'warning',
      data: { status: camPerm.status, canAskAgain: camPerm.canAskAgain }
    });

    if (camPerm.status !== 'granted') {
      console.log('📷 [takeMedia] Permission denied');
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in Settings > Privacy > Camera > Akora'
      );
      return null;
    }

    // Step 2: NOW launch camera (permission already granted, no freeze)
    console.log('📷 [takeMedia] ✅ Permission granted, launching camera...');
    
    // CRITICAL: Capture to Sentry BEFORE the native call that causes freeze
    // This will show up in Sentry even if app crashes
    const sentryEventId = Sentry.captureMessage('🚨 NATIVE CAMERA LAUNCH IMMINENT - Next line causes freeze on iOS', {
      level: 'error',
      tags: { 
        feature: 'camera-native',
        critical: 'freeze-point',
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      },
      extra: {
        warning: 'If you see this error without a success message, the app froze during ImagePicker.launchCameraAsync',
        nextLine: 'ImagePicker.launchCameraAsync',
        iosVersion: Platform.Version
      }
    });
    
    // Force Sentry to send this immediately (don't wait for batch)
    Sentry.flush();

    console.log('📷 [takeMedia] 🚨 CALLING ImagePicker.launchCameraAsync NOW...');
    console.log('📷 [takeMedia] 🚨 IF YOU SEE THIS LOG BUT NOT THE NEXT ONE, APP FROZE HERE');
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: getPickerMediaTypes(),
      quality: 0.7,
      allowsEditing: false,
    });
    
    console.log('📷 [takeMedia] 🎉 launchCameraAsync returned successfully - NO FREEZE!');
    console.log('📷 [takeMedia] 🎉 THIS LOG PROVES THE APP DID NOT FREEZE');
    
    // Send success message to Sentry
    Sentry.captureMessage('✅ Camera launched successfully - NO FREEZE detected', {
      level: 'info',
      tags: { feature: 'camera-native', result: 'success' }
    });
    
    Sentry.addBreadcrumb({
      category: 'camera',
      message: 'Camera launched successfully - app did not freeze',
      level: 'info',
      data: { cancelled: result.canceled }
    });

    console.log('📷 [takeMedia] Camera result:', result.canceled ? 'cancelled' : 'success');

    if (result.canceled) {
      console.log('📷 [takeMedia] User cancelled camera');
      return null;
    }

    if (result.assets?.[0]) {
      console.log('📷 [takeMedia] ✅ Media captured successfully:', result.assets[0].type);
      return result.assets[0];
    }

    console.log('📷 [takeMedia] No media assets returned');
    return null;
  } catch (error: any) {
    console.error('❌ [takeMedia] ERROR:', error);
    console.error('❌ [takeMedia] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    Sentry.captureException(error, {
      tags: { function: 'takeMedia', platform: Platform.OS },
      contexts: {
        camera: {
          errorMessage: error?.message,
          errorCode: error?.code,
          platform: Platform.OS
        }
      }
    });
    
    Alert.alert('Camera Error', `Failed to open camera: ${error?.message || 'Unknown error'}`);
    return null;
  }
}

// ==================== GALLERY ====================
export async function pickMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  console.log('🖼️ Checking media library permission...');

  // EXPO GO iOS FIX: Use ImagePicker's own permission (not MediaLibrary)
  // MediaLibrary has issues in Expo Go on iOS
  const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  console.log('🖼️ Permission result:', mediaPerm.status);

  if (mediaPerm.status !== 'granted') {
    Alert.alert(
      'Photos Permission Required',
      'Please enable photos access in Settings > Privacy > Photos > Expo Go'
    );
    return null;
  }

  // Step 2: NOW launch gallery
  console.log('🖼️ Launching photo library...');
  
  Sentry.addBreadcrumb({
    category: 'gallery',
    message: 'About to launch image library',
    level: 'info',
    data: { platform: Platform.OS }
  });

  try {
    // Use helper so we support both new and old expo-image-picker APIs
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: getPickerMediaTypes(),
      quality: 0.7,
      allowsEditing: false,
    };
  
    console.log('🖼️ [pickMedia] Picker options:', pickerOptions);
    
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

    console.log('🖼️ [pickMedia] Gallery result:', {
      canceled: result.canceled,
      hasAssets: !!result.assets,
      assetsLength: result.assets?.length
    });

    if (result.canceled) {
      console.log('🖼️ [pickMedia] User cancelled gallery');
      return null;
    }

    if (result.assets?.[0]) {
      console.log('🖼️ [pickMedia] ✅ Media picked successfully:', {
        type: result.assets[0].type,
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height
      });
      return result.assets[0];
    }

    console.log('🖼️ [pickMedia] ⚠️ No media assets returned from picker');
    
    // EXPO GO iOS BUG: Sometimes returns success but no assets
    if (Platform.OS === 'ios' && !result.canceled && !result.assets) {
      console.log('🖼️ [pickMedia] 🐛 iOS Expo Go bug detected - picker returned empty');
      Sentry.captureMessage('iOS Expo Go gallery picker returned empty assets', {
        level: 'warning',
        tags: { platform: 'ios', bug: 'expo-go-gallery' }
      });
      Alert.alert(
        'Media Library Issue',
        'Expo Go has limited media library access on iOS. For full functionality, please use a development build.\n\nTry selecting the photo again, or use the camera instead.'
      );
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ [pickMedia] ERROR:', error);
    console.error('❌ [pickMedia] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    Sentry.captureException(error, {
      tags: { function: 'pickMedia', platform: Platform.OS },
      contexts: {
        gallery: {
          errorMessage: error?.message,
          errorCode: error?.code,
          platform: Platform.OS
        }
      }
    });
    
    Alert.alert('Gallery Error', `Failed to open gallery: ${error?.message || 'Unknown error'}`);
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
    Sentry.captureException(error, { extra: { source: 'pickDocument', platform: Platform.OS } });
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

    // Fetch file data in a way that works in Expo Go / React Native
    const response = await fetch(processedUri as any);
    const anyResponse = response as any;
    let blob: Blob;
    if (typeof anyResponse.blob === 'function') {
      // Web-style blob API (may be polyfilled)
      blob = await anyResponse.blob();
    } else if (typeof anyResponse.arrayBuffer === 'function') {
      // Fallback for environments without response.blob()
      const buffer = await anyResponse.arrayBuffer();
      // Blob is available in React Native via the global polyfill
      blob = new Blob([buffer], {
        type: mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
      });
    } else {
      throw new Error('Unable to read file data for upload (no blob/arrayBuffer on response)');
    }
    
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

    // Progress: 20-90% - Uploading (simulate since Supabase doesn't give progress)
    let simulatedProgress = 20;
    const uploadSimulation = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + 10, 90);
      onProgress?.(simulatedProgress);
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
    Sentry.captureException(error, { 
      extra: { 
        source: 'uploadMedia',
        type,
        platform: Platform.OS,
        fileSize: (error as any)?.fileSize,
        fileName,
      }
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
    
    const response = await fetch(uri as any);
    const anyResponse = response as any;
    let blob: Blob;
    if (typeof anyResponse.blob === 'function') {
      blob = await anyResponse.blob();
    } else if (typeof anyResponse.arrayBuffer === 'function') {
      const buffer = await anyResponse.arrayBuffer();
      blob = new Blob([buffer], { type: mimeType });
    } else {
      throw new Error('Unable to read document data for upload (no blob/arrayBuffer on response)');
    }
    
    onProgress?.(20);

    const size = blob.size;
    if (size > DOCUMENT_MAX_BYTES) {
      Alert.alert('File too large', `Maximum ${Math.round(DOCUMENT_MAX_BYTES / (1024*1024))}MB`);
      return null;
    }

    console.log(`📤 Uploading document (${(size / 1024).toFixed(0)}KB)...`);

    let simulatedProgress = 20;
    const uploadSimulation = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + 10, 90);
      onProgress?.(simulatedProgress);
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
    Sentry.captureException(error, { 
      extra: {
        source: 'uploadDocument',
        platform: Platform.OS,
        fileName,
        mimeType,
      }
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
    Sentry.captureException(error, { extra: { source: 'startRecording', platform: Platform.OS } });
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
    Sentry.captureException(error, { extra: { source: 'stopRecording', platform: Platform.OS, userId } });
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
