import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, Alert, Modal, TextInput, ActivityIndicator, RefreshControl, Image as RNImage, TouchableWithoutFeedback, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { HEADER_COLOR } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Bell, ThumbsUp, MessagesSquare, Share2, Star, MoreHorizontal, Plus, BookOpen, PartyPopper, Calendar, TrendingUp, Users, Newspaper, Search, User, Edit3, Trash2, Play, X, Briefcase, ShoppingBag, MessageCircle, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { supabase, getDisplayName, type Post, type Profile, type HomeFeaturedItem, type HomeCategoryTab, type TrendingArticle } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import YouTubePlayer from '@/components/YouTubePlayer';
import { isYouTubeUrl, getYouTubeThumbnail, extractYouTubeVideoId } from '@/lib/youtube';
import ExpandableText from '@/components/ExpandableText';
import { useVideoSettings } from '@/contexts/VideoSettingsContext';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationBellIcon from '@/components/NotificationBellIcon';
import TrendingSection from '@/components/TrendingSection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { on } from '@/lib/eventBus';
import { getMemoryCacheSync, setMemoryCacheSync, cacheData } from '@/lib/cache';
import { CACHE_KEYS } from '@/lib/queries';
import CachedImage from '@/components/CachedImage';
import { hideSplashScreen } from '@/lib/splashScreen';

// Local hub images for Quick Access tabs
const HUB_IMAGES: Record<string, any> = {
  History: require('@/assets/images/hub/history.png'),
  Centenary: require('@/assets/images/hub/centenary.png'),
  Calendar: require('@/assets/images/hub/calendar.png'),
  News: require('@/assets/images/hub/news.png'),
  Trending: require('@/assets/images/hub/news.png'),
  Community: require('@/assets/images/hub/clubs.png'),
};

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

// Helper function to format time ago
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

// Default featured items (fallback)
const DEFAULT_FEATURED_ITEMS = [
  {
    id: 'featured1',
    title: 'Upcoming Alumni Meet',
    description: 'Join us for the annual gathering',
    image_url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'featured2',
    title: 'Scholarship Program 2024',
    description: 'Applications now open',
    image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'featured3',
    title: 'Career Development Workshop',
    description: 'Enhance your professional skills',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
  },
];

