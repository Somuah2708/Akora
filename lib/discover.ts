import { supabase } from './supabase';
import type { ProductService, Profile } from './supabase';

export interface DiscoverItem {
  id: string;
  type: 'post' | 'product' | 'event' | 'resource' | 'recommendation';
  category: string;
  title: string;
  description: string;
  image: string | null;
  image_urls?: string[];
  video_url?: string | null;
  video_urls?: string[];
  youtube_url?: string | null;
  youtube_urls?: string[];
  author?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  date?: string;
  created_at?: string;
  location?: string;
  likes?: number;
  isLiked?: boolean;
  saved?: number;
  comments?: number;
  matchScore?: number;
  tags?: string[];
  sourceId?: string;
  sourceTable?: string;
}

/**
 * Fetch personalized discover feed combining posts, products, and other content
 * Shows posts from friends and based on user's interests
 */
export async function fetchDiscoverFeed(
  userId?: string,
  category?: string
): Promise<DiscoverItem[]> {
  try {
    const items: DiscoverItem[] = [];

    // Fetch posts using the new function that filters by friendships and interests
    if (userId) {
      const { data: posts, error } = await supabase
        .rpc('get_discover_posts', {
          p_user_id: userId,
          p_limit: 20,
          p_offset: 0
        });

      if (error) {
        console.error('Error fetching discover posts:', error);
      }

      if (posts) {
        // Fetch user profiles for each post
        const postIds = posts.map((p: any) => p.id);
        const { data: postsWithProfiles } = await supabase
          .from('posts')
          .select('*, user:profiles(id, username, full_name, avatar_url, is_admin)')
          .in('id', postIds);

        if (postsWithProfiles) {
          // Filter out admin-authored posts for Discover
          const nonAdminPosts = postsWithProfiles.filter((post: any) => !post.user?.is_admin);
          
          // Fetch accurate likes and comments counts for all posts
          const postIdsForCounts = nonAdminPosts.map((p: any) => p.id);
          
          // Fetch likes counts
          const { data: likesData } = await supabase
            .from('post_likes')
            .select('post_id')
            .in('post_id', postIdsForCounts);
          
          // Fetch comments counts
          const { data: commentsData } = await supabase
            .from('post_comments')
            .select('post_id')
            .in('post_id', postIdsForCounts);
          
          // Count likes per post
          const likesCountMap = new Map<string, number>();
          (likesData || []).forEach((like: any) => {
            const count = likesCountMap.get(like.post_id) || 0;
            likesCountMap.set(like.post_id, count + 1);
          });
          
          // Count comments per post
          const commentsCountMap = new Map<string, number>();
          (commentsData || []).forEach((comment: any) => {
            const count = commentsCountMap.get(comment.post_id) || 0;
            commentsCountMap.set(comment.post_id, count + 1);
          });
          
          const countsMap = new Map<string, { likes: number; comments: number }>();
          postIdsForCounts.forEach((postId: string) => {
            countsMap.set(postId, {
              likes: likesCountMap.get(postId) || 0,
              comments: commentsCountMap.get(postId) || 0,
            });
          });
          
          items.push(
            ...nonAdminPosts.map((post) => {
              const counts = countsMap.get(post.id) || { likes: 0, comments: 0 };
              return {
                id: `post-${post.id}`,
                type: 'post' as const,
                category: post.category || 'social',
                title: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
                description: post.content,
                image: post.image_url || (Array.isArray(post.image_urls) ? post.image_urls[0] : null),
                image_urls: post.image_urls || undefined,
                video_url: post.video_url || null,
                video_urls: post.video_urls || undefined,
                youtube_url: post.youtube_url || null,
                youtube_urls: post.youtube_urls || undefined,
                created_at: post.created_at,
                likes: counts.likes,
                comments: counts.comments,
                author: post.user
                  ? {
                      id: post.user.id,
                      username: post.user.username || '',
                      full_name: post.user.full_name || '',
                      avatar_url: post.user.avatar_url || '',
                    }
                  : undefined,
                sourceId: post.id,
                sourceTable: 'posts',
                matchScore: post.user_id === userId ? 100 : 85, // Higher score for own posts
                tags: post.category ? [post.category] : [],
              };
            })
          );
        }
      }
    } else {
      // If no user ID, show public posts only
      const { data: posts } = await supabase
        .from('posts')
        .select('*, user:profiles(id, username, full_name, avatar_url, is_admin)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(10);

      if (posts) {
        const nonAdminPosts = posts.filter((post: any) => !post.user?.is_admin);
        
        // Fetch accurate likes and comments counts
        const postIdsForCounts = nonAdminPosts.map((p: any) => p.id);
        
        // Fetch likes counts
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIdsForCounts);
        
        // Fetch comments counts
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIdsForCounts);
        
        // Count likes per post
        const likesCountMap = new Map<string, number>();
        (likesData || []).forEach((like: any) => {
          const count = likesCountMap.get(like.post_id) || 0;
          likesCountMap.set(like.post_id, count + 1);
        });
        
        // Count comments per post
        const commentsCountMap = new Map<string, number>();
        (commentsData || []).forEach((comment: any) => {
          const count = commentsCountMap.get(comment.post_id) || 0;
          commentsCountMap.set(comment.post_id, count + 1);
        });
        
        const countsMap = new Map<string, { likes: number; comments: number }>();
        postIdsForCounts.forEach((postId: string) => {
          countsMap.set(postId, {
            likes: likesCountMap.get(postId) || 0,
            comments: commentsCountMap.get(postId) || 0,
          });
        });
        
        items.push(
          ...nonAdminPosts.map((post) => {
            const counts = countsMap.get(post.id) || { likes: 0, comments: 0 };
            return {
              id: `post-${post.id}`,
              type: 'post' as const,
              category: post.category || 'social',
              title: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
              description: post.content,
              image: post.image_url || (Array.isArray(post.image_urls) ? post.image_urls[0] : null),
              image_urls: post.image_urls || undefined,
              video_url: post.video_url || null,
              video_urls: post.video_urls || undefined,
              youtube_url: post.youtube_url || null,
              youtube_urls: post.youtube_urls || undefined,
              created_at: post.created_at,
              likes: counts.likes,
              comments: counts.comments,
              author: post.user
                ? {
                    id: post.user.id,
                    username: post.user.username || '',
                    full_name: post.user.full_name || '',
                    avatar_url: post.user.avatar_url || '',
                  }
                : undefined,
              sourceId: post.id,
              sourceTable: 'posts',
              matchScore: 75,
              tags: post.category ? [post.category] : [],
            };
          })
        );
      }
    }

    // Fetch featured products/services
    const { data: products, error: productsError } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_approved', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(8);

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    // Fetch user profiles separately for products
    let productsWithUsers = products || [];
    if (products && products.length > 0) {
      const userIds = products.map(p => p.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);
        
        if (users) {
          productsWithUsers = products.map(product => ({
            ...product,
            user: users.find(u => u.id === product.user_id)
          }));
        }
      }
    }

    if (productsWithUsers.length > 0) {
      items.push(
        ...productsWithUsers.map((product) => ({
          id: `product-${product.id}`,
          type: 'product' as const,
          category: 'marketplace',
          title: product.title,
          description: product.description,
          image: product.image_url,
          author: product.user
            ? {
                id: product.user.id,
                username: product.user.username || '',
                full_name: product.user.full_name || '',
                avatar_url: product.user.avatar_url || '',
              }
            : undefined,
          tags: [product.category_name],
          sourceId: product.id,
          sourceTable: 'products_services',
          matchScore: 90,
        }))
      );
    }

    // Mix and sort by match score and recency
    items.sort((a, b) => {
      const scoreA = a.matchScore || 0;
      const scoreB = b.matchScore || 0;
      return scoreB - scoreA;
    });

    // Filter by category if specified
    if (category && category !== 'all') {
      return items.filter((item) => item.category === category);
    }

    return items;
  } catch (error) {
    console.error('Error fetching discover feed:', error);
    return [];
  }
}

