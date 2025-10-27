import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { 
  Settings, 
  Menu,
  Grid3x3,
  Bookmark,
  UserPlus,
  MessageCircle,
  MoreHorizontal,
  MapPin,
  Link as LinkIcon,
  Calendar
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3; // 3 columns with 2px gaps

// Mock user posts data
const USER_POSTS = [
  { id: '1', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&auto=format&fit=crop&q=60' },
  { id: '2', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&auto=format&fit=crop&q=60' },
  { id: '3', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&auto=format&fit=crop&q=60' },
  { id: '4', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&auto=format&fit=crop&q=60' },
  { id: '5', image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&auto=format&fit=crop&q=60' },
  { id: '6', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=60' },
  { id: '7', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=60' },
  { id: '8', image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=60' },
  { id: '9', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&auto=format&fit=crop&q=60' },
  { id: '10', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&auto=format&fit=crop&q=60' },
  { id: '11', image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&auto=format&fit=crop&q=60' },
  { id: '12', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&auto=format&fit=crop&q=60' },
];

// Mock stats
const USER_STATS = {
  posts: 127,
  followers: 2847,
  following: 892,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'grid' | 'saved'>('grid');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Menu size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.username}>{user?.username || 'akora_user'}</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/profile/edit')}
        >
          <Settings size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.profileRow}>
          {/* Profile Picture */}
          <TouchableOpacity style={styles.profileImageContainer}>
            <Image 
              source={{ uri: user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' }}
              style={styles.profileImage}
            />
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statNumber}>{USER_STATS.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statNumber}>{USER_STATS.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statNumber}>{USER_STATS.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.displayName}>{user?.full_name || 'Akora Alumni'}</Text>
          <Text style={styles.bio}>
            🎓 Proud Akora Alumni | Class of 2020{'\n'}
            💼 Software Engineer @TechCorp{'\n'}
            📍 Accra, Ghana{'\n'}
            🌐 Building the future, one line at a time
          </Text>
          <TouchableOpacity style={styles.linkContainer}>
            <LinkIcon size={12} color="#0095F6" />
            <Text style={styles.link}>akora.edu.gh/alumni</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageButton}>
            <Text style={styles.messageButtonText}>Share Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <UserPlus size={16} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Story Highlights */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.highlightsContainer}
        contentContainerStyle={styles.highlightsContent}
      >
        {['Achievements', 'Travel', 'Events', 'Goals', 'Projects'].map((highlight, index) => (
          <TouchableOpacity key={index} style={styles.highlight}>
            <View style={styles.highlightCircle}>
              <Image 
                source={{ uri: `https://images.unsplash.com/photo-${150000000 + index}0000000-0000000000000?w=200&auto=format&fit=crop&q=60` }}
                style={styles.highlightImage}
              />
            </View>
            <Text style={styles.highlightLabel}>{highlight}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'grid' && styles.activeTab]}
          onPress={() => setActiveTab('grid')}
        >
          <Grid3x3 
            size={24} 
            color={activeTab === 'grid' ? '#000000' : '#8E8E8E'} 
            strokeWidth={activeTab === 'grid' ? 2 : 1.5}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Bookmark 
            size={24} 
            color={activeTab === 'saved' ? '#000000' : '#8E8E8E'}
            strokeWidth={activeTab === 'saved' ? 2 : 1.5}
          />
        </TouchableOpacity>
      </View>

      {/* Posts Grid */}
      <View style={styles.postsGrid}>
        {USER_POSTS.map((post) => (
          <TouchableOpacity key={post.id} style={styles.gridItem}>
            <Image source={{ uri: post.image }} style={styles.gridImage} />
          </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  headerButton: {
    padding: 8,
  },
  username: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImageContainer: {
    marginRight: 24,
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  bioSection: {
    marginBottom: 12,
  },
  displayName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
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
    color: '#0095F6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#0095F6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButtonText: {
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  highlightsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  highlight: {
    alignItems: 'center',
    width: 64,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#DBDBDB',
    padding: 2,
    marginBottom: 4,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  highlightLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
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
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
});
