/**
 * Responsive Stat Cards for Events Admin Dashboard
 * 
 * Features:
 * - Compact card height (80-120px) instead of tall cards
 * - Dynamic height based on count with spring animation
 * - Responsive sizing for different screen widths
 * - Smooth transitions using Animated API
 * - LayoutAnimation for overall stats updates
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card height configuration
const BASE_HEIGHT = 70;   // Minimum card height
const MAX_HEIGHT = 100;   // Maximum card height
const STEP = 1.5;         // Height increase per count unit

interface StatCardProps {
  value: number;
  label: string;
  color: string;
  count?: number; // Optional count to influence height (defaults to value)
}

/**
 * StatCard Component
 * Animated card that grows slightly based on count
 */
const StatCard: React.FC<StatCardProps> = ({ value, label, color, count }) => {
  const animatedHeight = useRef(new Animated.Value(BASE_HEIGHT)).current;
  
  useEffect(() => {
    const dynamicCount = count !== undefined ? count : value;
    const calculatedHeight = Math.min(MAX_HEIGHT, BASE_HEIGHT + dynamicCount * STEP);
    
    Animated.spring(animatedHeight, {
      toValue: calculatedHeight,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [value, count]);

  return (
    <Animated.View style={[styles.card, { borderTopColor: color, height: animatedHeight }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
};

/**
 * EventsAdminHeader Component
 * Container for stat cards with horizontal scroll
 */
interface EventsAdminHeaderProps {
  stats: {
    total: number;
    pending: number;
    published: number;
    views: number;
    rsvps: number;
  };
}

const EventsAdminHeader: React.FC<EventsAdminHeaderProps> = ({ stats }) => {
  useEffect(() => {
    // Animate when stats change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [stats]);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.container}
    >
      <StatCard value={stats.total} label="Total" color="#4169E1" count={stats.total} />
      <StatCard value={stats.pending} label="Pending" color="#F59E0B" count={stats.pending} />
      <StatCard value={stats.published} label="Published" color="#10B981" count={stats.published} />
      <StatCard value={stats.views} label="Views" color="#8B5CF6" count={0} />
      <StatCard value={stats.rsvps} label="RSVPs" color="#EF4444" count={0} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 0,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: Math.max(68, SCREEN_WIDTH * 0.16),
    maxWidth: Math.max(85, SCREEN_WIDTH * 0.19),
    borderTopWidth: 3,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});

export { StatCard, EventsAdminHeader };

/**
 * Example Usage:
 * 
 * import { EventsAdminHeader } from './StatCard';
 * 
 * const MyAdminScreen = () => {
 *   const [stats, setStats] = useState({
 *     total: 45,
 *     pending: 8,
 *     published: 37,
 *     views: 1234,
 *     rsvps: 89,
 *   });
 * 
 *   return (
 *     <View>
 *       <EventsAdminHeader stats={stats} />
 *     </View>
 *   );
 * };
 */
