import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Bookmark, MessageCircle, ThumbsUp } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { on } from '@/lib/eventBus';

type Discussion = {
  id: string;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
};

export default function SavedDiscussionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Discussion[]>([]);
  // React Native setTimeout returns a number; avoid Node types for compatibility
  const refreshTimer = useRef<number | null>(null);

  const load = async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    try {
      setLoading(true);
      // 1) Get saved discussion ids
      const { data: bookmarks, error: bErr } = await supabase
        .from('forum_discussion_bookmarks')
        .select('discussion_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (bErr) throw bErr;
      const ids = (bookmarks || []).map(b => b.discussion_id);
      if (ids.length === 0) { setItems([]); return; }

      // 2) Fetch discussions joined with author profiles
      const { data, error } = await supabase
        .from('forum_discussions')
        .select(`
          *,
          profiles!forum_discussions_author_id_fkey (
            id, username, full_name, avatar_url
          )
        `)
        .in('id', ids);
      if (error) throw error;

      const byId: Record<string, Discussion> = {} as any;
      (data || []).forEach((d: any) => {
        byId[d.id] = {
          ...d,
          profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
        } as Discussion;
      });

      // Keep bookmark order
      const ordered = ids.map(id => byId[id]).filter(Boolean) as Discussion[];
      setItems(ordered);
    } catch (e) {
      console.error('Load saved discussions failed', e);
      Alert.alert('Error', 'Unable to load saved discussions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    load();
  }, [user?.id]));

  // Listen for bookmark changes from other screens
  useEffect(() => {
    const unsubscribe = on('forum:bookmarkChanged', ({ discussionId, saved }) => {
      if (!saved) {
        // Optimistically remove from list
        setItems(prev => prev.filter(d => d.id !== discussionId));
      } else {
        // Debounced refresh to include newly saved item
  if (refreshTimer.current) clearTimeout(refreshTimer.current);
  refreshTimer.current = setTimeout(() => { load(); }, 250) as unknown as number;
      }
    });
    return () => {
  if (refreshTimer.current) clearTimeout(refreshTimer.current);
      unsubscribe();
    };
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const unsave = async (discussionId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('forum_discussion_bookmarks')
        .delete()
        .eq('discussion_id', discussionId)
        .eq('user_id', user.id);
      setItems(prev => prev.filter(d => d.id !== discussionId));
    } catch (e) {
      Alert.alert('Error', 'Failed to remove bookmark');
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading saved…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Discussions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4169E1"]} tintColor="#4169E1" />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Star size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No saved discussions</Text>
            <Text style={styles.emptySubtitle}>Tap the bookmark icon on any discussion to save it for later.</Text>
          </View>
        ) : (
          items.map(d => (
            <TouchableOpacity key={d.id} style={styles.card} onPress={() => debouncedRouter.push(`/forum/${d.id}`)}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: d.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{d.profiles?.full_name || 'User'}</Text>
                  <Text style={styles.meta}>@{d.profiles?.username || 'user'} · {getTimeAgo(d.created_at)}</Text>
                </View>
                <TouchableOpacity onPress={() => unsave(d.id)} style={styles.unsaveButton} accessibilityLabel="Unsave discussion">
                  <Star size={20} color="#14B8A6" fill="#14B8A6" />
                </TouchableOpacity>
              </View>
              <Text style={styles.title}>{d.title}</Text>
              <Text numberOfLines={3} style={styles.preview}>{d.content}</Text>
              <View style={styles.footer}>
                <View style={styles.row}>
                  <ThumbsUp size={16} color="#666" />
                  <Text style={styles.count}>{d.likes_count || 0}</Text>
                </View>
                <View style={styles.row}>
                  <MessagesSquare size={16} color="#666" />
                  <Text style={styles.count}>{d.comments_count || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666666' },
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
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000000' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#111827' },
  emptySubtitle: { marginTop: 4, fontSize: 13, color: '#6B7280', textAlign: 'center' },
  card: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280' },
  unsaveButton: { padding: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  preview: { fontSize: 14, color: '#374151' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { color: '#6B7280' },
});
