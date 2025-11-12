import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
  Share,
  Linking,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as LinkingExpo from 'expo-linking';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emit } from '@/lib/eventBus';
import {
  ArrowLeft,
  MoreVertical,
  Hash,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Send,
} from 'lucide-react-native';

// Types
interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string; // mime type
}

interface ProfileLite {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: ProfileLite;
  forum_attachments?: Attachment[];
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface Comment {
  id: string;
  discussion_id: string;
  author_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  parent_comment_id?: string | null;
  profiles: ProfileLite;
  forum_attachments?: Attachment[];
  isLiked?: boolean;
}

const { width } = Dimensions.get('window');

export default function DiscussionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<TextInput>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

  // Pagination state for comments
  const PAGE_SIZE = 10;
  const [commentPage, setCommentPage] = useState(0); // zero-based page index
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce & retry state refs for likes/bookmarks
  const desiredLikeRef = useRef<boolean>(false);
  const serverLikedRef = useRef<boolean>(false);
  // React Native setTimeout returns a number; avoid NodeJS.Timeout typing
  const likeDebounceRef = useRef<number | null>(null);
  const likeRequestInFlightRef = useRef<boolean>(false);

  const desiredBookmarkRef = useRef<boolean>(false);
  const serverBookmarkedRef = useRef<boolean>(false);
  const bookmarkDebounceRef = useRef<number | null>(null);
  const bookmarkRequestInFlightRef = useRef<boolean>(false);

  const isAllowedImageExt = (ext?: string) => ['jpg','jpeg','png','webp','gif'].includes((ext||'').toLowerCase());
  const isAllowedDocExt = (ext?: string) => ['pdf','doc','docx'].includes((ext||'').toLowerCase());

