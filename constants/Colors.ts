/**
 * Global Color Constants
 * 
 * Centralized color definitions for consistent theming across the app.
 * Change these values to update the entire app's color scheme.
 */

// Primary header/top area color - Used for status bar, safe area, and headers
export const HEADER_COLOR = '#0C1220';

// Alternative colors for reference
export const COLORS = {
  // Primary
  header: HEADER_COLOR,
  background: '#FFFFFF',
  
  // Navigation
  tabBar: '#0F172A',
  tabBarActive: '#ffc857',
  tabBarInactive: 'rgba(255, 255, 255, 0.5)',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textLight: '#FFFFFF',
  
  // Accents
  primary: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export default COLORS;
