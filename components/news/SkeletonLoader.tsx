import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SkeletonLoaderProps {
  variant?: 'featured' | 'horizontal' | 'vertical' | 'compact';
  count?: number;
}

export default function SkeletonLoader({ variant = 'vertical', count = 3 }: SkeletonLoaderProps) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (variant === 'featured') {
    return (
      <View style={styles.featuredContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View key={index} style={[styles.featuredSkeleton, { opacity: shimmerOpacity }]} />
        ))}
      </View>
    );
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View key={index} style={[styles.horizontalSkeleton, { opacity: shimmerOpacity }]}>
            <View style={styles.horizontalImage} />
            <View style={styles.horizontalContent}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '90%' }]} />
              <View style={[styles.skeletonLine, { width: '70%' }]} />
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View key={index} style={[styles.compactSkeleton, { opacity: shimmerOpacity }]}>
            <View style={styles.compactContent}>
              <View style={[styles.skeletonLine, { width: 60 }]} />
              <View style={[styles.skeletonLine, { width: '95%', marginTop: 6 }]} />
              <View style={[styles.skeletonLine, { width: '80%', marginTop: 4 }]} />
            </View>
            <View style={styles.compactImage} />
          </Animated.View>
        ))}
      </View>
    );
  }

  // Default: vertical
  return (
    <View style={styles.verticalContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View key={index} style={[styles.verticalSkeleton, { opacity: shimmerOpacity }]}>
          <View style={styles.verticalImage} />
          <View style={styles.verticalContent}>
            <View style={[styles.skeletonLine, { width: 80 }]} />
            <View style={[styles.skeletonLine, { width: '100%', marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: '90%', marginTop: 4 }]} />
            <View style={[styles.skeletonLine, { width: '75%', marginTop: 4 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Featured
  featuredContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 16,
  },
  featuredSkeleton: {
    width: width - 32,
    height: 360,
    borderRadius: 16,
    backgroundColor: '#E1E1E1',
  },

  // Horizontal
  horizontalContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  horizontalSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
    height: 140,
  },
  horizontalImage: {
    width: 120,
    height: '100%',
    backgroundColor: '#E1E1E1',
  },
  horizontalContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-around',
  },

  // Compact
  compactContainer: {
    paddingHorizontal: 16,
  },
  compactSkeleton: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  compactContent: {
    flex: 1,
    paddingRight: 12,
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E1E1E1',
  },

  // Vertical
  verticalContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  verticalSkeleton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  verticalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E1E1E1',
  },
  verticalContent: {
    padding: 16,
  },

  // Common
  skeletonLine: {
    height: 12,
    backgroundColor: '#E1E1E1',
    borderRadius: 6,
  },
});
