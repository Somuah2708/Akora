import { supabase } from './supabase';
import type { Post, Profile, PostWithInteractions } from './supabase';

/**
 * Fetch posts with user profiles and interaction counts
 * @param limit - Number of posts to fetch (default: 20)
 * @param offset - Offset for pagination (default: 0)
 * @param userId - Current user ID to check if they liked/bookmarked posts
 */
export async function fetchPosts(
  limit: number = 20,
  offset: number = 0,
  userId?: string
): Promise<PostWithInteractions[]> {
  try {
    // Fetch posts with user profiles
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:profiles(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!posts) return [];

    // For each post, get interaction counts and user's interaction status
    const postsWithInteractions = await Promise.all(
      posts.map(async (post) => {
        // Get counts using helper functions
        const [likesCount, commentsCount, bookmarksCount, sharesCount] = await Promise.all([
          getLikesCount(post.id),
          getCommentsCount(post.id),
          getBookmarksCount(post.id),
          getSharesCount(post.id),
        ]);

        // Check if current user liked/bookmarked this post
        let isLiked = false;
        let isBookmarked = false;

        if (userId) {
          [isLiked, isBookmarked] = await Promise.all([
            hasUserLikedPost(post.id, userId),
            hasUserBookmarkedPost(post.id, userId),
          ]);
        }

        return {
          ...post,
          likes_count: likesCount,
          comments_count: commentsCount,
          bookmarks_count: bookmarksCount,
          shares_count: sharesCount,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
        } as PostWithInteractions;
      })
    );

    return postsWithInteractions;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

/**
 * Get likes count for a post
 */
export async function getLikesCount(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_post_likes_count', {
    p_post_id: postId,
  });

  if (error) {
    console.error('Error getting likes count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get comments count for a post
 */
export async function getCommentsCount(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_post_comments_count', {
    p_post_id: postId,
  });

  if (error) {
    console.error('Error getting comments count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get bookmarks count for a post
 */
export async function getBookmarksCount(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_post_bookmarks_count', {
    p_post_id: postId,
  });

  if (error) {
    console.error('Error getting bookmarks count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get shares count for a post
 */
export async function getSharesCount(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_post_shares_count', {
    p_post_id: postId,
  });

  if (error) {
    console.error('Error getting shares count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Check if user has liked a post
 */
export async function hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_user_liked_post', {
    p_post_id: postId,
    p_user_id: userId,
  });

  if (error) {
    console.error('Error checking if user liked post:', error);
    return false;
  }

  return data || false;
}

/**
 * Check if user has bookmarked a post
 */
export async function hasUserBookmarkedPost(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_user_bookmarked_post', {
    p_post_id: postId,
    p_user_id: userId,
  });

  if (error) {
    console.error('Error checking if user bookmarked post:', error);
    return false;
  }

  return data || false;
}

/**
 * Like a post
 */
export async function likePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_likes').insert({
      post_id: postId,
      user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error liking post:', error);
    return false;
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unliking post:', error);
    return false;
  }
}

/**
 * Bookmark a post
 */
export async function bookmarkPost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_bookmarks').insert({
      post_id: postId,
      user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error bookmarking post:', error);
    return false;
  }
}

/**
 * Remove bookmark from a post
 */
export async function unbookmarkPost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }
}

/**
 * Share a post
 */
export async function sharePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_shares').insert({
      post_id: postId,
      user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sharing post:', error);
    return false;
  }
}

/**
 * Create a new post
 */
export async function createPost(
  userId: string,
  content: string,
  imageUrl?: string
): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: content,
        image_url: imageUrl,
      })
      .select(`
        *,
        user:profiles(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    return null;
  }
}

/**
 * Delete a post (only by owner)
 */
export async function deletePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId); // Ensure only owner can delete

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        user:profiles(*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentCommentId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: userId,
      content: content,
      parent_comment_id: parentCommentId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
}
