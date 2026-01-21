import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share as RNShare,
  Linking,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { debouncedRouter } from '@/utils/navigationDebounce';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Share2,
  Clock,
  ExternalLink,
  Eye,
  ChevronUp,
  MoreHorizontal,
  Type,
  Minus,
  Plus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import CachedImage from '@/components/CachedImage';

const { width, height } = Dimensions.get('window');

// Category colors
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
  sports: '#10B981',
};

interface Article {
  id: string;
  title: string;
  subtitle?: string;
  summary?: string;
  article_content?: string;
  image_url: string;
  category?: string;
  published_at: string;
  reading_time_minutes?: number;
  view_count?: number;
  link_url?: string;
  author_id?: string;
  source_name?: string;
  source_author?: string;
}

// Function to parse and render HTML content as React Native components
const parseHTMLContent = (html: string, fontSize: number): React.ReactNode[] => {
  if (!html) return [];
  
  // Clean up the HTML string
  let content = html
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const elements: React.ReactNode[] = [];
  let key = 0;

  // Split content into sections based on HTML tags
  const sections = content.split(/(<[^>]+>)/g).filter(s => s.trim());
  
  let currentText = '';
  let isInTag = false;
  let currentTag = '';
  let listItems: string[] = [];
  let isInList = false;

  const pushText = (text: string, style?: any) => {
    // Clean up text: normalize whitespace but preserve intentional line breaks
    const cleanedText = text
      .replace(/\s+/g, ' ')  // Normalize all whitespace to single spaces
      .trim();
    
    if (cleanedText) {
      elements.push(
        <Text key={key++} style={[styles.paragraph, { fontSize, lineHeight: fontSize * 1.75 }, style]}>
          {cleanedText}
        </Text>
      );
    }
  };

  const pushHeading = (text: string, level: number) => {
    const headingStyles: Record<number, any> = {
      1: { fontSize: fontSize + 10, fontWeight: '800' as const, marginTop: 28, marginBottom: 16 },
      2: { fontSize: fontSize + 6, fontWeight: '700' as const, marginTop: 24, marginBottom: 14 },
      3: { fontSize: fontSize + 3, fontWeight: '700' as const, marginTop: 20, marginBottom: 12 },
      4: { fontSize: fontSize + 1, fontWeight: '600' as const, marginTop: 16, marginBottom: 10 },
    };
    
    if (text.trim()) {
      elements.push(
        <Text 
          key={key++} 
          style={[
            styles.heading, 
            headingStyles[level] || headingStyles[2],
            { color: '#0F172A' }
          ]}
        >
          {text.trim()}
        </Text>
      );
    }
  };

  const pushList = (items: string[]) => {
    if (items.length > 0) {
      elements.push(
        <View key={key++} style={styles.listContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.bulletPoint} />
              <Text style={[styles.listItemText, { fontSize, lineHeight: fontSize * 1.6 }]}>
                {item.trim()}
              </Text>
            </View>
          ))}
        </View>
      );
    }
  };

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Check if this is an HTML tag
    if (section.startsWith('<')) {
      const tagMatch = section.match(/<\/?(\w+)/);
      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        const isClosing = section.startsWith('</');
        
        if (!isClosing) {
          // Opening tags
          switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
              if (currentText.trim()) pushText(currentText);
              currentText = '';
              currentTag = tagName;
              break;
            case 'ul':
            case 'ol':
              if (currentText.trim()) pushText(currentText);
              currentText = '';
              isInList = true;
              listItems = [];
              break;
            case 'li':
              currentText = '';
              break;
            case 'p':
              if (currentText.trim()) pushText(currentText);
              currentText = '';
              break;
            case 'strong':
            case 'b':
              // Will be handled inline
              break;
            case 'br':
              currentText += '\n';
              break;
          }
        } else {
          // Closing tags
          switch (tagName) {
            case 'h1':
              pushHeading(currentText, 1);
              currentText = '';
              currentTag = '';
              break;
            case 'h2':
              pushHeading(currentText, 2);
              currentText = '';
              currentTag = '';
              break;
            case 'h3':
              pushHeading(currentText, 3);
              currentText = '';
              currentTag = '';
              break;
            case 'h4':
              pushHeading(currentText, 4);
              currentText = '';
              currentTag = '';
              break;
            case 'ul':
            case 'ol':
              pushList(listItems);
              isInList = false;
              listItems = [];
              break;
            case 'li':
              if (currentText.trim()) {
                listItems.push(currentText.trim());
              }
              currentText = '';
              break;
            case 'p':
              if (currentText.trim()) pushText(currentText);
              currentText = '';
              break;
          }
        }
      }
    } else {
      // This is text content
      currentText += section;
    }
  }
  
  // Push any remaining text
  if (currentText.trim()) {
    if (currentTag.startsWith('h')) {
      const level = parseInt(currentTag[1]) || 2;
      pushHeading(currentText, level);
    } else {
      pushText(currentText);
    }
  }

  // If no HTML was parsed, just split by newlines and render as paragraphs
  if (elements.length === 0 && content.trim()) {
    const paragraphs = content.split(/\n\n+/);
    paragraphs.forEach((para, index) => {
      if (para.trim()) {
        elements.push(
          <Text 
            key={index} 
            style={[styles.paragraph, { fontSize, lineHeight: fontSize * 1.7 }]}
          >
            {para.trim()}
          </Text>
        );
      }
    });
  }

  return elements;
};

