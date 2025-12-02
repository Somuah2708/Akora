import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { StatusBarScrim } from './StatusBarScrim';
import { GlobalTopAreaWrapper } from './GlobalTopArea';
import { HEADER_COLOR } from '@/constants/Colors';

interface AppLayoutProps {
  children: ReactNode;
  /** Whether to show the status bar scrim. Default: true */
  showScrim?: boolean;
  /** Custom scrim background color */
  scrimColor?: string;
  /** Extra height for the scrim beyond status bar */
  scrimExtraHeight?: number;
  /** Mode for scrim color (light/dark/auto) */
  scrimMode?: 'light' | 'dark' | 'auto';
  /** Use opaque scrim (solid color) instead of translucent. Default: true for clean top area */
  opaqueScrim?: boolean;
}

/**
 * AppLayout - Global layout wrapper with seamless top area system
 * 
 * This component wraps all screens and provides:
 * - Edge-to-edge UI with translucent status bar (Android)
 * - Solid HEADER_COLOR background for entire top area
 * - Fixed scrim over status bar area
 * - No white gaps during pull-to-refresh or scrolling
 * - Instagram/TikTok-style professional top area
 * 
 * Content scrolls behind the scrim for a seamless experience.
 */
export function AppLayout({ 
  children, 
  showScrim = true,
  scrimColor,
  scrimExtraHeight = 0,
  scrimMode = 'auto',
  opaqueScrim = true // Default to opaque for solid top area
}: AppLayoutProps) {
  // Set status bar to translucent on Android for edge-to-edge
  if (Platform.OS === 'android') {
    StatusBar.setTranslucent(true);
    StatusBar.setBackgroundColor('transparent');
  }

  return (
    <GlobalTopAreaWrapper>
      <View style={styles.container}>
        {children}
        {showScrim && (
          <StatusBarScrim 
            backgroundColor={scrimColor || HEADER_COLOR}
            extraHeight={scrimExtraHeight}
            mode={scrimMode}
            opaque={opaqueScrim}
          />
        )}
      </View>
    </GlobalTopAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppLayout;
