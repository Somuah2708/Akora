import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, ArrowLeft, Globe, Newspaper, Bookmark, Share2, ThumbsUp, MessageCircle, Clock, ChevronRight, Filter, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, type Profile } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const NEWS_CATEGORIES = [
  { id: 'all', name: 'All News' },
  { id: 'alumni', name: 'Alumni Updates' },
  { id: 'school', name: 'School News' },
  { id: 'world', name: 'World News' },
  { id: 'tech', name: 'Technology' },
  { id: 'business', name: 'Business' },
];

interface NewsItem {
  id: string;
  title: string;
  category: string;
  image: string;
  timeAgo: string;
  readTime: string;
  likes: number;
  comments: number;
  excerpt?: string;
  content?: string;
  author?: {
    name: string;
    avatar: string;
    role: string;
  };
  user?: Profile;
}

// Placeholder images for when API fails or is loading
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=60'
];

const TRENDING_TOPICS = [
  {
    id: '1',
    title: 'Alumni Entrepreneurs',
    articles: 15,
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Campus Development',
    articles: 8,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Research Highlights',
    articles: 12,
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=60',
  },
];

export default function NewsScreen() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [featuredNews, setFeaturedNews] = useState<NewsItem[]>([]);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<TextInput>(null);
  
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch news articles from products_services table
      const { data: newsData, error: newsError } = await supabase
        .from('products_services')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .like('category_name', 'News - %')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (newsError) throw newsError;
      
      // Process the news data
      const processedNews = (newsData || []).map((item, index) => {
        // Parse the category from category_name (format: "News - Category")
        const categoryParts = item.category_name.split(' - ');
        const category = categoryParts.length > 1 ? categoryParts[1] : 'General';
        
        // Parse the description to extract content and excerpt
        let content = item.description;
        let excerpt = content.length > 120 ? content.substring(0, 120) + '...' : content;
        
        // Calculate time ago
        const timeAgo = getTimeAgo(item.created_at);
        
        // Calculate read time (1 min per 200 words)
        const wordCount = content.split(/\s+/).length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200)) + ' min read';
        
        // Generate random likes and comments for demo purposes
        const likes = Math.floor(Math.random() * 1500) + 100;
        const comments = Math.floor(Math.random() * 100) + 5;
        
        return {
          id: item.id,
          title: item.title,
          category,
          image: item.image_url || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length],
          timeAgo,
          readTime,
          likes,
          comments,
          excerpt,
          content,
          user: item.profiles,
          author: {
            name: item.profiles?.full_name || item.profiles?.username || 'Anonymous',
            avatar: item.profiles?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
            role: 'Staff Writer'
          }
        };
      });
      
      // Split into featured and latest news
      const featured = processedNews.slice(0, 2);
      const latest = processedNews.slice(2);
      
      setFeaturedNews(featured);
      setLatestNews(latest);
    } catch (error) {
      console.error('Error fetching news:', error);
      // Use placeholder data if fetch fails
      setFeaturedNews([
        {
          id: '1',
          title: 'Alumni Achievement: Dr. Sarah Chen Wins Nobel Prize',
          category: 'Alumni Updates',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60',
          timeAgo: '2 hours ago',
          readTime: '5 min read',
          likes: 1200,
          comments: 85,
        },
        {
          id: '2',
          title: 'School Launches New Innovation Hub',
          category: 'School News',
          image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&auto=format&fit=crop&q=60',
          timeAgo: '4 hours ago',
          readTime: '3 min read',
          likes: 856,
          comments: 42,
        },
      ]);
      setLatestNews([
        {
          id: '1',
          title: 'Global Tech Summit 2024: Alumni Panel Discussion',
          category: 'Alumni Updates',
          image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
          excerpt: 'Distinguished alumni share insights on AI and future of technology...',
          timeAgo: '1 hour ago',
          readTime: '4 min read',
        },
        {
          id: '2',
          title: 'Breakthrough in Renewable Energy Research',
          category: 'World News',
          image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&auto=format&fit=crop&q=60',
          excerpt: 'Scientists discover new method for efficient solar energy storage...',
          timeAgo: '3 hours ago',
          readTime: '6 min read',
        },
        {
          id: '3',
          title: 'Annual Alumni Giving Day Sets New Record',
          category: 'School News',
          image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=60',
          excerpt: 'Community raises over $10 million for scholarship fund...',
          timeAgo: '5 hours ago',
          readTime: '3 min read',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Helper function to calculate time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };
  
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);
  
  // Filter news based on search query and selected category
  const filterNews = useCallback((news: NewsItem[]) => {
    return news.filter(item => {
      // Filter by category
      if (activeCategory !== 'all' && item.category.toLowerCase() !== activeCategory) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          (item.excerpt?.toLowerCase().includes(query) || false) ||
          (item.author?.name.toLowerCase().includes(query) || false)
        );
      }
      
      return true;
    });
  }, [activeCategory, searchQuery]);
  
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>News</Text>
          <TouchableOpacity>
            <Filter size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666" />
            <TextInput 
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholder="Search news..."
              placeholderTextColor="#666"
              returnKeyType="search"
              onFocus={() => setIsSearching(true)}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  Alert.alert('Searching', `Searching for: "${searchQuery}"`);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}>
                <X size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => {
              Alert.alert(
                'Filter News',
                'Choose a filter option:',
                [
                  { text: 'All News', onPress: () => setActiveCategory('all') },
                  { text: 'Alumni Updates', onPress: () => setActiveCategory('alumni') },
                  { text: 'School News', onPress: () => setActiveCategory('school') },
                  { text: 'World News', onPress: () => setActiveCategory('world') },
                  { text: 'Technology', onPress: () => setActiveCategory('tech') },
                  { text: 'Business', onPress: () => setActiveCategory('business') },
                  { text: 'Clear Search', onPress: () => {
                    setSearchQuery('');
                    setIsSearching(false);
                  }},
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <Filter size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {NEWS_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.selectedCategory,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.selectedCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured News */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => {
                Alert.alert('Featured News', 'View all featured news articles');
                // In a real app, this would navigate to a dedicated featured news screen
              }}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading featured news...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredContainer}
            >
              {filterNews(featuredNews).length > 0 ? (
                filterNews(featuredNews).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.featuredCard}
                    onPress={() => {}}
                  >
                    <Image source={{ uri: item.image }} style={styles.featuredImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.gradient}
                    >
                      <View style={styles.featuredContent}>
                        <Text style={styles.featuredCategory}>{item.category}</Text>
                        <Text style={styles.featuredTitle}>{item.title}</Text>
                        <View style={styles.featuredMeta}>
                          <View style={styles.metaItem}>
                            <Clock size={14} color="#fff" />
                            <Text style={styles.metaText}>{item.timeAgo}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <ThumbsUp size={14} color="#fff" />
                            <Text style={styles.metaText}>{item.likes}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <MessageCircle size={14} color="#fff" />
                            <Text style={styles.metaText}>{item.comments}</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No featured news found</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Latest News */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest News</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => {
                Alert.alert('Latest News', 'View all latest news articles');
                // In a real app, this would navigate to a dedicated latest news screen
              }}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading latest news...</Text>
            </View>
          ) : (
            filterNews(latestNews).length > 0 ? (
              filterNews(latestNews).map((item) => (
                <TouchableOpacity key={item.id} style={styles.latestCard}>
                  <Image source={{ uri: item.image }} style={styles.latestImage} />
                  <View style={styles.latestContent}>
                    <Text style={styles.latestCategory}>{item.category}</Text>
                    <Text style={styles.latestTitle}>{item.title}</Text>
                    <Text style={styles.latestExcerpt}>{item.excerpt}</Text>
                    <View style={styles.latestMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={14} color="#666" />
                        <Text style={styles.latestMetaText}>{item.timeAgo}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={14} color="#666" />
                        <Text style={styles.latestMetaText}>{item.readTime}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No news articles found</Text>
              </View>
            )
          )}
        </View>

        {/* Trending Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Topics</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trendingContainer}
          >
            {TRENDING_TOPICS.map((topic) => (
              <TouchableOpacity 
                key={topic.id} 
                style={styles.trendingCard}
                onPress={() => {
                  Alert.alert(
                    topic.title,
                    `View all ${topic.articles} articles about ${topic.title}`
                  );
                  // In a real app, this would navigate to a topic-specific screen
                }}
              >
                <Image source={{ uri: topic.image }} style={styles.trendingImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.gradient}
                >
                  <View style={styles.trendingContent}>
                    <Text style={styles.trendingTitle}>{topic.title}</Text>
                    <Text style={styles.trendingArticles}>
                      {topic.articles} articles
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      
      {/* Search Results Indicator */}
      {isSearching && searchQuery.length > 0 && (
        <View style={styles.searchResultsBar}>
          <Text style={styles.searchResultsText}>
            Found {filterNews(latestNews).length + filterNews(featuredNews).length} results for "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setIsSearching(false);
          }}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
  },
  selectedCategory: {
    backgroundColor: '#000',
  },
  categoryText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: '#000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  featuredContainer: {
    paddingHorizontal: 24,
  },
  featuredCard: {
    width: CARD_WIDTH,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredContent: {
    gap: 8,
  },
  featuredCategory: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
  },
  featuredTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#fff',
    lineHeight: 24,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#fff',
  },
  latestCard: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  latestImage: {
    width: 100,
    height: 100,
  },
  latestContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  latestCategory: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  latestTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  latestExcerpt: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  latestMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  latestMetaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#666666',
  },
  trendingContainer: {
    paddingHorizontal: 24,
  },
  trendingCard: {
    width: 200,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingContent: {
    gap: 4,
  },
  trendingTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  trendingArticles: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#fff',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  searchResultsBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#4169E1',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  }
});