export default function ArticleDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [fontSize, setFontSize] = useState(17);

  useEffect(() => {
    if (params.id) {
      loadArticle();
    }
  }, [params.id]);

  useEffect(() => {
    if (article && user) {
      checkBookmarkStatus();
    }
  }, [article, user]);

  const loadArticle = async () => {
    setLoading(true);
    
    try {
      if (params.id) {
        // Fetch article from database by ID
        const { data, error } = await supabase
          .from('trending_articles')
          .select('*')
          .eq('id', params.id)
          .single();

        if (!error && data) {
          setArticle(data as Article);
          
          // Increment view count - try RPC first, then direct update as fallback
          try {
            await supabase.rpc('increment_article_view_count', { article_id: params.id });
          } catch (e) {
            // Fallback: direct update if RPC doesn't exist
            try {
              await supabase
                .from('trending_articles')
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq('id', params.id);
            } catch (updateError) {
              console.log('Could not update view count');
            }
          }
        }
      } else if (params.articleData) {
        try {
          const parsed = JSON.parse(params.articleData as string);
          // Transform if needed
          const transformedArticle: Article = {
            id: parsed.id,
            title: parsed.title,
            subtitle: parsed.description || parsed.subtitle,
            summary: parsed.summary || parsed.description,
            article_content: parsed.content || parsed.article_content,
            image_url: parsed.urlToImage || parsed.image_url,
            category: parsed.category,
            published_at: parsed.publishedAt || parsed.published_at,
            reading_time_minutes: parsed.readTime || parsed.reading_time_minutes || 5,
            view_count: parsed.view_count || 0,
            link_url: parsed.url || parsed.link_url,
            source_name: parsed.source?.name || 'Akora',
          };
          setArticle(transformedArticle);
        } catch (error) {
          console.error('Error parsing article:', error);
        }
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!article || !user) return;
    
    try {
      // Check article_favorites first
      const { data: favData } = await supabase
        .from('article_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('article_id', article.id)
        .single();
      
      if (favData) {
        setIsBookmarked(true);
        return;
      }

      // Check news_bookmarks as fallback
      const { data: bookmarkData } = await supabase
        .from('news_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('article_id', article.id)
        .single();
      
      setIsBookmarked(!!bookmarkData);
    } catch (error) {
      // Not bookmarked
    }
  };



  const handleBookmark = async () => {
    if (!article || !user) return;
    
    setIsBookmarked(!isBookmarked);
    
    try {
      if (isBookmarked) {
        await supabase
          .from('article_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', article.id);
      } else {
        await supabase.from('article_favorites').insert({
          user_id: user.id,
          article_id: article.id,
        });
      }
    } catch (error) {
      setIsBookmarked(isBookmarked);
      console.error('Error bookmarking:', error);
    }
  };



  const handleShare = async () => {
    if (!article) return;
    
    try {
      await RNShare.share({
        message: `${article.title}\n\n${article.subtitle || article.summary || ''}\n\nRead on Akora`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const progress = (contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100;
    setReadProgress(Math.min(Math.max(progress, 0), 100));
    setShowScrollTop(contentOffset.y > 500);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category?: string) => {
    return CATEGORY_COLORS[category?.toLowerCase() || ''] || '#6B7280';
  };

  const getCategoryName = (category?: string) => {
    if (!category) return 'News';
    return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getImageUrl = (url?: string) => {
    if (!url || url.trim() === '') {
      return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';
    }
    return url;
  };

  // Calculate actual reading time based on content
  const calculateReadingTime = useMemo(() => {
    if (!article) return 1;
    
    // Combine all text content
    const allText = [
      article.title,
      article.subtitle,
      article.summary,
      article.article_content
    ]
      .filter(Boolean)
      .join(' ')
      // Strip HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Count words (split by spaces)
    const wordCount = allText.split(' ').filter(word => word.length > 0).length;
    
    // Calculate reading time at 200 words per minute, minimum 1 minute
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [article]);

  // Render article content
  const renderedContent = useMemo(() => {
    if (!article) return null;
    
    const content = article.article_content || article.summary || '';
    return parseHTMLContent(content, fontSize);
  }, [article, fontSize]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 250],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading article...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Article not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Header (appears on scroll) */}
      <Animated.View 
        style={[
          styles.animatedHeader, 
          { 
            paddingTop: insets.top,
            opacity: headerOpacity,
          }
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {article.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleBookmark} style={styles.headerBtn}>
            {isBookmarked ? (
              <BookmarkCheck size={22} color="#ffc857" fill="#ffc857" />
            ) : (
              <Bookmark size={22} color="#0F172A" />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Reading Progress Bar */}
      <View style={[styles.progressBar, { top: insets.top + 56 }]}>
        <View style={[styles.progressFill, { width: `${readProgress}%` }]} />
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <CachedImage
            source={{ uri: getImageUrl(article.image_url) }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.3, 1]}
            style={styles.heroGradient}
          >
            {/* Top Navigation */}
            <View style={[styles.heroNav, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.heroNavBtn}>
                <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={styles.heroNavRight}>
                <TouchableOpacity onPress={handleBookmark} style={styles.heroNavBtn}>
                  {isBookmarked ? (
                    <BookmarkCheck size={22} color="#ffc857" fill="#ffc857" />
                  ) : (
                    <Bookmark size={22} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.heroNavBtn}>
                  <Share2 size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Content */}
            <View style={styles.heroContent}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
                <Text style={styles.categoryText}>
                  {getCategoryName(article.category)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Article Content */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Clock size={14} color="#64748B" />
                <Text style={styles.metaText}>
                  {calculateReadingTime} min read
                </Text>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaItem}>
                <Eye size={14} color="#64748B" />
                <Text style={styles.metaText}>
                  {article.view_count || 0} views
                </Text>
              </View>
            </View>
            <Text style={styles.dateText}>{formatDate(article.published_at)}</Text>
          </View>

          {/* Subtitle/Summary */}
          {article.subtitle && (
            <Text style={styles.subtitle}>{article.subtitle}</Text>
          )}

          {/* Font Size Control */}
          <View style={styles.fontSizeControl}>
            <Type size={16} color="#64748B" />
            <TouchableOpacity 
              style={styles.fontSizeBtn}
              onPress={() => setFontSize(Math.max(14, fontSize - 1))}
            >
              <Minus size={16} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.fontSizeText}>{fontSize}</Text>
            <TouchableOpacity 
              style={styles.fontSizeBtn}
              onPress={() => setFontSize(Math.min(24, fontSize + 1))}
            >
              <Plus size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Article Body */}
          <View style={styles.articleBody}>
            {renderedContent}
          </View>

          {/* Source Attribution */}
          {(article.source_name || article.source_author || article.link_url) && (
            <View style={styles.attributionContainer}>
              <View style={styles.attributionHeader}>
                <View style={styles.attributionIcon}>
                  <ExternalLink size={16} color="#64748B" />
                </View>
                <Text style={styles.attributionTitle}>Source</Text>
              </View>
              
              {(article.source_name || article.source_author) && (
                <View style={styles.attributionDetails}>
                  {article.source_name && (
                    <View style={styles.attributionRow}>
                      <Text style={styles.attributionLabel}>Publication:</Text>
                      <Text style={styles.attributionValue}>{article.source_name}</Text>
                    </View>
                  )}
                  {article.source_author && (
                    <View style={styles.attributionRow}>
                      <Text style={styles.attributionLabel}>Author:</Text>
                      <Text style={styles.attributionValue}>{article.source_author}</Text>
                    </View>
                  )}
                </View>
              )}
              
              {article.link_url && (
                <TouchableOpacity 
                  style={styles.sourceLink}
                  onPress={() => Linking.openURL(article.link_url!)}
                >
                  <ExternalLink size={16} color="#3B82F6" />
                  <Text style={styles.sourceLinkText}>Read original article</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Engagement Actions */}
          <View style={styles.engagementContainer}>
            <TouchableOpacity 
              style={[styles.engagementBtn, isBookmarked && styles.engagementBtnActive]}
              onPress={handleBookmark}
            >
              {isBookmarked ? (
                <BookmarkCheck size={22} color="#ffc857" fill="#ffc857" />
              ) : (
                <Bookmark size={22} color="#64748B" />
              )}
              <Text style={[styles.engagementText, isBookmarked && { color: '#ffc857' }]}>
                {isBookmarked ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.engagementBtn} onPress={handleShare}>
              <Share2 size={22} color="#64748B" />
              <Text style={styles.engagementText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Padding */}
          <View style={{ height: 60 }} />
        </View>
      </Animated.ScrollView>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <TouchableOpacity style={styles.scrollTopBtn} onPress={scrollToTop}>
          <ChevronUp size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#ffc857',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Animated Header
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Progress Bar
  progressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#F1F5F9',
    zIndex: 101,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffc857',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Hero Section
  heroContainer: {
    width: '100%',
    height: 350,
    backgroundColor: '#1E293B',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavRight: {
    flexDirection: 'row',
    gap: 12,
  },
  heroContent: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Content Container
  contentContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  metaContainer: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  dateText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 28,
    marginBottom: 20,
    fontStyle: 'italic',
  },

  // Font Size Control
  fontSizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  fontSizeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fontSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    width: 24,
    textAlign: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 24,
  },

  // Article Body
  articleBody: {
    marginBottom: 32,
  },
  heading: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  paragraph: {
    color: '#334155',
    marginBottom: 18,
    textAlign: 'left',
  },
  listContainer: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffc857',
    marginTop: 8,
    marginRight: 14,
  },
  listItemText: {
    flex: 1,
    color: '#334155',
  },

  // Source Attribution
  attributionContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  attributionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attributionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attributionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  attributionLabel: {
    fontSize: 14,
    color: '#64748B',
    width: 90,
  },
  attributionValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Source Link
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
  },
  sourceLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // Engagement
  engagementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  engagementBtn: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  engagementBtnActive: {
    backgroundColor: '#FEF3C7',
  },
  engagementText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Scroll to Top
  scrollTopBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
