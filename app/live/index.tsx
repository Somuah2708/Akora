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
} from 'react-native';
import { Search, Plus, ArrowLeft, Settings, Play, Users, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface StreamData {
  id: string;
  title: string;
  host: string;
  scheduledFor: string;
  streamUrl: string;
  thumbnailUrl?: string;
  user: {
    username: string;
    full_name: string;
  };
}

export default function LiveStreamScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveStreams, setLiveStreams] = useState<StreamData[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<StreamData[]>([]);
  const [pastStreams, setPastStreams] = useState<StreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');

  // Form states
  const [streamTitle, setStreamTitle] = useState('');
  const [streamHost, setStreamHost] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select(`
          id,
          title,
          description,
          created_at,
          profiles:user_id (
            username,
            full_name
          )
        `)
        .eq('is_approved', true)
        .like('category_name', 'Livestream%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const live: StreamData[] = [];
      const upcoming: StreamData[] = [];
      const past: StreamData[] = [];

      data?.forEach((item) => {
        try {
          const streamData = JSON.parse(item.description);
          const scheduledDate = new Date(streamData.scheduledFor);
          const endTime = new Date(scheduledDate.getTime() + (streamData.duration || 60) * 60000);

          const stream: StreamData = {
            id: item.id,
            title: item.title,
            host: streamData.host,
            scheduledFor: streamData.scheduledFor,
            streamUrl: streamData.streamUrl,
            thumbnailUrl: streamData.thumbnailUrl,
            user: item.profiles,
          };

          if (scheduledDate <= now && now <= endTime) {
            live.push(stream);
          } else if (scheduledDate > now) {
            upcoming.push(stream);
          } else {
            past.push(stream);
          }
        } catch (parseError) {
          console.error('Error parsing stream data:', parseError);
        }
      });

      setLiveStreams(live);
      setUpcomingStreams(upcoming);
      setPastStreams(past);
    } catch (error) {
      console.error('Error fetching streams:', error);
      Alert.alert('Error', 'Failed to load streams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitStream = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to submit a stream');
      return;
    }

    if (!streamTitle || !streamHost || !streamUrl || !scheduledDate || !scheduledTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      
      const streamData = {
        host: streamHost,
        streamUrl: streamUrl,
        scheduledFor: scheduledFor,
        duration: 60,
        thumbnailUrl: thumbnailUrl || null,
      };

      const { error } = await supabase
        .from('products_services')
        .insert({
          user_id: user.id,
          title: streamTitle,
          description: JSON.stringify(streamData),
          category_name: 'Livestream',
          is_approved: false,
        });

      if (error) throw error;

      Alert.alert('Success', 'Stream submitted for approval!');
      setShowModal(false);
      resetForm();
      fetchStreams();
    } catch (error) {
      console.error('Error submitting stream:', error);
      Alert.alert('Error', 'Failed to submit stream');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStreamTitle('');
    setStreamHost('');
    setStreamUrl('');
    setScheduledDate('');
    setScheduledTime('');
    setThumbnailUrl('');
  };

  const filterStreams = (streams: StreamData[]) => {
    if (!searchQuery) return streams;
    return streams.filter(stream =>
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderStreamCard = (stream: StreamData, isLive = false) => (
    <TouchableOpacity
      key={stream.id}
      style={[styles.streamCard, isLive && styles.liveStreamCard]}
      onPress={() => {
        // Open stream URL
        console.log('Opening stream:', stream.streamUrl);
      }}
    >
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <Text style={styles.streamHost}>by {stream.host}</Text>
        <View style={styles.streamMeta}>
          <Clock size={16} color="#666" />
          <Text style={styles.streamTime}>
            {new Date(stream.scheduledFor).toLocaleString()}
          </Text>
        </View>
      </View>
      {isLive && (
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </TouchableOpacity>
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
      <View style={[styles.header, { paddingTop: 60 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Streams</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Plus size={24} color="#007AFF" />
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
          onPress={() => setActiveTab('live')}
        >
          <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>
            Live & Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Streams
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'live' ? (
          <>
            {/* Live Streams */}
            {filterStreams(liveStreams).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Live Now</Text>
                {filterStreams(liveStreams).map(stream => renderStreamCard(stream, true))}
              </View>
            )}

            {/* Upcoming Streams */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {filterStreams(upcomingStreams).length > 0 ? (
                filterStreams(upcomingStreams).map(stream => renderStreamCard(stream))
              ) : (
                <Text style={styles.emptyText}>No upcoming streams</Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Streams</Text>
            {filterStreams(pastStreams).length > 0 ? (
              filterStreams(pastStreams).map(stream => renderStreamCard(stream))
            ) : (
              <Text style={styles.emptyText}>No past streams</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Submit Stream Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Stream</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Stream Title *</Text>
              <TextInput
                style={styles.input}
                value={streamTitle}
                onChangeText={setStreamTitle}
                placeholder="Enter stream title"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Host/Organizer *</Text>
              <TextInput
                style={styles.input}
                value={streamHost}
                onChangeText={setStreamHost}
                placeholder="Enter host name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Stream URL *</Text>
              <TextInput
                style={styles.input}
                value={streamUrl}
                onChangeText={setStreamUrl}
                placeholder="https://youtube.com/watch?v=..."
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Time *</Text>
                <TextInput
                  style={styles.input}
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  placeholder="HH:MM"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Thumbnail URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={thumbnailUrl}
                onChangeText={setThumbnailUrl}
                placeholder="https://example.com/thumbnail.jpg"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.infoText}>
              Your stream will be reviewed by administrators before going live.
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitStream}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit for Approval</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
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
  addButton: {
    padding: 8,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  streamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  liveStreamCard: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  streamInfo: {
    flex: 1,
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  streamHost: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formGroupHalf: {
    flex: 0.48,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});