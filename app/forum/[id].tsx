import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ThumbsUp, MessageCircle, Share2, Bookmark, Send, Paperclip, Image as ImageIcon, FileText, MoreVertical, Hash } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const { width } = Dimensions.get('window');

// Sample discussion data - in production this would come from your database
const DISCUSSION_DATA = {
  id: '1',
  title: 'Emerging Markets Investment Strategies',
  author: {
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
    role: 'Investment Analyst',
  },
  content: `Looking at the current trends in emerging markets, particularly in Southeast Asia, I've noticed some interesting patterns that I'd like to discuss with the community.

The rapid digitalization and growing middle class in these regions present unique opportunities for investors. However, currency volatility and regulatory uncertainties remain significant challenges.

What are your thoughts on balancing risk and reward in these markets? Has anyone had experience investing in companies in Vietnam, Indonesia, or the Philippines?

I'm particularly interested in:
• Fintech and digital payment platforms
• E-commerce infrastructure
• Renewable energy projects
• Healthcare technology

Would love to hear your perspectives and experiences!`,
  category: 'Finance',
  timeAgo: '1 hour ago',
  likes: 56,
  isLiked: false,
  isBookmarked: false,
  commentCount: 23,
};

interface Comment {
  id: string;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  forum_attachments?: {
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
  }[];
  isLiked?: boolean;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

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

  useEffect(() => {
    if (id) {
      loadDiscussion();
      loadComments();
      incrementViewCount();
    }
  }, [id]);

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
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedDiscussion = {
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
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
      }

