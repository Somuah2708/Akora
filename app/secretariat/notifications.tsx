import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Megaphone, Calendar, ShoppingBag, FileText, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// Static announcements for now - can be replaced with database query
const ALL_UPDATES = [
  {
    id: '1',
    title: 'Annual Report 2024 Now Available',
    description: 'The comprehensive annual report detailing all activities, achievements, and financial statements for 2024 is now available for download.',
    date: 'March 15, 2024',
    type: 'Publication',
    category: 'announcement',
    icon: FileText,
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'New Alumni Database System Launch',
    description: 'We are excited to announce the launch of our new alumni database system with enhanced features and better user experience.',
    date: 'March 10, 2024',
    type: 'Update',
    category: 'announcement',
    icon: Megaphone,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Alumni Homecoming 2024',
    description: 'Join us for the annual alumni homecoming event. Reconnect with old friends and make new connections.',
    date: 'April 20, 2024',
    type: 'Event',
    category: 'event',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'New Merchandise Available',
    description: 'Check out our latest collection of alumni merchandise including branded apparel, mugs, and accessories.',
    date: 'March 5, 2024',
    type: 'Shop Update',
    category: 'shop',
    icon: ShoppingBag,
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'Scholarship Program Applications Open',
    description: 'Applications are now open for the 2024 Alumni Scholarship Program. Support the next generation of students.',
    date: 'March 1, 2024',
    type: 'Important',
    category: 'announcement',
    icon: FileText,
    image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function SecretariatNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [newUpdates, setNewUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new'>('new');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchUpdates = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's last viewed timestamp
      const { data: viewData } = await supabase
        .from('secretariat_views')
        .select('last_viewed_at')
        .eq('user_id', user.id)
        .single();

      const lastViewed = viewData?.last_viewed_at;
      setLastViewedAt(lastViewed);

      // Set all updates
      setUpdates(ALL_UPDATES);

      // Filter new updates
      if (lastViewed) {
        const newItems = ALL_UPDATES.filter(
          update => new Date(update.created_at) > new Date(lastViewed)
        );
        setNewUpdates(newItems);
      } else {
        setNewUpdates(ALL_UPDATES);
      }

    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const now = new Date().toISOString();

      await supabase
        .from('secretariat_views')
        .upsert({
          user_id: user.id,
          last_viewed_at: now,
        }, {
          onConflict: 'user_id'
        });

      setLastViewedAt(now);
      setNewUpdates([]);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchUpdates();
    }, [user])
  );

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const displayedUpdates = filter === 'new' ? newUpdates : updates;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Updates & Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'new' && styles.activeFilterButton]}
          onPress={() => setFilter('new')}
        >
          <Text style={[styles.filterButtonText, filter === 'new' && styles.activeFilterButtonText]}>
            New ({newUpdates.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.activeFilterButtonText]}>
            All Updates
          </Text>
        </TouchableOpacity>
      </View>

      {newUpdates.length > 0 && filter === 'new' && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <CheckCircle size={16} color="#4169E1" />
            <Text style={styles.markAllText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading updates...</Text>
          </View>
        ) : displayedUpdates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Megaphone size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {filter === 'new' ? 'No new updates' : 'No updates available'}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === 'new' 
                ? 'You\'re all caught up!' 
                : 'Check back later for announcements and news'}
            </Text>
          </View>
        ) : (
          displayedUpdates.map((update) => {
            const IconComponent = update.icon;
            const isNew = lastViewedAt 
              ? new Date(update.created_at) > new Date(lastViewedAt)
              : true;

            return (
              <TouchableOpacity
                key={update.id}
                style={styles.updateCard}
              >
                <Image source={{ uri: update.image }} style={styles.updateImage} />
                <View style={styles.updateContent}>
                  <View style={styles.updateHeader}>
                    <View style={styles.typeContainer}>
                      <View style={styles.typeBadge}>
                        <IconComponent size={12} color="#4169E1" />
                        <Text style={styles.typeText}>{update.type}</Text>
                      </View>
                      {isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.dateText}>{update.date}</Text>
                  </View>
                  <Text style={styles.updateTitle}>{update.title}</Text>
                  <Text style={styles.updateDescription} numberOfLines={2}>
                    {update.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#4169E1',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  markAllContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
    backgroundColor: '#F8F9FA',
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  scrollView: {
    flex: 1,
  },
  updateCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateImage: {
    width: 120,
    height: 120,
  },
  updateContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  updateTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    lineHeight: 20,
  },
  updateDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
});
