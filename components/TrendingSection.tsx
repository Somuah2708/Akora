import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

import {
  Briefcase,
  GraduationCap,
  Calendar,
  Heart,
  MessageSquare,
  Users,
  TrendingUp,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Newspaper,
  Bell,
  ShoppingBag,
  Radio,
  MoreHorizontal,
  Plus,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { debouncedRouter } from '@/utils/navigationDebounce';

interface TrendingItem {
  id: string;
  item_type: 'job' | 'event' | 'education' | 'donation' | 'forum' | 'circle' | 'circle_post' | 'news' | 'notice' | 'shop' | 'live' | 'custom';
  item_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  source_type: 'curated' | 'auto';
  trending_metric: string | null;
  priority: number;
  created_at: string;
}

// Type configuration with colors and icons
const TYPE_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  label: string;
  icon: any;
  defaultScreen: string;
}> = {
  job: {
    color: '#10B981',
    bgColor: '#ECFDF5',
    label: 'JOB',
    icon: Briefcase,
    defaultScreen: '/workplace',
  },
  education: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    label: 'EDUCATION',
    icon: GraduationCap,
    defaultScreen: '/education',
  },
  event: {
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    label: 'EVENT',
    icon: Calendar,
    defaultScreen: '/events',
  },
  donation: {
    color: '#EF4444',
    bgColor: '#FEF2F2',
    label: 'DONATION',
    icon: Heart,
    defaultScreen: '/donation',
  },
  forum: {
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    label: 'FORUM',
    icon: MessageSquare,
    defaultScreen: '/forum',
  },
  circle: {
    color: '#F97316',
    bgColor: '#FFF7ED',
    label: 'CIRCLE',
    icon: Users,
    defaultScreen: '/circles',
  },
  circle_post: {
    color: '#F97316',
    bgColor: '#FFF7ED',
    label: 'CIRCLE POST',
    icon: Users,
    defaultScreen: '/circles',
  },
  news: {
    color: '#06B6D4',
    bgColor: '#ECFEFF',
    label: 'NEWS',
    icon: Newspaper,
    defaultScreen: '/news',
  },
  notice: {
    color: '#EC4899',
    bgColor: '#FDF2F8',
    label: 'NOTICE',
    icon: Bell,
    defaultScreen: '/notices',
  },
  shop: {
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    label: 'SHOP',
    icon: ShoppingBag,
    defaultScreen: '/secretariat-shop',
  },
  live: {
    color: '#DC2626',
    bgColor: '#FEF2F2',
    label: 'LIVE',
    icon: Radio,
    defaultScreen: '/live',
  },
  custom: {
    color: '#6366F1',
    bgColor: '#EEF2FF',
    label: 'FEATURED',
    icon: Sparkles,
    defaultScreen: '/',
  },
};

interface TrendingSectionProps {
  isAdmin?: boolean;
  onAddPress?: () => void;
  onLongPress?: (itemId: string) => void;
}

