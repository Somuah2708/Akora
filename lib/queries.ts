import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDiscoverFeed, type DiscoverItem } from './discover';
import { supabase } from './supabase';
import { cacheData, getCachedData } from './cache';

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
