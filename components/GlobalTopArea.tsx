import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_COLOR } from '@/constants/Colors';

/**
 * GlobalTopArea - Fills the entire top area with solid HEADER_COLOR
 * 
 * This component creates a seamless, professional top area by:
 * - Filling the safe area insets (notches, dynamic islands)
 * - Extending behind the status bar
 * - Providing a solid background for pull-to-refresh
 * - Eliminating white gaps during scrolling
 * 
 * Result: Instagram/TikTok-style clean top area
 * 
 * Usage:
 * Place this at the top of your ScrollView/FlatList before content.
 * It's automatically included in screens that use GlobalTopAreaWrapper.
 */
export function GlobalTopArea() {
  const insets = useSafeAreaInsets();
  
  // Height includes safe area top inset (for notches)
  // On Android, this handles the translucent status bar area
  const height = insets.top;
  
  if (height === 0) {
    // No safe area, no need to render
    return null;
  }

  return (
    <View 
      style={[
        styles.topArea,
        { 
          height,
          backgroundColor: HEADER_COLOR,
        }
      ]}
    />
  );
}

/**
 * GlobalTopAreaWrapper - Wraps screen content with top area background
 * 
 * This provides:
 * - Full-height background in HEADER_COLOR
 * - Ensures no white gaps appear during pull-to-refresh
 * - Works with ScrollView, FlatList, and other scrollable components
 * 
 * Usage:
 * Wrap your screen's root View with this component.
 */
export function GlobalTopAreaWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={[styles.wrapper, { backgroundColor: HEADER_COLOR }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  topArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1, // Behind content but above wrapper background
  },
});

export default GlobalTopArea;
