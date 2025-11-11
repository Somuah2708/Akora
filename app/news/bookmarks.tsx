import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { NewsArticle, NewsCategory } from '@/lib/types/news';
import NewsCard from '@/components/news/NewsCard';
import SkeletonLoader from '@/components/news/SkeletonLoader';

export default function BookmarksScreen() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<NewsCategory | 'all'>('all');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      if (user) {
        loadBookmarks(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const loadBookmarks = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news_bookmarks')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (userId) {
      setRefreshing(true);
      loadBookmarks(userId);
    }
  }, [userId]);

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('news_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
      Alert.alert('Error', 'Failed to remove bookmark');
    }
  };

  const handleArticlePress = (article: NewsArticle) => {
    router.push({
      pathname: '/news/article-detail',
      params: { articleData: JSON.stringify(article) },
    });
  };

  const filteredBookmarks = filterCategory === 'all'
    ? bookmarks
    : bookmarks.filter(b => b.article_data?.category === filterCategory);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Articles</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Filter', 'Category filter coming soon')}
          style={styles.filterButton}
        >
          <Filter size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {loading ? (
            <SkeletonLoader variant="horizontal" count={5} />
          ) : filteredBookmarks.length > 0 ? (
            <>
              <Text style={styles.countText}>
                {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'article' : 'articles'} saved
              </Text>
              {filteredBookmarks.map((bookmark) => (
                <View key={bookmark.id} style={styles.bookmarkItem}>
                  <NewsCard
                    article={bookmark.article_data}
                    variant="horizontal"
                    onPress={() => handleArticlePress(bookmark.article_data)}
                    isBookmarked={true}
                    onBookmark={() => handleRemoveBookmark(bookmark.id)}
                  />
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Saved Articles</Text>
              <Text style={styles.emptyText}>
                Bookmark articles you want to read later
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  filterButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  bookmarkItem: {
    marginBottom: 12,
  },
  emptyState: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
