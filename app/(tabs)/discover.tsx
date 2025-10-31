import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import { Users, Sparkles, Heart, MessageCircle, Bookmark, Briefcase, GraduationCap, Zap, Trophy, MapPin, TrendingUp, Star, Lightbulb } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { fetchDiscoverFeed, type DiscoverItem } from '@/lib/discover';

const { width } = Dimensions.get('window');

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

const INTEREST_CATEGORIES = [
  { id: 'technology', label: 'Technology', icon: Zap },
  { id: 'music', label: 'Music', icon: Zap },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'career', label: 'Career', icon: Briefcase },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'travel', label: 'Travel', icon: MapPin },
  { id: 'arts', label: 'Arts', icon: Star },
  { id: 'finance', label: 'Finance', icon: TrendingUp },
  { id: 'entrepreneurship', label: 'Entrepreneurship', icon: Lightbulb },
];

interface CarouselIndices {
  [key: string]: number;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'friends' | string>('all');
  const [discoverFeed, setDiscoverFeed] = useState<DiscoverItem[]>([]);
  const [userInterests, setUserInterests] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselIndices, setCarouselIndices] = useState<CarouselIndices>({});

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const loadDiscoverFeed = useCallback(async () => {
    setLoading(true);
    try {
      const feed = await fetchDiscoverFeed(
        user?.id,
        activeFilter === 'all' || activeFilter === 'friends' ? undefined : activeFilter
      );
      setDiscoverFeed(feed);
    } catch (e) {
      console.error('Error loading discover feed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDiscoverFeed();
    setRefreshing(false);
  }, [loadDiscoverFeed]);

  useEffect(() => {
    loadDiscoverFeed();
  }, [loadDiscoverFeed]);

  useEffect(() => {
    const loadInterests = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_interests')
        .select('category')
        .eq('user_id', user.id);
      if (error) {
        console.error('Failed to load user interests', error);
        return;
      }
      setUserInterests(new Set((data || []).map((r: any) => r.category)));
    };
    loadInterests();
  }, [user?.id]);

  useEffect(() => {
    const loadFriends = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);
      if (error) {
        console.error('Failed to load friends', error);
        return;
      }
      setFriendIds(new Set((data || []).map((r: any) => r.friend_id)));
    };
    loadFriends();
  }, [user?.id]);

  const toggleUserInterest = async (category: string) => {
    if (!user?.id) return;
    const next = new Set(userInterests);
    const isSelected = next.has(category);
    if (isSelected) {
      next.delete(category);
      setUserInterests(next);
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('category', category);
      if (error) {
        console.error('Failed to remove interest', error);
        setUserInterests(new Set(userInterests));
      }
    } else {
      next.add(category);
      setUserInterests(next);
      const { error } = await supabase
        .from('user_interests')
        .insert({ user_id: user.id, category });
      if (error) {
        console.error('Failed to add interest', error);
        setUserInterests(new Set(userInterests));
      }
    }
  };

  const handleLikeToggle = async (itemId: string) => {
    if (!user?.id) return;

    const item = discoverFeed.find((i) => i.id === itemId);
    if (!item) return;

    const isLiked = item.isLiked || false;
    const newLikeCount = isLiked ? (item.likes || 0) - 1 : (item.likes || 0) + 1;

    // Optimistically update UI
    setDiscoverFeed((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, isLiked: !isLiked, likes: newLikeCount }
          : i
      )
    );

    // Update database
    if (item.type === 'post' && item.sourceId) {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', item.sourceId)
          .eq('user_id', user.id);
        if (error) console.error('Error unliking post:', error);
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: item.sourceId, user_id: user.id });
        if (error) console.error('Error liking post:', error);
      }
    }
  };

  const filteredSections = useMemo(() => {
    const friendsPosts = discoverFeed.filter((i) => i.type === 'post' && i.author && friendIds.has(i.author.id));
    const otherItems = discoverFeed.filter((i) => {
      if (i.type !== 'post') return true;
      if (!i.author) return true;
      return !friendIds.has(i.author.id);
    });

    const applyFilter = (arr: DiscoverItem[]) => {
      if (activeFilter === 'all') return arr;
      if (activeFilter === 'friends') return friendsPosts;
      return arr.filter((i) => i.category === activeFilter);
    };

    return {
      friends: applyFilter(friendsPosts),
      others: applyFilter(otherItems),
    };
  }, [discoverFeed, activeFilter, friendIds]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Discover</Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {[
            { id: 'all', label: 'For You', icon: Sparkles }, 
            { id: 'friends', label: 'Friends', icon: Users }, 
            ...INTEREST_CATEGORIES
          ].map((filter: any) => {
            const IconComponent = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity 
                key={`filter-${filter.id}`} 
                style={[styles.filterChip, isActive && styles.filterChipActive]} 
                onPress={() => setActiveFilter(filter.id)}
              >
                <IconComponent size={16} color={isActive ? '#FFFFFF' : '#6B7280'} strokeWidth={2} />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Posts Feed */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0095F6" />
            <Text style={styles.loadingText}>Loading personalized content...</Text>
          </View>
        ) : discoverFeed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Sparkles size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No content yet</Text>
            <Text style={styles.emptyText}>Check back soon for personalized recommendations</Text>
          </View>
        ) : (
          discoverFeed
            .filter((item) => item.type === 'post') // Only show posts
            .map((item) => (
            <View key={item.id} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.postHeaderLeft}>
                  <Image 
                    source={{ 
                      uri: item.author?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'
                    }} 
                    style={styles.postUserAvatar} 
                  />
                  <View>
                    <Text style={styles.postUsername}>
                      {item.author?.username || 'Anonymous'}
                    </Text>
                    <Text style={styles.postTime}>{getTimeAgo(item.created_at || new Date().toISOString())}</Text>
                  </View>
                </View>
              </View>

              {/* Post Image */}
              {item.image && (
                <Image 
                  source={{ uri: item.image }} 
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              {/* Post Actions */}
              <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleLikeToggle(item.id)}
                  >
                    <Heart 
                      size={26} 
                      color={item.isLiked ? "#FF3B30" : "#000000"}
                      fill={item.isLiked ? "#FF3B30" : "none"}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}
                  >
                    <MessageCircle size={26} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionButton}>
                  <Bookmark size={26} color="#000000" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Likes */}
              <Text style={styles.postLikes}>{item.likes || 0} likes</Text>

              {/* Post Caption */}
              <View style={styles.postCaption}>
                <Text style={styles.postCaptionText}>
                  <Text style={styles.postCaptionUsername}>
                    {item.author?.username || 'anonymous'}
                  </Text>
                  {' '}{item.description}
                </Text>
              </View>

              {/* Post Comments */}
              {item.comments && item.comments > 0 && (
                <TouchableOpacity onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}>
                  <Text style={styles.viewComments}>
                    View all {item.comments} {item.comments === 1 ? 'comment' : 'comments'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {/* Personalization Note */}
        {discoverFeed.length > 0 && (
          <View style={styles.personalizationNote}>
            <Lightbulb size={16} color="#F59E0B" />
            <Text style={styles.personalizationText}>
              Personalized based on your interests and activity
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  filtersContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
    backgroundColor: '#FFFFFF',
  },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#0095F6',
    borderColor: '#0095F6',
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  postCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  postUsername: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
  },
  postMatchScore: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#F59E0B',
  },
  categoryBadge: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  postImage: {
    width: '100%',
    height: width,
    backgroundColor: '#F3F4F6',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  postActionsLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  postLikes: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  postCaption: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  postCaptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    lineHeight: 20,
  },
  postCaptionUsername: {
    fontFamily: 'Inter-SemiBold',
  },
  viewComments: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#0095F6',
  },
  personalizationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  personalizationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
  },
});
