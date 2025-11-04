import React from 'react';
import { Dimensions, Image, View, StyleSheet } from 'react-native';
import { SwiperFlatList } from 'react-native-swiper-flatlist';
import YouTubePlayer from '@/components/YouTubePlayer';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');

export type MediaType = 'image' | 'video' | 'youtube';

export type CarouselItem = {
  type: MediaType;
  uri: string;
};

interface PostCarouselProps {
  items: CarouselItem[];
  showPagination?: boolean;
  height?: number;
}

export default function PostCarousel({ items, showPagination = true, height = width }: PostCarouselProps) {
  return (
    <View style={[styles.container, { height }]}> 
      <SwiperFlatList
        data={items}
        keyExtractor={(item, index) => `${item.type}-${index}-${item.uri}`}
        showPagination={showPagination}
        paginationStyleItem={{ width: 6, height: 6, marginHorizontal: 3 }}
        autoplay={false}
        renderItem={({ item }) => {
          if (item.type === 'image') {
            return (
              <Image
                source={{ uri: item.uri }}
                style={{ width, height, resizeMode: 'cover', backgroundColor: '#F3F4F6' }}
                onError={(e) => console.warn('Image load error', item.uri, e.nativeEvent?.error)}
              />
            );
          }
          if (item.type === 'video') {
            return (
              <Video
                source={{ uri: item.uri }}
                style={{ width, height, backgroundColor: '#000' }}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping={false}
                isMuted={false}
                volume={1.0}
                onError={(err) => console.warn('Video play error', err)}
              />
            );
          }
          if (item.type === 'youtube') {
            return (
              <View style={{ width, height, backgroundColor: '#000' }}>
                <YouTubePlayer url={item.uri} />
              </View>
            );
          }
          // Fallback: empty slide
          return <View style={{ width, height, backgroundColor: '#000' }} />;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});
