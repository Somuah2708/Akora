import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Clock, ThumbsUp, MessageCircle, Share2, Bookmark } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NewsArticle } from '@/lib/types/news';

const { width } = Dimensions.get('window');

interface NewsCardProps {
  article: NewsArticle;
  variant?: 'horizontal' | 'vertical' | 'featured' | 'compact';
  onPress?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  isBookmarked?: boolean;
}

export default function NewsCard({
  article,
  variant = 'vertical',
  onPress,
  onBookmark,
  onShare,
  isBookmarked = false,
}: NewsCardProps) {
  // Validate image URI
  const getValidImageUri = (uri: string | undefined | null): string => {
    if (!uri || uri.trim() === '') {
      return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';
    }
    // Check if it's a valid URL format
    try {
      new URL(uri);
      return uri;
    } catch {
      return 'https://images.unsplash.com/photo-504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60';
    }
  };

  const imageUri = getValidImageUri(article.urlToImage);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
        <Image source={{ uri: imageUri }} style={styles.featuredImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.featuredGradient}
        >
          {article.isBreaking && (
            <View style={styles.breakingBadge}>
              <Text style={styles.breakingText}>BREAKING</Text>
            </View>
          )}
          <View style={styles.featuredContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
            </View>
            <Text style={styles.featuredTitle} numberOfLines={3}>
              {article.title}
            </Text>
            <View style={styles.featuredMeta}>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{article.source.name}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaTime}>{formatTime(article.publishedAt)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity style={styles.horizontalCard} onPress={onPress} activeOpacity={0.9}>
        <Image source={{ uri: imageUri }} style={styles.horizontalImage} />
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalHeader}>
            <Text style={styles.categoryLabel}>{article.category.toUpperCase()}</Text>
            {article.isBreaking && <Text style={styles.breakingLabel}>🔴 LIVE</Text>}
          </View>
          <Text style={styles.horizontalTitle} numberOfLines={3}>
            {article.title}
          </Text>
          <Text style={styles.horizontalDescription} numberOfLines={2}>
            {article.description}
          </Text>
          <View style={styles.horizontalFooter}>
            <View style={styles.metaRow}>
              <Text style={styles.sourceText}>{article.source.name}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.timeText}>{formatTime(article.publishedAt)}</Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={onBookmark} style={styles.actionButton}>
                <Bookmark 
                  size={16} 
                  color={isBookmarked ? '#FF3B30' : '#8E8E93'} 
                  fill={isBookmarked ? '#FF3B30' : 'transparent'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onShare} style={styles.actionButton}>
                <Share2 size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactCategory}>{article.category.toUpperCase()}</Text>
            {article.isBreaking && <View style={styles.liveDot} />}
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.compactMeta}>
            <Text style={styles.compactSource}>{article.source.name}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.compactTime}>{formatTime(article.publishedAt)}</Text>
          </View>
        </View>
        <Image source={{ uri: imageUri }} style={styles.compactImage} />
      </TouchableOpacity>
    );
  }

  // Default: vertical card
  return (
    <TouchableOpacity style={styles.verticalCard} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: imageUri }} style={styles.verticalImage} />
      {article.isBreaking && (
        <View style={styles.breakingOverlay}>
          <Text style={styles.breakingOverlayText}>BREAKING NEWS</Text>
        </View>
      )}
      <View style={styles.verticalContent}>
        <Text style={styles.verticalCategory}>{article.category.toUpperCase()}</Text>
        <Text style={styles.verticalTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.verticalDescription} numberOfLines={2}>
          {article.description}
        </Text>
        <View style={styles.verticalFooter}>
          <View style={styles.verticalMeta}>
            <Text style={styles.verticalSource}>{article.source.name}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.verticalTime}>{formatTime(article.publishedAt)}</Text>
          </View>
          <View style={styles.verticalStats}>
            <View style={styles.statItem}>
              <ThumbsUp size={12} color="#8E8E93" />
              <Text style={styles.statText}>{formatNumber(article.likeCount || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <MessageCircle size={12} color="#8E8E93" />
              <Text style={styles.statText}>{formatNumber(article.commentCount || 0)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured Card
  featuredCard: {
    width: width - 32,
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#000',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  featuredContent: {
    gap: 8,
  },
  breakingBadge: {
    position: 'absolute',
    top: 16,
    left: 20,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  breakingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  featuredMeta: {
    marginTop: 4,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    opacity: 0.7,
  },
  metaTime: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.8,
  },

  // Horizontal Card
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  horizontalImage: {
    width: 120,
    height: 140,
  },
  horizontalContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  horizontalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  breakingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF3B30',
  },
  horizontalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 21,
    marginVertical: 4,
  },
  horizontalDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  horizontalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },

  // Compact Card
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  compactContent: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'space-between',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20,
    marginTop: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compactSource: {
    fontSize: 12,
    color: '#8E8E93',
  },
  compactTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },

  // Vertical Card
  verticalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  verticalImage: {
    width: '100%',
    height: 200,
  },
  breakingOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  breakingOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verticalContent: {
    padding: 16,
  },
  verticalCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  verticalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 24,
    marginBottom: 6,
  },
  verticalDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  verticalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verticalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalSource: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  verticalTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  verticalStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
