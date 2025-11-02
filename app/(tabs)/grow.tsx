import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator, Modal, Share, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { INTEREST_LIBRARY, type InterestOptionId } from '@/lib/interest-data';

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

// Dynamic profile highlights loaded from Supabase
type Highlight = {
  id: string;
  user_id: string;
  title?: string | null;
  subtitle?: string | null;
  media_url?: string | null; // deprecated but tolerated
  action_url?: string | null; // deprecated but tolerated
  emoji?: string | null; // deprecated but tolerated
  color?: string | null; // optional border accent
  order_index?: number | null;
  visible?: boolean | null;
  pinned?: boolean | null;
  post_id?: string | null;
};

const USER_STATS = {
  posts: 127,
  friends: 342,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
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
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [postPreview, setPostPreview] = useState<Record<string, { thumb?: string | null }>>({});
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Load profile highlights when user/profile is available
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('profile_highlights')
          .select('id,user_id,title,order_index,visible,pinned,post_id')
          .eq('user_id', user.id)
          .eq('visible', true)
          .order('pinned', { ascending: false })
          .order('order_index', { ascending: true })
          .limit(12);
        if (error) throw error;
        const rows = (data as Highlight[]) || [];
        setHighlights(rows);
        // fetch post thumbnails for post-based highlights
        const postIds = rows.map(r => r.post_id).filter(Boolean) as string[];
        if (postIds.length) {
          const { data: posts } = await supabase
            .from('posts')
            .select('id,image_url,image_urls,video_urls')
            .in('id', postIds);
          const map: Record<string, { thumb?: string | null }> = {};
          (posts || []).forEach((p: any) => {
            const thumb = p.image_url || (Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null);
            map[p.id] = { thumb };
          });
          setPostPreview(map);
        } else {
          setPostPreview({});
        }
      } catch (e) {
        // silently ignore for now
      }
    })();
  }, [user?.id]);

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
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setUserPosts(posts || []);
      setStats(prev => ({ ...prev, posts: posts?.length || 0 }));

      // Fetch user's saved/bookmarked posts
      const { data: bookmarks, error: bmError } = await supabase
        .from('post_bookmarks')
        .select('post_id, posts:post_id ( id, image_url, image_urls, created_at )')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!bmError && bookmarks) {
        const mapped = bookmarks
          .map((b: any) => Array.isArray(b.posts) ? b.posts[0] : b.posts)
          .filter(Boolean);
        setSavedPosts(mapped);
      } else {
        setSavedPosts([]);
      }

      // Fetch friends count (mutual friendships)
      // Count friends where either user_id or friend_id matches current user
      const { data: friendsList, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (!friendsError && friendsList) {
        // Remove duplicates by creating a set of unique friend IDs
        const uniqueFriends = new Set<string>();
        friendsList.forEach((friendship: any) => {
          const friendId = friendship.user_id === user.id 
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
        .eq('user_id', user.id);
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
    return Linking.createURL(`/user-profile/${user?.id ?? ''}`);
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
    const message = `${profile?.full_name ?? 'My'} Akora profile\n${url}`;
    try {
      await Share.share({ message, url });
    } catch (e) {}
  };

  const viewAsGuest = () => {
    if (!user?.id) return;
    router.push(`/user-profile/${user.id}`);
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
        <ActivityIndicator size="large" color="#4169E1" />
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

  const isSelf = true; // This screen shows the current user's profile. Keep for future external profiles.

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
    const selectedSet = new Set(selected);
    return selected.filter((id) => {
      const subs = SUBCATEGORY_IDS_BY_PARENT.get(id) || [];
      const hasSelectedChild = subs.some((sid) => selectedSet.has(sid));
      if (hasSelectedChild) return false; // hide parent if any child selected
      return true;
    });
  })();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <TouchableOpacity style={styles.sheetAction} onPress={viewAsGuest}>
              <Text style={styles.sheetActionText}>View as guest</Text>
            </TouchableOpacity>
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{profile.full_name || 'User'}</Text>
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
            {/* Removed More button; consolidated actions under Share */}
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
                  {profile.full_name?.[0]?.toUpperCase() || 'U'}
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
              onPress={() => router.push('/friends')}
            >
              <Text style={styles.statNumber}>{stats.friends}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.displayName}>{profile.full_name || 'User'}</Text>

          {/* Completeness Card with hide/show (auto-hidden at 100%) */}
          {completeness.percent < 100 && (showCompleteness ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Profile completeness</Text>
                <TouchableOpacity onPress={toggleCompletenessVisibility}>
                  <Text style={styles.linkText}>Hide</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${completeness.percent}%` }]} />
              </View>
              {completeness.todos.length > 0 && (
                <Text style={styles.cardBodyText}>
                  {completeness.todos.slice(0, 2).join(' • ')}
                  {completeness.todos.length > 2 ? ' • …' : ''}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity style={[styles.card, styles.collapsedCard]} onPress={toggleCompletenessVisibility}>
              <View style={styles.collapsedRow}>
                <Text style={styles.cardTitle}>Profile tips hidden</Text>
                <Text style={styles.linkText}>Show</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${completeness.percent}%` }]} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Bio Card (collapsible) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Bio</Text>
              <TouchableOpacity onPress={() => toggleCollapse('bio')}>
                {expandBio ? <ChevronUp size={18} color="#0A84FF" /> : <ChevronDown size={18} color="#0A84FF" />}
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
                {expandAbout ? <ChevronUp size={18} color="#0A84FF" /> : <ChevronDown size={18} color="#0A84FF" />}
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
                  <Text style={styles.aboutLabel}>Location</Text>
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
                  {expandInterests ? <ChevronUp size={18} color="#0A84FF" /> : <ChevronDown size={18} color="#0A84FF" />}
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
                        <Icon size={14} color="#0A84FF" strokeWidth={2} />
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
                  {expandInterests ? <ChevronUp size={18} color="#0A84FF" /> : <ChevronDown size={18} color="#0A84FF" />}
                </TouchableOpacity>
              </View>
              {expandInterests && (
                <>
                  <Text style={styles.cardBodyText}>No interests yet</Text>
                  {isSelf && (
                    <TouchableOpacity style={styles.pickButton} onPress={() => router.push('/(tabs)/discover?showInterests=1' as any)}>
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

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/profile/edit')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={() => setShareSheetVisible(true)}>
            <Text style={styles.shareButtonText}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {highlights.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.cardTitle}>Highlights</Text>
              <TouchableOpacity onPress={() => router.push('/profile/manage-highlights' as any)}>
                <Text style={styles.linkText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.highlightsContainer}
              contentContainerStyle={styles.highlightsContent}
            >
              {highlights.map((h) => (
                <TouchableOpacity 
                  key={h.id} 
                  style={styles.highlightItem}
                  onPress={() => {
                    const title = encodeURIComponent(h.title || 'Highlight');
                    router.push(`/highlights/${user.id}?t=${title}&hid=${h.id}` as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.highlightImageContainer, h.color ? { borderColor: h.color } : null]}>
                    {h.post_id && postPreview[h.post_id]?.thumb ? (
                      <Image source={{ uri: postPreview[h.post_id]?.thumb as string }} style={styles.highlightImage} />
                    ) : h.media_url ? (
                      <Image source={{ uri: h.media_url }} style={styles.highlightImage} />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                        {h.emoji ? (
                          <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
                        ) : (
                          <Star size={18} color="#0A84FF" />
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.highlightTitle} numberOfLines={1}>{h.title || 'Highlight'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
        {highlights.length === 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Highlights</Text>
              <TouchableOpacity onPress={() => router.push('/profile/manage-highlights' as any)}>
                <Text style={styles.linkText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardBodyText}>No highlights yet</Text>
            <TouchableOpacity style={styles.pickButton} onPress={() => router.push('/profile/manage-highlights' as any)}>
              <Text style={styles.pickButtonText}>Add highlight</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'grid' && styles.activeTab]}
          onPress={() => setActiveTab('grid')}
        >
          <Grid3x3 size={24} color={activeTab === 'grid' ? '#000000' : '#8E8E8E'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Bookmark size={24} color={activeTab === 'saved' ? '#000000' : '#8E8E8E'} />
        </TouchableOpacity>
      </View>

      {activeTab === 'grid' ? (
        <View style={styles.postsGrid}>
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => router.push(`/post/${post.id}`)}>
                {post.image_url ? (
                  <Image source={{ uri: post.image_url }} style={styles.gridImage} />
                ) : Array.isArray(post.image_urls) && post.image_urls.length > 0 ? (
                  <Image source={{ uri: post.image_urls[0] }} style={styles.gridImage} />
                ) : (
                  <View style={styles.gridImagePlaceholder}>
                    <Text style={styles.gridPlaceholderText}>No Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No posts yet</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.postsGrid}>
          {savedPosts.length > 0 ? (
            savedPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => router.push(`/post/${post.id}`)}>
                {post.image_url ? (
                  <Image source={{ uri: post.image_url }} style={styles.gridImage} />
                ) : Array.isArray(post.image_urls) && post.image_urls.length > 0 ? (
                  <Image source={{ uri: post.image_urls[0] }} style={styles.gridImage} />
                ) : (
                  <View style={styles.gridImagePlaceholder}>
                    <Text style={styles.gridPlaceholderText}>No Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
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
              onPress={async () => {
                try {
                  if (!user?.id || !selectedPostId) return;
                  await supabase.from('profile_highlights').insert({
                    user_id: user.id,
                    title: 'Highlight',
                    visible: true,
                    pinned: false,
                    post_id: selectedPostId,
                  });
                  Alert.alert('Added', 'Post added to highlights');
                  setPostSheetOpen(false);
                  // reload highlights
                  const { data } = await supabase
                    .from('profile_highlights')
                    .select('id,user_id,title,order_index,visible,pinned,post_id')
                    .eq('user_id', user.id)
                    .eq('visible', true)
                    .order('pinned', { ascending: false })
                    .order('order_index', { ascending: true })
                    .limit(12);
                  setHighlights((data as any) || []);
                } catch (e) {
                  Alert.alert('Error', 'Failed to add to highlights');
                }
              }}
            >
              <Text style={styles.sheetActionText}>Add to highlights</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPostSheetOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  username: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    padding: 4,
  },
  profileSection: {
    paddingHorizontal: 16,
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
  highlightsContainer: {
    marginBottom: 8,
  },
  highlightsContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  highlightItem: {
    alignItems: 'center',
    width: 70,
  },
  highlightImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    textAlign: 'center',
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
    backgroundColor: '#4169E1',
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
    color: '#0A84FF',
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
    gap: 8,
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
    color: '#0A84FF',
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
    backgroundColor: '#0A84FF',
  },
  pickButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#0A84FF',
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
