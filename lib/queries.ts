import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDiscoverFeed, type DiscoverItem } from './discover';
import { supabase } from './supabase';
import { cacheData, getCachedData, getMemoryCacheSync, setMemoryCacheSync, preloadCacheToMemory } from './cache';

// Cache keys for consistent access
export const CACHE_KEYS = {
  homePosts: (userId: string) => `home-posts-${userId}`,
  homeConfig: () => 'home-config',
  conversations: (userId: string) => `conversations-${userId}`,
  groups: (userId: string) => `groups-${userId}`,
  profile: (userId: string) => `profile-${userId}`,
  userPosts: (userId: string) => `user-posts-${userId}`,
  savedPosts: (userId: string) => `saved-posts-${userId}`,
  discoverFeed: (userId: string, category?: string) => `discover-feed-${userId}-${category || 'all'}`,
};

/**
 * Preload all critical caches on app start
 * Call this in _layout.tsx when user logs in
 */
export const preloadAppCaches = async (userId: string) => {
  const keysToPreload = [
    CACHE_KEYS.homePosts(userId),
    CACHE_KEYS.homeConfig(),
    CACHE_KEYS.conversations(userId),
    CACHE_KEYS.groups(userId),
    CACHE_KEYS.profile(userId),
    CACHE_KEYS.userPosts(userId),
    CACHE_KEYS.savedPosts(userId),
    CACHE_KEYS.discoverFeed(userId),
  ];
  
  await preloadCacheToMemory(keysToPreload);
  console.log('✅ App caches preloaded to memory');
};

/**
 * Hook for discover feed with caching and automatic refresh
 */
export const useDiscoverFeed = (userId?: string, category?: string) => {
  return useQuery({
    queryKey: ['discover-feed', userId, category],
    queryFn: async () => {
      // Try cache first for instant display
      const cacheKey = `discover-feed-${userId}-${category || 'all'}`;
      const cached = await getCachedData<DiscoverItem[]>(cacheKey);
      
      // Fetch fresh data
      const freshData = await fetchDiscoverFeed(userId, category);
      
      // Update cache in background
      cacheData(cacheKey, freshData, { expiryMinutes: 5 });
      
      return freshData;
    },
    staleTime: 1000 * 60 * 3, // Consider fresh for 3 minutes
    placeholderData: (previousData) => previousData, // Show old data while loading
    enabled: !!userId, // Only fetch when user is available
  });
};

/**
 * Hook for home feed posts with pagination
 */
const POSTS_PER_PAGE = 10;

