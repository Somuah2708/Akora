import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, Modal, Pressable, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type Row = { id: string; user_id: string; title: string | null; order_index: number | null; pinned: boolean | null; visible: boolean | null; post_id: string | null };

export default function ManageHighlightsHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const [coversByTitle, setCoversByTitle] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profile_highlights')
          .select('id,user_id,title,order_index,visible,pinned,post_id')
          .eq('user_id', user.id)
          .order('pinned', { ascending: false })
          .order('order_index', { ascending: true });
        if (error) throw error;
        const r = (data || []) as Row[];
        setRows(r);
        const postIds = r.map(x => x.post_id).filter(Boolean) as string[];
        if (postIds.length) {
          const { data: posts } = await supabase
            .from('posts')
            .select('id,image_url,image_urls')
            .in('id', postIds);
          const m: Record<string, string | null> = {};
          (posts || []).forEach((p: any) => {
            m[p.id] = p.image_url || (Array.isArray(p.image_urls) && p.image_urls[0]) || null;
          });
          setThumbs(m);
        } else {
          setThumbs({});
        }
        // Load custom covers for this user
        try {
          const { data: covers, error: cErr } = await supabase
            .from('profile_highlight_covers')
            .select('title,cover_url')
            .eq('user_id', user.id);
          if (!cErr && Array.isArray(covers)) {
            const map: Record<string, string | null> = {};
            covers.forEach((c: any) => { if (c?.title) map[String(c.title)] = c.cover_url || null; });
            setCoversByTitle(map);
          } else {
            setCoversByTitle({});
          }
        } catch {}
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to load highlights');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const groups = useMemo(() => {
    const byTitle = new Map<string, Row[]>();
    rows.forEach(r => {
      const key = (r.title || 'Highlight').trim();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key)!.push(r);
    });
    return Array.from(byTitle.entries()).map(([title, items]) => {
      // Cover: first pinned or lowest order item
      const cover = items.find(i => i.pinned) || items[0];
      const thumb = cover?.post_id ? thumbs[cover.post_id] : null;
      const custom = coversByTitle[title] || null;
      return { title, count: items.length, coverThumb: custom || thumb };
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [rows, thumbs, coversByTitle]);

  const createHighlightFlow = (title?: string) => {
    const t = encodeURIComponent(title || 'Highlight');
    debouncedRouter.push(`/create-post?highlight=1&autoPick=1&ht=${t}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Highlights</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowNew(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.primaryText}>New highlight</Text>
          </TouchableOpacity>
          {groups.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No highlights yet</Text>
              <Text style={styles.emptyText}>Create your first highlight from your library or posts.</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => createHighlightFlow('Highlight')}>
                <Text style={styles.secondaryText}>Add from library</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map(g => (
              <TouchableOpacity key={g.title} style={styles.groupRow} onPress={() => debouncedRouter.push(`/profile/manage-highlights?t=${encodeURIComponent(g.title)}` as any)}>
                <View style={styles.coverBox}>
                  {g.coverThumb ? (
                    <Image source={{ uri: g.coverThumb }} style={styles.coverImg} />
                  ) : (
                    <View style={styles.coverPlaceholder}><Star size={18} color="#0A84FF" /></View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupTitle} numberOfLines={1}>{g.title}</Text>
                  <Text style={styles.groupMeta}>{g.count} {g.count === 1 ? 'item' : 'items'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showNew} transparent animationType="fade" onRequestClose={() => setShowNew(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNew(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Create highlight</Text>
            <TextInput
              style={styles.input}
              placeholder="Title (e.g., Travel)"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowNew(false)}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => { setShowNew(false); createHighlightFlow(newTitle.trim() || 'Highlight'); }}>
                <Text style={styles.primaryText}>Add from library</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, color: '#111827', fontFamily: 'Inter-SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  secondaryText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
  emptyBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, color: '#111827', fontFamily: 'Inter-SemiBold' },
  emptyText: { color: '#6B7280' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
  coverBox: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#DBDBDB' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  groupTitle: { fontSize: 14, color: '#111827', fontFamily: 'Inter-SemiBold' },
  groupMeta: { fontSize: 12, color: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#111827' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
});
