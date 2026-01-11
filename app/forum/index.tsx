import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, Share, Alert, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Search, Filter, MessageCircle, MessagesSquare, Users, ThumbsUp, Share2, Bookmark, Clock, Hash, Briefcase, Code, ChartLine as LineChart, Brain, Microscope, Palette, Building2, Globe, ChevronRight, Plus, Bell, TrendingUp, Activity, Star } from 'lucide-react-native';
import { on } from '@/lib/eventBus';
import { supabase, getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Hash },
  { id: 'technology', name: 'Technology', icon: Code },
  { id: 'business', name: 'Business', icon: Briefcase },
  { id: 'finance', name: 'Finance', icon: LineChart },
  { id: 'science', name: 'Science', icon: Microscope },
  { id: 'arts', name: 'Arts', icon: Palette },
  { id: 'engineering', name: 'Engineering', icon: Brain },
  { id: 'architecture', name: 'Architecture', icon: Building2 },
  { id: 'international', name: 'International', icon: Globe },
];

// Real analytics fetchers
import { fetchTrendingDiscussions, fetchActiveUsers, TrendingDiscussionRow, ActiveUserRow } from '@/lib/forum/analytics';

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_pinned: boolean;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface TrendingDiscussion extends Discussion, TrendingDiscussionRow {}
interface ActiveUser extends ActiveUserRow {
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function ForumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [trendingDiscussions, setTrendingDiscussions] = useState<TrendingDiscussion[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [activeLoading, setActiveLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Handlers that close over component state
  const handleToggleLike = (discussion: Discussion) => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to like discussions.');
      return;
    }
    handleToggleLikeInternal(
      discussion,
      user.id,
      likedMap,
      setLikedMap,
      setDiscussions
    );
  };

