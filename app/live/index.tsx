import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Search, ArrowLeft, Play, Clock, Calendar, Settings, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');

interface Livestream {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  stream_url: string;
  host_name: string;
  category: string | null;
  is_live: boolean;
  start_time: string;
  viewer_count: number;
  created_at: string;
}

export default function LiveStreamScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveStreams, setLiveStreams] = useState<Livestream[]>([]);
  const [pastStreams, setPastStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchStreams();

    // Real-time subscription for stream updates
    const subscription = supabase
      .channel('livestreams_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'livestreams' },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchStreams = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('[Live] Admin status:', { 
        role: profile?.role, 
        is_admin: profile?.is_admin, 
        isAdmin: profile?.role === 'admin' || profile?.is_admin 
      });

      const { data, error } = await supabase
        .from('livestreams')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;

      const live: Livestream[] = [];
      const past: Livestream[] = [];

      data?.forEach((stream) => {
        // Stream is live based on is_live flag
        if (stream.is_live) {
          live.push(stream);
        } else {
          // Not live = past stream
          past.push(stream);
        }
      });

      setLiveStreams(live);
      setPastStreams(past);
    } catch (error: any) {
      console.error('Error fetching streams:', error);
      Alert.alert('Error', 'Failed to load streams. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenStream = async (stream: Livestream) => {
    try {
      // Update viewer count for live streams
      if (stream.is_live) {
        await supabase
          .from('livestreams')
          .update({ viewer_count: (stream.viewer_count || 0) + 1 })
          .eq('id', stream.id);
      }

      // Extract YouTube video ID if it's a YouTube URL
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = stream.stream_url.match(youtubeRegex);
      
      if (match && match[1]) {
        // Open YouTube app or website
        const videoId = match[1];
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        await Linking.openURL(youtubeUrl);
      } else {
        // Open other stream URLs directly
        await Linking.openURL(stream.stream_url);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open stream. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };
  // Toggle description expansion per stream
  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredStreams = (activeTab === 'live' ? liveStreams : pastStreams).filter(stream =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStreamCard = (stream: Livestream) => (
    <TouchableOpacity
      key={stream.id}
      style={styles.streamCard}
      onPress={() => handleOpenStream(stream)}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: stream.thumbnail_url || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800' }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        {/* Live Badge (no Wi‑Fi icon, cleaner pill with dot) */}
        {stream.is_live && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}

        {/* Duration/Time Badge for past streams */}
        {!stream.is_live && (
          <View style={styles.durationBadge}>
            <Clock size={10} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.durationText}>{formatDate(stream.start_time)}</Text>
          </View>
        )}

        {/* Play overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* Stream Info */}
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>{stream.title}</Text>
        {/* Expandable description */}
        {(() => {
          const full = stream.description || '';
          const isLong = full.length > 140;
          const isOpen = !!expanded[stream.id];
          const shown = isOpen || !isLong ? full : full.slice(0, 140).trim() + '…';
          return (
            <View>
              <Text style={styles.streamDescription}>{shown}</Text>
              {isLong && (
                <TouchableOpacity onPress={() => toggleExpand(stream.id)} activeOpacity={0.7}>
                  <Text style={styles.expandToggle}>{isOpen ? 'Show less' : 'Show more'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
        
        <View style={styles.streamMeta}>
          {/* Host info */}
          <View style={styles.hostInfo}>
            <Text style={styles.hostName} numberOfLines={1}>{stream.host_name}</Text>
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Loading streams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Live Streams</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'live' 
              ? `${liveStreams.length} live now` 
              : `${pastStreams.length} past streams`}
          </Text>
        </View>
        {(profile?.role === 'admin' || profile?.is_admin) && (
          <TouchableOpacity 
            style={styles.adminButton}
            onPress={() => router.push('/live/admin')}
          >
            <Settings size={20} color="#8B0000" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999999" strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search streams..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999999"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live' && styles.activeTab]}
          onPress={() => setActiveTab('live')}
        >
          <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>
            Live Now
          </Text>
          {liveStreams.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{liveStreams.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Calendar size={16} color={activeTab === 'past' ? '#8B0000' : '#666666'} strokeWidth={2} />
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Streams
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stream List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStreams(true)}
            tintColor="#8B0000"
          />
        }
      >
        {filteredStreams.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {activeTab === 'live' ? (
                <Play size={48} color="#CCCCCC" strokeWidth={1.5} />
              ) : (
                <Calendar size={48} color="#CCCCCC" strokeWidth={1.5} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'live' ? 'No Live Streams' : 'No Past Streams'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'live'
                ? 'Check back later for live content from the community'
                : 'Past streams will appear here once they end'}
            </Text>
          </View>
        ) : (
          <View style={styles.streamList}>
            {filteredStreams.map(renderStreamCard)}
          </View>
        )}
      </ScrollView>

      {/* Admin Floating Add Button */}
      {(profile?.role === 'admin' || profile?.is_admin) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/live/admin')}
          activeOpacity={0.85}
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
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Inter-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
  },
  adminButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#FFF5F5',
    borderColor: '#8B0000',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  activeTabText: {
    color: '#8B0000',
  },
  badge: {
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  streamList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  streamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  streamInfo: {
    padding: 16,
  },
  streamTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    lineHeight: 24,
    marginBottom: 8,
  },
  streamDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  expandToggle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#8B0000',
    marginBottom: 12,
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  hostName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    flex: 1,
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
