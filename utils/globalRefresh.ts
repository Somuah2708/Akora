/**
 * Global Refresh Utility
 * 
 * Provides centralized refresh logic for all screens in the app.
 * Can be extended with global data fetching operations.
 */

import { Alert } from 'react-native';

/**
 * Global refresh function that can be called from any screen.
 * Add any app-wide data refresh operations here.
 */
export const globalRefresh = async (): Promise<void> => {
  try {
    // Add global data refresh operations here
    // Examples:
    // await Promise.all([
    //   fetchUserProfile(),
    //   fetchNotifications(),
    //   clearCache(),
    // ]);
    
    // Simulate network delay for smooth UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return Promise.resolve();
  } catch (error) {
    console.error('Global refresh error:', error);
    // Silently fail - individual screens handle their own errors
    return Promise.resolve();
  }
};

/**
 * Helper to create a standardized refresh handler for screens.
 * 
 * @param screenRefreshFn - Screen-specific refresh function
 * @param onError - Optional error handler
 * @returns Refresh handler function
 */
export const createRefreshHandler = (
  screenRefreshFn: () => Promise<void>,
  onError?: (error: any) => void
) => {
  return async () => {
    try {
      // Run global refresh and screen-specific refresh in parallel
      await Promise.all([
        globalRefresh(),
        screenRefreshFn(),
      ]);
    } catch (error) {
      console.error('Refresh handler error:', error);
      if (onError) {
        onError(error);
      } else {
        // Default error handling - could show toast instead
        console.warn('Failed to refresh data');
      }
    }
  };
};

/**
 * Minimum refresh duration to prevent flicker (in ms)
 */
export const MIN_REFRESH_DURATION = 300;

/**
 * Helper to ensure minimum refresh duration for smooth UX
 */
export const withMinDuration = async <T,>(
  promise: Promise<T>,
  minDuration: number = MIN_REFRESH_DURATION
): Promise<T> => {
  const start = Date.now();
  const result = await promise;
  const elapsed = Date.now() - start;
  
  if (elapsed < minDuration) {
    await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
  }
  
  return result;
};