  const handleToggleSave = (discussion: Discussion) => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to save discussions.');
      return;
    }
    handleToggleSaveInternal(
      discussion,
      user.id,
      savedMap,
      setSavedMap
    );
  };

  // Load analytics: trending discussions (defined before usage)
  const refreshTrending = async () => {
    setTrendingLoading(true);
    try {
      const rows = await fetchTrendingDiscussions(5);
      if (!rows.length) {
        setTrendingDiscussions([]);
        return;
      }
      // Fetch titles/categories and author profiles for all trending items
      const ids = rows.map(r => r.id);
      const authorIds = rows.map(r => r.author_id);
      const [{ data: details }, { data: profs }] = await Promise.all([
        supabase
          .from('forum_discussions')
          .select('id, title, category')
          .in('id', ids),
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds),
      ]);
      const detailsMap: Record<string, any> = {};
      (details || []).forEach((d: any) => { detailsMap[d.id] = d; });
      const profileMap: Record<string, any> = {};
      (profs || []).forEach(p => { profileMap[p.id] = p; });

      const merged: TrendingDiscussion[] = rows.map(r => {
        const info = detailsMap[r.id] || {};
        return {
          id: r.id,
          title: info.title || '(Untitled discussion)',
          content: '',
          category: info.category || 'General',
          author_id: r.author_id,
          likes_count: r.likes_count,
          comments_count: r.comments_count,
          views_count: r.views_count,
          is_pinned: r.is_pinned,
          created_at: r.created_at,
          profiles: profileMap[r.author_id] || { id: r.author_id, full_name: 'Member' },
          distinct_comment_authors: r.distinct_comment_authors,
          distinct_bookmarkers: r.distinct_bookmarkers,
          distinct_likers: r.distinct_likers,
          trending_score: r.trending_score,
          last_activity_at: r.last_activity_at,
        } as TrendingDiscussion;
      });
      setTrendingDiscussions(merged);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Load analytics: active users
  const refreshActiveUsers = async () => {
    setActiveLoading(true);
    try {
      const rows = await fetchActiveUsers(8);
      if (!rows.length) {
        setActiveUsers([]);
        return;
      }
      const ids = rows.map(r => r.user_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);
      const profileMap: Record<string, any> = {};
      (profs || []).forEach(p => { profileMap[p.id] = p; });
      setActiveUsers(rows.map(r => ({ ...r, profile: profileMap[r.user_id] })));
    } finally {
      setActiveLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await Promise.all([
      loadDiscussions(true),
      refreshTrending(),
      refreshActiveUsers()
    ]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      // Reset and load first page on focus
      setPage(0);
      setHasMore(true);
      loadDiscussions(true);
      // Kick off analytics refresh on focus
      refreshTrending();
      refreshActiveUsers();
    }, [])
  );

  // Cross-screen sync: reflect bookmark changes from detail/saved screens
  useEffect(() => {
    const unsubscribe = on('forum:bookmarkChanged', ({ discussionId, saved }) => {
      setSavedMap(prev => ({ ...prev, [discussionId]: saved }));
    });
    return unsubscribe;
  }, []);

  // Periodic light refresh every 60s (top-level hook)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTrending();
      refreshActiveUsers();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Realtime updates: refresh analytics when discussions/comments/likes change
  useEffect(() => {
    let pending: NodeJS.Timeout | null = null;
    const trigger = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        refreshTrending();
        refreshActiveUsers();
      }, 800);
    };
    const channel = supabase
      .channel('forum-analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_discussions' }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_comments' }, trigger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_discussion_likes' }, trigger)
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
      if (pending) clearTimeout(pending as any);
    };
  }, []);

  const loadDiscussions = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Fetch all discussions with author info
      const from = (reset ? 0 : page * pageSize);
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('forum_discussions')
        .select(`
          *,
          profiles!forum_discussions_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setErrorMessage(null);

      const formattedDiscussions = (data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
      }));

      const merged = reset ? formattedDiscussions : [...discussions, ...formattedDiscussions];
      setDiscussions(merged);

      // Determine if there's more data
      if ((data || []).length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
        if (!reset) setPage(prev => prev + 1);
        if (reset) setPage(1);
      }

      // Fetch liked and saved state for current user in batch
      if (user && merged.length > 0) {
        const ids = merged.map(d => d.id);

        const [{ data: likesData }, { data: savesData }] = await Promise.all([
          supabase.from('forum_discussion_likes').select('discussion_id').in('discussion_id', ids).eq('user_id', user.id),
          supabase.from('forum_discussion_bookmarks').select('discussion_id').in('discussion_id', ids).eq('user_id', user.id),
        ]);

        const likeMap: Record<string, boolean> = {};
        (likesData || []).forEach((row: any) => { likeMap[row.discussion_id] = true; });
        setLikedMap(likeMap);

        const saveMap: Record<string, boolean> = {};
        (savesData || []).forEach((row: any) => { saveMap[row.discussion_id] = true; });
        setSavedMap(saveMap);
      }

    } catch (error: any) {
      console.error('Error loading discussions:', error);
      setErrorMessage(error?.message || 'Unable to load discussions.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    // Normalize timestamps without timezone (e.g., '2025-11-13 12:00:00') to UTC
    const normalized = (dateString && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateString) && !/[zZ]$/.test(dateString))
      ? dateString.replace(' ', 'T') + 'Z'
      : dateString;
    const date = new Date(normalized);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredDiscussions = discussions.filter(d => {
    const matchesCategory = activeCategory === 'All' || d.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = !searchQuery || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading discussions...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#000000"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSideLeft}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton} accessibilityLabel="Go back">
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Development Forum</Text>
          <Text style={styles.headerSubtitle}>Ideas, help, and discussions</Text>
        </View>
        <View style={[styles.headerSideRight, styles.headerActions]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => debouncedRouter.push('/forum/saved')} accessibilityLabel="View saved discussions">
            <Star size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => debouncedRouter.push('/forum/new')} accessibilityLabel="Create discussion">
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const isActive = activeCategory.toLowerCase() === category.name.toLowerCase();
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { backgroundColor: isActive ? '#ffc857' : '#1E293B' },
              ]}
              onPress={() => setActiveCategory(category.name)}
            >
              <IconComponent size={20} color={isActive ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Trending (Real analytics) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Discussions</Text>
          <TouchableOpacity style={styles.seeAllButton} onPress={() => debouncedRouter.push('/forum/trending')}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingContent}>
          {trendingLoading && (
            <ActivityIndicator style={{ marginLeft:16 }} size="small" color="#0F172A" />
          )}
          {!trendingLoading && trendingDiscussions.length === 0 && (
            <Text style={styles.emptyText}>No trending data</Text>
          )}
          {trendingDiscussions.map((discussion, idx) => (
            <TouchableOpacity key={discussion.id} style={styles.trendingCard} onPress={() => debouncedRouter.push(`/forum/${discussion.id}`)}>
              {/* subtle rank accent */}
              <View style={[
                styles.accentBar,
                idx === 0 ? styles.accentGold : idx === 1 ? styles.accentSilver : idx === 2 ? styles.accentBronze : styles.accentMuted
              ]} />
              <View style={styles.trendingHeaderRow}>
                <View style={styles.rankBadge}><Text style={styles.rankText}>#{idx+1}</Text></View>
                {discussion.is_pinned && <View style={[styles.chip, { backgroundColor:'#FFF4D6' }]}><Text style={[styles.chipText,{ color:'#8B5E00'}]}>Pinned</Text></View>}
                {!!discussion.category && (
                  <View style={[styles.chip, { marginLeft: 'auto' }]}>
                    <Hash size={12} color="#4169E1" />
                    <Text style={[styles.chipText, { color:'#4169E1'}]}>{discussion.category}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.trendingTitle} numberOfLines={2}>{discussion.title}</Text>
              <View style={styles.authorRow}>
                <Image source={{ uri: discussion.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' }} style={styles.authorAvatar} />
                <Text style={styles.authorNameDark} numberOfLines={1}>{getDisplayName(discussion.profiles) || 'Anonymous'}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.timeText}>{getTimeAgo(discussion.last_activity_at)}</Text>
              </View>
              {/* cleaner card without metrics */}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Discussions</Text>
      </View>
      {errorMessage && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={[styles.seeAllText, { color: '#B91C1C' }]}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => { setPage(0); setHasMore(true); loadDiscussions(true); }} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <Text style={[styles.seeAllText, { color: '#4169E1' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.section}>
        {filteredDiscussions.map((discussion) => (
          <TouchableOpacity key={discussion.id} style={styles.discussionCard} onPress={() => debouncedRouter.push(`/forum/${discussion.id}`)}>
            <View style={styles.discussionHeader}>
              <Image source={{ uri: discussion.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' }} style={styles.discussionAvatar} />
              <View style={styles.discussionAuthorInfo}>
                <Text style={styles.discussionAuthorName}>{getDisplayName(discussion.profiles) || 'Anonymous'}</Text>
                <Text style={styles.discussionAuthorRole}>Member</Text>
              </View>
              <View style={styles.discussionCategory}>
                <Hash size={12} color="#92400E" />
                <Text style={styles.discussionCategoryText}>{discussion.category}</Text>
              </View>
            </View>
            <Text style={styles.discussionTitle}>{discussion.title}</Text>
            <Text style={styles.discussionPreview} numberOfLines={2}>{discussion.content}</Text>
            <View style={styles.discussionFooter}>
              <View style={styles.discussionEngagement}>
                <View style={styles.engagementItem}>
                  <ThumbsUp size={14} color={likedMap[discussion.id] ? '#ffc857' : '#64748B'} fill={likedMap[discussion.id] ? '#ffc857' : 'none'} />
                  <Text style={styles.engagementCount}>{discussion.likes_count}</Text>
                </View>
                <View style={styles.engagementItem}>
                  <MessagesSquare size={14} color="#64748B" />
                  <Text style={styles.engagementCount}>{discussion.comments_count}</Text>
                </View>
              </View>
              <View style={styles.discussionActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleLike(discussion)}>
                  <ThumbsUp size={20} color={likedMap[discussion.id] ? '#ffc857' : '#64748B'} fill={likedMap[discussion.id] ? '#ffc857' : 'none'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(discussion)}>
                  <Share2 size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleSave(discussion)}>
                  <Star size={20} color={savedMap[discussion.id] ? '#ffc857' : '#64748B'} fill={savedMap[discussion.id] ? '#ffc857' : 'none'} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {hasMore && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <TouchableOpacity style={[styles.seeAllButton, { alignSelf: 'center' }]} onPress={() => loadDiscussions(false)} disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <Text style={styles.seeAllText}>Load more</Text>
                  <ChevronRight size={16} color="#64748B" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Active Members (Real analytics) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Members</Text>
          <TouchableOpacity style={styles.seeAllButton} onPress={() => debouncedRouter.push('/forum/active')}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersContent}>
          {activeLoading && <ActivityIndicator style={{ marginLeft:16 }} size="small" color="#0F172A" />}
          {!activeLoading && activeUsers.length === 0 && (
            <Text style={styles.emptyText}>No active users</Text>
          )}
          {activeUsers.map(u => (
            <TouchableOpacity key={u.user_id} style={styles.memberCard} onPress={() => debouncedRouter.push(`/user-profile/${u.user_id}`)}>
              <Image source={{ uri: u.profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60' }} style={styles.memberAvatar} />
              <Text style={styles.memberName} numberOfLines={1}>{getDisplayName(u.profile) || 'Member'}</Text>
              <Text style={styles.memberRole}>{getTimeAgo(u.last_activity_at)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

    </ScrollView>
  );
}

// Actions
const handleShare = (discussion: Discussion) => {
  Share.share({
    title: discussion.title,
    message: `${discussion.title}\n\n${discussion.content.slice(0, 140)}...`,
  }).catch(() => {});
};

async function handleToggleLikeInternal(
  discussion: Discussion,
  userId: string,
  likedMap: Record<string, boolean>,
  setLikedMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setDiscussions: React.Dispatch<React.SetStateAction<Discussion[]>>
) {
  const wasLiked = !!likedMap[discussion.id];
  // Optimistic UI
  setLikedMap(prev => ({ ...prev, [discussion.id]: !wasLiked }));
  setDiscussions(prev => prev.map(d => d.id === discussion.id ? ({ ...d, likes_count: d.likes_count + (wasLiked ? -1 : 1) }) : d));

  try {
    if (wasLiked) {
      await supabase
        .from('forum_discussion_likes')
        .delete()
        .eq('discussion_id', discussion.id)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('forum_discussion_likes')
        .insert({ discussion_id: discussion.id, user_id: userId });
    }
  } catch (e) {
    // Revert
    setLikedMap(prev => ({ ...prev, [discussion.id]: wasLiked }));
    setDiscussions(prev => prev.map(d => d.id === discussion.id ? ({ ...d, likes_count: d.likes_count + (wasLiked ? 1 : -1) }) : d));
  }
}

async function handleToggleSaveInternal(
  discussion: Discussion,
  userId: string,
  savedMap: Record<string, boolean>,
  setSavedMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  const wasSaved = !!savedMap[discussion.id];
  // Optimistic UI
  setSavedMap(prev => ({ ...prev, [discussion.id]: !wasSaved }));
  try {
    if (wasSaved) {
      await supabase
        .from('forum_discussion_bookmarks')
        .delete()
        .eq('discussion_id', discussion.id)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('forum_discussion_bookmarks')
        .insert({ discussion_id: discussion.id, user_id: userId });
    }
  } catch (e) {
    // Revert
    setSavedMap(prev => ({ ...prev, [discussion.id]: wasSaved }));
  }
}

// (handlers defined inside component)


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 0,
    borderBottomColor: '#1E293B',
    marginTop: -800,
    paddingTop: 860,
  },
  headerSideLeft: { width: 72, alignItems: 'flex-start' },
  headerSideRight: { width: 120, alignItems: 'flex-end' },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: '#94A3B8', fontFamily: 'Inter-Regular' },
  headerActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#F8F9FA',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesScroll: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#4169E1',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  activeCategoryText: {
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  trendingContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  trendingCard: {
    width: CARD_WIDTH,
    minHeight: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    padding: 16,
  },
  accentBar: { height: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginHorizontal: -16, marginTop: -16, marginBottom: 12 },
  accentGold: { backgroundColor: '#F59E0B' },
  accentSilver: { backgroundColor: '#9CA3AF' },
  accentBronze: { backgroundColor: '#B45309' },
  accentMuted: { backgroundColor: '#E5E7EB' },
  trendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  rankBadge: {
    backgroundColor: '#FFFBF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  trendingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  authorNameDark: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    maxWidth: 180,
  },
  dot: { marginHorizontal: 6, color: '#94A3B8' },
  timeText: { fontSize: 12, color: '#64748B', fontFamily: 'Inter-Regular' },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  metricText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  discussionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  discussionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  discussionAuthorInfo: {
    flex: 1,
  },
  discussionAuthorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  discussionAuthorRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  discussionCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  discussionCategoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  discussionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 24,
  },
  discussionPreview: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  discussionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discussionEngagement: {
    flexDirection: 'row',
    gap: 16,
  },
  engagementCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  discussionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  membersContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: 140,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  contributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  contributionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
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
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },
});