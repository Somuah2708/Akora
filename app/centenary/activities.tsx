import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Activity {
  id: string;
  title: string;
  description: string | null;
  month: string | null;
  year: number | null;
  activity_date: string | null;
  sort_order: number;
}

export default function AllActivitiesScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('centenary_activities')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (activity: Activity) => {
    if (activity.month && activity.year) {
      return `${activity.month} ${activity.year}`;
    }
    if (activity.activity_date) {
      return new Date(activity.activity_date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    }
    return 'TBD';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activities & Preparation</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.tabBarActive} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No activities found</Text>
          <Text style={styles.emptySubtext}>Activities will appear here once added by administrators</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageDescription}>
            Track the preparations and activities leading up to Achimota's centenary celebration in 2027.
          </Text>

          {activities.map((activity, index) => {
            const isExpanded = expandedId === activity.id;
            
            return (
              <TouchableOpacity
                key={activity.id}
                style={[styles.activityCard, isExpanded && styles.activityCardExpanded]}
                onPress={() => toggleExpand(activity.id)}
                activeOpacity={0.8}
              >
                <View style={styles.activityHeader}>
                  <View style={styles.activityBadge}>
                    <Calendar size={14} color={COLORS.tabBarActive} />
                    <Text style={styles.activityBadgeText}>{formatDate(activity)}</Text>
                  </View>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberBadgeText}>{index + 1}</Text>
                  </View>
                </View>

                <Text style={styles.activityTitle}>{activity.title}</Text>
                
                {!isExpanded && activity.description && (
                  <Text style={styles.activityPreview} numberOfLines={2}>
                    {activity.description}
                  </Text>
                )}

                {isExpanded && activity.description && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  </View>
                )}

                <View style={styles.expandIndicator}>
                  {isExpanded ? (
                    <ChevronUp size={20} color="#9CA3AF" />
                  ) : (
                    <ChevronDown size={20} color="#9CA3AF" />
                  )}
                  <Text style={styles.expandText}>
                    {isExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </View>

                {/* Progress indicator line */}
                {index < activities.length - 1 && (
                  <View style={styles.progressLine} />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  pageDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityCardExpanded: {
    borderColor: COLORS.tabBarActive,
    borderWidth: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activityBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.tabBarActive,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.tabBar,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  activityPreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activityDescription: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  progressLine: {
    position: 'absolute',
    bottom: -16,
    left: '50%',
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
  },
});
