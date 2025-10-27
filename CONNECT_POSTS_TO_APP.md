# Connecting Your Home Page to Supabase Posts

This guide shows you how to replace the placeholder posts in your home page with real data from Supabase.

## Step 1: Apply Database Migrations

First, make sure you've applied the database migrations. See `SUPABASE_SETUP.md` for instructions.

## Step 2: Update Home Page Component

Replace the placeholder posts in `app/(tabs)/index.tsx` with real data fetched from Supabase.

### Current Code (Placeholder):

```typescript
const PLACEHOLDER_POSTS = [
  {
    id: '1',
    user: {
      id: '1',
      username: 'john_doe',
      avatar_url: 'https://i.pravatar.cc/150?img=1',
      // ...
    },
    content: 'Beautiful sunset at the beach 🌅',
    // ...
  },
  // More placeholder posts...
];
```

### New Code (Real Data):

```typescript
import { useState, useEffect } from 'react';
import { fetchPosts, likePost, unlikePost, bookmarkPost, unbookmarkPost } from '@/lib/posts';
import { useAuth } from '@/hooks/useAuth';
import type { PostWithInteractions } from '@/lib/supabase';

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithInteractions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load posts on mount
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const fetchedPosts = await fetchPosts(20, 0, user?.id);
    setPosts(fetchedPosts);
    setLoading(false);
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  // Handle like button
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    // Optimistically update UI
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              is_liked: !isLiked,
              likes_count: isLiked ? (post.likes_count || 0) - 1 : (post.likes_count || 0) + 1,
            }
          : post
      )
    );

    // Update in database
    const success = isLiked ? await unlikePost(postId, user.id) : await likePost(postId, user.id);

    // If failed, revert UI
    if (!success) {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                is_liked: isLiked,
                likes_count: isLiked ? (post.likes_count || 0) + 1 : (post.likes_count || 0) - 1,
              }
            : post
        )
      );
    }
  };

  // Handle bookmark button
  const handleBookmark = async (postId: string, isBookmarked: boolean) => {
    if (!user) return;

    // Optimistically update UI
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? { ...post, is_bookmarked: !isBookmarked }
          : post
      )
    );

    // Update in database
    const success = isBookmarked
      ? await unbookmarkPost(postId, user.id)
      : await bookmarkPost(postId, user.id);

    // If failed, revert UI
    if (!success) {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, is_bookmarked: isBookmarked }
            : post
        )
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => handleLike(item.id, item.is_liked || false)}
            onBookmark={() => handleBookmark(item.id, item.is_bookmarked || false)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        // ... other props
      />
    </View>
  );
}
```

## Step 3: Update Post Card Component

Make sure your PostCard component uses the real data:

```typescript
interface PostCardProps {
  post: PostWithInteractions;
  onLike: () => void;
  onBookmark: () => void;
}

function PostCard({ post, onLike, onBookmark }: PostCardProps) {
  return (
    <View style={styles.postCard}>
      {/* User info */}
      <View style={styles.postHeader}>
        <Image
          source={{ uri: post.user?.avatar_url || 'https://i.pravatar.cc/150' }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.username}>{post.user?.username}</Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Post image */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onLike} style={styles.actionButton}>
          <Heart
            size={24}
            fill={post.is_liked ? '#000' : 'none'}
            color="#000"
          />
          <Text style={styles.actionText}>{post.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={24} color="#000" />
          <Text style={styles.actionText}>{post.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Send size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onBookmark} style={styles.actionButton}>
          <Bookmark
            size={24}
            fill={post.is_bookmarked ? '#000' : 'none'}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      {/* Post content */}
      <Text style={styles.postContent}>
        <Text style={styles.username}>{post.user?.username}</Text>{' '}
        {post.content}
      </Text>
    </View>
  );
}
```

## Step 4: Add Timestamp Formatting

Create a helper function to format timestamps:

```typescript
function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return postDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
```

## Step 5: Enable Auth (Important!)

Currently, your auth is mocked. To make posts work properly, you need to enable real authentication:

### Update `hooks/useAuth.ts`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setUser(data);
    }
    setLoading(false);
  };

  return { user, loading };
}
```

## Testing

1. Apply migrations to create tables
2. Run your app: `npx expo start`
3. You should see the 5 sample posts from the database
4. Try liking and bookmarking - the counts should update!
5. Pull down to refresh the feed

## Next Features to Add

- [ ] Add comment modal/screen
- [ ] Add post creation screen
- [ ] Add image upload functionality
- [ ] Add infinite scroll/pagination
- [ ] Add post sharing functionality
- [ ] Add user profile view when clicking on username/avatar

## Troubleshooting

### No posts showing
- Check that migrations were applied successfully
- Look at browser console or Expo logs for errors
- Verify Supabase credentials in `.env`

### Can't like/bookmark posts
- Make sure auth is enabled (not mocked)
- Check RLS policies in Supabase Dashboard
- Verify user is authenticated

### Images not loading
- Check image URLs are valid
- Verify network permissions in app
- Try using a different image host (Unsplash, Cloudinary, etc.)
