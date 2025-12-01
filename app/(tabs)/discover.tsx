import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Compass, ThumbsUp, MessagesSquare, Lightbulb, SlidersHorizontal, Check, X, ChevronDown, Users, Camera, Share2, Star } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { fetchDiscoverFeed, type DiscoverItem } from '@/lib/discover';
import { useDiscoverFeed, useUserInterests, useFriendIds } from '@/lib/queries';
import { INTEREST_LIBRARY, type InterestCategoryDefinition, type InterestOptionId } from '@/lib/interest-data';
import CachedImage from '@/components/CachedImage';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import YouTubePlayer from '@/components/YouTubePlayer';
import ExpandableText from '@/components/ExpandableText';
import { useVideoSettings } from '@/contexts/VideoSettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Using the same simple horizontal ScrollView pattern as the Post detail screen

const { width, height } = Dimensions.get('window');

function getTimeAgo(dateString: string): string {
  if (!dateString) return 'just now';
  
  const now = new Date();
  const past = new Date(dateString);
  
  // Validate the date
  if (isNaN(past.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'just now';
  }
  
  const diffMs = now.getTime() - past.getTime();
  
  // Handle future dates (shouldn't happen, but just in case)
  if (diffMs < 0) {
    console.warn('Future date detected:', dateString);
    return 'just now';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 10) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  if (diffYears === 1) return '1y ago';
  if (diffYears > 1) return `${diffYears}y ago`;
  
  // Fallback to formatted date
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type InterestMeta = {
  label: string;
  icon: LucideIcon;
  parentId?: string;
  description?: string;
};

const INTEREST_LOOKUP: Record<string, InterestMeta> = {};
const SUBCATEGORY_IDS_BY_PARENT = new Map<string, string[]>();

INTEREST_LIBRARY.forEach((category) => {
  INTEREST_LOOKUP[category.id] = {
    label: category.label,
    icon: category.icon,
    description: category.description,
  };

  if (category.subcategories?.length) {
    SUBCATEGORY_IDS_BY_PARENT.set(
      category.id,
      category.subcategories.map((sub) => sub.id)
    );

    category.subcategories.forEach((sub) => {
      INTEREST_LOOKUP[sub.id] = {
        label: sub.label,
        icon: category.icon,
        parentId: category.id,
        description: sub.description,
      };
    });
  }
});

const FILTER_ORDER = INTEREST_LIBRARY.flatMap((category) => [
  category.id,
  ...(category.subcategories?.map((sub) => sub.id) ?? []),
]);

const formatInterestLabel = (value: string) =>
  value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const getInterestMeta = (id: string) => INTEREST_LOOKUP[id];

// Mapping between interest categories and post categories
const INTEREST_TO_POST_CATEGORY_MAP: Record<string, string[]> = {
  // Interest categories map to multiple post categories
  'general': ['general', 'social'],
  'education': ['academic', 'education'],
  'career': ['professional', 'career'],
  'health': ['mental_wellbeing', 'physical_fitness', 'health'],
  'finance': ['financial_planning', 'finance'],
  'productivity': ['time_management', 'productivity'],
  'personal': ['personal_reflection', 'personal'],
  'community': ['community_service', 'community'],
  'events': ['events'],
  'news': ['news'],
  'announcements': ['announcements'],
  'technology': ['technology', 'tech'],
  'business': ['business', 'professional'],
  'social': ['social', 'general'],
  'entertainment': ['entertainment', 'social'],
  'sports': ['sports', 'physical_fitness'],
  'arts': ['arts', 'creative'],
  'culture': ['culture', 'social'],
  'environment': ['environment', 'community'],
  'politics': ['politics', 'news'],
  'science': ['science', 'academic'],
  // Subcategories can also map
  'education_scholarships': ['academic', 'education'],
  'career_planning_exploration': ['professional', 'career'],
  'technology_ai_ml': ['technology', 'tech'],
  'health_mental': ['mental_wellbeing', 'health'],
  'health_physical': ['physical_fitness', 'health'],
};

// Get all post categories that match an interest filter
const getPostCategoriesForInterest = (interestId: string): string[] => {
  // Direct mapping
  if (INTEREST_TO_POST_CATEGORY_MAP[interestId]) {
    return INTEREST_TO_POST_CATEGORY_MAP[interestId];
  }
  
  // Check if it's a subcategory - use parent mapping
  const meta = getInterestMeta(interestId);
  if (meta?.parentId && INTEREST_TO_POST_CATEGORY_MAP[meta.parentId]) {
    return INTEREST_TO_POST_CATEGORY_MAP[meta.parentId];
  }
  
  // Fallback: try to match by the first part of the ID
  const baseCategory = interestId.split('_')[0];
  if (INTEREST_TO_POST_CATEGORY_MAP[baseCategory]) {
    return INTEREST_TO_POST_CATEGORY_MAP[baseCategory];
  }
  
  // No mapping found - return the interest ID itself as fallback
  return [interestId];
};

interface CarouselIndices {
  [key: string]: number;
}

interface PostLayout {
  id: string;
  y: number;
  height: number;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { isMuted, setIsMuted } = useVideoSettings();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'all' | 'friends' | string>('all');
  const [discoverFeed, setDiscoverFeed] = useState<DiscoverItem[]>([]);
  const [userInterests, setUserInterests] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselIndices, setCarouselIndices] = useState<CarouselIndices>({});
  const [visibleVideos, setVisibleVideos] = useState<Set<string>>(new Set());
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [postLayouts, setPostLayouts] = useState<PostLayout[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [interestSearch, setInterestSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<DiscoverItem | null>(null);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [searchFriends, setSearchFriends] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);

  const interestKey = useMemo(
    () => Array.from(userInterests).sort().join(','),
    [userInterests]
  );

  const interestFilters = useMemo(() => {
    const baseSelection = userInterests.size > 0
      ? Array.from(userInterests)
      : INTEREST_LIBRARY.map((option) => option.id);

    const hiddenParents = new Set<string>();
    userInterests.forEach((id) => {
      const parentId = getInterestMeta(id)?.parentId;
      if (parentId) {
        hiddenParents.add(parentId);
      }
    });

    const rankedFilters = baseSelection
      .filter((id) => !(hiddenParents.has(id) && SUBCATEGORY_IDS_BY_PARENT.has(id)))
      .map((id) => {
        const meta = getInterestMeta(id);
        const sortKey = FILTER_ORDER.indexOf(id);
        return {
          id,
          label: meta ? meta.label : formatInterestLabel(id),
          icon: meta ? meta.icon : Star,
          sortKey: sortKey === -1 ? Number.MAX_SAFE_INTEGER : sortKey,
        };
      })
      .sort((a, b) => (a.sortKey === b.sortKey ? a.label.localeCompare(b.label) : a.sortKey - b.sortKey));

    return [
      { id: 'all', label: 'For You', icon: Compass },
      { id: 'friends', label: 'Friends', icon: Users },
      ...rankedFilters.map(({ sortKey, ...rest }) => rest),
    ];
  }, [userInterests]);

  const filteredInterestOptions = useMemo(() => {
    const query = interestSearch.trim().toLowerCase();
    if (!query) return INTEREST_LIBRARY as InterestCategoryDefinition[];

    return INTEREST_LIBRARY
      .map((category) => {
        const matchesCategory =
          category.label.toLowerCase().includes(query) ||
          category.description.toLowerCase().includes(query);

        const matchingSubcategories = category.subcategories?.filter((sub) => {
          const labelMatch = sub.label.toLowerCase().includes(query);
          const descriptionMatch = sub.description
            ? sub.description.toLowerCase().includes(query)
            : false;
          return labelMatch || descriptionMatch;
        }) ?? [];

        if (!matchesCategory && matchingSubcategories.length === 0) {
          return null;
        }

        return {
          ...category,
          subcategories: matchesCategory ? category.subcategories : matchingSubcategories,
        } as InterestCategoryDefinition;
      })
      .filter(Boolean) as InterestCategoryDefinition[];
  }, [interestSearch]);

  const openInterestModal = useCallback(() => {
    const nextExpanded = new Set<string>();
    userInterests.forEach((id) => {
      const parentId = getInterestMeta(id)?.parentId;
      if (parentId) {
        nextExpanded.add(parentId);
      }
    });

    setInterestSearch('');
    setExpandedCategories(nextExpanded);
    setInterestModalVisible(true);
  }, [userInterests]);

  const closeInterestModal = useCallback(() => {
    setInterestModalVisible(false);
  }, []);

  // Calculate which videos are in viewport (50%+ visible)
  const updateVisibleVideos = useCallback(() => {
    const viewportTop = scrollY;
    const viewportBottom = scrollY + height;
    const threshold = 0.5; // 50% visibility required

    const visible = new Set<string>();

    postLayouts.forEach((layout) => {
      const postTop = layout.y;
      const postBottom = layout.y + layout.height;

      // Calculate visible portion
      const visibleTop = Math.max(postTop, viewportTop);
      const visibleBottom = Math.min(postBottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = visibleHeight / layout.height;

      // Only play if 50%+ visible
      if (visibilityRatio >= threshold) {
        visible.add(layout.id);
      }
    });

    setVisibleVideos(visible);
  }, [scrollY, postLayouts, height]);

  // Update visible videos when scroll position or layouts change
  useEffect(() => {
    updateVisibleVideos();
  }, [updateVisibleVideos]);

  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

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
      
      // Feed is already sorted by created_at DESC from database
      // Just enrich with like/save state for current user
      if (user?.id) {
        const postIds = feed.filter((f) => f.type === 'post' && f.sourceId).map((f) => String(f.sourceId));
        if (postIds.length > 0) {
          const [likesRes, bmsRes] = await Promise.all([
            supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          ]);
          const liked = new Set((likesRes.data || []).map((r: any) => r.post_id));
          const saved = new Set((bmsRes.data || []).map((r: any) => r.post_id));
          
          // Enrich but maintain the order from database (newest first)
          const enriched = feed.map((f) => {
            if (f.type === 'post' && f.sourceId) {
              return {
                ...f,
                isLiked: liked.has(String(f.sourceId)),
                saved: saved.has(String(f.sourceId)) ? 1 : 0,
                isBookmarked: saved.has(String(f.sourceId)),
                // Keep the accurate likes and comments counts from fetchDiscoverFeed
                likes: f.likes ?? 0,
                comments: f.comments ?? 0,
              };
            }
            return f;
          });
          
          console.log('✅ [DISCOVER] Loaded', enriched.length, 'posts (newest first)');
          setDiscoverFeed(enriched);
        } else {
          console.log('✅ [DISCOVER] Loaded', feed.length, 'items (newest first)');
          setDiscoverFeed(feed);
        }
      } else {
        console.log('✅ [DISCOVER] Loaded', feed.length, 'items (no user, newest first)');
        setDiscoverFeed(feed);
      }
    } catch (e) {
      console.error('Error loading discover feed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeFilter, interestKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDiscoverFeed();
    setRefreshing(false);
  }, [loadDiscoverFeed]);

  useEffect(() => {
    loadDiscoverFeed();
  }, [loadDiscoverFeed]);

  // Real-time subscriptions for likes and comments
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to ALL post likes (not just current feed)
    // This way we don't need to recreate subscriptions when feed changes
    const likesChannel = supabase
      .channel(`discover_likes_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
        },
        async (payload) => {
          console.log('🔥 Real-time like change detected:', payload.eventType);
          // Refetch counts for affected post
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (postId) {
            // Get accurate count by counting all likes for this post
            const { count } = await supabase
              .from('post_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postId);
            
            const likesCount = count || 0;
            
            // Check if current user liked this post
            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', postId)
              .eq('user_id', user.id)
              .maybeSingle();
            
            console.log(`✅ Updated post ${postId}: ${likesCount} likes`);
            
            setDiscoverFeed((prev) =>
              prev.map((item) =>
                item.sourceId === postId
                  ? { ...item, likes: likesCount, isLiked: !!userLike }
                  : item
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Likes subscription status:', status);
      });

    // Subscribe to ALL post comments
    const commentsChannel = supabase
      .channel(`discover_comments_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
        },
        async (payload) => {
          console.log('🔥 Real-time comment change detected:', payload.eventType);
          // Refetch counts for affected post
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (postId) {
            // Get accurate count by counting all comments for this post
            const { count } = await supabase
              .from('post_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postId);
            
            const commentsCount = count || 0;
            
            console.log(`✅ Updated post ${postId}: ${commentsCount} comments`);
            
            setDiscoverFeed((prev) =>
              prev.map((item) =>
                item.sourceId === postId ? { ...item, comments: commentsCount } : item
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Comments subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from real-time channels');
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [user?.id]); // Only recreate when user changes, not when feed changes

  // Ensure videos play even when iPhone is in silent mode
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          allowsRecordingIOS: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      } catch (e) {
        console.warn('Failed to set audio mode', e);
      }
    })();
  }, []);

  // Stop all videos when screen loses focus (e.g., navigating to another tab)
  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      setIsScreenFocused(true);
      
      return () => {
        // Screen is unfocused - stop all videos
        setIsScreenFocused(false);
        setVisibleVideos(new Set());
      };
    }, [])
  );

  // If routed with ?openInterestModal=1, open the interests modal on mount
  useEffect(() => {
    if (params && (params as any).openInterestModal) {
      openInterestModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(params as any)?.openInterestModal]);

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
      
      // Load friends in both directions (bidirectional friendship)
      const [sentRequests, receivedRequests] = await Promise.all([
        supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', user.id),
        supabase
          .from('friends')
          .select('user_id')
          .eq('friend_id', user.id)
      ]);
      
      if (sentRequests.error) {
        console.error('Failed to load sent friend requests', sentRequests.error);
      }
      if (receivedRequests.error) {
        console.error('Failed to load received friend requests', receivedRequests.error);
      }
      
      // Combine both directions
      const allFriendIds = new Set<string>();
      (sentRequests.data || []).forEach((r: any) => allFriendIds.add(r.friend_id));
      (receivedRequests.data || []).forEach((r: any) => allFriendIds.add(r.user_id));
      
      console.log('👥 [DISCOVER] Loaded friends:', allFriendIds.size, 'friends');
      setFriendIds(allFriendIds);
    };
    loadFriends();
  }, [user?.id]);

  const toggleUserInterest = async (interestId: InterestOptionId) => {
    if (!user?.id) return;

    const parentId = getInterestMeta(interestId)?.parentId;
    const previousSelection = new Set(userInterests);
    const previousActive = activeFilter;
    const nextSelection = new Set(userInterests);
    const isSelected = nextSelection.has(interestId);

    if (isSelected) {
      nextSelection.delete(interestId);

      const categoriesToDelete = [interestId];
      let removeParent = false;

      if (parentId) {
        const siblings = SUBCATEGORY_IDS_BY_PARENT.get(parentId) ?? [];
        const hasOtherSiblings = siblings.some((id) => id !== interestId && nextSelection.has(id));
        if (!hasOtherSiblings) {
          removeParent = true;
          nextSelection.delete(parentId);
        }
      }

      if (parentId && removeParent) {
        categoriesToDelete.push(parentId);
      }

      if (activeFilter === interestId || (parentId && activeFilter === parentId)) {
        setActiveFilter('all');
      }

      setUserInterests(nextSelection);

      if (categoriesToDelete.length > 0) {
        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .in('category', categoriesToDelete);

        if (error) {
          console.error('Failed to remove interest', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      }
    } else {
      const wasEmpty = nextSelection.size === 0;
      nextSelection.add(interestId);

      const categoriesToInsert: { user_id: string; category: string }[] = [];

      if (!previousSelection.has(interestId)) {
        categoriesToInsert.push({ user_id: user.id, category: interestId });
      }

      if (parentId) {
        if (!nextSelection.has(parentId)) {
          nextSelection.add(parentId);
        }
        if (!previousSelection.has(parentId)) {
          categoriesToInsert.push({ user_id: user.id, category: parentId });
        }
      }

      setUserInterests(nextSelection);
      if (wasEmpty) {
        setActiveFilter(interestId);
      }

      if (categoriesToInsert.length > 0) {
        const { error } = await supabase
          .from('user_interests')
          .insert(categoriesToInsert);

        if (error) {
          console.error('Failed to add interest', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      }
    }
  };

  const toggleCategoryGroup = useCallback(
    async (category: InterestCategoryDefinition, mode: 'select' | 'clear') => {
      if (!user?.id) return;

      const previousSelection = new Set(userInterests);
      const previousActive = activeFilter;
      const subcategoryIds = SUBCATEGORY_IDS_BY_PARENT.get(category.id) ?? [];
      const bundle = [category.id, ...subcategoryIds];

      if (mode === 'select') {
        const nextSelection = new Set(previousSelection);
        bundle.forEach((id) => nextSelection.add(id));
        setUserInterests(nextSelection);
        setExpandedCategories((prev) => new Set(prev).add(category.id));
        if (previousSelection.size === 0) {
          setActiveFilter(category.id);
        }

        const rowsToInsert = bundle
          .filter((id) => !previousSelection.has(id))
          .map((id) => ({ user_id: user.id, category: id }));

        if (rowsToInsert.length === 0) {
          return;
        }

        const { error } = await supabase.from('user_interests').insert(rowsToInsert);

        if (error) {
          console.error('Failed to follow category group', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      } else {
        const nextSelection = new Set(previousSelection);
        bundle.forEach((id) => nextSelection.delete(id));
        setUserInterests(nextSelection);
        if (activeFilter === category.id || subcategoryIds.includes(activeFilter)) {
          setActiveFilter('all');
        }

        const rowsToDelete = bundle.filter((id) => previousSelection.has(id));
        if (rowsToDelete.length === 0) {
          return;
        }

        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .in('category', rowsToDelete);

        if (error) {
          console.error('Failed to clear category group', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      }
    },
    [user?.id, userInterests, activeFilter]
  );

  useEffect(() => {
    if (!interestSearch.trim()) {
      return;
    }
    setExpandedCategories(new Set(filteredInterestOptions.map((category) => category.id)));
  }, [interestSearch, filteredInterestOptions]);

  useEffect(() => {
    if (interestSearch.trim()) {
      return;
    }
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      userInterests.forEach((id) => {
        const parentId = getInterestMeta(id)?.parentId;
        if (parentId) {
          next.add(parentId);
        }
      });
      return next;
    });
  }, [userInterests, interestSearch]);

  const handleLikeToggle = async (itemId: string) => {
    if (!user?.id) return;

    const item = discoverFeed.find((i) => i.id === itemId);
    if (!item || item.type !== 'post' || !item.sourceId) return;

    const isLiked = item.isLiked || false;

    // Optimistically update UI
    setDiscoverFeed((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, isLiked: !isLiked, likes: isLiked ? Math.max(0, (i.likes || 0) - 1) : (i.likes || 0) + 1 }
          : i
      )
    );

    try {
      // Update database
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', item.sourceId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: item.sourceId, user_id: user.id });
        if (error) throw error;
      }

      // Fetch accurate count after toggle
      const { data: likesData, count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact' })
        .eq('post_id', item.sourceId);
      
      const actualLikesCount = count || 0;
      
      // Check current user's like status
      const { data: userLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', item.sourceId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Update with accurate count
      setDiscoverFeed((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, isLiked: !!userLike, likes: actualLikesCount }
            : i
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setDiscoverFeed((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, isLiked: isLiked, likes: item.likes || 0 }
            : i
        )
      );
    }
  };

  const handleBookmarkToggle = async (itemId: string) => {
    if (!user?.id) return;
    const item = discoverFeed.find((i) => i.id === itemId);
    if (!item || item.type !== 'post' || !item.sourceId) return;
    const wasSaved = (item as any).isBookmarked === true || (item as any).saved === 1;
    // Optimistic update
    setDiscoverFeed(prev => prev.map(i => i.id === itemId ? { ...i, isBookmarked: !wasSaved, saved: !wasSaved ? 1 : 0 } : i));
    
    try {
      if (wasSaved) {
        const { error } = await supabase.from('post_bookmarks').delete().eq('post_id', item.sourceId).eq('user_id', user.id);
        if (error) throw error;
        console.log('✅ Post unsaved successfully');
      } else {
        const { error } = await supabase.from('post_bookmarks').insert({ post_id: item.sourceId, user_id: user.id });
        if (error) throw error;
        console.log('✅ Post saved successfully - visible in Profile → Saved tab');
      }
    } catch (e) {
      console.error('Error toggling bookmark:', e);
      // Revert on error
      setDiscoverFeed(prev => prev.map(i => i.id === itemId ? { ...i, isBookmarked: wasSaved, saved: wasSaved ? 1 : 0 } : i));
    }
  };

  const handleSharePress = async (item: DiscoverItem) => {
    if (!user?.id) return;
    setSelectedPostForShare(item);
    setShareModalVisible(true); // Show modal immediately
    setLoadingFriends(true); // Show loading state
    
    // Fetch friends list in background
    try {
      console.log('📋 Fetching friends list...');
      
      // Fetch where current user is user_id (you added them)
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          friend_id,
          friend:profiles!friends_friend_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq('user_id', user.id);
      
      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
        throw friendsError;
      }
      
      console.log('👥 Friends where you are user_id:', friendsData?.length || 0);
      
      // Fetch where current user is friend_id (they added you)
      const { data: reverseFriendsData, error: reverseError } = await supabase
        .from('friends')
        .select(`
          user_id,
          friend:profiles!friends_user_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq('friend_id', user.id);
      
      if (reverseError) {
        console.error('Error fetching reverse friends:', reverseError);
        throw reverseError;
      }
      
      console.log('👥 Friends where you are friend_id:', reverseFriendsData?.length || 0);
      
      // Combine both directions
      const allFriends = [
        ...(friendsData || []).map((f: any) => f.friend).filter(Boolean),
        ...(reverseFriendsData || []).map((f: any) => f.friend).filter(Boolean)
      ];
      
      console.log('👥 Total friends before deduplication:', allFriends.length);
      
      // Remove duplicates by id
      const uniqueFriends = Array.from(new Map(allFriends.map(f => [f.id, f])).values());
      
      console.log('✅ Unique friends to display:', uniqueFriends.length);
      console.log('Friends list:', uniqueFriends.map(f => f.full_name || f.username).join(', '));
      
      setFriendsList(uniqueFriends);
      
      if (uniqueFriends.length === 0) {
        console.log('⚠️ No friends found. User may need to add friends first.');
      }
      
    } catch (error) {
      console.error('❌ Error fetching friends:', error);
      setFriendsList([]); // Show empty state
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSendToFriend = async (friendId: string) => {
    if (!user?.id || !selectedPostForShare?.sourceId) return;
    
    try {
      // Find existing direct chat between these two users
      const { data: existingChats } = await supabase
        .from('chat_participants')
        .select('chat_id, chats!inner(id, type)')
        .eq('user_id', user.id);
      
      let chatId = null;
      
      if (existingChats && existingChats.length > 0) {
        // Check if any of these chats also includes the friend
        for (const chat of existingChats) {
          const { data: friendInChat } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.chat_id)
            .eq('user_id', friendId)
            .maybeSingle();
          
          if (friendInChat) {
            chatId = chat.chat_id;
            break;
          }
        }
      }
      
      if (!chatId) {
        // Create new direct chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            type: 'direct',
            name: null,
          })
          .select('id')
          .single();
        
        if (chatError) throw chatError;
        chatId = newChat.id;
        
        // Add both participants
        const { error: participantsError } = await supabase
          .from('chat_participants')
          .insert([
            { chat_id: chatId, user_id: user.id },
            { chat_id: chatId, user_id: friendId }
          ]);
        
        if (participantsError) throw participantsError;
      }
      
      // Send message with post (Instagram-style: send as post type, not text)
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          message_type: 'post', // Mark as post share
          content: '', // Empty content for post shares
          post_id: selectedPostForShare.sourceId, // Reference to the shared post
        });
      
      if (messageError) throw messageError;
      
      // ALSO send to direct_messages table for backward compatibility with existing chat screen
      const { error: dmError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: friendId,
          message: '', // Empty for shared posts
          message_type: 'post', // Mark as post share
          post_id: selectedPostForShare.sourceId, // Reference to the shared post
        });
      
      if (dmError) {
        console.error('Error sending to direct_messages:', dmError);
        // Don't throw - the main message was sent successfully
      }
      
      // Track share
      const { error: shareError } = await supabase
        .from('post_shares')
        .insert({
          post_id: selectedPostForShare.sourceId,
          user_id: user.id,
        });
      
      if (shareError) console.error('Error tracking share:', shareError);
      
      console.log('✅ Post shared successfully to both chat systems');
      
      // Show success feedback
      const friend = friendsList.find(f => f.id === friendId);
      alert(`Sent to ${friend?.full_name || 'friend'}!`);
      
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Failed to send post. Please try again.');
    }
  };

  const filteredFeed = useMemo(() => {
    console.log('🔍 [DISCOVER] Filtering feed. Active filter:', activeFilter, 'Total items:', discoverFeed.length, 'Friend IDs:', friendIds.size);
    
    let filtered = discoverFeed;
    
    // Apply category filter first (for all non-special filters)
    if (activeFilter !== 'all' && activeFilter !== 'friends') {
      // Get the post categories that match this interest filter
      const matchingPostCategories = getPostCategoriesForInterest(activeFilter);
      console.log('📂 [DISCOVER] Interest filter:', activeFilter, '→ Post categories:', matchingPostCategories);
      
      filtered = filtered.filter((item) => {
        const itemCategory = (item.category || 'general').toLowerCase();
        const matches = matchingPostCategories.some(cat => 
          itemCategory === cat.toLowerCase() || 
          itemCategory.includes(cat.toLowerCase())
        );
        
        if (!matches) {
          console.log('❌ [DISCOVER] Filtered out:', item.description?.substring(0, 30), 'category:', itemCategory);
        }
        
        return matches;
      });
      console.log('📂 [DISCOVER] Category filter applied:', activeFilter, 'Remaining:', filtered.length);
    }
    
    // Apply friends filter
    if (activeFilter === 'friends') {
      filtered = filtered.filter((item) => {
        // Only show posts from friends
        if (item.type === 'post' && item.author) {
          const isFriend = friendIds.has(item.author.id);
          if (!isFriend) {
            console.log('❌ [DISCOVER] Filtering out post from non-friend:', item.author.full_name);
          }
          return isFriend;
        }
        return false; // Filter out non-post items in friends view
      });
      console.log('👥 [DISCOVER] Friends filter applied. Remaining:', filtered.length);
    }
    
    console.log('✅ [DISCOVER] Final filtered feed:', filtered.length, 'items');
    return filtered;
  }, [discoverFeed, activeFilter, friendIds]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent
        visible={interestModalVisible}
        onRequestClose={closeInterestModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Fine-tune your Discover feed</Text>
                <Text style={styles.modalSubtitle}>
                  Select the topics you care about. We&rsquo;ll prioritize stories, opportunities, and
                  updates that match them.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeInterestModal}
                accessibilityLabel="Close interest selector"
              >
                <X size={18} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Search interests"
              placeholderTextColor="#9CA3AF"
              value={interestSearch}
              onChangeText={setInterestSearch}
            />

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredInterestOptions.map((category) => {
                const IconComponent = category.icon;
                const hasSubcategories = Boolean(category.subcategories?.length);
                const subcategoryIds = SUBCATEGORY_IDS_BY_PARENT.get(category.id) ?? [];
                const selectedSubCount = subcategoryIds.filter((id) => userInterests.has(id)).length;
                const totalSubCount = subcategoryIds.length;
                const categorySelected = userInterests.has(category.id);
                const isExpanded = hasSubcategories ? expandedCategories.has(category.id) : categorySelected;
                const followingBadgeVisible = hasSubcategories ? selectedSubCount > 0 : categorySelected;
                const allTopicsSelected = totalSubCount > 0 && selectedSubCount === totalSubCount;

                return (
                  <View key={category.id} style={styles.categorySection}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.categoryHeader, isExpanded && hasSubcategories && styles.categoryHeaderExpanded]}
                      onPress={() =>
                        hasSubcategories
                          ? toggleCategoryExpansion(category.id)
                          : toggleUserInterest(category.id)
                      }
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <View style={styles.categoryIconWrapper}>
                          <IconComponent size={20} color="#0A84FF" strokeWidth={1.75} />
                        </View>
                        <View style={styles.categoryHeaderText}>
                          <Text style={styles.categoryTitle}>{category.label}</Text>
                          <Text style={styles.categorySubtitle}>{category.description}</Text>
                          {hasSubcategories && (
                            <Text style={styles.categoryMetaText}>
                              {selectedSubCount > 0
                                ? `${selectedSubCount} of ${totalSubCount} topics`
                                : `${totalSubCount} topics`}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.categoryHeaderRight}>
                        {followingBadgeVisible && (
                          <View style={styles.categoryStatusBadge}>
                            <Text style={styles.categoryStatusText}>Following</Text>
                          </View>
                        )}
                        {hasSubcategories ? (
                          <ChevronDown
                            size={18}
                            color="#1F2937"
                            strokeWidth={2}
                            style={isExpanded ? styles.chevronExpanded : undefined}
                          />
                        ) : (
                          <View
                            style={[
                              styles.categorySoloBadge,
                              categorySelected && styles.categorySoloBadgeSelected,
                            ]}
                          >
                            {categorySelected && <Check size={14} color="#FFFFFF" strokeWidth={2} />}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {hasSubcategories && isExpanded && (
                      <View style={styles.categoryBody}>
                        <View style={styles.categoryActions}>
                          <TouchableOpacity
                            style={[
                              styles.categoryActionButton,
                              allTopicsSelected && styles.categoryActionButtonDisabled,
                            ]}
                            onPress={() => {
                              if (!allTopicsSelected) {
                                toggleCategoryGroup(category, 'select');
                              }
                            }}
                            disabled={allTopicsSelected}
                          >
                            <Text
                              style={[
                                styles.categoryActionText,
                                allTopicsSelected && styles.categoryActionTextMuted,
                              ]}
                            >
                              {allTopicsSelected ? 'Following all topics' : 'Follow all topics'}
                            </Text>
                          </TouchableOpacity>
                          {selectedSubCount > 0 && (
                            <TouchableOpacity
                              style={styles.categoryActionButtonGhost}
                              onPress={() => toggleCategoryGroup(category, 'clear')}
                            >
                              <Text style={styles.categoryActionGhostText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.subcategoryGrid}>
                          {category.subcategories?.map((sub) => {
                            const isSelected = userInterests.has(sub.id);
                            return (
                              <TouchableOpacity
                                key={sub.id}
                                style={[
                                  styles.subcategoryPill,
                                  isSelected && styles.subcategoryPillSelected,
                                ]}
                                onPress={() => toggleUserInterest(sub.id)}
                                activeOpacity={0.85}
                              >
                                <Text
                                  style={[
                                    styles.subcategoryLabel,
                                    isSelected && styles.subcategoryLabelSelected,
                                  ]}
                                >
                                  {sub.label}
                                </Text>
                                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={2} />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={closeInterestModal}
              activeOpacity={0.9}
            >
              <Text style={styles.modalPrimaryButtonText}>Save interests</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Modal (Instagram-style) */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            {/* Header */}
            <View style={styles.shareModalHeader}>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <X size={24} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.shareModalTitle}>Share</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Search */}
            <View style={styles.shareSearchContainer}>
              <TextInput
                style={styles.shareSearchInput}
                placeholder="Search friends..."
                value={searchFriends}
                onChangeText={setSearchFriends}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Friends List */}
            <ScrollView style={styles.shareFriendsList} showsVerticalScrollIndicator={false}>
              {loadingFriends ? (
                <View style={styles.shareLoadingState}>
                  <ActivityIndicator size="large" color="#0EA5E9" />
                  <Text style={styles.shareLoadingText}>Loading friends...</Text>
                </View>
              ) : friendsList.length === 0 ? (
                <View style={styles.shareEmptyState}>
                  <Users size={48} color="#D1D5DB" strokeWidth={2} />
                  <Text style={styles.shareEmptyText}>No friends yet</Text>
                  <Text style={styles.shareEmptySubtext}>Add friends to share posts with them</Text>
                </View>
              ) : (
                <>
                  {(() => {
                    const filteredFriends = friendsList.filter(friend => 
                      searchFriends === '' || 
                      friend.full_name?.toLowerCase().includes(searchFriends.toLowerCase()) ||
                      friend.username?.toLowerCase().includes(searchFriends.toLowerCase())
                    );
                    console.log('🎯 Rendering friends:', filteredFriends.length, 'of', friendsList.length);
                    return filteredFriends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={styles.shareFriendItem}
                        onPress={() => {
                          handleSendToFriend(friend.id);
                          setShareModalVisible(false);
                          setSearchFriends('');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.shareFriendLeft}>
                          {friend.avatar_url ? (
                            <CachedImage uri={friend.avatar_url} style={styles.shareFriendAvatar} />
                          ) : (
                            <View style={[styles.shareFriendAvatar, styles.shareFriendAvatarPlaceholder]}>
                              <Text style={styles.shareFriendAvatarText}>
                                {friend.full_name?.[0]?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.shareFriendInfo}>
                            <Text style={styles.shareFriendName}>{friend.full_name || 'Unknown'}</Text>
                            {friend.username && (
                              <Text style={styles.shareFriendUsername}>@{friend.username}</Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.shareSendButton}>
                          <Share2 size={20} color="#0EA5E9" strokeWidth={2} />
                        </View>
                      </TouchableOpacity>
                    ));
                  })()}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={[styles.headerWrapper, { paddingTop: insets.top, marginTop: -200, paddingTop: insets.top + 200 }]}>
          <View style={styles.headerGradient}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>Discover</Text>
                <Text style={styles.headerSubtitleAlt} numberOfLines={3} ellipsizeMode="tail">See what your friends are up to and posts from people who share your interests</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => router.push('/create-post?autoPick=1' as any)}
                  activeOpacity={0.9}
                  accessibilityLabel="Open camera to create a post"
                >
                  <Camera size={18} color="#111827" strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerGhostButton}
                  onPress={openInterestModal}
                  activeOpacity={0.9}
                >
                  <SlidersHorizontal size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.headerGhostText}>
                    {userInterests.size ? `Interests (${userInterests.size})` : 'Interests'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {interestFilters.map((filter) => {
            const IconComponent = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity 
                key={filter.id} 
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
        ) : filteredFeed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Compass size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'friends' ? 'No posts from friends yet' : 'No content yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'friends' 
                ? 'Posts from your friends will appear here' 
                : 'Check back soon for personalized recommendations'}
            </Text>
          </View>
        ) : (
          filteredFeed
            .filter((item) => item.type === 'post') // Only show posts
            .map((item) => {
              // Debug log for timestamps
              const timeAgo = getTimeAgo(item.created_at || new Date().toISOString());
              console.log('🕐 [DISCOVER] Post timestamp:', {
                id: item.id.substring(0, 20),
                created_at: item.created_at,
                timeAgo: timeAgo,
                author: item.author?.full_name
              });
              
              return (
                <View 
                  key={item.id} 
                  style={styles.postCard}
                  onLayout={(event) => {
                    const { y, height } = event.nativeEvent.layout;
                    setPostLayouts((prev) => {
                      const filtered = prev.filter((p) => p.id !== item.id);
                      return [...filtered, { id: item.id, y, height }];
                    });
                  }}
                >
                  {/* Post Header */}
                  <View style={styles.postHeader}>
                <TouchableOpacity 
                  style={styles.postHeaderLeft}
                  onPress={() => item.author?.id && router.push(`/user-profile/${item.author.id}` as any)}
                  activeOpacity={0.7}
                >
                  <CachedImage 
                    uri={item.author?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'}
                    style={styles.postUserAvatar} 
                  />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.postUsername}>
                        {item.author?.full_name || 'Anonymous'}
                      </Text>
                      {((item.author as any)?.is_admin || (item.author as any)?.role === 'admin') && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedCheck}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postTime}>{timeAgo}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Post Media (Images/Videos/YouTube Carousel) */}
              {(item as any).media_items && (item as any).media_items.length > 0 ? (
                (() => {
                  console.log(`📺 [DISCOVER] Item ${item.id} has media_items:`, (item as any).media_items.length, 'items');
                  (item as any).media_items.forEach((mediaItem: any, idx: number) => {
                    console.log(`  📦 Item ${idx}: ${mediaItem.type} - ${mediaItem.url?.substring(0, 60)}...`);
                  });
                  return (
                    <View style={styles.carouselContainer}>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        removeClippedSubviews={false}
                        style={styles.carousel}
                        nestedScrollEnabled={true}
                        decelerationRate="fast"
                        snapToInterval={width}
                        snapToAlignment="start"
                        onScroll={(event) => {
                          const scrollX = event.nativeEvent.contentOffset.x;
                          const currentIndex = Math.round(scrollX / width);
                          setCarouselIndices({
                            ...carouselIndices,
                            [item.id]: currentIndex,
                          });
                        }}
                        scrollEventThrottle={16}
                      >
                        {(item as any).media_items.map((mediaItem: any, index: number) => {
                          console.log(`🎬 [Discover] Rendering media item ${index} for item ${item.id}:`, {
                            type: mediaItem.type,
                            url: mediaItem.url?.substring(0, 80),
                            hasUrl: !!mediaItem.url
                          });
                      return (
                        <View key={index} style={styles.mediaPage}>
                          {mediaItem.type === 'video' ? (
                            <Video
                              source={{ uri: mediaItem.url }}
                              style={styles.postImage}
                              useNativeControls
                              resizeMode={ResizeMode.COVER}
                              isLooping={true}
                              shouldPlay={
                                isScreenFocused && 
                                visibleVideos.has(item.id) && 
                                (carouselIndices[item.id] ?? 0) === index
                              }
                              volume={
                                isMuted || (carouselIndices[item.id] ?? 0) !== index 
                                  ? 0.0 
                                  : 1.0
                              }
                              onError={(err) => {
                                console.error('❌ Video error:', err);
                                console.warn('Video play error (mixed media)', err);
                              }}
                            />
                          ) : (
                            <TouchableOpacity 
                              activeOpacity={0.95}
                              onPress={() => item.sourceId && router.push(`/post/${item.sourceId}`)}
                            >
                              <CachedImage
                                uri={mediaItem.url}
                                style={styles.postImage}
                                contentFit="cover"
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                  {(item as any).media_items.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[item.id] ?? 0) + 1}/{(item as any).media_items.length}
                      </Text>
                    </View>
                  )}
                </View>
                  );
                })()
              ) : item.youtube_urls && item.youtube_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={false}
                    style={styles.carousel}
                  >
                    {item.youtube_urls.map((youtubeUrl, index) => (
                      <View key={index} style={styles.mediaPage}>
                        <YouTubePlayer url={youtubeUrl} />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : item.video_urls && item.video_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [item.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {item.video_urls.map((videoUrl, index) => (
                      <View key={index} style={styles.mediaPage}>
                        <Video
                          source={{ uri: videoUrl }}
                          style={styles.postImage}
                          useNativeControls
                          resizeMode={ResizeMode.COVER}
                          isLooping={true}
                          shouldPlay={
                            isScreenFocused && 
                            visibleVideos.has(item.id) && 
                            (carouselIndices[item.id] ?? 0) === index
                          }
                          volume={
                            isMuted || (carouselIndices[item.id] ?? 0) !== index 
                              ? 0.0 
                              : 1.0
                          }
                          onError={(err) => console.warn('Video play error (carousel item)', err)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                  {item.video_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[item.id] ?? 0) + 1}/{item.video_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
              ) : item.image_urls && item.image_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [item.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {item.image_urls.map((imageUrl, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.mediaPage}
                        activeOpacity={0.95}
                        onPress={() => item.sourceId && router.push(`/post/${item.sourceId}`)}
                      >
                        <CachedImage
                          uri={imageUrl}
                          style={styles.postImage}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {item.image_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[item.id] ?? 0) + 1}/{item.image_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
              ) : item.youtube_url ? (
                <View style={styles.mediaPage}>
                  <YouTubePlayer url={item.youtube_url} />
                </View>
              ) : item.video_url ? (
                <View style={styles.mediaPage}>
                  <Video
                    source={{ uri: item.video_url }}
                    style={styles.postImage}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    isLooping={true}
                    shouldPlay={isScreenFocused && visibleVideos.has(item.id)}
                    volume={isMuted ? 0.0 : 1.0}
                    onError={(err) => console.warn('Video play error (single)', err)}
                  />
                </View>
              ) : item.image ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => item.sourceId && router.push(`/post/${item.sourceId}`)}>
                  <View style={styles.mediaPage}>
                    <CachedImage 
                      uri={item.image} 
                      style={styles.postImage}
                      contentFit="cover"
                    />
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Post Actions - Instagram Style */}
              <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                  <TouchableOpacity 
                    style={styles.actionButtonWithCount}
                    onPress={() => handleLikeToggle(item.id)}
                  >
                    <ThumbsUp 
                      size={24} 
                      color={item.isLiked ? "#ffc857" : "#000000"}
                      fill={item.isLiked ? "#ffc857" : "none"}
                      strokeWidth={2}
                    />
                    {(item.likes || 0) > 0 && (
                      <Text style={styles.actionCount}>{item.likes}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonWithCount}
                    onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}
                  >
                    <MessagesSquare size={24} color="#000000" strokeWidth={2} />
                    {item.comments !== undefined && item.comments > 0 && (
                      <Text style={styles.actionCount}>{item.comments}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleSharePress(item)}
                  >
                    <Share2 size={24} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleBookmarkToggle(item.id)}>
                  <Star size={24} color={(item as any).isBookmarked ? '#ffc857' : '#000000'} fill={(item as any).isBookmarked ? '#ffc857' : 'none'} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Caption */}
              {item.description && (
                <View style={styles.postCaption}>
                  <Text style={styles.postCaptionUsername}>
                    {item.author?.full_name || 'Anonymous'}
                  </Text>
                  <ExpandableText
                    text={item.description}
                    numberOfLines={2}
                    captionStyle={styles.postCaptionText}
                  />
                </View>
              )}

              {/* Post Comments Count */}
              {item.comments !== undefined && item.comments > 0 ? (
                <TouchableOpacity onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}>
                  <Text style={styles.viewComments}>
                    View all {item.comments} {item.comments === 1 ? 'comment' : 'comments'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}>
                  <Text style={styles.viewComments}>
                    Be the first to comment
                  </Text>
                </TouchableOpacity>
              )}
            </View>
              );
            })
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
  headerWrapper: {
    backgroundColor: '#0F172A',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#0F172A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitleAlt: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerGhostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerGhostText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearch: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  categorySection: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  categoryHeaderExpanded: {
    backgroundColor: '#F9FAFB',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  categoryIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  categorySubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  categoryMetaText: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  categoryHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  categoryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#0A84FF',
  },
  categoryStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categorySoloBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySoloBadgeSelected: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  categoryBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  categoryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  categoryActionButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryActionButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  categoryActionText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categoryActionTextMuted: {
    color: '#6B7280',
  },
  categoryActionButtonGhost: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  categoryActionGhostText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  subcategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subcategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  subcategoryPillSelected: {
    borderColor: '#0A84FF',
    backgroundColor: '#0A84FF',
  },
  subcategoryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  subcategoryLabelSelected: {
    color: '#FFFFFF',
  },
  modalPrimaryButton: {
    marginTop: 18,
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
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
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    width: width,
  },
  mediaPage: {
    width: width,
    height: width,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  carouselIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  videoContainer: {
    width: width,
    height: width,
    backgroundColor: '#000000',
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
  actionButtonWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  actionCount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
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
    fontSize: 14,
    color: '#000000',
    marginBottom: 2,
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
  // Share Modal Styles (Instagram-style)
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  shareModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  shareModalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  shareSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shareSearchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  shareFriendsList: {
    flex: 1,
  },
  shareFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shareFriendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shareFriendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  shareFriendAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareFriendAvatarText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  shareFriendInfo: {
    flex: 1,
  },
  shareFriendName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  shareFriendUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  shareSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  shareLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  shareLoadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 16,
  },
  shareEmptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  shareEmptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  verifiedBadge: {
    backgroundColor: '#000000',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});

