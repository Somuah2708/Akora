import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Search, Filter, MessageCircle, Users, ThumbsUp, Share2, Bookmark, Clock, Hash, Briefcase, Code, ChartLine as LineChart, Brain, Microscope, Palette, Building2, Globe, ChevronRight, Plus, Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const CATEGORIES = [
  { id: '1', name: 'Technology', icon: Code, color: '#E4EAFF' },
  { id: '2', name: 'Business', icon: Briefcase, color: '#FFE4E4' },
  { id: '3', name: 'Finance', icon: LineChart, color: '#E4FFF4' },
  { id: '4', name: 'Science', icon: Microscope, color: '#FFF4E4' },
  { id: '5', name: 'Arts', icon: Palette, color: '#FFE4F4' },
  { id: '6', name: 'Engineering', icon: Brain, color: '#E4F4FF' },
  { id: '7', name: 'Architecture', icon: Building2, color: '#F4E4FF' },
  { id: '8', name: 'International', icon: Globe, color: '#E4FFEA' },
];

const TRENDING_DISCUSSIONS = [
  {
    id: '1',
    title: 'The Future of AI in Healthcare',
    author: {
      name: 'Dr. Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
      role: 'AI Researcher',
    },
    category: 'Technology',
    timeAgo: '2 hours ago',
    likes: 245,
    comments: 89,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Sustainable Architecture Trends 2024',
    author: {
      name: 'Michael Thompson',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
      role: 'Architect',
    },
    category: 'Architecture',
    timeAgo: '4 hours ago',
    likes: 182,
    comments: 56,
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60',
  },
];

const RECENT_DISCUSSIONS = [
  {
    id: '1',
    title: 'Emerging Markets Investment Strategies',
    author: {
      name: 'Emma Wilson',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
      role: 'Investment Analyst',
    },
    preview: 'Looking at the current trends in emerging markets, particularly in Southeast Asia...',
    category: 'Finance',
    timeAgo: '1 hour ago',
    engagement: {
      likes: 56,
      comments: 23,
    },
  },
  {
    id: '2',
    title: 'Renewable Energy Solutions',
    author: {
      name: 'David Park',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=60',
      role: 'Environmental Engineer',
    },
    preview: 'Discussing the latest innovations in solar and wind energy storage systems...',
    category: 'Engineering',
    timeAgo: '3 hours ago',
    engagement: {
      likes: 89,
      comments: 34,
    },
  },
  {
    id: '3',
    title: 'Digital Art and NFTs',
    author: {
      name: 'Lisa Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
      role: 'Digital Artist',
    },
    preview: 'Exploring the intersection of traditional art and blockchain technology...',
    category: 'Arts',
    timeAgo: '5 hours ago',
    engagement: {
      likes: 124,
      comments: 45,
    },
  },
];