export const useHomeFeed = (userId?: string) => {
  return useInfiniteQuery({
    queryKey: ['home-feed', userId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            is_admin,
            role
          ),
          likes:post_likes(count),
          comments:post_comments(count),
          user_like:post_likes!inner(user_id)
        `)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + POSTS_PER_PAGE - 1);

      if (error) throw error;

      // Cache the current page
      if (pageParam === 0) {
        cacheData(`home-feed-${userId}`, data, { expiryMinutes: 5 });
      }

      return data || [];
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage?.length === POSTS_PER_PAGE 
        ? pages.length * POSTS_PER_PAGE 
        : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 3,
    enabled: !!userId,
  });
};

/**
 * Hook for user profile with caching
 */
export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const cacheKey = `profile-${userId}`;
      
      // Check cache first
      const cached = await getCachedData(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Cache for longer since profiles don't change often
      cacheData(cacheKey, data, { expiryMinutes: 30 });

      return data;
    },
    staleTime: 1000 * 60 * 10, // Fresh for 10 minutes
    enabled: !!userId,
  });
};

/**
 * Hook for user interests
 */
export const useUserInterests = (userId?: string) => {
  return useQuery({
    queryKey: ['user-interests', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', userId);

      if (error) throw error;
      return new Set(data?.map(item => item.interest_id) || []);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!userId,
  });
};

/**
 * Hook for friend IDs
 */
export const useFriendIds = (userId?: string) => {
  return useQuery({
    queryKey: ['friend-ids', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const ids = data?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];
      
      return new Set(ids);
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!userId,
  });
};

/**
 * Mutation for liking a post with optimistic update
 */
export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) throw error;
    },
    onMutate: async ({ postId }) => {
      // Optimistically update the UI
      await queryClient.cancelQueries({ queryKey: ['discover-feed'] });
      
      const previousData = queryClient.getQueryData(['discover-feed']);
      
      // Update cached data
      queryClient.setQueryData(['discover-feed'], (old: any) => {
        if (!old) return old;
        return old.map((item: any) => 
          item.id === postId 
            ? { ...item, isLiked: true, likes: (item.likes || 0) + 1 }
            : item
        );
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['discover-feed'], context.previousData);
      }
    },
  });
};

/**
 * Prefetch common data on app start
 */
export const prefetchCommonData = async (queryClient: any, userId?: string) => {
  if (!userId) return;

  // Prefetch in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['user-profile', userId],
      queryFn: async () => {
        const cached = await getCachedData(`profile-${userId}`);
        if (cached) return cached;
        
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        return data;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ['user-interests', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('user_interests')
          .select('interest_id')
          .eq('user_id', userId);
        
        return new Set(data?.map(item => item.interest_id) || []);
      },
    }),
  ]);
};

/**
 * ============================================
 * INSTANT CACHE HOOKS (Stale-While-Revalidate)
 * ============================================
 * These hooks provide Instagram-like speed by:
 * 1. Returning cached data INSTANTLY (synchronous)
 * 2. Fetching fresh data in background
 * 3. Updating UI when fresh data arrives
 */

/**
 * Hook for home posts with instant cache
 * Returns cached data immediately, fetches fresh in background
 */
export const useHomePostsWithCache = (userId?: string) => {
  const cacheKey = userId ? CACHE_KEYS.homePosts(userId) : '';
  
  // Get instant cached data (synchronous - no loading state needed)
  const instantData = cacheKey ? getMemoryCacheSync<any[]>(cacheKey) : null;
  
  return useQuery({
    queryKey: ['home-posts-cached', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          image_urls,
          video_url,
          video_urls,
          youtube_url,
          youtube_urls,
          media_items,
          comments_count,
          likes_count,
          created_at,
          user_id,
          profiles:user_id!inner (
            id,
            username,
            full_name,
            avatar_url,
            is_admin,
            role
          )
        `)
        .eq('is_highlight_only', false)
        .or('is_admin.eq.true,role.eq.admin', { foreignTable: 'profiles' })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Cache the fresh data
      if (data) {
        cacheData(cacheKey, data, { expiryMinutes: 10 });
      }
      
      return data || [];
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 2, // Fresh for 2 minutes
    gcTime: 1000 * 60 * 30, // Keep in memory for 30 minutes
    enabled: !!userId,
    refetchOnMount: true, // Always check for updates
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for home config (featured items, category tabs, trending) with instant cache
 */
export const useHomeConfigWithCache = () => {
  const cacheKey = CACHE_KEYS.homeConfig();
  const instantData = getMemoryCacheSync<any>(cacheKey);
  
  return useQuery({
    queryKey: ['home-config-cached'],
    queryFn: async () => {
      const [featRes, tabsRes, trendingRes] = await Promise.all([
        supabase
          .from('home_featured_items')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true }),
        supabase
          .from('home_category_tabs')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true }),
        supabase
          .from('trending_articles')
          .select('*')
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const config = {
        featured: featRes.data || [],
        categoryTabs: tabsRes.data || [],
        trendingArticles: trendingRes.data || [],
      };
      
      cacheData(cacheKey, config, { expiryMinutes: 15 });
      
      return config;
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
};

/**
 * Hook for chat conversations with instant cache
 */
export const useConversationsWithCache = (userId?: string) => {
  const cacheKey = userId ? CACHE_KEYS.conversations(userId) : '';
  const instantData = cacheKey ? getMemoryCacheSync<any[]>(cacheKey) : null;
  
  return useQuery({
    queryKey: ['conversations-cached', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Fetch conversations with latest message
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          friend:profiles!friendships_friend_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          user:profiles!friendships_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;
      
      // Get latest messages for each conversation
      const conversations = await Promise.all(
        (friendships || []).map(async (f) => {
          const friendProfile = f.user_id === userId ? f.friend : f.user;
          const friendId = f.user_id === userId ? f.friend_id : f.user_id;
          
          const { data: messages } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          const { count: unreadCount } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', friendId)
            .eq('receiver_id', userId)
            .eq('is_read', false);
          
          return {
            friend: friendProfile,
            latestMessage: messages?.[0] || null,
            unreadCount: unreadCount || 0,
          };
        })
      );
      
      // Sort by latest message
      conversations.sort((a, b) => {
        const aTime = a.latestMessage?.created_at || '1970-01-01';
        const bTime = b.latestMessage?.created_at || '1970-01-01';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      
      cacheData(cacheKey, conversations, { expiryMinutes: 5 });
      
      return conversations;
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 1, // Fresh for 1 minute (chats update frequently)
    gcTime: 1000 * 60 * 30,
    enabled: !!userId,
  });
};

/**
 * Hook for user profile with instant cache
 */
export const useProfileWithCache = (userId?: string) => {
  const cacheKey = userId ? CACHE_KEYS.profile(userId) : '';
  const instantData = cacheKey ? getMemoryCacheSync<any>(cacheKey) : null;
  
  return useQuery({
    queryKey: ['profile-cached', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      cacheData(cacheKey, data, { expiryMinutes: 30 });
      
      return data;
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    enabled: !!userId,
  });
};

/**
 * Hook for user's own posts with instant cache
 */
export const useUserPostsWithCache = (userId?: string) => {
  const cacheKey = userId ? CACHE_KEYS.userPosts(userId) : '';
  const instantData = cacheKey ? getMemoryCacheSync<any[]>(cacheKey) : null;
  
  return useQuery({
    queryKey: ['user-posts-cached', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          image_urls,
          video_url,
          video_urls,
          youtube_url,
          youtube_urls,
          media_items,
          comments_count,
          likes_count,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      cacheData(cacheKey, data, { expiryMinutes: 10 });
      
      return data || [];
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!userId,
  });
};

/**
 * Hook for saved/bookmarked posts with instant cache
 */
export const useSavedPostsWithCache = (userId?: string) => {
  const cacheKey = userId ? CACHE_KEYS.savedPosts(userId) : '';
  const instantData = cacheKey ? getMemoryCacheSync<any[]>(cacheKey) : null;
  
  return useQuery({
    queryKey: ['saved-posts-cached', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('post_bookmarks')
        .select(`
          post_id,
          post:posts (
            id,
            content,
            image_url,
            image_urls,
            video_url,
            video_urls,
            youtube_url,
            youtube_urls,
            media_items,
            comments_count,
            likes_count,
            created_at,
            user_id,
            user:profiles!posts_user_id_fkey (
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const posts = data?.map(b => b.post).filter(Boolean) || [];
      cacheData(cacheKey, posts, { expiryMinutes: 10 });
      
      return posts;
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!userId,
  });
};

/**
 * Hook for group chats with instant cache
 */
export const useGroupChatsWithCache = (userId?: string) => {
  const cacheKey = userId ? CACHE_KEYS.groups(userId) : '';
  const instantData = cacheKey ? getMemoryCacheSync<any[]>(cacheKey) : null;
  
  return useQuery({
    queryKey: ['groups-cached', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get user's group memberships
      const { data: memberships, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          group:groups (
            id,
            name,
            avatar_url
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      
      const groups = await Promise.all(
        (memberships || []).map(async (m) => {
          const { data: messages } = await supabase
            .from('group_messages')
            .select('*')
            .eq('group_id', m.group_id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          return {
            group: m.group,
            lastMessage: messages?.[0] || null,
            unreadCount: 0, // Would need separate unread tracking
          };
        })
      );
      
      cacheData(cacheKey, groups, { expiryMinutes: 5 });
      
      return groups;
    },
    initialData: instantData || undefined,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    enabled: !!userId,
  });
};