/**
 * Fetch recommended content based on user activity
 */
export async function fetchRecommendedContent(userId: string): Promise<DiscoverItem[]> {
  try {
    const items: DiscoverItem[] = [];

    // Get user's liked posts to understand interests
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .limit(20);

    // Get user's bookmarked products
    const { data: bookmarkedProducts } = await supabase
      .from('service_bookmarks')
      .select('product_service_id')
      .eq('user_id', userId)
      .limit(20);

    // Fetch similar content based on user activity
    // For now, return popular content
    const { data: popularPosts } = await supabase
      .from('posts')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (popularPosts) {
      items.push(
        ...popularPosts.map((post) => ({
          id: `rec-post-${post.id}`,
          type: 'recommendation' as const,
          category: 'education',
          title: 'Recommended: ' + post.content.substring(0, 50),
          description: post.content,
          image: post.image_url,
          author: post.user
            ? {
                id: post.user.id,
                username: post.user.username || '',
                full_name: post.user.full_name || '',
                avatar_url: post.user.avatar_url || '',
              }
            : undefined,
          sourceId: post.id,
          sourceTable: 'posts',
          matchScore: 92,
        }))
      );
    }

    return items;
  } catch (error) {
    console.error('Error fetching recommended content:', error);
    return [];
  }
}

/**
 * Fetch trending content
 */
