import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Calendar,
  Heart,
  MessageSquare,
  Users,
  Sparkles,
  Trash2,
  Newspaper,
  Bell,
  ShoppingBag,
  Radio,
  Eye,
  EyeOff,
  Edit2,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { debouncedRouter } from '@/utils/navigationDebounce';

interface TrendingItem {
  id: string;
  item_type: string;
  item_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  source_type: string;
  is_active: boolean;
  priority: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

const ITEM_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  job: { label: 'Job', icon: Briefcase, color: '#10B981' },
  education: { label: 'Education', icon: GraduationCap, color: '#F59E0B' },
  event: { label: 'Event', icon: Calendar, color: '#8B5CF6' },
  donation: { label: 'Donation', icon: Heart, color: '#EF4444' },
  forum: { label: 'Forum', icon: MessageSquare, color: '#3B82F6' },
  circle: { label: 'Circle', icon: Users, color: '#F97316' },
  circle_post: { label: 'Circle Post', icon: Users, color: '#F97316' },
  news: { label: 'News', icon: Newspaper, color: '#06B6D4' },
  notice: { label: 'Notice', icon: Bell, color: '#EC4899' },
  shop: { label: 'Shop', icon: ShoppingBag, color: '#14B8A6' },
  live: { label: 'Live', icon: Radio, color: '#DC2626' },
  custom: { label: 'Custom', icon: Sparkles, color: '#6366F1' },
};

export default function ManageTrendingScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTrendingItems();
    }, [])
  );

  const fetchTrendingItems = async () => {
    try {
      // Fetch all trending items for admin (including inactive)
      const { data, error } = await supabase
        .from('trending_items')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrendingItems(data || []);
    } catch (error) {
      console.error('Error fetching trending items:', error);
      Alert.alert('Error', 'Failed to load trending items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrendingItems();
  };

  const handleToggleActive = async (item: TrendingItem) => {
    try {
      const { error } = await supabase
        .from('trending_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      
      // Update local state
      setTrendingItems(prev => 
        prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i)
      );
    } catch (error) {
      console.error('Error toggling item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this from trending?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trending_items')
                .delete()
                .eq('id', id);

              if (error) throw error;
              setTrendingItems(prev => prev.filter(i => i.id !== id));
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const getTypeConfig = (type: string) => {
    return ITEM_TYPES[type] || ITEM_TYPES.custom;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading trending items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = trendingItems.filter(i => i.is_active).length;
  const inactiveCount = trendingItems.filter(i => !i.is_active).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <TrendingUp size={20} color="#ffc857" />
          <Text style={styles.headerTitle}>Manage Trending</Text>
        </View>
        <TouchableOpacity 
          style={styles.addHeaderButton}
          onPress={() => debouncedRouter.push('/admin/manage-trending/add')}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{trendingItems.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: '#94A3B8' }]} />
          <Text style={[styles.statNumber, { color: '#94A3B8' }]}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Items List */}
      <ScrollView 
        style={styles.listContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ffc857"
            colors={['#ffc857']}
          />
        }
      >
        {trendingItems.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Trending Items</Text>
            <Text style={styles.emptyText}>
              Add items to showcase them on the home screen
            </Text>
            <TouchableOpacity 
              style={styles.emptyAddButton}
              onPress={() => debouncedRouter.push('/admin/manage-trending/add')}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          trendingItems.map((item) => {
            const config = getTypeConfig(item.item_type);
            const IconComponent = config.icon;

            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.itemCard, !item.is_active && styles.itemCardInactive]}
                onPress={() => debouncedRouter.push(`/admin/manage-trending/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityBadgeText}>#{item.priority}</Text>
                </View>
                <View style={styles.itemLeft}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImagePlaceholder, { backgroundColor: config.color + '20' }]}>
                      <IconComponent size={24} color={config.color} />
                    </View>
                  )}
                </View>
                
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.typePill, { backgroundColor: config.color }]}>
                      <IconComponent size={10} color="#FFFFFF" />
                      <Text style={styles.typePillText}>{config.label}</Text>
                    </View>
                    {item.source_type === 'auto' && (
                      <View style={styles.autoBadge}>
                        <Text style={styles.autoBadgeText}>AUTO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  )}
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => debouncedRouter.push(`/admin/manage-trending/${item.id}`)}
                  >
                    <Edit2 size={18} color="#ffc857" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.visibilityButton}
                    onPress={() => handleToggleActive(item)}
                  >
                    {item.is_active ? (
                      <Eye size={20} color="#10B981" />
                    ) : (
                      <EyeOff size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        
        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      {trendingItems.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => debouncedRouter.push('/admin/manage-trending/add')}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#0F172A" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  addHeaderButton: {
    backgroundColor: '#0F172A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  itemCardInactive: {
    opacity: 0.6,
  },
  priorityBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    backgroundColor: '#ffc857',
    borderRadius: 12,
    minWidth: 28,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemLeft: {
    marginRight: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  autoBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemPriority: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  itemActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
  },
  editButton: {
    padding: 8,
  },
  visibilityButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ffc857',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
