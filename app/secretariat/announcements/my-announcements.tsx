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
  Alert,
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
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
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
  is_published: boolean;
  is_approved: boolean;
}

export default function MyAnnouncementsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadMyAnnouncements();
    }
  }, [user?.id]);

  const loadMyAnnouncements = async () => {
    try {
      setLoading(true);
      console.log('[My Announcements] Loading announcements for user:', user?.id);

      const { data, error } = await supabase
        .from('secretariat_announcements')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      console.log('[My Announcements] Query result:', { data, error, count: data?.length });

      if (error) throw error;

      setAnnouncements(data || []);
      console.log('[My Announcements] Announcements set:', data?.length || 0);
    } catch (error: any) {
      console.error('[My Announcements] Error loading announcements:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error loading announcements: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to load announcements: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcementId: string, title: string) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete "${title}"?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Announcement',
            `Are you sure you want to delete "${title}"?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('secretariat_announcements')
        .delete()
        .eq('id', announcementId)
        .eq('user_id', user?.id); // Extra safety check

      if (error) throw error;

      // Remove from local state
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));

      if (Platform.OS === 'web') {
        window.alert('Announcement deleted successfully');
      } else {
        Alert.alert('Success', 'Announcement deleted successfully');
      }
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to delete announcement');
      }
    }
  };

  const handleEdit = (announcementId: string) => {
    console.log('[My Announcements] Navigating to edit page for:', announcementId);
    console.log('[My Announcements] Route:', `/secretariat/announcements/edit-announcement/${announcementId}`);
    debouncedRouter.push(`/secretariat/announcements/edit-announcement/${announcementId}`);
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

  const getStatusBadge = (announcement: Announcement) => {
    if (!announcement.is_published) {
      return { text: 'Draft', color: '#6B7280', icon: Clock };
    }
    if (!announcement.is_approved) {
      return { text: 'Pending Review', color: '#F59E0B', icon: Clock };
    }
    return { text: 'Published', color: '#10B981', icon: CheckCircle };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading your announcements...</Text>
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
              console.log('[My Announcements] Back button clicked - going to announcements index');
              debouncedRouter.push('/secretariat/announcements');
            }} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>My Announcements</Text>
            <Text style={styles.subtitle}>{announcements.length} total</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {announcements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Announcements Yet</Text>
            <Text style={styles.emptyText}>
              Create your first announcement to get started
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => debouncedRouter.push('/secretariat/announcements/create')}
            >
              <Text style={styles.createButtonText}>Create Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          announcements.map((announcement) => {
            const status = getStatusBadge(announcement);
            const StatusIcon = status.icon;

            return (
              <View key={announcement.id} style={styles.announcementCard}>
                <TouchableOpacity
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
                      <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <StatusIcon size={12} color="#FFFFFF" />
                        <Text style={styles.statusText}>{status.text}</Text>
                      </View>
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

                    <View style={styles.dateInfo}>
                      <Calendar size={12} color="#999" />
                      <Text style={styles.dateText}>
                        Created {formatDate(announcement.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(announcement.id)}
                  >
                    <Edit size={16} color="#4169E1" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(announcement.id, announcement.title)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#EBF0FF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