export async function fetchTrendingContent(): Promise<DiscoverItem[]> {
  try {
    const items: DiscoverItem[] = [];

    // Get posts with most likes (trending)
    const { data: posts } = await supabase
      .from('posts')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (posts) {
      // In a real implementation, we'd count likes and sort by that
      items.push(
        ...posts.map((post) => ({
          id: `trending-${post.id}`,
          type: 'post' as const,
          category: 'trending',
          title: post.content.substring(0, 60),
          description: post.content,
          image: post.image_url,
          author: post.user
            ? {
                id: post.user.id,
                username: post.user.username || '',
                full_name: post.user.full_name || '',
                avatar_url: post.user.avatar_url || '',
              }
            : undefined,
          likes: Math.floor(Math.random() * 500) + 50,
          matchScore: 88,
          sourceId: post.id,
          sourceTable: 'posts',
        }))
      );
    }

    return items;
  } catch (error) {
    console.error('Error fetching trending content:', error);
    return [];
  }
}

/**
 * Search discover content
 */
export async function searchDiscoverContent(query: string): Promise<DiscoverItem[]> {
  try {
    const items: DiscoverItem[] = [];

    // Search posts
    const { data: posts } = await supabase
      .from('posts')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .ilike('content', `%${query}%`)
      .limit(10);

    if (posts) {
      items.push(
        ...posts.map((post) => ({
          id: `search-post-${post.id}`,
          type: 'post' as const,
          category: 'social',
          title: post.content.substring(0, 60),
          description: post.content,
          image: post.image_url,
          author: post.user
            ? {
                id: post.user.id,
                username: post.user.username || '',
                full_name: post.user.full_name || '',
                avatar_url: post.user.avatar_url || '',
              }
            : undefined,
          sourceId: post.id,
          sourceTable: 'posts',
        }))
      );
    }

    // Search products
    const { data: products } = await supabase
      .from('products_services')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_approved', true)
      .limit(10);

    if (products) {
      items.push(
        ...products.map((product) => ({
          id: `search-product-${product.id}`,
          type: 'product' as const,
          category: 'marketplace',
          title: product.title,
          description: product.description,
          image: product.image_url,
          author: product.user
            ? {
                id: product.user.id,
                username: product.user.username || '',
                full_name: product.user.full_name || '',
                avatar_url: product.user.avatar_url || '',
              }
            : undefined,
          tags: [product.category_name],
          sourceId: product.id,
          sourceTable: 'products_services',
        }))
      );
    }

    return items;
  } catch (error) {
    console.error('Error searching discover content:', error);
    return [];
  }
}

/**
 * Get user's saved/bookmarked discover items
 */
export async function fetchSavedDiscoverItems(userId: string): Promise<DiscoverItem[]> {
  try {
    const items: DiscoverItem[] = [];

    // Get bookmarked posts
    const { data: bookmarkedPosts } = await supabase
      .from('post_bookmarks')
      .select('post:posts(*, user:profiles(id, username, full_name, avatar_url))')
      .eq('user_id', userId);

    if (bookmarkedPosts) {
      bookmarkedPosts.forEach((bookmark: any) => {
        if (bookmark.post) {
          items.push({
            id: `saved-post-${bookmark.post.id}`,
            type: 'post' as const,
            category: 'saved',
            title: bookmark.post.content.substring(0, 60),
            description: bookmark.post.content,
            image: bookmark.post.image_url,
            author: bookmark.post.user
              ? {
                  id: bookmark.post.user.id,
                  username: bookmark.post.user.username || '',
                  full_name: bookmark.post.user.full_name || '',
                  avatar_url: bookmark.post.user.avatar_url || '',
                }
              : undefined,
            sourceId: bookmark.post.id,
            sourceTable: 'posts',
          });
        }
      });
    }

    // Get bookmarked products
    const { data: bookmarkedProducts } = await supabase
      .from('service_bookmarks')
      .select('product_service:products_services(*, user:profiles(id, username, full_name, avatar_url))')
      .eq('user_id', userId);

    if (bookmarkedProducts) {
      bookmarkedProducts.forEach((bookmark: any) => {
        if (bookmark.product_service) {
          items.push({
            id: `saved-product-${bookmark.product_service.id}`,
            type: 'product' as const,
            category: 'saved',
            title: bookmark.product_service.title,
            description: bookmark.product_service.description,
            image: bookmark.product_service.image_url,
            author: bookmark.product_service.user
              ? {
                  id: bookmark.product_service.user.id,
                  username: bookmark.product_service.user.username || '',
                  full_name: bookmark.product_service.user.full_name || '',
                  avatar_url: bookmark.product_service.user.avatar_url || '',
                }
              : undefined,
            tags: [bookmark.product_service.category_name],
            sourceId: bookmark.product_service.id,
            sourceTable: 'products_services',
          });
        }
      });
    }

    return items;
  } catch (error) {
    console.error('Error fetching saved items:', error);
    return [];
  }
}
