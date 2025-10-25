import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { Plus, Search, Users, Lock, Globe, Calendar, GraduationCap } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Circle {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  has_pending_request?: boolean;
}

interface JoinRequest {
  id: string;
  circle_id: string;
  user_id: string;
  status: string;
  created_at: string;
  user_profile?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function CirclesScreen() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [filteredCircles, setFilteredCircles] = useState<Circle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  
  // Form state
  const [newCircle, setNewCircle] = useState({
    name: '',
    description: '',
    category: 'Fun Clubs',
    is_private: false,
  });

  const categories = ['All', 'Fun Clubs', 'Year Groups', 'Class Pages', 'House Groups', 'Study Groups', 'Sports', 'Arts'];

  useEffect(() => {
    fetchCircles();
    if (user) {
      fetchPendingRequests();
    }
  }, [user]);

  useEffect(() => {
    filterCircles();
  }, [circles, searchQuery, selectedCategory]);

  const fetchCircles = async () => {
    try {
      let query = supabase
        .from('circles')
        .select(`
          *,
          circle_members!inner(count)
        `);

      const { data, error } = await query;

      if (error) throw error;

      // Get membership status for each circle
      const circlesWithStatus = await Promise.all(
        (data || []).map(async (circle) => {
          let is_member = false;
          let has_pending_request = false;

          if (user) {
            // Check membership
            const { data: memberData } = await supabase
              .from('circle_members')
              .select('*')
              .eq('circle_id', circle.id)
              .eq('user_id', user.id)
              .single();

            is_member = !!memberData;

            // Check pending requests
            if (!is_member && circle.is_private) {
              const { data: requestData } = await supabase
                .from('circle_join_requests')
                .select('*')
                .eq('circle_id', circle.id)
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .single();

              has_pending_request = !!requestData;
            }
          }

          return {
            ...circle,
            member_count: circle.circle_members?.length || 0,
            is_member,
            has_pending_request,
          };
        })
      );

      setCircles(circlesWithStatus);
    } catch (error) {
      console.error('Error fetching circles:', error);
      Alert.alert('Error', 'Failed to load circles');
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('circle_join_requests')
        .select(`
          *,
          profiles!circle_join_requests_user_id_fkey(username, full_name, avatar_url),
          circles!circle_join_requests_circle_id_fkey(name, created_by)
        `)
        .eq('status', 'pending')
        .eq('circles.created_by', user.id);

      if (error) throw error;

      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const filterCircles = () => {
    let filtered = circles;

    if (searchQuery) {
      filtered = filtered.filter(circle =>
        circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circle.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circle.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(circle => circle.category === selectedCategory);
    }

    setFilteredCircles(filtered);
  };

  const createCircle = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a circle');
      return;
    }

    if (!newCircle.name.trim() || !newCircle.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      console.log('Creating circle with data:', {
        ...newCircle,
        created_by: user.id,
      });
      
      const { data, error } = await supabase
        .from('circles')
        .insert([
          {
            ...newCircle,
            created_by: user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating circle:', error);
        Alert.alert('Error Creating Circle', `Failed to create circle: ${error.message}`);
        return;
      }

      if (!data) {
        Alert.alert('Error', 'Circle was created but no data was returned');
        return;
      }

      console.log('Circle created successfully:', data);

      // Add creator as member
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert([
          {
            circle_id: data.id,
            user_id: user.id,
            role: 'admin',
          }
        ]);

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
        Alert.alert('Warning', `Circle created but failed to add you as admin: ${memberError.message}`);
        // Continue with success flow since circle was created
      }

      Alert.alert('Success', 'Circle created successfully!');
      setIsCreateModalVisible(false);
      setNewCircle({
        name: '',
        description: '',
        category: 'Fun Clubs',
        is_private: false,
      });
      fetchCircles();
    } catch (error) {
      console.error('Unexpected error creating circle:', error);
      Alert.alert('Unexpected Error', `An unexpected error occurred: ${error.message || 'Unknown error'}`);
    }
  };

  const joinCircle = async (circle: Circle) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a circle');
      return;
    }

    try {
      if (circle.is_private) {
        // Create join request
        const { error } = await supabase
          .from('circle_join_requests')
          .insert([
            {
              circle_id: circle.id,
              user_id: user.id,
            }
          ]);

        if (error) throw error;

        Alert.alert('Success', 'Join request sent! The group admin will review your request.');
      } else {
        // Join directly
        const { error } = await supabase
          .from('circle_members')
          .insert([
            {
              circle_id: circle.id,
              user_id: user.id,
            }
          ]);

        if (error) throw error;

        Alert.alert('Success', 'You have joined the circle!');
      }

      fetchCircles();
    } catch (error) {
      console.error('Error joining circle:', error);
      Alert.alert('Error', 'Failed to join circle');
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const request = pendingRequests.find(r => r.id === requestId);
      if (!request) return;

      if (action === 'approve') {
        // Add user to circle members
        await supabase
          .from('circle_members')
          .insert([
            {
              circle_id: request.circle_id,
              user_id: request.user_id,
            }
          ]);
      }

      // Update request status
      await supabase
        .from('circle_join_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', requestId);

      Alert.alert('Success', `Request ${action}d successfully!`);
      fetchPendingRequests();
      fetchCircles();
    } catch (error) {
      console.error('Error handling join request:', error);
      Alert.alert('Error', 'Failed to process request');
    }
  };

