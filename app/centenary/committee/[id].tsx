import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  TextInput,
  RefreshControl,
  FlatList,
  Linking,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import {
  ArrowLeft,
  Users,
  Target,
  Eye,
  FileText,
  Link as LinkIcon,
  ClipboardList,
  MessageCircle,
  Play,
  Download,
  ExternalLink,
  Clock,
  ChevronRight,
  Lock,
  UserPlus,
  CheckCircle,
  XCircle,
  Send,
  X,
  Image as ImageIcon,
  File,
  Archive,
  Radio,
  Heart,
  Footprints,
  Trophy,
  Home,
  Wallet,
  Compass,
  Mic,
  Gift,
  Music,
  Calendar,
  Map,
  Theater,
  Settings,
  HeartHandshake,
  UserCheck,
  UserX,
  UserMinus,
  Shield,
  Upload,
  Plus,
  Edit3,
  Trash2,
  Save,
} from 'lucide-react-native';
import { Video } from 'expo-av';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickMedia, uploadMedia, pickDocument, uploadDocument } from '@/lib/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon mapping for dynamic icons
const ICON_MAP: Record<string, any> = {
  Archive, Radio, Heart, FileText, Footprints, Trophy, Target, Home, Wallet, Compass, Mic, Gift, Music, ClipboardList, Users, Calendar, Map, Theater, Settings, ChevronRight, HeartHandshake, Clock, Eye
};

// Committee interface
interface Committee {
  id: string;
  name: string;
  db_name: string;
  description: string;
  icon_name: string;
  color: string;
  goals: string | null;
  vision: string | null;
  plans: string | null;
  gallery_urls: string[];
  group_chat_id: string | null;
  is_active: boolean;
  created_at: string;
}

// Member interface
interface CommitteeMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Resource interface
interface CommitteeResource {
  id: string;
  name: string;
  description: string | null;
  url: string;
  category: 'document' | 'link';
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

// Join request interface
interface JoinRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
}

