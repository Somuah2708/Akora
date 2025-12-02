import React from 'react';
import { View, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { HEADER_COLOR } from '@/constants/Colors';

interface StatusBarScrimProps {
  /** Background color of the scrim. Defaults to HEADER_COLOR */
  backgroundColor?: string;
  /** Height of the scrim in addition to status bar height. Default: 0 */
  extraHeight?: number;
  /** Override the automatic dark/light mode detection */
  mode?: 'light' | 'dark' | 'auto';
  /** Make scrim completely opaque (solid color). Default: false */
  opaque?: boolean;
}

/**
 * StatusBarScrim - A global overlay for the status bar area
 * 
 * Features:
 * - Respects safe area insets (notches, dynamic islands)
 * - Stays fixed during scrolling
 * - Uses HEADER_COLOR for consistent branding
 * - Makes status bar icons readable on any background
 * 
 * Usage:
 * This component is automatically injected by AppLayout.
 * You don't need to import it on individual screens.
 */
export function StatusBarScrim({ 
  backgroundColor, 
  extraHeight = 0,
  mode = 'auto',
  opaque = false
}: StatusBarScrimProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  
  // Determine scrim color based on mode
  const getScrimColor = () => {
    if (backgroundColor) return backgroundColor;
    
    // Use solid HEADER_COLOR for opaque mode (Instagram-style)
    if (opaque) return HEADER_COLOR;
    
    const effectiveMode = mode === 'auto' ? colorScheme : mode;
    
    // Use HEADER_COLOR with opacity for translucent mode
    return effectiveMode === 'dark' 
      ? 'rgba(12, 18, 32, 0.7)' // HEADER_COLOR (#0C1220) with 70% opacity
      : 'rgba(12, 18, 32, 0.85)'; // Slightly more opaque for light mode
  };

  // Total height: status bar + safe area top + any extra height
  const statusBarHeight = Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0;
  const totalHeight = Math.max(insets.top, statusBarHeight) + extraHeight;

  return (
    <View 
      style={[
        styles.scrim,
        {
          height: totalHeight,
          backgroundColor: getScrimColor(),
        }
      ]}
      pointerEvents="none" // Allow touches to pass through
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999, // Ensure it's always on top
  },
});

export default StatusBarScrim;
