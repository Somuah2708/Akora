import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, ThumbsUp, MessagesSquare, Star, Share2 } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import ExpandableText from '@/components/ExpandableText';

const { width } = Dimensions.get('window');

type PostDetail = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
  video_urls?: string[] | null;
  youtube_url?: string | null;
  youtube_urls?: string[] | null;
  media_items?: Array<{ type: 'image' | 'video'; url: string }> | null;
  created_at: string;
  user?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    is_admin?: boolean;
  } | null;
  likes_count?: number;
  comments_count?: number;
};

export default function PostDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            user:profiles(*)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        
        // Get accurate counts
        const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
          supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
          supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', id),
        ]);
        
        const userRow = Array.isArray((data as any).user) ? (data as any).user[0] : (data as any).user;
        const pd: PostDetail = {
          id: data.id,
          user_id: data.user_id,
          content: data.content,
          image_url: data.image_url,
          image_urls: data.image_urls,
          video_url: data.video_url,
          video_urls: data.video_urls,
          youtube_url: data.youtube_url,
          youtube_urls: data.youtube_urls,
          media_items: data.media_items,
          created_at: data.created_at,
          user: userRow ? { id: userRow.id, full_name: userRow.full_name, avatar_url: userRow.avatar_url, is_admin: userRow.is_admin } : null,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        };
        setPost(pd);

        if (user?.id) {
          const [{ data: like }, { data: bm }] = await Promise.all([
            supabase.from('post_likes').select('id').eq('post_id', String(id)).eq('user_id', user.id).maybeSingle(),
            supabase.from('post_bookmarks').select('id').eq('post_id', String(id)).eq('user_id', user.id).maybeSingle(),
          ]);
          setIsLiked(!!like);
          setIsBookmarked(!!bm);
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user?.id]);

  const toggleLike = async () => {
    if (!user?.id || !post) return;
    const next = !isLiked;
    setIsLiked(next);
    setPost(prev => prev ? { ...prev, likes_count: (prev.likes_count || 0) + (next ? 1 : -1) } : prev);
    try {
      if (next) {
        const { error } = await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        if (error) throw error;
      }
    } catch (e) {
      setIsLiked(!next);
      setPost(prev => prev ? { ...prev, likes_count: (prev.likes_count || 0) + (next ? -1 : 1) } : prev);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const toggleBookmark = async () => {
    if (!user?.id || !post) return;
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      if (next) {
        const { error } = await supabase.from('post_bookmarks').insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_bookmarks').delete().eq('post_id', post.id).eq('user_id', user.id);
        if (error) throw error;
      }
    } catch (e) {
      setIsBookmarked(!next);
      Alert.alert('Error', 'Failed to update saved');
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `${post.user?.full_name || 'Someone'} shared: ${post.content || 'Check out this post'}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator /></View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}><Text>Post not found</Text></View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Media - Mixed Media Support */}
        {post.media_items && post.media_items.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              snapToInterval={width}
              decelerationRate="fast"
              onScroll={(event) => {
                const scrollX = event.nativeEvent.contentOffset.x;
                const currentIndex = Math.round(scrollX / width);
                setCurrentMediaIndex(currentIndex);
              }}
              scrollEventThrottle={16}
            >
              {post.media_items.map((mediaItem, i) => (
                <View key={i} style={[styles.hero, { width }]}>
                  {mediaItem.type === 'video' ? (
                    <Video
                      source={{ uri: mediaItem.url }}
                      style={styles.hero}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping
                      isMuted={false}
                      volume={1.0}
                      onError={(err) => console.warn('Video error:', err)}
                    />
                  ) : (
                    <Image source={{ uri: mediaItem.url }} style={styles.hero} resizeMode="cover" />
                  )}
                </View>
              ))}
            </ScrollView>
            {post.media_items.length > 1 && (
              <View style={styles.carouselIndicator}>
                <Text style={styles.carouselIndicatorText}>
                  {currentMediaIndex + 1}/{post.media_items.length}
                </Text>
              </View>
            )}
          </View>
        ) : post.video_urls && post.video_urls.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const scrollX = event.nativeEvent.contentOffset.x;
                const currentIndex = Math.round(scrollX / width);
                setCurrentMediaIndex(currentIndex);
              }}
              scrollEventThrottle={16}
            >
              {post.video_urls.map((videoUrl, i) => (
                <View key={i} style={styles.videoContainer}>
                  <Video
                    source={{ uri: videoUrl }}
                    style={styles.hero}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    isMuted={false}
                    volume={1.0}
                    onError={(err) => console.warn('Video error:', err)}
                  />
                </View>
              ))}
            </ScrollView>
            {post.video_urls.length > 1 && (
              <View style={styles.carouselIndicator}>
                <Text style={styles.carouselIndicatorText}>
                  {currentMediaIndex + 1}/{post.video_urls.length}
                </Text>
              </View>
            )}
          </View>
        ) : post.video_url ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: post.video_url }}
              style={styles.hero}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              isMuted={false}
              volume={1.0}
              onError={(err) => console.warn('Video error:', err)}
            />
          </View>
        ) : post.image_urls && post.image_urls.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const scrollX = event.nativeEvent.contentOffset.x;
                const currentIndex = Math.round(scrollX / width);
                setCurrentMediaIndex(currentIndex);
              }}
              scrollEventThrottle={16}
            >
              {post.image_urls.map((u, i) => (
                <Image key={i} source={{ uri: u }} style={styles.hero} />
              ))}
            </ScrollView>
            {post.image_urls.length > 1 && (
              <View style={styles.carouselIndicator}>
                <Text style={styles.carouselIndicatorText}>
                  {currentMediaIndex + 1}/{post.image_urls.length}
                </Text>
              </View>
            )}
          </View>
        ) : post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.hero} />
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <TouchableOpacity onPress={toggleLike} style={styles.actionBtnWithCount}>
              <ThumbsUp 
                size={24} 
                color={isLiked ? "#ffc857" : "#000000"} 
                fill={isLiked ? "#ffc857" : "none"}
                strokeWidth={2}
              />
              {(post.likes_count ?? 0) > 0 && (
                <Text style={styles.actionCount}>{post.likes_count}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/post-comments/${post.id}`)} style={styles.actionBtnWithCount}>
              <MessagesSquare size={24} color="#000000" strokeWidth={2} />
              {(post.comments_count ?? 0) > 0 && (
                <Text style={styles.actionCount}>{post.comments_count}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
              <Share2 size={24} color="#000000" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={toggleBookmark} style={styles.actionBtn}>
            <Star 
              size={24} 
              color={isBookmarked ? '#ffc857' : '#000000'} 
              fill={isBookmarked ? '#ffc857' : 'none'} 
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <View style={styles.captionBox}>
          <Text style={styles.author}>{post.user?.full_name || 'User'}</Text>
          <ExpandableText
            text={post.content}
            numberOfLines={3}
            captionStyle={styles.caption}
          />
        </View>

        {/* View Comments Link */}
        {(post.comments_count ?? 0) > 0 ? (
          <TouchableOpacity onPress={() => router.push(`/post-comments/${post.id}`)} style={styles.viewCommentsContainer}>
            <Text style={styles.viewComments}>
              View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push(`/post-comments/${post.id}`)} style={styles.viewCommentsContainer}>
            <Text style={styles.viewComments}>
              Be the first to comment
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  headerTitle: { fontSize: 18, color: '#111827', fontFamily: 'Inter-SemiBold' },
  carouselContainer: {
    width,
    height: width,
    position: 'relative',
  },
  hero: { width, height: width, backgroundColor: '#F3F4F6' },
  videoContainer: { width, height: width },
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
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  leftActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { padding: 4 },
  actionBtnWithCount: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
  actionCount: { fontSize: 14, color: '#111827', fontWeight: '600' },
  captionBox: { paddingHorizontal: 16, paddingBottom: 8 },
  caption: { fontSize: 14, color: '#111827' },
  author: { fontFamily: 'Inter-SemiBold' },
  viewCommentsContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  viewComments: { fontSize: 14, color: '#666666', marginTop: 4 },
});
