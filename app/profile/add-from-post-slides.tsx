import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image, Dimensions, Alert, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useToast } from '@/components/Toast';

const { width } = Dimensions.get('window');
const SIZE = (width - 16 * 2 - 4 * 2) / 3;

export default function AddFromPostSlides() {
  const router = useRouter();
  const { t, postId } = useLocalSearchParams<{ t?: string; postId?: string }>();
  const { user } = useAuth();
  const initialTitle = useMemo(() => (t ? decodeURIComponent(String(t)) : ''), [t]);
  const toast = useToast();
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [existingIdx, setExistingIdx] = useState<Set<number>>(new Set());
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>(initialTitle || '');
  const [newTitle, setNewTitle] = useState<string>('');
  const destTitle = useMemo(() => (newTitle.trim() || selectedTitle || 'Highlight'), [newTitle, selectedTitle]);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.id || !postId) return;
        setLoading(true);
        const { data, error } = await supabase
          .from('posts')
          .select('id,image_urls')
          .eq('id', postId)
          .single();
        if (error) throw error;
        setPost(data);
        // load existing group titles
        const { data: all } = await supabase
          .from('profile_highlights')
          .select('title')
          .eq('user_id', user.id);
        const uniq = Array.from(new Set((all || []).map((r: any) => (r.title || 'Highlight').trim()))).sort((a, b) => a.localeCompare(b));
        setTitles(uniq);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to load slides');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, postId]);

  // Reload existing indices when destination title changes
  useEffect(() => {
    (async () => {
      try {
        if (!user?.id || !postId) return;
        const { data: hi } = await supabase
          .from('profile_highlights')
          .select('slide_index')
          .eq('user_id', user.id)
          .eq('title', destTitle)
          .eq('post_id', postId);
        const setE = new Set<number>();
        (hi || []).forEach((r: any) => { if (typeof r.slide_index === 'number') setE.add(r.slide_index); });
        setExistingIdx(setE);
      } catch (e) {
        // ignore
      }
    })();
  }, [user?.id, postId, destTitle]);

  const toggle = (idx: number) => {
    if (existingIdx.has(idx)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const addSlides = async () => {
    if (!user?.id || !postId) return;
    const idxs = Array.from(selected);
    if (!idxs.length) { Alert.alert('Nothing to add', 'Select one or more slides to add.'); return; }
    try {
      setSaving(true);
      const { data: currentRows } = await supabase
        .from('profile_highlights')
        .select('order_index')
        .eq('user_id', user.id)
        .eq('title', destTitle)
        .order('order_index', { ascending: false })
        .limit(1);
      let start = (currentRows && currentRows[0]?.order_index) ?? -1;
      const inserts = idxs.map((slide_index, i) => ({
        user_id: user.id,
        title: destTitle,
        visible: true,
        pinned: false,
        post_id: postId as string,
        slide_index,
        order_index: ++start,
      }));
      const { error } = await supabase.from('profile_highlights').insert(inserts);
      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.toLowerCase().includes('12') && msg.toLowerCase().includes('visible')) {
          const hidden = inserts.map((it) => ({ ...it, visible: false }));
          const { error: hErr } = await supabase.from('profile_highlights').insert(hidden);
          if (hErr) throw hErr;
          toast.show(`Added ${idxs.length} slide${idxs.length > 1 ? 's' : ''} (hidden due to server limit)`, { type: 'info' });
        } else {
          throw error;
        }
      } else {
        toast.show('Highlight added successfully');
      }
      debouncedRouter.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add slides');
    } finally {
      setSaving(false);
    }
  };

  const slides: string[] = Array.isArray(post?.image_urls) ? post.image_urls : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select slides</Text>
        <TouchableOpacity disabled={selected.size === 0 || saving} style={[styles.primaryBtn, (selected.size === 0 || saving) && { opacity: 0.5 }]} onPress={addSlides}>
          <Text style={styles.primaryText}>{saving ? 'Adding…' : `Add ${selected.size || ''}`}</Text>
        </TouchableOpacity>
      </View>

      {/* Destination group picker */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={styles.lead}>Add to highlight</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {titles.map((title) => (
            <TouchableOpacity key={title} onPress={() => { setSelectedTitle(title); setNewTitle(''); }} style={[styles.pill, (destTitle === title && !newTitle) && styles.pillActive]}>
              <Text style={[styles.pillText, (destTitle === title && !newTitle) && styles.pillTextActive]}>{title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ height: 8 }} />
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="Or create a new highlight (title)"
          style={styles.input}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={slides.map((u, i) => ({ uri: u, idx: i }))}
          numColumns={3}
          keyExtractor={(it) => String(it.idx)}
          columnWrapperStyle={{ gap: 2, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 2, paddingVertical: 12 }}
          renderItem={({ item }) => {
            const disabled = existingIdx.has(item.idx);
            const isSel = selected.has(item.idx);
            return (
              <TouchableOpacity onPress={() => toggle(item.idx)} activeOpacity={0.8} style={[styles.tile, (disabled || isSel) && { opacity: disabled ? 0.5 : 1 }]}
              >
                <Image source={{ uri: item.uri }} style={styles.img} />
                {disabled ? null : (isSel ? (
                  <View style={styles.checkOverlay}>
                    <Check size={18} color="#FFFFFF" />
                  </View>
                ) : null)}
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
  lead: { color: '#374151', marginBottom: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F3F4F6' },
  pillActive: { backgroundColor: '#DBEAFE' },
  pillText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
  pillTextActive: { color: '#1D4ED8' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tile: { width: SIZE, height: SIZE, position: 'relative' },
  img: { width: '100%', height: '100%' },
  checkOverlay: { position: 'absolute', right: 6, top: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
