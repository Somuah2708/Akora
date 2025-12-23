import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { ArrowLeft, ThumbsUp, MoreVertical, Send, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Image } from 'react-native';
import ExpandableText from '@/components/ExpandableText';

SplashScreen.preventAutoHideAsync();

interface CommentUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_admin?: boolean;
  role?: string;
}

interface CircleComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string | null;
  like_count: number;
  isLikedByUser: boolean;
  created_at: string;
  updated_at?: string;
  user: CommentUser;
  replies: CircleComment[];
  reply_count: number;
}

export default function CircleCommentsScreen() {
  const router = useRouter();
  const { user: authUser, profile: userProfile } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comments, setComments] = useState<CircleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState<string | null>(null);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const fetchComments = useCallback(async () => {
    if (!postId || !authUser) return;
    
    try {
      setLoading(true);
      
      // Fetch all comments for this post (both parent and replies)
      const { data: allComments, error } = await supabase
        .from('circle_post_comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_comment_id,
          like_count,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_admin,
            role
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user's likes for all comments
      const allCommentIds = allComments?.map(c => c.id) || [];
      let likedCommentIds = new Set<string>();
      
      if (allCommentIds.length > 0) {
        const { data: likesData } = await supabase
          .from('circle_post_comment_likes')
          .select('comment_id')
          .eq('user_id', authUser.id)
          .in('comment_id', allCommentIds);

        likedCommentIds = new Set(likesData?.map(like => like.comment_id) || []);
      }

      // Separate parent comments and replies
      const parentComments: CircleComment[] = [];
      const repliesMap = new Map<string, CircleComment[]>();

      (allComments || []).forEach(comment => {
        const profileData = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        
        const formattedComment: CircleComment = {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          parent_comment_id: comment.parent_comment_id,
          like_count: comment.like_count || 0,
          isLikedByUser: likedCommentIds.has(comment.id),
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user: {
            id: profileData?.id || comment.user_id,
            full_name: profileData?.full_name || 'Unknown',
            username: profileData?.username || 'unknown',
            avatar_url: profileData?.avatar_url,
            is_admin: profileData?.is_admin,
            role: profileData?.role,
          },
          replies: [],
          reply_count: 0,
        };

        if (!comment.parent_comment_id) {
          parentComments.push(formattedComment);
        } else {
          if (!repliesMap.has(comment.parent_comment_id)) {
            repliesMap.set(comment.parent_comment_id, []);
          }
          repliesMap.get(comment.parent_comment_id)!.push(formattedComment);
        }
      });

      // Attach replies to their parent comments
      parentComments.forEach(parent => {
        const replies = repliesMap.get(parent.id) || [];
        parent.replies = replies;
        parent.reply_count = replies.length;
      });

      // Sort parent comments by newest first
      parentComments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setComments(parentComments);
      setLikedComments(likedCommentIds);
      
      console.log('✅ Loaded', parentComments.length, 'circle comments with', repliesMap.size, 'reply threads');
    } catch (error) {
      console.error('Error fetching circle comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId, authUser]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !authUser || !postId) return;

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('circle_post_comments')
        .insert({
          post_id: postId,
          user_id: authUser.id,
          content: commentText.trim(),
          parent_comment_id: replyingTo,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Circle comment added:', replyingTo ? 'Reply' : 'Comment', data.id);

      // Clear input and reply state
      setCommentText('');
      setReplyingTo(null);
      
      // Refetch all comments
      await fetchComments();
    } catch (error: any) {
      console.error('Error adding circle comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('circle_post_comments')
                .delete()
                .eq('id', commentId);

              if (error) throw error;
              
              setShowOptions(null);
              await fetchComments();
            } catch (error: any) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const handleLikeComment = async (commentId: string) => {
    if (!authUser) return;

    const isLiked = likedComments.has(commentId);
    
    // Optimistic update
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });

    // Update comment like count optimistically
    setComments(prevComments =>
      prevComments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            like_count: isLiked ? Math.max(0, comment.like_count - 1) : comment.like_count + 1,
            isLikedByUser: !isLiked,
          };
        }
        if (comment.replies) {
          const updatedReplies = comment.replies.map(reply =>
            reply.id === commentId
              ? {
                  ...reply,
                  like_count: isLiked ? Math.max(0, reply.like_count - 1) : reply.like_count + 1,
                  isLikedByUser: !isLiked,
                }
              : reply
          );
          return { ...comment, replies: updatedReplies };
        }
        return comment;
      })
    );

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('circle_post_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', authUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('circle_post_comment_likes')
          .insert({
            comment_id: commentId,
            user_id: authUser.id,
          });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      
      // Revert optimistic update on error
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(commentId);
        } else {
          newSet.delete(commentId);
        }
        return newSet;
      });

      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              like_count: isLiked ? comment.like_count + 1 : Math.max(0, comment.like_count - 1),
              isLikedByUser: isLiked,
            };
          }
          if (comment.replies) {
            const revertedReplies = comment.replies.map(reply =>
              reply.id === commentId
                ? {
                    ...reply,
                    like_count: isLiked ? reply.like_count + 1 : Math.max(0, reply.like_count - 1),
                    isLikedByUser: isLiked,
                  }
                : reply
            );
            return { ...comment, replies: revertedReplies };
          }
          return comment;
        })
      );
    }
  };

  const handleReplyComment = (comment: CircleComment) => {
    setReplyingTo(comment.id);
    setCommentText(`@${comment.user.full_name} `);
    setShowOptions(null);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              debouncedRouter.back();
            } else {
              debouncedRouter.push('/(tabs)');
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Comments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.commentsContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffc857" />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
          </View>
        ) : (
          comments.map((comment) => (
            <View key={comment.id}>
              {/* Parent Comment */}
              <View style={styles.commentCard}>
                <TouchableOpacity
                  onPress={() => debouncedRouter.push(`/user-profile/${comment.user_id}`)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ 
                      uri: comment.user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.user.full_name || 'User') + '&background=6366F1&color=fff'
                    }}
                    style={styles.commentAvatar}
                  />
                </TouchableOpacity>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <TouchableOpacity
                      onPress={() => debouncedRouter.push(`/user-profile/${comment.user_id}`)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={styles.commentUsername}>{comment.user.full_name}</Text>
                      {(comment.user.is_admin || comment.user.role === 'admin') && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedCheck}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.commentTime}>{getTimeAgo(comment.created_at)}</Text>
                  </View>
                  <ExpandableText
                    text={comment.content}
                    numberOfLines={3}
                    captionStyle={styles.commentText}
                  />
                  <View style={styles.commentActions}>
                    <TouchableOpacity 
                      style={styles.commentAction}
                      onPress={() => handleLikeComment(comment.id)}
                    >
                      <ThumbsUp 
                        size={14} 
                        color={comment.isLikedByUser ? "#ffc857" : "#64748B"}
                        fill={comment.isLikedByUser ? "#ffc857" : "none"}
                        strokeWidth={2} 
                      />
                      <Text style={[
                        styles.commentActionText,
                        comment.isLikedByUser && styles.commentActionTextLiked
                      ]}>
                        {comment.like_count > 0 
                          ? `${comment.like_count} ${comment.like_count === 1 ? 'Like' : 'Likes'}`
                          : 'Like'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.commentAction}
                      onPress={() => handleReplyComment(comment)}
                    >
                      <Text style={styles.commentActionText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {comment.user_id === authUser?.id && (
                  <TouchableOpacity 
                    style={styles.commentMoreButton}
                    onPress={() => setShowOptions(showOptions === comment.id ? null : comment.id)}
                  >
                    <MoreVertical size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
                {showOptions === comment.id && (
                  <View style={styles.optionsMenu}>
                    <TouchableOpacity 
                      style={styles.optionItem}
                      onPress={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={styles.optionTextDanger}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                  {comment.replies.map((reply) => (
                    <View key={reply.id} style={styles.replyCard}>
                      <TouchableOpacity
                        onPress={() => debouncedRouter.push(`/user-profile/${reply.user_id}`)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{ 
                            uri: reply.user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reply.user.full_name || 'User') + '&background=6366F1&color=fff'
                          }}
                          style={styles.replyAvatar}
                        />
                      </TouchableOpacity>
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <TouchableOpacity
                            onPress={() => debouncedRouter.push(`/user-profile/${reply.user_id}`)}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Text style={styles.commentUsername}>{reply.user.full_name}</Text>
                            {(reply.user.is_admin || reply.user.role === 'admin') && (
                              <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedCheck}>✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          <Text style={styles.commentTime}>{getTimeAgo(reply.created_at)}</Text>
                        </View>
                        <ExpandableText
                          text={reply.content}
                          numberOfLines={3}
                          captionStyle={styles.commentText}
                        />
                        <View style={styles.commentActions}>
                          <TouchableOpacity 
                            style={styles.commentAction}
                            onPress={() => handleLikeComment(reply.id)}
                          >
                            <ThumbsUp 
                              size={14} 
                              color={reply.isLikedByUser ? "#ffc857" : "#64748B"}
                              fill={reply.isLikedByUser ? "#ffc857" : "none"}
                              strokeWidth={2} 
                            />
                            <Text style={[
                              styles.commentActionText,
                              reply.isLikedByUser && styles.commentActionTextLiked
                            ]}>
                              {reply.like_count > 0 
                                ? `${reply.like_count} ${reply.like_count === 1 ? 'Like' : 'Likes'}`
                                : 'Like'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.commentAction}
                            onPress={() => handleReplyComment(comment)}
                          >
                            <Text style={styles.commentActionText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {reply.user_id === authUser?.id && (
                        <TouchableOpacity 
                          style={styles.commentMoreButton}
                          onPress={() => setShowOptions(showOptions === reply.id ? null : reply.id)}
                        >
                          <MoreVertical size={16} color="#64748B" />
                        </TouchableOpacity>
                      )}
                      {showOptions === reply.id && (
                        <View style={styles.optionsMenu}>
                          <TouchableOpacity 
                            style={styles.optionItem}
                            onPress={() => handleDeleteComment(reply.id)}
                          >
                            <Trash2 size={16} color="#EF4444" />
                            <Text style={styles.optionTextDanger}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {authUser && (
        <View style={styles.inputContainer}>
          {replyingTo && (
            <View style={styles.replyingIndicator}>
              <Text style={styles.replyingText}>
                Replying to comment
              </Text>
              <TouchableOpacity onPress={() => {
                setReplyingTo(null);
                setCommentText('');
              }}>
                <Text style={styles.cancelReply}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <Image
              source={{ 
                uri: (userProfile as any)?.avatar_url || (userProfile as any)?.profile_photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent((userProfile as any)?.full_name || 'User') + '&background=6366F1&color=fff'
              }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.input}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              placeholderTextColor="#94A3B8"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled
              ]}
              onPress={handleAddComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    zIndex: 100,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  commentCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  commentActionTextLiked: {
    color: '#ffc857',
  },
  commentMoreButton: {
    padding: 4,
  },
  optionsMenu: {
    position: 'absolute',
    right: 16,
    top: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionTextDanger: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  repliesContainer: {
    paddingLeft: 52,
    backgroundColor: '#F8FAFC',
  },
  replyCard: {
    flexDirection: 'row',
    padding: 16,
    paddingLeft: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  replyingIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  cancelReply: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffc857',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  verifiedBadge: {
    backgroundColor: '#000000',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});
