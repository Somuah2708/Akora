import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share as RNShare,
  Linking,
  Animated,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  ThumbsUp,
  MessageCircle,
  Clock,
  ExternalLink,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { preferencesService } from '@/lib/services/preferences-service';
import { NEWS_SOURCES } from '@/lib/constants/news';
import { NewsArticle } from '@/lib/types/news';
import NewsCard from '@/components/news/NewsCard';

const { width, height } = Dimensions.get('window');

export default function ArticleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Parse article data
    if (params.articleData) {
      try {
        const parsed = JSON.parse(params.articleData as string);
        setArticle(parsed);
      } catch (error) {
        console.error('Error parsing article:', error);
      }
    }

    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, [params]);

  useEffect(() => {
    if (article && userId) {
      checkBookmarkStatus();
      checkLikeStatus();
      fetchRelatedArticles();
      trackArticleView();
    }
  }, [article, userId]);

  const checkBookmarkStatus = async () => {
    if (!article || !userId) return;
    
    try {
      const { data } = await supabase
        .from('news_bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', article.id)
        .single();
      
      setIsBookmarked(!!data);
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!article || !userId) return;
    
    try {
      const { data } = await supabase
        .from('news_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', article.id)
        .single();
      
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like:', error);
    }
  };

  const fetchRelatedArticles = async () => {
    if (!article) return;
    
    // Fetch articles from the same category
    try {
      const { data } = await supabase
        .from('news_articles')
        .select('*')
        .eq('category', article.category)
        .neq('id', article.id)
        .limit(3);
      
      if (data) {
        setRelatedArticles(data as any);
      }
    } catch (error) {
      console.error('Error fetching related:', error);
    }
  };

  const trackArticleView = async () => {
    if (!article || !userId) return;
    
    try {
      await supabase.from('news_reading_history').upsert({
        user_id: userId,
        article_id: article.id,
        article_data: article,
        read_at: new Date().toISOString(),
        read_progress: 0,
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleBookmark = async () => {
    if (!article || !userId) return;
    
    try {
      if (isBookmarked) {
        await supabase
          .from('news_bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('article_id', article.id);
        setIsBookmarked(false);
      } else {
        await supabase.from('news_bookmarks').insert({
          user_id: userId,
          article_id: article.id,
          article_data: article,
        });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  const handleLike = async () => {
    if (!article || !userId) return;
    
    try {
      if (isLiked) {
        await supabase
          .from('news_likes')
          .delete()
          .eq('user_id', userId)
          .eq('article_id', article.id);
        setIsLiked(false);
      } else {
        await supabase.from('news_likes').insert({
          user_id: userId,
          article_id: article.id,
        });
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const handleShare = async () => {
    if (!article) return;
    
    try {
      await RNShare.share({
        message: `${article.title}\n\n${article.description}\n\nRead more: ${article.url}`,
        url: article.url,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openOriginalArticle = () => {
    if (article?.url) {
      Linking.openURL(article.url);
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const progress = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
    setReadProgress(Math.min(Math.max(progress, 0), 100));
  };

  if (!article) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading article...</Text>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Validate image URI
  const getValidImageUri = (uri: string | undefined | null): string => {
    if (!uri || uri.trim() === '') {
      return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';
    }
    try {
      new URL(uri);
      return uri;
    } catch {
      return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';
    }
  };

  const imageUri = getValidImageUri(article?.urlToImage);

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {article.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleBookmark} style={styles.headerButton}>
            <Bookmark
              size={24}
              color={isBookmarked ? '#FF3B30' : '#000'}
              fill={isBookmarked ? '#FF3B30' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Share2 size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Reading Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${readProgress}%` }]} />
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image */}
        <Animated.View style={styles.heroContainer}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[styles.heroImage, { transform: [{ scale: imageScale }] }]}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          >
            <View style={styles.floatingActions}>
              <TouchableOpacity onPress={() => router.back()} style={styles.floatingButton}>
                <ArrowLeft size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.floatingButtonsRight}>
                <TouchableOpacity onPress={handleBookmark} style={styles.floatingButton}>
                  <Bookmark
                    size={24}
                    color={isBookmarked ? '#FF3B30' : '#FFF'}
                    fill={isBookmarked ? '#FF3B30' : 'transparent'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.floatingButton}>
                  <Share2 size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Article Content */}
        <View style={styles.contentContainer}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Meta Information */}
          <View style={styles.metaContainer}>
            <View style={styles.metaLeft}>
              {article.source.logo ? (
                <Image source={{ uri: article.source.logo }} style={styles.sourceLogo} />
              ) : null}
              <Text style={styles.sourceName}>{article.source.name}</Text>
              {article.author && (
                <>
                  <View style={styles.metaDot} />
                  <Text style={styles.authorName}>{article.author}</Text>
                </>
              )}
              {article.readTime ? (
                <>
                  <View style={styles.metaDot} />
                  <Text style={styles.readTime}>{article.readTime} min read</Text>
                </>
              ) : null}
            </View>
            <View style={styles.metaRight}>
              <Clock size={14} color="#8E8E93" />
              <Text style={styles.metaTime}>{formatTime(article.publishedAt)}</Text>
            </View>
          </View>

          {/* Read Time */}
          {article.readTime && (
            <View style={styles.readTimeContainer}>
              <Text style={styles.readTimeText}>{article.readTime} min read</Text>
            </View>
          )}

          {/* Description */}
          {article.description && (
            <Text style={styles.description}>{article.description}</Text>
          )}

          {/* Content */}
          <Text style={styles.content}>{article.content}</Text>

          {/* Read Original Button */}
          <TouchableOpacity style={styles.originalButton} onPress={openOriginalArticle}>
            <ExternalLink size={20} color="#007AFF" />
            <Text style={styles.originalButtonText}>Read Full Article on {article.source.name}</Text>
          </TouchableOpacity>

          {/* Actions (no synthetic counters) */}
          <View style={styles.engagementContainer}>
            <TouchableOpacity style={styles.engagementButton} onPress={handleShare}>
              <Share2 size={24} color="#8E8E93" />
              <Text style={styles.engagementText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={async () => {
                try {
                  const current = await preferencesService.getMutedSources();
                  if (!current.includes(article.source.id)) {
                    await preferencesService.setMutedSources([...current, article.source.id]);
                    Alert.alert('Muted', `${article.source.name} muted.`);
                  } else {
                    Alert.alert('Already muted', `${article.source.name} already muted.`);
                  }
                } catch {}
              }}
            >
              <Text style={styles.engagementText}>Mute Source</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={async () => {
                try {
                  const favs = await preferencesService.getFavoriteCategories();
                  if (!favs.includes(article.category)) {
                    await preferencesService.setFavoriteCategories([...favs, article.category]);
                    Alert.alert('Favorited', `${article.category} will rank higher.`);
                  } else {
                    Alert.alert('Already favorite', `${article.category} already favored.`);
                  }
                } catch {}
              }}
            >
              <Text style={styles.engagementText}>Favorite Category</Text>
            </TouchableOpacity>
          </View>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>Related Articles</Text>
              {relatedArticles.map((related) => (
                <NewsCard
                  key={related.id}
                  article={related}
                  variant="compact"
                  onPress={() => {
                    router.push({
                      pathname: '/news/article-detail',
                      params: { articleData: JSON.stringify(related) },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  progressBar: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#F2F2F7',
    zIndex: 1000,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    width: '100%',
    height: 400,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  floatingActions: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  contentContainer: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 36,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: '#F2F2F7',
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8E8E93',
    marginHorizontal: 8,
  },
  authorName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  readTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  readTimeContainer: {
    marginBottom: 20,
  },
  readTimeText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  description: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 26,
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 26,
    marginBottom: 24,
  },
  originalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  originalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  engagementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F2F2F7',
    marginBottom: 32,
  },
  engagementButton: {
    alignItems: 'center',
    gap: 8,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  relatedSection: {
    marginTop: 32,
  },
  relatedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