const ACTIVE_MEMBERS = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'AI Researcher',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
    contributions: 156,
  },
  {
    id: '2',
    name: 'Michael Thompson',
    role: 'Architect',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
    contributions: 142,
  },
  {
    id: '3',
    name: 'Emma Wilson',
    role: 'Investment Analyst',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
    contributions: 128,
  },
];

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_pinned: boolean;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function ForumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [trendingDiscussions, setTrendingDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useFocusEffect(
    useCallback(() => {
      loadDiscussions();
    }, [])
  );

  const loadDiscussions = async () => {
    try {
      setLoading(true);

      // Fetch all discussions with author info
      const { data, error } = await supabase
        .from('forum_discussions')
        .select(`
          *,
          profiles!forum_discussions_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedDiscussions = (data || []).map((d: any) => ({
        ...d,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
      }));

      setDiscussions(formattedDiscussions);

      // Get trending discussions (most liked + recent)
      const trending = formattedDiscussions
        .filter((d: Discussion) => d.likes_count > 5 || d.comments_count > 10)
        .slice(0, 5);
      
      setTrendingDiscussions(trending);

    } catch (error) {
      console.error('Error loading discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredDiscussions = discussions.filter(d => {
    const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
    const matchesSearch = !searchQuery || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading discussions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Development Forum</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/forum/new')}>
            <Plus size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <TouchableOpacity style={styles.filterButton}>
        <Filter size={20} color="#666666" />
      </TouchableOpacity>
    </View>      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { backgroundColor: category.color },
                activeCategory === category.id && styles.activeCategoryButton,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <IconComponent
                size={20}
                color={activeCategory === category.id ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Discussions</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingContent}
        >
          {trendingDiscussions.length > 0 ? trendingDiscussions.map((discussion) => (
            <TouchableOpacity
              key={discussion.id}
              style={styles.trendingCard}
              onPress={() => router.push(`/forum/${discussion.id}` as any)}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=60' }} 
                style={styles.trendingImage} 
              />
              <View style={styles.trendingOverlay}>
                <View style={styles.categoryTag}>
                  <Hash size={14} color="#4169E1" />
                  <Text style={styles.categoryTagText}>{discussion.category}</Text>
                </View>
                <Text style={styles.trendingTitle}>{discussion.title}</Text>
                <View style={styles.authorInfo}>
                  <Image 
                    source={{ uri: discussion.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' }} 
                    style={styles.authorAvatar} 
                  />
                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>{discussion.profiles?.full_name || 'Anonymous'}</Text>
                    <Text style={styles.authorRole}>Member</Text>
                  </View>
                </View>
                <View style={styles.engagementInfo}>
                  <View style={styles.engagementItem}>
                    <ThumbsUp size={14} color="#FFFFFF" />
                    <Text style={styles.engagementText}>{discussion.likes_count}</Text>
                  </View>
                  <View style={styles.engagementItem}>
                    <MessageCircle size={14} color="#FFFFFF" />
                    <Text style={styles.engagementText}>{discussion.comments_count}</Text>
                  </View>
                  <View style={styles.engagementItem}>
                    <Clock size={14} color="#FFFFFF" />
                    <Text style={styles.engagementText}>{getTimeAgo(discussion.created_at)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )) : (
            <Text style={styles.emptyText}>No trending discussions yet</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Discussions</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {filteredDiscussions.slice(0, 10).map((discussion) => (
          <TouchableOpacity
            key={discussion.id}
            style={styles.discussionCard}
            onPress={() => router.push(`/forum/${discussion.id}` as any)}
          >
            <View style={styles.discussionHeader}>
              <Image 
                source={{ uri: discussion.profiles?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' }} 
                style={styles.discussionAvatar} 
              />
              <View style={styles.discussionAuthorInfo}>
                <Text style={styles.discussionAuthorName}>{discussion.profiles?.full_name || 'Anonymous'}</Text>
                <Text style={styles.discussionAuthorRole}>Member</Text>
              </View>
              <View style={styles.discussionCategory}>
                <Hash size={12} color="#4169E1" />
                <Text style={styles.discussionCategoryText}>{discussion.category}</Text>
              </View>
            </View>
            <Text style={styles.discussionTitle}>{discussion.title}</Text>
            <Text style={styles.discussionPreview} numberOfLines={2}>{discussion.content}</Text>
            <View style={styles.discussionFooter}>
              <View style={styles.discussionEngagement}>
                <View style={styles.engagementItem}>
                  <ThumbsUp size={14} color="#666666" />
                  <Text style={styles.engagementCount}>{discussion.likes_count}</Text>
                </View>
                <View style={styles.engagementItem}>
                  <MessageCircle size={14} color="#666666" />
                  <Text style={styles.engagementCount}>{discussion.comments_count}</Text>
                </View>
              </View>
              <View style={styles.discussionActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Share2 size={20} color="#666666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Bookmark size={20} color="#666666" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Members</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.membersContent}
        >
          {ACTIVE_MEMBERS.map((member) => (
            <TouchableOpacity key={member.id} style={styles.memberCard}>
              <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              <View style={styles.contributionBadge}>
                <MessageCircle size={12} color="#4169E1" />
                <Text style={styles.contributionText}>{member.contributions} posts</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesScroll: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#4169E1',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
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
    fontSize: 18,
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
  trendingContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  trendingCard: {
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
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 12,
  },
  categoryTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  trendingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
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
  engagementInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  discussionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  discussionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  discussionAuthorInfo: {
    flex: 1,
  },
  discussionAuthorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  discussionAuthorRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  discussionCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  discussionCategoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  discussionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  discussionPreview: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  discussionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discussionEngagement: {
    flexDirection: 'row',
    gap: 16,
  },
  engagementCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  discussionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  membersContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: 140,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  contributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  contributionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});