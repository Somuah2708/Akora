import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { Search, TrendingUp, Clock, Bookmark, X, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type TrendingArticle } from '@/lib/supabase';
import CachedImage from '@/components/CachedImage';

const { width } = Dimensions.get('window');

const CATEGORIES = ['All', 'Alumni', 'Campus', 'Events', 'Sports', 'Achievement'];

export default function ArticlesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [articles, setArticles] = useState<TrendingArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<TrendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchArticles();
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, selectedCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trending_articles')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('news_bookmarks')
        .select('article_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      const bookmarked = new Set(data?.map((b: any) => b.article_id) || []);
      setBookmarkedArticles(bookmarked);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const toggleBookmark = async (articleId: string) => {
    if (!user) return;

    const isBookmarked = bookmarkedArticles.has(articleId);
    
    try {
      if (isBookmarked) {
        await supabase
          .from('news_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId);
        
        setBookmarkedArticles(prev => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      } else {
        await supabase
          .from('news_bookmarks')
          .insert({
            user_id: user.id,
            article_id: articleId,
            article_data: articles.find(a => a.id === articleId)
          });
        
        setBookmarkedArticles(prev => new Set([...prev, articleId]));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.subtitle?.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(article =>
        article.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredArticles(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchArticles(), user ? fetchBookmarks() : Promise.resolve()]);
    setRefreshing(false);
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderArticleCard = ({ item }: { item: TrendingArticle }) => {
    const isBookmarked = bookmarkedArticles.has(item.id);
    
    return (
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => debouncedRouter.push(`/news/article-detail?id=${item.id}`)}
        activeOpacity={0.7}
      >
        {item.image_url && (
          <CachedImage 
            source={{ uri: item.image_url }} 
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.articleContent}>
          <View style={styles.articleMeta}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            <View style={styles.dateContainer}>
              <Clock size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.dateText}>{formatDate(item.published_at)}</Text>
            </View>
          </View>

          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.subtitle && (
            <Text style={styles.articleSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          )}

          <View style={styles.articleFooter}>
            <View style={styles.statsContainer}>
              <TrendingUp size={14} color="#6B7280" strokeWidth={2} />
              <Text style={styles.statsText}>{item.view_count} views</Text>
            </View>

            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                toggleBookmark(item.id);
              }}
              style={styles.bookmarkButton}
            >
              <Bookmark 
                size={18} 
                color={isBookmarked ? '#ffc857' : '#9CA3AF'} 
                fill={isBookmarked ? '#ffc857' : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedArticle = () => {
    if (filteredArticles.length === 0) return null;
    const featured = filteredArticles.find(a => a.is_featured) || filteredArticles[0];

    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={() => debouncedRouter.push(`/news/article-detail?id=${featured.id}`)}
        activeOpacity={0.85}
      >
        <CachedImage 
          source={{ uri: featured.image_url }} 
          style={styles.featuredImage}
          resizeMode="cover"
        />
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredBadge}>
            <TrendingUp size={14} color="#ffc857" strokeWidth={2.5} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={3}>
            {featured.title}
          </Text>
          {featured.subtitle && (
            <Text style={styles.featuredSubtitle} numberOfLines={2}>
              {featured.subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#0F172A" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Articles</Text>
          <View style={styles.placeholderButton} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#9CA3AF" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filters */}
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
                selectedCategory === category && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Articles List */}
      <FlatList
        data={filteredArticles}
        renderItem={renderArticleCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderFeaturedArticle}
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
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffc857" />
              <Text style={styles.loadingText}>Loading articles...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Search size={64} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No articles found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try different search terms' : 'Check back later for new content'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#ffc857',
    borderColor: '#ffc857',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  featuredCard: {
    width: width - 32,
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#0F172A',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffc857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 28,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  articleImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  articleContent: {
    padding: 16,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffc857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  bookmarkButton: {
    padding: 6,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
