import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Heart, MoreVertical } from 'lucide-react-native';
import { supabase, type PostComment, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Image } from 'react-native';
import ExpandableText from '@/components/ExpandableText';

SplashScreen.preventAutoHideAsync();

interface CommentWithUser extends PostComment {
  user: Profile;
}

export default function PostCommentsScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
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
    if (!postId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_comment_id,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null) // Only top-level comments for now
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = data.map(comment => ({
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        content: comment.content,
        parent_comment_id: comment.parent_comment_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
      })) as CommentWithUser[];

      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
      }
    };
    
    fetchUserProfile();
  }, [authUser]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !authUser || !postId || !userProfile) return;

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: authUser.id,
          content: commentText.trim(),
          parent_comment_id: replyingTo, // Set parent if replying
        })
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_comment_id,
          created_at,
          updated_at
        `)
        .single();

      if (error) throw error;

      // Add the new comment to the list with user info
      const newComment: CommentWithUser = {
        ...data,
        user: userProfile,
      };

      setComments([newComment, ...comments]);
      setCommentText('');
      setReplyingTo(null); // Clear reply state
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    console.log('Like comment:', commentId);
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
    // TODO: Add actual like functionality with Supabase
    // For now, just toggle in local state
  };

  const handleReplyComment = (comment: CommentWithUser) => {
    console.log('Reply to comment:', comment.id);
    setReplyingTo(comment.id);
    setCommentText(`${comment.user.full_name ?? ''} `);
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
            console.log('Back button pressed');
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)');
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
            <ActivityIndicator size="large" color="#475569" />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
          </View>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Image
                source={{ 
                  uri: comment.user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.user.full_name || 'User') + '&background=random'
                }}
                style={styles.commentAvatar}
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{comment.user.full_name}</Text>
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
                    <Heart 
                      size={14} 
                      color={likedComments.has(comment.id) ? "#EF4444" : "#64748B"}
                      fill={likedComments.has(comment.id) ? "#EF4444" : "none"}
                      strokeWidth={2} 
                    />
                    <Text style={[
                      styles.commentActionText,
                      likedComments.has(comment.id) && styles.commentActionTextLiked
                    ]}>
                      {likedComments.has(comment.id) ? 'Liked' : 'Like'}
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
                <TouchableOpacity style={styles.commentMoreButton}>
                  <MoreVertical size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {authUser && userProfile && (
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
                uri: userProfile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userProfile.full_name || 'User') + '&background=random'
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
  commentMoreButton: {
    padding: 4,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  commentActionTextLiked: {
    color: '#EF4444',
    fontWeight: '600',
  },
});
