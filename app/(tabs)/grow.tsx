import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator, Modal, Share, Alert, Platform, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HEADER_COLOR } from '@/constants/Colors';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { 
  Grid3x3,
  Bookmark,
  UserPlus,
  Menu,
  Heart,
  Link as LinkIcon,
  LogOut,
  ChevronDown,
  ChevronUp,
  Star,
  MoreHorizontal,
  Trash,
  Play,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { supabase, getFullLegalName } from '@/lib/supabase';
import { INTEREST_LIBRARY, type InterestOptionId } from '@/lib/interest-data';
import VisitorActions from '@/components/VisitorActions';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
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

const USER_STATS = {
  posts: 127,
  friends: 342,
};

const ProfileScreen = React.memo(function ProfileScreen() {
  const router = useRouter();
  const { user, profile: authProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const viewingUserId = user?.id || '';
  const isOwner = true; // Always viewing own profile in this tab
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'grid' | 'saved'>('grid');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    posts: 0,
    friends: 0,
  });
  const [userInterests, setUserInterests] = useState<Set<InterestOptionId>>(new Set());
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [completeness, setCompleteness] = useState({ percent: 0, todos: [] as string[] });
  const [showCompleteness, setShowCompleteness] = useState(true);
  const [expandBio, setExpandBio] = useState(true);
  const [expandAbout, setExpandAbout] = useState(true);
  const [expandInterests, setExpandInterests] = useState(true);
  const [viewProfile, setViewProfile] = useState<any | null>(null);
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedFromTab, setSelectedFromTab] = useState<'grid' | 'saved' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Use viewed profile (if provided) or authenticated profile for rendering
  const profile = viewProfile || authProfile;
  
  // Ensure non-owners cannot remain on 'saved' tab if state changes
  useEffect(() => {
    if (!isOwner && activeTab === 'saved') {
      setActiveTab('grid');
    }
  }, [isOwner, activeTab]);
  
  // Cross-platform confirm helper (Alert on native, confirm() on web)
  const confirmAsync = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      try {
        // eslint-disable-next-line no-alert
        const ok = typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false;
        return Promise.resolve(!!ok);
      } catch {
        return Promise.resolve(false);
      }
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (viewingUserId) {
      fetchUserData();
    }
  }, [viewingUserId]);

  // Recompute completeness when profile or interests change
  useEffect(() => {
    computeCompleteness();
  }, [profile, userInterests]);

  // Load persisted preference for showing completeness card
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('profile:completeness:hidden');
        if (v === '1') setShowCompleteness(false);
        const cb = await AsyncStorage.getItem('profile:section:bio:collapsed');
        const ca = await AsyncStorage.getItem('profile:section:about:collapsed');
        const ci = await AsyncStorage.getItem('profile:section:interests:collapsed');
        if (cb === '1') setExpandBio(false);
        if (ca === '1') setExpandAbout(false);
        if (ci === '1') setExpandInterests(false);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    computeCompleteness();
  }, [profile, userInterests]);

  const fetchUserData = async () => {
    if (!viewingUserId) return;

    try {
      setLoading(true);

      // Always showing own profile in this tab, no need to fetch viewProfile
      setViewProfile(null);

      // Fetch user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', viewingUserId)
        .eq('is_highlight_only', false)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setUserPosts(posts || []);
      setStats(prev => ({ ...prev, posts: posts?.length || 0 }));

      // Fetch user's saved/bookmarked posts
      if (isOwner) {
        const { data: bookmarks, error: bmError } = await supabase
          .from('post_bookmarks')
          .select('post_id, posts:post_id ( id, image_url, image_urls, video_url, video_urls, created_at )')
          .eq('user_id', viewingUserId)
          .eq('posts.is_highlight_only', false)
          .order('created_at', { ascending: false });
        if (!bmError && bookmarks) {
          const mapped = bookmarks
            .map((b: any) => Array.isArray(b.posts) ? b.posts[0] : b.posts)
            .filter(Boolean);
          setSavedPosts(mapped);
        } else {
          setSavedPosts([]);
        }
      } else {
        setSavedPosts([]);
      }

      // Fetch friends count (mutual friendships)
      // Count friends where either user_id or friend_id matches current user
      const { data: friendsList, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${viewingUserId},friend_id.eq.${viewingUserId}`);

      if (!friendsError && friendsList) {
        // Remove duplicates by creating a set of unique friend IDs
        const uniqueFriends = new Set<string>();
        friendsList.forEach((friendship: any) => {
          const friendId = friendship.user_id === viewingUserId 
            ? friendship.friend_id 
            : friendship.user_id;
          uniqueFriends.add(friendId);
        });
        setStats(prev => ({ ...prev, friends: uniqueFriends.size }));
      }

      // Fetch user's selected interests
      const { data: interests, error: interestsError } = await supabase
        .from('user_interests')
        .select('category')
        .eq('user_id', viewingUserId);
      if (!interestsError && interests) {
        setUserInterests(new Set(interests.map((r: any) => r.category as InterestOptionId)));
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      // Compute profile completeness after data loads
      computeCompleteness();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  const computeCompleteness = () => {
    if (!profile) return;
    const tasks: { label: string; done: boolean }[] = [
      { label: 'Set profile photo', done: !!profile.avatar_url },
      { label: 'Add a short bio', done: !!profile.bio?.trim() },
      { label: 'Add education', done: !!(profile.year_group || profile.class) },
      { label: 'Pick 3+ interests', done: userInterests.size >= 3 },
      { label: 'Set status', done: !!(profile as any).occupation_status },
    ];
    const completed = tasks.filter(t => t.done).length;
    const percent = Math.round((completed / tasks.length) * 100);
    const todos = tasks.filter(t => !t.done).map(t => t.label);
    setCompleteness({ percent, todos });
    // If fully complete, auto-hide and persist preference
    if (percent === 100) {
      setShowCompleteness(false);
      AsyncStorage.setItem('profile:completeness:hidden', '1').catch(() => {});
    }
  };

  const toggleCompletenessVisibility = async () => {
    try {
      const next = !showCompleteness;
      setShowCompleteness(next);
      await AsyncStorage.setItem('profile:completeness:hidden', next ? '0' : '1');
    } catch {
      setShowCompleteness((prev) => !prev);
    }
  };

  const toggleCollapse = async (key: 'bio' | 'about' | 'interests') => {
    try {
      if (key === 'bio') {
        const next = !expandBio; setExpandBio(next);
        await AsyncStorage.setItem('profile:section:bio:collapsed', next ? '0' : '1');
      } else if (key === 'about') {
        const next = !expandAbout; setExpandAbout(next);
        await AsyncStorage.setItem('profile:section:about:collapsed', next ? '0' : '1');
      } else {
        const next = !expandInterests; setExpandInterests(next);
        await AsyncStorage.setItem('profile:section:interests:collapsed', next ? '0' : '1');
      }
    } catch {}
  };

  const handleSignOut = async () => {
    // Let RootLayout redirect to /auth when user becomes null, avoiding bounce back.
    await signOut();
  };

  const buildProfileLink = () => {
    // Prefer deep link; if you later host a web URL, swap here
    return Linking.createURL(`/user-profile/${viewingUserId ?? ''}`);
  };

  const copyProfileLink = async () => {
    const url = buildProfileLink();
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied', 'Profile link copied to clipboard');
    } catch (e) {}
  };

  const shareSystem = async () => {
    const url = buildProfileLink();
    const message = `${getFullLegalName(profile) || 'My'} Akora profile\n${url}`;
    try {
      await Share.share({ message, url });
    } catch (e) {}
  };

  const viewAsGuest = () => {
    if (!user?.id) return;
    debouncedRouter.push(`/user-profile/${user.id}?guest=1`);
    setShareSheetVisible(false);
  };

  const formatOccupation = (s?: string | null) => {
    switch (s) {
      case 'student':
        return 'Student';
      case 'employed':
        return 'Employed';
      case 'self_employed':
        return 'Self-Employed';
      case 'unemployed':
        return 'Unemployed';
      case 'other':
        return 'Other';
      default:
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }
  };

  const showQr = () => {
    setQrVisible(true);
    setShareSheetVisible(false);
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
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

  const isSelf = isOwner;

  // Build interest lookup to render icons and labels
  type InterestMeta = { label: string; icon: LucideIcon; parentId?: string };
  const INTEREST_LOOKUP: Record<string, InterestMeta> = {};
  const SUBCATEGORY_IDS_BY_PARENT = new Map<string, string[]>();
  const PARENT_BY_ID: Record<string, string | undefined> = {};
  INTEREST_LIBRARY.forEach((cat) => {
    INTEREST_LOOKUP[cat.id] = { label: cat.label, icon: cat.icon };
    if (cat.subcategories?.length) {
      SUBCATEGORY_IDS_BY_PARENT.set(cat.id, cat.subcategories.map((s) => s.id));
      cat.subcategories.forEach((s) => {
        INTEREST_LOOKUP[s.id] = { label: s.label, icon: cat.icon, parentId: cat.id };
        PARENT_BY_ID[s.id] = cat.id;
      });
    }
  });

  const visibleInterestIds = (() => {
    const selected = Array.from(userInterests);
    
    // FILTER 1: Remove subcategories (they have underscores)
    // Only show main parent categories like 'education', 'career', not 'education_scholarships'
    const mainCategoriesOnly = selected.filter(id => !id.includes('_'));
    
    // FILTER 2: Remove parents if any child is selected (original logic)
    const selectedSet = new Set(selected);
    return mainCategoriesOnly.filter((id) => {
      const subs = SUBCATEGORY_IDS_BY_PARENT.get(id) || [];
      const hasSelectedChild = subs.some((sid) => selectedSet.has(sid));
      if (hasSelectedChild) return false; // hide parent if any child selected
      return true;
    });
  })();

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
          colors={['#0EA5E9']}
          progressBackgroundColor="#FFFFFF"
          progressViewOffset={insets.top + 60}
        />
      }
    >
      {/* FIX: Dark background filler for pull-to-refresh gap */}
      <View style={{ position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: HEADER_COLOR }} />
      
      {/* Avatar Preview Modal */}
      <Modal
        transparent
        visible={avatarPreviewVisible}
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <TouchableOpacity style={styles.imageFullOverlay} activeOpacity={1} onPress={() => setAvatarPreviewVisible(false)}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width, height }}
              resizeMode="contain"
            />
          ) : (
            <View style={[{ width, height }, styles.avatarPlaceholder]} />
          )}
        </TouchableOpacity>
      </Modal>
      {/* Share Sheet */}
      <Modal
        transparent
        visible={shareSheetVisible}
        animationType="fade"
        onRequestClose={() => setShareSheetVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          {/* Tapping outside closes */}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShareSheetVisible(false)} />
          {/* Bottom sheet */}
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Share your profile</Text>
            <TouchableOpacity style={styles.sheetAction} onPress={shareSystem}>
              <Text style={styles.sheetActionText}>Share…</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetAction} onPress={copyProfileLink}>
              <Text style={styles.sheetActionText}>Copy link</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity style={styles.sheetAction} onPress={viewAsGuest}>
                <Text style={styles.sheetActionText}>View as guest</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sheetAction} onPress={showQr}>
              <Text style={styles.sheetActionText}>Show QR code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetAction} onPress={() => { Linking.openURL(buildProfileLink()); setShareSheetVisible(false); }}>
              <Text style={styles.sheetActionText}>Open profile link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShareSheetVisible(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* QR Modal */}
      <Modal
        transparent
        visible={qrVisible}
        animationType="fade"
        onRequestClose={() => setQrVisible(false)}
      >
        <TouchableOpacity style={styles.qrFullOverlay} activeOpacity={1} onPress={() => setQrVisible(false)}>
          <Image
            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=${Math.min(width, height) * 2}x${Math.min(width, height) * 2}&data=${encodeURIComponent(buildProfileLink())}` }}
            style={{ width, height: width }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
      {/* Status Bar Background */}
      <View style={[styles.statusBarBg, { height: insets.top + 800, marginTop: -800 }]} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{getFullLegalName(profile) || 'User'}</Text>
            {profile.is_admin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon} onPress={handleSignOut}>
              <LogOut size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={() => profile.avatar_url && setAvatarPreviewVisible(true)}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {getFullLegalName(profile)?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => debouncedRouter.push('/friends')}
            >
              <Text style={styles.statNumber}>{stats.friends}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.displayName}>{getFullLegalName(profile) || 'User'}</Text>

          {/* Bio Card (collapsible) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Bio</Text>
              <TouchableOpacity onPress={() => toggleCollapse('bio')}>
                {expandBio ? <ChevronUp size={18} color="#000000" /> : <ChevronDown size={18} color="#000000" />}
              </TouchableOpacity>
            </View>
            {expandBio && (
              <Text style={styles.cardBodyText}>{profile.bio?.trim() ? profile.bio : 'No bio yet.'}</Text>
            )}
          </View>

          {/* About Card (collapsible) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>About</Text>
              <TouchableOpacity onPress={() => toggleCollapse('about')}>
                {expandAbout ? <ChevronUp size={18} color="#000000" /> : <ChevronDown size={18} color="#000000" />}
              </TouchableOpacity>
            </View>
            {expandAbout && (
            <View style={styles.aboutGrid}>
              {/* Occupation Status */}
              {profile.occupation_status && (isSelf || profile.is_occupation_public) && (
                <View style={styles.aboutItemFull}>
                  <Text style={styles.aboutLabel}>Status</Text>
                  <Text style={styles.aboutValue}>{formatOccupation(profile.occupation_status)}</Text>
                </View>
              )}
              {profile.year_group && (isSelf || profile.is_year_group_public) && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>Year Group</Text>
                  <Text style={styles.aboutValue}>{profile.year_group}</Text>
                </View>
              )}
              {profile.house && (isSelf || profile.is_house_public) && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>House</Text>
                  <Text style={styles.aboutValue}>{profile.house}</Text>
                </View>
              )}
              {profile.class && (isSelf || profile.is_class_public) && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>Class</Text>
                  <Text style={styles.aboutValue}>{profile.class}</Text>
                </View>
              )}
              {profile.location && (isSelf || profile.is_contact_public) && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>Current Location</Text>
                  <Text style={styles.aboutValue}>{profile.location}</Text>
                </View>
              )}
              {profile.phone && (isSelf || profile.is_contact_public) && (
                <View style={styles.aboutItem}>
                  <Text style={styles.aboutLabel}>Phone</Text>
                  <Text style={styles.aboutValue}>{profile.phone}</Text>
                </View>
              )}
              {profile.email && (isSelf || profile.is_contact_public) && (
                <View style={styles.aboutItemFull}>
                  <Text style={styles.aboutLabel}>Email</Text>
                  <Text style={styles.aboutValue}>{profile.email}</Text>
                </View>
              )}

              {/* Occupation (respect visibility) */}
              {(profile.job_title || profile.company_name) && (isSelf || profile.is_occupation_public) && (
                <View style={styles.aboutItemFull}>
                  <Text style={styles.aboutLabel}>Occupation</Text>
                  <Text style={styles.aboutValue}>
                    {[profile.job_title, profile.company_name].filter(Boolean).join(' @ ')}
                  </Text>
                </View>
              )}

              {/* Education (respect visibility) */}
              {(profile.institution_name || profile.program_of_study || profile.graduation_year || (profile as any).current_study_year) && (isSelf || profile.is_education_public) && (
                <View style={styles.aboutItemFull}>
                  <Text style={styles.aboutLabel}>Education</Text>
                  <Text style={styles.aboutValue}>
                    {[
                      profile.institution_name,
                      profile.program_of_study,
                      (profile as any).current_study_year ? `Year ${String((profile as any).current_study_year)}` : undefined,
                      profile.graduation_year ? `Class of ${String(profile.graduation_year)}` : undefined,
                    ].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              )}
            </View>
            )}
          </View>

          {/* Interests Card (collapsible; respect visibility) */}
          {visibleInterestIds.length > 0 && (isSelf || (profile as any).is_interests_public !== false) && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Interests</Text>
                <TouchableOpacity onPress={() => toggleCollapse('interests')}>
                  {expandInterests ? <ChevronUp size={18} color="#000000" /> : <ChevronDown size={18} color="#000000" />}
                </TouchableOpacity>
              </View>
              {expandInterests && (
                <View style={styles.interestsChips}>
                  {visibleInterestIds.map((id) => {
                    const meta = INTEREST_LOOKUP[id];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <View key={id} style={styles.interestChip}>
                        <Icon size={14} color="#000000" strokeWidth={2} />
                        <Text style={styles.interestChipText}>{meta.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          {/* Interests empty state */}
          {(isSelf || (profile as any).is_interests_public !== false) && visibleInterestIds.length === 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Interests</Text>
                <TouchableOpacity onPress={() => toggleCollapse('interests')}>
                  {expandInterests ? <ChevronUp size={18} color="#000000" /> : <ChevronDown size={18} color="#000000" />}
                </TouchableOpacity>
              </View>
              {expandInterests && (
                <>
                  <Text style={styles.cardBodyText}>No interests yet</Text>
                  {isSelf && (
                    <TouchableOpacity style={styles.pickButton} onPress={() => debouncedRouter.push('/(tabs)/discover?showInterests=1' as any)}>
                      <Text style={styles.pickButtonText}>Pick interests</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Links Card */}
          {(profile as any).website_url || (profile as any).linkedin_url || (profile as any).twitter_url || (profile as any).instagram_url || (profile as any).facebook_url ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Links</Text>
              <View style={styles.linksRow}>
                {(profile as any).website_url && (
                  <TouchableOpacity style={styles.linkPill} onPress={() => Linking.openURL(String((profile as any).website_url))}>
                    <Text style={styles.linkPillText}>Website</Text>
                  </TouchableOpacity>
                )}
                {(profile as any).linkedin_url && (
                  <TouchableOpacity style={styles.linkPill} onPress={() => Linking.openURL(String((profile as any).linkedin_url))}>
                    <Text style={styles.linkPillText}>LinkedIn</Text>
                  </TouchableOpacity>
                )}
                {(profile as any).twitter_url && (
                  <TouchableOpacity style={styles.linkPill} onPress={() => Linking.openURL(String((profile as any).twitter_url))}>
                    <Text style={styles.linkPillText}>Twitter</Text>
                  </TouchableOpacity>
                )}
                {(profile as any).instagram_url && (
                  <TouchableOpacity style={styles.linkPill} onPress={() => Linking.openURL(String((profile as any).instagram_url))}>
                    <Text style={styles.linkPillText}>Instagram</Text>
                  </TouchableOpacity>
                )}
                {(profile as any).facebook_url && (
                  <TouchableOpacity style={styles.linkPill} onPress={() => Linking.openURL(String((profile as any).facebook_url))}>
                    <Text style={styles.linkPillText}>Facebook</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}
        </View>

        {isOwner ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => debouncedRouter.push('/profile/edit')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => setShareSheetVisible(true)}>
              <Text style={styles.shareButtonText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <VisitorActions 
            onMessage={() => debouncedRouter.push(`/chat/${viewingUserId}`)}
          />
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'grid' && styles.activeTab]}
          onPress={() => setActiveTab('grid')}
        >
          <Grid3x3 size={24} color={activeTab === 'grid' ? '#000000' : '#8E8E8E'} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
            onPress={() => setActiveTab('saved')}
          >
            <Star size={24} color={activeTab === 'saved' ? '#000000' : '#8E8E8E'} />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'grid' ? (
        <View style={styles.postsGrid}>
          {userPosts.length > 0 ? (
            userPosts.map((post) => {
              // Determine if this is a video post
              const hasVideo = !!(post.video_url || (post.video_urls && post.video_urls.length > 0));
              const hasImage = !!(post.image_url || (post.image_urls && post.image_urls.length > 0));
              const videoUrl = post.video_url || (post.video_urls && post.video_urls[0]);
              
              // Get thumbnail: prefer image, fallback to video first frame
              let thumbnail = null;
              if (hasImage) {
                thumbnail = post.image_url || (Array.isArray(post.image_urls) && post.image_urls.length > 0 ? post.image_urls[0] : null);
              }

              return (
                <View key={post.id} style={styles.gridItem}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => debouncedRouter.push(`/post/${post.id}`)}>
                    {thumbnail ? (
                      <View style={styles.gridMediaContainer}>
                        <Image source={{ uri: thumbnail }} style={styles.gridImage} />
                        {hasVideo && (
                          <View style={styles.videoOverlay}>
                            <View style={styles.playIconContainer}>
                              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                            </View>
                          </View>
                        )}
                      </View>
                    ) : hasVideo && videoUrl ? (
                      <View style={styles.gridMediaContainer}>
                        <Video
                          source={{ uri: videoUrl }}
                          style={styles.gridImage}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isMuted={true}
                          positionMillis={100}
                        />
                        <View style={styles.videoOverlay}>
                          <View style={styles.playIconContainer}>
                            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.gridImagePlaceholder}>
                        <Text style={styles.gridPlaceholderText}>No Media</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.gridMoreBtn}
                      onPress={() => { setSelectedPostId(post.id); setSelectedFromTab('grid'); setPostSheetOpen(true); }}
                    >
                      <MoreHorizontal size={18} color="#111827" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No posts yet</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.postsGrid}>
          {savedPosts.length > 0 ? (
            savedPosts.map((post) => {
              // Determine if this is a video post
              const hasVideo = !!(post.video_url || (post.video_urls && post.video_urls.length > 0));
              const hasImage = !!(post.image_url || (post.image_urls && post.image_urls.length > 0));
              const videoUrl = post.video_url || (post.video_urls && post.video_urls[0]);
              
              // Get thumbnail: prefer image, fallback to video first frame
              let thumbnail = null;
              if (hasImage) {
                thumbnail = post.image_url || (Array.isArray(post.image_urls) && post.image_urls.length > 0 ? post.image_urls[0] : null);
              }

              return (
                <View key={post.id} style={styles.gridItem}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => debouncedRouter.push(`/post/${post.id}`)}>
                    {thumbnail ? (
                      <View style={styles.gridMediaContainer}>
                        <Image source={{ uri: thumbnail }} style={styles.gridImage} />
                        {hasVideo && (
                          <View style={styles.videoOverlay}>
                            <View style={styles.playIconContainer}>
                              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                            </View>
                          </View>
                        )}
                      </View>
                    ) : hasVideo && videoUrl ? (
                      <View style={styles.gridMediaContainer}>
                        <Video
                          source={{ uri: videoUrl }}
                          style={styles.gridImage}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isMuted={true}
                          positionMillis={100}
                        />
                        <View style={styles.videoOverlay}>
                          <View style={styles.playIconContainer}>
                            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.gridImagePlaceholder}>
                        <Text style={styles.gridPlaceholderText}>No Media</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.gridMoreBtn}
                      onPress={() => { setSelectedPostId(post.id); setSelectedFromTab('saved'); setPostSheetOpen(true); }}
                    >
                      <MoreHorizontal size={18} color="#111827" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No saved posts yet</Text>
            </View>
          )}
        </View>
      )}

      {/* Post action sheet */}
      <Modal
        transparent
        visible={postSheetOpen}
        animationType="fade"
        onRequestClose={() => setPostSheetOpen(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPostSheetOpen(false)} />
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Post actions</Text>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => {
                if (!selectedPostId) return;
                setPostSheetOpen(false);
                debouncedRouter.push(`/post/${selectedPostId}`);
              }}
            >
              <Text style={styles.sheetActionText}>View post</Text>
            </TouchableOpacity>
            {isOwner && selectedFromTab === 'saved' && (
              <TouchableOpacity
                style={styles.sheetAction}
                onPress={async () => {
                  try {
                    if (!user?.id || !selectedPostId) return;
                    const { error } = await supabase
                      .from('post_bookmarks')
                      .delete()
                      .eq('post_id', selectedPostId)
                      .eq('user_id', user.id);
                    if (error) throw error;
                    setSavedPosts(prev => prev.filter(p => p.id !== selectedPostId));
                    toast.show('Removed from saved');
                    setPostSheetOpen(false);
                  } catch (e) {
                    Alert.alert('Error', 'Failed to remove from saved');
                  }
                }}
              >
                <Text style={[styles.sheetActionText, { color: '#111827' }]}>Remove from saved</Text>
              </TouchableOpacity>
            )}
            {isOwner && selectedFromTab === 'grid' && (
              <TouchableOpacity
                style={[styles.sheetAction, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                onPress={async () => {
                  if (!selectedPostId || !user?.id) {
                    toast.show('No post selected', { type: 'error' });
                    return;
                  }
                  const ok = await confirmAsync('Delete post?', 'This will permanently delete your post. Continue?');
                  if (!ok) return;
                  try {
                    const { error } = await supabase
                      .from('posts')
                      .delete()
                      .eq('id', selectedPostId)
                      .eq('user_id', user.id);
                    if (error) throw error;
                    setUserPosts(prev => prev.filter(p => p.id !== selectedPostId));
                    setSavedPosts(prev => prev.filter(p => p.id !== selectedPostId));
                    toast.show('Post deleted', { type: 'success' });
                    setPostSheetOpen(false);
                  } catch (e) {
                    toast.show('Failed to delete post', { type: 'error' });
                  }
                }}
              >
                <Trash size={16} color="#FF3B30" />
                <Text style={[styles.sheetActionText, { color: '#FF3B30' }]}>Delete post</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPostSheetOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusBarBg: {
    backgroundColor: '#0F172A',
    width: '100%',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  username: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
    flexShrink: 0,
  },
  headerIcon: {
    padding: 4,
  },
  profileSection: {
    paddingHorizontal: 20,
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
  interestsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  interestsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  interestChipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
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
    paddingBottom: 64,
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
    backgroundColor: '#000000',
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
  // Video support styles (Instagram-style)
  gridMediaContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  videoPlaceholder: {
    backgroundColor: '#1F2937',
    gap: 8,
  },
  videoPlaceholderText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridMoreBtn: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
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
  // Modal & Preview
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFullOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFullOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  sheetAction: {
    paddingVertical: 14,
  },
  sheetActionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    textAlign: 'center',
  },
  sheetCancel: {
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
  },
  sheetCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    color: '#111827',
  },
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  qrTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  imagePreviewCard: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: width,
    height: width,
  },
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 6,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  cardBodyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 18,
  },
  aboutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 10,
  },
  aboutItem: {
    width: (width - 16*2 - 12) / 2, // two columns within padding
  },
  aboutItemFull: {
    width: '100%',
  },
  aboutLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  aboutValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  // Added styles for admin badge, completeness, interest empty state, and links
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  adminBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EEF6FF',
    borderWidth: 1,
    borderColor: '#CDE3FF',
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'Inter-SemiBold',
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
  },
  pickButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F2F3F5',
    borderRadius: 999,
  },
  linkPillText: {
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  collapsedCard: {
    backgroundColor: '#F9FAFB',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
