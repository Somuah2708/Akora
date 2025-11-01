import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '@/lib/youtube';

const { width } = Dimensions.get('window');

interface YouTubePlayerProps {
  url: string;
  style?: any;
}

export default function YouTubePlayer({ url, style }: YouTubePlayerProps) {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return null;
  }

  const embedUrl = getYouTubeEmbedUrl(videoId);

  return (
    <View style={[styles.container, style]}>
      <WebView
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        source={{ uri: embedUrl }}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={true}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: width, // Square aspect ratio
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