  const renderCircleCard = (circle: Circle) => (
    <View key={circle.id} style={styles.circleCard}>
      <View style={styles.circleHeader}>
        <View style={styles.circleInfo}>
          <View style={styles.circleTitleRow}>
            <Text style={styles.circleTitle}>{circle.name}</Text>
            {circle.is_private && <Lock size={16} color="#666" />}
          </View>
          <Text style={styles.circleCategory}>{circle.category}</Text>
          <Text style={styles.circleDescription}>{circle.description}</Text>
        </View>
      </View>
      
      <View style={styles.circleFooter}>
        <View style={styles.memberCount}>
          <Users size={16} color="#666" />
          <Text style={styles.memberCountText}>{circle.member_count} members</Text>
        </View>
        
        {circle.is_member ? (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        ) : circle.has_pending_request ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => joinCircle(circle)}
          >
            <Text style={styles.joinButtonText}>
              {circle.is_private ? 'Request to Join' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const myCircles = circles.filter(circle => circle.created_by === user?.id);
  const otherCircles = filteredCircles.filter(circle => circle.created_by !== user?.id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <ScrollView style={styles.header}>
        <Text style={styles.headerTitle}>Circles, Fun Clubs & Groups</Text>
        <Text style={styles.headerSubtitle}>Connect with your community</Text>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search circles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category && styles.categoryButtonTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowRequests(!showRequests)}
            >
              <Text style={styles.sectionTitle}>
                Pending Requests ({pendingRequests.length})
              </Text>
              <Text style={styles.toggleText}>{showRequests ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            
            {showRequests && (
              <View style={styles.requestsList}>
                {pendingRequests.map((request) => (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestUser}>
                        {request.user_profile?.full_name || request.user_profile?.username}
                      </Text>
                      <Text style={styles.requestCircle}>wants to join your circle</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleJoinRequest(request.id, 'approve')}
                      >
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleJoinRequest(request.id, 'reject')}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* My Circles */}
        {myCircles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Circles</Text>
            {myCircles.map(renderCircleCard)}
          </View>
        )}

        {/* All Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {myCircles.length > 0 ? 'Discover More' : 'All Circles'}
          </Text>
          {otherCircles.length > 0 ? (
            otherCircles.map(renderCircleCard)
          ) : (
            <Text style={styles.emptyText}>No circles found</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsCreateModalVisible(true)}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Circle Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Circle</Text>
            <TouchableOpacity onPress={createCircle}>
              <Text style={styles.createButton}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Circle Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter circle name"
                value={newCircle.name}
                onChangeText={(text) => setNewCircle({ ...newCircle, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your circle"
                value={newCircle.description}
                onChangeText={(text) => setNewCircle({ ...newCircle, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.slice(1).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryOption,
                      newCircle.category === category && styles.categoryOptionActive
                    ]}
                    onPress={() => setNewCircle({ ...newCircle, category })}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      newCircle.category === category && styles.categoryOptionTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.privacyToggle}
                onPress={() => setNewCircle({ ...newCircle, is_private: !newCircle.is_private })}
              >
                <View style={styles.privacyInfo}>
                  {newCircle.is_private ? <Lock size={20} color="#007AFF" /> : <Globe size={20} color="#007AFF" />}
                  <View style={styles.privacyText}>
                    <Text style={styles.privacyTitle}>
                      {newCircle.is_private ? 'Private Circle' : 'Public Circle'}
                    </Text>
                    <Text style={styles.privacyDescription}>
                      {newCircle.is_private 
                        ? 'Users must request to join and be approved'
                        : 'Anyone can join immediately'
                      }
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.toggle,
                  newCircle.is_private && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    newCircle.is_private && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  circleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  circleHeader: {
    marginBottom: 12,
  },
  circleInfo: {
    flex: 1,
  },
  circleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  circleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  circleCategory: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  circleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  circleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  joinedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  requestsList: {
    paddingHorizontal: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  requestInfo: {
    flex: 1,
  },
  requestUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestCircle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 32,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  createButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  privacyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});