// Default category tabs (fallback)
const DEFAULT_CATEGORY_TABS = [
  { id: '1', title: 'History', icon_name: 'BookOpen', color: '#FF6B6B', image_url: require('@/assets/images/hub/history.png'), route: '/heritage' },
  { id: '2', title: 'Centenary', icon_name: 'PartyPopper', color: '#4ECDC4', image_url: require('@/assets/images/hub/centenary.png'), route: '/centenary' },
  { id: '3', title: 'Calendar', icon_name: 'Calendar', color: '#45B7D1', image_url: require('@/assets/images/hub/calendar.png'), route: '/secretariat/event-calendar' },
  { id: '4', title: 'News', icon_name: 'Newspaper', color: '#F7B731', image_url: require('@/assets/images/hub/news.png'), route: '/news' },
  { id: '5', title: 'Community', icon_name: 'Users', color: '#A55EEA', image_url: require('@/assets/images/hub/clubs.png'), route: '/circles' },
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

interface PostLayout {
  id: string;
  y: number;
  height: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isMuted, setIsMuted } = useVideoSettings();
  const insets = useSafeAreaInsets();
  
  // INSTANT CACHE: Get cached data synchronously (no loading delay)
  const cachedPosts = useMemo(() => {
    if (!user?.id) return null;
    return getMemoryCacheSync<PostWithUser[]>(CACHE_KEYS.homePosts(user.id));
  }, [user?.id]);
  
  const cachedConfig = useMemo(() => {
    return getMemoryCacheSync<{
      featured: HomeFeaturedItem[];
      categoryTabs: HomeCategoryTab[];
      trendingArticles: TrendingArticle[];
    }>(CACHE_KEYS.homeConfig());
  }, []);
  
  // Initialize state with cached data if available (INSTANT display)
  const [posts, setPosts] = useState<PostWithUser[]>(cachedPosts || []);
  const [loading, setLoading] = useState(!cachedPosts); // No loading if cached
  const [refreshing, setRefreshing] = useState(false);
  const [carouselIndices, setCarouselIndices] = useState<{ [key: string]: number }>({});
  const [mediaAspectRatios, setMediaAspectRatios] = useState<{[key: string]: number}>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [featured, setFeatured] = useState<HomeFeaturedItem[]>(cachedConfig?.featured || []);
  const [categoryTabs, setCategoryTabs] = useState<HomeCategoryTab[]>(cachedConfig?.categoryTabs || []);
  const [trendingArticles, setTrendingArticles] = useState<TrendingArticle[]>(cachedConfig?.trendingArticles || []);
  const [failedCategoryImages, setFailedCategoryImages] = useState<Set<string>>(new Set());
  
  // Video viewport detection
  const [visibleVideos, setVisibleVideos] = useState<Set<string>>(new Set());
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [postLayouts, setPostLayouts] = useState<PostLayout[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Lock to prevent double-tap race conditions on likes
  const likingInProgressRef = useRef<Set<string>>(new Set());
  
  // Share modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<PostWithUser | null>(null);

  // Handle media load to get actual dimensions (Instagram approach)
  const handleMediaLoad = useCallback((mediaId: string, width: number, height: number) => {
    const aspectRatio = width / height;
    // Clamp between 0.5 (tall) and 1.91 (wide) like Instagram
    const clampedRatio = Math.max(0.5, Math.min(1.91, aspectRatio));
    
    setMediaAspectRatios(prev => ({
      ...prev,
      [mediaId]: clampedRatio
    }));
  }, []);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [searchFriends, setSearchFriends] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Search functionality
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    posts: PostWithUser[];
    people: Profile[];
    events: any[];
    circles: any[];
    jobs: any[];
    marketplace: any[];
    forum: any[];
  }>({ posts: [], people: [], events: [], circles: [], jobs: [], marketplace: [], forum: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSearchFilter, setSelectedSearchFilter] = useState<'all' | 'posts' | 'people' | 'events' | 'circles' | 'jobs' | 'marketplace' | 'forum'>('all');

  // Notifications (use central NotificationContext for real-time badge)
  const { unreadCount: unreadNotifications, refreshUnreadCount } = useNotifications();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Debounce ref for Android video visibility updates
  const visibilityUpdateTimeoutRef = useRef<any>(null);

  // Calculate which videos are in viewport (50%+ visible)
  const updateVisibleVideos = useCallback((immediate: boolean = false) => {
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

    // Only update if the set has actually changed
    setVisibleVideos((prev) => {
      const prevIds = Array.from(prev).sort().join(',');
      const newIds = Array.from(visible).sort().join(',');
      if (prevIds === newIds) return prev; // No change, return same reference
      return visible;
    });
  }, [scrollY, postLayouts, height]);

  // Update visible videos when scroll position or layouts change
  // IMPORTANT: On Android, stop videos IMMEDIATELY but debounce starting new ones
  useEffect(() => {
    if (postLayouts.length > 0) {
      // Always update immediately - this ensures videos STOP right away
      // The Video component's shouldPlay prop will handle the actual play/pause
      updateVisibleVideos();
    }
    
    return () => {
      if (visibilityUpdateTimeoutRef.current) {
        clearTimeout(visibilityUpdateTimeoutRef.current);
      }
    };
  }, [scrollY, postLayouts.length]); // Only depend on scrollY and layouts count, not the callback

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      console.log('Fetched posts:', data?.length || 0);
      
      // Get user's liked and bookmarked posts if logged in
      let userLikes: Set<string> = new Set();
      let userBookmarks: Set<string> = new Set();
      // Map to store accurate like counts from post_likes table
      const likesCountMap = new Map<string, number>();
      // Map to store accurate comment counts from post_comments table
      const commentsCountMap = new Map<string, number>();
      
      if (data && data.length > 0) {
        const postIds = data.map(p => p.id);
        
        // Fetch accurate like counts directly from post_likes table
        // This is more reliable than the likes_count column which depends on triggers
        const { data: allLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds);
        
        if (allLikes) {
          // Count likes per post
          allLikes.forEach(like => {
            const currentCount = likesCountMap.get(like.post_id) || 0;
            likesCountMap.set(like.post_id, currentCount + 1);
          });
          console.log('📊 Accurate like counts fetched for', likesCountMap.size, 'posts');
        }
        
        // Fetch accurate comment counts directly from post_comments table
        // This is more reliable than the comments_count column which depends on triggers
        const { data: allComments } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds);
        
        if (allComments) {
          // Count comments per post
          allComments.forEach(comment => {
            const currentCount = commentsCountMap.get(comment.post_id) || 0;
            commentsCountMap.set(comment.post_id, currentCount + 1);
          });
          console.log('📊 Accurate comment counts fetched for', commentsCountMap.size, 'posts');
        }
        
        if (user) {
          const [likesRes, bmsRes] = await Promise.all([
            supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          ]);
          if (likesRes.data) userLikes = new Set(likesRes.data.map(l => l.post_id));
          if (bmsRes.data) userBookmarks = new Set(bmsRes.data.map(b => b.post_id));
        }
      } else if (user) {
        const [likesRes, bmsRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id),
          supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id),
        ]);
        if (likesRes.data) userLikes = new Set(likesRes.data.map(l => l.post_id));
        if (bmsRes.data) userBookmarks = new Set(bmsRes.data.map(b => b.post_id));
      }
      
      // Log media fields for debugging
      data?.forEach((post, index) => {
        console.log(`Post ${index + 1}:`, {
          id: post.id,
          image_url: post.image_url,
          image_urls: post.image_urls,
          video_url: (post as any).video_url,
          video_urls: (post as any).video_urls,
          youtube_url: (post as any).youtube_url,
          youtube_urls: (post as any).youtube_urls,
          has_single_image: !!post.image_url,
          has_multiple_images: !!post.image_urls && post.image_urls.length > 0,
          has_single_video: !!(post as any).video_url,
          has_multiple_videos: !!(post as any).video_urls && (post as any).video_urls.length > 0,
          has_single_youtube: !!(post as any).youtube_url,
          has_multiple_youtube: !!(post as any).youtube_urls && (post as any).youtube_urls.length > 0,
        });
      });

            // Format the data to match our expected structure
      const formattedPosts = (data || []).map(post => {
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
          role: (rawProfile as any)?.role,
        };

        return {
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          image_url: post.image_url,
          image_urls: post.image_urls,
          video_url: (post as any).video_url,
          video_urls: (post as any).video_urls,
          youtube_url: (post as any).youtube_url,
          youtube_urls: (post as any).youtube_urls,
          created_at: post.created_at,
          user: safeProfile,
          // Use accurate count from post_likes table, fallback to likes_count column
          likes: likesCountMap.get(post.id) ?? post.likes_count ?? 0,
          isLiked: userLikes.has(post.id),
          isBookmarked: userBookmarks.has(post.id),
          // Use accurate count from post_comments table, fallback to comments_count column
          comments_count: commentsCountMap.get(post.id) ?? post.comments_count ?? 0,
        } as PostWithUser;
      });

      // Only show posts authored by admins on Home
      const adminOnlyPosts = formattedPosts.filter(p => (p.user?.is_admin === true) || (p.user?.role === 'admin'));

      const finalPosts = adminOnlyPosts.length > 0 ? adminOnlyPosts : [] as any;
      setPosts(finalPosts);
      
      // Cache posts for instant loading next time
      if (user?.id && finalPosts.length > 0) {
        cacheData(CACHE_KEYS.homePosts(user.id), finalPosts, { expiryMinutes: 10 });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      // On error, show placeholder posts (only if no cached data)
      if (posts.length === 0) {
        setPosts(PLACEHOLDER_POSTS as any);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded) {
      hideSplashScreen();
    }
  }, [fontsLoaded]);

  // Ensure video playback works in iOS silent mode as well
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
        console.warn('Audio mode setup failed', e);
      }
    })();
  }, []);

  // Load home configuration (trending articles, categories, etc.)
  const loadHomeConfig = useCallback(async () => {
    try {
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
          .order('created_at', { ascending: false }) // Most recent first!
          .limit(10),
      ]);

      const featuredData = (featRes.data as HomeFeaturedItem[]) || [];
      const categoryTabsData = (tabsRes.data as HomeCategoryTab[]) || [];
      const trendingData = (trendingRes.data as TrendingArticle[]) || [];
      
      setFeatured(featuredData);
      setCategoryTabs(categoryTabsData);
      setTrendingArticles(trendingData);
      
      // Cache config for instant loading next time
      cacheData(CACHE_KEYS.homeConfig(), {
        featured: featuredData,
        categoryTabs: categoryTabsData,
        trendingArticles: trendingData,
      }, { expiryMinutes: 15 });
      
      console.log('✅ Trending articles refreshed:', trendingData.length);
    } catch (e) {
      console.warn('Failed to load home config, using defaults', e);
      // Only reset if no cached data
      if (featured.length === 0) setFeatured([]);
      if (categoryTabs.length === 0) setCategoryTabs([]);
      if (trendingArticles.length === 0) setTrendingArticles([]);
    }
  }, [featured.length, categoryTabs.length, trendingArticles.length]);

  // Search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ posts: [], people: [], events: [], circles: [], jobs: [], marketplace: [], forum: [] });
      return;
    }

    setSearchLoading(true);
    try {
      const searchPromises = [];

      // Search posts
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'posts') {
        searchPromises.push(
          supabase
            .from('posts')
            .select(`*, user:profiles(*)`)
            .ilike('content', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(10)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      // Search people
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'people') {
        searchPromises.push(
          supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,first_name.ilike.%${query}%,surname.ilike.%${query}%,bio.ilike.%${query}%,job_title.ilike.%${query}%,company_name.ilike.%${query}%`)
            .limit(15)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      // Search events
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'events') {
        searchPromises.push(
          supabase
            .from('secretariat_events')
            .select('*')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date', { ascending: true })
            .limit(10)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      // Search circles
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'circles') {
        searchPromises.push(
          supabase
            .from('circles')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
            .limit(10)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      // Search jobs
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'jobs') {
        searchPromises.push(
          supabase
            .from('job_listings')
            .select('*, user:profiles(id, full_name, first_name, surname, avatar_url)')
            .eq('is_approved', true)
            .or(`title.ilike.%${query}%,company_name.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(10)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      // Search marketplace
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'marketplace') {
        searchPromises.push(
          supabase
            .from('product_services')
            .select('*, user:profiles(id, full_name, first_name, surname, avatar_url)')
            .eq('is_approved', true)
            .or(`title.ilike.%${query}%,description.ilike.%${query}%,category_name.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(10)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      // Search forum discussions
      if (selectedSearchFilter === 'all' || selectedSearchFilter === 'forum') {
        searchPromises.push(
          supabase
            .from('forum_discussions')
            .select('*, author:profiles(id, full_name, first_name, surname, avatar_url)')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(10)
        );
      } else {
        searchPromises.push(Promise.resolve({ data: [] }));
      }

      const [postsRes, peopleRes, eventsRes, circlesRes, jobsRes, marketplaceRes, forumRes] = await Promise.all(searchPromises);

      setSearchResults({
        posts: (postsRes.data as any[]) || [],
        people: (peopleRes.data as Profile[]) || [],
        events: (eventsRes.data as any[]) || [],
        circles: (circlesRes.data as any[]) || [],
        jobs: (jobsRes.data as any[]) || [],
        marketplace: (marketplaceRes.data as any[]) || [],
        forum: (forumRes.data as any[]) || [],
      });
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to perform search');
    } finally {
      setSearchLoading(false);
    }
  }, [selectedSearchFilter]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.length >= 1) {
        performSearch(searchQuery);
      } else {
        setSearchResults({ posts: [], people: [], events: [], circles: [], jobs: [], marketplace: [], forum: [] });
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, performSearch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Clear trending articles first to force re-render
    setTrendingArticles([]);
    await Promise.all([
      fetchPosts(),
      loadHomeConfig(), // Also refresh trending articles!
    ]);
    setRefreshing(false);
  }, [fetchPosts, loadHomeConfig]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [fetchPosts, user]);

  useEffect(() => {
    loadHomeConfig();
  }, [loadHomeConfig]);

  // Stop all videos when screen loses focus (e.g., navigating to another tab)
  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      setIsScreenFocused(true);
      
      // Reset quick access tab highlight when returning to home
      setActiveCategoryId(null);

      // Refresh badge count when screen becomes focused
      refreshUnreadCount().catch((e) => console.error('Error refreshing unread count on focus', e));

      return () => {
        // Screen is unfocused - stop all videos
        setIsScreenFocused(false);
        setVisibleVideos(new Set());
      };
    }, [refreshUnreadCount])
  );

  // Instagram-style: tap Home tab while on Home to scroll to top and refresh
  useEffect(() => {
    const unsubscribe = on('tab:homeRefresh', () => {
      // Scroll to top
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      // Trigger refresh
      onRefresh();
    });
    return unsubscribe;
  }, [onRefresh]);

  // Real-time badge updates are handled centrally by NotificationProvider; no local listener needed here

  // Real-time subscriptions for likes and comments on Home
  useEffect(() => {
    if (!user?.id) return;

    console.log('📡 Setting up real-time subscriptions for Home feed');

    // Subscribe to ALL post likes (not just current feed)
    const likesChannel = supabase
      .channel(`home_likes_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
        },
        async (payload) => {
          console.log('🔥 Real-time like change detected on Home:', payload.eventType);
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
            
            console.log(`✅ Updated post ${postId}: ${likesCount} likes, user liked: ${!!userLike}`);
            
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId
                  ? { ...post, likes: likesCount, isLiked: !!userLike }
                  : post
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
      .channel(`home_comments_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
        },
        async (payload) => {
          console.log('🔥 Real-time comment change detected on Home:', payload.eventType);
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (postId) {
            // Get accurate count by counting all comments for this post
            const { count } = await supabase
              .from('post_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postId);
            
            const commentsCount = count || 0;
            
            console.log(`✅ Updated post ${postId}: ${commentsCount} comments`);
            
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId ? { ...post, comments_count: commentsCount } : post
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Comments subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from Home real-time channels');
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [user?.id]); // Only recreate when user changes, not when posts change

  // Refresh posts and trending when screen comes into focus (e.g., after creating a post or article)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchPosts();
      }
      loadHomeConfig(); // Also refresh trending articles
    }, [user, fetchPosts, loadHomeConfig])
  );

  const handleLikeToggle = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    // Prevent double-tap race condition (especially on Android)
    if (likingInProgressRef.current.has(postId)) {
      console.log('⏳ Like already in progress for post:', postId);
      return;
    }
    likingInProgressRef.current.add(postId);

    const post = posts.find(p => p.id === postId);
    if (!post) {
      likingInProgressRef.current.delete(postId);
      return;
    }

    const wasLiked = post.isLiked;
    const originalLikes = post.likes ?? 0;

    console.log('🎯 Like toggle:', { postId, wasLiked, originalLikes, userId: user.id });

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
        console.log('❌ Unliking post...');
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
        console.log('✅ Post unliked successfully');
      } else {
        // Like: First check if already liked to avoid duplicate issues
        console.log('❤️ Liking post...');
        
        // Check if like already exists (handles race condition from multiple devices)
        const { data: existingLike } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingLike) {
          // Already liked - skip insert, just fetch accurate count
          console.log('⚠️ Like already exists, skipping insert');
        } else {
          // Insert new like
          const { error } = await supabase
            .from('post_likes')
            .insert({
              post_id: postId,
              user_id: user.id,
            });

          if (error) {
            // If we get a unique constraint error, it means another device just liked
            // This is fine - we'll fetch the accurate count below
            if (!error.code?.includes('23505')) {
              throw error;
            }
            console.log('⚠️ Duplicate like detected (race condition), continuing...');
          } else {
            console.log('✅ Post liked successfully');
          }
        }
      }

      // Fetch accurate count after toggle
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      
      const actualLikesCount = count || 0;
      
      // Check current user's like status
      const { data: userLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('📊 Final state:', { actualLikesCount, userLiked: !!userLike });
      
      // Update with accurate count
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: !!userLike, likes: actualLikesCount }
            : p
        )
      );
    } catch (error: any) {
      console.error('❌ Error toggling like:', error);
      
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
    } finally {
      // Always release the lock
      likingInProgressRef.current.delete(postId);
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
        console.log('✅ Post unsaved successfully');
      } else {
        const { error } = await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
        console.log('✅ Post saved successfully - visible in Profile → Saved tab');
      }
    } catch (e) {
      console.error('Error toggling bookmark:', e);
      // Revert
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isBookmarked: wasSaved } as any : p));
      Alert.alert('Error', 'Failed to update saved');
    }
  };

  const handleSharePress = async (post: PostWithUser) => {
    if (!user?.id) return;
    setSelectedPostForShare(post);
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
    if (!user?.id || !selectedPostForShare?.id) return;
    
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
          post_id: selectedPostForShare.id, // Reference to the shared post
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
          post_id: selectedPostForShare.id, // Reference to the shared post
        });
      
      if (dmError) {
        console.error('Error sending to direct_messages:', dmError);
        // Don't throw - the main message was sent successfully
      }
      
      // Track share
      const { error: shareError } = await supabase
        .from('post_shares')
        .insert({
          post_id: selectedPostForShare.id,
          user_id: user.id,
        });
      
      if (shareError) console.error('Error tracking share:', shareError);
      
      console.log('✅ Post shared successfully to both chat systems');
      
      // Show success feedback
      const friend = friendsList.find(f => f.id === friendId);
      alert(`Sent to ${getDisplayName(friend)}!`);
      
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Failed to send post. Please try again.');
    }
  };

  const handleEditPost = (postId: string) => {
    console.log('Edit post clicked:', postId);
    debouncedRouter.push(`/edit-post/${postId}`);
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

  const handleDeleteTrendingArticle = async (articleId: string) => {
    Alert.alert(
      'Delete Article',
      'Are you sure you want to delete this trending article?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trending_articles')
                .delete()
                .eq('id', articleId);

              if (error) throw error;

              // Remove from local state
              setTrendingArticles(prev => prev.filter(article => article.id !== articleId));
              Alert.alert('Success', 'Article deleted successfully');
            } catch (error: any) {
              console.error('Error deleting trending article:', error);
              Alert.alert('Error', 'Failed to delete article');
            }
          },
        },
      ]
    );
  };

  const showTrendingMenu = (articleId: string) => {
    Alert.alert(
      'Article Actions',
      'Choose an action',
      [
        {
          text: 'Edit Article',
          onPress: () => debouncedRouter.push(`/trending-edit/${articleId}`),
        },
        {
          text: 'Delete Article',
          style: 'destructive',
          onPress: () => handleDeleteTrendingArticle(articleId),
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

  return (
    <View style={styles.container}>
      {/* Full Screen Refresh Overlay */}
      {refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      )}

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
                  <ActivityIndicator size="large" color="#000000" />
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
                      getDisplayName(friend).toLowerCase().includes(searchFriends.toLowerCase()) ||
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
                            <Image source={{ uri: friend.avatar_url }} style={styles.shareFriendAvatar} />
                          ) : (
                            <View style={[styles.shareFriendAvatar, styles.shareFriendAvatarPlaceholder]}>
                              <Text style={styles.shareFriendAvatarText}>
                                {getDisplayName(friend)[0]?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.shareFriendInfo}>
                            <Text style={styles.shareFriendName}>{getDisplayName(friend)}</Text>
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

      {/* Search Modal */}
      <Modal
        visible={searchVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSearchVisible(false);
          setSearchQuery('');
          setSearchResults({ posts: [], people: [], articles: [] });
        }}
      >
        <View style={styles.searchModalOverlay}>
          <View style={styles.searchModalContent}>
            {/* Header with search input */}
            <View style={styles.searchModalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setSearchVisible(false);
                  setSearchQuery('');
                  setSearchResults({ posts: [], people: [], articles: [] });
                }}
                style={styles.searchBackButton}
              >
                <X size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={styles.searchInputContainer}>
                <Search size={20} color="#0F172A" strokeWidth={2} />
                <TextInput
                  style={styles.searchModalInput}
                  placeholder="Search posts, people, and more..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#6B7280"
                  autoFocus
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color="#0F172A" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.searchFiltersContainer}
              contentContainerStyle={styles.searchFiltersContent}
            >
              {[
                { id: 'all', label: 'All', icon: Search },
                { id: 'people', label: 'People', icon: User },
                { id: 'posts', label: 'Posts', icon: MessagesSquare },
                { id: 'events', label: 'Events', icon: Calendar },
                { id: 'circles', label: 'Circles', icon: Users },
                { id: 'jobs', label: 'Jobs', icon: Briefcase },
                { id: 'marketplace', label: 'Market', icon: ShoppingBag },
                { id: 'forum', label: 'Forum', icon: MessageCircle },
              ].map((filter) => {
                const IconComponent = filter.icon;
                const isActive = selectedSearchFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.searchFilterChip,
                      isActive && styles.searchFilterChipActive,
                    ]}
                    onPress={() => setSelectedSearchFilter(filter.id as any)}
                    activeOpacity={0.7}
                  >
                    <IconComponent size={14} color={isActive ? '#0F172A' : '#6B7280'} strokeWidth={2} />
                    <Text
                      style={[
                        styles.searchFilterChipText,
                        isActive && styles.searchFilterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Results */}
            <ScrollView style={styles.searchResultsContainer} showsVerticalScrollIndicator={false}>
              {searchLoading ? (
                <View style={styles.searchLoadingState}>
                  <ActivityIndicator size="large" color="#ffc857" />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              ) : searchQuery.length === 0 ? (
                <View style={styles.searchEmptyState}>
                  {/* Quick Access Categories */}
                  <View style={styles.searchQuickAccessSection}>
                    <Text style={styles.searchQuickAccessTitle}>Explore</Text>
                    <View style={styles.searchQuickAccessGrid}>
                      {[
                        { id: 'people', label: 'Alumni', icon: User, color: '#3B82F6', route: '/connections' },
                        { id: 'events', label: 'Events', icon: Calendar, color: '#10B981', route: '/secretariat/event-calendar' },
                        { id: 'circles', label: 'Circles', icon: Users, color: '#8B5CF6', route: '/circles' },
                        { id: 'jobs', label: 'Jobs', icon: Briefcase, color: '#F59E0B', route: '/professional' },
                        { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, color: '#EC4899', route: '/category' },
                        { id: 'forum', label: 'Discussions', icon: MessageCircle, color: '#06B6D4', route: '/forum' },
                      ].map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.searchQuickAccessItem}
                            onPress={() => {
                              setSearchVisible(false);
                              debouncedRouter.push(item.route as any);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.searchQuickAccessIcon, { backgroundColor: item.color + '15' }]}>
                              <IconComponent size={24} color={item.color} strokeWidth={2} />
                            </View>
                            <Text style={styles.searchQuickAccessLabel}>{item.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.searchHintContainer}>
                    <Search size={48} color="#D1D5DB" strokeWidth={1.5} />
                    <Text style={styles.searchHintText}>
                      Search for people, events, jobs, circles, and more
                    </Text>
                  </View>
                </View>
              ) : (searchResults.posts.length === 0 && searchResults.people.length === 0 && searchResults.events.length === 0 && searchResults.circles.length === 0 && searchResults.jobs.length === 0 && searchResults.marketplace.length === 0 && searchResults.forum.length === 0) ? (
                <View style={styles.searchEmptyState}>
                  <Search size={64} color="#D1D5DB" strokeWidth={1.5} />
                  <Text style={styles.searchEmptyTitle}>No results found</Text>
                  <Text style={styles.searchEmptyText}>
                    Try different keywords or check your spelling
                  </Text>
                </View>
              ) : (
                <>
                  {/* People Results */}
                  {searchResults.people.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'people') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <User size={18} color="#0F172A" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>People ({searchResults.people.length})</Text>
                      </View>
                      {searchResults.people.slice(0, selectedSearchFilter === 'people' ? 20 : 5).map((person) => (
                        <TouchableOpacity
                          key={person.id}
                          style={styles.searchPersonItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/user-profile/${person.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          {person.avatar_url ? (
                            <Image source={{ uri: person.avatar_url }} style={styles.searchPersonAvatar} />
                          ) : (
                            <View style={[styles.searchPersonAvatar, styles.searchPersonAvatarPlaceholder]}>
                              <User size={20} color="#9CA3AF" strokeWidth={2} />
                            </View>
                          )}
                          <View style={styles.searchPersonInfo}>
                            <Text style={styles.searchPersonName} numberOfLines={1}>
                              {getDisplayName(person)}
                            </Text>
                            {(person.job_title || person.company_name) ? (
                              <Text style={styles.searchPersonBio} numberOfLines={1}>
                                {person.job_title}{person.job_title && person.company_name ? ' at ' : ''}{person.company_name}
                              </Text>
                            ) : person.bio ? (
                              <Text style={styles.searchPersonBio} numberOfLines={1}>
                                {person.bio}
                              </Text>
                            ) : person.year_group ? (
                              <Text style={styles.searchPersonBio} numberOfLines={1}>
                                Class of {person.year_group}
                              </Text>
                            ) : null}
                          </View>
                          <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Events Results */}
                  {searchResults.events.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'events') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <Calendar size={18} color="#10B981" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>Events ({searchResults.events.length})</Text>
                      </View>
                      {searchResults.events.slice(0, selectedSearchFilter === 'events' ? 20 : 5).map((event: any) => (
                        <TouchableOpacity
                          key={event.id}
                          style={styles.searchEventItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/events/${event.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchEventDateBadge}>
                            <Text style={styles.searchEventDateDay}>
                              {new Date(event.event_date).getDate()}
                            </Text>
                            <Text style={styles.searchEventDateMonth}>
                              {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                            </Text>
                          </View>
                          <View style={styles.searchEventInfo}>
                            <Text style={styles.searchEventTitle} numberOfLines={1}>{event.title}</Text>
                            {event.location && (
                              <View style={styles.searchEventMeta}>
                                <MapPin size={12} color="#6B7280" strokeWidth={2} />
                                <Text style={styles.searchEventLocation} numberOfLines={1}>{event.location}</Text>
                              </View>
                            )}
                          </View>
                          <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Circles Results */}
                  {searchResults.circles.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'circles') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <Users size={18} color="#8B5CF6" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>Circles ({searchResults.circles.length})</Text>
                      </View>
                      {searchResults.circles.slice(0, selectedSearchFilter === 'circles' ? 20 : 5).map((circle: any) => (
                        <TouchableOpacity
                          key={circle.id}
                          style={styles.searchCircleItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/circles/${circle.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          {circle.image_url ? (
                            <Image source={{ uri: circle.image_url }} style={styles.searchCircleImage} />
                          ) : (
                            <View style={[styles.searchCircleImage, styles.searchCircleImagePlaceholder]}>
                              <Users size={20} color="#8B5CF6" strokeWidth={2} />
                            </View>
                          )}
                          <View style={styles.searchCircleInfo}>
                            <Text style={styles.searchCircleName} numberOfLines={1}>{circle.name}</Text>
                            <Text style={styles.searchCircleCategory} numberOfLines={1}>{circle.category}</Text>
                          </View>
                          <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Jobs Results */}
                  {searchResults.jobs.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'jobs') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <Briefcase size={18} color="#F59E0B" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>Jobs ({searchResults.jobs.length})</Text>
                      </View>
                      {searchResults.jobs.slice(0, selectedSearchFilter === 'jobs' ? 20 : 5).map((job: any) => (
                        <TouchableOpacity
                          key={job.id}
                          style={styles.searchJobItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/job-detail/${job.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchJobIconContainer}>
                            <Briefcase size={20} color="#F59E0B" strokeWidth={2} />
                          </View>
                          <View style={styles.searchJobInfo}>
                            <Text style={styles.searchJobTitle} numberOfLines={1}>{job.title}</Text>
                            <Text style={styles.searchJobCompany} numberOfLines={1}>
                              {job.company_name}{job.location ? ` • ${job.location}` : ''}
                            </Text>
                          </View>
                          <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Marketplace Results */}
                  {searchResults.marketplace.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'marketplace') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <ShoppingBag size={18} color="#EC4899" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>Marketplace ({searchResults.marketplace.length})</Text>
                      </View>
                      {searchResults.marketplace.slice(0, selectedSearchFilter === 'marketplace' ? 20 : 5).map((product: any) => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.searchMarketItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/listing/${product.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          {product.image_url || product.image_urls?.[0] ? (
                            <Image source={{ uri: product.image_url || product.image_urls?.[0] }} style={styles.searchMarketImage} />
                          ) : (
                            <View style={[styles.searchMarketImage, styles.searchMarketImagePlaceholder]}>
                              <ShoppingBag size={20} color="#EC4899" strokeWidth={2} />
                            </View>
                          )}
                          <View style={styles.searchMarketInfo}>
                            <Text style={styles.searchMarketTitle} numberOfLines={1}>{product.title}</Text>
                            <Text style={styles.searchMarketPrice}>
                              {product.price ? `GH₵ ${product.price.toLocaleString()}` : 'Contact for price'}
                            </Text>
                          </View>
                          <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Forum Results */}
                  {searchResults.forum.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'forum') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <MessageCircle size={18} color="#06B6D4" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>Discussions ({searchResults.forum.length})</Text>
                      </View>
                      {searchResults.forum.slice(0, selectedSearchFilter === 'forum' ? 20 : 5).map((discussion: any) => (
                        <TouchableOpacity
                          key={discussion.id}
                          style={styles.searchForumItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/forum/${discussion.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchForumIconContainer}>
                            <MessageCircle size={20} color="#06B6D4" strokeWidth={2} />
                          </View>
                          <View style={styles.searchForumInfo}>
                            <Text style={styles.searchForumTitle} numberOfLines={2}>{discussion.title}</Text>
                            <Text style={styles.searchForumCategory} numberOfLines={1}>{discussion.category}</Text>
                          </View>
                          <ChevronRight size={20} color="#D1D5DB" strokeWidth={2} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (selectedSearchFilter === 'all' || selectedSearchFilter === 'posts') && (
                    <View style={styles.searchSection}>
                      <View style={styles.searchSectionHeader}>
                        <MessagesSquare size={18} color="#0F172A" strokeWidth={2} />
                        <Text style={styles.searchSectionTitle}>Posts ({searchResults.posts.length})</Text>
                      </View>
                      {searchResults.posts.slice(0, selectedSearchFilter === 'posts' ? 20 : 5).map((post) => (
                        <TouchableOpacity
                          key={post.id}
                          style={styles.searchPostItem}
                          onPress={() => {
                            setSearchVisible(false);
                            setSearchQuery('');
                            debouncedRouter.push(`/post-comments/${post.id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchPostLeft}>
                            <View style={styles.searchPostHeader}>
                              {post.user?.avatar_url ? (
                                <Image source={{ uri: post.user.avatar_url }} style={styles.searchPostUserAvatar} />
                              ) : (
                                <View style={[styles.searchPostUserAvatar, styles.searchPostUserAvatarPlaceholder]}>
                                  <User size={12} color="#9CA3AF" strokeWidth={2} />
                                </View>
                              )}
                              <Text style={styles.searchPostUserName} numberOfLines={1}>
                                {getDisplayName(post.user)}
                              </Text>
                            </View>
                            <Text style={styles.searchPostContent} numberOfLines={2}>
                              {post.content}
                            </Text>
                          </View>
                          {(post.image_url || post.image_urls?.[0]) && (
                            <Image
                              source={{ uri: post.image_url || post.image_urls?.[0] }}
                              style={styles.searchPostThumbnail}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
        stickyHeaderIndices={[]}
        // Android performance optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        overScrollMode="never"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#0EA5E9"
            colors={['#0EA5E9']}
          />
        }
        onScroll={(event) => {
          setScrollY(event.nativeEvent.contentOffset.y);
        }}
        // Reduce scroll events on Android for better performance
        scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
      >
        {/* FIX: Dark background filler for pull-to-refresh gap */}
        <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: HEADER_COLOR }} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.logoText}>Akora</Text>
        <View style={styles.headerIcons}>
          <NotificationBellIcon />
        </View>
      </View>

      {/* Trending Section - New unified trending system */}
      <TrendingSection 
        isAdmin={profile?.is_admin || profile?.role === 'admin'}
        onAddPress={() => debouncedRouter.push('/admin/manage-trending')}
        onLongPress={(itemId) => {
          if (profile?.is_admin || profile?.role === 'admin') {
            Alert.alert(
              'Manage Item',
              'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Manage Trending', 
                  onPress: () => debouncedRouter.push('/admin/manage-trending')
                },
              ]
            );
          }
        }}
      />

      {/* Category Tabs */}
      <View style={styles.categoriesSection}>
        <View style={styles.categoriesSectionHeader}>
          <Text style={styles.categoriesSectionTitle}>Quick Access</Text>
          {(profile?.role === 'admin' || profile?.is_admin) && (
            <TouchableOpacity 
              style={styles.categoryAdminButton}
              onPress={() => debouncedRouter.push('/categories-manage')}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color="#0EA5E9" strokeWidth={2.5} />
              <Text style={styles.categoryAdminButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
        {(() => { 
          const ICON_MAP: any = { BookOpen, PartyPopper, Calendar, TrendingUp, Users, Newspaper };
          // Ensure routes are correct for OAA alumni app
          const tabsToUse = (categoryTabs.length > 0 ? categoryTabs : DEFAULT_CATEGORY_TABS)
            .map((t: any) => {
              // Get the local image for this tab title
              const localImage = HUB_IMAGES[t?.title];
              
              // Build the updated tab object
              let updated = { ...t };
              
              // Always use local images if available
              if (localImage) {
                updated.image_url = localImage;
              }
              
              // Fix Centenary route
              if (t?.title === 'Centenary' && t?.route === '/events') {
                updated.route = '/centenary';
              }
              // Fix Calendar route to show OAA events instead of academic calendar
              if (t?.title === 'Calendar' && t?.route === '/calendar') {
                updated.route = '/secretariat/event-calendar';
              }
              // Rename Trending to News
              if (t?.title === 'Trending') {
                updated.title = 'News';
                updated.icon_name = 'Newspaper';
              }
              
              return updated;
            });
          return tabsToUse.map((category: any) => {
          const IconComponent = ICON_MAP[(category as any).icon_name] || Users;
          const isActiveCategory = activeCategoryId === category.id;
          // Get the image source - use local image from HUB_IMAGES or the category's image_url
          const imageSource = (category as any).image_url;
          
          return (
            <TouchableOpacity 
              key={category.id} 
              style={[styles.categoryTab, isActiveCategory && styles.categoryTabActive]}
              activeOpacity={0.85}
              onPress={() => {
                setActiveCategoryId(category.id);
                if ((category as any).route) {
                  debouncedRouter.push(((category).route) as any);
                }
              }}
            >
              {imageSource ? (
                <Image 
                  source={
                    typeof imageSource === 'string' 
                      ? { uri: imageSource }
                      : imageSource
                  } 
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.categoryImage, { backgroundColor: '#0F172A' }]} />
              )}
              <View
                style={[
                  styles.categoryOverlay,
                  isActiveCategory && styles.categoryOverlayActive,
                ]}
              >
                <IconComponent size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
            </TouchableOpacity>
          );
        }); })()}
      </ScrollView>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={() => setSearchVisible(true)}
        activeOpacity={0.7}
      >
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
          {(profile?.role === 'admin' || profile?.is_admin) && (
            <TouchableOpacity 
              style={styles.createFirstPostButton}
              onPress={() => debouncedRouter.push('/home-create-post')}
            >
              <Text style={styles.createFirstPostText}>Create First Post</Text>
            </TouchableOpacity>
            )}
          </View>
        ) : (
          posts.map((post) => {
            // Debug log for each post
            console.log('🔍 [HOME] Rendering post:', post.id, 'content:', post.content?.substring(0, 20));
            console.log('  - has media_items?', !!(post as any).media_items);
            console.log('  - media_items length:', (post as any).media_items?.length);
            if ((post as any).media_items) {
              console.log('  - media_items:', JSON.stringify((post as any).media_items, null, 2));
            }
            return (
              <View 
                key={post.id} 
                style={styles.postCard}
                onLayout={(event) => {
                  const { y, height } = event.nativeEvent.layout;
                  setPostLayouts((prev) => {
                    const filtered = prev.filter((p) => p.id !== post.id);
                    return [...filtered, { id: post.id, y, height }];
                  });
                }}
              >
                {/* Post Header */}
                <View style={styles.postHeader}>
                <TouchableOpacity 
                  style={styles.postHeaderLeft}
                  onPress={() => debouncedRouter.push(`/user-profile/${post.user_id}`)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ 
                      uri: post.user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'
                    }} 
                    style={styles.postUserAvatar} 
                  />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.postUsername}>{getDisplayName(post.user)}</Text>
                      {(post.user.is_admin || post.user.role === 'admin') && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedCheck}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postTime}>{getTimeAgo(post.created_at)}</Text>
                  </View>
                </TouchableOpacity>
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
                  <MoreHorizontal size={24} color="#0F172A" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Media (Images/Videos/YouTube Carousel) */}
              {(post as any).media_items && (post as any).media_items.length > 0 ? (
                (() => {
                  console.log(`📺 [HOME] Post ${post.id} has media_items:`, (post as any).media_items.length, 'items');
                  (post as any).media_items.forEach((item: any, idx: number) => {
                    console.log(`  📦 Item ${idx}: ${item.type} - ${item.url?.substring(0, 60)}...`);
                  });
                  return (
                    <View style={styles.carouselContainer}>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        removeClippedSubviews={Platform.OS === 'android'}
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
                            [post.id]: currentIndex,
                          });
                        }}
                        scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
                      >
                        {(post as any).media_items.map((mediaItem: any, index: number) => {
                          console.log(`🎬 Rendering media item ${index} for post ${post.id}:`, {
                            type: mediaItem.type,
                            url: mediaItem.url?.substring(0, 80),
                            hasUrl: !!mediaItem.url
                          });
                      return (
                        <View key={index} style={styles.mediaPage}>
                          {mediaItem.type === 'video' ? (
                            <TouchableWithoutFeedback onPress={() => {}}>
                              <View style={{ flex: 1 }}>
                                <Video
                                  source={{ uri: mediaItem.url }}
                                  style={[
                                    styles.postImage,
                                    { aspectRatio: mediaAspectRatios[`post_${post.id}_media_${index}`] || 1 }
                                  ]}
                                  useNativeControls
                                  resizeMode={ResizeMode.COVER}
                                  isLooping={true}
                                  shouldPlay={
                                    isScreenFocused && 
                                    visibleVideos.has(post.id) && 
                                    (carouselIndices[post.id] ?? 0) === index
                                  }
                                  volume={
                                    // IMPORTANT: Set volume to 0 immediately when not visible (fixes Android audio delay)
                                    !visibleVideos.has(post.id) ? 0.0 :
                                    isMuted || (carouselIndices[post.id] ?? 0) !== index 
                                      ? 0.0 
                                      : 1.0
                                  }
                                  // Android performance: reduce update frequency
                                  progressUpdateIntervalMillis={Platform.OS === 'android' ? 500 : 250}
                                  onReadyForDisplay={(data) => {
                                    if (data.naturalSize) {
                                      handleMediaLoad(
                                        `post_${post.id}_media_${index}`,
                                        data.naturalSize.width,
                                        data.naturalSize.height
                                      );
                                    }
                                  }}
                                  onError={(err) => {
                                    console.error('❌ Video error:', err);
                                    console.warn('Video play error (mixed media)', err);
                                  }}
                                />
                              </View>
                            </TouchableWithoutFeedback>
                          ) : (
                            <TouchableOpacity 
                              activeOpacity={0.95}
                              onPress={() => debouncedRouter.push(`/post/${post.id}`)}
                            >
                              <Image
                                source={{ uri: mediaItem.url }}
                                style={[
                                  styles.postImage,
                                  { aspectRatio: mediaAspectRatios[`post_${post.id}_media_${index}`] || 1 }
                                ]}
                                resizeMode="cover"
                                onLoad={(event) => {
                                  const { width, height } = event.nativeEvent.source;
                                  handleMediaLoad(`post_${post.id}_media_${index}`, width, height);
                                }}
                                onError={(err) => {
                                  console.error(`❌ Image ${index} failed to load:`, err.nativeEvent);
                                  console.error('Image URL:', mediaItem.url);
                                }}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                  {(post as any).media_items.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[post.id] ?? 0) + 1}/{(post as any).media_items.length}
                      </Text>
                    </View>
                  )}
                </View>
                  );
                })()
              ) : post.youtube_urls && post.youtube_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={false}
                    style={styles.carousel}
                  >
                    {post.youtube_urls.map((youtubeUrl, index) => (
                      <View key={index} style={styles.mediaPage}>
                        <YouTubePlayer url={youtubeUrl} />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : post.video_urls && post.video_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [post.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
                  >
                    {post.video_urls.map((videoUrl, index) => (
                      <View key={index} style={styles.mediaPage}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                          <View style={{ flex: 1 }}>
                            <Video
                              source={{ uri: videoUrl }}
                              style={[
                                styles.postImage,
                                { aspectRatio: mediaAspectRatios[`post_${post.id}_video_${index}`] || 1 }
                              ]}
                              useNativeControls
                              resizeMode={ResizeMode.COVER}
                              isLooping={true}
                              shouldPlay={
                                isScreenFocused && 
                                visibleVideos.has(post.id) && 
                                (carouselIndices[post.id] ?? 0) === index
                              }
                              volume={
                                // IMPORTANT: Set volume to 0 immediately when not visible (fixes Android audio delay)
                                !visibleVideos.has(post.id) ? 0.0 :
                                isMuted || (carouselIndices[post.id] ?? 0) !== index 
                                  ? 0.0 
                                  : 1.0
                              }
                              // Android performance: reduce update frequency
                              progressUpdateIntervalMillis={Platform.OS === 'android' ? 500 : 250}
                              onReadyForDisplay={(data) => {
                                if (data.naturalSize) {
                                  handleMediaLoad(
                                    `post_${post.id}_video_${index}`,
                                    data.naturalSize.width,
                                    data.naturalSize.height
                                  );
                                }
                              }}
                              onError={(err) => console.warn('Video play error (carousel item)', err)}
                            />
                          </View>
                        </TouchableWithoutFeedback>
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
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [post.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
                  >
                    {post.image_urls.map((imageUrl, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.mediaPage}
                        activeOpacity={0.95}
                        onPress={() => debouncedRouter.push(`/post/${post.id}`)}
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={[
                            styles.postImage,
                            { aspectRatio: mediaAspectRatios[`post_${post.id}_img_${index}`] || 1 }
                          ]}
                          resizeMode="cover"
                          onLoad={(event) => {
                            const { width, height } = event.nativeEvent.source;
                            handleMediaLoad(`post_${post.id}_img_${index}`, width, height);
                          }}
                          onError={(e) => console.warn('Image load error', imageUrl, e.nativeEvent?.error)}
                        />
                      </TouchableOpacity>
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
              ) : post.youtube_url ? (
                <YouTubePlayer url={post.youtube_url} />
              ) : post.video_url ? (
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View>
                    <Video
                      source={{ uri: post.video_url }}
                      style={[
                        styles.postImage,
                        { aspectRatio: mediaAspectRatios[`post_${post.id}_single`] || 1 }
                      ]}
                      useNativeControls
                      resizeMode={ResizeMode.COVER}
                      isLooping
                      shouldPlay={isScreenFocused && visibleVideos.has(post.id)}
                      volume={
                        // IMPORTANT: Set volume to 0 immediately when not visible (fixes Android audio delay)
                        !visibleVideos.has(post.id) ? 0.0 : (isMuted ? 0.0 : 1.0)
                      }
                      // Android performance: reduce update frequency
                      progressUpdateIntervalMillis={Platform.OS === 'android' ? 500 : 250}
                      onReadyForDisplay={(data) => {
                        if (data.naturalSize) {
                          handleMediaLoad(
                            `post_${post.id}_single`,
                            data.naturalSize.width,
                            data.naturalSize.height
                          );
                        }
                      }}
                      onError={(err) => console.warn('Video play error (single)', err)}
                    />
                  </View>
                </TouchableWithoutFeedback>
              ) : post.image_url ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => debouncedRouter.push(`/post/${post.id}`)}>
                  <Image 
                    source={{ uri: post.image_url }} 
                    style={[
                      styles.postImage,
                      { aspectRatio: mediaAspectRatios[`post_${post.id}_single`] || 1 }
                    ]}
                    resizeMode="cover"
                    onLoad={(event) => {
                      const { width, height } = event.nativeEvent.source;
                      handleMediaLoad(`post_${post.id}_single`, width, height);
                    }}
                  />
                </TouchableOpacity>
              ) : null}

              {/* Post Actions - Instagram Style */}
              <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                  <TouchableOpacity 
                    style={styles.actionButtonWithCount}
                    onPress={() => handleLikeToggle(post.id)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ThumbsUp 
                      size={24} 
                      color={post.isLiked ? "#ffc857" : "#000000"}
                      fill={post.isLiked ? "#ffc857" : "none"}
                      strokeWidth={2}
                    />
                    {(post.likes || 0) > 0 && (
                      <Text style={styles.actionCount}>{post.likes}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonWithCount}
                    onPress={() => debouncedRouter.push(`/post-comments/${post.id}`)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MessagesSquare size={24} color="#000000" strokeWidth={2} />
                    {post.comments_count !== undefined && post.comments_count > 0 && (
                      <Text style={styles.actionCount}>{post.comments_count}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleSharePress(post)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Share2 size={24} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleBookmarkToggle(post.id)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Star size={24} color={post.isBookmarked ? '#ffc857' : '#000000'} fill={post.isBookmarked ? '#ffc857' : 'none'} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Caption */}
              {post.content && (
                <View style={styles.postCaption}>
                  <Text style={styles.postCaptionUsername}>
                    {getDisplayName(post.user)}
                  </Text>
                  <ExpandableText
                    text={post.content}
                    numberOfLines={2}
                    captionStyle={styles.postCaptionText}
                  />
                </View>
              )}

              {/* Post Comments Count */}
              {post.comments_count !== undefined && post.comments_count > 0 ? (
                <TouchableOpacity onPress={() => debouncedRouter.push(`/post-comments/${post.id}`)}>
                  <Text style={styles.viewComments}>
                    View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => debouncedRouter.push(`/post-comments/${post.id}`)}>
                  <Text style={styles.viewComments}>
                    Be the first to comment
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            );
          })
        )}

      </ScrollView>

      {/* Floating Action Button for Creating Posts */}
      {(profile?.role === 'admin' || profile?.is_admin) && (
        <TouchableOpacity 
          style={styles.fabButton}
          onPress={() => debouncedRouter.push('/home-create-post')}
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
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 20,
    backgroundColor: HEADER_COLOR,
    width: '100%',
  },
  logoText: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  headerIconWithBadge: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendingContainer: {
    marginBottom: 0,
    width: '100%',
  },
  trendingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  trendingSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  trendingAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  trendingAdminButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0EA5E9',
  },
  featuredScroll: {
    marginBottom: 0,
  },
  featuredContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  featuredItem: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
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
  trendingCardMenu: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  categoriesSection: {
    marginBottom: 0,
    width: '100%',
  },
  categoriesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  categoriesSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  categoryAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  categoryAdminButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#0EA5E9',
  },
  categoriesContainer: {
    borderBottomWidth: 0,
    borderBottomColor: '#DBDBDB',
    backgroundColor: '#FFFFFF',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 12,
  },
  categoryTab: {
    width: 80,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#ffc857',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTabActive: {
    borderColor: '#ffc857',
    borderWidth: 3,
    shadowOpacity: 0.5,
    shadowRadius: 6,
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  categoryOverlayActive: {
    backgroundColor: 'rgba(255, 200, 87, 0.85)',
  },
  categoryTitle: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    maxWidth: width - 32,
    alignSelf: 'center',
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
    width: '100%',
  },
  postCard: {
    marginBottom: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    width: '100%',
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
    width: '100%',
  },
  carousel: {
    width: width,
    alignSelf: 'center',
  },
  postImage: {
    width: width,
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
  mediaPage: {
    width: width,
    alignSelf: 'center',
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
  // Search Modal Styles
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  searchModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '95%',
    paddingTop: 16,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  searchBackButton: {
    padding: 8,
    backgroundColor: '#0F172A',
    borderRadius: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  searchModalInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    height: '100%',
  },
  searchFiltersContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchFiltersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  searchFilterChipActive: {
    backgroundColor: '#ffc857',
    borderColor: '#ffc857',
  },
  searchFilterChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  searchFilterChipTextActive: {
    color: '#0F172A',
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  searchLoadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
    marginTop: 16,
  },
  searchEmptyState: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  searchEmptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginTop: 16,
  },
  searchEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchQuickAccessSection: {
    marginBottom: 24,
  },
  searchQuickAccessTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 16,
  },
  searchQuickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchQuickAccessItem: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },
  searchQuickAccessIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchQuickAccessLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
  },
  searchHintContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  searchHintText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  searchSection: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  searchPersonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchPersonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPersonAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  searchPersonInfo: {
    flex: 1,
  },
  searchPersonName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchPersonBio: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  searchEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchEventDateBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchEventDateDay: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    lineHeight: 22,
  },
  searchEventDateMonth: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  searchEventInfo: {
    flex: 1,
  },
  searchEventTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  searchEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchEventLocation: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  searchCircleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchCircleImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  searchCircleImagePlaceholder: {
    backgroundColor: '#8B5CF615',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCircleInfo: {
    flex: 1,
  },
  searchCircleName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchCircleCategory: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  searchJobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchJobIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F59E0B15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchJobInfo: {
    flex: 1,
  },
  searchJobTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchJobCompany: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  searchMarketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchMarketImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  searchMarketImagePlaceholder: {
    backgroundColor: '#EC489915',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchMarketInfo: {
    flex: 1,
  },
  searchMarketTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchMarketPrice: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  searchForumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchForumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#06B6D415',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchForumInfo: {
    flex: 1,
  },
  searchForumTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
    lineHeight: 20,
  },
  searchForumCategory: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  searchPostItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchPostLeft: {
    flex: 1,
  },
  searchPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  searchPostUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPostUserAvatarPlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  searchPostUserName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    flex: 1,
  },
  searchPostContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  searchPostThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  searchArticleItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchArticleThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  searchArticleInfo: {
    flex: 1,
  },
  searchArticleTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  searchArticleSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
}); 