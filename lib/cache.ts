import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'akora_cache_';
const CACHE_EXPIRY_PREFIX = 'akora_expiry_';

/**
 * IN-MEMORY CACHE for instant synchronous reads
 * This is the key to Instagram-like speed - data is available IMMEDIATELY
 * without waiting for AsyncStorage (which is async and slow)
 */
const memoryCache = new Map<string, { data: any; expiry: number | null }>();

export interface CacheOptions {
  expiryMinutes?: number; // How long until cache expires
}

/**
 * Get cached data SYNCHRONOUSLY from memory (instant, no await)
 * Returns null if not in memory cache
 */
export const getMemoryCacheSync = <T = any>(key: string): T | null => {
  const cacheKey = CACHE_PREFIX + key;
  const entry = memoryCache.get(cacheKey);
  
  if (!entry) return null;
  
  // Check expiry
  if (entry.expiry && Date.now() > entry.expiry) {
    memoryCache.delete(cacheKey);
    return null;
  }
  
  return entry.data as T;
};

/**
 * Set data in memory cache (instant, synchronous)
 */
export const setMemoryCacheSync = <T = any>(
  key: string,
  data: T,
  expiryMinutes?: number
): void => {
  const cacheKey = CACHE_PREFIX + key;
  const expiry = expiryMinutes ? Date.now() + expiryMinutes * 60 * 1000 : null;
  memoryCache.set(cacheKey, { data, expiry });
};

/**
 * Clear specific key from memory cache
 */
export const clearMemoryCacheSync = (key: string): void => {
  const cacheKey = CACHE_PREFIX + key;
  memoryCache.delete(cacheKey);
};

/**
 * Preload data from AsyncStorage into memory cache on app start
 * Call this early in app lifecycle for instant access
 */
export const preloadCacheToMemory = async (keys: string[]): Promise<void> => {
  try {
    const cacheKeys = keys.map(k => CACHE_PREFIX + k);
    const expiryKeys = keys.map(k => CACHE_EXPIRY_PREFIX + k);
    const allKeys = [...cacheKeys, ...expiryKeys];
    
    const results = await AsyncStorage.multiGet(allKeys);
    const resultMap = new Map(results);
    
    for (const key of keys) {
      const cacheKey = CACHE_PREFIX + key;
      const expiryKey = CACHE_EXPIRY_PREFIX + key;
      
      const dataStr = resultMap.get(cacheKey);
      const expiryStr = resultMap.get(expiryKey);
      
      if (dataStr) {
        const expiry = expiryStr ? parseInt(expiryStr, 10) : null;
        
        // Skip if expired
        if (expiry && Date.now() > expiry) continue;
        
        try {
          const data = JSON.parse(dataStr);
          memoryCache.set(cacheKey, { data, expiry });
        } catch {
          // Invalid JSON, skip
        }
      }
    }
  } catch (error) {
    console.warn('Preload cache error:', error);
  }
};

/**
 * Cache data with optional expiry time
 * Updates BOTH memory cache (instant) and AsyncStorage (persistent)
 */
export const cacheData = async (
  key: string,
  data: any,
  options: CacheOptions = {}
): Promise<void> => {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_PREFIX + key;
    
    // Update memory cache FIRST (instant access)
    const expiry = options.expiryMinutes 
      ? Date.now() + options.expiryMinutes * 60 * 1000 
      : null;
    memoryCache.set(cacheKey, { data, expiry });
    
    // Then persist to AsyncStorage (background)
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    
    // Set expiry if specified
    if (options.expiryMinutes) {
      await AsyncStorage.setItem(expiryKey, expiry!.toString());
    }
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

/**
 * Get cached data, returns null if expired or not found
 * Checks memory cache FIRST (instant), then falls back to AsyncStorage
 */
export const getCachedData = async <T = any>(key: string): Promise<T | null> => {
  // Check memory cache first (instant, no await)
  const memoryResult = getMemoryCacheSync<T>(key);
  if (memoryResult !== null) {
    return memoryResult;
  }
  
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
    if (cached) {
      const data = JSON.parse(cached) as T;
      // Populate memory cache for next time
      const expiry = expiryStr ? parseInt(expiryStr, 10) : null;
      memoryCache.set(cacheKey, { data, expiry });
      return data;
    }
    return null;
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