  const validatePickedFile = async (uri: string, name: string, kind: 'image' | 'document') => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const ext = name.split('.').pop()?.toLowerCase();
      if (!info.exists) return false;
      if (info.size && info.size > MAX_FILE_BYTES) {
        Alert.alert('File too large', `${name} exceeds 10MB limit.`);
        return false;
      }
      if (kind === 'image' && !isAllowedImageExt(ext)) {
        Alert.alert('Unsupported image', `${name} must be jpg, jpeg, png, webp, or gif.`);
        return false;
      }
      if (kind === 'document' && !isAllowedDocExt(ext)) {
        Alert.alert('Unsupported document', `${name} must be pdf, doc, or docx.`);
        return false;
      }
      return true;
    } catch (e) {
      console.error('validatePickedFile error', e);
      return false;
    }
  };

  const isImageType = (t?: string) => t === 'image' || (t?.startsWith('image/'));
  const getExt = (name?: string) => (name || '').split('.').pop()?.toLowerCase() || '';
  const badgeColorForExt = (ext: string) => {
    if (ext === 'pdf') return '#DC2626';
    if (ext === 'doc' || ext === 'docx') return '#2563EB';
    return '#6B7280';
  };

  // Prefetch a handful of image URLs to improve perceived performance
  const prefetchImages = async (urls: string[], limit = 6) => {
    try {
      const slice = urls.slice(0, limit);
      await Promise.all(slice.map(u => (u ? Image.prefetch(u) : Promise.resolve(false))));
    } catch (e) {
      // best-effort; ignore
    }
  };

  // In-app document opening with fallback
  const openDocument = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      try { Linking.openURL(url); } catch {}
    }
  };

  const openImageViewerFromDiscussion = (attId: string) => {
    if (!discussion) return;
    const imgs = (discussion.forum_attachments || []).filter(a => isImageType(a.file_type)).map(a => a.file_url);
    const currentUrl = (discussion.forum_attachments || []).find(a => a.id === attId)?.file_url;
    const idx = Math.max(0, imgs.findIndex(u => u === currentUrl));
    setImageViewerImages(imgs);
    setImageViewerIndex(idx === -1 ? 0 : idx);
    setImageViewerVisible(true);
  };

  // Lazy loaded image component for attachments (discussion + comments)
  const AttachmentImage = memo(({ uri, style }: { uri: string; style?: any }) => {
    const [loaded, setLoaded] = useState(false);
    const opacity = useRef(new Animated.Value(0)).current;

    const onLoadEnd = () => {
      setLoaded(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    return (
      <View style={styles.imageAttachmentWrapper}>
        {!loaded && (
          <View style={styles.imageSkeleton} accessibilityLabel="Loading image preview" />
        )}
        <Animated.Image
          source={{ uri }}
          style={[styles.attachmentImage, style, { opacity }]}
          onLoadEnd={onLoadEnd}
          accessibilityLabel="Discussion image attachment"
          accessible
        />
      </View>
    );
  });

  const openImageViewerFromComment = (commentId: string, attId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const imgs = (comment.forum_attachments || []).filter(a => isImageType(a.file_type)).map(a => a.file_url);
    const currentUrl = (comment.forum_attachments || []).find(a => a.id === attId)?.file_url;
    const idx = Math.max(0, imgs.findIndex(u => u === currentUrl));
    setImageViewerImages(imgs);
    setImageViewerIndex(idx === -1 ? 0 : idx);
    setImageViewerVisible(true);
  };

  // When discussion/comments change, prefetch a few image attachments
  useEffect(() => {
    const urls: string[] = [];
    if (discussion?.forum_attachments?.length) {
      urls.push(
        ...discussion.forum_attachments
          .filter(a => isImageType(a.file_type))
          .map(a => a.file_url)
      );
    }
    if (comments.length) {
      for (const c of comments) {
        if (c.forum_attachments?.length) {
          urls.push(
            ...c.forum_attachments
              .filter(a => isImageType(a.file_type))
              .map(a => a.file_url)
          );
        }
      }
    }
    if (urls.length) prefetchImages(urls, 6);
  }, [discussion?.id, comments.map(c => c.id).join(',')]);

  useEffect(() => {
    if (id) {
      loadDiscussion();
      loadComments();
      incrementViewCount();
    }
  }, [id]);

  // Persist expand/collapse state per discussion
  useEffect(() => {
    let cancelled = false;
    const loadExpanded = async () => {
      try {
        const key = `forum:expandedThreads:${id}`;
        const raw = await AsyncStorage.getItem(key);
        if (raw && !cancelled) {
          const arr: string[] = JSON.parse(raw);
          setExpandedThreads(new Set(arr));
        }
      } catch {}
    };
    if (id) loadExpanded();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const persist = async () => {
      try {
        const key = `forum:expandedThreads:${id}`;
        const arr = Array.from(expandedThreads);
        await AsyncStorage.setItem(key, JSON.stringify(arr));
      } catch {}
    };
    if (id) persist();
  }, [expandedThreads, id]);

  const loadDiscussion = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_discussions')
        .select(`
          *,
          profiles!forum_discussions_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          forum_attachments (
            id,
            file_url,
            file_name,
            file_type
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedDiscussion: Discussion = {
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
        forum_attachments: data.forum_attachments || []
      };

      // Check if user liked this discussion
      if (user) {
        const { data: likeData } = await supabase
          .from('forum_discussion_likes')
          .select('id')
          .eq('discussion_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        const liked = !!likeData;
        formattedDiscussion.isLiked = liked;
        setIsLiked(liked);
    serverLikedRef.current = liked;
    desiredLikeRef.current = liked;

        // Check if user bookmarked this discussion
        const { data: bookmarkData } = await supabase
          .from('forum_discussion_bookmarks')
          .select('id')
          .eq('discussion_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        const bookmarked = !!bookmarkData;
        formattedDiscussion.isBookmarked = bookmarked;
        setIsBookmarked(bookmarked);
    serverBookmarkedRef.current = bookmarked;
    desiredBookmarkRef.current = bookmarked;
      }

      setDiscussion(formattedDiscussion);
    } catch (error) {
      console.error('Error loading discussion:', error);
      Alert.alert('Error', 'Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async ({ append = false }: { append?: boolean } = {}) => {
    if (!id) return;
    if (append && (!hasMore || loadingMore)) return; // guard
    try {
      append ? setLoadingMore(true) : setLoadingComments(true);
      const pageToLoad = append ? commentPage + 1 : 0;
      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('forum_comments')
        .select(`
          *,
          profiles!forum_comments_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          forum_attachments (
            id,
            file_url,
            file_name,
            file_type
          )
        `, { count: 'exact' })
        .eq('discussion_id', id)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const formattedComments = await Promise.all(
        (data || []).map(async (comment: any) => {
          const formatted = {
            ...comment,
            profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
          };
          if (user) {
            const { data: likeData } = await supabase
              .from('forum_comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .maybeSingle();
            formatted.isLiked = !!likeData;
            if (likeData) {
              setLikedComments(prev => new Set([...prev, comment.id]));
            }
          }
          return formatted;
        })
      );

      if (append) {
        setComments(prev => [...prev, ...formattedComments]);
        setCommentPage(pageToLoad);
      } else {
        setComments(formattedComments);
        setCommentPage(0);
      }

      if (count !== null && count !== undefined) {
        const loaded = (pageToLoad + 1) * PAGE_SIZE;
        setHasMore(loaded < count);
        setDiscussion(d => d ? ({ ...d, comments_count: count }) : d);
      } else {
        // Fallback: if fewer than requested items returned, assume no more
        setHasMore((data || []).length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      if (!append) Alert.alert('Error', 'Failed to load comments');
    } finally {
      append ? setLoadingMore(false) : setLoadingComments(false);
    }
  };

  const loadMoreComments = () => {
    loadComments({ append: true });
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadDiscussion();
      setCommentPage(0);
      setHasMore(true);
      await loadComments({ append: false });
    } finally {
      setRefreshing(false);
    }
  };

  // Helper: fetch a single comment with joins and like flag
  const fetchFormattedComment = async (commentId: string): Promise<Comment | null> => {
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select(`
          *,
          profiles!forum_comments_author_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          forum_attachments (
            id,
            file_url,
            file_name,
            file_type
          )
        `)
        .eq('id', commentId)
        .single();
      if (error) throw error;
      const formatted: any = {
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
      };
      if (user) {
        const { data: likeData } = await supabase
          .from('forum_comment_likes')
          .select('id')
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .maybeSingle();
        formatted.isLiked = !!likeData;
      }
      return formatted as Comment;
    } catch (e) {
      console.error('fetchFormattedComment error', e);
      return null;
    }
  };

  // Realtime subscription for new comments on this discussion
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`discussion-comments-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'forum_comments',
        filter: `discussion_id=eq.${id}`,
      }, async (payload: any) => {
        const insertedId = payload?.new?.id;
        if (!insertedId) return;
        // Avoid duplicates
        let added = false;
        setComments(prev => {
          if (prev.some(c => c.id === insertedId)) return prev;
          return prev;
        });
        const formatted = await fetchFormattedComment(insertedId);
        if (!formatted) return;
        setComments(prev => {
          if (prev.some(c => c.id === insertedId)) return prev;
          added = true;
          return [...prev, formatted];
        });
        if (formatted.isLiked) {
          setLikedComments(prev => new Set([...prev, insertedId]));
        }
        if (added) {
          setDiscussion(d => d ? ({ ...d, comments_count: (d.comments_count || 0) + 1 }) : d);
        }
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [id, user?.id]);

  // Realtime like updates for comments (multi-user sessions)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`comment-likes-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'forum_comment_likes',
      }, (payload: any) => {
        const { comment_id, user_id } = payload.new || {};
        if (!comment_id) return;
        // Ignore our own optimistic updates
        if (user_id && user_id === user?.id) return;
        setComments(prev => prev.map(c => c.id === comment_id ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'forum_comment_likes',
      }, (payload: any) => {
        const { comment_id, user_id } = payload.old || {};
        if (!comment_id) return;
        if (user_id && user_id === user?.id) return;
        setComments(prev => prev.map(c => c.id === comment_id ? { ...c, likes_count: Math.max(0, (c.likes_count || 0) - 1) } : c));
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [id, user?.id]);

  // Build children map for nested replies
  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      const parentId = c.parent_comment_id || '';
      if (!parentId) continue;
      const arr = map.get(parentId) || [];
      arr.push(c);
      map.set(parentId, arr);
    }
    return map;
  }, [comments]);

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  };

  const renderCommentNode = (comment: Comment, depth: number) => {
    const children = childrenByParent.get(comment.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedThreads.has(comment.id);
    return (
      <View key={comment.id} style={{ paddingLeft: depth > 0 ? depth * 24 : 0 }}>
        <View style={[styles.commentCard]}>
          <View style={styles.commentHeader}>
            <TouchableOpacity
              accessibilityLabel={`View ${comment.profiles?.full_name || 'user'} profile`}
              onPress={() => comment.profiles?.id && router.push({ pathname: '/user-profile/[id]', params: { id: comment.profiles.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image source={{ uri: comment.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.commentAvatar} />
              <View style={styles.commentAuthorInfo}>
                <Text style={styles.commentAuthorName}>{comment.profiles?.full_name || 'Anonymous'}</Text>
                <Text style={styles.commentAuthorRole}>Member</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.commentMetaRight}>
              {depth === 0 && hasChildren && (
                <View style={styles.replyCountBadge} accessibilityLabel={`${children.length} repl${children.length === 1 ? 'y' : 'ies'}`}> 
                  <Text style={styles.replyCountText}>{children.length}</Text>
                </View>
              )}
              <Text style={styles.commentTime}>{getTimeAgo(comment.created_at)}</Text>
            </View>
          </View>

          <Text style={styles.commentContent}>{comment.content}</Text>

          {/* Attachments */}
          {comment.forum_attachments && comment.forum_attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {comment.forum_attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  {isImageType(attachment.file_type) ? (
                    <TouchableOpacity
                      onPress={() => openImageViewerFromComment(comment.id, attachment.id)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Open image attachment ${attachment.file_name} in viewer`}
                      accessible
                    >
                      <View style={styles.imageAttachment}>
                        <AttachmentImage uri={attachment.file_url} />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openDocument(attachment.file_url)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Open document attachment ${attachment.file_name}`}
                      accessible
                    >
                      <View style={styles.documentAttachment}>
                        <View style={[styles.docBadge, { backgroundColor: badgeColorForExt(getExt(attachment.file_name)) }] }>
                          <Text style={styles.docBadgeText}>{getExt(attachment.file_name).toUpperCase()}</Text>
                        </View>
                        <FileText size={20} color="#4169E1" />
                        <Text style={styles.documentName} numberOfLines={1}>
                          {attachment.file_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.commentActionsRow}>
            <TouchableOpacity
              style={styles.commentLikeButton}
              onPress={() => handleCommentLike(comment.id)}
              accessibilityLabel={likedComments.has(comment.id) ? 'Unlike comment' : 'Like comment'}
              accessible
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThumbsUp
                size={16}
                color={likedComments.has(comment.id) ? '#4169E1' : '#666666'}
                fill={likedComments.has(comment.id) ? '#4169E1' : 'none'}
              />
              <Text style={[styles.commentLikeText, likedComments.has(comment.id) && styles.commentLikeTextActive]}>
                {comment.likes_count || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => {
                setReplyTo(comment);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              accessibilityLabel={`Reply to ${comment.profiles?.full_name || 'comment'}`}
              accessible
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
            {hasChildren && (
              <TouchableOpacity
                style={styles.replyToggleButton}
                onPress={() => toggleThread(comment.id)}
                accessibilityLabel={isExpanded ? 'Hide replies' : `View replies (${children.length})`}
                accessible
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.replyToggleText}>{isExpanded ? 'Hide replies' : `View replies (${children.length})`}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {hasChildren && isExpanded && (
          <View style={styles.repliesContainer}>
            {children.map(child => renderCommentNode(child, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_discussion_views', { discussion_id: id });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  // Debounced like toggle: compress rapid taps into single request reflecting final state
  const flushLikeToggle = async () => {
    if (!user || !discussion) return;
    if (likeRequestInFlightRef.current) return; // in flight; next debounce will flush later
    if (desiredLikeRef.current === serverLikedRef.current) return; // no change to persist
    likeRequestInFlightRef.current = true;
    const target = desiredLikeRef.current;
    try {
      if (target) {
        await supabase
          .from('forum_discussion_likes')
          .insert({ discussion_id: id as string, user_id: user.id });
      } else {
        await supabase
          .from('forum_discussion_likes')
          .delete()
          .eq('discussion_id', id)
          .eq('user_id', user.id);
      }
      serverLikedRef.current = target;
    } catch (error) {
      console.error('Error persisting like:', error);
      // Revert UI to last confirmed server state
      setIsLiked(serverLikedRef.current);
      setDiscussion(d => d ? ({
        ...d,
        isLiked: serverLikedRef.current,
        likes_count: serverLikedRef.current ? d.likes_count : Math.max(0, d.likes_count - 1) // if revert from optimistic like removal restore previous count
      }) : d);
      desiredLikeRef.current = serverLikedRef.current;
      Alert.alert('Like failed', 'Could not update like. Retry?', [
        { text: 'Cancel' },
        { text: 'Retry', onPress: () => {
            likeRequestInFlightRef.current = false;
            // schedule immediate retry
            flushLikeToggle();
          } }
      ]);
    } finally {
      likeRequestInFlightRef.current = false;
      // If user tapped again while request in flight, ensure we flush new desired state soon
      if (desiredLikeRef.current !== serverLikedRef.current) {
        if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current);
        likeDebounceRef.current = setTimeout(flushLikeToggle, 150);
      }
    }
  };

  const queueLikeToggle = () => {
    if (!user || !discussion) {
      Alert.alert('Error', 'You must be logged in to like');
      return;
    }
    const next = !isLiked;
    // Optimistic UI update
    setIsLiked(next);
    setDiscussion(d => d ? ({
      ...d,
      isLiked: next,
      likes_count: d.likes_count + (next ? 1 : -1)
    }) : d);
    desiredLikeRef.current = next;
    if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current);
    likeDebounceRef.current = setTimeout(flushLikeToggle, 350);
  };

  // Debounced bookmark toggle
  const flushBookmarkToggle = async () => {
    if (!user || !discussion) return;
    if (bookmarkRequestInFlightRef.current) return;
    if (desiredBookmarkRef.current === serverBookmarkedRef.current) return;
    bookmarkRequestInFlightRef.current = true;
    const target = desiredBookmarkRef.current;
    try {
      if (target) {
        await supabase
          .from('forum_discussion_bookmarks')
          .insert({ discussion_id: id as string, user_id: user.id });
      } else {
        await supabase
          .from('forum_discussion_bookmarks')
          .delete()
          .eq('discussion_id', id)
          .eq('user_id', user.id);
      }
      serverBookmarkedRef.current = target;
    } catch (error) {
      console.error('Error persisting bookmark:', error);
      setIsBookmarked(serverBookmarkedRef.current);
      setDiscussion(d => d ? ({ ...d, isBookmarked: serverBookmarkedRef.current }) : d);
      desiredBookmarkRef.current = serverBookmarkedRef.current;
      Alert.alert('Bookmark failed', 'Could not update bookmark. Retry?', [
        { text: 'Cancel' },
        { text: 'Retry', onPress: () => {
            bookmarkRequestInFlightRef.current = false;
            flushBookmarkToggle();
          } }
      ]);
    } finally {
  serverBookmarkedRef.current = target;
  // Notify other screens about the change
  if (id) emit('forum:bookmarkChanged', { discussionId: String(id), saved: target });
      bookmarkRequestInFlightRef.current = false;
      if (desiredBookmarkRef.current !== serverBookmarkedRef.current) {
        if (bookmarkDebounceRef.current) clearTimeout(bookmarkDebounceRef.current);
        bookmarkDebounceRef.current = setTimeout(flushBookmarkToggle, 150);
      }
    }
  };

  const queueBookmarkToggle = () => {
    if (!user || !discussion) {
      Alert.alert('Error', 'You must be logged in to bookmark');
      return;
    }
    const next = !isBookmarked;
    setIsBookmarked(next);
    setDiscussion(d => d ? ({ ...d, isBookmarked: next }) : d);
    desiredBookmarkRef.current = next;
    if (bookmarkDebounceRef.current) clearTimeout(bookmarkDebounceRef.current);
    bookmarkDebounceRef.current = setTimeout(flushBookmarkToggle, 350);
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like');
      return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const wasLiked = likedComments.has(commentId);

    // Optimistic update
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (wasLiked) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
    
    setComments(comments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          isLiked: !wasLiked,
          likes_count: wasLiked ? c.likes_count - 1 : c.likes_count + 1,
        };
      }
      return c;
    }));

    try {
      if (wasLiked) {
        await supabase
          .from('forum_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('forum_comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      // Revert on error
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: wasLiked,
            likes_count: wasLiked ? c.likes_count + 1 : c.likes_count - 1,
          };
        }
        return c;
      }));
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const validated: any[] = [];
        for (const asset of result.assets) {
          const name = asset.uri.split('/').pop() || 'image.jpg';
          const ok = await validatePickedFile(asset.uri, name, 'image');
          if (ok) validated.push({ type: 'image', uri: asset.uri, name });
        }
        if (validated.length > 0) setSelectedAttachments([...selectedAttachments, ...validated]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled) {
        const validated: any[] = [];
        for (const asset of result.assets) {
          const name = asset.name || asset.uri.split('/').pop() || 'document.pdf';
          const ok = await validatePickedFile(asset.uri, name, 'document');
          if (ok) validated.push({ type: 'document', uri: asset.uri, name });
        }
        if (validated.length > 0) setSelectedAttachments([...selectedAttachments, ...validated]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(selectedAttachments.filter((_, i) => i !== index));
  };

  const getMimeType = (name: string, kind: 'image' | 'document') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (kind === 'image') {
      if (ext === 'png') return 'image/png';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'gif') return 'image/gif';
      return 'image/jpeg';
    }
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'doc') return 'application/msword';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/octet-stream';
  };

  const uploadFile = async (uri: string, fileType: 'image' | 'document', fileName: string) => {
    try {
      const fileExt = fileName.split('.').pop();
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const filePath = `${user!.id}/${uniqueSuffix}.${fileExt}`;
      const contentType = getMimeType(fileName, fileType);

      let arrayBuffer: ArrayBuffer | null = null;
      // Primary path: fetch -> blob -> arrayBuffer (avoids base64 inflation)
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        arrayBuffer = await blob.arrayBuffer();
      } catch (e) {
        console.warn('fetch/blob arrayBuffer path failed, falling back to base64', e);
      }

      if (!arrayBuffer) {
        // Fallback: legacy base64 decode
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        arrayBuffer = decode(base64);
      }

      const { error } = await supabase.storage
        .from('forum-attachments')
        .upload(filePath, arrayBuffer, { contentType, upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('forum-attachments')
        .getPublicUrl(filePath);

      return { url: publicUrl, name: fileName, type: contentType };
    } catch (error) {
      console.error('Error uploading file (comment attachment):', error);
      throw error;
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() && selectedAttachments.length === 0) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    try {
      setUploading(true);

      // Insert comment
      const { data: commentData, error: commentError } = await supabase
        .from('forum_comments')
        .insert({
          discussion_id: id,
          author_id: user.id,
          content: newComment,
          ...(replyTo ? { parent_comment_id: replyTo.id } : {}),
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Upload attachments if any
      if (selectedAttachments.length > 0) {
        const successes: {url:string;name:string;type:string}[] = [];
        const failures: {uri:string;name:string;type:'image'|'document'}[] = [];
        for (const att of selectedAttachments) {
          try {
            const res = await uploadFile(att.uri, att.type, att.name);
            successes.push(res);
          } catch (e) {
            failures.push(att);
          }
        }

        if (successes.length > 0) {
          const attachmentRecords = successes.map(att => ({
            comment_id: commentData.id,
            file_url: att.url,
            file_name: att.name,
            file_type: att.type,
          }));
          await supabase.from('forum_attachments').insert(attachmentRecords);
        }

        if (failures.length > 0) {
          Alert.alert(
            'Some uploads failed',
            `${failures.length} attachment(s) failed to upload. Retry now?`,
            [
              { text: 'Cancel' },
              { text: 'Retry', onPress: async () => {
                  try {
                    setUploading(true);
                    const retried: any[] = [];
                    for (const f of failures) {
                      const res = await uploadFile(f.uri, f.type, f.name);
                      retried.push(res);
                    }
                    if (retried.length > 0) {
                      const retryRecords = retried.map(att => ({
                        comment_id: commentData.id,
                        file_url: att.url,
                        file_name: att.name,
                        file_type: att.type,
                      }));
                      await supabase.from('forum_attachments').insert(retryRecords);
                  loadComments({ append: false });
                    }
                  } catch (e) {
                    Alert.alert('Retry failed', 'Unable to upload some attachments.');
                  } finally {
                    setUploading(false);
                  }
                } }
            ]
          );
        }
      }

    setNewComment('');
    setSelectedAttachments([]);
    setReplyTo(null);
  // Reload from first page to include new comment at end
  setCommentPage(0);
  setHasMore(true);
  loadComments({ append: false });

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setUploading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleShare = async () => {
    try {
      if (!discussion) return;
      const firstImage = (discussion.forum_attachments || []).find(att => (att.file_type === 'image' || att.file_type?.startsWith('image/')));
      const snippet = discussion.content?.slice(0, 180) || '';
      const ellipsis = discussion.content && discussion.content.length > 180 ? '…' : '';
      const deepLink = LinkingExpo.createURL(`/forum/${id}`);
      const baseMessage = `${discussion.title}\n\n${snippet}${ellipsis}`.trim();

      Alert.alert(
        'Share discussion',
        'Choose how you want to share or copy the link.',
        [
          {
            text: 'Copy Link',
            onPress: async () => {
              try {
                await Clipboard.setStringAsync(deepLink);
                Alert.alert('Copied', 'Link copied to clipboard');
              } catch {}
            }
          },
            {
              text: 'Share',
              onPress: async () => {
                try {
                  const message = `${baseMessage}\n\n${deepLink}${firstImage?.file_url ? `\n${firstImage.file_url}` : ''}`.trim();
                  await Share.share({ message, url: deepLink });
                } catch {}
              }
            },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to open share dialog');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading discussion...</Text>
      </View>
    );
  }

  if (!discussion) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Discussion not found</Text>
        <TouchableOpacity
          style={styles.backToForumButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToForumText}>Back to Forum</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0 }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion</Text>
        <View style={styles.headerActionsRight}>
          <TouchableOpacity onPress={handleShare} style={styles.iconButton} accessibilityLabel="Share discussion">
            <Share2 size={20} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity onPress={queueBookmarkToggle} style={styles.iconButton} accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark discussion'}>
            <Bookmark size={20} color={isBookmarked ? '#4169E1' : '#111827'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4169E1"]}
            tintColor="#4169E1"
          />
        }
      >
        {/* Original Post */}
        <View style={styles.originalPost}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              accessibilityLabel={`View ${discussion.profiles?.full_name || 'user'} profile`}
              onPress={() => discussion.profiles?.id && router.push({ pathname: '/user-profile/[id]', params: { id: discussion.profiles.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image source={{ uri: discussion.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.authorAvatar} />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{discussion.profiles?.full_name || 'Anonymous'}</Text>
                <Text style={styles.authorRole}>@{discussion.profiles?.username || 'user'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.categoryTag}>
              <Hash size={12} color="#4169E1" />
              <Text style={styles.categoryText}>{discussion.category}</Text>
            </View>
          </View>

          <Text style={styles.discussionTitle}>{discussion.title}</Text>
          <Text style={styles.discussionContent}>{discussion.content}</Text>

          {/* Discussion-level attachments */}
          {discussion.forum_attachments && discussion.forum_attachments.length > 0 && (
            <View style={styles.discussionAttachmentsSection}>
              {discussion.forum_attachments.map(att => (
                <View key={att.id} style={styles.discussionAttachmentItem}>
                  {isImageType(att.file_type) ? (
                    <TouchableOpacity
                      onPress={() => openImageViewerFromDiscussion(att.id)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Open image attachment ${att.file_name} in viewer`}
                      accessible
                    >
                      <AttachmentImage uri={att.file_url} style={styles.discussionAttachmentImage} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openDocument(att.file_url)}
                      activeOpacity={0.8}
                      accessibilityLabel={`Open document attachment ${att.file_name}`}
                      accessible
                    >
                      <View style={styles.discussionAttachmentDocument}>
                        <View style={[styles.docBadge, { backgroundColor: badgeColorForExt(getExt(att.file_name)) }]}>
                          <Text style={styles.docBadgeText}>{getExt(att.file_name).toUpperCase()}</Text>
                        </View>
                        <FileText size={20} color="#4169E1" />
                        <Text style={styles.discussionAttachmentDocName} numberOfLines={1}>{att.file_name}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={queueLikeToggle}
              accessibilityLabel={isLiked ? 'Unlike discussion' : 'Like discussion'}
              accessible
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThumbsUp
                size={20}
                color={isLiked ? '#4169E1' : '#666666'}
                fill={isLiked ? '#4169E1' : 'none'}
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {discussion.likes_count || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              accessibilityLabel="View comments count"
              accessible
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MessageCircle size={20} color="#666666" />
              <Text style={styles.actionText}>{discussion.comments_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              accessibilityLabel="Share discussion"
              accessible
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Share2 size={20} color="#666666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={queueBookmarkToggle}
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark discussion'}
              accessible
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bookmark
                size={20}
                color={isBookmarked ? '#4169E1' : '#666666'}
                fill={isBookmarked ? '#4169E1' : 'none'}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.timeAgo}>{getTimeAgo(discussion.created_at)}</Text>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length}{hasMore ? '+' : ''})
          </Text>

          {comments.length === 0 && !loadingComments && (
            <View style={styles.endOfCommentsContainer}>
              <Text style={styles.endOfCommentsText}>No comments yet — be the first to share your thoughts.</Text>
            </View>
          )}
          {comments
            .filter(c => !c.parent_comment_id)
            .map((c, index, arr) => (
              <View key={c.id} style={index === arr.length - 1 ? styles.commentCardLast : undefined}>
                {renderCommentNode(c, 0)}
              </View>
            ))}
          {/* Load More */}
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={[styles.loadMoreButton, loadingMore && styles.loadMoreButtonDisabled]}
                onPress={loadMoreComments}
                disabled={loadingMore}
                accessibilityLabel={loadingMore ? 'Loading more comments' : 'Load more comments'}
                accessible
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#4169E1" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {!hasMore && comments.length > 0 && (
            <View style={styles.endOfCommentsContainer}>
              <Text style={styles.endOfCommentsText}>End of comments</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        {/* Selected Attachments Preview */}
          {replyTo && (
            <View style={styles.replyContextBar}>
              <Text style={styles.replyContextText}>Replying to {replyTo.profiles?.full_name || 'comment'}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)} accessibilityLabel="Cancel reply" hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Text style={styles.replyCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        {selectedAttachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.attachmentsPreview}
          >
            {selectedAttachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentPreview}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewDocument}>
                    <FileText size={20} color="#4169E1" />
                  </View>
                )}
                {uploading && (
                  <View style={styles.previewOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => removeAttachment(index)}
                >
                  <Text style={styles.removeAttachmentText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <ImageIcon size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
            <Paperclip size={24} color="#666666" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Add your thoughts..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={1000}
            ref={inputRef}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (newComment.trim() || selectedAttachments.length > 0) && styles.sendButtonActive,
            ]}
            onPress={handleSendComment}
            disabled={uploading || (!newComment.trim() && selectedAttachments.length === 0)}
          >
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerContent}>
            <Image
              source={{ uri: imageViewerImages[imageViewerIndex] }}
              style={styles.viewerImage}
            />
            <View style={styles.viewerControls}>
              <TouchableOpacity
                style={[styles.viewerNavButton, imageViewerIndex === 0 && styles.viewerNavButtonDisabled]}
                disabled={imageViewerIndex === 0}
                onPress={() => setImageViewerIndex(i => Math.max(0, i - 1))}
              >
                <Text style={styles.viewerNavText}>{'<'} Prev</Text>
              </TouchableOpacity>
              <Text style={styles.viewerCounter}>{imageViewerIndex + 1} / {imageViewerImages.length}</Text>
              <TouchableOpacity
                style={[styles.viewerNavButton, imageViewerIndex === imageViewerImages.length - 1 && styles.viewerNavButtonDisabled]}
                disabled={imageViewerIndex === imageViewerImages.length - 1}
                onPress={() => setImageViewerIndex(i => Math.min(imageViewerImages.length - 1, i + 1))}
              >
                <Text style={styles.viewerNavText}>Next {'>'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setImageViewerVisible(false)}>
              <Text style={styles.viewerCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  moreButton: {
    padding: 8,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  originalPost: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F8F9FA',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  authorRole: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4169E1',
  },
  discussionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    lineHeight: 28,
  },
  discussionContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#4169E1',
  },
  timeAgo: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  discussionAttachmentsSection: {
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
  discussionAttachmentItem: {
    marginBottom: 12,
  },
  discussionAttachmentImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  discussionAttachmentDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  discussionAttachmentDocName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  commentsSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  commentCard: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentCardLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  commentAuthorRole: {
    fontSize: 12,
    color: '#666666',
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
    marginLeft: 46,
  },
  attachmentsContainer: {
    marginLeft: 46,
    marginTop: 12,
    gap: 8,
  },
  attachmentItem: {
    marginBottom: 8,
  },
  imageAttachment: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: width - 110,
    height: 200,
    borderRadius: 8,
  },
  imageAttachmentWrapper: {
    width: width - 110,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imageSkeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  docBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  docBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  documentName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 46,
    marginTop: 8,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 46,
    marginTop: 8,
  },
  replyButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
  },
  replyButtonText: {
    color: '#4169E1',
    fontSize: 12,
    fontWeight: '600',
  },
  commentLikeText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  commentLikeTextActive: {
    color: '#4169E1',
  },
  replyCountBadge: {
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  replyCountText: {
    color: '#4169E1',
    fontSize: 11,
    fontWeight: '700',
  },
  repliesContainer: {
    marginTop: 4,
  },
  replyToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  replyToggleText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  attachmentsPreview: {
    maxHeight: 80,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  replyContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  replyContextText: {
    color: '#4169E1',
    fontWeight: '600',
  },
  replyCancelText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  attachmentPreview: {
    width: 60,
    height: 60,
    marginRight: 8,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  previewDocument: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#4169E1',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  backToForumButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4169E1',
    borderRadius: 8,
  },
  backToForumText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewerContent: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    marginBottom: 12,
  },
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  viewerNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  viewerNavButtonDisabled: {
    opacity: 0.3,
  },
  viewerNavText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerCounter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  viewerClose: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  viewerCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Pagination styles
  loadMoreContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EBF0FF',
    borderRadius: 8,
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    color: '#4169E1',
    fontWeight: '600',
  },
  endOfCommentsContainer: {
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  endOfCommentsText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  noCommentsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noCommentsText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
});
