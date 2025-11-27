import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'akora_cache_';
const CACHE_EXPIRY_PREFIX = 'akora_expiry_';

export interface CacheOptions {
  expiryMinutes?: number; // How long until cache expires
}

/**
 * Cache data with optional expiry time
 */
export const cacheData = async (
  key: string,
  data: any,
  options: CacheOptions = {}
): Promise<void> => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_PREFIX + key;
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    
    // Set expiry if specified
    if (options.expiryMinutes) {
      const expiryTime = Date.now() + options.expiryMinutes * 60 * 1000;
      await AsyncStorage.setItem(expiryKey, expiryTime.toString());
    }
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

/**
 * Get cached data, returns null if expired or not found
 */
export const getCachedData = async <T = any>(key: string): Promise<T | null> => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_PREFIX + key;
    
    // Check if expired
    const expiryStr = await AsyncStorage.getItem(expiryKey);
    if (expiryStr) {
      const expiryTime = parseInt(expiryStr, 10);
      if (Date.now() > expiryTime) {
        // Expired, remove cache
        await clearCache(key);
        return null;
      }
    }
    
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
};

/**
 * Clear specific cache entry
 */
export const clearCache = async (key: string): Promise<void> => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_PREFIX + key;
    await AsyncStorage.multiRemove([cacheKey, expiryKey]);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
};

/**
 * Clear all app caches
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)
    );
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Clear all cache error:', error);
  }
};

/**
 * Get cache with fallback to fetch function
 */
export const getCachedOrFetch = async <T = any>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = { expiryMinutes: 5 }
): Promise<T> => {
  // Try to get from cache first
  const cached = await getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Not in cache, fetch fresh data
  const freshData = await fetchFn();
  
  // Cache the fresh data
  await cacheData(key, freshData, options);
  
  return freshData;
};
