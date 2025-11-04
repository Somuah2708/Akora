import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sparkles, Heart, MessageCircle, Bookmark, Lightbulb, SlidersHorizontal, Check, X, ChevronDown, Users, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { fetchDiscoverFeed, type DiscoverItem } from '@/lib/discover';
import { INTEREST_LIBRARY, type InterestCategoryDefinition, type InterestOptionId } from '@/lib/interest-data';
import { Video, ResizeMode } from 'expo-av';
import YouTubePlayer from '@/components/YouTubePlayer';

const { width } = Dimensions.get('window');

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

type InterestMeta = {
  label: string;
  icon: LucideIcon;
  parentId?: string;
  description?: string;
};

const INTEREST_LOOKUP: Record<string, InterestMeta> = {};
const SUBCATEGORY_IDS_BY_PARENT = new Map<string, string[]>();

INTEREST_LIBRARY.forEach((category) => {
  INTEREST_LOOKUP[category.id] = {
    label: category.label,
    icon: category.icon,
    description: category.description,
  };

  if (category.subcategories?.length) {
    SUBCATEGORY_IDS_BY_PARENT.set(
      category.id,
      category.subcategories.map((sub) => sub.id)
    );

    category.subcategories.forEach((sub) => {
      INTEREST_LOOKUP[sub.id] = {
        label: sub.label,
        icon: category.icon,
        parentId: category.id,
        description: sub.description,
      };
    });
  }
});

const FILTER_ORDER = INTEREST_LIBRARY.flatMap((category) => [
  category.id,
  ...(category.subcategories?.map((sub) => sub.id) ?? []),
]);

const formatInterestLabel = (value: string) =>
  value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const getInterestMeta = (id: string) => INTEREST_LOOKUP[id];

