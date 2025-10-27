import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { BookOpen, Film, Music, Newspaper, Trophy, Calendar, MapPin, Users, Sparkles, TrendingUp, Play, Bookmark, Heart, MessageCircle, ExternalLink, Star, Target, Lightbulb, Briefcase, GraduationCap, BookMarked, Zap } from 'lucide-react-native';
import { fetchDiscoverFeed, type DiscoverItem } from '@/lib/discover';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

// Interest categories for filtering
const INTERESTS = [
  { id: 'all', label: 'For You', icon: Sparkles },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'marketplace', label: 'Marketplace', icon: Briefcase },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'saved', label: 'Saved', icon: BookMarked },
];

// Personalized content feed
const DISCOVER_FEED = [
  {
    id: '1',
    type: 'recommendation',
    category: 'education',
    title: 'Advanced Excel Masterclass',
    description: 'Based on your interest in data analysis, we recommend this comprehensive Excel course.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60',
    author: 'Dr. Sarah Johnson',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
    likes: 234,
    saved: 89,
    matchScore: 95,
    tags: ['Excel', 'Data Analysis', 'Professional Development'],
  },
  {
    id: '2',
    type: 'tool',
    category: 'tools',
    title: 'Career Growth Tracker',
    description: 'Track your professional development goals and connect with mentors in your field.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
    author: 'Akora Career Services',
    authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=60',
    likes: 456,
    saved: 178,
    matchScore: 88,
    tags: ['Career', 'Mentorship', 'Goal Setting'],
  },
  {
    id: '3',
    type: 'event',
    category: 'events',
    title: 'Alumni Networking Night',
    description: 'Connect with alumni in tech industry. Perfect match based on your interests in software development.',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
    date: 'Nov 20, 2025',
    location: 'Tech Hub, Accra',
    attendees: 150,
    matchScore: 92,
    tags: ['Networking', 'Tech', 'Career'],
  },
  {
    id: '4',
    type: 'resource',
    category: 'resources',
    title: 'Scholarship Database 2025',
    description: 'Curated list of scholarships matching your academic profile and interests.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
    author: 'Akora Scholarship Committee',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
    likes: 789,
    saved: 423,
    matchScore: 91,
    tags: ['Scholarships', 'Education', 'Funding'],
  },
  {
    id: '5',
    type: 'recommendation',
    category: 'career',
    title: 'Job Opportunities in Finance',
    description: 'Top companies are looking for candidates with your background. 12 new openings this week.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=60',
    author: 'Akora Career Center',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=60',
    likes: 312,
    saved: 156,
    matchScore: 87,
    tags: ['Jobs', 'Finance', 'Banking'],
  },
  {
    id: '6',
    type: 'tool',
    category: 'tools',
    title: 'Study Group Finder',
    description: 'Find or create study groups with alumni preparing for similar certifications and exams.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=60',
    author: 'Academic Affairs',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
    likes: 521,
    saved: 267,
    matchScore: 85,
    tags: ['Study Groups', 'Collaboration', 'Learning'],
  },
  {
    id: '7',
    type: 'resource',
    category: 'education',
    title: 'Online Learning Platforms Guide',
    description: 'Comprehensive guide to top online learning platforms with exclusive Akora discounts.',
    image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop&q=60',
    author: 'Learning & Development',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=60',
    likes: 643,
    saved: 389,
    matchScore: 90,
    tags: ['Online Learning', 'Courses', 'Discounts'],
  },
  {
    id: '8',
    type: 'event',
    category: 'events',
    title: 'Entrepreneurship Workshop Series',
    description: 'Based on your profile, you might be interested in this startup bootcamp series.',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop&q=60',
    date: 'Dec 5-7, 2025',
    location: 'Innovation Hub',
    attendees: 80,
    matchScore: 83,
    tags: ['Entrepreneurship', 'Startups', 'Business'],
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeInterest, setActiveInterest] = useState('all');
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [discoverFeed, setDiscoverFeed] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const loadDiscoverFeed = useCallback(async () => {
    try {
      setLoading(true);
      const feed = await fetchDiscoverFeed(user?.id, activeInterest === 'all' ? undefined : activeInterest);
      setDiscoverFeed(feed);
    } catch (error) {
      console.error('Error loading discover feed:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeInterest]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDiscoverFeed();
    setRefreshing(false);
  }, [loadDiscoverFeed]);

  useEffect(() => {
    loadDiscoverFeed();
  }, [loadDiscoverFeed]);

  if (!fontsLoaded) {
    return null;
  }

  const toggleLike = (itemId: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSave = (itemId: string) => {
    setSavedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'recommendation': return 'Recommended for You';
      case 'tool': return 'Tool';
      case 'event': return 'Event';
      case 'resource': return 'Resource';
      case 'post': return 'Post';
      case 'product': return 'Product';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'recommendation': return '#4169E1';
      case 'tool': return '#10B981';
      case 'event': return '#F59E0B';
      case 'resource': return '#8B5CF6';
      case 'post': return '#3B82F6';
      case 'product': return '#EC4899';
      default: return '#6B7280';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading personalized content...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Personalized content for you</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Target size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Interest Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.interestsContainer}
        contentContainerStyle={styles.interestsContent}
      >
        {INTERESTS.map((interest) => {
          const IconComponent = interest.icon;
          const isActive = activeInterest === interest.id;
          return (
            <TouchableOpacity
              key={interest.id}
              style={[styles.interestChip, isActive && styles.interestChipActive]}
              onPress={() => setActiveInterest(interest.id)}
            >
              <IconComponent 
                size={16} 
                color={isActive ? '#FFFFFF' : '#6B7280'} 
                strokeWidth={2}
              />
              <Text style={[styles.interestText, isActive && styles.interestTextActive]}>
                {interest.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feed */}
      {discoverFeed.length === 0 ? (
        <View style={styles.emptyState}>
          <Sparkles size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No content yet</Text>
          <Text style={styles.emptyStateText}>Check back soon for personalized recommendations</Text>
        </View>
      ) : (
        discoverFeed.map((item) => {
          const isLiked = likedItems.has(item.id);
          const isSaved = savedItems.has(item.id);
          
          return (
            <TouchableOpacity key={item.id} style={styles.feedCard}>
                {/* Match Score Badge */}
                {item.matchScore && (
                  <View style={styles.matchBadge}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.matchText}>{item.matchScore}% Match</Text>
                  </View>
                )}

                {/* Card Image */}
                {item.image && (
                  <Image source={{ uri: item.image }} style={styles.feedImage} />
                )}

                {/* Type Badge */}
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                  <Text style={styles.typeBadgeText}>{getTypeLabel(item.type)}</Text>
                </View>

              {/* Card Content */}
              <View style={styles.feedContent}>
                <Text style={styles.feedTitle}>{item.title}</Text>
                <Text style={styles.feedDescription}>{item.description}</Text>

                {/* Event Details */}
                {item.type === 'event' && item.date && (
                  <View style={styles.eventDetails}>
                    <View style={styles.eventDetailRow}>
                      <Calendar size={14} color="#6B7280" />
                      <Text style={styles.eventDetailText}>{item.date}</Text>
                    </View>
                    {item.location && (
                      <View style={styles.eventDetailRow}>
                        <MapPin size={14} color="#6B7280" />
                        <Text style={styles.eventDetailText}>{item.location}</Text>
                      </View>
                    )}
                    {item.attendees && (
                      <View style={styles.eventDetailRow}>
                        <Users size={14} color="#6B7280" />
                        <Text style={styles.eventDetailText}>{item.attendees} attending</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Author Info */}
                {item.author && (
                  <View style={styles.authorInfo}>
                    <Image source={{ uri: item.author.avatar_url }} style={styles.authorAvatar} />
                    <Text style={styles.authorName}>{item.author.full_name || item.author.username}</Text>
                  </View>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.tagsContainer}
                  >
                    {item.tags.map((tag: string, index: number) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Actions */}
                <View style={styles.feedActions}>
                  <View style={styles.feedStats}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => toggleLike(item.id)}
                    >
                      <Heart 
                        size={20} 
                        color={isLiked ? '#EF4444' : '#6B7280'} 
                        fill={isLiked ? '#EF4444' : 'none'}
                      />
                      <Text style={styles.actionText}>
                        {(item.likes || 0) + (isLiked ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <MessageCircle size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.feedStats}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => toggleSave(item.id)}
                    >
                      <Bookmark 
                        size={20} 
                        color={isSaved ? '#4169E1' : '#6B7280'} 
                        fill={isSaved ? '#4169E1' : 'none'}
                      />
                      <Text style={styles.actionText}>
                        {(item.saved || 0) + (isSaved ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <ExternalLink size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Personalization Note */}
      <View style={styles.personalizationNote}>
        <Lightbulb size={20} color="#F59E0B" />
        <Text style={styles.personalizationText}>
          This feed is personalized based on your interests, activity, and goals. 
          Interact with content to improve recommendations.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  filterButton: {
    padding: 8,
  },
  interestsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  interestsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  interestChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  interestText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  interestTextActive: {
    color: '#FFFFFF',
  },
  feed: {
    flex: 1,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  matchBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  feedImage: {
    width: '100%',
    height: 240,
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedContent: {
    padding: 16,
  },
  feedTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 26,
  },
  feedDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 22,
  },
  eventDetails: {
    marginBottom: 12,
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  feedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  feedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  personalizationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    margin: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  personalizationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
});
