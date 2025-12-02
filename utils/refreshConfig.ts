/**
 * RefreshControl Configuration
 * 
 * Provides platform-specific RefreshControl configurations for consistent
 * pull-to-refresh behavior across iOS and Android.
 */

import { Platform } from 'react-native';
import { HEADER_COLOR } from '@/constants/Colors';

/**
 * Default refresh control colors
 */
export const REFRESH_COLORS = {
  ios: '#FFFFFF',      // White spinner on dark backgrounds
  android: ['#FFFFFF'], // White spinner on Android
  dark: '#000000',     // Black spinner on light backgrounds
  androidDark: ['#000000'],
};

/**
 * Get platform-specific refresh control props
 * 
 * @param isDarkBackground - Whether the background is dark (default: true)
 * @returns RefreshControl props object
 */
export const getRefreshControlProps = (isDarkBackground: boolean = true) => {
  const spinnerColor = isDarkBackground ? REFRESH_COLORS.ios : REFRESH_COLORS.dark;
  const androidColors = isDarkBackground ? REFRESH_COLORS.android : REFRESH_COLORS.androidDark;

  return {
    // iOS-specific
    tintColor: spinnerColor,
    
    // Android-specific
    colors: androidColors,
    
    // Common
    progressBackgroundColor: Platform.OS === 'android' ? 'transparent' : undefined,
    
    // iOS bounce effect
    ...(Platform.OS === 'ios' && {
      // Bounce is enabled by default on iOS
    }),
  };
};

/**
 * Standard refresh control props for screens with dark headers
 */
export const DARK_HEADER_REFRESH_PROPS = getRefreshControlProps(true);

/**
 * Standard refresh control props for screens with light backgrounds
 */
export const LIGHT_BG_REFRESH_PROPS = getRefreshControlProps(false);

/**
 * Helper to merge custom props with defaults
 */
export const mergeRefreshProps = (
  customProps: any = {},
  isDarkBackground: boolean = true
) => ({
  ...getRefreshControlProps(isDarkBackground),
  ...customProps,
});