interface CarouselIndices {
  [key: string]: number;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'friends' | string>('all');
  const [discoverFeed, setDiscoverFeed] = useState<DiscoverItem[]>([]);
  const [userInterests, setUserInterests] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselIndices, setCarouselIndices] = useState<CarouselIndices>({});
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [interestSearch, setInterestSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const interestKey = useMemo(
    () => Array.from(userInterests).sort().join(','),
    [userInterests]
  );

  const interestFilters = useMemo(() => {
    const baseSelection = userInterests.size > 0
      ? Array.from(userInterests)
      : INTEREST_LIBRARY.map((option) => option.id);

    const hiddenParents = new Set<string>();
    userInterests.forEach((id) => {
      const parentId = getInterestMeta(id)?.parentId;
      if (parentId) {
        hiddenParents.add(parentId);
      }
    });

    const rankedFilters = baseSelection
      .filter((id) => !(hiddenParents.has(id) && SUBCATEGORY_IDS_BY_PARENT.has(id)))
      .map((id) => {
        const meta = getInterestMeta(id);
        const sortKey = FILTER_ORDER.indexOf(id);
        return {
          id,
          label: meta ? meta.label : formatInterestLabel(id),
          icon: meta ? meta.icon : Sparkles,
          sortKey: sortKey === -1 ? Number.MAX_SAFE_INTEGER : sortKey,
        };
      })
      .sort((a, b) => (a.sortKey === b.sortKey ? a.label.localeCompare(b.label) : a.sortKey - b.sortKey));

    return [
      { id: 'all', label: 'For You', icon: Sparkles },
      { id: 'friends', label: 'Friends', icon: Users },
      ...rankedFilters.map(({ sortKey, ...rest }) => rest),
    ];
  }, [userInterests]);

  const filteredInterestOptions = useMemo(() => {
    const query = interestSearch.trim().toLowerCase();
    if (!query) return INTEREST_LIBRARY as InterestCategoryDefinition[];

    return INTEREST_LIBRARY
      .map((category) => {
        const matchesCategory =
          category.label.toLowerCase().includes(query) ||
          category.description.toLowerCase().includes(query);

        const matchingSubcategories = category.subcategories?.filter((sub) => {
          const labelMatch = sub.label.toLowerCase().includes(query);
          const descriptionMatch = sub.description
            ? sub.description.toLowerCase().includes(query)
            : false;
          return labelMatch || descriptionMatch;
        }) ?? [];

        if (!matchesCategory && matchingSubcategories.length === 0) {
          return null;
        }

        return {
          ...category,
          subcategories: matchesCategory ? category.subcategories : matchingSubcategories,
        } as InterestCategoryDefinition;
      })
      .filter(Boolean) as InterestCategoryDefinition[];
  }, [interestSearch]);

  const openInterestModal = useCallback(() => {
    const nextExpanded = new Set<string>();
    userInterests.forEach((id) => {
      const parentId = getInterestMeta(id)?.parentId;
      if (parentId) {
        nextExpanded.add(parentId);
      }
    });

    setInterestSearch('');
    setExpandedCategories(nextExpanded);
    setInterestModalVisible(true);
  }, [userInterests]);

  const closeInterestModal = useCallback(() => {
    setInterestModalVisible(false);
  }, []);

  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const loadDiscoverFeed = useCallback(async () => {
    setLoading(true);
    try {
      const feed = await fetchDiscoverFeed(
        user?.id,
        activeFilter === 'all' || activeFilter === 'friends' ? undefined : activeFilter
      );
      // Enrich with like/save state for current user
      if (user?.id) {
        const postIds = feed.filter((f) => f.type === 'post' && f.sourceId).map((f) => String(f.sourceId));
        if (postIds.length > 0) {
          const [likesRes, bmsRes] = await Promise.all([
            supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          ]);
          const liked = new Set((likesRes.data || []).map((r: any) => r.post_id));
          const saved = new Set((bmsRes.data || []).map((r: any) => r.post_id));
          const enriched = feed.map((f) =>
            f.type === 'post' && f.sourceId
              ? { ...f, isLiked: liked.has(String(f.sourceId)), saved: saved.has(String(f.sourceId)) ? 1 : 0, isBookmarked: saved.has(String(f.sourceId)) }
              : f
          );
          const sorted = enriched.slice().sort((a, b) => {
            const ad = a.created_at || (a as any).date || '';
            const bd = b.created_at || (b as any).date || '';
            return new Date(bd).getTime() - new Date(ad).getTime();
          });
          setDiscoverFeed(sorted);
        } else {
          const sorted = feed.slice().sort((a, b) => {
            const ad = a.created_at || (a as any).date || '';
            const bd = b.created_at || (b as any).date || '';
            return new Date(bd).getTime() - new Date(ad).getTime();
          });
          setDiscoverFeed(sorted);
        }
      } else {
        const sorted = feed.slice().sort((a, b) => {
          const ad = a.created_at || (a as any).date || '';
          const bd = b.created_at || (b as any).date || '';
          return new Date(bd).getTime() - new Date(ad).getTime();
        });
        setDiscoverFeed(sorted);
      }
    } catch (e) {
      console.error('Error loading discover feed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeFilter, interestKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDiscoverFeed();
    setRefreshing(false);
  }, [loadDiscoverFeed]);

  useEffect(() => {
    loadDiscoverFeed();
  }, [loadDiscoverFeed]);

  // If routed with ?openInterestModal=1, open the interests modal on mount
  useEffect(() => {
    if (params && (params as any).openInterestModal) {
      openInterestModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(params as any)?.openInterestModal]);

  useEffect(() => {
    const loadInterests = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_interests')
        .select('category')
        .eq('user_id', user.id);
      if (error) {
        console.error('Failed to load user interests', error);
        return;
      }
      setUserInterests(new Set((data || []).map((r: any) => r.category)));
    };
    loadInterests();
  }, [user?.id]);

  useEffect(() => {
    const loadFriends = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);
      if (error) {
        console.error('Failed to load friends', error);
        return;
      }
      setFriendIds(new Set((data || []).map((r: any) => r.friend_id)));
    };
    loadFriends();
  }, [user?.id]);

  const toggleUserInterest = async (interestId: InterestOptionId) => {
    if (!user?.id) return;

    const parentId = getInterestMeta(interestId)?.parentId;
    const previousSelection = new Set(userInterests);
    const previousActive = activeFilter;
    const nextSelection = new Set(userInterests);
    const isSelected = nextSelection.has(interestId);

    if (isSelected) {
      nextSelection.delete(interestId);

      const categoriesToDelete = [interestId];
      let removeParent = false;

      if (parentId) {
        const siblings = SUBCATEGORY_IDS_BY_PARENT.get(parentId) ?? [];
        const hasOtherSiblings = siblings.some((id) => id !== interestId && nextSelection.has(id));
        if (!hasOtherSiblings) {
          removeParent = true;
          nextSelection.delete(parentId);
        }
      }

      if (parentId && removeParent) {
        categoriesToDelete.push(parentId);
      }

      if (activeFilter === interestId || (parentId && activeFilter === parentId)) {
        setActiveFilter('all');
      }

      setUserInterests(nextSelection);

      if (categoriesToDelete.length > 0) {
        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .in('category', categoriesToDelete);

        if (error) {
          console.error('Failed to remove interest', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      }
    } else {
      const wasEmpty = nextSelection.size === 0;
      nextSelection.add(interestId);

      const categoriesToInsert: { user_id: string; category: string }[] = [];

      if (!previousSelection.has(interestId)) {
        categoriesToInsert.push({ user_id: user.id, category: interestId });
      }

      if (parentId) {
        if (!nextSelection.has(parentId)) {
          nextSelection.add(parentId);
        }
        if (!previousSelection.has(parentId)) {
          categoriesToInsert.push({ user_id: user.id, category: parentId });
        }
      }

      setUserInterests(nextSelection);
      if (wasEmpty) {
        setActiveFilter(interestId);
      }

      if (categoriesToInsert.length > 0) {
        const { error } = await supabase
          .from('user_interests')
          .insert(categoriesToInsert);

        if (error) {
          console.error('Failed to add interest', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      }
    }
  };

  const toggleCategoryGroup = useCallback(
    async (category: InterestCategoryDefinition, mode: 'select' | 'clear') => {
      if (!user?.id) return;

      const previousSelection = new Set(userInterests);
      const previousActive = activeFilter;
      const subcategoryIds = SUBCATEGORY_IDS_BY_PARENT.get(category.id) ?? [];
      const bundle = [category.id, ...subcategoryIds];

      if (mode === 'select') {
        const nextSelection = new Set(previousSelection);
        bundle.forEach((id) => nextSelection.add(id));
        setUserInterests(nextSelection);
        setExpandedCategories((prev) => new Set(prev).add(category.id));
        if (previousSelection.size === 0) {
          setActiveFilter(category.id);
        }

        const rowsToInsert = bundle
          .filter((id) => !previousSelection.has(id))
          .map((id) => ({ user_id: user.id, category: id }));

        if (rowsToInsert.length === 0) {
          return;
        }

        const { error } = await supabase.from('user_interests').insert(rowsToInsert);

        if (error) {
          console.error('Failed to follow category group', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      } else {
        const nextSelection = new Set(previousSelection);
        bundle.forEach((id) => nextSelection.delete(id));
        setUserInterests(nextSelection);
        if (activeFilter === category.id || subcategoryIds.includes(activeFilter)) {
          setActiveFilter('all');
        }

        const rowsToDelete = bundle.filter((id) => previousSelection.has(id));
        if (rowsToDelete.length === 0) {
          return;
        }

        const { error } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)
          .in('category', rowsToDelete);

        if (error) {
          console.error('Failed to clear category group', error);
          setUserInterests(previousSelection);
          setActiveFilter(previousActive);
        }
      }
    },
    [user?.id, userInterests, activeFilter]
  );

  useEffect(() => {
    if (!interestSearch.trim()) {
      return;
    }
    setExpandedCategories(new Set(filteredInterestOptions.map((category) => category.id)));
  }, [interestSearch, filteredInterestOptions]);

  useEffect(() => {
    if (interestSearch.trim()) {
      return;
    }
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      userInterests.forEach((id) => {
        const parentId = getInterestMeta(id)?.parentId;
        if (parentId) {
          next.add(parentId);
        }
      });
      return next;
    });
  }, [userInterests, interestSearch]);

  const handleLikeToggle = async (itemId: string) => {
    if (!user?.id) return;

    const item = discoverFeed.find((i) => i.id === itemId);
    if (!item) return;

    const isLiked = item.isLiked || false;
    const newLikeCount = isLiked ? (item.likes || 0) - 1 : (item.likes || 0) + 1;

    // Optimistically update UI
    setDiscoverFeed((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, isLiked: !isLiked, likes: newLikeCount }
          : i
      )
    );

    // Update database
    if (item.type === 'post' && item.sourceId) {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', item.sourceId)
          .eq('user_id', user.id);
        if (error) console.error('Error unliking post:', error);
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: item.sourceId, user_id: user.id });
        if (error) console.error('Error liking post:', error);
      }
    }
  };

  const handleBookmarkToggle = async (itemId: string) => {
    if (!user?.id) return;
    const item = discoverFeed.find((i) => i.id === itemId);
    if (!item || item.type !== 'post' || !item.sourceId) return;
    const wasSaved = (item as any).isBookmarked === true || (item as any).saved === 1;
    // Optimistic
    setDiscoverFeed(prev => prev.map(i => i.id === itemId ? { ...i, isBookmarked: !wasSaved, saved: !wasSaved ? 1 : 0 } : i));
    try {
      if (wasSaved) {
        const { error } = await supabase.from('post_bookmarks').delete().eq('post_id', item.sourceId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_bookmarks').insert({ post_id: item.sourceId, user_id: user.id });
        if (error) throw error;
      }
    } catch (e) {
      setDiscoverFeed(prev => prev.map(i => i.id === itemId ? { ...i, isBookmarked: wasSaved, saved: wasSaved ? 1 : 0 } : i));
    }
  };

  const filteredSections = useMemo(() => {
    const friendsPosts = discoverFeed.filter((i) => i.type === 'post' && i.author && friendIds.has(i.author.id));
    const otherItems = discoverFeed.filter((i) => {
      if (i.type !== 'post') return true;
      if (!i.author) return true;
      return !friendIds.has(i.author.id);
    });

    const applyFilter = (arr: DiscoverItem[]) => {
      if (activeFilter === 'all') return arr;
      if (activeFilter === 'friends') return friendsPosts;
      return arr.filter((i) => i.category === activeFilter);
    };

    return {
      friends: applyFilter(friendsPosts),
      others: applyFilter(otherItems),
    };
  }, [discoverFeed, activeFilter, friendIds]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent
        visible={interestModalVisible}
        onRequestClose={closeInterestModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Fine-tune your Discover feed</Text>
                <Text style={styles.modalSubtitle}>
                  Select the topics you care about. We&rsquo;ll prioritize stories, opportunities, and
                  updates that match them.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeInterestModal}
                accessibilityLabel="Close interest selector"
              >
                <X size={18} color="#111827" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Search interests"
              placeholderTextColor="#9CA3AF"
              value={interestSearch}
              onChangeText={setInterestSearch}
            />

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredInterestOptions.map((category) => {
                const IconComponent = category.icon;
                const hasSubcategories = Boolean(category.subcategories?.length);
                const subcategoryIds = SUBCATEGORY_IDS_BY_PARENT.get(category.id) ?? [];
                const selectedSubCount = subcategoryIds.filter((id) => userInterests.has(id)).length;
                const totalSubCount = subcategoryIds.length;
                const categorySelected = userInterests.has(category.id);
                const isExpanded = hasSubcategories ? expandedCategories.has(category.id) : categorySelected;
                const followingBadgeVisible = hasSubcategories ? selectedSubCount > 0 : categorySelected;
                const allTopicsSelected = totalSubCount > 0 && selectedSubCount === totalSubCount;

                return (
                  <View key={category.id} style={styles.categorySection}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.categoryHeader, isExpanded && hasSubcategories && styles.categoryHeaderExpanded]}
                      onPress={() =>
                        hasSubcategories
                          ? toggleCategoryExpansion(category.id)
                          : toggleUserInterest(category.id)
                      }
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <View style={styles.categoryIconWrapper}>
                          <IconComponent size={20} color="#0A84FF" strokeWidth={1.75} />
                        </View>
                        <View style={styles.categoryHeaderText}>
                          <Text style={styles.categoryTitle}>{category.label}</Text>
                          <Text style={styles.categorySubtitle}>{category.description}</Text>
                          {hasSubcategories && (
                            <Text style={styles.categoryMetaText}>
                              {selectedSubCount > 0
                                ? `${selectedSubCount} of ${totalSubCount} topics`
                                : `${totalSubCount} topics`}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.categoryHeaderRight}>
                        {followingBadgeVisible && (
                          <View style={styles.categoryStatusBadge}>
                            <Text style={styles.categoryStatusText}>Following</Text>
                          </View>
                        )}
                        {hasSubcategories ? (
                          <ChevronDown
                            size={18}
                            color="#1F2937"
                            strokeWidth={2}
                            style={isExpanded ? styles.chevronExpanded : undefined}
                          />
                        ) : (
                          <View
                            style={[
                              styles.categorySoloBadge,
                              categorySelected && styles.categorySoloBadgeSelected,
                            ]}
                          >
                            {categorySelected && <Check size={14} color="#FFFFFF" strokeWidth={2} />}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {hasSubcategories && isExpanded && (
                      <View style={styles.categoryBody}>
                        <View style={styles.categoryActions}>
                          <TouchableOpacity
                            style={[
                              styles.categoryActionButton,
                              allTopicsSelected && styles.categoryActionButtonDisabled,
                            ]}
                            onPress={() => {
                              if (!allTopicsSelected) {
                                toggleCategoryGroup(category, 'select');
                              }
                            }}
                            disabled={allTopicsSelected}
                          >
                            <Text
                              style={[
                                styles.categoryActionText,
                                allTopicsSelected && styles.categoryActionTextMuted,
                              ]}
                            >
                              {allTopicsSelected ? 'Following all topics' : 'Follow all topics'}
                            </Text>
                          </TouchableOpacity>
                          {selectedSubCount > 0 && (
                            <TouchableOpacity
                              style={styles.categoryActionButtonGhost}
                              onPress={() => toggleCategoryGroup(category, 'clear')}
                            >
                              <Text style={styles.categoryActionGhostText}>Clear</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.subcategoryGrid}>
                          {category.subcategories?.map((sub) => {
                            const isSelected = userInterests.has(sub.id);
                            return (
                              <TouchableOpacity
                                key={sub.id}
                                style={[
                                  styles.subcategoryPill,
                                  isSelected && styles.subcategoryPillSelected,
                                ]}
                                onPress={() => toggleUserInterest(sub.id)}
                                activeOpacity={0.85}
                              >
                                <Text
                                  style={[
                                    styles.subcategoryLabel,
                                    isSelected && styles.subcategoryLabelSelected,
                                  ]}
                                >
                                  {sub.label}
                                </Text>
                                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={2} />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={closeInterestModal}
              activeOpacity={0.9}
            >
              <Text style={styles.modalPrimaryButtonText}>Save interests</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={["#0EA5E9", "#6366F1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>Discover</Text>
                <Text style={styles.headerSubtitleAlt} numberOfLines={3} ellipsizeMode="tail">See what your friends are up to and posts from people who share your interests</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => router.push('/create-post?autoPick=1' as any)}
                  activeOpacity={0.9}
                  accessibilityLabel="Open camera to create a post"
                >
                  <Camera size={18} color="#111827" strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerGhostButton}
                  onPress={openInterestModal}
                  activeOpacity={0.9}
                >
                  <SlidersHorizontal size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.headerGhostText}>
                    {userInterests.size ? `Interests (${userInterests.size})` : 'Interests'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {interestFilters.map((filter) => {
            const IconComponent = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity 
                key={filter.id} 
                style={[styles.filterChip, isActive && styles.filterChipActive]} 
                onPress={() => setActiveFilter(filter.id)}
              >
                <IconComponent size={16} color={isActive ? '#FFFFFF' : '#6B7280'} strokeWidth={2} />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Posts Feed */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0095F6" />
            <Text style={styles.loadingText}>Loading personalized content...</Text>
          </View>
        ) : discoverFeed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Sparkles size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No content yet</Text>
            <Text style={styles.emptyText}>Check back soon for personalized recommendations</Text>
          </View>
        ) : (
          discoverFeed
            .filter((item) => item.type === 'post') // Only show posts
            .map((item) => (
            <View key={item.id} style={styles.postCard}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.postHeaderLeft}>
                  <Image 
                    source={{ 
                      uri: item.author?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'
                    }} 
                    style={styles.postUserAvatar} 
                  />
                  <View>
                    <Text style={styles.postUsername}>
                      {item.author?.full_name || 'Anonymous'}
                    </Text>
                    <Text style={styles.postTime}>{getTimeAgo(item.created_at || new Date().toISOString())}</Text>
                  </View>
                </View>
              </View>

              {/* Post Media (Images/Videos/YouTube Carousel) */}
              {item.youtube_urls && item.youtube_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [item.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {item.youtube_urls.map((youtubeUrl, index) => (
                      <YouTubePlayer key={index} url={youtubeUrl} />
                    ))}
                  </ScrollView>
                  {item.youtube_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[item.id] ?? 0) + 1}/{item.youtube_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
              ) : item.video_urls && item.video_urls.length > 0 ? (
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.carousel}
                    onScroll={(event) => {
                      const scrollX = event.nativeEvent.contentOffset.x;
                      const currentIndex = Math.round(scrollX / width);
                      setCarouselIndices({
                        ...carouselIndices,
                        [item.id]: currentIndex,
                      });
                    }}
                    scrollEventThrottle={16}
                  >
                    {item.video_urls.map((videoUrl, index) => (
                      <View key={index} style={styles.videoContainer}>
                        <Video
                          source={{ uri: videoUrl }}
                          style={styles.postImage}
                          useNativeControls
                          resizeMode={ResizeMode.COVER}
                          isLooping
                        />
                      </View>
                    ))}
                  </ScrollView>
                  {item.video_urls.length > 1 && (
                    <View style={styles.carouselIndicator}>
                      <Text style={styles.carouselIndicatorText}>
                        {(carouselIndices[item.id] ?? 0) + 1}/{item.video_urls.length}
                      </Text>
                    </View>
                  )}
                </View>
              ) : item.image_urls && item.image_urls.length > 0 ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => item.sourceId && router.push(`/post/${item.sourceId}`)}>
                  <View style={styles.carouselContainer}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      style={styles.carousel}
                      onScroll={(event) => {
                        const scrollX = event.nativeEvent.contentOffset.x;
                        const currentIndex = Math.round(scrollX / width);
                        setCarouselIndices({
                          ...carouselIndices,
                          [item.id]: currentIndex,
                        });
                      }}
                      scrollEventThrottle={16}
                    >
                      {item.image_urls.map((imageUrl, index) => (
                        <Image 
                          key={index}
                          source={{ uri: imageUrl }} 
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                    {item.image_urls.length > 1 && (
                      <View style={styles.carouselIndicator}>
                        <Text style={styles.carouselIndicatorText}>
                          {(carouselIndices[item.id] ?? 0) + 1}/{item.image_urls.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ) : item.youtube_url ? (
                <YouTubePlayer url={item.youtube_url} />
              ) : item.video_url ? (
                <View style={styles.videoContainer}>
                  <Video
                    source={{ uri: item.video_url }}
                    style={styles.postImage}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    isLooping
                  />
                </View>
              ) : item.image ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => item.sourceId && router.push(`/post/${item.sourceId}`)}>
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : null}

              {/* Post Actions */}
              <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleLikeToggle(item.id)}
                  >
                    <Heart 
                      size={26} 
                      color={item.isLiked ? "#FF3B30" : "#000000"}
                      fill={item.isLiked ? "#FF3B30" : "none"}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}
                  >
                    <MessageCircle size={26} color="#000000" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleBookmarkToggle(item.id)}>
                  <Bookmark size={26} color={(item as any).isBookmarked ? '#111827' : '#000000'} fill={(item as any).isBookmarked ? '#111827' : 'none'} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Post Likes */}
              <Text style={styles.postLikes}>{item.likes || 0} likes</Text>

              {/* Post Caption */}
              <View style={styles.postCaption}>
                <Text style={styles.postCaptionText}>
                  <Text style={styles.postCaptionUsername}>
                    {item.author?.full_name || 'Anonymous'}
                  </Text>
                  {' '}{item.description}
                </Text>
              </View>

              {/* Post Comments */}
              {item.comments && item.comments > 0 && (
                <TouchableOpacity onPress={() => item.sourceId && router.push(`/post-comments/${item.sourceId}`)}>
                  <Text style={styles.viewComments}>
                    View all {item.comments} {item.comments === 1 ? 'comment' : 'comments'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {/* Personalization Note */}
        {discoverFeed.length > 0 && (
          <View style={styles.personalizationNote}>
            <Lightbulb size={16} color="#F59E0B" />
            <Text style={styles.personalizationText}>
              Personalized based on your interests and activity
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollView: {
    flex: 1,
  },
  headerWrapper: {
    backgroundColor: '#FFFFFF',
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
    flexShrink: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerSubtitleAlt: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.85)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  headerGhostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerGhostText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearch: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  categorySection: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  categoryHeaderExpanded: {
    backgroundColor: '#F9FAFB',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  categoryIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  categorySubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  categoryMetaText: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  categoryHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  categoryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#0A84FF',
  },
  categoryStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categorySoloBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySoloBadgeSelected: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  categoryBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  categoryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  categoryActionButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryActionButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  categoryActionText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  categoryActionTextMuted: {
    color: '#6B7280',
  },
  categoryActionButtonGhost: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  categoryActionGhostText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  subcategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subcategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  subcategoryPillSelected: {
    borderColor: '#0A84FF',
    backgroundColor: '#0A84FF',
  },
  subcategoryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  subcategoryLabelSelected: {
    color: '#FFFFFF',
  },
  modalPrimaryButton: {
    marginTop: 18,
    backgroundColor: '#0A84FF',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  filtersContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
    backgroundColor: '#FFFFFF',
  },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#0095F6',
    borderColor: '#0095F6',
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  postCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  postUsername: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
  },
  postMatchScore: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#F59E0B',
  },
  categoryBadge: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  postImage: {
    width: '100%',
    height: width,
    backgroundColor: '#F3F4F6',
  },
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    width: width,
  },
  carouselIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  videoContainer: {
    width: width,
    height: width,
    backgroundColor: '#000000',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  postActionsLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  postLikes: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  postCaption: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  postCaptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    lineHeight: 20,
  },
  postCaptionUsername: {
    fontFamily: 'Inter-SemiBold',
  },
  viewComments: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E8E',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#0095F6',
  },
  personalizationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  personalizationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
  },
});
