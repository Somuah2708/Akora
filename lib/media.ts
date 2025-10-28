import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';

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
  try {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
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
  }
}

// Take photo/video with camera
export async function takeMedia(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
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
  }
}

// Upload media to Supabase Storage
export async function uploadMedia(
  uri: string,
  userId: string,
  type: 'image' | 'video'
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const extension = uri.split('.').pop() || 'jpg';
    const fileName = `${userId}_${timestamp}.${extension}`;
    const filePath = `messages/media/${userId}/${fileName}`;

    // Fetch the file
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, blob, {
        contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    Alert.alert('Error', 'Failed to upload media');
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
