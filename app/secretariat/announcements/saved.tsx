import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Heart, 
  MessageCircle,
  Bookmark,
  BookmarkX,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Announcement {
  id: string;
  title: string;
  summary: string;
  category: string;
  priority: string;
  image_url: string | null;
  author_name: string;
  author_title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  created_at: string;
  saved_at?: string;
}

export default function SavedAnnouncementsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [savedAnnouncements, setSavedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSavedAnnouncements();
    }
  }, [user?.id]);

  const loadSavedAnnouncements = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('saved_announcements')
        .select(`
          created_at,
          announcement:secretariat_announcements (
            id,
            title,
            summary,
            category,
            priority,
            image_url,
            author_name,
            author_title,
            view_count,
            like_count,
            comment_count,
            published_at,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten the data structure
      const announcements = data?.map((item: any) => ({
        ...item.announcement,
        saved_at: item.created_at,
      })) || [];

      setSavedAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading saved announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from('saved_announcements')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Remove from local state
      setSavedAnnouncements(prev => prev.filter(a => a.id !== announcementId));

      if (Platform.OS === 'web') {
        window.alert('Announcement removed from saved');
      }
    } catch (error: any) {
      console.error('Error unsaving announcement:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message}`);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'normal':
        return '#10B981';
      case 'low':
        return '#6B7280';
      default:
        return '#10B981';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading saved announcements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              debouncedRouter.push('/secretariat/announcements');
            }} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Saved Announcements</Text>
            <Text style={styles.subtitle}>{savedAnnouncements.length} saved</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {savedAnnouncements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Star size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Saved Announcements</Text>
            <Text style={styles.emptyText}>
              Save announcements to read them later
            </Text>
          </View>
        ) : (
          savedAnnouncements.map((announcement) => (
            <TouchableOpacity
              key={announcement.id}
              style={styles.announcementCard}
              onPress={() => debouncedRouter.push(`/secretariat/announcements/${announcement.id}`)}
            >
              {announcement.image_url && (
                <Image
                  source={{ uri: announcement.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.priority) }]}>
                    <Text style={styles.priorityText}>{announcement.priority.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnsave(announcement.id)}
                    style={styles.unsaveButton}
                  >
                    <BookmarkX size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardCategory}>
                  <Text style={styles.categoryText}>{announcement.category}</Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {announcement.title}
                </Text>

                <Text style={styles.cardSummary} numberOfLines={2}>
                  {announcement.summary}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{announcement.author_name}</Text>
                    <Text style={styles.authorTitle}>{announcement.author_title}</Text>
                  </View>

                  <View style={styles.stats}>
                    <View style={styles.statItem}>
                      <Eye size={14} color="#999" />
                      <Text style={styles.statText}>{announcement.view_count || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <ThumbsUp size={14} color="#999" />
                      <Text style={styles.statText}>{announcement.like_count || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <MessagesSquare size={14} color="#999" />
                      <Text style={styles.statText}>{announcement.comment_count || 0}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.dateInfo}>
                  <Calendar size={12} color="#999" />
                  <Text style={styles.dateText}>
                    Saved {formatDate(announcement.saved_at || announcement.created_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unsaveButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  cardCategory: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4169E1',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  cardSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  authorTitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
});