export default function CommitteeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  // State
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [resources, setResources] = useState<CommitteeResource[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Membership state
  const [isMember, setIsMember] = useState(false);
  const [isCommitteeAdmin, setIsCommitteeAdmin] = useState(false);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);

  // Modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Gallery modal state
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    index: number;
  } | null>(null);
  const [galleryItems, setGalleryItems] = useState<{ url: string; type: 'image' | 'video' }[]>([]);

  // Admin Management Modal state
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageTab, setManageTab] = useState<'details' | 'gallery' | 'resources' | 'requests' | 'members'>('requests');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<CommitteeMember[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [processingMember, setProcessingMember] = useState<string | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Edit Details state
  const [editDescription, setEditDescription] = useState('');
  const [editGoals, setEditGoals] = useState('');
  const [editVision, setEditVision] = useState('');
  const [editPlans, setEditPlans] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Resources state
  const [committeeResources, setCommitteeResources] = useState<CommitteeResource[]>([]);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceCategory, setResourceCategory] = useState<'document' | 'link'>('document');
  const [savingResource, setSavingResource] = useState(false);

  // Fetch all committee data
  const fetchCommitteeData = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch committee details
      const { data: committeeData, error: committeeError } = await supabase
        .from('centenary_committees')
        .select('*')
        .eq('id', id)
        .single();

      if (committeeError) throw committeeError;
      setCommittee(committeeData);

      // Fetch member count
      const { count, error: countError } = await supabase
        .from('centenary_committee_members')
        .select('*', { count: 'exact', head: true })
        .eq('committee_id', id);

      if (!countError) {
        setMemberCount(count || 0);
      }

      // Fetch members with profiles (limit to 10 for display)
      const { data: membersData, error: membersError } = await supabase
        .from('centenary_committee_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profile:profiles!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('committee_id', id)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true })
        .limit(10);

      if (!membersError && membersData) {
        // Transform the data to match our interface
        const transformedMembers = membersData.map((m: any) => ({
          ...m,
          profile: m.profile || { id: m.user_id, full_name: 'Unknown', avatar_url: null }
        }));
        setMembers(transformedMembers);
      }

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('centenary_committee_resources')
        .select('*')
        .eq('committee_id', id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (!resourcesError && resourcesData) {
        setResources(resourcesData);
      }

      // Check if current user is a member
      if (user?.id) {
        const { data: membershipData, error: membershipError } = await supabase
          .from('centenary_committee_members')
          .select('id, role')
          .eq('committee_id', id)
          .eq('user_id', user.id)
          .single();

        if (!membershipError && membershipData) {
          setIsMember(true);
          setIsCommitteeAdmin(membershipData.role === 'admin');
        } else {
          setIsMember(false);
          setIsCommitteeAdmin(false);
        }

        // Check for pending join request
        const { data: requestData } = await supabase
          .from('centenary_committee_join_requests')
          .select('*')
          .eq('committee_id', id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (requestData) {
          setMyRequest(requestData);
        } else {
          setMyRequest(null);
        }
      }
    } catch (error) {
      console.error('Error fetching committee data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    fetchCommitteeData();
  }, [fetchCommitteeData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCommitteeData();
  }, [fetchCommitteeData]);

  // Submit join request
  const handleSubmitJoinRequest = async () => {
    if (!user?.id || !id) {
      Alert.alert('Login Required', 'Please login to request to join this committee.');
      return;
    }

    setSubmittingRequest(true);
    try {
      console.log('Submitting join request:', { committee_id: id, user_id: user.id });
      
      const { data, error } = await supabase
        .from('centenary_committee_join_requests')
        .insert({
          committee_id: id,
          user_id: user.id,
          message: joinMessage.trim() || null,
          status: 'pending',
        })
        .select();

      console.log('Join request result:', { data, error });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Requested', 'You have already submitted a request to join this committee.');
        } else {
          throw error;
        }
      } else {
        Alert.alert('Request Submitted', 'Your request to join this committee has been submitted. You will be notified when it is reviewed.');
        setShowJoinModal(false);
        setJoinMessage('');
        fetchCommitteeData(); // Refresh to show pending status
      }
    } catch (error: any) {
      console.error('Error submitting join request:', error);
      Alert.alert('Error', error.message || 'Failed to submit join request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Cancel pending request
  const handleCancelRequest = async () => {
    if (!myRequest) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel your join request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_committee_join_requests')
                .delete()
                .eq('id', myRequest.id);

              if (error) throw error;
              setMyRequest(null);
              Alert.alert('Request Cancelled', 'Your join request has been cancelled.');
            } catch (error: any) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Navigate to group chat
  const handleOpenChat = () => {
    if (!isMember) {
      Alert.alert('Access Denied', 'Only committee members can access the group chat.');
      return;
    }

    if (committee?.group_chat_id) {
      router.push(`/chat/group/${committee.group_chat_id}`);
    } else {
      Alert.alert('Chat Unavailable', 'The group chat for this committee is not yet set up.');
    }
  };

  // Open resource
  const handleOpenResource = async (resource: CommitteeResource) => {
    try {
      if (resource.category === 'link') {
        await Linking.openURL(resource.url);
      } else {
        // For documents, try to open the URL
        const canOpen = await Linking.canOpenURL(resource.url);
        if (canOpen) {
          await Linking.openURL(resource.url);
        } else {
          Alert.alert('Cannot Open', 'Unable to open this document. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error opening resource:', error);
      Alert.alert('Error', 'Failed to open resource.');
    }
  };

  // Build gallery items
  const buildGalleryItems = useCallback(() => {
    if (!committee?.gallery_urls) return [];
    return committee.gallery_urls.map((url) => ({
      url,
      type: (url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('video'))
        ? 'video' as const
        : 'image' as const,
    }));
  }, [committee?.gallery_urls]);

  // =====================================================
  // COMMITTEE ADMIN MANAGEMENT FUNCTIONS
  // =====================================================

  const openManageModal = async () => {
    if (!id || !committee) return;
    setManageTab('details');
    
    // Initialize edit fields with current committee data
    setEditDescription(committee.description || '');
    setEditGoals(committee.goals || '');
    setEditVision(committee.vision || '');
    setEditPlans(committee.plans || '');
    
    setShowManageModal(true);
    
    // Fetch pending requests, all members, and resources
    await Promise.all([
      fetchPendingRequests(),
      fetchAllMembers(),
      fetchCommitteeResources(),
    ]);
  };

  const fetchCommitteeResources = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('centenary_committee_resources')
        .select('*')
        .eq('committee_id', id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCommitteeResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchPendingRequests = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('centenary_committee_join_requests')
        .select(`
          *,
          profile:profiles!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('committee_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setPendingRequests(data.map((r: any) => ({
          ...r,
          profile: r.profile || { id: r.user_id, full_name: 'Unknown', avatar_url: null }
        })));
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchAllMembers = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('centenary_committee_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profile:profiles!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('committee_id', id)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (!error && data) {
        setAllMembers(data.map((m: any) => ({
          ...m,
          profile: m.profile || { id: m.user_id, full_name: 'Unknown', avatar_url: null }
        })));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleApproveRequest = async (request: any) => {
    setProcessingRequest(request.id);
    try {
      // Add user as member
      const { error: memberError } = await supabase
        .from('centenary_committee_members')
        .insert({
          committee_id: id,
          user_id: request.user_id,
          role: 'member',
        });

      if (memberError) throw memberError;

      // Update request status
      const { error: requestError } = await supabase
        .from('centenary_committee_join_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (requestError) throw requestError;

      Alert.alert('Success', `${request.profile.full_name} has been added to the committee!`);
      fetchPendingRequests();
      fetchAllMembers();
      fetchCommitteeData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: any) => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject ${request.profile.full_name}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequest(request.id);
            try {
              const { error } = await supabase
                .from('centenary_committee_join_requests')
                .update({ status: 'rejected' })
                .eq('id', request.id);

              if (error) throw error;
              fetchPendingRequests();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject request');
            } finally {
              setProcessingRequest(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleMemberRole = async (member: CommitteeMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const actionText = newRole === 'admin' ? 'promote to admin' : 'demote to member';
    
    Alert.alert(
      'Change Role',
      `Are you sure you want to ${actionText} ${member.profile.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setProcessingMember(member.id);
            try {
              const { error } = await supabase
                .from('centenary_committee_members')
                .update({ role: newRole })
                .eq('id', member.id);

              if (error) throw error;
              
              await fetchAllMembers();
              Alert.alert('Success', `${member.profile.full_name} is now a ${newRole}`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update role');
            } finally {
              setProcessingMember(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (member: CommitteeMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.profile.full_name} from this committee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setProcessingMember(member.id);
            try {
              const { error } = await supabase
                .from('centenary_committee_members')
                .delete()
                .eq('id', member.id);

              if (error) throw error;
              
              await fetchAllMembers();
              fetchCommitteeData();
              Alert.alert('Success', `${member.profile.full_name} has been removed from the committee`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            } finally {
              setProcessingMember(null);
            }
          },
        },
      ]
    );
  };

  const handleAddGalleryMedia = async () => {
    if (!committee || !user?.id) return;

    try {
      const media = await pickMedia();
      if (!media) return;

      setUploadingGallery(true);
      const mediaType = media.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMedia(media.uri, user.id, mediaType);

      if (uploadedUrl) {
        const newGalleryUrls = [...(committee.gallery_urls || []), uploadedUrl];
        
        const { error } = await supabase
          .from('centenary_committees')
          .update({ gallery_urls: newGalleryUrls })
          .eq('id', id);

        if (error) throw error;
        
        fetchCommitteeData();
        Alert.alert('Success', 'Media added to gallery');
      }
    } catch (error: any) {
      console.error('Error uploading gallery media:', error);
      Alert.alert('Error', error.message || 'Failed to upload media');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveGalleryMedia = async (urlToRemove: string) => {
    if (!committee) return;

    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this media from the gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const newGalleryUrls = (committee.gallery_urls || []).filter(url => url !== urlToRemove);
              
              const { error } = await supabase
                .from('centenary_committees')
                .update({ gallery_urls: newGalleryUrls })
                .eq('id', id);

              if (error) throw error;
              
              fetchCommitteeData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove media');
            }
          },
        },
      ]
    );
  };

  // Save Committee Details
  const saveCommitteeDetails = async () => {
    if (!committee || !id) return;

    setSavingDetails(true);
    try {
      const { error } = await supabase
        .from('centenary_committees')
        .update({
          description: editDescription.trim() || null,
          goals: editGoals.trim() || null,
          vision: editVision.trim() || null,
          plans: editPlans.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      fetchCommitteeData();
      Alert.alert('Success', 'Committee details updated successfully');
    } catch (error: any) {
      console.error('Error saving committee details:', error);
      Alert.alert('Error', error.message || 'Failed to save committee details');
    } finally {
      setSavingDetails(false);
    }
  };

  // Resource Functions
  const openAddResourceModal = () => {
    setResourceName('');
    setResourceDescription('');
    setResourceUrl('');
    setResourceCategory('document');
    setShowAddResourceModal(true);
  };

  const handlePickDocument = async () => {
    try {
      const doc = await pickDocument();
      if (!doc || !user?.id) return;

      setSavingResource(true);
      const uploadedUrl = await uploadDocument(doc.uri, user.id, doc.name);

      if (uploadedUrl) {
        setResourceUrl(uploadedUrl);
        if (!resourceName) {
          setResourceName(doc.name);
        }
        Alert.alert('Success', 'Document uploaded. Save to add it to resources.');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', error.message || 'Failed to upload document');
    } finally {
      setSavingResource(false);
    }
  };

  const saveResource = async () => {
    if (!committee || !user?.id) {
      Alert.alert('Error', 'Session error. Please try again.');
      return;
    }
    if (!resourceName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!resourceUrl.trim()) {
      Alert.alert('Error', 'URL or document is required');
      return;
    }

    setSavingResource(true);
    try {
      const { error } = await supabase
        .from('centenary_committee_resources')
        .insert({
          committee_id: committee.id,
          name: resourceName.trim(),
          description: resourceDescription.trim() || null,
          url: resourceUrl.trim(),
          category: resourceCategory,
          uploaded_by: user.id,
        });

      if (error) throw error;

      setShowAddResourceModal(false);
      fetchCommitteeResources();
      Alert.alert('Success', 'Resource added successfully');
    } catch (error: any) {
      console.error('Error saving resource:', error);
      Alert.alert('Error', error.message || 'Failed to save resource');
    } finally {
      setSavingResource(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    Alert.alert(
      'Delete Resource',
      'Are you sure you want to delete this resource?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_committee_resources')
                .delete()
                .eq('id', resourceId);

              if (error) throw error;
              fetchCommitteeResources();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Render membership status / action button
  const renderMembershipAction = () => {
    if (!user) {
      return (
        <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/login')}>
          <UserPlus size={18} color="#fff" />
          <Text style={styles.joinButtonText}>Login to Join</Text>
        </TouchableOpacity>
      );
    }

    if (isMember) {
      return (
        <View style={styles.memberBadge}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.memberBadgeText}>
            {isCommitteeAdmin ? 'Committee Admin' : 'Member'}
          </Text>
        </View>
      );
    }

    if (myRequest?.status === 'pending') {
      return (
        <TouchableOpacity style={styles.pendingButton} onPress={handleCancelRequest}>
          <Clock size={16} color="#F59E0B" />
          <Text style={styles.pendingButtonText}>Request Pending</Text>
        </TouchableOpacity>
      );
    }

    if (myRequest?.status === 'rejected') {
      return (
        <View style={styles.rejectedBadge}>
          <XCircle size={16} color="#EF4444" />
          <Text style={styles.rejectedBadgeText}>Request Declined</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
        <UserPlus size={18} color="#fff" />
        <Text style={styles.joinButtonText}>Request to Join</Text>
      </TouchableOpacity>
    );
  };

  // Get document icon and color based on file type or name
  const getDocumentIconColor = (doc: { name: string; url: string; file_type: string | null }): string => {
    // First try to get extension from name or URL
    const fileName = doc.name || doc.url || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Check by extension
    if (ext === 'pdf') return '#DC2626'; // Red for PDF
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#059669'; // Green for Excel/CSV
    if (['doc', 'docx'].includes(ext)) return '#2563EB'; // Blue for Word
    if (['ppt', 'pptx'].includes(ext)) return '#EA580C'; // Orange for PowerPoint
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '#7C3AED'; // Purple for images
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '#6B7280'; // Gray for archives
    if (ext === 'txt') return '#374151'; // Dark gray for text
    
    // Fallback: check file_type field
    if (doc.file_type) {
      const type = doc.file_type.toLowerCase();
      if (type.includes('pdf')) return '#DC2626';
      if (type.includes('xls') || type.includes('excel') || type.includes('spreadsheet')) return '#059669';
      if (type.includes('doc') || type.includes('word')) return '#2563EB';
      if (type.includes('ppt') || type.includes('powerpoint') || type.includes('presentation')) return '#EA580C';
      if (type.includes('image')) return '#7C3AED';
      if (type.includes('zip') || type.includes('archive') || type.includes('compressed')) return '#6B7280';
    }
    
    return COLORS.tabBarActive; // Default gold
  };

  // Render section
  const renderSection = (
    title: string,
    icon: React.ReactNode,
    content: string | null,
    emptyText: string = 'No information available.',
    backgroundColor?: string
  ) => {
    if (!content && !isCommitteeAdmin) return null;

    return (
      <View style={[styles.section, backgroundColor ? { backgroundColor } : null]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>{icon}</View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.sectionContent}>
          {content || emptyText}
        </Text>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.tabBarActive} />
        <Text style={styles.loadingText}>Loading committee...</Text>
      </View>
    );
  }

  // Not found state
  if (!committee) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Committee not found</Text>
        <TouchableOpacity style={styles.backButtonStyled} onPress={() => router.back()}>
          <Text style={styles.backButtonStyledText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const galleryItemsData = buildGalleryItems();
  const documents = resources.filter((r) => r.category === 'document');
  const links = resources.filter((r) => r.category === 'link');

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <ArrowLeft size={22} color={COLORS.tabBar} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {committee.name}
          </Text>
          {isCommitteeAdmin ? (
            <TouchableOpacity onPress={openManageModal} style={styles.headerSettingsBtn}>
              <Settings size={22} color={COLORS.tabBarActive} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.tabBarActive} />
        }
      >
        {/* Committee Header Card */}
        <View style={styles.heroCard}>
          {/* Committee Icon */}
          <View style={styles.heroIconContainer}>
            {(() => {
              const Icon = ICON_MAP[committee.icon_name] || Users;
              return <Icon size={40} color={COLORS.tabBarActive} />;
            })()}
          </View>

          {/* Committee Name */}
          <Text style={styles.heroTitle}>{committee.name}</Text>

          {/* Member Count */}
          <View style={styles.memberCountRow}>
            <Users size={16} color="#6B7280" />
            <Text style={styles.memberCountText}>
              {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
            </Text>
          </View>

          {/* Description */}
          {committee.description && (
            <Text style={styles.heroDescription}>{committee.description}</Text>
          )}

          {/* Membership Action */}
          <View style={styles.membershipActionContainer}>
            {renderMembershipAction()}
          </View>
        </View>

        {/* Goals Section */}
        {renderSection(
          'Goals',
          <Target size={20} color={COLORS.tabBarActive} />,
          committee.goals,
          'Committee goals will be shared soon.'
        )}

        {/* Vision Section */}
        {renderSection(
          'Vision',
          <Eye size={20} color={COLORS.tabBarActive} />,
          committee.vision,
          'Committee vision will be shared soon.',
          '#FEF9E7'
        )}

        {/* Plans Section */}
        {renderSection(
          'Committee Plans',
          <ClipboardList size={20} color={COLORS.tabBarActive} />,
          committee.plans,
          'Committee plans will be announced soon.'
        )}

        {/* Gallery Section */}
        {galleryItemsData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <ImageIcon size={20} color={COLORS.tabBarActive} />
              </View>
              <Text style={styles.sectionTitle}>Gallery</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScrollContent}
            >
              <View style={styles.galleryTwoRowContainer}>
                {/* First row - odd indices (0, 2, 4...) */}
                <View style={styles.galleryRow}>
                  {galleryItemsData.filter((_, i) => i % 2 === 0).map((item, index) => (
                    <TouchableOpacity
                      key={index * 2}
                      activeOpacity={0.9}
                      onPress={() => {
                        setGalleryItems(galleryItemsData);
                        setFullscreenMedia({ ...item, index: index * 2 });
                      }}
                      style={styles.galleryItem}
                    >
                      {item.type === 'video' ? (
                        <>
                          <Video
                            source={{ uri: item.url }}
                            style={styles.galleryItemMedia}
                            resizeMode={"cover" as any}
                            shouldPlay={false}
                          />
                          <View style={styles.videoIconOverlay}>
                            <View style={styles.videoIconCircle}>
                              <Play size={20} color="#fff" />
                            </View>
                          </View>
                        </>
                      ) : (
                        <Image source={{ uri: item.url }} style={styles.galleryItemMedia} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Second row - even indices (1, 3, 5...) */}
                <View style={styles.galleryRow}>
                  {galleryItemsData.filter((_, i) => i % 2 === 1).map((item, index) => (
                    <TouchableOpacity
                      key={index * 2 + 1}
                      activeOpacity={0.9}
                      onPress={() => {
                        setGalleryItems(galleryItemsData);
                        setFullscreenMedia({ ...item, index: index * 2 + 1 });
                      }}
                      style={styles.galleryItem}
                    >
                      {item.type === 'video' ? (
                        <>
                          <Video
                            source={{ uri: item.url }}
                            style={styles.galleryItemMedia}
                            resizeMode={"cover" as any}
                            shouldPlay={false}
                          />
                          <View style={styles.videoIconOverlay}>
                            <View style={styles.videoIconCircle}>
                              <Play size={20} color="#fff" />
                            </View>
                          </View>
                        </>
                      ) : (
                        <Image source={{ uri: item.url }} style={styles.galleryItemMedia} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Resources Section - Documents */}
        {documents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <File size={20} color={COLORS.tabBarActive} />
              </View>
              <Text style={styles.sectionTitle}>Documents</Text>
            </View>
            {documents.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.resourceItem}
                onPress={() => handleOpenResource(doc)}
              >
                <View style={[styles.resourceIconContainer, { backgroundColor: `${getDocumentIconColor(doc)}15` }]}>
                  <FileText size={20} color={getDocumentIconColor(doc)} />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceName}>
                    {doc.name}
                  </Text>
                  {doc.description && (
                    <Text style={styles.resourceDescription}>
                      {doc.description}
                    </Text>
                  )}
                  {doc.file_type && (
                    <Text style={styles.resourceMeta}>
                      {doc.file_type.toUpperCase()}
                      {doc.file_size ? ` • ${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                    </Text>
                  )}
                </View>
                <Download size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Resources Section - Links */}
        {links.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <LinkIcon size={20} color={COLORS.tabBarActive} />
              </View>
              <Text style={styles.sectionTitle}>Useful Links</Text>
            </View>
            {links.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={styles.resourceItem}
                onPress={() => handleOpenResource(link)}
              >
                <View style={[styles.resourceIconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <ExternalLink size={20} color="#2563EB" />
                </View>
                <View style={styles.resourceInfo}>
                  <Text style={[styles.resourceName, { color: '#2563EB' }]}>
                    {link.name}
                  </Text>
                  {link.description && (
                    <Text style={styles.resourceDescription}>
                      {link.description}
                    </Text>
                  )}
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Chat Button - Fixed at Bottom */}
      <View style={styles.chatButtonContainer}>
        <TouchableOpacity
          style={[
            styles.chatButton,
            !isMember && styles.chatButtonDisabled,
          ]}
          onPress={handleOpenChat}
          disabled={!isMember}
        >
          {isMember ? (
            <>
              <MessageCircle size={22} color="#fff" />
              <Text style={styles.chatButtonText}>Open Committee Chat</Text>
            </>
          ) : (
            <>
              <Lock size={20} color="#9CA3AF" />
              <Text style={styles.chatButtonTextDisabled}>
                Join to Access Chat
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Join Request Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <TouchableWithoutFeedback>
                <View style={styles.joinModalContent}>
                  <View style={styles.joinModalHeader}>
                    <Text style={styles.joinModalTitle}>Request to Join</Text>
                    <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                      <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.joinModalSubtitle}>
                    Join the {committee.name} committee to collaborate with fellow members and access the private group chat.
                  </Text>

                  <Text style={styles.inputLabel}>Message (Optional)</Text>
                  <TextInput
                    style={styles.messageInput}
                    placeholder="Tell us why you'd like to join..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={joinMessage}
                    onChangeText={setJoinMessage}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[styles.submitButton, submittingRequest && styles.submitButtonDisabled]}
                    onPress={handleSubmitJoinRequest}
                    disabled={submittingRequest}
                  >
                    {submittingRequest ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Send size={18} color="#fff" />
                        <Text style={styles.submitButtonText}>Submit Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Committee Admin Management Modal */}
      <Modal
        visible={showManageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.manageModalContainer}>
          <View style={styles.manageModalStatusBar} />
          <SafeAreaView style={styles.manageModalSafeArea} edges={['left', 'right']}>
            {/* Header */}
            <View style={styles.manageModalHeader}>
              <TouchableOpacity onPress={() => setShowManageModal(false)} style={styles.manageModalCloseBtn}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.manageModalTitle} numberOfLines={1}>
                Manage Committee
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.manageTabsScroll}>
              <View style={styles.manageTabs}>
                <TouchableOpacity
                  style={[styles.manageTab, manageTab === 'details' && styles.manageTabActive]}
                  onPress={() => setManageTab('details')}
                >
                  <Edit3 size={18} color={manageTab === 'details' ? COLORS.tabBarActive : '#6B7280'} />
                  <Text style={[styles.manageTabText, manageTab === 'details' && styles.manageTabTextActive]}>
                    Details
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manageTab, manageTab === 'gallery' && styles.manageTabActive]}
                  onPress={() => setManageTab('gallery')}
                >
                  <ImageIcon size={18} color={manageTab === 'gallery' ? COLORS.tabBarActive : '#6B7280'} />
                  <Text style={[styles.manageTabText, manageTab === 'gallery' && styles.manageTabTextActive]}>
                    Gallery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manageTab, manageTab === 'resources' && styles.manageTabActive]}
                  onPress={() => setManageTab('resources')}
                >
                  <FileText size={18} color={manageTab === 'resources' ? COLORS.tabBarActive : '#6B7280'} />
                  <Text style={[styles.manageTabText, manageTab === 'resources' && styles.manageTabTextActive]}>
                    Resources
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manageTab, manageTab === 'requests' && styles.manageTabActive]}
                  onPress={() => setManageTab('requests')}
                >
                  <UserCheck size={18} color={manageTab === 'requests' ? COLORS.tabBarActive : '#6B7280'} />
                  <Text style={[styles.manageTabText, manageTab === 'requests' && styles.manageTabTextActive]}>
                    Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manageTab, manageTab === 'members' && styles.manageTabActive]}
                  onPress={() => setManageTab('members')}
                >
                  <Shield size={18} color={manageTab === 'members' ? COLORS.tabBarActive : '#6B7280'} />
                  <Text style={[styles.manageTabText, manageTab === 'members' && styles.manageTabTextActive]}>
                    Members
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <ScrollView style={styles.manageModalContent} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Details Tab */}
              {manageTab === 'details' && (
                <View>
                  <Text style={styles.manageSubtitle}>Edit Committee Details</Text>

                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.editTextArea}
                    placeholder="Committee description..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    textAlignVertical="top"
                  />

                  <Text style={styles.inputLabel}>Goals</Text>
                  <TextInput
                    style={styles.editTextArea}
                    placeholder="Committee goals..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={editGoals}
                    onChangeText={setEditGoals}
                    textAlignVertical="top"
                  />

                  <Text style={styles.inputLabel}>Vision</Text>
                  <TextInput
                    style={styles.editTextArea}
                    placeholder="Committee vision..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={editVision}
                    onChangeText={setEditVision}
                    textAlignVertical="top"
                  />

                  <Text style={styles.inputLabel}>Plans</Text>
                  <TextInput
                    style={styles.editTextArea}
                    placeholder="Committee plans..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={editPlans}
                    onChangeText={setEditPlans}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={[styles.saveDetailsBtn, savingDetails && { opacity: 0.5 }]}
                    onPress={saveCommitteeDetails}
                    disabled={savingDetails}
                  >
                    {savingDetails ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Save size={18} color="#FFFFFF" />
                        <Text style={styles.saveDetailsBtnText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Gallery Tab */}
              {manageTab === 'gallery' && (
                <View>
                  <View style={styles.manageHeader}>
                    <Text style={styles.manageSubtitle}>Committee Gallery</Text>
                    <TouchableOpacity
                      style={[styles.manageAddBtn, uploadingGallery && { opacity: 0.5 }]}
                      onPress={handleAddGalleryMedia}
                      disabled={uploadingGallery}
                    >
                      {uploadingGallery ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Upload size={16} color="#FFFFFF" />
                          <Text style={styles.manageAddBtnText}>Add Media</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {!committee.gallery_urls || committee.gallery_urls.length === 0 ? (
                    <View style={styles.emptyManageState}>
                      <ImageIcon size={48} color="#D1D5DB" />
                      <Text style={styles.emptyManageText}>No gallery media yet</Text>
                      <Text style={styles.emptyManageHint}>Add photos and videos to showcase the committee</Text>
                    </View>
                  ) : (
                    <View style={styles.manageGalleryGrid}>
                      {committee.gallery_urls.map((url, index) => {
                        const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('video');
                        return (
                          <View key={index} style={styles.manageGalleryItem}>
                            {isVideo ? (
                              <View style={styles.manageGalleryVideoPlaceholder}>
                                <Play size={24} color="#FFFFFF" />
                              </View>
                            ) : (
                              <Image source={{ uri: url }} style={styles.manageGalleryImage} />
                            )}
                            <TouchableOpacity
                              style={styles.manageGalleryRemoveBtn}
                              onPress={() => handleRemoveGalleryMedia(url)}
                            >
                              <X size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Resources Tab */}
              {manageTab === 'resources' && (
                <View>
                  <View style={styles.manageHeader}>
                    <Text style={styles.manageSubtitle}>Documents & Links</Text>
                    <TouchableOpacity style={styles.manageAddBtn} onPress={openAddResourceModal}>
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.manageAddBtnText}>Add Resource</Text>
                    </TouchableOpacity>
                  </View>

                  {committeeResources.length === 0 ? (
                    <View style={styles.emptyManageState}>
                      <FileText size={48} color="#D1D5DB" />
                      <Text style={styles.emptyManageText}>No resources yet</Text>
                      <Text style={styles.emptyManageHint}>Add documents and links for committee members</Text>
                    </View>
                  ) : (
                    <View style={styles.resourceList}>
                      {committeeResources.map((resource) => (
                        <View key={resource.id} style={styles.resourceItem}>
                          <View style={styles.resourceIcon}>
                            {resource.category === 'link' ? (
                              <LinkIcon size={20} color={COLORS.tabBarActive} />
                            ) : (
                              <FileText size={20} color={COLORS.tabBarActive} />
                            )}
                          </View>
                          <View style={styles.resourceInfo}>
                            <Text style={styles.resourceName}>{resource.name}</Text>
                            {resource.description && (
                              <Text style={styles.resourceDescription} numberOfLines={1}>
                                {resource.description}
                              </Text>
                            )}
                            <Text style={styles.resourceCategory}>
                              {resource.category === 'link' ? 'External Link' : 'Document'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.resourceDeleteBtn}
                            onPress={() => deleteResource(resource.id)}
                          >
                            <Trash2 size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Requests Tab */}
              {manageTab === 'requests' && (
                <View>
                  <Text style={styles.manageSubtitle}>Pending Join Requests</Text>

                  {pendingRequests.length === 0 ? (
                    <View style={styles.emptyManageState}>
                      <UserCheck size={48} color="#D1D5DB" />
                      <Text style={styles.emptyManageText}>No pending requests</Text>
                      <Text style={styles.emptyManageHint}>All join requests have been processed</Text>
                    </View>
                  ) : (
                    <View style={styles.requestList}>
                      {pendingRequests.map((request) => (
                        <View key={request.id} style={styles.requestItem}>
                          <TouchableOpacity 
                            style={styles.requestProfile}
                            onPress={() => {
                              setShowManageModal(false);
                              debouncedRouter.push(`/user-profile/${request.user_id}`);
                            }}
                            activeOpacity={0.7}
                          >
                            {request.profile.avatar_url ? (
                              <Image
                                source={{ uri: request.profile.avatar_url }}
                                style={styles.requestAvatar}
                              />
                            ) : (
                              <View style={styles.requestAvatarPlaceholder}>
                                <Text style={styles.requestAvatarText}>
                                  {request.profile.full_name?.[0] || '?'}
                                </Text>
                              </View>
                            )}
                            <View style={styles.requestInfo}>
                              <Text style={styles.requestName}>
                                {request.profile.full_name}
                              </Text>
                              <View style={styles.requestTimeRow}>
                                <Clock size={12} color="#9CA3AF" />
                                <Text style={styles.requestTime}>
                                  {new Date(request.created_at).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          {request.message && (
                            <Text style={styles.requestMessage} numberOfLines={3}>
                              "{request.message}"
                            </Text>
                          )}
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={[styles.requestActionBtn, styles.requestRejectBtn]}
                              onPress={() => handleRejectRequest(request)}
                              disabled={processingRequest === request.id}
                            >
                              {processingRequest === request.id ? (
                                <ActivityIndicator size="small" color="#0F172A" />
                              ) : (
                                <>
                                  <UserX size={16} color="#EF4444" />
                                  <Text style={styles.requestRejectText}>Reject</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.requestActionBtn, styles.requestApproveBtn]}
                              onPress={() => handleApproveRequest(request)}
                              disabled={processingRequest === request.id}
                            >
                              {processingRequest === request.id ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <UserCheck size={16} color="#FFFFFF" />
                                  <Text style={styles.requestApproveText}>Approve</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Members Tab */}
              {manageTab === 'members' && (
                <View>
                  <Text style={styles.manageSubtitle}>
                    Committee Members ({allMembers.length})
                  </Text>

                  {allMembers.length === 0 ? (
                    <View style={styles.emptyManageState}>
                      <Users size={48} color="#D1D5DB" />
                      <Text style={styles.emptyManageText}>No members yet</Text>
                      <Text style={styles.emptyManageHint}>Approve join requests to add members</Text>
                    </View>
                  ) : (
                    <View style={styles.manageMembersList}>
                      {allMembers.map((member) => (
                        <View key={member.id} style={styles.manageMemberItem}>
                          <TouchableOpacity 
                            style={styles.manageMemberProfile}
                            onPress={() => {
                              setShowManageModal(false);
                              debouncedRouter.push(`/user-profile/${member.user_id}`);
                            }}
                            activeOpacity={0.7}
                          >
                            {member.profile.avatar_url ? (
                              <Image
                                source={{ uri: member.profile.avatar_url }}
                                style={styles.manageMemberAvatar}
                              />
                            ) : (
                              <View style={styles.manageMemberAvatarPlaceholder}>
                                <Text style={styles.manageMemberAvatarText}>
                                  {member.profile.full_name?.[0] || '?'}
                                </Text>
                              </View>
                            )}
                            <View style={styles.manageMemberInfo}>
                              <View style={styles.manageMemberNameRow}>
                                <Text style={styles.manageMemberName}>
                                  {member.profile.full_name}
                                </Text>
                                {member.role === 'admin' && (
                                  <View style={styles.adminBadge}>
                                    <Shield size={10} color="#FFFFFF" />
                                    <Text style={styles.adminBadgeText}>Admin</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.manageMemberJoinedDate}>
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View style={styles.manageMemberActions}>
                            <TouchableOpacity
                              style={[
                                styles.memberRoleBtn,
                                member.role === 'admin' ? styles.demoteBtn : styles.promoteBtn
                              ]}
                              onPress={() => handleToggleMemberRole(member)}
                              disabled={processingMember === member.id}
                            >
                              {processingMember === member.id ? (
                                <ActivityIndicator size="small" color="#0F172A" />
                              ) : (
                                <Text style={[
                                  styles.memberRoleBtnText,
                                  member.role === 'admin' ? styles.demoteBtnText : styles.promoteBtnText
                                ]}>
                                  {member.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.memberRemoveBtn}
                              onPress={() => handleRemoveMember(member)}
                              disabled={processingMember === member.id}
                            >
                              <UserMinus size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Add Resource Overlay - inside Management Modal */}
            {showAddResourceModal && (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.resourceModalOverlay}>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.resourceKeyboardView}
                  >
                    <TouchableWithoutFeedback>
                      <View style={styles.resourceModalContent}>
                        <View style={styles.resourceModalHeader}>
                          <Text style={styles.resourceModalTitle}>Add Resource</Text>
                          <TouchableOpacity onPress={() => setShowAddResourceModal(false)}>
                            <X size={24} color="#111827" />
                          </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                          <Text style={styles.inputLabel}>Name *</Text>
                          <TextInput
                            style={styles.resourceInput}
                            value={resourceName}
                            onChangeText={setResourceName}
                            placeholder="Resource name"
                            placeholderTextColor="#9CA3AF"
                          />

                          <Text style={styles.inputLabel}>Description</Text>
                          <TextInput
                            style={[styles.resourceInput, { height: 80, textAlignVertical: 'top' }]}
                            value={resourceDescription}
                            onChangeText={setResourceDescription}
                            placeholder="Brief description"
                            placeholderTextColor="#9CA3AF"
                            multiline
                          />

                          <Text style={styles.inputLabel}>Category</Text>
                          <View style={styles.resourceTypeSelector}>
                            <TouchableOpacity
                              style={[styles.resourceTypeBtn, resourceCategory === 'document' && styles.resourceTypeBtnActive]}
                              onPress={() => setResourceCategory('document')}
                            >
                              <FileText size={16} color={resourceCategory === 'document' ? '#FFFFFF' : '#6B7280'} />
                              <Text style={[styles.resourceTypeBtnText, resourceCategory === 'document' && styles.resourceTypeBtnTextActive]}>
                                Document
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.resourceTypeBtn, resourceCategory === 'link' && styles.resourceTypeBtnActive]}
                              onPress={() => setResourceCategory('link')}
                            >
                              <LinkIcon size={16} color={resourceCategory === 'link' ? '#FFFFFF' : '#6B7280'} />
                              <Text style={[styles.resourceTypeBtnText, resourceCategory === 'link' && styles.resourceTypeBtnTextActive]}>
                                Link
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {resourceCategory === 'document' ? (
                            <>
                              <Text style={styles.inputLabel}>Document</Text>
                              {resourceUrl ? (
                                <View style={styles.uploadedDocContainer}>
                                  <FileText size={20} color={COLORS.tabBarActive} />
                                  <Text style={styles.uploadedDocText} numberOfLines={1}>
                                    Document uploaded
                                  </Text>
                                  <TouchableOpacity onPress={() => setResourceUrl('')}>
                                    <X size={18} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.uploadDocBtn}
                                  onPress={handlePickDocument}
                                  disabled={savingResource}
                                >
                                  {savingResource ? (
                                    <ActivityIndicator size="small" color={COLORS.tabBarActive} />
                                  ) : (
                                    <>
                                      <Upload size={18} color={COLORS.tabBarActive} />
                                      <Text style={styles.uploadDocBtnText}>Upload Document</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}
                            </>
                          ) : (
                            <>
                              <Text style={styles.inputLabel}>URL *</Text>
                              <TextInput
                                style={styles.resourceInput}
                                value={resourceUrl}
                                onChangeText={setResourceUrl}
                                placeholder="https://..."
                                placeholderTextColor="#9CA3AF"
                                keyboardType="url"
                                autoCapitalize="none"
                              />
                            </>
                          )}

                          <TouchableOpacity
                            style={[styles.saveResourceBtn, savingResource && { opacity: 0.5 }]}
                            onPress={saveResource}
                            disabled={savingResource}
                          >
                            {savingResource ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.saveResourceBtnText}>Save Resource</Text>
                            )}
                          </TouchableOpacity>
                        </ScrollView>
                      </View>
                    </TouchableWithoutFeedback>
                  </KeyboardAvoidingView>
                </View>
              </TouchableWithoutFeedback>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Fullscreen Gallery Modal */}
      {fullscreenMedia && (
        <Modal
          visible={!!fullscreenMedia}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenMedia(null)}
        >
          <View style={styles.galleryModalOverlay}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.galleryModalClose}
              onPress={() => setFullscreenMedia(null)}
            >
              <View style={styles.closeButtonCircle}>
                <X size={22} color="#333" />
              </View>
            </TouchableOpacity>

            {/* Gallery Counter */}
            {galleryItems.length > 1 && (
              <View style={styles.galleryCounter}>
                <Text style={styles.galleryCounterText}>
                  {(fullscreenMedia.index ?? 0) + 1} / {galleryItems.length}
                </Text>
              </View>
            )}

            {/* Swipeable Gallery */}
            <FlatList
              data={galleryItems}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={fullscreenMedia.index ?? 0}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (galleryItems[newIndex]) {
                  setFullscreenMedia({ ...galleryItems[newIndex], index: newIndex });
                }
              }}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.galleryModalMediaContainer}>
                  {item.type === 'video' ? (
                    <Video
                      source={{ uri: item.url }}
                      style={styles.galleryModalMedia}
                      useNativeControls
                      resizeMode={"contain" as any}
                      shouldPlay={item.url === fullscreenMedia.url}
                    />
                  ) : (
                    <Image
                      source={{ uri: item.url }}
                      style={styles.galleryModalMedia}
                      resizeMode="contain"
                    />
                  )}
                </View>
              )}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  backButtonStyled: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.tabBar,
    borderRadius: 10,
  },
  backButtonStyledText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  safeHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.tabBar,
    textAlign: 'center',
    marginHorizontal: 12,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.tabBar,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.tabBarActive,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.tabBar,
    textAlign: 'center',
    marginBottom: 8,
  },
  memberCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  memberCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  heroDescription: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  membershipActionContainer: {
    marginTop: 8,
  },

  // Membership Buttons
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.tabBar,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingButtonText: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '600',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  memberBadgeText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedBadgeText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
  },

  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.tabBarActive}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.tabBar,
  },
  sectionContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },

  // Gallery - Horizontal scroll with 2 rows
  galleryScrollContent: {
    paddingRight: 20,
  },
  galleryTwoRowContainer: {
    gap: 10,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryItem: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  galleryItemMedia: {
    width: '100%',
    height: '100%',
  },
  videoIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Resources
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resourceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${COLORS.tabBarActive}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.tabBar,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  resourceMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Members List
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.tabBar,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.tabBarActive,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.tabBar,
  },
  adminBadge: {
    backgroundColor: COLORS.tabBarActive,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tabBar,
  },
  moreMembers: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },

  // Chat Button
  chatButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.tabBar,
    paddingVertical: 16,
    borderRadius: 14,
  },
  chatButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  chatButtonTextDisabled: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Join Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  joinModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  joinModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.tabBar,
  },
  joinModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.tabBar,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.tabBar,
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.tabBar,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Gallery Modal
  galleryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryModalClose: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryCounter: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  galleryCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  galleryModalMediaContainer: {
    width: SCREEN_WIDTH,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryModalMedia: {
    width: SCREEN_WIDTH,
    height: Dimensions.get('window').height * 0.8,
  },

  // Header Settings Button
  headerSettingsBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Committee Admin Management Modal
  manageModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  manageModalStatusBar: {
    height: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    backgroundColor: COLORS.tabBar,
  },
  manageModalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  manageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  manageModalCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  manageTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  manageTabsScroll: {
    backgroundColor: '#F3F4F6',
    maxHeight: 48,
  },
  manageTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  manageTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  manageTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  manageTabTextActive: {
    color: COLORS.tabBarActive,
  },
  manageModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  manageSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.tabBar,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyManageState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyManageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyManageHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Request styles
  requestList: {
    gap: 12,
  },
  requestItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  requestProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  requestAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.tabBarActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  requestTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestMessage: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  requestRejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  requestApproveBtn: {
    backgroundColor: COLORS.tabBar,
  },
  requestRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  requestApproveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Manage Members styles
  manageMembersList: {
    gap: 12,
  },
  manageMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  manageMemberProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  manageMemberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  manageMemberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.tabBarActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageMemberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manageMemberInfo: {
    flex: 1,
  },
  manageMemberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  manageMemberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.tabBarActive,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manageMemberJoinedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  manageMemberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberRoleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  promoteBtn: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  demoteBtn: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  memberRoleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  promoteBtnText: {
    color: '#10B981',
  },
  demoteBtnText: {
    color: '#F59E0B',
  },
  memberRemoveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },

  // Manage Gallery styles
  manageGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  manageGalleryItem: {
    width: (SCREEN_WIDTH - 44) / 2,
    height: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  manageGalleryImage: {
    width: '100%',
    height: '100%',
  },
  manageGalleryVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageGalleryRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Edit Details styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  editTextArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.tabBar,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  saveDetailsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Resource styles
  resourceList: {
    gap: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceInfo: {
    flex: 1,
    gap: 2,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  resourceDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  resourceCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resourceDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add Resource Modal styles
  addResourceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addResourceModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
  },
  addResourceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addResourceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  resourceTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  resourceTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  resourceTypeBtnActive: {
    backgroundColor: COLORS.tabBar,
  },
  resourceTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  resourceTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  resourceInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadedDocContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadedDocText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderStyle: 'dashed',
  },
  uploadDocBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.tabBarActive,
  },
  saveResourceBtn: {
    backgroundColor: COLORS.tabBar,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveResourceBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Resource Modal Overlay styles (inside manage modal)
  resourceModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100,
  },
  resourceKeyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  resourceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resourceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
});
