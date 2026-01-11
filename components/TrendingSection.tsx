import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
          debouncedRouter.push(`/donation/donation-details?id=${item.item_id}`);
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
          debouncedRouter.push(`/trending-article/${item.item_id}`);
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

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
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
                activeOpacity={0.9}
              >
                <View style={styles.cardInner}>
                  {/* Image Section */}
                  <View style={styles.imageContainer}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.image} />
                    ) : (
                      <View style={[styles.placeholderImage, { backgroundColor: config.color }]}>
                        <IconComponent size={40} color="#FFFFFF" strokeWidth={1.5} />
                      </View>
                    )}
                    
                    {/* Time Badge - Top Left */}
                    <View style={styles.timeBadge}>
                      <Clock size={10} color="#FFFFFF" />
                      <Text style={styles.timeBadgeText}>{formatTimeAgo(item.created_at)}</Text>
                    </View>

                    {/* Type Pill - Bottom */}
                    <View style={styles.typeContainer}>
                      <View style={[styles.typePill, { backgroundColor: config.color }]}>
                        <IconComponent size={11} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.typePillText}>{config.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Content Section */}
                  <View style={styles.content}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                      {item.subtitle || ' '}
                    </Text>
                  </View>
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
    gap: 14,
    paddingBottom: 4,
  },
  card: {
    width: 180,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typeContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  content: {
    padding: 12,
    minHeight: 70, // Ensures space for title (2 lines) + subtitle
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
    letterSpacing: -0.2,
    minHeight: 38, // Reserve space for 2 lines
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
    minHeight: 16, // Reserve space even when empty
  },
});
