import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Image, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar, Flag, X, ChevronDown, Check, Users, Settings, Image as ImageIcon, FileText, Link as LinkIcon, UserCheck, UserX, Clock, Play, Upload, Shield, UserMinus } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickMedia, uploadMedia, pickDocument, uploadDocument } from '@/lib/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Activity {
  id: string;
  title: string;
  description: string | null;
  month: string | null;
  year: number | null;
  sort_order: number;
  is_active: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  milestone_date: string | null;
  sort_order: number;
  is_completed: boolean;
  is_active: boolean;
}

interface Committee {
  id: string;
  name: string;
  db_name: string;
  description: string | null;
  icon_name: string | null;
  color: string | null;
  goals: string | null;
  vision: string | null;
  plans: string | null;
  gallery_urls: string[] | null;
  sort_order: number;
  is_active: boolean;
}

interface JoinRequest {
  id: string;
  committee_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Resource {
  id: string;
  committee_id: string;
  name: string;
  description: string | null;
  url: string;
  category: 'document' | 'link';
  file_type: string | null;
  file_size: number | null;
  is_active: boolean;
}

interface CommitteeMember {
  id: string;
  user_id: string;
  committee_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [2025, 2026, 2027, 2028];
const ICON_OPTIONS = ['Archive', 'Radio', 'Heart', 'FileText', 'Footprints', 'Trophy', 'Target', 'Home', 'Wallet', 'Compass', 'Mic', 'Gift', 'Music', 'ClipboardCheck', 'Users', 'Star', 'Award', 'Flag'];
const COLOR_OPTIONS = ['#EDE9FE', '#ECFDF5', '#FFF7ED', '#EFF6FF', '#F0FDF4', '#FAF5FF', '#FEF3C7', '#FCE7F3'];

export default function CentenaryAdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'committees' | 'activities' | 'milestones'>('committees');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);

