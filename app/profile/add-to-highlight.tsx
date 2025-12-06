import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useToast } from '@/components/Toast';

const { width } = Dimensions.get('window');
const SIZE = (width - 16 * 2 - 4 * 2) / 3; // padding 16, gap 2

type Post = { id: string; image_url?: string | null; image_urls?: string[] | null; created_at?: string };

export default function AddToHighlight() {
  const router = useRouter();
  const { t } = useLocalSearchParams<{ t?: string }>();
  const { user } = useAuth();
  const groupTitle = useMemo(() => (t ? decodeURIComponent(String(t)) : 'Highlight'), [t]);
  const toast = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        setLoading(true);
        // Load user's posts
        const { data: postsData, error: pErr } = await supabase
          .from('posts')
          .select('id,image_url,image_urls,created_at')
          .eq('user_id', user.id)
          .eq('is_highlight_only', false)
          .order('created_at', { ascending: false });
        if (pErr) throw pErr;
        setPosts((postsData as Post[]) || []);
        // Load existing highlight items for this group
        const { data: hi, error: hErr } = await supabase
          .from('profile_highlights')
          .select('post_id')
          .eq('user_id', user.id)
          .eq('title', groupTitle);
        if (hErr) throw hErr;
        const exist = new Set<string>();
        (hi || []).forEach((r: any) => { if (r.post_id) exist.add(r.post_id); });
        setExisting(exist);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, groupTitle]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addItems = async () => {
    if (!user?.id) return;
    const ids = Array.from(selected).filter((id) => !existing.has(id));
    if (!ids.length) { Alert.alert('Nothing to add', 'Select posts that are not already in this highlight.'); return; }
    try {
      setSaving(true);
      // find current max order_index for this group
      const { data: currentRows, error: rErr } = await supabase
        .from('profile_highlights')
        .select('order_index')
        .eq('user_id', user.id)
        .eq('title', groupTitle)
        .order('order_index', { ascending: false })
        .limit(1);
      if (rErr) throw rErr;
      let start = (currentRows && currentRows[0]?.order_index) ?? -1;
      const inserts = ids.map((postId, i) => ({
        user_id: user.id,
        title: groupTitle,
        visible: true,
        pinned: false,
        post_id: postId,
        order_index: ++start,
      }));
      const { error: iErr } = await supabase.from('profile_highlights').insert(inserts);
      if (iErr) {
        const msg = (iErr as any)?.message || '';
        // Temporary fallback: if server still enforces 12-visible cap, retry as hidden
        if (msg.toLowerCase().includes('12') && msg.toLowerCase().includes('visible')) {
          const hiddenInserts = inserts.map((it) => ({ ...it, visible: false }));
          const { error: hErr } = await supabase.from('profile_highlights').insert(hiddenInserts);
          if (hErr) throw hErr;
          toast.show(`Added ${ids.length} item${ids.length > 1 ? 's' : ''} to ${groupTitle} (hidden due to server limit)`, { type: 'info' });
        } else {
          throw iErr;
        }
      } else {
        toast.show(`Highlight added successfully`);
      }
      debouncedRouter.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add items');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to {groupTitle}</Text>
        <TouchableOpacity
          disabled={selected.size === 0 || saving}
          style={[styles.primaryBtn, (selected.size === 0 || saving) && { opacity: 0.5 }]}
          onPress={addItems}
        >
          <Text style={styles.primaryText}>{saving ? 'Adding…' : `Add ${selected.size || ''}`}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={posts}
          numColumns={3}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 2, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 2, paddingVertical: 12 }}
          renderItem={({ item }) => {
            const thumb = item.image_url || (Array.isArray(item.image_urls) && item.image_urls.length ? item.image_urls[0] : undefined);
            const disabled = existing.has(item.id);
            const isSel = selected.has(item.id);
            return (
              <TouchableOpacity
                onPress={() => {
                  if (disabled) return;
                  const slides = Array.isArray(item.image_urls) ? item.image_urls.length : 0;
                  if (slides > 1) {
                    // Navigate to slide picker for this post
                    debouncedRouter.push(`/profile/add-from-post-slides?t=${encodeURIComponent(groupTitle)}&postId=${item.id}` as any);
                  } else {
                    toggle(item.id);
                  }
                }}
                activeOpacity={0.8}
                style={[styles.tile, disabled && { opacity: 0.5 }]}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.img} />
                ) : (
                  <View style={[styles.img, { backgroundColor: '#F3F4F6' }]} />
                )}
                {isSel && (
                  <View style={styles.checkOverlay}>
                    <Check size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { fontSize: 16, color: '#111827', fontFamily: 'Inter-SemiBold' },
  primaryBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  primaryText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tile: { width: SIZE, height: SIZE, position: 'relative' },
  img: { width: '100%', height: '100%' },
  checkOverlay: { position: 'absolute', right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