      setDiscussion(formattedDiscussion);
    } catch (error) {
      console.error('Error loading discussion:', error);
      Alert.alert('Error', 'Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
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
        .eq('discussion_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = await Promise.all(
        (data || []).map(async (comment: any) => {
          const formatted = {
            ...comment,
            profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
          };

          // Check if user liked this comment
          if (user) {
            const { data: likeData } = await supabase
              .from('forum_comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .maybeSingle();

            formatted.isLiked = !!likeData;
            
            // Track liked comment IDs
            if (likeData) {
              setLikedComments(prev => new Set([...prev, comment.id]));
            }
          }

          return formatted;
        })
      );

      setComments(formattedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_discussion_views', { discussion_id: id });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !discussion) {
      Alert.alert('Error', 'You must be logged in to like');
      return;
    }

    const wasLiked = isLiked;

    // Optimistic update
    setIsLiked(!wasLiked);
    setDiscussion({
      ...discussion,
      isLiked: !wasLiked,
      likes_count: wasLiked ? discussion.likes_count - 1 : discussion.likes_count + 1,
    });

    try {
      if (wasLiked) {
        await supabase
          .from('forum_discussion_likes')
          .delete()
          .eq('discussion_id', id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('forum_discussion_likes')
          .insert({ discussion_id: id as string, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(wasLiked);
      setDiscussion({
        ...discussion,
        isLiked: wasLiked,
        likes_count: wasLiked ? discussion.likes_count + 1 : discussion.likes_count - 1,
      });
    }
  };

  const handleBookmark = async () => {
    if (!user || !discussion) {
      Alert.alert('Error', 'You must be logged in to bookmark');
      return;
    }

    const wasBookmarked = isBookmarked;

    // Optimistic update
    setIsBookmarked(!wasBookmarked);
    setDiscussion({
      ...discussion,
      isBookmarked: !wasBookmarked,
    });

    try {
      if (wasBookmarked) {
        await supabase
          .from('forum_discussion_bookmarks')
          .delete()
          .eq('discussion_id', id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('forum_discussion_bookmarks')
          .insert({ discussion_id: id as string, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Revert on error
      setIsBookmarked(wasBookmarked);
      setDiscussion({
        ...discussion,
        isBookmarked: wasBookmarked,
      });
    }
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
        const newAttachments = result.assets.map(asset => ({
          type: 'image',
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'image.jpg',
        }));
        setSelectedAttachments([...selectedAttachments, ...newAttachments]);
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
        const newAttachments = result.assets.map(asset => ({
          type: 'document',
          uri: asset.uri,
          name: asset.name,
        }));
        setSelectedAttachments([...selectedAttachments, ...newAttachments]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(selectedAttachments.filter((_, i) => i !== index));
  };

  const uploadFile = async (uri: string, fileType: 'image' | 'document', fileName: string) => {
    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('forum-attachments')
        .upload(filePath, decode(base64), {
          contentType: fileType === 'image' ? `image/${fileExt}` : 'application/octet-stream',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('forum-attachments')
        .getPublicUrl(filePath);

      return { url: publicUrl, name: fileName, type: fileType };
    } catch (error) {
      console.error('Error uploading file:', error);
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
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Upload attachments if any
      if (selectedAttachments.length > 0) {
        const uploadedAttachments = await Promise.all(
          selectedAttachments.map(att => uploadFile(att.uri, att.type, att.name))
        );

        // Insert attachment records
        const attachmentRecords = uploadedAttachments.map(att => ({
          comment_id: commentData.id,
          file_url: att.url,
          file_name: att.name,
          file_type: att.type,
        }));

        await supabase.from('forum_attachments').insert(attachmentRecords);
      }

      setNewComment('');
      setSelectedAttachments([]);
      loadComments(); // Reload comments

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

  const handleShare = () => {
    Alert.alert('Share Discussion', 'Share functionality will be implemented here');
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Original Post */}
        <View style={styles.originalPost}>
          <View style={styles.postHeader}>
            <Image source={{ uri: discussion.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.authorAvatar} />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{discussion.profiles?.full_name || 'Anonymous'}</Text>
              <Text style={styles.authorRole}>@{discussion.profiles?.username || 'user'}</Text>
            </View>
            <View style={styles.categoryTag}>
              <Hash size={12} color="#4169E1" />
              <Text style={styles.categoryText}>{discussion.category}</Text>
            </View>
          </View>

          <Text style={styles.discussionTitle}>{discussion.title}</Text>
          <Text style={styles.discussionContent}>{discussion.content}</Text>

          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
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

            <TouchableOpacity style={styles.actionButton}>
              <MessageCircle size={20} color="#666666" />
              <Text style={styles.actionText}>{discussion.comments_count || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={20} color="#666666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleBookmark}
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
            Comments ({comments.length})
          </Text>

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Image source={{ uri: comment.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.commentAvatar} />
                <View style={styles.commentAuthorInfo}>
                  <Text style={styles.commentAuthorName}>{comment.profiles?.full_name || 'Anonymous'}</Text>
                  <Text style={styles.commentAuthorRole}>Member</Text>
                </View>
                <Text style={styles.commentTime}>{getTimeAgo(comment.created_at)}</Text>
              </View>

              <Text style={styles.commentContent}>{comment.content}</Text>

              {/* Attachments */}
              {comment.forum_attachments && comment.forum_attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {comment.forum_attachments.map((attachment, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      {attachment.file_type?.startsWith('image/') ? (
                        <View style={styles.imageAttachment}>
                          <Image source={{ uri: attachment.file_url }} style={styles.attachmentImage} />
                        </View>
                      ) : (
                        <View style={styles.documentAttachment}>
                          <FileText size={20} color="#4169E1" />
                          <Text style={styles.documentName} numberOfLines={1}>
                            {attachment.file_name}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.commentLikeButton}
                onPress={() => handleCommentLike(comment.id)}
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
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        {/* Selected Attachments Preview */}
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
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (newComment.trim() || selectedAttachments.length > 0) && styles.sendButtonActive,
            ]}
            onPress={handleSendComment}
            disabled={!newComment.trim() && selectedAttachments.length === 0}
          >
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
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
    fontWeight: '600',
    color: '#000000',
  },
  moreButton: {
    padding: 8,
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
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
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
  commentLikeText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  commentLikeTextActive: {
    color: '#4169E1',
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
});