  // Form states for Activity
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityMonth, setActivityMonth] = useState('Jan');
  const [activityYear, setActivityYear] = useState(2026);
  const [activitySortOrder, setActivitySortOrder] = useState('');

  // Form states for Milestone
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneSortOrder, setMilestoneSortOrder] = useState('');
  const [milestoneCompleted, setMilestoneCompleted] = useState(false);

  // Form states for Committee
  const [committeeName, setCommitteeName] = useState('');
  const [committeeDbName, setCommitteeDbName] = useState('');
  const [committeeDescription, setCommitteeDescription] = useState('');
  const [committeeGoals, setCommitteeGoals] = useState('');
  const [committeeVision, setCommitteeVision] = useState('');
  const [committeePlans, setCommitteePlans] = useState('');
  const [committeeIcon, setCommitteeIcon] = useState('Users');
  const [committeeColor, setCommitteeColor] = useState('#EDE9FE');
  const [committeeSortOrder, setCommitteeSortOrder] = useState('');

  const [saving, setSaving] = useState(false);

  // Committee Management Modal States
  const [showManageModal, setShowManageModal] = useState(false);
  const [managingCommittee, setManagingCommittee] = useState<Committee | null>(null);
  const [manageTab, setManageTab] = useState<'gallery' | 'resources' | 'requests' | 'members'>('gallery');
  
  // Gallery state
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  
  // Resources state
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceCategory, setResourceCategory] = useState<'document' | 'link'>('document');
  const [savingResource, setSavingResource] = useState(false);
  
  // Join requests state
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Committee members state
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [processingMember, setProcessingMember] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchData();
  }, [user]);

  const checkAdmin = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (data?.is_admin) {
        setIsAdmin(true);
      } else {
        Alert.alert('Access Denied', 'You need admin privileges to access this page.');
        debouncedRouter.back();
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch committees
      const { data: committeesData, error: committeesError } = await supabase
        .from('centenary_committees')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!committeesError) {
        setCommittees(committeesData || []);
      }

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('centenary_activities')
        .select('*')
        .order('sort_order', { ascending: true });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('centenary_milestones')
        .select('*')
        .order('sort_order', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Activity Modal Functions
  const openAddActivityModal = () => {
    setEditingActivity(null);
    setActivityTitle('');
    setActivityDescription('');
    setActivityMonth('Jan');
    setActivityYear(2026);
    setActivitySortOrder(String(activities.length + 1));
    setShowActivityModal(true);
  };

  const openEditActivityModal = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityTitle(activity.title);
    setActivityDescription(activity.description || '');
    setActivityMonth(activity.month || 'Jan');
    setActivityYear(activity.year || 2026);
    setActivitySortOrder(String(activity.sort_order));
    setShowActivityModal(true);
  };

  const saveActivity = async () => {
    if (!activityTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const activityData = {
        title: activityTitle.trim(),
        description: activityDescription.trim() || null,
        month: activityMonth,
        year: activityYear,
        sort_order: parseInt(activitySortOrder) || 0,
        created_by: user?.id,
      };

      if (editingActivity) {
        const { error } = await supabase
          .from('centenary_activities')
          .update(activityData)
          .eq('id', editingActivity.id);

        if (error) throw error;
        Alert.alert('Success', 'Activity updated successfully');
      } else {
        const { error } = await supabase
          .from('centenary_activities')
          .insert(activityData);

        if (error) throw error;
        Alert.alert('Success', 'Activity created successfully');
      }

      setShowActivityModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', error.message || 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async (id: string) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_activities')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Milestone Modal Functions
  const openAddMilestoneModal = () => {
    setEditingMilestone(null);
    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneDate('Q1 2026');
    setMilestoneSortOrder(String(milestones.length + 1));
    setMilestoneCompleted(false);
    setShowMilestoneModal(true);
  };

  const openEditMilestoneModal = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneTitle(milestone.title);
    setMilestoneDescription(milestone.description || '');
    setMilestoneDate(milestone.milestone_date || '');
    setMilestoneSortOrder(String(milestone.sort_order));
    setMilestoneCompleted(milestone.is_completed);
    setShowMilestoneModal(true);
  };

  const saveMilestone = async () => {
    if (!milestoneTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const milestoneData = {
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim() || null,
        milestone_date: milestoneDate.trim() || null,
        sort_order: parseInt(milestoneSortOrder) || 0,
        is_completed: milestoneCompleted,
        created_by: user?.id,
      };

      if (editingMilestone) {
        const { error } = await supabase
          .from('centenary_milestones')
          .update(milestoneData)
          .eq('id', editingMilestone.id);

        if (error) throw error;
        Alert.alert('Success', 'Milestone updated successfully');
      } else {
        const { error } = await supabase
          .from('centenary_milestones')
          .insert(milestoneData);

        if (error) throw error;
        Alert.alert('Success', 'Milestone created successfully');
      }

      setShowMilestoneModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving milestone:', error);
      Alert.alert('Error', error.message || 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const deleteMilestone = async (id: string) => {
    Alert.alert(
      'Delete Milestone',
      'Are you sure you want to delete this milestone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_milestones')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const toggleActivityStatus = async (activity: Activity) => {
    try {
      const { error } = await supabase
        .from('centenary_activities')
        .update({ is_active: !activity.is_active })
        .eq('id', activity.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    }
  };

  const toggleMilestoneStatus = async (milestone: Milestone) => {
    try {
      const { error } = await supabase
        .from('centenary_milestones')
        .update({ is_active: !milestone.is_active })
        .eq('id', milestone.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    }
  };

  // Committee Modal Functions
  const openAddCommitteeModal = () => {
    setEditingCommittee(null);
    setCommitteeName('');
    setCommitteeDbName('');
    setCommitteeDescription('');
    setCommitteeGoals('');
    setCommitteeVision('');
    setCommitteePlans('');
    setCommitteeIcon('Users');
    setCommitteeColor('#EDE9FE');
    setCommitteeSortOrder(String(committees.length + 1));
    setShowCommitteeModal(true);
  };

  const openEditCommitteeModal = (committee: Committee) => {
    setEditingCommittee(committee);
    setCommitteeName(committee.name);
    setCommitteeDbName(committee.db_name);
    setCommitteeDescription(committee.description || '');
    setCommitteeGoals(committee.goals || '');
    setCommitteeVision(committee.vision || '');
    setCommitteePlans(committee.plans || '');
    setCommitteeIcon(committee.icon_name || 'Users');
    setCommitteeColor(committee.color || '#EDE9FE');
    setCommitteeSortOrder(String(committee.sort_order));
    setShowCommitteeModal(true);
  };

  const saveCommittee = async () => {
    if (!committeeName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!committeeDbName.trim()) {
      Alert.alert('Error', 'Database name is required');
      return;
    }

    setSaving(true);
    try {
      const committeeData = {
        name: committeeName.trim(),
        db_name: committeeDbName.trim(),
        description: committeeDescription.trim() || null,
        goals: committeeGoals.trim() || null,
        vision: committeeVision.trim() || null,
        plans: committeePlans.trim() || null,
        icon_name: committeeIcon,
        color: committeeColor,
        sort_order: parseInt(committeeSortOrder) || 0,
        created_by: user?.id,
      };

      if (editingCommittee) {
        const { error } = await supabase
          .from('centenary_committees')
          .update(committeeData)
          .eq('id', editingCommittee.id);

        if (error) throw error;
        Alert.alert('Success', 'Committee updated successfully');
      } else {
        const { error } = await supabase
          .from('centenary_committees')
          .insert(committeeData);

        if (error) throw error;
        Alert.alert('Success', 'Committee created successfully');
      }

      setShowCommitteeModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving committee:', error);
      Alert.alert('Error', error.message || 'Failed to save committee');
    } finally {
      setSaving(false);
    }
  };

  const deleteCommittee = async (id: string) => {
    Alert.alert(
      'Delete Committee',
      'Are you sure you want to delete this committee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('centenary_committees')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const toggleCommitteeStatus = async (committee: Committee) => {
    try {
      const { error } = await supabase
        .from('centenary_committees')
        .update({ is_active: !committee.is_active })
        .eq('id', committee.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update');
    }
  };

  // =====================================================
  // COMMITTEE MANAGEMENT FUNCTIONS
  // =====================================================

  const openManageModal = async (committee: Committee) => {
    console.log('Opening manage modal for committee:', committee.id, committee.name);
    setManagingCommittee(committee);
    setGalleryUrls(committee.gallery_urls || []);
    setManageTab('gallery');
    setShowManageModal(true);
    
    // Fetch resources, requests, and members
    await Promise.all([
      fetchResources(committee.id),
      fetchJoinRequests(committee.id),
      fetchCommitteeMembers(committee.id),
    ]);
  };

  const fetchResources = async (committeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('centenary_committee_resources')
        .select('*')
        .eq('committee_id', committeeId)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchJoinRequests = async (committeeId: string) => {
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
        .eq('committee_id', committeeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      console.log('Fetch join requests result:', { committeeId, data, error });

      if (error) {
        console.error('Error fetching join requests:', error);
        return;
      }
      
      if (data) {
        setJoinRequests(data.map((r: any) => ({
          ...r,
          profile: r.profile || { id: r.user_id, full_name: 'Unknown', avatar_url: null }
        })));
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const fetchCommitteeMembers = async (committeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('centenary_committee_members')
        .select(`
          id,
          user_id,
          committee_id,
          role,
          joined_at,
          profile:profiles!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('committee_id', committeeId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (!error && data) {
        setCommitteeMembers(data.map((m: any) => ({
          ...m,
          profile: m.profile || { id: m.user_id, full_name: 'Unknown', avatar_url: null }
        })));
      }
    } catch (error) {
      console.error('Error fetching committee members:', error);
    }
  };

  const handleToggleMemberRole = async (member: CommitteeMember) => {
    if (!managingCommittee) return;
    
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
              
              // Refresh members list
              await fetchCommitteeMembers(managingCommittee.id);
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
    if (!managingCommittee) return;
    
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
              
              // Refresh members list
              await fetchCommitteeMembers(managingCommittee.id);
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

  // Gallery Functions
  const handleAddGalleryMedia = async () => {
    if (!managingCommittee || !user?.id) return;

    try {
      const media = await pickMedia();
      if (!media) return;

      setUploadingGallery(true);
      const mediaType = media.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMedia(media.uri, user.id, mediaType);

      if (uploadedUrl) {
        const newGalleryUrls = [...galleryUrls, uploadedUrl];
        
        const { error } = await supabase
          .from('centenary_committees')
          .update({ gallery_urls: newGalleryUrls })
          .eq('id', managingCommittee.id);

        if (error) throw error;
        
        setGalleryUrls(newGalleryUrls);
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
    if (!managingCommittee) return;

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
              const newGalleryUrls = galleryUrls.filter(url => url !== urlToRemove);
              
              const { error } = await supabase
                .from('centenary_committees')
                .update({ gallery_urls: newGalleryUrls })
                .eq('id', managingCommittee.id);

              if (error) throw error;
              
              setGalleryUrls(newGalleryUrls);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove media');
            }
          },
        },
      ]
    );
  };

  // Resource Functions
  const openAddResourceModal = () => {
    console.log('openAddResourceModal called');
    setResourceName('');
    setResourceDescription('');
    setResourceUrl('');
    setResourceCategory('document');
    setShowAddResourceModal(true);
    console.log('showAddResourceModal set to true');
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
    if (!managingCommittee || !user?.id) {
      console.log('saveResource: Missing committee or user', { managingCommittee, userId: user?.id });
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

    console.log('Saving resource:', {
      committee_id: managingCommittee.id,
      name: resourceName.trim(),
      url: resourceUrl.trim(),
      category: resourceCategory,
      uploaded_by: user.id,
    });

    setSavingResource(true);
    try {
      const { data, error } = await supabase
        .from('centenary_committee_resources')
        .insert({
          committee_id: managingCommittee.id,
          name: resourceName.trim(),
          description: resourceDescription.trim() || null,
          url: resourceUrl.trim(),
          category: resourceCategory,
          uploaded_by: user.id,
        })
        .select();

      console.log('Insert result:', { data, error });

      if (error) throw error;

      setShowAddResourceModal(false);
      fetchResources(managingCommittee.id);
      Alert.alert('Success', 'Resource added successfully');
    } catch (error: any) {
      console.error('Error saving resource:', error);
      Alert.alert('Error', error.message || 'Failed to save resource');
    } finally {
      setSavingResource(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!managingCommittee) return;

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
              fetchResources(managingCommittee.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Join Request Functions
  const handleApproveRequest = async (request: JoinRequest) => {
    if (!managingCommittee || !user?.id) return;

    setProcessingRequest(request.id);
    try {
      // Add user as member
      const { error: memberError } = await supabase
        .from('centenary_committee_members')
        .insert({
          committee_id: managingCommittee.id,
          user_id: request.user_id,
          role: 'member',
        });

      if (memberError) throw memberError;

      // Update request status
      const { error: requestError } = await supabase
        .from('centenary_committee_join_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Refresh requests
      fetchJoinRequests(managingCommittee.id);
      Alert.alert('Approved', `${request.profile.full_name} has been added to the committee.`);
    } catch (error: any) {
      console.error('Error approving request:', error);
      Alert.alert('Error', error.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    if (!managingCommittee || !user?.id) return;

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
                .update({
                  status: 'rejected',
                  reviewed_by: user.id,
                  reviewed_at: new Date().toISOString(),
                })
                .eq('id', request.id);

              if (error) throw error;

              fetchJoinRequests(managingCommittee.id);
              Alert.alert('Rejected', 'The request has been rejected.');
            } catch (error: any) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', error.message || 'Failed to reject request');
            } finally {
              setProcessingRequest(null);
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.tabBarActive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Centenary</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'committees' && styles.tabActive]}
          onPress={() => setActiveTab('committees')}
        >
          <Users size={18} color={activeTab === 'committees' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'committees' && styles.tabTextActive]}>
            Committees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activities' && styles.tabActive]}
          onPress={() => setActiveTab('activities')}
        >
          <Calendar size={18} color={activeTab === 'activities' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>
            Activities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'milestones' && styles.tabActive]}
          onPress={() => setActiveTab('milestones')}
        >
          <Flag size={18} color={activeTab === 'milestones' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'milestones' && styles.tabTextActive]}>
            Milestones
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.tabBarActive} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'committees' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Centenary Committees</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddCommitteeModal}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {committees.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No committees yet</Text>
                </View>
              ) : (
                committees.map((committee) => (
                  <View key={committee.id} style={[styles.itemCard, !committee.is_active && styles.itemCardInactive]}>
                    <View style={styles.itemHeader}>
                      <View style={[styles.colorBadge, { backgroundColor: committee.color || '#EDE9FE' }]}>
                        <Text style={styles.colorBadgeText}>{committee.icon_name}</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => toggleCommitteeStatus(committee)} style={styles.statusBtn}>
                          <View style={[styles.statusDot, committee.is_active && styles.statusDotActive]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openManageModal(committee)} style={styles.actionBtn}>
                          <Settings size={16} color={COLORS.tabBarActive} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditCommitteeModal(committee)} style={styles.actionBtn}>
                          <Edit2 size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteCommittee(committee.id)} style={styles.actionBtn}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>{committee.name}</Text>
                    <Text style={styles.itemSubtitle}>{committee.db_name}</Text>
                    {committee.description && (
                      <Text style={styles.itemDescription} numberOfLines={2}>{committee.description}</Text>
                    )}
                    <Text style={styles.sortOrderText}>Order: {committee.sort_order}</Text>
                  </View>
                ))
              )}
            </>
          ) : activeTab === 'activities' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Activities & Preparation</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddActivityModal}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {activities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No activities yet</Text>
                </View>
              ) : (
                activities.map((activity) => (
                  <View key={activity.id} style={[styles.itemCard, !activity.is_active && styles.itemCardInactive]}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>{activity.month} {activity.year}</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => toggleActivityStatus(activity)} style={styles.statusBtn}>
                          <View style={[styles.statusDot, activity.is_active && styles.statusDotActive]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditActivityModal(activity)} style={styles.actionBtn}>
                          <Edit2 size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteActivity(activity.id)} style={styles.actionBtn}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>{activity.title}</Text>
                    {activity.description && (
                      <Text style={styles.itemDescription} numberOfLines={2}>{activity.description}</Text>
                    )}
                    <Text style={styles.sortOrderText}>Order: {activity.sort_order}</Text>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Road to 2027 Milestones</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddMilestoneModal}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {milestones.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No milestones yet</Text>
                </View>
              ) : (
                milestones.map((milestone) => (
                  <View key={milestone.id} style={[styles.itemCard, !milestone.is_active && styles.itemCardInactive]}>
                    <View style={styles.itemHeader}>
                      <View style={[styles.itemBadge, milestone.is_completed && styles.itemBadgeCompleted]}>
                        <Text style={[styles.itemBadgeText, milestone.is_completed && styles.itemBadgeTextCompleted]}>
                          {milestone.milestone_date}
                        </Text>
                        {milestone.is_completed && <Check size={12} color="#10B981" style={{ marginLeft: 4 }} />}
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => toggleMilestoneStatus(milestone)} style={styles.statusBtn}>
                          <View style={[styles.statusDot, milestone.is_active && styles.statusDotActive]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditMilestoneModal(milestone)} style={styles.actionBtn}>
                          <Edit2 size={16} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteMilestone(milestone.id)} style={styles.actionBtn}>
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>{milestone.title}</Text>
                    {milestone.description && (
                      <Text style={styles.itemDescription} numberOfLines={2}>{milestone.description}</Text>
                    )}
                    <Text style={styles.sortOrderText}>Order: {milestone.sort_order}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Activity Modal */}
      <Modal visible={showActivityModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowActivityModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingActivity ? 'Edit Activity' : 'Add Activity'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={activityTitle}
              onChangeText={setActivityTitle}
              placeholder="Enter activity title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={activityDescription}
              onChangeText={setActivityDescription}
              placeholder="Enter activity description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Month</Text>
                <View style={styles.selectContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {MONTHS.map((month) => (
                      <TouchableOpacity
                        key={month}
                        style={[styles.selectOption, activityMonth === month && styles.selectOptionActive]}
                        onPress={() => setActivityMonth(month)}
                      >
                        <Text style={[styles.selectOptionText, activityMonth === month && styles.selectOptionTextActive]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Year</Text>
                <View style={styles.selectContainer}>
                  {YEARS.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.selectOption, activityYear === year && styles.selectOptionActive]}
                      onPress={() => setActivityYear(year)}
                    >
                      <Text style={[styles.selectOptionText, activityYear === year && styles.selectOptionTextActive]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={activitySortOrder}
              onChangeText={setActivitySortOrder}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveActivity}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingActivity ? 'Update Activity' : 'Create Activity'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Milestone Modal */}
      <Modal visible={showMilestoneModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMilestoneModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={milestoneTitle}
              onChangeText={setMilestoneTitle}
              placeholder="Enter milestone title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={milestoneDescription}
              onChangeText={setMilestoneDescription}
              placeholder="Enter milestone description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Date (e.g., Q1 2026, Q2 2026, 2027)</Text>
            <TextInput
              style={styles.input}
              value={milestoneDate}
              onChangeText={setMilestoneDate}
              placeholder="Q1 2026"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={milestoneSortOrder}
              onChangeText={setMilestoneSortOrder}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setMilestoneCompleted(!milestoneCompleted)}
            >
              <View style={[styles.checkbox, milestoneCompleted && styles.checkboxChecked]}>
                {milestoneCompleted && <Check size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Mark as completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveMilestone}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingMilestone ? 'Update Milestone' : 'Create Milestone'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Committee Modal */}
      <Modal visible={showCommitteeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCommitteeModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingCommittee ? 'Edit Committee' : 'Add Committee'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Committee Name *</Text>
            <TextInput
              style={styles.input}
              value={committeeName}
              onChangeText={(text) => {
                setCommitteeName(text);
                // Auto-generate db_name if not editing
                if (!editingCommittee) {
                  setCommitteeDbName(text.trim() + ' Committee');
                }
              }}
              placeholder="e.g., Finance"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Database Name *</Text>
            <TextInput
              style={styles.input}
              value={committeeDbName}
              onChangeText={setCommitteeDbName}
              placeholder="e.g., Finance Committee"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={committeeDescription}
              onChangeText={setCommitteeDescription}
              placeholder="Brief description of the committee's role"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Goals</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={committeeGoals}
              onChangeText={setCommitteeGoals}
              placeholder="What are the committee's main goals?"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Vision</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={committeeVision}
              onChangeText={setCommitteeVision}
              placeholder="What is the committee's vision?"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Plans</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={committeePlans}
              onChangeText={setCommitteePlans}
              placeholder="Current plans and upcoming activities"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              <View style={styles.selectContainer}>
                {ICON_OPTIONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.selectOption, committeeIcon === icon && styles.selectOptionActive]}
                    onPress={() => setCommitteeIcon(icon)}
                  >
                    <Text style={[styles.selectOptionText, committeeIcon === icon && styles.selectOptionTextActive]}>
                      {icon}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, committeeColor === color && styles.colorOptionActive]}
                  onPress={() => setCommitteeColor(color)}
                >
                  {committeeColor === color && <Check size={16} color="#111827" />}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={committeeSortOrder}
              onChangeText={setCommitteeSortOrder}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveCommittee}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingCommittee ? 'Update Committee' : 'Create Committee'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Committee Management Modal */}
      <Modal visible={showManageModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowManageModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              Manage: {managingCommittee?.name}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tabs */}
          <View style={styles.manageTabs}>
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
                Requests {joinRequests.length > 0 && `(${joinRequests.length})`}
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

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
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

                {galleryUrls.length === 0 ? (
                  <View style={styles.emptyManageState}>
                    <ImageIcon size={48} color="#D1D5DB" />
                    <Text style={styles.emptyManageText}>No gallery media yet</Text>
                    <Text style={styles.emptyManageHint}>Add photos and videos to showcase the committee</Text>
                  </View>
                ) : (
                  <View style={styles.galleryGrid}>
                    {galleryUrls.map((url, index) => {
                      const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('video');
                      return (
                        <View key={index} style={styles.galleryItem}>
                          {isVideo ? (
                            <View style={styles.galleryVideoPlaceholder}>
                              <Play size={24} color="#FFFFFF" />
                            </View>
                          ) : (
                            <Image source={{ uri: url }} style={styles.galleryImage} />
                          )}
                          <TouchableOpacity
                            style={styles.galleryRemoveBtn}
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

                {resources.length === 0 ? (
                  <View style={styles.emptyManageState}>
                    <FileText size={48} color="#D1D5DB" />
                    <Text style={styles.emptyManageText}>No resources yet</Text>
                    <Text style={styles.emptyManageHint}>Add documents and links for committee members</Text>
                  </View>
                ) : (
                  <View style={styles.resourceList}>
                    {resources.map((resource) => (
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

            {/* Join Requests Tab */}
            {manageTab === 'requests' && (
              <View>
                <Text style={styles.manageSubtitle}>Pending Join Requests</Text>

                {joinRequests.length === 0 ? (
                  <View style={styles.emptyManageState}>
                    <UserCheck size={48} color="#D1D5DB" />
                    <Text style={styles.emptyManageText}>No pending requests</Text>
                    <Text style={styles.emptyManageHint}>All join requests have been processed</Text>
                  </View>
                ) : (
                  <View style={styles.requestList}>
                    {joinRequests.map((request) => (
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
                  Committee Members ({committeeMembers.length})
                </Text>

                {committeeMembers.length === 0 ? (
                  <View style={styles.emptyManageState}>
                    <Users size={48} color="#D1D5DB" />
                    <Text style={styles.emptyManageText}>No members yet</Text>
                    <Text style={styles.emptyManageHint}>Approve join requests to add members</Text>
                  </View>
                ) : (
                  <View style={styles.membersList}>
                    {committeeMembers.map((member) => (
                      <View key={member.id} style={styles.memberItem}>
                        <TouchableOpacity 
                          style={styles.memberProfile}
                          onPress={() => {
                            setShowManageModal(false);
                            debouncedRouter.push(`/user-profile/${member.user_id}`);
                          }}
                          activeOpacity={0.7}
                        >
                          {member.profile.avatar_url ? (
                            <Image
                              source={{ uri: member.profile.avatar_url }}
                              style={styles.memberAvatar}
                            />
                          ) : (
                            <View style={styles.memberAvatarPlaceholder}>
                              <Text style={styles.memberAvatarText}>
                                {member.profile.full_name?.[0] || '?'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <Text style={styles.memberName}>
                                {member.profile.full_name}
                              </Text>
                              {member.role === 'admin' && (
                                <View style={styles.adminBadge}>
                                  <Shield size={10} color="#FFFFFF" />
                                  <Text style={styles.adminBadgeText}>Admin</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.memberJoinedDate}>
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={[
                              styles.memberActionBtn,
                              member.role === 'admin' ? styles.demoteBtn : styles.promoteBtn
                            ]}
                            onPress={() => handleToggleMemberRole(member)}
                            disabled={processingMember === member.id}
                          >
                            {processingMember === member.id ? (
                              <ActivityIndicator size="small" color="#0F172A" />
                            ) : (
                              <Text style={[
                                styles.memberActionText,
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
                          style={styles.input}
                          value={resourceName}
                          onChangeText={setResourceName}
                          placeholder="Resource name"
                          placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                          style={[styles.input, { height: 80 }]}
                          value={resourceDescription}
                          onChangeText={setResourceDescription}
                          placeholder="Brief description"
                          placeholderTextColor="#9CA3AF"
                          multiline
                        />

                        <Text style={styles.inputLabel}>Category</Text>
                        <View style={styles.categoryRow}>
                          <TouchableOpacity
                            style={[styles.categoryBtn, resourceCategory === 'document' && styles.categoryBtnActive]}
                            onPress={() => setResourceCategory('document')}
                          >
                            <FileText size={16} color={resourceCategory === 'document' ? '#FFFFFF' : '#6B7280'} />
                            <Text style={[styles.categoryBtnText, resourceCategory === 'document' && styles.categoryBtnTextActive]}>
                              Document
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.categoryBtn, resourceCategory === 'link' && styles.categoryBtnActive]}
                            onPress={() => setResourceCategory('link')}
                          >
                            <LinkIcon size={16} color={resourceCategory === 'link' ? '#FFFFFF' : '#6B7280'} />
                            <Text style={[styles.categoryBtnText, resourceCategory === 'link' && styles.categoryBtnTextActive]}>
                              Link
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {resourceCategory === 'document' ? (
                          <>
                            <Text style={styles.inputLabel}>Document</Text>
                            {resourceUrl ? (
                              <View style={styles.uploadedDocRow}>
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
                              style={styles.input}
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
                          style={[styles.saveBtn, savingResource && styles.saveBtnDisabled]}
                          onPress={saveResource}
                          disabled={savingResource}
                        >
                          {savingResource ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.saveBtnText}>Save Resource</Text>
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: COLORS.tabBar,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.tabBarActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardInactive: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemBadgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.tabBarActive,
  },
  itemBadgeTextCompleted: {
    color: '#10B981',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBtn: {
    padding: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  actionBtn: {
    padding: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  sortOrderText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  selectOptionActive: {
    backgroundColor: COLORS.tabBar,
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
  },
  saveBtn: {
    backgroundColor: COLORS.tabBarActive,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  colorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  colorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  optionsScroll: {
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#111827',
  },

  // Management Modal Styles
  manageTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  manageTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  manageTabActive: {
    backgroundColor: '#FEF3C7',
  },
  manageTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  manageTabTextActive: {
    color: COLORS.tabBar,
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
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
    paddingVertical: 60,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginTop: 8,
  },
  emptyManageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyManageHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Gallery Grid
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  galleryItem: {
    width: (SCREEN_WIDTH - 32 - 12 - 32) / 2, // 32 modal padding, 12 gap, 32 scrollview padding
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Resource List
  resourceList: {
    marginTop: 8,
    gap: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  resourceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  resourceCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceDeleteBtn: {
    padding: 8,
  },

  // Join Request List
  requestList: {
    marginTop: 16,
    gap: 16,
  },
  requestItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  requestProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  requestAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.tabBar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requestTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestMessage: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  requestActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  requestRejectBtn: {
    backgroundColor: '#FEE2E2',
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

  // Members Tab
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  memberProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    backgroundColor: COLORS.tabBarActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  memberName: {
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
  memberJoinedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberActionBtn: {
    paddingHorizontal: 12,
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
  memberActionText: {
    fontSize: 12,
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

  // Add Resource Modal
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
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  categoryBtnActive: {
    backgroundColor: COLORS.tabBar,
  },
  categoryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginBottom: 16,
  },
  uploadDocBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.tabBarActive,
  },
  uploadedDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 16,
  },
  uploadedDocText: {
    flex: 1,
    fontSize: 14,
    color: '#059669',
  },
});
