import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Trash2, 
  BookmarkCheck,
  Bookmark,
  Clock,
  Eye,
  Heart,
  BookOpen,
  Filter,
  Search,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import CachedImage from '@/components/CachedImage';

const { width } = Dimensions.get('window');

// Category colors (same as articles page)
const CATEGORY_COLORS: Record<string, string> = {
  school_news: '#3B82F6',
  alumni_news: '#8B5CF6',
  ghana_news: '#EF4444',
  international: '#06B6D4',
  business: '#84CC16',
  technology: '#6366F1',
  events: '#EC4899',
  achievements: '#F59E0B',
  education: '#14B8A6',
  health: '#22C55E',
  lifestyle: '#F472B6',
  opinion: '#FB923C',
};

interface SavedArticle {
  id: string;
  article_id: string;
  created_at: string;
  article: {
    id: string;
    title: string;
    subtitle?: string;
    summary?: string;
    image_url: string;
    category?: string;
    published_at: string;
    reading_time_minutes?: number;
    view_count?: number;
    like_count?: number;
  };
}

export default function BookmarksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [favorites, setFavorites] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'oldest'>('all');

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Try article_favorites first (new table)
      const { data: favData, error: favError } = await supabase
        .from('article_favorites')
        .select(`
          id,
          article_id,
          created_at,
          article:trending_articles(
            id,
            title,
            subtitle,
            summary,
            image_url,
            category,
            published_at,
            reading_time_minutes,
            view_count,
            like_count
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!favError && favData) {
        setFavorites(favData as any);
      } else {
        // Fallback to old news_bookmarks table
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('news_bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!bookmarkError && bookmarkData) {
          // Transform old bookmark format
          const transformed = bookmarkData.map((b: any) => ({
            id: b.id,
            article_id: b.article_id,
            created_at: b.created_at,
            article: b.article_data || {
              id: b.article_id,
              title: 'Article',
              image_url: '',
            }
          }));
          setFavorites(transformed);
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [user]);

  const handleRemoveFavorite = async (favoriteId: string, articleId: string) => {
    Alert.alert(
      'Remove from Saved',
      'Are you sure you want to remove this article from your saved list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to delete from article_favorites first
              const { error: favError } = await supabase
                .from('article_favorites')
                .delete()
                .eq('id', favoriteId);

              if (favError) {
                // Try news_bookmarks as fallback
                await supabase
                  .from('news_bookmarks')
                  .delete()
                  .eq('id', favoriteId);
              }

              setFavorites(prev => prev.filter(f => f.id !== favoriteId));
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove article');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category?: string) => {
    return CATEGORY_COLORS[category?.toLowerCase() || ''] || '#6B7280';
  };

  const getCategoryName = (category?: string) => {
    if (!category) return 'News';
    return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const sortedFavorites = [...favorites].sort((a, b) => {
    if (selectedFilter === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (selectedFilter === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return 0;
  });

  const renderFavoriteCard = ({ item }: { item: SavedArticle }) => {
    const article = item.article;
    if (!article) return null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => debouncedRouter.push(`/news/article-detail?id=${article.id}`)}
        activeOpacity={0.7}
      >
        <CachedImage
          source={{ uri: article.image_url }}
          style={styles.cardImage}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(article.category)}15` }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(article.category) }]}>
                {getCategoryName(article.category)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveFavorite(item.id, item.article_id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BookmarkCheck size={20} color="#ffc857" fill="#ffc857" />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {article.title}
          </Text>

          {article.summary && (
            <Text style={styles.cardSummary} numberOfLines={2}>
              {article.summary}
            </Text>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={styles.cardMetaText}>
                {article.reading_time_minutes || 5} min
              </Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.cardMetaText}>
                Saved {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ffc85715' }]}>
            <BookmarkCheck size={20} color="#ffc857" />
          </View>
          <Text style={styles.statNumber}>{favorites.length}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#3B82F615' }]}>
            <Clock size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statNumber}>
            {favorites.reduce((acc, f) => acc + (f.article?.reading_time_minutes || 5), 0)}
          </Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Sort by:</Text>
        <View style={styles.filterPills}>
          {(['all', 'recent', 'oldest'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                selectedFilter === filter && styles.filterPillActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterPillText,
                selectedFilter === filter && styles.filterPillTextActive
              ]}>
                {filter === 'all' ? 'All' : filter === 'recent' ? 'Recent' : 'Oldest'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {favorites.length > 0 && (
        <Text style={styles.sectionTitle}>Your Reading List</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.5} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Saved Articles</Text>
            <Text style={styles.headerSubtitle}>Your reading list</Text>
          </View>
          
          <View style={styles.headerBtn} />
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={sortedFavorites}
        renderItem={renderFavoriteCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffc857"
            colors={['#ffc857']}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Bookmark size={48} color="#D1D5DB" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No Saved Articles</Text>
              <Text style={styles.emptyText}>
                Tap the bookmark icon on articles you want to read later
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => debouncedRouter.push('/news/articles')}
              >
                <Text style={styles.browseBtnText}>Browse Articles</Text>
                <ChevronRight size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // List Header
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#ffc857',
    borderColor: '#ffc857',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#0F172A',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },

  // List Content
  listContent: {
    paddingBottom: 32,
  },

  // Card Styles
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: 110,
    height: 130,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  cardSummary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dot: {
    color: '#D1D5DB',
    fontSize: 11,
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffc857',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  browseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
});
