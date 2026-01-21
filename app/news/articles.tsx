import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl, 
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  TrendingUp, 
  Clock, 
  Bookmark, 
  BookmarkCheck,
  X, 
  ArrowLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Globe,
  MapPin,
  GraduationCap,
  Users,
  Calendar,
  Trophy,
  Briefcase,
  Cpu,
  BookOpen,
  Activity,
  Bell,
  Eye,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type TrendingArticle } from '@/lib/supabase';
import CachedImage from '@/components/CachedImage';

const { width, height } = Dimensions.get('window');

// Expanded categories with icons and colors
const CATEGORIES = [
  { id: 'all', name: 'For You', icon: Sparkles, color: '#ffc857' },
  { id: 'trending', name: 'Trending', icon: Flame, color: '#EF4444' },
  { id: 'school_news', name: 'School', icon: GraduationCap, color: '#3B82F6' },
  { id: 'alumni_news', name: 'Alumni', icon: Users, color: '#8B5CF6' },
  { id: 'ghana_news', name: 'Ghana', icon: MapPin, color: '#EF4444' },
  { id: 'international', name: 'World', icon: Globe, color: '#06B6D4' },
  { id: 'business', name: 'Business', icon: Briefcase, color: '#84CC16' },
  { id: 'technology', name: 'Tech', icon: Cpu, color: '#6366F1' },
  { id: 'events', name: 'Events', icon: Calendar, color: '#EC4899' },
  { id: 'achievements', name: 'Success', icon: Trophy, color: '#F59E0B' },
  { id: 'education', name: 'Learn', icon: BookOpen, color: '#14B8A6' },
  { id: 'health', name: 'Health', icon: Activity, color: '#22C55E' },
];

interface ArticleAuthor {
  first_name: string;
  surname: string;
  avatar_url?: string;
}

interface ArticleWithMeta extends Omit<TrendingArticle, 'author'> {
  like_count?: number;
  comment_count?: number;
  reading_time_minutes?: number;
  tags?: string[];
  author?: ArticleAuthor;
}

