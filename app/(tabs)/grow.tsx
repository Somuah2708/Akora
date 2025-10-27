import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { 
  Grid3x3,
  Bookmark,
  UserPlus,
  Menu,
  Heart,
  Link as LinkIcon,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3;

const USER_POSTS = [
  { id: '1', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400', likes: 245 },
  { id: '2', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400', likes: 189 },
  { id: '3', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400', likes: 312 },
  { id: '4', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400', likes: 456 },
  { id: '5', image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400', likes: 234 },
  { id: '6', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', likes: 198 },
  { id: '7', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', likes: 567 },
  { id: '8', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400', likes: 289 },
  { id: '9', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400', likes: 423 },
  { id: '10', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400', likes: 345 },
  { id: '11', image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400', likes: 278 },
  { id: '12', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', likes: 512 },
];

const HIGHLIGHTS = [
  { id: '1', title: 'Events', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400' },
  { id: '2', title: 'Travel', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400' },
  { id: '3', title: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400' },
  { id: '4', title: 'Awards', image: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400' },
  { id: '5', title: 'Friends', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400' },
];

const USER_STATS = {
  posts: 127,
  followers: 2847,
  following: 892,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'grid' | 'saved'>('grid');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setUserPosts(posts || []);
      setStats(prev => ({ ...prev, posts: posts?.length || 0 }));

      // Fetch followers count (from friends table where friend_id = user.id)
      const { count: followersCount, error: followersError } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id);

      if (!followersError) {
        setStats(prev => ({ ...prev, followers: followersCount || 0 }));
      }

      // Fetch following count (from friends table where user_id = user.id)
      const { count: followingCount, error: followingError } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!followingError) {
        setStats(prev => ({ ...prev, following: followingCount || 0 }));
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/sign-in');
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please sign in to view your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.username}>@{profile.username || 'user'}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon} onPress={handleSignOut}>
              <LogOut size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Menu size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.displayName}>{profile.full_name || 'User'}</Text>
          
          {/* User Details */}
          <View style={styles.detailsContainer}>
            {profile.year_group && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📚 Year Group:</Text>
                <Text style={styles.detailValue}>{profile.year_group}</Text>
              </View>
            )}
            
            {profile.house && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🏠 House:</Text>
                <Text style={styles.detailValue}>{profile.house}</Text>
              </View>
            )}
            
            {profile.class && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🎓 Class:</Text>
                <Text style={styles.detailValue}>{profile.class}</Text>
              </View>
            )}

            {profile.first_name && profile.surname && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>👤 Name:</Text>
                <Text style={styles.detailValue}>{profile.first_name} {profile.surname}</Text>
              </View>
            )}

            {profile.email && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📧 Email:</Text>
                <Text style={styles.detailValue}>{profile.email}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/profile/edit')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareButtonText}>Share Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <UserPlus size={16} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.highlightsContainer}
          contentContainerStyle={styles.highlightsContent}
        >
          {HIGHLIGHTS.map((highlight) => (
            <TouchableOpacity key={highlight.id} style={styles.highlightItem}>
              <View style={styles.highlightImageContainer}>
                <Image source={{ uri: highlight.image }} style={styles.highlightImage} />
              </View>
              <Text style={styles.highlightTitle}>{highlight.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'grid' && styles.activeTab]}
          onPress={() => setActiveTab('grid')}
        >
          <Grid3x3 size={24} color={activeTab === 'grid' ? '#000000' : '#8E8E8E'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Bookmark size={24} color={activeTab === 'saved' ? '#000000' : '#8E8E8E'} />
        </TouchableOpacity>
      </View>

      <View style={styles.postsGrid}>
        {userPosts.length > 0 ? (
          userPosts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.gridItem}>
              {post.image_url ? (
                <Image source={{ uri: post.image_url }} style={styles.gridImage} />
              ) : (
                <View style={styles.gridImagePlaceholder}>
                  <Text style={styles.gridPlaceholderText}>No Image</Text>
                </View>
              )}
              <View style={styles.gridOverlay}>
                <View style={styles.gridStats}>
                  <Heart size={18} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.gridStatsText}>{post.likes_count || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No posts yet</Text>
          </View>
        )}
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
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  username: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    padding: 4,
  },
  profileSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -60,
    marginLeft: 100,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    marginTop: 2,
  },
  bioSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  detailsContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    flex: 1,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    lineHeight: 20,
    marginBottom: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#003569',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  moreButton: {
    backgroundColor: '#EFEFEF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightsContainer: {
    marginBottom: 8,
  },
  highlightsContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  highlightItem: {
    alignItems: 'center',
    width: 70,
  },
  highlightImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#DBDBDB',
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#000000',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0,
  },
  gridStatsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  avatarPlaceholder: {
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});
