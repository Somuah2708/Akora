import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';

interface CachedImageProps {
  uri?: string;
  source?: { uri: string } | string;
  style?: StyleProp<ImageStyle>;
  placeholder?: any;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  transition?: number;
  recyclingKey?: string;
  priority?: 'low' | 'normal' | 'high';
  onLoad?: (event: any) => void;
  onError?: (event: any) => void;
}

/**
 * Optimized image component with automatic caching
 * Uses expo-image which has built-in memory and disk caching
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  source,
  style,
  placeholder,
  contentFit = 'cover',
  transition = 200,
  recyclingKey,
  priority = 'normal',
  onLoad,
  onError,
}) => {
  // Support both uri prop and source={{ uri }} format
  const imageUri = uri || (typeof source === 'string' ? source : source?.uri);
  
  if (!imageUri) {
    return null;
  }
  
  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk" // Automatically caches to memory and disk
      placeholder={placeholder}
      recyclingKey={recyclingKey}
      priority={priority}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default CachedImage;
