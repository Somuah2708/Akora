import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Plus, Search, Users, Lock, Globe, Calendar, GraduationCap, ArrowLeft, X, MessageCircle, CheckCircle, Shield, Camera } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase, AVATAR_BUCKET } from '@/lib/supabase';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import CachedImage from '@/components/CachedImage';
import * as ImagePicker from 'expo-image-picker';

interface Circle {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url?: string;
  cover_image?: string;
  is_private: boolean;
  is_official?: boolean;
  is_featured?: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
  post_count?: number;
  is_member?: boolean;
  has_pending_request?: boolean;
  group_chat_id?: string;
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
  circle?: {
    name: string;
    created_by: string;
    group_chat_id?: string;
  };
}

// Tier System: Define which categories are admin-only vs user-created
const ADMIN_ONLY_CATEGORIES = ['Year Groups', 'Class Pages', 'House Groups', 'Centenary', 'Chapters'];
const USER_CATEGORIES = ['Fun Clubs', 'Study Groups', 'Sports', 'Arts'];
const ALL_CATEGORIES = ['All', ...ADMIN_ONLY_CATEGORIES, ...USER_CATEGORIES];

export default function CirclesScreen() {
  const { user, profile } = useAuth();
  
  // Check if user is admin
  const isAdmin = profile?.is_admin === true || profile?.role === 'admin';
  const router = useRouter();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [filteredCircles, setFilteredCircles] = useState<Circle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<{id: string; circleName: string; circleId: string}[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [newCircle, setNewCircle] = useState({
    name: '',
    description: '',
    category: 'Fun Clubs',
    is_private: false,
  });
  const [circleAvatarUri, setCircleAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Categories for filtering (show all categories)
  const categories = ALL_CATEGORIES;
  
  // Categories available for creation (depends on admin status)
  const availableCreateCategories = isAdmin 
    ? [...ADMIN_ONLY_CATEGORIES, ...USER_CATEGORIES] 
    : USER_CATEGORIES;

  useEffect(() => {
    fetchCircles();
    if (user) {
      fetchPendingRequests();
      fetchApprovedRequests();
    }
  }, [user]);

  const filterCircles = useCallback(() => {
    console.log('🔍 Filtering circles:', {
      totalCircles: circles.length,
      searchQuery,
      selectedCategory
    });

    let filtered = circles;

    if (searchQuery.trim()) {
      filtered = filtered.filter(circle =>
        circle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circle.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circle.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('📝 After search filter:', filtered.length, 'circles');
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(circle => circle.category === selectedCategory);
      console.log('🏷️ After category filter:', filtered.length, 'circles');
    }

    console.log('✅ Final filtered circles:', filtered.length);
    setFilteredCircles(filtered);
  }, [circles, searchQuery, selectedCategory]);

  useEffect(() => {
    filterCircles();
  }, [filterCircles]);

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
            // Check membership - use maybeSingle() to avoid error when not found
            const { data: memberData, error: memberError } = await supabase
              .from('circle_members')
              .select('id, role')
              .eq('circle_id', circle.id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (memberError) {
              console.error('❌ Error checking membership for circle', circle.id, ':', memberError);
            }

            is_member = !!memberData;
            console.log('🔍 Membership check:', { circleId: circle.id, circleName: circle.name, userId: user.id, isMember: is_member, memberData });

            // Check pending requests
            if (!is_member && circle.is_private) {
              const { data: requestData } = await supabase
                .from('circle_join_requests')
                .select('id')
                .eq('circle_id', circle.id)
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .maybeSingle();

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCircles();
    if (user) {
      await fetchPendingRequests();
      await fetchApprovedRequests();
    }
    setRefreshing(false);
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      // First get circles created by the current user
      const { data: myCircles, error: circlesError } = await supabase
        .from('circles')
        .select('id')
        .eq('created_by', user.id);

      if (circlesError) throw circlesError;
      
      if (!myCircles || myCircles.length === 0) {
        setPendingRequests([]);
        return;
      }

      const myCircleIds = myCircles.map(c => c.id);

      // Then get pending requests only for those circles
      const { data, error } = await supabase
        .from('circle_join_requests')
        .select(`
          *,
          user_profile:profiles!circle_join_requests_user_id_fkey(username, full_name, avatar_url),
          circle:circles!circle_join_requests_circle_id_fkey(name, created_by, group_chat_id)
        `)
        .eq('status', 'pending')
        .in('circle_id', myCircleIds);

      if (error) throw error;

      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Fetch approved requests for the current user (to show acceptance notifications)
  const fetchApprovedRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('circle_join_requests')
        .select(`
          id,
          circle_id,
          circle:circles!circle_join_requests_circle_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;

      if (data && data.length > 0) {
        setApprovedRequests(
          data.map(req => ({
            id: req.id,
            circleName: (req.circle as any)?.name || 'the circle',
            circleId: req.circle_id,
          }))
        );
      } else {
        setApprovedRequests([]);
      }
    } catch (error) {
      console.error('Error fetching approved requests:', error);
    }
  };

  // Dismiss an approval notification
  const dismissApproval = async (requestId: string) => {
    try {
      // Delete the approved request from database
      await supabase
        .from('circle_join_requests')
        .delete()
        .eq('id', requestId);

      // Remove from local state
      setApprovedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error dismissing approval:', error);
    }
  };

  const pickCircleAvatar = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need camera roll permissions to upload a circle avatar');
          return;
        }
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCircleAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadCircleAvatar = async (circleId: string): Promise<string | null> => {
    if (!circleAvatarUri) return null;
    
    try {
      setUploadingAvatar(true);
      
      // Use expo-file-system to read file as base64
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      const base64 = await readAsStringAsync(circleAvatarUri, { encoding: 'base64' });
      
      // Determine file extension
      const uriParts = circleAvatarUri.split('.');
      const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      
      // Decode base64 to ArrayBuffer
      const { decode } = await import('base64-arraybuffer');
      const arrayBuffer = decode(base64);
      
      const filePath = `circles/${circleId}/${Date.now()}.${ext}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, arrayBuffer, { upsert: true, contentType: mime });
      
      if (uploadError) {
        console.error('Error uploading circle avatar:', uploadError);
        return null;
      }
      
      // Get the public URL
      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading circle avatar:', error);
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const createCircle = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a circle');
      return;
    }

    if (!newCircle.name.trim()) {
      Alert.alert('Error', 'Please enter a circle name');
      return;
    }

    // Check if trying to create admin-only category without admin privileges
    if (ADMIN_ONLY_CATEGORIES.includes(newCircle.category) && !isAdmin) {
      Alert.alert('Permission Denied', 'Only administrators can create Year Groups, Class Pages, and House Groups.');
      return;
    }

    try {
      // Determine if this is an official circle (admin-created or admin-only category)
      const isOfficialCircle = isAdmin && ADMIN_ONLY_CATEGORIES.includes(newCircle.category);
      
      console.log('Creating circle with data:', {
        ...newCircle,
        created_by: user.id,
        is_official: isOfficialCircle,
      });

      // Step 1: Create the group chat first
      const { data: groupChatId, error: groupError } = await supabase.rpc('create_group', {
        p_name: `${newCircle.name} Chat`,
        p_avatar_url: null,
        p_creator_id: user.id,
        p_member_ids: null, // Creator is added automatically
      });

      if (groupError) {
        console.error('Error creating group chat:', groupError);
        // Continue without group chat - we can link it later
      }

      console.log('Group chat created:', groupChatId);

      // Step 2: Create the circle with the group chat linked
      const { data, error } = await supabase
        .from('circles')
        .insert([
          {
            ...newCircle,
            created_by: user.id,
            is_official: isOfficialCircle,
            group_chat_id: groupChatId || null,
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
      const { data: memberData, error: memberError } = await supabase
        .from('circle_members')
        .insert([
          {
            circle_id: data.id,
            user_id: user.id,
            role: 'admin',
          }
        ])
        .select()
        .single();

      if (memberError) {
        console.error('❌ Error adding creator as member:', memberError);
        Alert.alert('Warning', `Circle created but failed to add you as admin: ${memberError.message}`);
      } else {
        console.log('✅ Creator added as admin member:', memberData);
      }

      // Upload avatar if selected
      if (circleAvatarUri) {
        const avatarUrl = await uploadCircleAvatar(data.id);
        if (avatarUrl) {
          // Update circle with avatar URL
          const { error: avatarError } = await supabase
            .from('circles')
            .update({ image_url: avatarUrl })
            .eq('id', data.id);
          
          if (avatarError) {
            console.error('Error updating circle avatar:', avatarError);
          }
        }
      }

      Alert.alert('Success', 'Circle created successfully!');
      setIsCreateModalVisible(false);
      setNewCircle({
        name: '',
        description: '',
        category: 'Fun Clubs',
        is_private: false,
      });
      setCircleAvatarUri(null);
      fetchCircles();
    } catch (error) {
      console.error('Unexpected error creating circle:', error);
      Alert.alert('Unexpected Error', `An unexpected error occurred: ${error.message || 'Unknown error'}`);
    }
  };

  const sendJoinRequestNotification = async (circleId: string, circleName: string, circleCreatorId: string, isPrivate: boolean) => {
    try {
      // Don't send notification if user is the creator
      if (circleCreatorId === user?.id) {
        console.log('⚠️ User is the circle creator, skipping notification');
        return;
      }

      // Create notification for circle admin
      const content = isPrivate 
        ? `requested to join your circle "${circleName}"`
        : `joined your circle "${circleName}"`;

      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            recipient_id: circleCreatorId,
            actor_id: user?.id,
            type: 'circle_join_request',
            content: content,
            post_id: null,
            comment_id: null,
          }
        ]);

      if (error) {
        console.error('Error creating notification:', error);
      } else {
        console.log('✅ Join notification sent to circle admin');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const joinCircle = async (circle: Circle) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a circle');
      return;
    }

    try {
      // First check if already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🔍 Join check - existing member:', { existingMember, memberCheckError });

      if (existingMember) {
        Alert.alert('Already a Member', 'You are already a member of this circle');
        fetchCircles();
        return;
      }

      if (circle.is_private) {
        // Check for existing pending request
        const { data: existingRequest } = await supabase
          .from('circle_join_requests')
          .select('id, status')
          .eq('circle_id', circle.id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingRequest) {
          Alert.alert('Request Pending', 'You already have a pending join request for this circle');
          return;
        }

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

        // Send notification to circle admin
        await sendJoinRequestNotification(circle.id, circle.name, circle.created_by, true);

        Alert.alert('Success', 'Join request sent! The group admin will review your request.');
      } else {
        // Join directly using upsert to handle race conditions
        const { error } = await supabase
          .from('circle_members')
          .upsert([
            {
              circle_id: circle.id,
              user_id: user.id,
              role: 'member',
            }
          ], {
            onConflict: 'circle_id,user_id',
            ignoreDuplicates: true,
          });

        if (error) throw error;

        // Also add to group chat if it exists
        if (circle.group_chat_id) {
          await supabase
            .from('group_members')
            .upsert({
              group_id: circle.group_chat_id,
              user_id: user.id,
              role: 'member',
            }, {
              onConflict: 'group_id,user_id',
              ignoreDuplicates: true,
            });
        }

        // Send notification to circle admin about new member
        await sendJoinRequestNotification(circle.id, circle.name, circle.created_by, false);

        Alert.alert('Success', 'You have joined the circle!');
      }

      fetchCircles();
    } catch (error: any) {
      console.error('Error joining circle:', error);
      // Handle duplicate key error gracefully
      if (error.code === '23505') {
        Alert.alert('Already a Member', 'You are already a member of this circle');
        fetchCircles();
      } else {
        Alert.alert('Error', error.message || 'Failed to join circle');
      }
    }
  };

  const openCircleChat = async (circleId: string) => {
    try {
      // Get the chat associated with this circle
      const { data: chat, error } = await supabase
        .from('chats')
        .select('id')
        .eq('circle_id', circleId)
        .single();

      if (error) {
        console.error('Error fetching circle chat:', error);
        Alert.alert('Error', 'Could not find circle chat');
        return;
      }

      if (chat) {
        debouncedRouter.push(`/chat/${chat.id}`);
      } else {
        Alert.alert('Info', 'Chat not found for this circle');
      }
    } catch (error) {
      console.error('Error opening circle chat:', error);
      Alert.alert('Error', 'Failed to open chat');
    }
  };

  const openGroupChat = (circle: Circle) => {
    if (!circle.group_chat_id) {
      Alert.alert('Info', 'Group chat is being set up for this circle');
      return;
    }
    
    console.log('Opening group chat for circle:', circle.name, 'Group ID:', circle.group_chat_id);
    debouncedRouter.push(`/chat/group/${circle.group_chat_id}`);
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

        // Also add to the circle's group chat if it exists
        if (request.circle?.group_chat_id) {
          const { error: groupError } = await supabase
            .from('group_members')
            .upsert({
              group_id: request.circle.group_chat_id,
              user_id: request.user_id,
              role: 'member',
            }, {
              onConflict: 'group_id,user_id',
              ignoreDuplicates: true,
            });
          
          if (groupError) {
            console.error('Error adding approved user to group chat:', groupError);
            // Don't fail the whole operation
          }
        }

        // Send approval notification to user
        await supabase
          .from('notifications')
          .insert([
            {
              recipient_id: request.user_id,
              actor_id: user?.id,
              type: 'circle_join_approved',
              content: `approved your request to join "${request.circle?.name || 'the circle'}"`,
              post_id: null,
              comment_id: null,
            }
          ]);
      } else {
        // Send rejection notification to user
        await supabase
          .from('notifications')
          .insert([
            {
              recipient_id: request.user_id,
              actor_id: user?.id,
              type: 'circle_join_rejected',
              content: `declined your request to join "${request.circle?.name || 'the circle'}"`,
              post_id: null,
              comment_id: null,
            }
          ]);
      }

      // Update request status
      await supabase
        .from('circle_join_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', requestId);

      Alert.alert('Success', `Request ${action}d successfully! User has been notified.`);
      fetchPendingRequests();
      fetchCircles();
    } catch (error) {
      console.error('Error handling join request:', error);
      Alert.alert('Error', 'Failed to process request');
    }
  };

  const renderCircleCard = (circle: Circle) => {
    // Determine if this is an official/admin-created circle
    const isOfficialCircle = circle.is_official || ADMIN_ONLY_CATEGORIES.includes(circle.category);
    
    console.log('🎨 Rendering circle card:', { name: circle.name, image_url: circle.image_url });
    
    return (
      <TouchableOpacity 
        key={circle.id} 
        style={[styles.circleCard, isOfficialCircle && styles.officialCircleCard]}
        onPress={() => {
          console.log('🔵 Circle card pressed, navigating to:', `/circles/${circle.id}`);
          debouncedRouter.push(`/circles/${circle.id}`);
        }}
        activeOpacity={0.7}
      >
        {/* Official Badge */}
        {isOfficialCircle && (
          <View style={styles.officialBadge}>
            <Shield size={12} color="#FFFFFF" />
            <Text style={styles.officialBadgeText}>Official</Text>
          </View>
        )}
        
        <View style={styles.circleHeader}>
          {/* Circle Avatar */}
          <View style={styles.circleAvatarContainer}>
            {circle.image_url ? (
              <CachedImage 
                source={{ uri: circle.image_url }} 
                style={styles.circleAvatar}
                onError={(e: any) => console.log('❌ Circle list avatar error:', circle.name, e)}
              />
            ) : (
              <View style={styles.circleAvatarPlaceholder}>
                <Users size={24} color="#ffc857" />
              </View>
            )}
          </View>
          
          <View style={styles.circleInfo}>
            <View style={styles.circleTitleRow}>
              <Text style={styles.circleTitle} numberOfLines={1}>{circle.name}</Text>
              {isOfficialCircle && (
                <CheckCircle size={18} color="#ffc857" style={{ marginLeft: 4, flexShrink: 0 }} />
              )}
              {circle.is_private && <Lock size={16} color="#666" style={{ marginLeft: 4, flexShrink: 0 }} />}
            </View>
            <View style={styles.categoryBadgeRow}>
              <View style={[styles.categoryBadge, isOfficialCircle && styles.officialCategoryBadge]}>
                <Text style={[styles.categoryBadgeText, isOfficialCircle && styles.officialCategoryBadgeText]}>
                  {circle.category}
                </Text>
              </View>
              {circle.is_featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
              )}
            </View>
            <Text style={styles.circleDescription} numberOfLines={2}>{circle.description}</Text>
          </View>
        </View>
      
      <View style={styles.circleFooter}>
        <View style={styles.memberCount}>
          <Users size={16} color="#666" />
          <Text style={styles.memberCountText}>{circle.member_count} members</Text>
        </View>
        
        <View style={styles.circleActions}>
          {circle.is_member ? (
            <>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={(e) => {
                  e.stopPropagation();
                  openGroupChat(circle);
                }}
              >
                <MessageCircle size={16} color="#007AFF" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedText}>Joined</Text>
              </View>
            </>
          ) : circle.has_pending_request ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={(e) => {
                e.stopPropagation();
                joinCircle(circle);
              }}
            >
              <Text style={styles.joinButtonText}>
                {circle.is_private ? 'Request to Join' : 'Join'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const myCircles = filteredCircles.filter(circle => circle.created_by === user?.id);
  const otherCircles = filteredCircles.filter(circle => circle.created_by !== user?.id);

  // Show blank screen with centered spinner when refreshing
  if (refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.refreshingContainer}>
          <ActivityIndicator size="large" color="#ffc857" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffc857"
            colors={['#ffc857']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.push('/(tabs)')} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Circles, Fun Clubs & Groups</Text>
            <Text style={styles.headerSubtitle}>Connect with your community</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search circles..."
            value={searchQuery}
            onChangeText={(text) => {
              console.log('🔤 Search text changed:', text);
              setSearchQuery(text);
            }}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                console.log('🗑️ Clearing search');
                setSearchQuery('');
              }}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search Results Info */}
        {(searchQuery.trim() || selectedCategory !== 'All') && (
          <View style={styles.searchInfo}>
            <Text style={styles.searchInfoText}>
              Found {filteredCircles.length} circle{filteredCircles.length !== 1 ? 's' : ''}
              {searchQuery.trim() && ` matching "${searchQuery}"`}
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </Text>
          </View>
        )}

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

        {/* Approved Requests Banner - Show when user's join request was accepted */}
        {approvedRequests.length > 0 && (
          <View style={styles.approvalBannersContainer}>
            {approvedRequests.map((approval) => (
              <View key={approval.id} style={styles.approvalBanner}>
                <View style={styles.approvalBannerContent}>
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.approvalBannerText}>
                    Your request to join "{approval.circleName}" was approved!
                  </Text>
                </View>
                <View style={styles.approvalBannerActions}>
                  <TouchableOpacity 
                    style={styles.approvalViewButton}
                    onPress={() => {
                      dismissApproval(approval.id);
                      debouncedRouter.push(`/circles/${approval.circleId}`);
                    }}
                  >
                    <Text style={styles.approvalViewButtonText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.approvalBannerClose}
                    onPress={() => dismissApproval(approval.id)}
                  >
                    <X size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

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
                    <TouchableOpacity
                      style={styles.requestUserSection}
                      onPress={() => debouncedRouter.push(`/user-profile/${request.user_id}`)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri: request.user_profile?.avatar_url || 
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(request.user_profile?.full_name || 'U')}&background=6366F1&color=fff`
                        }}
                        style={styles.requestAvatar}
                      />
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestUser} numberOfLines={1}>
                          {request.user_profile?.full_name || request.user_profile?.username || 'Unknown User'}
                        </Text>
                        <Text style={styles.requestCircle} numberOfLines={1}>
                          wants to join "{request.circle?.name || 'your circle'}"
                        </Text>
                      </View>
                    </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>My Circles ({myCircles.length})</Text>
            {myCircles.map(renderCircleCard)}
          </View>
        )}

        {/* All Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {myCircles.length > 0 ? `Discover More (${otherCircles.length})` : `All Circles (${otherCircles.length})`}
          </Text>
          {otherCircles.length > 0 ? (
            otherCircles.map(renderCircleCard)
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory !== 'All' 
                  ? 'No circles match your search' 
                  : 'No circles found'}
              </Text>
              {(searchQuery || selectedCategory !== 'All') && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsCreateModalVisible(true)}
      >
        <Plus size={24} color="#0F172A" />
      </TouchableOpacity>

      {/* Create Circle Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setIsCreateModalVisible(false);
              setCircleAvatarUri(null);
            }}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Circle</Text>
            <TouchableOpacity onPress={createCircle} disabled={uploadingAvatar}>
              <Text style={[styles.createButton, uploadingAvatar && { opacity: 0.5 }]}>
                {uploadingAvatar ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* Avatar Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Circle Avatar</Text>
              <TouchableOpacity 
                style={styles.avatarPickerContainer} 
                onPress={pickCircleAvatar}
                disabled={uploadingAvatar}
              >
                {circleAvatarUri ? (
                  <Image 
                    source={{ uri: circleAvatarUri }} 
                    style={styles.avatarPreview} 
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Camera size={32} color="#666" />
                    <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                  </View>
                )}
                {uploadingAvatar && (
                  <View style={styles.avatarUploadingOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              {circleAvatarUri && (
                <TouchableOpacity 
                  style={styles.removeAvatarButton}
                  onPress={() => setCircleAvatarUri(null)}
                >
                  <Text style={styles.removeAvatarText}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>

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
              <Text style={styles.label}>Description (Optional)</Text>
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
              {!isAdmin && (
                <View style={styles.adminOnlyNotice}>
                  <Shield size={14} color="#D97706" />
                  <Text style={styles.adminOnlyNoticeText}>
                    Year Groups, Class Pages, and House Groups can only be created by admins
                  </Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableCreateCategories.map((category) => {
                  const isAdminCategory = ADMIN_ONLY_CATEGORIES.includes(category);
                  const isSelected = newCircle.category === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        isAdminCategory && styles.adminCategoryOption,
                        isSelected && (isAdminCategory ? styles.adminCategoryOptionActive : styles.categoryOptionActive),
                      ]}
                      onPress={() => setNewCircle({ ...newCircle, category })}
                    >
                      {isAdminCategory && (
                        <Shield 
                          size={12} 
                          color={isSelected ? '#0F172A' : '#ffc857'} 
                          style={{ marginRight: 4 }} 
                        />
                      )}
                      <Text style={[
                        styles.categoryOptionText,
                        isSelected && (isAdminCategory ? styles.adminCategoryOptionTextActive : styles.categoryOptionTextActive)
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  refreshingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
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
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  searchInfoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
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
    flexGrow: 1,
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
    color: '#ffc857',
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
    position: 'relative',
  },
  officialCircleCard: {
    borderColor: '#ffc857',
    borderWidth: 2,
    backgroundColor: '#FFFDF7',
  },
  officialBadge: {
    position: 'absolute',
    top: -1,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffc857',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 4,
    zIndex: 10,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#B8860B',
    fontWeight: '600',
  },
  officialCategoryBadge: {
    backgroundColor: '#FEF3C7',
  },
  officialCategoryBadgeText: {
    color: '#D97706',
  },
  featuredBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },
  circleHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  circleAvatarContainer: {
    marginRight: 12,
  },
  circleAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  circleAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  circleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'nowrap',
  },
  circleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
    flex: 1,
    flexShrink: 1,
  },
  circleCategory: {
    fontSize: 14,
    color: '#0F172A',
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
  circleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ffc857',
  },
  chatButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#0F172A',
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  requestUserSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  requestInfo: {
    flex: 1,
  },
  requestUser: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  requestCircle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'column',
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffc857',
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
    color: '#ffc857',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  avatarPickerContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  removeAvatarButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  removeAvatarText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryOptionActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  adminCategoryOption: {
    borderColor: '#ffc857',
    backgroundColor: '#FFFBEB',
  },
  adminCategoryOptionActive: {
    backgroundColor: '#ffc857',
    borderColor: '#ffc857',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  adminCategoryOptionTextActive: {
    color: '#0F172A',
  },
  adminOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  adminOnlyNoticeText: {
    fontSize: 12,
    color: '#D97706',
    flex: 1,
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
    backgroundColor: '#ffc857',
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
  approvalBannersContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  approvalBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  approvalBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  approvalBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalViewButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approvalViewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  approvalBannerClose: {
    padding: 4,
  },
});