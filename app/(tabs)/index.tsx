import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, BookOpen, PartyPopper, Calendar, TrendingUp, Users, Newspaper, Search, User } from 'lucide-react-native';
import { supabase, type Post, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

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
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);

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
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format the data to match our expected structure
      const formattedPosts = data.map(post => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        user: post.profiles as Profile,
        isLiked: false,
        // Mock data for likes and comments since we don't have those tables yet
        likes: Math.floor(Math.random() * 200) + 50,
        comments: Math.floor(Math.random() * 50) + 5,
      }));

      // If no posts from database, use placeholder posts
      setPosts(formattedPosts.length > 0 ? formattedPosts : PLACEHOLDER_POSTS as any);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // On error, show placeholder posts
      setPosts(PLACEHOLDER_POSTS as any);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleLikeToggle = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
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
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Akora</Text>
        <View style={styles.headerIcons}>
          {user?.is_admin && (
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => router.push('/create-post')}
            >
              <Plus size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIcon}>
            <Heart size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Send size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => router.push('/profile/edit')}
          >
            <User size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORY_TABS.map((category) => {
          const IconComponent = category.icon;
          return (
            <TouchableOpacity 
              key={category.id} 
              style={styles.categoryTab}
              onPress={() => category.route && router.push(category.route as any)}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <View style={[styles.categoryOverlay, { backgroundColor: category.color + '95' }]}>
                <IconComponent size={24} color="#FFFFFF" strokeWidth={2.5} />
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
                    <Text style={styles.postUsername}>{post.user.username}</Text>
                    <Text style={styles.postTime}>{getTimeAgo(post.created_at)}</Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <MoreHorizontal size={20} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Post Image */}
              {post.image_url && (
                <Image 
                  source={{ uri: post.image_url }} 
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

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
                  <TouchableOpacity style={styles.actionButton}>
                    <MessageCircle size={26} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Send size={24} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity>
                  <Bookmark size={24} color="#000000" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Likes */}
              <Text style={styles.postLikes}>{post.likes} likes</Text>

              {/* Post Caption */}
              <View style={styles.postCaption}>
                <Text style={styles.postCaptionText}>
                  <Text style={styles.postCaptionUsername}>{post.user.username}</Text>
                  {' '}{post.content}
                </Text>
              </View>

              {/* Post Comments */}
              {post.comments > 0 && (
                <TouchableOpacity>
                  <Text style={styles.viewComments}>
                    View all {post.comments} comments
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    width: 140,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
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
    gap: 8,
  },
  categoryTitle: {
    fontSize: 14,
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
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  postImage: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#F8F8F8',
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
});