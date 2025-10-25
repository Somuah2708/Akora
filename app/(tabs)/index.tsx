import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, Bell, Calendar, MapPin, Users, MessageCircle, Bookmark, MoveHorizontal as MoreHorizontal, ChevronRight, Newspaper, Building2, Chrome as Home, History, BookOpen, School as School, Heart, Plus, X } from 'lucide-react-native';
import { Star } from 'lucide-react-native';
import { supabase, type Post, type Profile, type QuickAction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const FEATURED_STORIES = [
  {
    id: '1',
    title: 'Alumni Impact: Transforming Education in Rural Communities',
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60',
    author: {
      name: 'Dr. Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
      role: 'Education Advocate',
    },
    readTime: '5 min read',
    category: 'Impact Stories',
  },
  {
    id: '2',
    title: 'Innovation Hub Launch: Fostering Next-Gen Tech Leaders',
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&auto=format&fit=crop&q=60',
    author: {
      name: 'Michael Thompson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
      role: 'Tech Director',
    },
    readTime: '4 min read',
    category: 'Campus News',
  },
];

const UPCOMING_EVENTS = [
  {
    id: '1',
    title: 'Annual Alumni Homecoming',
    date: 'March 25, 2024',
    time: '10:00 AM',
    location: 'Main Campus',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60',
    attendees: 450,
  },
  {
    id: '2',
    title: 'Career Fair 2024',
    date: 'April 5, 2024',
    time: '9:00 AM',
    location: 'Innovation Center',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
    attendees: 300,
  },
];

// Icon mapping object
const IconMap: Record<string, any> = {
  Building2,
  Home,
  Calendar,
  History,
  School,
  Newspaper,
  Users,
  BookOpen,
  Heart,
  Star,
  Plus,
  Bell,
  MessageCircle,
  MapPin,
};

interface PostWithUser extends Post {
  user: Profile;
  isLiked?: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loadingQuickActions, setLoadingQuickActions] = useState(true);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchQuickActions = useCallback(async () => {
    try {
      setLoadingQuickActions(true);
      const { data, error } = await supabase
        .from('quick_actions')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setQuickActions(data || []);
    } catch (error) {
      console.error('Error fetching quick actions:', error);
    } finally {
      setLoadingQuickActions(false);
    }
  }, []);

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

      setPosts(formattedPosts);
      setFilteredPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
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
      fetchQuickActions();
    }
  }, [fetchPosts, fetchQuickActions, user]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = posts.filter(post => 
      post.content.toLowerCase().includes(query) ||
      post.user.username.toLowerCase().includes(query) ||
      post.user.full_name.toLowerCase().includes(query)
    );
    
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);

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

  const handleSearchClear = () => {
    setSearchQuery('');
    setIsSearching(false);
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image
            source={{ uri: 'https://pbs.twimg.com/ext_tw_video_thumb/1718554520555249664/pu/img/xfF3Zh9JEM4sc96I.jpg:large' }}
            style={styles.logo}
          />
          <TouchableOpacity style={styles.notificationButton}>
            {user?.is_admin && (
              <TouchableOpacity 
                style={styles.createPostButton}
                onPress={() => router.push('/create-post')}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/notices')}>
              <Bell size={24} color="#000000" />
            </TouchableOpacity>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, isSearching && styles.searchInputFocused]}>
            <Search size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search news, events, and more..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearching(true)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleSearchClear}>
                <X size={20} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Stories</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredContent}
        >
          {FEATURED_STORIES.map((story) => (
            <TouchableOpacity key={story.id} style={styles.featuredCard}>
              <Image source={{ uri: story.image }} style={styles.featuredImage} />
              <View style={styles.featuredOverlay}>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{story.category}</Text>
                </View>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <View style={styles.authorInfo}>
                  <Image source={{ uri: story.author.avatar }} style={styles.authorAvatar} />
                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>{story.author.name}</Text>
                    <Text style={styles.authorRole}>{story.author.role}</Text>
                  </View>
                  <Text style={styles.readTime}>{story.readTime}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {loadingQuickActions ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading quick actions...</Text>
          </View>
        ) : quickActions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No quick actions available</Text>
          </View>
        ) : (
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => {
              // Get the icon component from the mapping
              const IconComponent = IconMap[action.icon_name] || Building2;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionCard, { backgroundColor: action.color }]}
                  onPress={() => action.route && router.push(action.route)}
                >
                  <IconComponent size={24} color="#000000" />
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {UPCOMING_EVENTS.map((event) => (
          <TouchableOpacity key={event.id} style={styles.eventCard}>
            <Image source={{ uri: event.image }} style={styles.eventImage} />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.eventDetails}>
                <View style={styles.detailItem}>
                  <Calendar size={14} color="#666666" />
                  <Text style={styles.detailText}>{event.date}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MapPin size={14} color="#666666" />
                  <Text style={styles.detailText}>{event.location}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Users size={14} color="#666666" />
                  <Text style={styles.detailText}>{event.attendees} attending</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Updates</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>
        
        {isSearching && searchQuery.length > 0 && (
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>
              Search results for "{searchQuery}"
            </Text>
            <Text style={styles.searchResultsCount}>
              {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'} found
            </Text>
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 ? 'No results found' : 'No posts yet'}
            </Text>
            {user?.is_admin && (
              <TouchableOpacity 
                style={styles.createFirstPostButton}
                onPress={() => router.push('/create-post')}
              >
                <Text style={styles.createFirstPostText}>
                  {searchQuery.length > 0 ? 'Create New Post' : 'Create First Post'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : filteredPosts.map((post) => (
          <View key={post.id} style={styles.updateCard}>
            <View style={styles.updateHeader}>
              <Image 
                source={{ 
                  uri: post.user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'
                }} 
                style={styles.userAvatar} 
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{post.user.full_name}</Text>
                <Text style={styles.userRole}>@{post.user.username}</Text>
              </View>
              <TouchableOpacity>
                <MoreHorizontal size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.updateContent}>{post.content}</Text>
            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.updateImage} />
            )}

            <View style={styles.updateActions}>
              <View style={styles.actionStats}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleLikeToggle(post.id)}
                >
                  <Heart 
                    size={20} 
                    color={post.isLiked ? "#FF4444" : "#666666"}
                    fill={post.isLiked ? "#FF4444" : "none"}
                  />
                  <Text style={styles.actionText}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MessageCircle size={20} color="#666666" />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity>
                <Bookmark size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.timeAgo}>{getTimeAgo(post.created_at)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  createPostButton: {
    position: 'absolute',
    right: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInputFocused: {
    backgroundColor: '#EBF0FF',
    borderColor: '#4169E1',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
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
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  featuredContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: CARD_WIDTH,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  categoryTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  storyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  authorRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  readTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  actionCard: {
    width: (width - 64) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: 100,
    height: 100,
  },
  eventInfo: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  eventDetails: {
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  updateCard: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  userRole: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  updateContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  updateImage: {
    width: '100%',
    height: 200,
    marginBottom: 12,
  },
  updateActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 8,
  },
  actionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 16,
  },
  createFirstPostButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createFirstPostText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  searchResultsCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});