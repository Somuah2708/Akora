import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Heart, 
  MessageCircle,
  Search,
  Filter,
  AlertCircle,
  Plus,
  Bookmark,
  FileText,
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
}

const CATEGORIES = [
  'All',
  'General',
  'Academic',
  'Events',
  'Alumni Updates',
  'Important Notice',
  'Opportunities',
  'News',
  'Resources',
];

const PRIORITY_FILTERS = [
  { label: 'All Priorities', value: 'all' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Normal', value: 'normal' },
];

const DATE_FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

export default function AllAnnouncementsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, [user?.id]);

  useEffect(() => {
    filterAnnouncements();
  }, [searchQuery, selectedCategory, selectedPriority, selectedDateFilter, announcements]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      console.log('[All Announcements] Loading announcements...');
      console.log('[All Announcements] Current user:', user?.id);

      // Load approved announcements OR user's own announcements
      const { data, error } = await supabase
        .from('secretariat_announcements')
        .select('*')
        .eq('is_published', true)
        .or(`is_approved.eq.true,user_id.eq.${user?.id || 'null'}`)
        .order('published_at', { ascending: false });

      console.log('[All Announcements] Query result:', { count: data?.length, error });

      if (error) throw error;

      if (data) {
        console.log('[All Announcements] Setting announcements:', data.length);
        setAnnouncements(data);
      } else {
        console.log('[All Announcements] No data returned');
      }
    } catch (error: any) {
      console.error('[All Announcements] Error loading announcements:', error);
      console.error('[All Announcements] Error message:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAnnouncements = () => {
    let filtered = announcements;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(ann => ann.category === selectedCategory);
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(ann => ann.priority === selectedPriority);
    }

    // Filter by date
    if (selectedDateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(ann => {
        const publishedDate = new Date(ann.published_at);
        const diffTime = now.getTime() - publishedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        switch (selectedDateFilter) {
          case 'today':
            return diffDays === 0;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        ann =>
          ann.title.toLowerCase().includes(query) ||
          ann.summary?.toLowerCase().includes(query) ||
          ann.category.toLowerCase().includes(query)
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading announcements...</Text>
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
          <TouchableOpacity onPress={() => router.push('/secretariat')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Announcements</Text>
            <Text style={styles.subtitle}>{filteredAnnouncements.length} total</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.myAnnouncementsButton}
              onPress={() => router.push('/secretariat/announcements/my-announcements')}
            >
              <FileText size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.bookmarkButton}
              onPress={() => router.push('/secretariat/announcements/saved')}
            >
              <Bookmark size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/secretariat/announcements/create')}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search announcements..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? "#4169E1" : "#666"} />
          </TouchableOpacity>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.advancedFilters}>
            {/* Priority Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Priority</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterOptions}
              >
                {PRIORITY_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterChip,
                      selectedPriority === filter.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedPriority(filter.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedPriority === filter.value && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterOptions}
              >
                {DATE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterChip,
                      selectedDateFilter === filter.value && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedDateFilter(filter.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedDateFilter === filter.value && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Announcements List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredAnnouncements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Announcements Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term'
                : selectedCategory !== 'All'
                ? 'No announcements in this category'
                : 'No announcements available'}
            </Text>
          </View>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const priorityColor = getPriorityColor(announcement.priority);
            
            return (
              <TouchableOpacity
                key={announcement.id}
                style={[
                  styles.announcementCard,
                  priorityColor && { borderLeftWidth: 4, borderLeftColor: priorityColor },
                ]}
                onPress={() => router.push(`/secretariat/announcements/${announcement.id}` as any)}
              >
                {announcement.image_url && (
                  <Image
                    source={{ uri: announcement.image_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.cardContent}>
                  {/* Priority Badge */}
                  {announcement.priority !== 'normal' && priorityColor && (
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                      <Text style={styles.priorityText}>{announcement.priority.toUpperCase()}</Text>
                    </View>
                  )}

                  {/* Category */}
                  <View style={styles.cardCategory}>
                    <Text style={styles.categoryText}>{announcement.category}</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {announcement.title}
                  </Text>

                  {/* Summary */}
                  {announcement.summary && (
                    <Text style={styles.cardSummary} numberOfLines={2}>
                      {announcement.summary}
                    </Text>
                  )}

                  {/* Author */}
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{announcement.author_name}</Text>
                    {announcement.author_title && (
                      <Text style={styles.authorTitle}> • {announcement.author_title}</Text>
                    )}
                  </View>

                  {/* Meta Info */}
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#666" />
                      <Text style={styles.metaText}>
                        {formatDate(announcement.published_at || announcement.created_at)}
                      </Text>
                    </View>
                    <View style={styles.metaStats}>
                      <View style={styles.statBadge}>
                        <Eye size={14} color="#666" />
                        <Text style={styles.statText}>{announcement.view_count}</Text>
                      </View>
                      <View style={styles.statBadge}>
                        <Heart size={14} color="#666" />
                        <Text style={styles.statText}>{announcement.like_count}</Text>
                      </View>
                      <View style={styles.statBadge}>
                        <MessageCircle size={14} color="#666" />
                        <Text style={styles.statText}>{announcement.comment_count}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  myAnnouncementsButton: {
    padding: 8,
  },
  bookmarkButton: {
    padding: 8,
  },
  addButton: {
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#EBF0FF',
  },
  advancedFilters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    opacity: 0.9,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterChipTextActive: {
    color: '#4169E1',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryChipTextActive: {
    color: '#4169E1',
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
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
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
    lineHeight: 24,
  },
  cardSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  authorTitle: {
    fontSize: 14,
    color: '#666',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  metaStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});