export default function TrendingSection({ isAdmin, onAddPress, onLongPress }: TrendingSectionProps) {
  const router = useRouter();
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTrendingItems();
    }, [])
  );

  const fetchTrendingItems = useCallback(async () => {
    try {
      // Simple query - just get all active items
      const { data, error } = await supabase
        .from('trending_items')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('Trending items fetched:', data?.length, 'items', error ? `Error: ${error.message}` : '');

      if (error) throw error;
      
      const now = new Date();
      
      // Filter in JavaScript for date conditions
      const filteredData = (data || []).filter(item => {
        // Check start_date - item should show if no start_date or start_date is in the past
        if (item.start_date && new Date(item.start_date) > now) {
          console.log('Filtered out (start_date in future):', item.title, item.start_date);
          return false;
        }
        // Check end_date - item should show if no end_date or end_date is in the future
        if (item.end_date && new Date(item.end_date) <= now) {
          console.log('Filtered out (end_date passed):', item.title, item.end_date);
          return false;
        }
        return true;
      });
      
      console.log('After filtering:', filteredData.length, 'items to display');
      setTrendingItems(filteredData);
    } catch (error) {
      console.error('Error fetching trending items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePress = (item: TrendingItem) => {
    const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.custom;
    
    // If it has a specific item_id, navigate to that item's detail page
    if (item.item_id) {
      switch (item.item_type) {
        case 'job':
          debouncedRouter.push(`/job-detail/${item.item_id}`);
          break;
        case 'education':
          // Education might need different routes based on type
          debouncedRouter.push(`/education`);
          break;
        case 'event':
          debouncedRouter.push(`/events/${item.item_id}`);
          break;
        case 'donation':
          // Navigate to campaign detail, not donation detail
          debouncedRouter.push(`/donation/campaign/${item.item_id}`);
          break;
        case 'forum':
          debouncedRouter.push(`/forum/${item.item_id}`);
          break;
        case 'circle':
          debouncedRouter.push(`/circles/${item.item_id}`);
          break;
        case 'circle_post':
          debouncedRouter.push(`/circle-comments/${item.item_id}`);
          break;
        case 'news':
          debouncedRouter.push(`/news`);
          break;
        case 'notice':
          debouncedRouter.push(`/notices`);
          break;
        case 'shop':
          debouncedRouter.push(`/secretariat-shop/${item.item_id}`);
          break;
        case 'live':
          debouncedRouter.push(`/live`);
          break;
        default:
          debouncedRouter.push(config.defaultScreen as any);
      }
    } else {
      // Navigate to default screen for that type
      debouncedRouter.push(config.defaultScreen as any);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInWeeks < 5) return `${diffInWeeks}w ago`;
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    return `${diffInYears}y ago`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TrendingUp size={20} color="#ffc857" />
            <Text style={styles.title}>Trending</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ffc857" />
        </View>
      </View>
    );
  }

  if (trendingItems.length === 0 && !isAdmin) {
    return null; // Don't show section if no trending items and not admin
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <TrendingUp size={20} color="#ffc857" />
          <Text style={styles.title}>Trending</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddPress}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#0EA5E9" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      {trendingItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <TrendingUp size={32} color="#CBD5E1" />
          <Text style={styles.emptyText}>No trending items yet</Text>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.emptyAddButton}
              onPress={onAddPress}
            >
              <Text style={styles.emptyAddButtonText}>Add First Item</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          pagingEnabled={false}
          snapToInterval={screenWidth - 40 + 16}
          decelerationRate="fast"
        >
          {trendingItems.map((item, index) => {
            const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.custom;
            const IconComponent = config.icon;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => handlePress(item)}
                onLongPress={() => onLongPress?.(item.id)}
                activeOpacity={0.95}
              >
                {/* Background Image */}
                {item.image_url && !failedImages.has(item.id) ? (
                  <Image 
                    source={{ uri: item.image_url }} 
                    style={styles.backgroundImage}
                    onError={() => {
                      console.log('Trending image failed to load:', item.id, item.image_url);
                      setFailedImages(prev => new Set([...prev, item.id]));
                    }}
                  />
                ) : (
                  <View style={[styles.placeholderImage, { backgroundColor: config.color }]}>
                    <IconComponent size={60} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                  </View>
                )}
                
                {/* Gradient Overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                  locations={[0, 0.4, 1]}
                  style={styles.gradientOverlay}
                />
                
                {/* Type Badge - Top Left */}
                <View style={styles.typeBadgeContainer}>
                  <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
                    <IconComponent size={12} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.typeBadgeText}>{config.label}</Text>
                  </View>
                </View>
                
                {/* Content Overlay */}
                <View style={styles.contentOverlay}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  {(item.description || item.subtitle) && (
                    <Text style={styles.cardDescription} numberOfLines={3}>
                      {item.description || item.subtitle}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
  },
  addButtonText: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '600',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  emptyAddButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 20,
  },
  emptyAddButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 8,
  },
  card: {
    width: screenWidth - 40,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: '#1F2937',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  typeBadgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
