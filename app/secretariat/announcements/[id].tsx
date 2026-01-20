import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Eye, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Share2,
  Download,
  FileText,
  AlertCircle,
  Send,
  Trash2,
  ThumbsUp,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Announcement {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  priority: string;
  image_url: string | null;
  images?: Array<{ url: string; caption?: string }>;
  attachments: any[];
  author_name: string;
  author_title: string;
  author_email: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  like_count: number;
  user_name?: string;
  user_email?: string;
  is_liked?: boolean;
}

export default function AnnouncementDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const announcementId = params.id as string;
  const { user } = useAuth();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Lock to prevent double-tap race conditions on likes
  const likingInProgressRef = useRef(false);

  useEffect(() => {
    if (announcementId && user?.id) {
      loadAnnouncement();
      loadComments();
      checkUserInteractions();
      incrementViewCount();
    }
  }, [announcementId, user?.id]);

  const loadAnnouncement = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('secretariat_announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

      if (error) throw error;

      if (data) {
        setAnnouncement(data);
      }
    } catch (error) {
      console.error('Error loading announcement:', error);
      Alert.alert('Error', 'Failed to load announcement');
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteractions = async () => {
    if (!user?.id) return;

    try {
      // Check if liked
      const { data: likeData } = await supabase
        .from('announcement_likes')
        .select('id')
        .eq('announcement_id', announcementId)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() to avoid 406 error

      setIsLiked(!!likeData);

      // Check if bookmarked/saved
      const { data: bookmarkData } = await supabase
        .from('saved_announcements')
        .select('id')
        .eq('announcement_id', announcementId)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() to avoid 406 error

      setIsBookmarked(!!bookmarkData);
    } catch (error) {
      console.log('Error checking interactions:', error);
    }
  };

  const incrementViewCount = async () => {
    if (!user?.id) return;

    try {
      await supabase.rpc('increment_announcement_view_count', {
        announcement_uuid: announcementId,
        viewer_user_id: user.id,
      });
    } catch (error) {
      console.log('Error incrementing view count:', error);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_comments')
        .select(`
          id,
          user_id,
          content,
          created_at,
          like_count
        `)
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user info and like status for each comment
      if (data) {
        const commentsWithUsers = await Promise.all(
          data.map(async (comment) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', comment.user_id)
              .single();

            // Check if current user liked this comment
            const { data: likeData } = await supabase
              .from('announcement_comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user?.id || '')
              .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error

            return {
              ...comment,
              comment: comment.content, // Map content to comment for compatibility
              like_count: comment.like_count || 0, // Ensure default value
              user_name: userData?.full_name || 'Anonymous User',
              user_email: userData?.email,
              is_liked: !!likeData,
            };
          })
        );
        setComments(commentsWithUsers);
      }
    } catch (error) {
      console.log('Error loading comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.id) return;

    try {
      setSubmittingComment(true);

      const { error } = await supabase
        .from('announcement_comments')
        .insert([
          {
            announcement_id: announcementId,
            user_id: user.id,
            content: newComment.trim(),
          },
        ]);

      if (error) throw error;

      setNewComment('');
      await loadComments();
      await loadAnnouncement(); // Refresh to update comment count
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, userId: string) => {
    console.log('Delete button clicked!', { commentId, userId, currentUserId: user?.id });
    
    if (userId !== user?.id) {
      if (Platform.OS === 'web') {
        window.alert('You can only delete your own comments');
      } else {
        Alert.alert('Error', 'You can only delete your own comments');
      }
      return;
    }

    // Use window.confirm for web, Alert.alert for mobile
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this comment?');
      if (!confirmed) return;

      try {
        console.log('Deleting comment...', commentId);
        const { error } = await supabase
          .from('announcement_comments')
          .delete()
          .eq('id', commentId)
          .eq('user_id', user?.id);

        if (error) {
          console.error('Error deleting comment:', error);
          window.alert(`Error: ${error.message}`);
          return;
        }

        console.log('Comment deleted successfully');
        await loadComments();
        await loadAnnouncement();
        window.alert('Comment deleted successfully');
      } catch (error: any) {
        console.error('Error deleting comment:', error);
        window.alert(`Error: ${error.message || 'Failed to delete comment'}`);
      }
    } else {
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
                console.log('Deleting comment...', commentId);
                const { error } = await supabase
                  .from('announcement_comments')
                  .delete()
                  .eq('id', commentId)
                  .eq('user_id', user?.id);

                if (error) {
                  console.error('Error deleting comment:', error);
                  throw error;
                }

                console.log('Comment deleted successfully');
                await loadComments();
                await loadAnnouncement();
                Alert.alert('Success', 'Comment deleted successfully');
              } catch (error: any) {
                console.error('Error deleting comment:', error);
                Alert.alert('Error', error.message || 'Failed to delete comment. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const handleToggleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to like comments');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('announcement_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error unliking comment:', error);
          throw error;
        }
      } else {
        // Like
        const { error } = await supabase
          .from('announcement_comment_likes')
          .insert([
            {
              comment_id: commentId,
              user_id: user.id,
            },
          ]);
        
        if (error) {
          console.error('Error liking comment:', error);
          throw error;
        }
      }

      // Refresh comments to update like count and status
      await loadComments();
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      Alert.alert('Error', error.message || 'Failed to update like. Please try again.');
    }
  };

  const toggleLike = async () => {
    if (!user?.id) return;

    // Prevent double-tap race condition (especially on Android)
    if (likingInProgressRef.current) {
      console.log('⏳ Like already in progress');
      return;
    }
    likingInProgressRef.current = true;

    const wasLiked = isLiked;

    // Optimistic update
    setIsLiked(!wasLiked);

    try {
      if (wasLiked) {
        await supabase
          .from('announcement_likes')
          .delete()
          .eq('announcement_id', announcementId)
          .eq('user_id', user.id);
      } else {
        // Use upsert to handle potential race conditions
        await supabase
          .from('announcement_likes')
          .upsert({
            announcement_id: announcementId,
            user_id: user.id,
          }, {
            onConflict: 'announcement_id,user_id',
            ignoreDuplicates: true
          });
      }
      
      // Verify actual state from database
      const { data: userLike } = await supabase
        .from('announcement_likes')
        .select('id')
        .eq('announcement_id', announcementId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsLiked(!!userLike);
      loadAnnouncement(); // Refresh to get updated like count
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(wasLiked);
    } finally {
      likingInProgressRef.current = false;
    }
  };

  const toggleBookmark = async () => {
    if (!user?.id) return;

    try {
      if (isBookmarked) {
        // Unsave announcement
        const { error } = await supabase
          .from('saved_announcements')
          .delete()
          .eq('announcement_id', announcementId)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsBookmarked(false);
        
        if (Platform.OS === 'web') {
          window.alert('Announcement removed from saved');
        } else {
          Alert.alert('Success', 'Announcement removed from saved');
        }
      } else {
        // Save announcement
        const { error } = await supabase
          .from('saved_announcements')
          .insert({
            announcement_id: announcementId,
            user_id: user.id,
          });

        if (error) throw error;

        setIsBookmarked(true);
        
        if (Platform.OS === 'web') {
          window.alert('Announcement saved successfully!');
        } else {
          Alert.alert('Success', 'Announcement saved successfully!');
        }
      }
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save announcement'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save announcement');
      }
    }
  };

  const handleShare = async () => {
    // Implement share functionality
    Alert.alert('Share', 'Share functionality coming soon');
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      if (attachment.url) {
        await Linking.openURL(attachment.url);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'normal':
        return '#10B981';
      case 'low':
        return '#6B7280';
      default:
        return '#10B981';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading announcement...</Text>
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Announcement Not Found</Text>
        <Text style={styles.errorText}>This announcement may have been removed or does not exist.</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            console.log('[Announcement Detail] Error page - going to Secretariat');
            debouncedRouter.push('/secretariat');
          }}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => {
              console.log('[Announcement Detail] Back button pressed - going to Secretariat');
              debouncedRouter.push('/secretariat');
            }} 
            style={styles.backBtn}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcement</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Share2 size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Featured Image or Image Gallery */}
        {announcement.images && announcement.images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            style={styles.imageGallery}
          >
            {announcement.images.map((img, index) => (
              <View key={index} style={styles.galleryImageContainer}>
                <Image
                  source={{ uri: img.url }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
                {img.caption && (
                  <View style={styles.imageCaptionContainer}>
                    <Text style={styles.imageCaptionText}>{img.caption}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : announcement.image_url ? (
          <Image
            source={{ uri: announcement.image_url }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Image Counter */}
        {announcement.images && announcement.images.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {announcement.images.length} images
            </Text>
          </View>
        )}

        {/* Priority Badge */}
        {announcement.priority !== 'normal' && (
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.priority) }]}>
            <AlertCircle size={16} color="#FFFFFF" />
            <Text style={styles.priorityText}>{announcement.priority.toUpperCase()}</Text>
          </View>
        )}

        {/* Category */}
        <View style={styles.categoryContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{announcement.category}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{announcement.title}</Text>

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.metaText}>{formatDate(announcement.published_at || announcement.created_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <User size={16} color="#666" />
            <Text style={styles.metaText}>{announcement.author_name}</Text>
          </View>
        </View>

        {announcement.author_title && (
          <Text style={styles.authorTitle}>{announcement.author_title}</Text>
        )}

        {/* Summary */}
        {announcement.summary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summary}>{announcement.summary}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{announcement.content}</Text>
        </View>

        {/* Attachments */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsTitle}>Attachments</Text>
            {announcement.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={index}
                style={styles.attachmentCard}
                onPress={() => handleDownloadAttachment(attachment)}
              >
                <View style={styles.attachmentIcon}>
                  <FileText size={24} color="#4169E1" />
                </View>
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName}>{attachment.name}</Text>
                  {attachment.size && (
                    <Text style={styles.attachmentSize}>{attachment.size}</Text>
                  )}
                </View>
                <Download size={20} color="#4169E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Eye size={18} color="#666" />
            <Text style={styles.statText}>{announcement.view_count || 0} views</Text>
          </View>
          <View style={styles.statItem}>
            <ThumbsUp size={18} color={isLiked ? '#14B8A6' : '#666'} fill={isLiked ? '#14B8A6' : 'none'} />
            <Text style={styles.statText}>{announcement.like_count || 0} likes</Text>
          </View>
          <View style={styles.statItem}>
            <MessagesSquare size={18} color="#666" />
            <Text style={styles.statText}>{announcement.comment_count || 0} comments</Text>
          </View>
        </View>

        {/* Contact Author */}
        {announcement.author_email && (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Linking.openURL(`mailto:${announcement.author_email}`)}
          >
            <Text style={styles.contactButtonText}>Contact Author</Text>
          </TouchableOpacity>
        )}

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsSectionTitle}>
            Comments ({announcement.comment_count || 0})
          </Text>

          {/* Comments List */}
          {comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <User size={16} color="#4169E1" />
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{comment.user_name}</Text>
                      <Text style={styles.commentDate}>
                        {formatDate(comment.created_at)}
                      </Text>
                    </View>
                    {comment.user_id === user?.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id, comment.user_id)}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.comment}</Text>
                  
                  {/* Comment Actions */}
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.commentLikeButton}
                      onPress={() => handleToggleCommentLike(comment.id, comment.is_liked || false)}
                    >
                      <ThumbsUp 
                        size={16} 
                        color={comment.is_liked ? '#4169E1' : '#999'}
                        fill={comment.is_liked ? '#4169E1' : 'none'}
                      />
                      <Text style={[
                        styles.commentLikeText,
                        comment.is_liked && styles.commentLikeTextActive
                      ]}>
                        {comment.like_count > 0 ? comment.like_count : 'Like'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
          )}
        </View>

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Comment Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#999"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newComment.trim() || submittingComment) && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Share2 size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, isLiked && styles.actionButtonActive]}
          onPress={toggleLike}
        >
          <ThumbsUp size={24} color={isLiked ? '#FFFFFF' : '#4169E1'} fill={isLiked ? '#FFFFFF' : 'none'} />
          <Text style={[styles.actionButtonText, isLiked && styles.actionButtonTextActive]}>
            {isLiked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isBookmarked && styles.actionButtonActive]}
          onPress={toggleBookmark}
        >
          <Star size={24} color={isBookmarked ? '#FFFFFF' : '#4169E1'} fill={isBookmarked ? '#FFFFFF' : 'none'} />
          <Text style={[styles.actionButtonText, isBookmarked && styles.actionButtonTextActive]}>
            {isBookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
        >
          <Share2 size={24} color="#4169E1" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  featuredImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E7EB',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    margin: 16,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 36,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  authorTitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryContainer: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  summary: {
    fontSize: 16,
    color: '#92400E',
    lineHeight: 24,
    fontWeight: '500',
  },
  contentContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  contentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  attachmentsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  attachmentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EBF0FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EBF0FF',
  },
  actionButtonActive: {
    backgroundColor: '#4169E1',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
  commentsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  commentsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  commentsList: {
    gap: 12,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  commentLikeText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  commentLikeTextActive: {
    color: '#4169E1',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  commentInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  imageGallery: {
    height: 300,
  },
  galleryImageContainer: {
    width: 375, // Approximate screen width, adjust as needed
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: 300,
  },
  imageCaptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  imageCaptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  imageCounter: {
    position: 'absolute',
    top: 270,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

