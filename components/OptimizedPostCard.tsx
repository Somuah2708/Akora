import React, { memo, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView,
  TouchableWithoutFeedback,
  Platform 
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { ThumbsUp, MessagesSquare, Share2, Star } from 'lucide-react-native';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { getDisplayName, type Profile, type Post } from '@/lib/supabase';
import YouTubePlayer from '@/components/YouTubePlayer';
import ExpandableText from '@/components/ExpandableText';

const { width } = Dimensions.get('window');

interface PostWithUser extends Post {
  user: Profile;
  isLiked?: boolean;
  isBookmarked?: boolean;
  comments_count?: number;
  likes?: number;
  comments?: number;
}

interface OptimizedPostCardProps {
  post: PostWithUser;
  isVisible: boolean;
  isMuted: boolean;
  isScreenFocused: boolean;
  onLikeToggle: (postId: string) => void;
  onBookmarkToggle: (postId: string) => void;
  onSharePress: (post: PostWithUser) => void;
  onLayout?: (postId: string, y: number, height: number) => void;
}

// Helper function to format time ago
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

// Optimized Video Component - only renders when visible
const OptimizedVideo = memo(({ 
  uri, 
  shouldPlay, 
  isMuted,
  style,
  onReadyForDisplay 
}: { 
  uri: string;
  shouldPlay: boolean;
  isMuted: boolean;
  style: any;
  onReadyForDisplay?: (data: any) => void;
}) => {
  // On Android, don't even mount the Video component if not visible
  if (Platform.OS === 'android' && !shouldPlay) {
    return (
      <View style={[style, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>▶</Text>
        </View>
      </View>
    );
  }

  return (
    <Video
      source={{ uri }}
      style={style}
      useNativeControls
      resizeMode={ResizeMode.COVER}
      isLooping
      shouldPlay={shouldPlay}
      volume={isMuted ? 0.0 : 1.0}
      onReadyForDisplay={onReadyForDisplay}
      onError={(err) => console.warn('Video play error', err)}
      // Android performance optimizations
      progressUpdateIntervalMillis={500}
      positionMillis={0}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these change
  return (
    prevProps.uri === nextProps.uri &&
    prevProps.shouldPlay === nextProps.shouldPlay &&
    prevProps.isMuted === nextProps.isMuted
  );
});

OptimizedVideo.displayName = 'OptimizedVideo';

const OptimizedPostCard = memo(({
  post,
  isVisible,
  isMuted,
  isScreenFocused,
  onLikeToggle,
  onBookmarkToggle,
  onSharePress,
  onLayout,
}: OptimizedPostCardProps) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<{[key: string]: number}>({});

  const handleMediaLoad = useCallback((mediaId: string, w: number, h: number) => {
    const aspectRatio = w / h;
    setMediaAspectRatios(prev => ({ ...prev, [mediaId]: aspectRatio }));
  }, []);

  const shouldPlayVideo = useMemo(() => {
    return isScreenFocused && isVisible;
  }, [isScreenFocused, isVisible]);

  // Determine what media type this post has
  const hasMediaItems = (post as any).media_items && (post as any).media_items.length > 0;
  const hasYouTubeUrls = post.youtube_urls && post.youtube_urls.length > 0;
  const hasVideoUrls = post.video_urls && post.video_urls.length > 0;
  const hasImageUrls = post.image_urls && post.image_urls.length > 0;
  const hasYouTubeUrl = post.youtube_url;
  const hasVideoUrl = post.video_url;
  const hasImageUrl = post.image_url;

  // Render media content
  const renderMedia = useCallback(() => {
    // Mixed media items (images + videos)
    if (hasMediaItems) {
      const mediaItems = (post as any).media_items;
      return (
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            style={styles.carousel}
            nestedScrollEnabled
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="start"
            onScroll={(event) => {
              const scrollX = event.nativeEvent.contentOffset.x;
              const currentIndex = Math.round(scrollX / width);
              setCarouselIndex(currentIndex);
            }}
            scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
          >
            {mediaItems.map((mediaItem: any, index: number) => (
              <View key={index} style={styles.mediaPage}>
                {mediaItem.type === 'video' ? (
                  <TouchableWithoutFeedback onPress={() => {}}>
                    <View style={{ flex: 1 }}>
                      <OptimizedVideo
                        uri={mediaItem.url}
                        shouldPlay={shouldPlayVideo && carouselIndex === index}
                        isMuted={isMuted || carouselIndex !== index}
                        style={[
                          styles.postImage,
                          { aspectRatio: mediaAspectRatios[`media_${index}`] || 1 }
                        ]}
                        onReadyForDisplay={(data) => {
                          if (data.naturalSize) {
                            handleMediaLoad(`media_${index}`, data.naturalSize.width, data.naturalSize.height);
                          }
                        }}
                      />
                    </View>
                  </TouchableWithoutFeedback>
                ) : (
                  <TouchableOpacity 
                    activeOpacity={0.95}
                    onPress={() => debouncedRouter.push(`/post/${post.id}`)}
                  >
                    <Image
                      source={{ uri: mediaItem.url }}
                      style={[
                        styles.postImage,
                        { aspectRatio: mediaAspectRatios[`media_${index}`] || 1 }
                      ]}
                      resizeMode="cover"
                      onLoad={(event) => {
                        const { width: w, height: h } = event.nativeEvent.source;
                        handleMediaLoad(`media_${index}`, w, h);
                      }}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
          {mediaItems.length > 1 && (
            <View style={styles.carouselIndicator}>
              <Text style={styles.carouselIndicatorText}>
                {carouselIndex + 1}/{mediaItems.length}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // YouTube URLs
    if (hasYouTubeUrls) {
      return (
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            style={styles.carousel}
          >
            {post.youtube_urls!.map((youtubeUrl, index) => (
              <View key={index} style={styles.mediaPage}>
                <YouTubePlayer url={youtubeUrl} />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    // Video URLs
    if (hasVideoUrls) {
      return (
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            style={styles.carousel}
            onScroll={(event) => {
              const scrollX = event.nativeEvent.contentOffset.x;
              const currentIndex = Math.round(scrollX / width);
              setCarouselIndex(currentIndex);
            }}
            scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
          >
            {post.video_urls!.map((videoUrl, index) => (
              <View key={index} style={styles.mediaPage}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={{ flex: 1 }}>
                    <OptimizedVideo
                      uri={videoUrl}
                      shouldPlay={shouldPlayVideo && carouselIndex === index}
                      isMuted={isMuted || carouselIndex !== index}
                      style={[
                        styles.postImage,
                        { aspectRatio: mediaAspectRatios[`video_${index}`] || 1 }
                      ]}
                      onReadyForDisplay={(data) => {
                        if (data.naturalSize) {
                          handleMediaLoad(`video_${index}`, data.naturalSize.width, data.naturalSize.height);
                        }
                      }}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            ))}
          </ScrollView>
          {post.video_urls!.length > 1 && (
            <View style={styles.carouselIndicator}>
              <Text style={styles.carouselIndicatorText}>
                {carouselIndex + 1}/{post.video_urls!.length}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // Image URLs (multiple)
    if (hasImageUrls) {
      return (
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            style={styles.carousel}
            onScroll={(event) => {
              const scrollX = event.nativeEvent.contentOffset.x;
              const currentIndex = Math.round(scrollX / width);
              setCarouselIndex(currentIndex);
            }}
            scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
          >
            {post.image_urls!.map((imageUrl, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.mediaPage}
                activeOpacity={0.95}
                onPress={() => debouncedRouter.push(`/post/${post.id}`)}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={[
                    styles.postImage,
                    { aspectRatio: mediaAspectRatios[`img_${index}`] || 1 }
                  ]}
                  resizeMode="cover"
                  onLoad={(event) => {
                    const { width: w, height: h } = event.nativeEvent.source;
                    handleMediaLoad(`img_${index}`, w, h);
                  }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {post.image_urls!.length > 1 && (
            <View style={styles.carouselIndicator}>
              <Text style={styles.carouselIndicatorText}>
                {carouselIndex + 1}/{post.image_urls!.length}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // Single YouTube URL
    if (hasYouTubeUrl) {
      return <YouTubePlayer url={post.youtube_url!} />;
    }

    // Single Video URL
    if (hasVideoUrl) {
      return (
        <TouchableWithoutFeedback onPress={() => {}}>
          <View>
            <OptimizedVideo
              uri={post.video_url!}
              shouldPlay={shouldPlayVideo}
              isMuted={isMuted}
              style={[
                styles.postImage,
                { aspectRatio: mediaAspectRatios['single'] || 1 }
              ]}
              onReadyForDisplay={(data) => {
                if (data.naturalSize) {
                  handleMediaLoad('single', data.naturalSize.width, data.naturalSize.height);
                }
              }}
            />
          </View>
        </TouchableWithoutFeedback>
      );
    }

    // Single Image URL
    if (hasImageUrl) {
      return (
        <TouchableOpacity activeOpacity={0.85} onPress={() => debouncedRouter.push(`/post/${post.id}`)}>
          <Image 
            source={{ uri: post.image_url! }} 
            style={[
              styles.postImage,
              { aspectRatio: mediaAspectRatios['single'] || 1 }
            ]}
            resizeMode="cover"
            onLoad={(event) => {
              const { width: w, height: h } = event.nativeEvent.source;
              handleMediaLoad('single', w, h);
            }}
          />
        </TouchableOpacity>
      );
    }

    return null;
  }, [
    post, 
    carouselIndex, 
    shouldPlayVideo, 
    isMuted, 
    mediaAspectRatios, 
    handleMediaLoad,
    hasMediaItems,
    hasYouTubeUrls,
    hasVideoUrls,
    hasImageUrls,
    hasYouTubeUrl,
    hasVideoUrl,
    hasImageUrl,
  ]);

  return (
    <View 
      style={styles.postCard}
      onLayout={(event) => {
        if (onLayout) {
          const { y, height } = event.nativeEvent.layout;
          onLayout(post.id, y, height);
        }
      }}
    >
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.postHeaderLeft}
          onPress={() => debouncedRouter.push(`/user-profile/${post.user_id}`)}
          activeOpacity={0.7}
        >
          <Image 
            source={{ 
              uri: post.user.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60'
            }} 
            style={styles.postUserAvatar} 
          />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.postUsername}>{getDisplayName(post.user)}</Text>
              {(post.user.is_admin || post.user.role === 'admin') && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.postTime}>{getTimeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Post Media */}
      {renderMedia()}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity 
            style={styles.actionButtonWithCount}
            onPress={() => onLikeToggle(post.id)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThumbsUp 
              size={24} 
              color={post.isLiked ? "#ffc857" : "#000000"}
              fill={post.isLiked ? "#ffc857" : "none"}
              strokeWidth={2}
            />
            {(post.likes || 0) > 0 && (
              <Text style={styles.actionCount}>{post.likes}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButtonWithCount}
            onPress={() => debouncedRouter.push(`/post-comments/${post.id}`)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MessagesSquare size={24} color="#000000" strokeWidth={2} />
            {post.comments_count !== undefined && post.comments_count > 0 && (
              <Text style={styles.actionCount}>{post.comments_count}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onSharePress(post)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Share2 size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onBookmarkToggle(post.id)}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Star size={24} color={post.isBookmarked ? '#ffc857' : '#000000'} fill={post.isBookmarked ? '#ffc857' : 'none'} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Post Caption */}
      {post.content && (
        <View style={styles.postCaption}>
          <Text style={styles.postCaptionUsername}>
            {getDisplayName(post.user)}
          </Text>
          <ExpandableText
            text={post.content}
            numberOfLines={2}
            captionStyle={styles.postCaptionText}
          />
        </View>
      )}

      {/* Post Comments Count */}
      {post.comments_count !== undefined && post.comments_count > 0 ? (
        <TouchableOpacity onPress={() => debouncedRouter.push(`/post-comments/${post.id}`)}>
          <Text style={styles.viewComments}>
            View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => debouncedRouter.push(`/post-comments/${post.id}`)}>
          <Text style={styles.viewComments}>
            Be the first to comment
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when necessary
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.isLiked === nextProps.post.isLiked &&
    prevProps.post.isBookmarked === nextProps.post.isBookmarked &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isScreenFocused === nextProps.isScreenFocused
  );
});

OptimizedPostCard.displayName = 'OptimizedPostCard';

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    width: width,
  },
  mediaPage: {
    width: width,
  },
  postImage: {
    width: width,
    minHeight: 300,
    maxHeight: 500,
    backgroundColor: '#F3F4F6',
  },
  carouselIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carouselIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  videoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  actionButtonWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postCaption: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  postCaptionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postCaptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  viewComments: {
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default OptimizedPostCard;
