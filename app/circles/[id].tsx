import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { 
  ArrowLeft, 
  Users, 
  Lock, 
  Globe, 
  Calendar, 
  MessageCircle, 
  UserPlus, 
  X,
  CheckCircle,
  Shield,
  ThumbsUp,
  MessageSquare,
  Send,
  Pin,
  Trash2,
  Camera,
  Image as ImageIcon,
  Paperclip,
  FileText,
  MoreVertical,
  UserMinus,
  Crown,
  UserCheck,
  Play,
  Film,
  Edit2,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import CachedImage from '@/components/CachedImage';
import { pickMedia, uploadMedia, pickDocument } from '@/lib/media';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  user_role?: string;
  group_chat_id?: string;
  creator_profile?: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface Post {
  id: string;
  content: string;
  images?: string[];
  videos?: string[];
  attachments?: {
    url: string;
    name: string;
    type: string;
  }[];
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  user_profile?: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
}

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
  mimeType?: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
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

type TabType = 'feed' | 'members' | 'about';

export default function CircleDetailScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams();
  
  // Ensure id is always a string (useLocalSearchParams can return string | string[])
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  
  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postingContent, setPostingContent] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Media viewer state
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerItems, setMediaViewerItems] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  
  // Carousel state for posts
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  
  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Join requests state (for admins)
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  
  // Member management state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  // Approval banner state
  const [showApprovalBanner, setShowApprovalBanner] = useState(false);
  const [approvalBannerMessage, setApprovalBannerMessage] = useState('');
  
  // Edit circle state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCircleName, setEditCircleName] = useState('');
  const [editCircleDescription, setEditCircleDescription] = useState('');
  const [savingCircleEdit, setSavingCircleEdit] = useState(false);

  const isAdmin = profile?.is_admin === true || profile?.role === 'admin';
  const isCircleAdmin = circle?.user_role === 'admin' || circle?.created_by === user?.id;
  const canManage = isAdmin || isCircleAdmin;
  const isCreator = circle?.created_by === user?.id;

  // Wait for both id AND user to be available before fetching
  useEffect(() => {
    if (id && user) {
      console.log('📍 useEffect triggered - id and user ready:', { id, userId: user.id });
      fetchCircleDetails();
    } else {
      console.log('📍 useEffect waiting - id:', id, 'user:', user?.id || 'null');
    }
  }, [id, user]);

  // Refresh data when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (id && user) {
        console.log('📍 useFocusEffect - screen focused, refreshing');
        fetchCircleDetails();
      }
    }, [id, user])
  );

  useEffect(() => {
    if (circle?.is_member) {
      if (activeTab === 'feed') {
        fetchPosts();
      } else if (activeTab === 'members') {
        fetchMembers();
      }
    }
  }, [activeTab, circle?.is_member]);

  // Fetch pending requests for circle admins
  useEffect(() => {
    if (canManage && circle?.is_private && id) {
      fetchPendingRequests();
    }
  }, [canManage, circle?.is_private, id]);

  const fetchCircleDetails = async () => {
    try {
      setLoading(true);
      
      console.log('📍 fetchCircleDetails called with id:', id, 'type:', typeof id);
      
      if (!id) {
        console.error('❌ No circle ID provided');
        Alert.alert('Error', 'No circle ID provided');
        debouncedRouter.back();
        return;
      }
      
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select(`
          *,
          creator_profile:profiles!created_by(full_name, username, avatar_url)
        `)
        .eq('id', id)
        .single();

      console.log('📍 Circle data fetched:', { circleData, circleError });

      if (circleError) throw circleError;

      let isMember = false;
      let hasPendingRequest = false;
      let userRole = '';
      
      if (user) {
        console.log('📍 Checking membership for user:', user.id, 'in circle:', id);
        
        // Check membership - use maybeSingle() to avoid error when not found
        const { data: memberData, error: memberError } = await supabase
          .from('circle_members')
          .select('id, role')
          .eq('circle_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        console.log('🔍 Membership check result:', { 
          circleId: id, 
          userId: user.id, 
          memberData, 
          memberError,
          isMember: !!memberData,
          isCreator: circleData.created_by === user.id
        });
        
        // Self-heal: If user is the creator but not in members table, add them
        if (!memberData && circleData.created_by === user.id) {
          console.log('🔧 Self-healing: Adding creator as admin member');
          const { error: insertError } = await supabase
            .from('circle_members')
            .insert({
              circle_id: id,
              user_id: user.id,
              role: 'admin',
            });
          
          if (!insertError) {
            isMember = true;
            userRole = 'admin';
            console.log('✅ Creator added as admin member');
          } else {
            console.error('❌ Failed to add creator as member:', insertError);
          }
        } else {
          isMember = !!memberData;
          userRole = memberData?.role || '';
          console.log('📍 Setting isMember to:', isMember, 'userRole:', userRole);
        }

        if (!isMember && circleData.is_private) {
          const { data: requestData } = await supabase
            .from('circle_join_requests')
            .select('id, status')
            .eq('circle_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          // Check if request was approved (user became member but request still exists)
          if (requestData?.status === 'approved' && isMember) {
            // Show approval banner
            setShowApprovalBanner(true);
            setApprovalBannerMessage(`Your request to join "${circleData.name}" was approved!`);
          }
          
          hasPendingRequest = requestData?.status === 'pending';
        }
        
        // Also check if user just became a member (approved request scenario)
        if (isMember && circleData.is_private) {
          const { data: approvedRequest } = await supabase
            .from('circle_join_requests')
            .select('id, status')
            .eq('circle_id', id)
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();
          
          if (approvedRequest) {
            // Show approval banner
            setShowApprovalBanner(true);
            setApprovalBannerMessage(`Your request to join "${circleData.name}" was approved!`);
            
            // Clean up - delete the approved request after showing banner
            // We do this so the banner doesn't show every time
            await supabase
              .from('circle_join_requests')
              .delete()
              .eq('id', approvedRequest.id);
          }
        }
      }

      const { count } = await supabase
        .from('circle_members')
        .select('*', { count: 'exact', head: true })
        .eq('circle_id', id);

      setCircle({
        ...circleData,
        member_count: count || 0,
        is_member: isMember,
        has_pending_request: hasPendingRequest,
        user_role: userRole,
      });

      if (isMember) {
        fetchPosts();
      }
    } catch (error: any) {
      console.error('Error fetching circle:', error);
      Alert.alert('Error', 'Failed to load circle details');
      debouncedRouter.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!id) return;
    
    try {
      setLoadingPosts(true);
      
      const { data, error } = await supabase
        .from('circle_posts')
        .select(`
          *,
          user_profile:profiles!user_id(full_name, username, avatar_url)
        `)
        .eq('circle_id', id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('📬 Fetched posts:', data?.length, 'posts');
      if (data && data.length > 0) {
        // Log all posts with images for debugging
        data.forEach((post, index) => {
          if (post.images) {
            console.log(`📬 Post ${index} images:`, JSON.stringify(post.images), 'Type:', typeof post.images, 'IsArray:', Array.isArray(post.images));
          }
        });
      }

      // Check which posts the user has liked
      if (user && data) {
        const postIds = data.map(p => p.id);
        const { data: likes } = await supabase
          .from('circle_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        
        const postsWithLikes = data.map(post => ({
          ...post,
          is_liked: likedPostIds.has(post.id),
        }));
        
        setPosts(postsWithLikes);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchMembers = async () => {
    if (!id) return;
    
    try {
      setLoadingMembers(true);
      
      const { data, error } = await supabase
        .from('circle_members')
        .select(`
          *,
          profile:profiles!user_id(full_name, username, avatar_url)
        `)
        .eq('circle_id', id)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!id || !canManage) return;

    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('circle_join_requests')
        .select(`
          *,
          user_profile:profiles!circle_join_requests_user_id_fkey(username, full_name, avatar_url)
        `)
        .eq('circle_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!user || !circle) return;

    try {
      const request = pendingRequests.find(r => r.id === requestId);
      if (!request) return;

      if (action === 'approve') {
        // Add user to circle members
        console.log('🔧 Approving request - adding user to circle_members:', { 
          circle_id: circle.id, 
          user_id: request.user_id 
        });
        
        const { data: memberData, error: memberError } = await supabase
          .from('circle_members')
          .insert([{
            circle_id: circle.id,
            user_id: request.user_id,
            role: 'member',
          }])
          .select();

        console.log('🔧 circle_members insert result:', { memberData, memberError });
        
        if (memberError) {
          console.error('❌ Failed to add member:', memberError);
          throw memberError;
        }
        
        console.log('✅ Successfully added user to circle_members');

        // Also add to the circle's group chat if it exists
        if (circle.group_chat_id) {
          const { error: groupError } = await supabase
            .from('group_members')
            .upsert({
              group_id: circle.group_chat_id,
              user_id: request.user_id,
              role: 'member',
            }, {
              onConflict: 'group_id,user_id',
              ignoreDuplicates: true,
            });
          
          if (groupError) {
            console.error('⚠️ Failed to add to group chat:', groupError);
          } else {
            console.log('✅ Successfully added user to group_members');
          }
        }

        // Send approval notification
        await supabase
          .from('notifications')
          .insert([{
            recipient_id: request.user_id,
            actor_id: user.id,
            type: 'circle_join_approved',
            content: `approved your request to join "${circle.name}"`,
          }]);
      } else {
        // Send rejection notification
        await supabase
          .from('notifications')
          .insert([{
            recipient_id: request.user_id,
            actor_id: user.id,
            type: 'circle_join_rejected',
            content: `declined your request to join "${circle.name}"`,
          }]);
      }

      // Update request status
      await supabase
        .from('circle_join_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', requestId);

      Alert.alert('Success', `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      fetchPendingRequests();
      if (action === 'approve') {
        fetchMembers();
        fetchCircleDetails();
      }
    } catch (error: any) {
      console.error('Error handling join request:', error);
      Alert.alert('Error', error.message || 'Failed to process request');
    }
  };

  const removeMember = async (member: Member) => {
    if (!user || !circle || !canManage) return;

    // Can't remove yourself or the creator
    if (member.user_id === user.id) {
      Alert.alert('Error', 'You cannot remove yourself. Use "Leave Circle" instead.');
      return;
    }
    if (member.user_id === circle.created_by) {
      Alert.alert('Error', 'You cannot remove the circle creator.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.profile?.full_name || 'this member'} from the circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from circle members
              const { error } = await supabase
                .from('circle_members')
                .delete()
                .eq('circle_id', circle.id)
                .eq('user_id', member.user_id);

              if (error) throw error;

              // Also remove from group chat if exists
              if (circle.group_chat_id) {
                await supabase
                  .from('group_members')
                  .delete()
                  .eq('group_id', circle.group_chat_id)
                  .eq('user_id', member.user_id);
              }

              // Send notification to removed user
              await supabase
                .from('notifications')
                .insert([{
                  recipient_id: member.user_id,
                  actor_id: user.id,
                  type: 'circle_removed',
                  content: `removed you from the circle "${circle.name}"`,
                }]);

              Alert.alert('Success', 'Member removed from circle');
              setShowMemberMenu(false);
              setSelectedMember(null);
              fetchMembers();
              fetchCircleDetails();
            } catch (error: any) {
              console.error('Error removing member:', error);
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const updateMemberRole = async (member: Member, newRole: 'admin' | 'moderator' | 'member') => {
    if (!user || !circle || !canManage) return;

    // Only creator can promote to admin
    if (newRole === 'admin' && circle.created_by !== user.id && !isAdmin) {
      Alert.alert('Error', 'Only the circle creator can promote members to admin.');
      return;
    }

    // Can't change creator's role
    if (member.user_id === circle.created_by) {
      Alert.alert('Error', 'You cannot change the creator\'s role.');
      return;
    }

    try {
      const { error } = await supabase
        .from('circle_members')
        .update({ role: newRole })
        .eq('circle_id', circle.id)
        .eq('user_id', member.user_id);

      if (error) throw error;

      // Send notification about role change
      const roleText = newRole === 'admin' ? 'an admin' : newRole === 'moderator' ? 'a moderator' : 'a member';
      await supabase
        .from('notifications')
        .insert([{
          recipient_id: member.user_id,
          actor_id: user.id,
          type: 'circle_role_changed',
          content: `made you ${roleText} of "${circle.name}"`,
        }]);

      Alert.alert('Success', `${member.profile?.full_name || 'Member'} is now ${roleText}`);
      setShowMemberMenu(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating member role:', error);
      Alert.alert('Error', error.message || 'Failed to update member role');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCircleDetails();
    if (activeTab === 'feed') await fetchPosts();
    if (activeTab === 'members') await fetchMembers();
    if (canManage && circle?.is_private) await fetchPendingRequests();
    setRefreshing(false);
  };

  const createPost = async () => {
    if (!user || !circle || (!newPostContent.trim() && selectedMedia.length === 0 && selectedDocuments.length === 0)) return;

    try {
      setPostingContent(true);
      setUploadingMedia(true);
      
      // Separate images and videos
      const images = selectedMedia.filter(m => m.type === 'image');
      const videos = selectedMedia.filter(m => m.type === 'video');
      
      // Upload images to circle-post-images bucket
      let uploadedImages: string[] = [];
      for (const media of images) {
        try {
          const timestamp = Date.now();
          const safeFileName = `${circle.id}/${user.id}_${timestamp}.jpg`;
          
          console.log('📤 Compressing image...');
          
          // Compress image before upload for faster uploads
          const compressed = await ImageManipulator.manipulateAsync(
            media.uri,
            [{ resize: { width: 1920 } }], // Max width 1920px
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          
          console.log('📤 Uploading image to circle-post-images:', safeFileName);
          
          // Use arrayBuffer instead of blob for reliable iOS uploads
          const response = await fetch(compressed.uri);
          const arrayBuffer = await response.arrayBuffer();
          const fileBuffer = new Uint8Array(arrayBuffer);
          
          console.log('📤 Image buffer size:', (fileBuffer.length / 1024).toFixed(0), 'KB');
          
          const { error: uploadError } = await supabase.storage
            .from('circle-post-images')
            .upload(safeFileName, fileBuffer, { 
              contentType: 'image/jpeg',
              upsert: false
            });
            
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('circle-post-images')
              .getPublicUrl(safeFileName);
            console.log('✅ Image uploaded:', urlData.publicUrl);
            uploadedImages.push(urlData.publicUrl);
          } else {
            console.error('❌ Image upload error:', uploadError);
          }
        } catch (imgError) {
          console.error('❌ Error uploading image:', imgError);
        }
      }
      
      // Upload videos to circle-post-images bucket (same bucket for all media)
      let uploadedVideos: string[] = [];
      for (const media of videos) {
        try {
          const timestamp = Date.now();
          const ext = media.mimeType?.includes('quicktime') ? 'mov' : 'mp4';
          const safeFileName = `${circle.id}/${user.id}_${timestamp}_video.${ext}`;
          
          console.log('📤 Uploading video to circle-post-images:', safeFileName);
          
          // Use arrayBuffer instead of blob for reliable iOS uploads
          const response = await fetch(media.uri);
          const arrayBuffer = await response.arrayBuffer();
          const fileBuffer = new Uint8Array(arrayBuffer);
          
          console.log('📤 Video buffer size:', fileBuffer.length);
          
          const { error: uploadError } = await supabase.storage
            .from('circle-post-images')
            .upload(safeFileName, fileBuffer, { 
              contentType: media.mimeType || 'video/mp4',
              upsert: false
            });
            
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('circle-post-images')
              .getPublicUrl(safeFileName);
            console.log('✅ Video uploaded:', urlData.publicUrl);
            uploadedVideos.push(urlData.publicUrl);
          } else {
            console.error('❌ Video upload error:', uploadError);
          }
        } catch (vidError) {
          console.error('❌ Error uploading video:', vidError);
        }
      }
      
      // Upload documents if any
      let uploadedAttachments: { url: string; name: string; type: string }[] = [];
      for (const doc of selectedDocuments) {
        try {
          const timestamp = Date.now();
          const safeFileName = `${circle.id}/${user.id}_${timestamp}_${doc.name}`;
          
          // Use arrayBuffer for documents too
          const response = await fetch(doc.uri);
          const arrayBuffer = await response.arrayBuffer();
          const fileBuffer = new Uint8Array(arrayBuffer);
          
          const { error: uploadError } = await supabase.storage
            .from('circle-post-images')
            .upload(safeFileName, fileBuffer, { contentType: doc.type });
            
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('circle-post-images')
              .getPublicUrl(safeFileName);
            uploadedAttachments.push({
              url: urlData.publicUrl,
              name: doc.name,
              type: doc.type,
            });
          }
        } catch (docError) {
          console.error('Error uploading document:', docError);
        }
      }
      
      setUploadingMedia(false);
      
      // Build insert data
      const insertData: any = {
        circle_id: circle.id,
        user_id: user.id,
        content: newPostContent.trim() || '',
      };
      
      if (uploadedImages.length > 0) {
        insertData.images = uploadedImages;
      }
      
      if (uploadedVideos.length > 0) {
        insertData.videos = uploadedVideos;
      }
      
      if (uploadedAttachments.length > 0) {
        insertData.attachments = uploadedAttachments;
      }
      
      console.log('📝 Creating post with data:', insertData);
      
      const { data, error } = await supabase
        .from('circle_posts')
        .insert(insertData)
        .select(`
          *,
          user_profile:profiles!user_id(full_name, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      setPosts(prev => [{ ...data, is_liked: false, likes_count: 0, comments_count: 0 }, ...prev]);
      setNewPostContent('');
      setSelectedMedia([]);
      setSelectedDocuments([]);
        
    } catch (error: any) {
      console.error('Error creating post:', error);
      if (error.code === 'PGRST204' && error.message?.includes('videos')) {
        Alert.alert('Setup Required', 'Please run the ADD_CIRCLE_POSTS_VIDEOS.sql migration in Supabase to enable video sharing.');
      } else if (error.code === 'PGRST204' && error.message?.includes('attachments')) {
        Alert.alert('Setup Required', 'Please run the ADD_CIRCLE_POSTS_ATTACHMENTS.sql migration in Supabase to enable document sharing.');
      } else {
        Alert.alert('Error', 'Failed to create post');
      }
    } finally {
      setPostingContent(false);
      setUploadingMedia(false);
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('circle_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('circle_post_likes')
          .insert({ post_id: postId, user_id: user.id });
      }

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !isLiked,
            likes_count: isLiked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1,
          };
        }
        return post;
      }));
        
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const deletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('circle_posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              setPosts(prev => prev.filter(p => p.id !== postId));
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handlePickMedia = async () => {
    if (selectedMedia.length >= 4) {
      Alert.alert('Limit Reached', 'You can only attach up to 4 media items per post');
      return;
    }
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload media');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.7, // Lower quality for faster uploads
        allowsMultipleSelection: true,
        selectionLimit: 4 - selectedMedia.length,
        videoMaxDuration: 60, // Limit videos to 60 seconds
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium, // Medium quality for faster upload
      });
      
      if (!result.canceled && result.assets) {
        // Check video file sizes and warn user
        for (const asset of result.assets) {
          if (asset.type === 'video' && asset.fileSize) {
            const sizeMB = asset.fileSize / (1024 * 1024);
            if (sizeMB > 50) {
              Alert.alert(
                'Large Video', 
                `This video is ${sizeMB.toFixed(1)}MB. Large videos may take a while to upload. Consider using a shorter clip.`
              );
            }
          }
        }
        
        const newMedia: MediaItem[] = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          fileName: asset.fileName || `media_${Date.now()}`,
          mimeType: asset.mimeType,
        }));
        setSelectedMedia(prev => [...prev, ...newMedia].slice(0, 4));
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const handlePickDocument = async () => {
    if (selectedDocuments.length >= 3) {
      Alert.alert('Limit Reached', 'You can only attach up to 3 documents per post');
      return;
    }
    
    const result = await pickDocument();
    if (result) {
      setSelectedDocuments(prev => [...prev, { uri: result.uri, name: result.name, type: result.mimeType }]);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const openMediaViewer = (items: { uri: string; type: 'image' | 'video' }[], startIndex: number = 0) => {
    setMediaViewerItems(items);
    setMediaViewerIndex(startIndex);
    setShowMediaViewer(true);
  };

  const joinCircle = async () => {
    if (!user || !circle) return;

    try {
      // First check if already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🔍 Join check - existing member:', { circleId: circle.id, userId: user.id, existingMember, memberCheckError });

      if (existingMember) {
        Alert.alert('Already a Member', 'You are already a member of this circle');
        fetchCircleDetails();
        return;
      }

      if (circle.is_private) {
        // Check for any existing request (pending or rejected)
        const { data: existingRequest } = await supabase
          .from('circle_join_requests')
          .select('id, status')
          .eq('circle_id', circle.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingRequest) {
          if (existingRequest.status === 'pending') {
            Alert.alert('Request Pending', 'You already have a pending join request for this circle');
            return;
          } else if (existingRequest.status === 'rejected') {
            // Update the rejected request back to pending
            const { error } = await supabase
              .from('circle_join_requests')
              .update({ status: 'pending', created_at: new Date().toISOString() })
              .eq('id', existingRequest.id);

            if (error) throw error;

            Alert.alert('Request Sent', 'Your join request has been re-submitted to the circle admin');
            fetchCircleDetails();
            return;
          }
        }

        // Send new join request
        const { error } = await supabase
          .from('circle_join_requests')
          .insert({
            circle_id: circle.id,
            user_id: user.id,
            status: 'pending',
          });

        if (error) throw error;

        Alert.alert('Request Sent', 'Your join request has been sent to the circle admin');
        fetchCircleDetails();
      } else {
        // Join directly using upsert to handle race conditions
        const { error } = await supabase
          .from('circle_members')
          .upsert({
            circle_id: circle.id,
            user_id: user.id,
            role: 'member',
          }, {
            onConflict: 'circle_id,user_id',
            ignoreDuplicates: true,
          });

        if (error) throw error;

        // Also add to the group chat if it exists
        if (circle.group_chat_id) {
          const { error: groupError } = await supabase
            .from('group_members')
            .upsert({
              group_id: circle.group_chat_id,
              user_id: user.id,
              role: 'member',
            }, {
              onConflict: 'group_id,user_id',
              ignoreDuplicates: true,
            });
          
          if (groupError) {
            console.error('Error adding to group chat:', groupError);
            // Don't fail the whole operation if group chat fails
          }
        }

        Alert.alert('Success', 'You have joined the circle!');
        fetchCircleDetails();
      }
    } catch (error: any) {
      console.error('Error joining circle:', error);
      // Handle duplicate key error gracefully
      if (error.code === '23505') {
        if (error.message?.includes('circle_join_requests')) {
          Alert.alert('Request Exists', 'You already have a join request for this circle');
        } else {
          Alert.alert('Already a Member', 'You are already a member of this circle');
        }
        fetchCircleDetails();
      } else {
        Alert.alert('Error', error.message || 'Failed to join circle');
      }
    }
  };

  const leaveCircle = async () => {
    if (!user || !circle) return;

    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from circle
              const { error } = await supabase
                .from('circle_members')
                .delete()
                .eq('circle_id', circle.id)
                .eq('user_id', user.id);

              if (error) throw error;

              // Also remove from the group chat if it exists
              if (circle.group_chat_id) {
                const { error: groupError } = await supabase
                  .from('group_members')
                  .delete()
                  .eq('group_id', circle.group_chat_id)
                  .eq('user_id', user.id);
                
                if (groupError) {
                  console.error('Error removing from group chat:', groupError);
                  // Don't fail the whole operation
                }
              }

              Alert.alert('Success', 'You have left the circle');
              debouncedRouter.back();
            } catch (error: any) {
              console.error('Error leaving circle:', error);
              Alert.alert('Error', 'Failed to leave circle');
            }
          },
        },
      ]
    );
  };

  const deleteCircle = async () => {
    if (!user || !circle) return;

    // Only creator or app admin can delete
    if (circle.created_by !== user.id && !isAdmin) {
      Alert.alert('Permission Denied', 'Only the circle creator can delete this circle');
      return;
    }

    Alert.alert(
      'Delete Circle',
      `Are you sure you want to permanently delete "${circle.name}"? This will remove all members, posts, and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the group chat first if it exists
              if (circle.group_chat_id) {
                // Delete group messages
                await supabase
                  .from('group_messages')
                  .delete()
                  .eq('group_id', circle.group_chat_id);
                
                // Delete group members
                await supabase
                  .from('group_members')
                  .delete()
                  .eq('group_id', circle.group_chat_id);
                
                // Delete the group
                await supabase
                  .from('groups')
                  .delete()
                  .eq('id', circle.group_chat_id);
              }

              // Delete circle posts
              await supabase
                .from('circle_posts')
                .delete()
                .eq('circle_id', circle.id);

              // Delete circle join requests
              await supabase
                .from('circle_join_requests')
                .delete()
                .eq('circle_id', circle.id);

              // Delete circle members
              await supabase
                .from('circle_members')
                .delete()
                .eq('circle_id', circle.id);

              // Finally delete the circle
              const { error } = await supabase
                .from('circles')
                .delete()
                .eq('id', circle.id);

              if (error) throw error;

              Alert.alert('Deleted', 'Circle has been permanently deleted');
              debouncedRouter.replace('/circles');
            } catch (error: any) {
              console.error('Error deleting circle:', error);
              Alert.alert('Error', error.message || 'Failed to delete circle');
            }
          },
        },
      ]
    );
  };

  const openEditModal = () => {
    if (!circle) return;
    setEditCircleName(circle.name);
    setEditCircleDescription(circle.description || '');
    setShowEditModal(true);
  };

  const saveCircleEdit = async () => {
    if (!user || !circle) return;

    // Only creator or app admin can edit
    if (circle.created_by !== user.id && !isAdmin) {
      Alert.alert('Permission Denied', 'Only the circle creator can edit this circle');
      return;
    }

    if (!editCircleName.trim()) {
      Alert.alert('Error', 'Circle name is required');
      return;
    }

    try {
      setSavingCircleEdit(true);

      const { error } = await supabase
        .from('circles')
        .update({
          name: editCircleName.trim(),
          description: editCircleDescription.trim(),
        })
        .eq('id', circle.id);

      if (error) throw error;

      // Update local state
      setCircle(prev => prev ? {
        ...prev,
        name: editCircleName.trim(),
        description: editCircleDescription.trim(),
      } : null);

      setShowEditModal(false);
      Alert.alert('Success', 'Circle updated successfully');
    } catch (error: any) {
      console.error('Error updating circle:', error);
      Alert.alert('Error', error.message || 'Failed to update circle');
    } finally {
      setSavingCircleEdit(false);
    }
  };

  const openGroupChat = () => {
    if (!circle?.group_chat_id) {
      Alert.alert('No Chat', 'This circle does not have a group chat yet');
      return;
    }
    debouncedRouter.push(`/chat/group/${circle.group_chat_id}`);
  };

  const handleAvatarUpload = async () => {
    if (!user || !circle || !isCreator) return;
    
    try {
      const media = await pickMedia();
      if (!media) return;
      
      // Only accept images for avatar
      const mediaType = (media as any).type;
      if (mediaType === 'video') {
        Alert.alert('Invalid File', 'Please select an image, not a video');
        return;
      }
      
      setUploadingAvatar(true);
      
      // Upload using the standard media upload function
      const publicUrl = await uploadMedia(
        media.uri, 
        user.id, 
        'image', 
        media.fileName || `circle_${circle.id}.jpg`,
        media.mimeType
      );
      
      if (!publicUrl) {
        setUploadingAvatar(false);
        return;
      }
      
      console.log('📸 Avatar uploaded, URL:', publicUrl);
      
      // Update circle with new image_url
      const { data: updateData, error } = await supabase
        .from('circles')
        .update({ image_url: publicUrl })
        .eq('id', circle.id)
        .select()
        .single();
      
      console.log('📸 Database update result:', { updateData, error });
      
      if (error) throw error;
      
      // Update local state with the new URL
      console.log('📸 Updating local state with image_url:', publicUrl);
      setCircle(prev => {
        const updated = prev ? { ...prev, image_url: publicUrl } : null;
        console.log('📸 New circle state:', updated?.image_url);
        return updated;
      });
      
      Alert.alert('Success', 'Circle avatar updated!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'Failed to update avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    if (!circle?.image_url) {
      // No image, if creator can upload
      if (isCreator) {
        handleAvatarUpload();
      }
      return;
    }
    
    if (isCreator) {
      // Show options: View or Change
      Alert.alert(
        'Circle Avatar',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Full Image', onPress: () => setShowImageViewer(true) },
          { text: 'Change Avatar', onPress: handleAvatarUpload },
        ]
      );
    } else {
      // Just view
      setShowImageViewer(true);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isMyPost = item.user_id === user?.id;
    
    // Combine all media for carousel
    const allMedia: { type: 'image' | 'video'; uri: string }[] = [
      ...(item.images || []).map(uri => ({ type: 'image' as const, uri })),
      ...(item.videos || []).map(uri => ({ type: 'video' as const, uri })),
    ];
    
    const currentIndex = carouselIndices[item.id] || 0;
    
    return (
      <View style={styles.postCard}>
        {item.is_pinned && (
          <View style={styles.pinnedBadge}>
            <Pin size={12} color="#F59E0B" />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
        
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.postAuthor}
            onPress={() => debouncedRouter.push(`/user-profile/${item.user_id}`)}
            activeOpacity={0.7}
          >
            {item.user_profile?.avatar_url ? (
              <CachedImage 
                source={{ uri: item.user_profile.avatar_url }} 
                style={styles.authorAvatar}
              />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorAvatarText}>
                  {item.user_profile?.full_name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.user_profile?.full_name || 'Unknown'}</Text>
              <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </TouchableOpacity>
          
          {(isMyPost || canManage) && (
            <TouchableOpacity 
              style={styles.postMenuButton}
              onPress={() => deletePost(item.id)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        {item.content ? (
          <Text style={styles.postContent}>{item.content}</Text>
        ) : null}

        {/* Media Carousel (Images + Videos) */}
        {allMedia.length > 0 && (
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCarouselIndices(prev => ({ ...prev, [item.id]: index }));
              }}
              style={styles.carousel}
            >
              {allMedia.map((media, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.mediaPage}
                  activeOpacity={0.9}
                  onPress={() => openMediaViewer(allMedia, index)}
                >
                  {media.type === 'image' ? (
                    <CachedImage
                      source={{ uri: media.uri }}
                      style={styles.carouselMedia}
                      contentFit="cover"
                      onError={(e: any) => console.log('❌ Image error:', e, media.uri)}
                      onLoad={() => console.log('✅ Feed image loaded:', media.uri?.substring(0, 60))}
                    />
                  ) : (
                    <View style={styles.videoContainer}>
                      <Video
                        source={{ uri: media.uri }}
                        style={styles.carouselMedia}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        isLooping={false}
                        isMuted={true}
                        useNativeControls={false}
                        posterSource={{ uri: media.uri }}
                        usePoster={true}
                      />
                      <View style={styles.videoPlayOverlay}>
                        <View style={styles.playButton}>
                          <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Pagination Indicator */}
            {allMedia.length > 1 && (
              <View style={styles.carouselIndicator}>
                {allMedia.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentIndex && styles.indicatorDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Post Attachments */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.postAttachmentsContainer}>
            {item.attachments.map((attachment, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.postAttachmentItem}
                onPress={() => {
                  // Open document URL in browser
                  import('expo-linking').then(Linking => {
                    Linking.openURL(attachment.url);
                  });
                }}
              >
                <FileText size={18} color="#6366F1" />
                <Text style={styles.postAttachmentName} numberOfLines={1}>{attachment.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.postAction}
            onPress={() => toggleLike(item.id, item.is_liked || false)}
          >
            <ThumbsUp 
              size={20} 
              color={item.is_liked ? '#ffc857' : '#6B7280'} 
              fill={item.is_liked ? '#ffc857' : 'transparent'}
            />
            <Text style={[styles.actionText, item.is_liked && styles.likedText]}>
              {item.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.postAction}
            onPress={() => debouncedRouter.push(`/circle-comments/${item.id}`)}
          >
            <MessageSquare size={20} color="#6B7280" />
            <Text style={styles.actionText}>{item.comments_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMember = ({ item }: { item: Member }) => {
    const isMemberCreator = item.user_id === circle?.created_by;
    const isCurrentUser = item.user_id === user?.id;
    const canManageMember = canManage && !isMemberCreator && !isCurrentUser;
    
    return (
      <View style={styles.memberCard}>
        <TouchableOpacity 
          style={styles.memberMainContent}
          onPress={() => debouncedRouter.push(`/user-profile/${item.user_id}`)}
          activeOpacity={0.7}
        >
          {item.profile?.avatar_url ? (
            <CachedImage 
              source={{ uri: item.profile.avatar_url }} 
              style={styles.memberAvatar}
            />
          ) : (
            <View style={styles.memberAvatarPlaceholder}>
              <Text style={styles.memberAvatarText}>
                {item.profile?.full_name?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={styles.memberName}>{item.profile?.full_name || 'Unknown'}</Text>
              {isMemberCreator && (
                <View style={styles.creatorBadge}>
                  <Shield size={12} color="#F59E0B" />
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
              {item.role === 'admin' && !isMemberCreator && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
              {item.role === 'moderator' && (
                <View style={styles.modBadge}>
                  <Text style={styles.modBadgeText}>Mod</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {canManageMember && (
          <TouchableOpacity 
            style={styles.memberMenuButton}
            onPress={() => {
              setSelectedMember(item);
              setShowMemberMenu(true);
            }}
          >
            <MoreVertical size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
        <Text style={styles.loadingText}>Loading circle...</Text>
      </View>
    );
  }

  // Show blank screen with centered spinner when refreshing
  if (refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffc857" />
      </View>
    );
  }

  if (!circle) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Fixed Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{circle.name}</Text>
          {circle.is_official && (
            <CheckCircle size={18} color="#ffc857" style={{ marginLeft: 6 }} />
          )}
        </View>
        {circle.is_member && (
          <TouchableOpacity style={styles.chatHeaderButton} onPress={openGroupChat}>
            <MessageCircle size={22} color="#0F172A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Approval Banner */}
      {showApprovalBanner && (
        <View style={styles.approvalBanner}>
          <View style={styles.approvalBannerContent}>
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.approvalBannerText}>{approvalBannerMessage}</Text>
          </View>
          <TouchableOpacity 
            style={styles.approvalBannerClose}
            onPress={() => setShowApprovalBanner(false)}
          >
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Circle Info Header - Now Scrollable */}
      <ScrollView 
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#ffc857"
            colors={['#ffc857']}
          />
        }
        nestedScrollEnabled={true}
      >
        <View style={styles.circleHeader}>
          <View style={styles.circleHeaderTop}>
            <TouchableOpacity 
              style={styles.circleAvatarContainer}
              onPress={handleAvatarPress}
              activeOpacity={0.7}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <View style={styles.circleAvatarPlaceholder}>
                  <ActivityIndicator size="small" color="#ffc857" />
                </View>
              ) : circle.image_url ? (
                <CachedImage 
                  key={circle.image_url}
                  source={{ uri: circle.image_url }} 
                  style={styles.circleAvatar}
                  onError={(e: any) => console.log('❌ CachedImage error:', e.nativeEvent?.error)}
                />
              ) : (
                <View style={styles.circleAvatarPlaceholder}>
                  <Users size={32} color="#ffc857" />
                </View>
              )}
              {isCreator && !uploadingAvatar && (
                <View style={styles.avatarEditBadge}>
                  <Camera size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.circleStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{circle.member_count || 0}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                {circle.is_private ? (
                  <Lock size={20} color="#6B7280" />
                ) : (
                  <Globe size={20} color="#10B981" />
                )}
                <Text style={styles.statLabel}>{circle.is_private ? 'Private' : 'Public'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.categoryBadgeContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{circle.category}</Text>
            </View>
            {circle.is_official && (
              <View style={styles.officialBadge}>
                <CheckCircle size={14} color="#FFFFFF" />
                <Text style={styles.officialBadgeText}>Official</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tab Navigation - Only show if member */}
        {circle.is_member && (
          <View style={styles.tabBar}>
            {(['feed', 'members', 'about'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        {circle.is_member ? (
          <View style={styles.contentContainer}>
          {activeTab === 'feed' && (
            <>
              {/* New Post Input */}
              <View style={styles.newPostContainer}>
                <View style={styles.postInputWrapper}>
                  <TextInput
                    style={styles.newPostInput}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#9CA3AF"
                    value={newPostContent}
                    onChangeText={setNewPostContent}
                    multiline
                    maxLength={1000}
                  />
                  
                  {/* Media Attachment Buttons */}
                  <View style={styles.mediaButtonsRow}>
                    <TouchableOpacity 
                      style={styles.mediaButton}
                      onPress={handlePickMedia}
                      disabled={uploadingMedia}
                    >
                      <ImageIcon size={20} color="#0F172A" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.mediaButton}
                      onPress={handlePickDocument}
                      disabled={uploadingMedia}
                    >
                      <Paperclip size={20} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.postButton, 
                    (!newPostContent.trim() && selectedMedia.length === 0 && selectedDocuments.length === 0) && styles.postButtonDisabled
                  ]}
                  onPress={createPost}
                  disabled={(!newPostContent.trim() && selectedMedia.length === 0 && selectedDocuments.length === 0) || postingContent || uploadingMedia}
                >
                  {postingContent || uploadingMedia ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Selected Media Preview */}
              {selectedMedia.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewContainer}>
                  {selectedMedia.map((media, index) => (
                    <View key={index} style={styles.mediaPreviewItem}>
                      {media.type === 'image' ? (
                        <Image source={{ uri: media.uri }} style={styles.mediaPreviewImage} />
                      ) : (
                        <View style={styles.videoPreviewContainer}>
                          <Video 
                            source={{ uri: media.uri }} 
                            style={styles.mediaPreviewImage}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted={true}
                          />
                          <View style={styles.videoPreviewOverlay}>
                            <Film size={16} color="#FFFFFF" />
                          </View>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.removeMediaButton}
                        onPress={() => setSelectedMedia(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              {/* Selected Documents Preview */}
              {selectedDocuments.length > 0 && (
                <View style={styles.documentsPreviewContainer}>
                  {selectedDocuments.map((doc, index) => (
                    <View key={index} style={styles.documentPreviewItem}>
                      <FileText size={16} color="#6366F1" />
                      <Text style={styles.documentPreviewName} numberOfLines={1}>{doc.name}</Text>
                      <TouchableOpacity 
                        style={styles.removeDocButton}
                        onPress={() => removeDocument(index)}
                      >
                        <X size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                contentContainerStyle={styles.postsList}
                scrollEnabled={false}
                ListEmptyComponent={
                  loadingPosts ? (
                    <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
                  ) : (
                    <View style={styles.emptyState}>
                      <MessageSquare size={48} color="#D1D5DB" />
                      <Text style={styles.emptyTitle}>No posts yet</Text>
                      <Text style={styles.emptyText}>Be the first to share something!</Text>
                    </View>
                  )
                }
              />
            </>
          )}

          {activeTab === 'members' && (
            <>
              {/* Pending Requests Section (for admins of private circles) */}
              {canManage && circle.is_private && pendingRequests.length > 0 && (
                <View style={styles.pendingRequestsSection}>
                  <TouchableOpacity
                    style={styles.pendingRequestsHeader}
                    onPress={() => setShowRequests(!showRequests)}
                  >
                    <View style={styles.pendingRequestsTitleRow}>
                      <UserCheck size={20} color="#F59E0B" />
                      <Text style={styles.pendingRequestsTitle}>
                        Pending Requests ({pendingRequests.length})
                      </Text>
                    </View>
                    <Text style={styles.pendingRequestsToggle}>
                      {showRequests ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showRequests && (
                    <View style={styles.pendingRequestsList}>
                      {pendingRequests.map((request) => (
                        <View key={request.id} style={styles.requestCard}>
                          <TouchableOpacity 
                            style={styles.requestUserInfo}
                            onPress={() => debouncedRouter.push(`/user-profile/${request.user_id}`)}
                          >
                            {request.user_profile?.avatar_url ? (
                              <CachedImage 
                                source={{ uri: request.user_profile.avatar_url }} 
                                style={styles.requestAvatar}
                              />
                            ) : (
                              <View style={styles.requestAvatarPlaceholder}>
                                <Text style={styles.requestAvatarText}>
                                  {request.user_profile?.full_name?.charAt(0) || '?'}
                                </Text>
                              </View>
                            )}
                            <View>
                              <Text style={styles.requestName}>
                                {request.user_profile?.full_name || request.user_profile?.username || 'Unknown'}
                              </Text>
                              <Text style={styles.requestTime}>
                                {formatTimeAgo(request.created_at)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={styles.approveButton}
                              onPress={() => handleJoinRequest(request.id, 'approve')}
                            >
                              <CheckCircle size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectButton}
                              onPress={() => handleJoinRequest(request.id, 'reject')}
                            >
                              <X size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              
              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={renderMember}
                contentContainerStyle={styles.membersList}
                scrollEnabled={false}
                ListEmptyComponent={
                  loadingMembers ? (
                    <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
                  ) : (
                    <View style={styles.emptyState}>
                      <Users size={48} color="#D1D5DB" />
                      <Text style={styles.emptyTitle}>No members yet</Text>
                    </View>
                  )
                }
              />
            </>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutContainer}>
              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>About</Text>
                <Text style={styles.aboutDescription}>{circle.description}</Text>
              </View>

              {circle.creator_profile && (
                <View style={styles.aboutSection}>
                  <Text style={styles.aboutSectionTitle}>Created By</Text>
                  <TouchableOpacity 
                    style={styles.creatorInfo}
                    onPress={() => debouncedRouter.push(`/user-profile/${circle.created_by}`)}
                    activeOpacity={0.7}
                  >
                    {circle.creator_profile.avatar_url ? (
                      <CachedImage 
                        source={{ uri: circle.creator_profile.avatar_url }} 
                        style={styles.creatorAvatar}
                      />
                    ) : (
                      <View style={styles.creatorAvatarPlaceholder}>
                        <Text style={styles.creatorAvatarText}>
                          {circle.creator_profile.full_name?.charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.creatorInfoName}>{circle.creator_profile.full_name}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.aboutSection}>
                <View style={styles.dateRow}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.dateText}>
                    Created {new Date(circle.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>

              {/* Edit Circle - Only for creator or app admin */}
              {(circle.created_by === user?.id || isAdmin) && (
                <TouchableOpacity style={styles.editCircleButton} onPress={openEditModal}>
                  <Edit2 size={20} color="#0F172A" />
                  <Text style={styles.editCircleButtonText}>Edit Circle</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.leaveButton} onPress={leaveCircle}>
                <X size={20} color="#EF4444" />
                <Text style={styles.leaveButtonText}>Leave Circle</Text>
              </TouchableOpacity>

              {/* Delete Circle - Only for creator or app admin */}
              {(circle.created_by === user?.id || isAdmin) && (
                <TouchableOpacity style={styles.deleteCircleButton} onPress={deleteCircle}>
                  <Trash2 size={20} color="#FFFFFF" />
                  <Text style={styles.deleteCircleButtonText}>Delete Circle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ) : (
        // Non-member view
        <View style={styles.nonMemberContent}>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutSectionTitle}>About</Text>
            <Text style={styles.aboutDescription}>{circle.description}</Text>
          </View>

          {circle.creator_profile && (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutSectionTitle}>Created By</Text>
              <TouchableOpacity 
                style={styles.creatorInfo}
                onPress={() => debouncedRouter.push(`/user-profile/${circle.created_by}`)}
                activeOpacity={0.7}
              >
                {circle.creator_profile.avatar_url ? (
                  <CachedImage 
                    source={{ uri: circle.creator_profile.avatar_url }} 
                    style={styles.creatorAvatar}
                  />
                ) : (
                  <View style={styles.creatorAvatarPlaceholder}>
                    <Text style={styles.creatorAvatarText}>
                      {circle.creator_profile.full_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.creatorInfoName}>{circle.creator_profile.full_name}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </ScrollView>

      {/* Bottom Action Button for non-members */}
      {!circle.is_member && (
        <View style={styles.bottomAction}>
          {circle.has_pending_request ? (
            <View style={styles.pendingButton}>
              <Text style={styles.pendingButtonText}>Request Pending</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={joinCircle}>
              <UserPlus size={20} color="#FFFFFF" />
              <Text style={styles.joinButtonText}>
                {circle.is_private ? 'Request to Join' : 'Join Circle'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Edit Circle Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.editModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.editModalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Circle</Text>
            <TouchableOpacity onPress={saveCircleEdit} disabled={savingCircleEdit}>
              <Text style={[styles.editModalSaveButton, savingCircleEdit && { opacity: 0.5 }]}>
                {savingCircleEdit ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.editModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Circle Name *</Text>
              <TextInput
                style={styles.editFormInput}
                placeholder="Enter circle name"
                value={editCircleName}
                onChangeText={setEditCircleName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.editFormInput, styles.editFormTextArea]}
                placeholder="Describe your circle"
                value={editCircleDescription}
                onChangeText={setEditCircleDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.editFormNote}>
              <Text style={styles.editFormNoteText}>
                To change the circle avatar, go to the main circle page and tap on the avatar.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageViewer(false)}
          >
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.imageViewerContent}>
            {circle.image_url && (
              <CachedImage
                source={{ uri: circle.image_url }}
                style={styles.fullScreenImage}
                contentFit="contain"
              />
            )}
          </View>
          
          <View style={styles.imageViewerFooter}>
            <Text style={styles.imageViewerTitle}>{circle.name}</Text>
          </View>
        </View>
      </Modal>

      {/* Member Management Modal */}
      <Modal
        visible={showMemberMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowMemberMenu(false);
          setSelectedMember(null);
        }}
      >
        <TouchableOpacity 
          style={styles.memberMenuOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowMemberMenu(false);
            setSelectedMember(null);
          }}
        >
          <View style={styles.memberMenuContainer}>
            <View style={styles.memberMenuHeader}>
              <Text style={styles.memberMenuTitle}>
                {selectedMember?.profile?.full_name || 'Member'}
              </Text>
              <Text style={styles.memberMenuSubtitle}>
                Current role: {selectedMember?.role || 'member'}
              </Text>
            </View>
            
            <View style={styles.memberMenuOptions}>
              {/* Role options */}
              {selectedMember?.role !== 'admin' && (isCreator || isAdmin) && (
                <TouchableOpacity 
                  style={styles.memberMenuOption}
                  onPress={() => selectedMember && updateMemberRole(selectedMember, 'admin')}
                >
                  <Crown size={20} color="#F59E0B" />
                  <Text style={styles.memberMenuOptionText}>Promote to Admin</Text>
                </TouchableOpacity>
              )}
              
              {selectedMember?.role === 'admin' && (isCreator || isAdmin) && (
                <TouchableOpacity 
                  style={styles.memberMenuOption}
                  onPress={() => selectedMember && updateMemberRole(selectedMember, 'member')}
                >
                  <Users size={20} color="#6B7280" />
                  <Text style={styles.memberMenuOptionText}>Demote to Member</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.memberMenuDivider} />
              
              {/* Remove option */}
              <TouchableOpacity 
                style={[styles.memberMenuOption, styles.memberMenuOptionDanger]}
                onPress={() => selectedMember && removeMember(selectedMember)}
              >
                <UserMinus size={20} color="#EF4444" />
                <Text style={[styles.memberMenuOptionText, styles.memberMenuOptionTextDanger]}>
                  Remove from Circle
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.memberMenuCancel}
              onPress={() => {
                setShowMemberMenu(false);
                setSelectedMember(null);
              }}
            >
              <Text style={styles.memberMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Media Viewer Modal */}
      <Modal
        visible={showMediaViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMediaViewer(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.mediaViewerContainer}>
          <TouchableOpacity 
            style={styles.mediaViewerCloseButton}
            onPress={() => setShowMediaViewer(false)}
          >
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: mediaViewerIndex * SCREEN_WIDTH, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setMediaViewerIndex(index);
            }}
            style={styles.mediaViewerScroll}
          >
            {mediaViewerItems.map((media, index) => (
              <View key={index} style={styles.mediaViewerPage}>
                {media.type === 'image' ? (
                  <CachedImage
                    source={{ uri: media.uri }}
                    style={styles.mediaViewerImage}
                    contentFit="contain"
                    onError={(e: any) => console.log('❌ Media viewer image error:', e, media.uri)}
                    onLoad={() => console.log('✅ Media viewer image loaded:', media.uri?.substring(0, 60))}
                  />
                ) : (
                  <Video
                    source={{ uri: media.uri }}
                    style={styles.mediaViewerVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={index === mediaViewerIndex}
                    isLooping={true}
                    isMuted={false}
                    useNativeControls={true}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          
          {/* Media Counter */}
          {mediaViewerItems.length > 1 && (
            <View style={styles.mediaViewerCounter}>
              <Text style={styles.mediaViewerCounterText}>
                {mediaViewerIndex + 1} / {mediaViewerItems.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainScrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  imageViewerFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageViewerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  chatHeaderButton: {
    padding: 8,
  },

  // Circle Header
  circleHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  circleHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  circleAvatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  circleAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  circleAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ffc857',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  circleStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B8860B',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffc857',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  officialBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ffc857',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#0F172A',
  },

  // Content
  contentContainer: {
    flex: 1,
  },
  nonMemberContent: {
    flex: 1,
    padding: 16,
  },

  // New Post
  newPostContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  postInputWrapper: {
    flex: 1,
  },
  newPostInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  mediaButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  postButton: {
    backgroundColor: '#0F172A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  
  // Media Preview
  mediaPreviewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mediaPreviewItem: {
    position: 'relative',
    marginRight: 8,
  },
  mediaPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  videoPreviewOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
  },
  documentsPreviewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 6,
  },
  documentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  documentPreviewName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  removeDocButton: {
    padding: 4,
  },

  // Posts
  postsList: {
    padding: 12,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8860B',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  postTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  postMenuButton: {
    padding: 8,
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  
  // Post Images (legacy - kept for compatibility)
  postImagesContainer: {
    marginBottom: 12,
  },
  postImagesContent: {
    gap: 8,
  },
  postImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  postImageSingle: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  
  // Media Carousel
  carouselContainer: {
    marginBottom: 12,
    marginHorizontal: -16,
  },
  carousel: {
    width: SCREEN_WIDTH,
  },
  mediaPage: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
  },
  carouselMedia: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.75,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  videoContainer: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.75,
    position: 'relative',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  indicatorDotActive: {
    backgroundColor: '#6366F1',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Media Viewer Modal
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  mediaViewerScroll: {
    flex: 1,
  },
  mediaViewerPage: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerImage: {
    width: SCREEN_WIDTH - 20,
    height: SCREEN_WIDTH - 20,
    resizeMode: 'contain',
  },
  mediaViewerVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  mediaViewerCounter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mediaViewerCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  
  // Post Attachments
  postAttachmentsContainer: {
    marginBottom: 12,
    gap: 6,
  },
  postAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postAttachmentName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  likedText: {
    color: '#ffc857',
  },

  // Members
  membersList: {
    padding: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B8860B',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  memberUsername: {
    fontSize: 14,
    color: '#6B7280',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  creatorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  adminBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
  modBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },

  // About
  aboutContainer: {
    flex: 1,
    padding: 16,
  },
  aboutSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  creatorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B8860B',
  },
  creatorInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  creatorInfoUsername: {
    fontSize: 14,
    color: '#6B7280',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },

  // Buttons
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteCircleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteCircleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editCircleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffc857',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  editCircleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  // Edit Circle Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
  },
  editModalCancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  editModalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffc857',
  },
  editModalContent: {
    flex: 1,
    padding: 16,
  },
  editFormGroup: {
    marginBottom: 20,
  },
  editFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  editFormInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  editFormTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editFormNote: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  editFormNoteText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  bottomAction: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  // Member card with menu button
  memberMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberMenuButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Pending Requests Section
  pendingRequestsSection: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    overflow: 'hidden',
  },
  pendingRequestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  pendingRequestsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  pendingRequestsToggle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  pendingRequestsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  requestAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  requestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  
  // Member Management Modal
  memberMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  memberMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },
  memberMenuHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  memberMenuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  memberMenuOptions: {
    paddingTop: 8,
  },
  memberMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  memberMenuOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  memberMenuOptionDanger: {
    // Empty - just for targeting
  },
  memberMenuOptionTextDanger: {
    color: '#EF4444',
  },
  memberMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  memberMenuCancel: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  memberMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  approvalBannerClose: {
    padding: 4,
  },
});
