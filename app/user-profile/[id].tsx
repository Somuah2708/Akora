import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator, Modal, Share, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { 
  Grid3x3,
  Bookmark,
  UserPlus,
  Menu,
  Heart,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Star,
  MoreHorizontal,
  Trash,
  ArrowLeft,
  Play,
  User,
  Info,
  Sparkles,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { supabase, getFullLegalName } from '@/lib/supabase';
import { INTEREST_LIBRARY, type InterestOptionId } from '@/lib/interest-data';
import VisitorActions from '@/components/VisitorActions';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3;

// Standalone user profile screen (Instagram-style - no bottom tabs, just back button)
export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'grid' | 'saved'>('grid');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, friends: 0 });
  const [userInterests, setUserInterests] = useState<Set<InterestOptionId>>(new Set());
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [expandBio, setExpandBio] = useState(true);
  const [expandAbout, setExpandAbout] = useState(true);
  const [expandInterests, setExpandInterests] = useState(true);
  const [viewProfile, setViewProfile] = useState<any | null>(null);
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const viewingUserId = id || '';
  const isOwner = !!user && viewingUserId === user.id;

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (viewingUserId) {
      fetchUserData();
    }
  }, [viewingUserId]);

  const fetchUserData = async () => {
    if (!viewingUserId) return;

    try {
      setLoading(true);

      // Load the viewed user's profile
      try {
        const { data: vp } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', viewingUserId)
          .single();
        if (vp) setViewProfile(vp);
      } catch {}

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

      // Fetch friends count
      const { data: friendsList, error: friendsError } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${viewingUserId},friend_id.eq.${viewingUserId}`);

      if (!friendsError && friendsList) {
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
    }
  };

  const buildProfileLink = () => {
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
    const message = `${getFullLegalName(viewProfile) || 'My'} Akora profile\n${url}`;
    try {
      await Share.share({ message, url });
    } catch (e) {}
  };

  const formatOccupation = (s?: string | null) => {
    switch (s) {
      case 'student': return 'Student';
      case 'employed': return 'Employed';
      case 'self_employed': return 'Self-Employed';
      case 'unemployed': return 'Unemployed';
      case 'other': return 'Other';
      default: return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
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

  if (!viewProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  const profile = viewProfile;

  // Build interest lookup
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
      if (hasSelectedChild) return false;
      return true;
    });
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShareSheetVisible(false)} />
            <View style={styles.bottomSheet}>
              <Text style={styles.sheetTitle}>Share profile</Text>
              <TouchableOpacity style={styles.sheetAction} onPress={shareSystem}>
                <Text style={styles.sheetActionText}>Share…</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetAction} onPress={copyProfileLink}>
                <Text style={styles.sheetActionText}>Copy link</Text>
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
            <View style={styles.headerLeftRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => debouncedRouter.back()}>
                <ArrowLeft size={24} color="#000000" strokeWidth={2} />
              </TouchableOpacity>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{getFullLegalName(profile) || 'User'}</Text>
                {profile.is_admin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.headerIcon} onPress={() => setShareSheetVisible(true)}>
              <MoreHorizontal size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <TouchableOpacity onPress={() => profile.avatar_url && setAvatarPreviewVisible(true)}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
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
              {!profile.is_admin && (
                <TouchableOpacity style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.friends}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.bioSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.displayName}>{getFullLegalName(profile) || 'User'}</Text>
              {profile.is_admin && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              )}
            </View>

            {/* Bio Card */}
            {profile.bio && (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandBio(!expandBio)}>
                  <View style={styles.cardTitleRow}>
                    <User size={16} color="#000000" strokeWidth={2} />
                    <Text style={styles.cardTitle}>Bio</Text>
                  </View>
                  {expandBio ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                </TouchableOpacity>
                {expandBio && <Text style={styles.cardBodyText}>{profile.bio}</Text>}
              </View>
            )}

            {/* About Card - Hidden for admins */}
            {!profile.is_admin && (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandAbout(!expandAbout)}>
                  <View style={styles.cardTitleRow}>
                    <Info size={16} color="#000000" strokeWidth={2} />
                    <Text style={styles.cardTitle}>About</Text>
                  </View>
                  {expandAbout ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                </TouchableOpacity>
                {expandAbout && (
                <View style={styles.cardBody}>
                  {(profile as any).occupation_status && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Status</Text>
                      <Text style={styles.aboutValue}>{formatOccupation((profile as any).occupation_status)}</Text>
                    </View>
                  )}
                  {profile.year_group && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Year Group</Text>
                      <Text style={styles.aboutValue}>{profile.year_group}</Text>
                    </View>
                  )}
                  {profile.class && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Class</Text>
                      <Text style={styles.aboutValue}>{profile.class}</Text>
                    </View>
                  )}
                  {profile.house && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>House</Text>
                      <Text style={styles.aboutValue}>{profile.house}</Text>
                    </View>
                  )}
                  {(profile as any).location && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Location</Text>
                      <Text style={styles.aboutValue}>{(profile as any).location}</Text>
                    </View>
                  )}
                  {(profile as any).phone && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Phone</Text>
                      <Text style={styles.aboutValue}>{(profile as any).phone}</Text>
                    </View>
                  )}
                  {(profile as any).email && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Email</Text>
                      <Text style={styles.aboutValue}>{(profile as any).email}</Text>
                    </View>
                  )}
                  {((profile as any).job_title || (profile as any).company_name) && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Occupation</Text>
                      <Text style={styles.aboutValue}>
                        {[(profile as any).job_title, (profile as any).company_name].filter(Boolean).join(' @ ')}
                      </Text>
                    </View>
                  )}
                  {((profile as any).institution_name || (profile as any).program_of_study || (profile as any).graduation_year || (profile as any).current_study_year) && (
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Education</Text>
                      <Text style={styles.aboutValue}>
                        {[
                          (profile as any).institution_name,
                          (profile as any).program_of_study,
                          (profile as any).current_study_year ? `Year ${String((profile as any).current_study_year)}` : undefined,
                          (profile as any).graduation_year ? `Class of ${String((profile as any).graduation_year)}` : undefined,
                        ].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              </View>
            )}

            {/* Interests Card */}
            {visibleInterestIds.length > 0 && (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandInterests(!expandInterests)}>
                  <View style={styles.cardTitleRow}>
                    <Sparkles size={16} color="#000000" strokeWidth={2} />
                    <Text style={styles.cardTitle}>Interests</Text>
                  </View>
                  {expandInterests ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                </TouchableOpacity>
                {expandInterests && (
                  <View style={styles.interestTags}>
                    {visibleInterestIds.map((iid) => {
                      const meta = INTEREST_LOOKUP[iid];
                      if (!meta) return null;
                      const IconComponent = meta.icon;
                      return (
                        <View key={iid} style={styles.interestTag}>
                          <IconComponent size={14} color="#000000" strokeWidth={2} />
                          <Text style={styles.interestTagText}>{meta.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Links Card */}
            {((profile as any).website_url || (profile as any).linkedin_url || (profile as any).twitter_url || (profile as any).instagram_url || (profile as any).facebook_url) && (
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
            )}
          </View>
        </View>

        {/* Visitor Actions (Follow/Message buttons) - Hidden for admins and own profile */}
        {!isOwner && !viewProfile?.is_admin && (
          <VisitorActions userId={viewingUserId} />
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'grid' && styles.tabActive]}
            onPress={() => setActiveTab('grid')}
          >
            <Grid3x3 size={24} color={activeTab === 'grid' ? '#000000' : '#999999'} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.grid}>
          {userPosts.map((post) => {
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
              <TouchableOpacity
                key={post.id}
                style={styles.gridItem}
                onPress={() => debouncedRouter.push(`/post/${post.id}`)}
              >
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
                  <View style={[styles.gridImage, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No Media</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </>
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
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  backButton: {
    padding: 4,
    marginRight: 4,
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
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    marginTop: 2,
  },
  bioSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  tabsContainer: {
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
  tabActive: {
    borderBottomColor: '#0F172A',
  },
  grid: {
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoPlaceholderText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageFullOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFullOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  cardBodyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 18,
    marginTop: 8,
  },
  cardBody: {
    marginTop: 8,
    gap: 8,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  aboutLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flexShrink: 0,
    minWidth: 80,
  },
  aboutValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'right',
  },
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  interestTag: {
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
  interestTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  highlightScroll: {
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  highlightItem: {
    alignItems: 'center',
    width: 70,
    marginRight: 12,
  },
  highlightThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  highlightPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    textAlign: 'center',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  highlightsSection: {
    marginBottom: 12,
  },
  verifiedBadge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 22,
  },
});

