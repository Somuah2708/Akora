/**
 * useRefresh Hook
 * 
 * Provides a standardized way to implement pull-to-refresh across all screens.
 * Handles refresh state, prevents duplicate refreshes, and ensures smooth UX.
 */

import { useState, useCallback, useRef } from 'react';
import { withMinDuration } from '@/utils/globalRefresh';

export interface UseRefreshOptions {
  /**
   * Screen-specific refresh function
   */
  onRefresh: () => Promise<void>;
  
  /**
   * Minimum refresh duration in ms (default: 300)
   */
  minDuration?: number;
  
  /**
   * Error handler
   */
  onError?: (error: any) => void;
}

export interface UseRefreshReturn {
  /**
   * Whether refresh is in progress
   */
  isRefreshing: boolean;
  
  /**
   * Refresh handler to pass to RefreshControl
   */
  handleRefresh: () => Promise<void>;
  
  /**
   * Manual trigger for refresh (without state management)
   */
  refresh: () => Promise<void>;
}

/**
 * Hook for implementing pull-to-refresh functionality
 * 
 * @example
 * ```tsx
 * const { isRefreshing, handleRefresh } = useRefresh({
 *   onRefresh: async () => {
 *     await fetchData();
 *   }
 * });
 * 
 * <ScrollView
 *   refreshControl={
 *     <RefreshControl
 *       refreshing={isRefreshing}
 *       onRefresh={handleRefresh}
 *       tintColor="#FFFFFF"
 *       colors={['#FFFFFF']}
 *     />
 *   }
 * >
 * ```
 */
export const useRefresh = ({
  onRefresh,
  minDuration = 300,
  onError,
}: UseRefreshOptions): UseRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInProgress = useRef(false);

  const handleRefresh = useCallback(async () => {
    // Prevent duplicate refresh triggers
    if (refreshInProgress.current) {
      return;
    }

    try {
      refreshInProgress.current = true;
      setIsRefreshing(true);

      // Run refresh with minimum duration for smooth UX
      await withMinDuration(onRefresh(), minDuration);
    } catch (error) {
      console.error('Refresh error:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsRefreshing(false);
      refreshInProgress.current = false;
    }
  }, [onRefresh, minDuration, onError]);

  const refresh = useCallback(async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('Manual refresh error:', error);
      if (onError) {
        onError(error);
      }
    }
  }, [onRefresh, onError]);

  return {
    isRefreshing,
    handleRefresh,
    refresh,
  };
};
