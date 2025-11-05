import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { Search, Plus, ArrowLeft, Settings, Play, Users, Clock, Bell, BellOff, ExternalLink, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Livestream {
  id: string;
  title: string;
  description: string;
  short_description: string;
  thumbnail_url: string;
  stream_url: string;
  host_name: string;
  host_avatar_url: string;
  category: string;
  is_live: boolean;
  start_time: string;
  end_time: string | null;
  viewer_count: number;
  replay_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StreamReminder {
  id: string;
  user_id: string;
  stream_id: string;
  reminder_sent: boolean;
  created_at: string;
}

export default function LiveStreamScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveStreams, setLiveStreams] = useState<Livestream[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<Livestream[]>([]);
  const [pastStreams, setPastStreams] = useState<Livestream[]>([]);
  const [savedStreams, setSavedStreams] = useState<Livestream[]>([]);
  const [userReminders, setUserReminders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'past' | 'saved'>('live');
  const [refreshing, setRefreshing] = useState(false);
  
  // Start Live Stream Modal State
  const [showStartStreamModal, setShowStartStreamModal] = useState(false);
  const [streamForm, setStreamForm] = useState({
    title: '',
    description: '',
    short_description: '',
    thumbnail_url: '',
    stream_url: '',
    category: '',
    start_now: true,
    scheduled_time: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('Modal state changed:', showStartStreamModal);
  }, [showStartStreamModal]);

  useEffect(() => {
    fetchStreams();
    if (user) {
      fetchUserReminders();
    }

    // Auto-refresh every 30 seconds for live stream status updates
    const interval = setInterval(() => {
      fetchStreams();
    }, 30000);

    // Set up real-time subscription for new streams and updates
    const subscription = supabase
      .channel('livestreams_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'livestreams' },
        (payload) => {
          console.log('Stream updated:', payload);
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchStreams = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('livestreams')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const live: Livestream[] = [];
      const upcoming: Livestream[] = [];
      const past: Livestream[] = [];

      data?.forEach((stream) => {
        const startTime = new Date(stream.start_time);
        const endTime = stream.end_time ? new Date(stream.end_time) : null;

        // Check if stream is currently live
        if (stream.is_live && (!endTime || now <= endTime)) {
          live.push(stream);
        } 
        // Check if stream is upcoming (starts in the future)
        else if (startTime > now) {
          upcoming.push(stream);
        } 
        // Otherwise it's a past stream
        else {
          past.push(stream);
        }
      });

      setLiveStreams(live);
      setUpcomingStreams(upcoming);
      setPastStreams(past);

      console.log('Streams loaded:', {
        live: live.length,
        upcoming: upcoming.length,
        past: past.length,
      });
    } catch (error: any) {
      console.error('Error fetching streams:', error);
      
      // Check if it's a table not found error
      if (error?.message?.includes('relation "public.livestreams" does not exist')) {
        Alert.alert(
          'Setup Required',
          'The livestreams table has not been created yet. Please run the database migrations from the LIVESTREAMS_SETUP_GUIDE.md file.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to load streams. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserReminders = async () => {
    if (!user) {
      setUserReminders(new Set());
      setSavedStreams([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stream_reminders')
        .select('stream_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const reminderSet = new Set(data?.map(r => r.stream_id) || []);
      setUserReminders(reminderSet);
      console.log('User reminders loaded:', reminderSet.size);

      // Fetch full stream details for saved streams
      if (reminderSet.size > 0) {
        const { data: streamsData, error: streamsError } = await supabase
          .from('livestreams')
          .select('*')
          .in('id', Array.from(reminderSet));

        if (streamsError) throw streamsError;
        setSavedStreams(streamsData || []);
      } else {
        setSavedStreams([]);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const handleSaveForLater = async (streamId: string, streamTitle: string) => {
    if (!user) {
      Alert.alert(
        'Login Required', 
        'Please log in to save streams to watch later.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (userReminders.has(streamId)) {
        // Remove from saved
        const { error } = await supabase
          .from('stream_reminders')
          .delete()
          .eq('user_id', user.id)
          .eq('stream_id', streamId);

        if (error) throw error;

        const newReminders = new Set(userReminders);
        newReminders.delete(streamId);
        setUserReminders(newReminders);
        
        Alert.alert(
          'Removed from Saved', 
          `"${streamTitle}" has been removed from your watch later list.`,
          [{ text: 'OK' }]
        );
      } else {
        // Save for later
        const { error } = await supabase
          .from('stream_reminders')
          .insert({
            user_id: user.id,
            stream_id: streamId,
            reminder_sent: true, // Mark as saved for later (not a reminder)
          });

        if (error) throw error;

        const newReminders = new Set(userReminders);
        newReminders.add(streamId);
        setUserReminders(newReminders);
        
        Alert.alert(
          'Saved for Later!', 
          `"${streamTitle}" has been added to your watch later list. You can find it in your saved streams.`,
          [{ text: 'Got it' }]
        );
      }
    } catch (error: any) {
      console.error('Error saving stream:', error);
      Alert.alert('Error', 'Failed to save stream. Please try again.');
    }
  };

  const handleToggleReminder = async (streamId: string, streamTitle: string) => {
    if (!user) {
      Alert.alert(
        'Login Required', 
        'Please log in to set reminders for upcoming streams.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (userReminders.has(streamId)) {
        // Remove reminder
        const { error } = await supabase
          .from('stream_reminders')
          .delete()
          .eq('user_id', user.id)
          .eq('stream_id', streamId);

        if (error) throw error;

        const newReminders = new Set(userReminders);
        newReminders.delete(streamId);
        setUserReminders(newReminders);
        
        Alert.alert(
          'Reminder Removed', 
          `You will no longer be notified about "${streamTitle}"`,
          [{ text: 'OK' }]
        );
      } else {
        // Add reminder
        const { error } = await supabase
          .from('stream_reminders')
          .insert({
            user_id: user.id,
            stream_id: streamId,
          });

        if (error) throw error;

        const newReminders = new Set(userReminders);
        newReminders.add(streamId);
        setUserReminders(newReminders);
        
        Alert.alert(
          'Reminder Set!', 
          `You will be notified 15 minutes before "${streamTitle}" starts. Make sure to enable notifications in your device settings.`,
          [{ text: 'Got it' }]
        );
      }
    } catch (error: any) {
      console.error('Error toggling reminder:', error);
      
      // Check if it's a table not found error
      if (error?.message?.includes('relation "public.stream_reminders" does not exist')) {
        Alert.alert(
          'Setup Required',
          'The reminders feature is not set up yet. Please run the database migrations from the LIVESTREAMS_SETUP_GUIDE.md file.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to update reminder. Please try again.');
      }
    }
  };

  const handleJoinStream = async (stream: Livestream) => {
    try {
      // Increment viewer count if stream is live
      if (stream.is_live) {
        await incrementViewerCount(stream.id);
        // Refresh streams to show updated count
        fetchStreams(true);
      }
      await Linking.openURL(stream.stream_url);
    } catch (error) {
      Alert.alert('Error', 'Could not open stream URL');
    }
  };

  const handleOpenReplay = async (replayUrl: string) => {
    try {
      await Linking.openURL(replayUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open replay URL');
    }
  };

  const incrementViewerCount = async (streamId: string) => {
    try {
      // Get current viewer count
      const { data: currentStream } = await supabase
        .from('livestreams')
        .select('viewer_count')
        .eq('id', streamId)
        .single();

      if (currentStream) {
        // Increment viewer count
        await supabase
          .from('livestreams')
          .update({ viewer_count: currentStream.viewer_count + 1 })
          .eq('id', streamId);
      }
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  };

  const handleStartStream = () => {
    console.log('FAB button clicked!');
    console.log('User:', user);
    
    if (!user) {
      console.log('No user found, showing login alert');
      Alert.alert(
        'Login Required',
        'Please log in to start a live stream.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('Opening start stream modal');
    setShowStartStreamModal(true);
  };

  const resetStreamForm = () => {
    setStreamForm({
      title: '',
      description: '',
      short_description: '',
      thumbnail_url: '',
      stream_url: '',
      category: '',
      start_now: true,
      scheduled_time: '',
    });
  };

  const handleSubmitStream = async () => {
    // Validate required fields
    if (!streamForm.title.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }
    if (!streamForm.description.trim()) {
      Alert.alert('Error', 'Please enter a stream description');
      return;
    }
    if (!streamForm.stream_url.trim()) {
      Alert.alert('Error', 'Please enter your stream URL (e.g., YouTube, Twitch link)');
      return;
    }

    setSubmitting(true);

    try {
      // Get user profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user!.id)
        .single();

      const now = new Date();
      const startTime = streamForm.start_now 
        ? now.toISOString() 
        : streamForm.scheduled_time || now.toISOString();

      // Create new livestream
      const { data, error } = await supabase
        .from('livestreams')
        .insert({
          title: streamForm.title.trim(),
          description: streamForm.description.trim(),
          short_description: streamForm.short_description.trim() || streamForm.description.trim().substring(0, 100),
          thumbnail_url: streamForm.thumbnail_url.trim() || null,
          stream_url: streamForm.stream_url.trim(),
          host_name: profile?.full_name || user!.email?.split('@')[0] || 'Anonymous',
          host_avatar_url: profile?.avatar_url || null,
          category: streamForm.category.trim() || 'General',
          is_live: streamForm.start_now,
          start_time: startTime,
          viewer_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Stream created:', data);

      Alert.alert(
        streamForm.start_now ? 'Stream Started!' : 'Stream Scheduled!',
        streamForm.start_now 
          ? `Your live stream "${streamForm.title}" is now live! Share your stream link with viewers.`
          : `Your stream "${streamForm.title}" has been scheduled. It will go live at the scheduled time.`,
        [
          {
            text: 'View Stream',
            onPress: () => {
              setShowStartStreamModal(false);
              resetStreamForm();
              fetchStreams(true);
            }
          }
        ]
      );

      setShowStartStreamModal(false);
      resetStreamForm();
      fetchStreams(true);

    } catch (error: any) {
      console.error('Error creating stream:', error);
      Alert.alert('Error', error.message || 'Failed to create stream. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filterStreams = (streams: Livestream[]) => {
    if (!searchQuery) return streams;
    return streams.filter(stream =>
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.host_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const formatStreamTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 1) {
      return `Starts ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffHours > 0) {
      return `Starts in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `Starts in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffMins === 0) {
      return 'Starting now!';
    }
    return date.toLocaleString();
  };

  const renderStreamCard = (stream: Livestream, isPast = false) => (
    <View key={stream.id} style={[styles.streamCard, stream.is_live && styles.liveStreamCard]}>
      {/* Thumbnail */}
      {stream.thumbnail_url && (
        <Image 
          source={{ uri: stream.thumbnail_url }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}

      {/* Live Indicator */}
      {stream.is_live && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}

      {/* Viewer Count for Live Streams */}
      {stream.is_live && (
        <View style={styles.viewerCount}>
          <Users size={14} color="#fff" />
          <Text style={styles.viewerCountText}>{stream.viewer_count.toLocaleString()}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.streamContent}>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <Text style={styles.streamDescription} numberOfLines={2}>
          {stream.short_description || stream.description}
        </Text>

        {/* Host Info */}
        <View style={styles.hostInfo}>
          {stream.host_avatar_url && (
            <Image 
              source={{ uri: stream.host_avatar_url }} 
              style={styles.hostAvatar}
            />
          )}
          <View style={styles.hostDetails}>
            <Text style={styles.hostName}>{stream.host_name}</Text>
            {stream.category && (
              <Text style={styles.category}>{stream.category}</Text>
            )}
          </View>
        </View>

        {/* Time Info */}
        <View style={styles.streamMeta}>
          <Clock size={16} color="#666" />
          <Text style={styles.streamTime}>
            {stream.is_live 
              ? 'Started ' + new Date(stream.start_time).toLocaleTimeString()
              : isPast
              ? new Date(stream.start_time).toLocaleDateString()
              : formatStreamTime(stream.start_time)
            }
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isPast ? (
            <>
              <TouchableOpacity
                style={styles.remindButton}
                onPress={() => handleSaveForLater(stream.id, stream.title)}
              >
                {userReminders.has(stream.id) ? (
                  <>
                    <BellOff size={20} color="#007AFF" />
                    <Text style={styles.remindButtonText}>Saved</Text>
                  </>
                ) : (
                  <>
                    <Bell size={20} color="#007AFF" />
                    <Text style={styles.remindButtonText}>Save for Later</Text>
                  </>
                )}
              </TouchableOpacity>
              {stream.replay_url && (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleOpenReplay(stream.replay_url!)}
                >
                  <Play size={20} color="#fff" />
                  <Text style={styles.joinButtonText}>Watch Replay</Text>
                </TouchableOpacity>
              )}
            </>
          ) : stream.is_live ? (
            <TouchableOpacity
              style={[styles.joinButton, styles.liveJoinButton]}
              onPress={() => handleJoinStream(stream)}
            >
              <ExternalLink size={20} color="#fff" />
              <Text style={styles.joinButtonText}>Join Now</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.remindButton}
                onPress={() => handleToggleReminder(stream.id, stream.title)}
              >
                {userReminders.has(stream.id) ? (
                  <>
                    <BellOff size={20} color="#007AFF" />
                    <Text style={styles.remindButtonText}>Remove Reminder</Text>
                  </>
                ) : (
                  <>
                    <Bell size={20} color="#007AFF" />
                    <Text style={styles.remindButtonText}>Remind Me</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoinStream(stream)}
              >
                <ExternalLink size={20} color="#fff" />
                <Text style={styles.joinButtonText}>Preview</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading streams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 60 }]} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Streams</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => fetchStreams(true)}
          disabled={refreshing}
        >
          <RefreshCw size={24} color={refreshing ? "#ccc" : "#007AFF"} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search streams..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live' && styles.activeTab]}
          onPress={() => {
            setActiveTab('live');
            setSearchQuery(''); // Clear search when switching tabs
          }}
        >
          <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>
            Live & Upcoming ({(liveStreams.length + upcomingStreams.length)})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => {
            setActiveTab('past');
            setSearchQuery(''); // Clear search when switching tabs
          }}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Streams ({pastStreams.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => {
            setActiveTab('saved');
            setSearchQuery(''); // Clear search when switching tabs
          }}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved ({savedStreams.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStreams(true)}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {activeTab === 'live' ? (
          <>
            {/* Live Streams */}
            {filterStreams(liveStreams).length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🔴 Live Now</Text>
                  <Text style={styles.sectionCount}>{filterStreams(liveStreams).length}</Text>
                </View>
                {filterStreams(liveStreams).map(stream => renderStreamCard(stream))}
              </View>
            )}

            {/* Upcoming Streams */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📅 Upcoming</Text>
                <Text style={styles.sectionCount}>{filterStreams(upcomingStreams).length}</Text>
              </View>
              {filterStreams(upcomingStreams).length > 0 ? (
                filterStreams(upcomingStreams).map(stream => renderStreamCard(stream))
              ) : (
                <View style={styles.emptyState}>
                  <Clock size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No streams match your search' : 'No upcoming streams'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'Check back soon for new events!'}
                  </Text>
                </View>
              )}
            </View>

            {/* No live or upcoming streams at all */}
            {liveStreams.length === 0 && upcomingStreams.length === 0 && !searchQuery && (
              <View style={styles.emptyState}>
                <Play size={64} color="#ccc" />
                <Text style={styles.emptyText}>No streams available</Text>
                <Text style={styles.emptySubtext}>Pull down to refresh or check back later</Text>
              </View>
            )}
          </>
        ) : activeTab === 'past' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎬 Past Streams</Text>
              <Text style={styles.sectionCount}>{filterStreams(pastStreams).length}</Text>
            </View>
            {filterStreams(pastStreams).length > 0 ? (
              filterStreams(pastStreams).map(stream => renderStreamCard(stream, true))
            ) : (
              <View style={styles.emptyState}>
                <Play size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No streams match your search' : 'No past streams'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search term' : 'Past streams with replays will appear here'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💾 Saved Streams</Text>
              <Text style={styles.sectionCount}>{filterStreams(savedStreams).length}</Text>
            </View>
            {!user ? (
              <View style={styles.emptyState}>
                <Bell size={48} color="#ccc" />
                <Text style={styles.emptyText}>Login Required</Text>
                <Text style={styles.emptySubtext}>Sign in to save streams and watch them later</Text>
              </View>
            ) : filterStreams(savedStreams).length > 0 ? (
              filterStreams(savedStreams).map(stream => renderStreamCard(stream, true))
            ) : (
              <View style={styles.emptyState}>
                <Bell size={48} color="#ccc" />
                <Text style={styles.emptyText}>No Saved Streams</Text>
                <Text style={styles.emptySubtext}>Click "Save for Later" on any stream to add it here</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Start Live Stream */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('🔴 FAB BUTTON PRESSED!');
          handleStartStream();
        }}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel="Start Live Stream"
        testID="fab-button"
      >
        <Plus size={28} color="#fff" strokeWidth={3} />
      </TouchableOpacity>

      {/* Start Live Stream Modal */}
      <Modal
        visible={showStartStreamModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowStartStreamModal(false);
          resetStreamForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Start Live Stream</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartStreamModal(false);
                    resetStreamForm();
                  }}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Stream Type Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stream Type</Text>
                <View style={styles.streamTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.streamTypeButton,
                      streamForm.start_now && styles.streamTypeButtonActive
                    ]}
                    onPress={() => {
                      console.log('Go Live Now clicked');
                      setStreamForm({ ...streamForm, start_now: true });
                    }}
                    activeOpacity={0.7}
                  >
                    <Play size={20} color={streamForm.start_now ? '#fff' : '#007AFF'} />
                    <Text style={[
                      styles.streamTypeText,
                      streamForm.start_now && styles.streamTypeTextActive
                    ]}>
                      Go Live Now
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.streamTypeButton,
                      !streamForm.start_now && styles.streamTypeButtonActive
                    ]}
                    onPress={() => {
                      console.log('Schedule clicked');
                      setStreamForm({ ...streamForm, start_now: false });
                    }}
                    activeOpacity={0.7}
                  >
                    <Clock size={20} color={!streamForm.start_now ? '#fff' : '#007AFF'} />
                    <Text style={[
                      styles.streamTypeText,
                      !streamForm.start_now && styles.streamTypeTextActive
                    ]}>
                      Schedule
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stream Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter a catchy title for your stream"
                  value={streamForm.title}
                  onChangeText={(text) => setStreamForm({ ...streamForm, title: text })}
                  maxLength={100}
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Music, Gaming, Education, Talk Show"
                  value={streamForm.category}
                  onChangeText={(text) => setStreamForm({ ...streamForm, category: text })}
                  maxLength={50}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Describe what your stream is about..."
                  value={streamForm.description}
                  onChangeText={(text) => setStreamForm({ ...streamForm, description: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Short Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Short Description (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Brief one-liner for the card preview"
                  value={streamForm.short_description}
                  onChangeText={(text) => setStreamForm({ ...streamForm, short_description: text })}
                  maxLength={100}
                />
              </View>

              {/* Stream URL */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stream URL *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://youtube.com/live/... or Twitch link"
                  value={streamForm.stream_url}
                  onChangeText={(text) => setStreamForm({ ...streamForm, stream_url: text })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Text style={styles.formHint}>
                  Your YouTube, Twitch, or other streaming platform link
                </Text>
              </View>

              {/* Thumbnail URL */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Thumbnail URL (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://example.com/thumbnail.jpg"
                  value={streamForm.thumbnail_url}
                  onChangeText={(text) => setStreamForm({ ...streamForm, thumbnail_url: text })}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Text style={styles.formHint}>
                  A cover image for your stream
                </Text>
              </View>

              {/* Scheduled Time (if not starting now) */}
              {!streamForm.start_now && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Scheduled Time *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD HH:MM (e.g., 2025-11-06 15:00)"
                    value={streamForm.scheduled_time}
                    onChangeText={(text) => setStreamForm({ ...streamForm, scheduled_time: text })}
                    autoCapitalize="none"
                  />
                  <Text style={styles.formHint}>
                    Format: YYYY-MM-DD HH:MM (24-hour time)
                  </Text>
                  <Text style={styles.formHint}>
                    Example: {new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 16).replace('T', ' ')}
                  </Text>
                </View>
              )}

              {/* Submit Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowStartStreamModal(false);
                    resetStreamForm();
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitStream}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Play size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {streamForm.start_now ? 'Go Live' : 'Schedule Stream'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  liveStreamCard: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerCount: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  streamContent: {
    padding: 16,
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  streamDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  category: {
    fontSize: 12,
    color: '#007AFF',
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  streamTime: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  liveJoinButton: {
    backgroundColor: '#ff4444',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  remindButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  remindButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  // Floating Action Button Container
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 9999,
    elevation: 9999,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 999999,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalScroll: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  // Stream Type Selection
  streamTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  streamTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  streamTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  streamTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  streamTypeTextActive: {
    color: '#fff',
  },
  // Form Styles
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  formHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});