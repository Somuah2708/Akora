import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Share, ActivityIndicator, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Share2, ExternalLink, Eye, Calendar, User as UserIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { supabase, type TrendingArticle, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

interface ArticleWithAuthor extends TrendingArticle {
  author?: Profile;
}

export default function TrendingArticleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<ArticleWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchArticle();
      incrementViewCount();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trending_articles')
        .select(`
          *,
          author:profiles(id, username, full_name, avatar_url)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching article:', error);
        throw error;
      }

      // Handle the author data properly
      const authorProfile = Array.isArray(data.author) ? data.author[0] : data.author;
      
      setArticle({
        ...data,
        author: authorProfile as Profile | undefined,
      });
    } catch (error) {
      console.error('Error fetching trending article:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_article_view_count', { article_id: id });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleShare = async () => {
    if (!article) return;

    try {
      await Share.share({
        message: `${article.title}\n\n${article.summary}\n\nRead more in the Akora app!`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  const handleExternalLink = async () => {
    if (!article?.link_url) return;

    try {
      const supported = await Linking.canOpenURL(article.link_url);
      if (supported) {
        await Linking.openURL(article.link_url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string; emoji: string }> = {
      alumni_news: { bg: '#DBEAFE', text: '#1E40AF', emoji: '📰' },
      events: { bg: '#FCE7F3', text: '#BE185D', emoji: '🎉' },
      achievements: { bg: '#FEF3C7', text: '#92400E', emoji: '🏆' },
      announcements: { bg: '#DCFCE7', text: '#166534', emoji: '📢' },
    };
    return styles[category] || styles.alumni_news;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </View>
    );
  }

  const categoryStyle = getCategoryStyle(article.category);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Share2 size={22} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image source={{ uri: article.image_url }} style={styles.heroImage} resizeMode="cover" />

        <View style={styles.content}>
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
            <Text style={styles.categoryEmoji}>{categoryStyle.emoji}</Text>
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
              {article.category.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Subtitle */}
          {article.subtitle && (
            <Text style={styles.subtitle}>{article.subtitle}</Text>
          )}

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Calendar size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.metaText}>{formatDate(article.published_at)}</Text>
            </View>
            {article.author && (
              <View style={styles.metaRow}>
                <UserIcon size={16} color="#6B7280" strokeWidth={2} />
                <Text style={styles.metaText}>{article.author.full_name || 'Admin'}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Eye size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.metaText}>{article.view_count} views</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>{article.summary}</Text>
          </View>

          {/* Article Content */}
          {article.article_content && (
            <View style={styles.articleContent}>
              <Text style={styles.articleText}>{article.article_content}</Text>
            </View>
          )}

          {/* External Link */}
          {article.link_url && (
            <TouchableOpacity 
              style={styles.externalLinkButton}
              onPress={handleExternalLink}
            >
              <ExternalLink size={20} color="#0EA5E9" strokeWidth={2} />
              <Text style={styles.externalLinkText}>Read More</Text>
            </TouchableOpacity>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    width: width,
    height: width * 0.6, // 16:9 ish aspect ratio
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 26,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  summaryContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '500',
  },
  articleContent: {
    marginBottom: 24,
  },
  articleText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#1F2937',
  },
  externalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  externalLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0EA5E9',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
});
