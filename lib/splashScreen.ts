import * as SplashScreen from 'expo-splash-screen';

// Track if splash screen has been hidden
let hasHidden = false;

/**
 * Safely hide the splash screen without throwing errors if already hidden
 */
export const hideSplashScreen = async (): Promise<void> => {
  if (hasHidden) return;
  
  try {
    await SplashScreen.hideAsync();
    hasHidden = true;
  } catch (error) {
    // Ignore error - splash screen was already hidden or not registered
    hasHidden = true;
  }
};

/**
 * Prevent auto-hiding - should only be called once at app root
 */
export const preventAutoHide = (): void => {
  try {
    SplashScreen.preventAutoHideAsync();
  } catch (error) {
    // Ignore - already called
  }
};
