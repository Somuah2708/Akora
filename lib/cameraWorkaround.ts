/**
 * CAMERA WORKAROUND FOR EXPO GO
 * 
 * The native camera freeze in Expo Go is likely caused by:
 * 1. Permission timing issues
 * 2. Memory pressure when launching native camera
 * 3. Expo Go limitations with native modules
 * 
 * This workaround adds extra safety checks and delays
 */

import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';

/**
 * Safer camera launch with workarounds for Expo Go freeze
 */
export async function takeCameraSafe(): Promise<ImagePicker.ImagePickerAsset | null> {
  console.log('📷 [SAFE] Starting safe camera launch...');
  
  try {
    // Step 1: Check permission status first (don't request yet)
    console.log('📷 [SAFE] Checking current permission status...');
    const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
    console.log('📷 [SAFE] Current permission status:', currentStatus);
    
    // Step 2: If not granted, request permission with user warning
    if (currentStatus !== 'granted') {
      console.log('📷 [SAFE] Permission not granted, requesting...');
      
      // Show alert BEFORE requesting (gives user context)
      Alert.alert(
        'Camera Access',
        'This app needs camera permission to take photos. You will be asked to grant access.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('📷 [SAFE] User cancelled permission request');
            }
          },
          {
            text: 'Continue',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              console.log('📷 [SAFE] Permission request result:', status);
              
              if (status !== 'granted') {
                Alert.alert(
                  'Permission Denied',
                  'Please enable camera access in Settings > Privacy > Camera > Expo Go'
                );
                return;
              }
              
              // IMPORTANT: Add delay after permission grant
              console.log('📷 [SAFE] Permission granted, waiting 500ms before camera...');
              await new Promise(resolve => setTimeout(resolve, 500));
              
              await launchCameraWithSafety();
            }
          }
        ]
      );
      return null;
    }
    
    // Step 3: Permission already granted, launch camera
    return await launchCameraWithSafety();
    
  } catch (error: any) {
    console.error('❌ [SAFE] Error in takeCameraSafe:', error);
    Alert.alert('Camera Error', `Failed to access camera: ${error?.message || 'Unknown error'}`);
    return null;
  }
}

/**
 * Actually launch the camera with safety measures
 */
async function launchCameraWithSafety(): Promise<ImagePicker.ImagePickerAsset | null> {
  console.log('📷 [SAFE] 🚨 About to launch camera native module...');
  
  try {
    // WORKAROUND: Use lower quality to reduce memory pressure
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any, // Images only (videos cause more issues)
      quality: 0.5, // Lower quality = less memory
      allowsEditing: false,
      base64: false, // Don't load base64 (saves memory)
    });
    
    console.log('📷 [SAFE] ✅ Camera returned successfully!');
    
    if (result.canceled) {
      console.log('📷 [SAFE] User cancelled');
      return null;
    }
    
    if (result.assets?.[0]) {
      console.log('📷 [SAFE] Media captured:', result.assets[0].type);
      return result.assets[0];
    }
    
    return null;
    
  } catch (error: any) {
    console.error('❌ [SAFE] Camera launch failed:', error);
    throw error;
  }
}

/**
 * Check if camera is likely to work in current environment
 */
export async function isCameraSafe(): Promise<{ safe: boolean; reason?: string }> {
  // In Expo Go, camera is unreliable
  if (__DEV__ && Platform.OS === 'ios') {
    return {
      safe: false,
      reason: 'Camera may freeze in Expo Go on iOS. Use development build for reliable camera access.'
    };
  }
  
  return { safe: true };
}
