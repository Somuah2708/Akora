import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Animated 
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NewsArticle } from '@/lib/types/news';

const { width } = Dimensions.get('window');

interface BreakingNewsBannerProps {
  articles: NewsArticle[];
  onArticlePress?: (article: NewsArticle) => void;
}

export default function BreakingNewsBanner({ articles, onArticlePress }: BreakingNewsBannerProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing animation for the breaking badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!articles || articles.length === 0) {
    return null;
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF3B30', '#FF6B5A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.breakingText}>BREAKING NEWS</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={width - 32}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {articles.map((article, index) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleContainer}
              onPress={() => onArticlePress?.(article)}
              activeOpacity={0.9}
            >
              <View style={styles.articleContent}>
                <View style={styles.sourceRow}>
                  <View style={styles.sourceBadge}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {article.source.logo ? (
                        <Image source={{ uri: article.source.logo }} style={{ width: 14, height: 14, borderRadius: 3 }} />
                      ) : null}
                      <Text style={styles.sourceText}>{article.source.name}</Text>
                    </View>
                  </View>
                  <Text style={styles.timeText}>{formatTime(article.publishedAt)}</Text>
                </View>
                
                <Text style={styles.title} numberOfLines={2}>
                  {article.title}
                </Text>

                {article.description && (
                  <Text style={styles.description} numberOfLines={1}>
                    {article.description}
                  </Text>
                )}

                <View style={styles.categoryRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
                  </View>
                  <AlertCircle size={14} color="#FFFFFF" style={{ opacity: 0.8 }} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {articles.length > 1 && (
          <View style={styles.pagination}>
            {articles.map((_, index) => {
              const inputRange = [
                (index - 1) * (width - 32),
                index * (width - 32),
                (index + 1) * (width - 32),
              ];

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 20, 8],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.paginationDot,
                    {
                      width: dotWidth,
                      opacity,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  breakingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  articleContainer: {
    width: width - 64,
    marginRight: 16,
  },
  articleContent: {
    gap: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 19,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    height: 8,
  },
  paginationDot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
