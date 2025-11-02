import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, Alert, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, BookOpen, PartyPopper, Calendar, TrendingUp, Users, Newspaper, Search, User, Edit3, Trash2, Play } from 'lucide-react-native';
import { supabase, type Post, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Video, ResizeMode } from 'expo-av';
import YouTubePlayer from '@/components/YouTubePlayer';
import { isYouTubeUrl, getYouTubeThumbnail, extractYouTubeVideoId } from '@/lib/youtube';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

// Featured items for horizontal scroll
const FEATURED_ITEMS = [
  {
    id: 'featured1',
    title: 'Upcoming Alumni Meet',
    description: 'Join us for the annual gathering',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'featured2',
    title: 'Scholarship Program 2024',
    description: 'Applications now open',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'featured3',
    title: 'Career Development Workshop',
    description: 'Enhance your professional skills',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
  },
];

// Category tabs data
const CATEGORY_TABS = [
  {
    id: '1',
    title: 'History',
    icon: BookOpen,
    color: '#FF6B6B',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&auto=format&fit=crop&q=60',
    route: '/heritage',
  },
  {
    id: '2',
    title: 'Centenary',
    icon: PartyPopper,
    color: '#4ECDC4',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=60',
    route: '/events',
  },
  {
    id: '3',
    title: 'Calendar',
    icon: Calendar,
    color: '#45B7D1',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&auto=format&fit=crop&q=60',
    route: '/calendar',
  },
  {
    id: '4',
    title: 'Trending',
    icon: TrendingUp,
    color: '#F7B731',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&auto=format&fit=crop&q=60',
    route: '/news',
  },
  {
    id: '5',
    title: 'Community',
    icon: Users,
    color: '#A55EEA',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop&q=60',
    route: '/circles',
  },
  {
    id: '6',
    title: 'News',
    icon: Newspaper,
    color: '#26DE81',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=60',
    route: '/news',
  },
];

