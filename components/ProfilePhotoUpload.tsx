import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoUploaded: (url: string) => void;
  bucket?: string;
  size?: number;
}

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  bucket = 'mentor-profiles',
  size = 120,
}: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl || null);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please grant permission to access your camera');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload photos');
      return;
    }

    try {
      setUploading(true);

      // For React Native, we need to create a file object from the URI
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      // Upload using fetch with FormData
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const uploadResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      onPhotoUploaded(publicUrl);
      Alert.alert('Success', 'Profile photo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setPhotoUrl(null);
            onPhotoUploaded('');
          },
        },
      ]
    );
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        ...(photoUrl ? [{ text: 'Remove Photo', onPress: removePhoto, style: 'destructive' as const }] : []),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.photoContainer, { width: size, height: size }]}
        onPress={showPhotoOptions}
        disabled={uploading}
      >
        {photoUrl ? (
          <>
            <Image
              source={{ uri: photoUrl }}
              style={[styles.photo, { width: size, height: size }]}
            />
            {!uploading && (
              <View style={styles.editOverlay}>
                <Camera size={20} color="#FFFFFF" />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.placeholder, { width: size, height: size }]}>
            {uploading ? (
              <ActivityIndicator size="large" color="#4169E1" />
            ) : (
              <>
                <Upload size={32} color="#9CA3AF" />
                <Text style={styles.placeholderText}>Add Photo</Text>
              </>
            )}
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {uploading && (
        <Text style={styles.uploadingText}>Uploading...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  photoContainer: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photo: {
    borderRadius: 999,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 999,
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#9CA3AF',
    marginTop: 8,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4169E1',
    borderRadius: 999,
    padding: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  uploadingText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
  },
});