export default function ArticlesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [articles, setArticles] = useState<ArticleWithMeta[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<ArticleWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favoriteArticles, setFavoriteArticles] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchArticles();
    if (user) {
      fetchFavorites();
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
        .select(`
          *,
          author:profiles!trending_articles_author_id_fkey(
            first_name,
            surname,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      // Fallback query without author join
      try {
        const { data, error: fallbackError } = await supabase
          .from('trending_articles')
          .select('*')
          .eq('is_active', true)
          .order('published_at', { ascending: false });
        
        if (!fallbackError) {
          setArticles(data || []);
        }
      } catch (e) {
        console.error('Fallback query also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('article_favorites')
        .select('article_id')
        .eq('user_id', user?.id);

      if (!error && data) {
        setFavoriteArticles(new Set(data.map((f: any) => f.article_id)));
      }
    } catch (error) {
      // Table might not exist yet, silently fail
      console.log('Favorites table may not exist yet');
    }
  };



  const toggleFavorite = async (articleId: string) => {
    if (!user) return;

    const isFavorited = favoriteArticles.has(articleId);
    
    // Optimistic update
    setFavoriteArticles(prev => {
      const next = new Set(prev);
      if (isFavorited) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });

    try {
      if (isFavorited) {
        await supabase
          .from('article_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId);
      } else {
        await supabase.from('article_favorites').insert({
          user_id: user.id,
          article_id: articleId,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setFavoriteArticles(prev => {
        const next = new Set(prev);
        if (isFavorited) {
          next.add(articleId);
        } else {
          next.delete(articleId);
        }
        return next;
      });
      console.error('Error toggling favorite:', error);
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
        article.summary?.toLowerCase().includes(query) ||
        article.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory === 'trending') {
      filtered = filtered.filter(article => article.is_featured || (article.view_count || 0) > 100);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(article =>
        article.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredArticles(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchArticles(), 
      user ? fetchFavorites() : Promise.resolve()
    ]);
    setRefreshing(false);
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category?.toLowerCase());
    return cat?.color || '#6B7280';
  };

  const getCategoryDisplayName = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category?.toLowerCase());
    return cat?.name || category || 'News';
  };

  // Get hero articles (first 5, prioritizing featured)
  const getHeroArticles = () => {
    const featured = filteredArticles.filter(a => a.is_featured);
    const nonFeatured = filteredArticles.filter(a => !a.is_featured);
    // Combine featured first, then non-featured, take up to 5
    return [...featured, ...nonFeatured].slice(0, 5);
  };

  // Get remaining articles (everything not in hero)
  const getRemainingArticles = () => {
    const heroIds = new Set(getHeroArticles().map(a => a.id));
    return filteredArticles.filter(a => !heroIds.has(a.id));
  };

  // Hero/Featured Section
  const renderHeroSection = () => {
    const heroArticles = getHeroArticles();
    if (heroArticles.length === 0) return null;

    const mainFeatured = heroArticles[0];

    return (
      <View style={styles.heroSection}>
        {/* Main Featured Article */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => debouncedRouter.push(`/news/article-detail?id=${mainFeatured.id}`)}
          activeOpacity={0.9}
        >
          <CachedImage 
            source={{ uri: mainFeatured.image_url }} 
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.heroCategoryBadge, { backgroundColor: getCategoryColor(mainFeatured.category || '') }]}>
                  <Text style={styles.heroCategoryText}>
                    {getCategoryDisplayName(mainFeatured.category || 'News')}
                  </Text>
                </View>
                {mainFeatured.is_featured && (
                  <View style={styles.featuredBadge}>
                    <Flame size={12} color="#ffc857" />
                    <Text style={styles.featuredText}>Featured</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.heroTitle} numberOfLines={3}>
                {mainFeatured.title}
              </Text>
              
              {mainFeatured.subtitle && (
                <Text style={styles.heroSubtitle} numberOfLines={2}>
                  {mainFeatured.subtitle}
                </Text>
              )}
              
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaLeft}>
                  <Clock size={14} color="#D1D5DB" />
                  <Text style={styles.heroMetaText}>
                    {mainFeatured.reading_time_minutes || 5} min read
                  </Text>
                  <Text style={styles.heroDot}>•</Text>
                  <Text style={styles.heroMetaText}>
                    {formatDate(mainFeatured.published_at)}
                  </Text>
                </View>
                <View style={styles.heroActions}>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(mainFeatured.id);
                    }}
                    style={styles.heroActionBtn}
                  >
                    {favoriteArticles.has(mainFeatured.id) ? (
                      <BookmarkCheck size={20} color="#ffc857" fill="#ffc857" />
                    ) : (
                      <Bookmark size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary Featured (if available) */}
        {heroArticles.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.secondaryFeaturedScroll}
            contentContainerStyle={styles.secondaryFeaturedContent}
          >
            {heroArticles.slice(1, 5).map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.secondaryCard}
                onPress={() => debouncedRouter.push(`/news/article-detail?id=${article.id}`)}
                activeOpacity={0.8}
              >
                <CachedImage 
                  source={{ uri: article.image_url }} 
                  style={styles.secondaryImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.secondaryGradient}
                >
                  <View style={[styles.miniCategoryBadge, { backgroundColor: getCategoryColor(article.category || '') }]}>
                    <Text style={styles.miniCategoryText}>
                      {getCategoryDisplayName(article.category || '')}
                    </Text>
                  </View>
                  <Text style={styles.secondaryTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <Text style={styles.secondaryMeta}>
                    {article.reading_time_minutes || 5} min • {formatDate(article.published_at)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // Section Header Component
  const renderSectionHeader = (title: string, onSeeAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>See All</Text>
          <ChevronRight size={16} color="#ffc857" />
        </TouchableOpacity>
      )}
    </View>
  );

  // Compact Article Card (for lists)
  const renderCompactCard = ({ item }: { item: ArticleWithMeta }) => {
    const isFavorited = favoriteArticles.has(item.id);
    
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => debouncedRouter.push(`/news/article-detail?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <CachedImage 
          source={{ uri: item.image_url }} 
          style={styles.compactImage}
        />
        
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <View style={[styles.compactCategoryBadge, { backgroundColor: `${getCategoryColor(item.category || '')}20` }]}>
              <Text style={[styles.compactCategoryText, { color: getCategoryColor(item.category || '') }]}>
                {getCategoryDisplayName(item.category || 'News')}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isFavorited ? (
                <BookmarkCheck size={18} color="#ffc857" fill="#ffc857" />
              ) : (
                <Bookmark size={18} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.compactTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.summary && (
            <Text style={styles.compactSummary} numberOfLines={2}>
              {item.summary}
            </Text>
          )}

          <View style={styles.compactFooter}>
            <View style={styles.compactMeta}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={styles.compactMetaText}>
                {item.reading_time_minutes || 5} min
              </Text>
              <Text style={styles.compactDot}>•</Text>
              <Text style={styles.compactMetaText}>
                {formatDate(item.published_at)}
              </Text>
            </View>
            
            <View style={styles.compactStats}>
              <View style={styles.compactStatBtn}>
                <Eye size={14} color="#9CA3AF" />
                <Text style={styles.compactStatText}>{item.view_count || 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Full Article Card (for mixed layouts)
  const renderFullCard = ({ item, index }: { item: ArticleWithMeta; index: number }) => {
    const isFavorited = favoriteArticles.has(item.id);

    // Alternate between full-width and side-by-side layouts
    if (index % 5 === 0) {
      return (
        <TouchableOpacity
          style={styles.fullCard}
          onPress={() => debouncedRouter.push(`/news/article-detail?id=${item.id}`)}
          activeOpacity={0.8}
        >
          <CachedImage 
            source={{ uri: item.image_url }} 
            style={styles.fullCardImage}
          />
          <View style={styles.fullCardContent}>
            <View style={styles.fullCardHeader}>
              <View style={[styles.fullCardBadge, { backgroundColor: getCategoryColor(item.category || '') }]}>
                <Text style={styles.fullCardBadgeText}>
                  {getCategoryDisplayName(item.category || 'News')}
                </Text>
              </View>
              <Text style={styles.fullCardDate}>{formatDate(item.published_at)}</Text>
            </View>
            
            <Text style={styles.fullCardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            {item.summary && (
              <Text style={styles.fullCardSummary} numberOfLines={2}>
                {item.summary}
              </Text>
            )}
            
            <View style={styles.fullCardFooter}>
              <View style={styles.fullCardMeta}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.fullCardMetaText}>{item.reading_time_minutes || 5} min read</Text>
              </View>
              
              <View style={styles.fullCardActions}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                >
                  {isFavorited ? (
                    <BookmarkCheck size={18} color="#ffc857" fill="#ffc857" />
                  ) : (
                    <Bookmark size={18} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return renderCompactCard({ item });
  };

  // Header with animated search
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top, opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.5} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Articles</Text>
            <Text style={styles.headerSubtitle}>Stay informed</Text>
          </View>
          
          <View style={styles.headerRight}>
            {(profile?.is_admin || profile?.role === 'admin' || profile?.can_publish_articles) && (
              <TouchableOpacity 
                onPress={() => debouncedRouter.push('/news/admin/articles')}
                style={styles.headerBtn}
              >
                <Shield size={22} color="#ffc857" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => setShowSearch(!showSearch)}
              style={styles.headerBtn}
            >
              <Search size={22} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => debouncedRouter.push('/news/bookmarks')}
              style={styles.headerBtn}
            >
              <Bookmark size={22} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar (Animated) */}
        {showSearch && (
          <Animated.View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search articles, topics, tags..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#9CA3AF" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Category Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category.id;
            const IconComponent = category.icon;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryPill,
                  isActive && { backgroundColor: category.color, borderColor: category.color }
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <IconComponent 
                  size={14} 
                  color={isActive ? '#FFFFFF' : category.color} 
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Main Content */}
      <Animated.FlatList
        data={getRemainingArticles()}
        renderItem={renderFullCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            {renderHeroSection()}
            {getRemainingArticles().length > 0 && renderSectionHeader('Latest Articles')}
          </>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
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
              <ActivityIndicator size="large" color="#0F172A" />
              <Text style={styles.loadingText}>Loading articles...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <BookOpen size={48} color="#D1D5DB" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No articles found</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'Try different search terms or browse categories' 
                  : 'Check back later for new content'}
              </Text>
              {searchQuery && (
                <TouchableOpacity 
                  style={styles.clearSearchBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  <Text style={styles.clearSearchText}>Clear filters</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 100,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
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
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    height: '100%',
  },
  
  // Categories Styles
  categoriesScroll: {
    marginTop: 4,
  },
  categoriesContent: {
    paddingRight: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  
  // Hero Section Styles
  heroSection: {
    paddingBottom: 8,
  },
  heroCard: {
    width: width - 32,
    height: 280,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroContent: {},
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroCategoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffc857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  heroDot: {
    color: '#6B7280',
    fontSize: 13,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroActionBtn: {
    padding: 6,
  },
  
  // Secondary Featured
  secondaryFeaturedScroll: {
    marginTop: 4,
  },
  secondaryFeaturedContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  secondaryCard: {
    width: 180,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  secondaryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  secondaryGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  miniCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  miniCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  secondaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 6,
  },
  secondaryMeta: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffc857',
  },
  
  // Compact Card Styles
  compactCard: {
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
  compactImage: {
    width: 110,
    height: 120,
  },
  compactContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  compactSummary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 4,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  compactDot: {
    color: '#D1D5DB',
    fontSize: 11,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactStatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  
  // Full Card Styles
  fullCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  fullCardImage: {
    width: '100%',
    height: 180,
  },
  fullCardContent: {
    padding: 16,
  },
  fullCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fullCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  fullCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fullCardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  fullCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  fullCardSummary: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  fullCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  fullCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullCardMetaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  fullCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },
  
  // List Styles
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  
  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 80,
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
  },
  clearSearchBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffc857',
    borderRadius: 12,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});