// Placeholder posts for when there's no data
const PLACEHOLDER_POSTS = [
  {
    id: 'placeholder-1',
    user: {
      id: 'user-1',
      username: 'akora_alumni',
      full_name: 'Akora Alumni Association',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    content: 'Welcome to the Akora community! Share your journey, connect with fellow alumni, and stay updated with the latest news and events. 🎉',
    image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    user_id: 'user-1',
    likes: 124,
    comments: 18,
    isLiked: false,
  },
  {
    id: 'placeholder-2',
    user: {
      id: 'user-2',
      username: 'sarah_chen',
      full_name: 'Dr. Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    content: 'Excited to announce our new scholarship program for underprivileged students! Applications open next month. Together, we can make education accessible to all. 📚✨',
    image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    user_id: 'user-2',
    likes: 289,
    comments: 45,
    isLiked: false,
  },
  {
    id: 'placeholder-3',
    user: {
      id: 'user-3',
      username: 'michael_thompson',
      full_name: 'Michael Thompson',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    content: 'Great networking session at the Innovation Hub today! Amazing to see so many talented alumni working on groundbreaking projects. The future is bright! 💡🚀',
    image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    user_id: 'user-3',
    likes: 156,
    comments: 23,
    isLiked: false,
  },
  {
    id: 'placeholder-4',
    user: {
      id: 'user-4',
      username: 'emma_wilson',
      full_name: 'Emma Wilson',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    content: 'Throwback to our annual homecoming event last year! Can\'t wait for this year\'s gathering. Mark your calendars, everyone! 🎊',
    image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    user_id: 'user-4',
    likes: 203,
    comments: 67,
    isLiked: false,
  },
  {
    id: 'placeholder-5',
    user: {
      id: 'user-5',
      username: 'james_lee',
      full_name: 'James Lee',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    content: 'Remember, success is not final, failure is not fatal: it is the courage to continue that counts. Keep pushing forward, Akoras! 💪',
    image_url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&auto=format&fit=crop&q=60',
    created_at: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
    user_id: 'user-5',
    likes: 341,
    comments: 52,
    isLiked: false,
  },
];

interface PostWithUser extends Post {
  user: Profile;
  isLiked?: boolean;
  isBookmarked?: boolean;
  comments_count?: number;
  likes?: number;
  comments?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndices, setCarouselIndices] = useState<{ [key: string]: number }>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          image_urls,
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_admin
          ),
          post_comments(count),
          post_likes(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      console.log('Fetched posts:', data?.length || 0);
      
      // Get user's liked and bookmarked posts if logged in
      let userLikes: Set<string> = new Set();
      let userBookmarks: Set<string> = new Set();
      if (user) {
        const [likesRes, bmsRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id),
          supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id),
        ]);
        if (likesRes.data) userLikes = new Set(likesRes.data.map(l => l.post_id));
        if (bmsRes.data) userBookmarks = new Set(bmsRes.data.map(b => b.post_id));
      }
      
      // Log image URLs for debugging
      data?.forEach((post, index) => {
        console.log(`Post ${index + 1}:`, {
          id: post.id,
          image_url: post.image_url,
          image_urls: post.image_urls,
          has_single_image: !!post.image_url,
          has_multiple_images: !!post.image_urls && post.image_urls.length > 0,
        });
      });

            // Format the data to match our expected structure
      const formattedPosts = data.map(post => {
        const rawProfile = (Array.isArray(post.profiles) ? post.profiles[0] : post.profiles) as Partial<Profile> | undefined;
        const safeProfile: Profile = {
          id: rawProfile?.id ?? post.user_id,
          username: rawProfile?.username ?? 'akora_member',
          full_name: rawProfile?.full_name ?? 'Akora Member',
          avatar_url: rawProfile?.avatar_url,
          bio: rawProfile?.bio,
          class: rawProfile?.class,
          year_group: rawProfile?.year_group,
          house: rawProfile?.house,
          created_at: rawProfile?.created_at,
          is_admin: (rawProfile as any)?.is_admin ?? false,
        };

        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          image_url: post.image_url,
          image_urls: post.image_urls,
          created_at: post.created_at,
          user: safeProfile,
          likes: Array.isArray(post.post_likes) ? post.post_likes.length : 0,
          isLiked: userLikes.has(post.id),
          isBookmarked: userBookmarks.has(post.id),
          comments_count: Array.isArray(post.post_comments) ? post.post_comments.length : 0,
        } as PostWithUser;
      });

  // Only show admin posts on Home
  const adminOnly = formattedPosts.filter(p => (p.user as any)?.is_admin === true);

  // If none, fall back to placeholders
  setPosts(adminOnly.length > 0 ? adminOnly : PLACEHOLDER_POSTS as any);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // On error, show placeholder posts
      setPosts(PLACEHOLDER_POSTS as any);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [fetchPosts, user]);

  // Refresh posts when screen comes into focus (e.g., after creating a post)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchPosts();
      }
    }, [user])
  );

  const handleLikeToggle = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;
    const originalLikes = post.likes ?? 0;

    // Optimistic update
      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id !== postId) return p;

        const currentLikes = p.likes ?? 0;
        const nextLikes = p.isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

        return {
          ...p,
          isLiked: !p.isLiked,
          likes: nextLikes,
        };
      }));

    try {
      if (wasLiked) {
        // Unlike: Delete the like
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like: Insert a new like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      
      // Revert optimistic update on error
      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id !== postId) return p;

        return {
          ...p,
          isLiked: wasLiked,
          likes: originalLikes,
        };
      }));
      
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleBookmarkToggle = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save posts');
      return;
    }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasSaved = (post as any).isBookmarked === true;
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isBookmarked: !wasSaved } as any : p));
    try {
      if (wasSaved) {
        const { error } = await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    } catch (e) {
      // Revert
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isBookmarked: wasSaved } as any : p));
      Alert.alert('Error', 'Failed to update saved');
    }
  };

  const handleEditPost = (postId: string) => {
    console.log('Edit post clicked:', postId);
    router.push(`/edit-post/${postId}`);
  };

  const handleDeletePost = (postId: string) => {
    console.log('Delete post clicked:', postId);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', user?.id); // Ensure user owns the post

              if (error) throw error;

              // Remove from local state
              setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error: any) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const showPostMenu = (postId: string) => {
    console.log('Show post menu for:', postId);
    Alert.alert(
      'Post Actions',
      'Choose an action',
      [
        {
          text: 'Edit Post',
          onPress: () => handleEditPost(postId),
        },
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => handleDeletePost(postId),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  // Calculate time ago from ISO date string
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        {/* Header */}
        <View style={styles.header}>
        <Text style={styles.logoText}>Akora</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Heart size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => router.push('/profile/edit')}
          >
            <User size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Items */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.featuredScroll}
        contentContainerStyle={styles.featuredContent}
      >
        {FEATURED_ITEMS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.featuredItem}>
            <Image source={{ uri: item.image }} style={styles.featuredImage} />
            <View style={styles.featuredOverlay}>
              <Text style={styles.featuredTitle}>{item.title}</Text>
              <Text style={styles.featuredDescription}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORY_TABS.map((category) => {
          const IconComponent = category.icon;
          const isActiveCategory = activeCategoryId === category.id;
          return (
            <TouchableOpacity 
              key={category.id} 
              style={[styles.categoryTab, isActiveCategory && styles.categoryTabActive]}
              activeOpacity={0.85}
              onPress={() => {
                setActiveCategoryId(category.id);
                if (category.route) {
                  router.push(category.route as any);
                }
              }}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <View
                style={[
                  styles.categoryOverlay,
                  { backgroundColor: category.color + '95' },
                  isActiveCategory && styles.categoryOverlayActive,
                ]}
              >
                <IconComponent size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar}>
        <Search size={20} color="#8E8E8E" strokeWidth={2} />
        <Text style={styles.searchPlaceholder}>Search posts, people, and more...</Text>
      </TouchableOpacity>

      {/* Posts Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet</Text>
          {user?.is_admin && (
            <TouchableOpacity 
              style={styles.createFirstPostButton}
              onPress={() => router.push('/create-post')}
            >
              <Text style={styles.createFirstPostText}>Create First Post</Text>
            </TouchableOpacity>
            )}
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.postHeaderLeft}>
                  <Image 
                    source={{ 
                      uri: post.user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'
                    }} 
                    style={styles.postUserAvatar} 
                  />
                  <View>
                    <Text style={styles.postUsername}>{post.user.full_name}</Text>
                    <Text style={styles.postTime}>{getTimeAgo(post.created_at)}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('=== THREE DOT BUTTON CLICKED ===');
                    console.log('Post ID:', post.id);
                    console.log('Post user_id:', post.user_id);
                    console.log('Current user id:', user?.id);
                    console.log('Are they equal?', post.user_id === user?.id);
                    
                    if (post.user_id === user?.id) {
                      showPostMenu(post.id);
                    } else {
                      Alert.alert('Info', 'You can only edit your own posts');
                    }
                  }}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  style={styles.moreButton}
                  activeOpacity={0.6}
                >
                  <MoreHorizontal size={24} color="#64748B" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Media (Images/Videos/YouTube Carousel) */}
              {post.youtube_urls && post.youtube_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [post.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {post.youtube_urls.map((youtubeUrl, index) => (
                      <YouTubePlayer key={index} url={youtubeUrl} />
                    ))}
                  </ScrollView>
                  {post.youtube_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[post.id] ?? 0) + 1}/{post.youtube_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
              ) : post.video_urls && post.video_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [post.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {post.video_urls.map((videoUrl, index) => (
                      <View key={index} style={styles.videoContainer}>
                        <Video
                          source={{ uri: videoUrl }}
                          style={styles.postImage}
                          useNativeControls
                          resizeMode={ResizeMode.COVER}
                          isLooping
                        />
                      </View>
                    ))}
                  </ScrollView>
                  {post.video_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[post.id] ?? 0) + 1}/{post.video_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
              ) : post.image_urls && post.image_urls.length > 0 ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/post/${post.id}`)}>
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [post.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {post.image_urls.map((imageUrl, index) => (
                      <Image 
                        key={index}
                        source={{ uri: imageUrl }} 
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                  {post.image_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[post.id] ?? 0) + 1}/{post.image_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
                </TouchableOpacity>
              ) : post.youtube_url ? (
                <YouTubePlayer url={post.youtube_url} />
              ) : post.video_url ? (
                <View style={styles.videoContainer}>
                  <Video
                    source={{ uri: post.video_url }}
                    style={styles.postImage}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    isLooping
                  />
                </View>
              ) : post.image_url ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/post/${post.id}`)}>
                  <Image 
                    source={{ uri: post.image_url }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : null}

              {/* Post Actions */}
              <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleLikeToggle(post.id)}
                  >
                    <Heart 
                      size={26} 
                      color={post.isLiked ? "#FF3B30" : "#000000"}
                      fill={post.isLiked ? "#FF3B30" : "none"}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push(`/post-comments/${post.id}`)}
                  >
                    <MessageCircle size={26} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleBookmarkToggle(post.id)}>
                  <Bookmark size={26} color={post.isBookmarked ? '#111827' : '#000000'} fill={post.isBookmarked ? '#111827' : 'none'} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Likes */}
              <Text style={styles.postLikes}>{post.likes} likes</Text>

              {/* Post Caption */}
              <View style={styles.postCaption}>
                <Text style={styles.postCaptionText}>
                  <Text style={styles.postCaptionUsername}>{post.user.full_name}</Text>
                  {' '}{post.content}
                </Text>
              </View>

              {/* Post Comments */}
              {post.comments_count !== undefined && post.comments_count > 0 && (
                <TouchableOpacity onPress={() => router.push(`/post-comments/${post.id}`)}>
                  <Text style={styles.viewComments}>
                    View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

      </ScrollView>

      {/* Floating Action Button for Creating Posts */}
      {user && (
        <TouchableOpacity 
          style={styles.fabButton}
          onPress={() => router.push('/create-post')}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  featuredScroll: {
    marginBottom: 0,
  },
  featuredContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  featuredItem: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  featuredTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  categoriesContainer: {
    borderBottomWidth: 0,
    borderBottomColor: '#DBDBDB',
    backgroundColor: '#FFFFFF',
  },
  categoriesContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  categoryTab: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryTabActive: {
    borderColor: '#0095F6',
    borderWidth: 2,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  categoryOverlayActive: {
    backgroundColor: '#0095F6',
  },
  categoryTitle: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
    flex: 1,
  },
  feedContainer: {
    flex: 1,
    paddingTop: 0,
  },
  postCard: {
    marginBottom: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  moreButton: {
    padding: 8,
    zIndex: 100,
  },
  postUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postUsername: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  postTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
  },
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    width: width,
  },
  postImage: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#F8F8F8',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
    marginBottom: 16,
    textAlign: 'center',
  },
  createFirstPostButton: {
    backgroundColor: '#0095F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createFirstPostText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postMenuContainer: {
    width: '80%',
    maxWidth: 300,
  },
  postMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  postMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  postMenuItemDanger: {
    borderBottomWidth: 0,
  },
  postMenuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  postMenuItemTextDanger: {
    color: '#EF4444',
    fontWeight: '600',
  },
}); 