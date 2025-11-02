import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Pressable, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trash, Eye, EyeOff, Pin, PinOff, Star } from 'lucide-react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

// Data model mirrors DB table shape (subset)
type Highlight = {
  id: string;
  user_id: string;
  title?: string | null;
  subtitle?: string | null;
  media_url?: string | null; // deprecated
  action_url?: string | null; // deprecated
  emoji?: string | null; // deprecated
  color?: string | null;
  order_index?: number | null;
  visible?: boolean | null;
  pinned?: boolean | null;
  post_id?: string | null;
};

export default function ManageHighlightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Highlight[]>([]);
  const [postPreview, setPostPreview] = useState<Record<string, { thumb?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // New item draft
  const [draft, setDraft] = useState<Partial<Highlight>>({ title: '', visible: true, pinned: false });

  useEffect(() => {
    if (user?.id) {
      load();
    }
  }, [user?.id]);

  const load = async () => {
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
      const rows = (data as Highlight[]) || [];
      setItems(rows);
      const postIds = rows.map(r => r.post_id).filter(Boolean) as string[];
      if (postIds.length) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id,image_url,image_urls,video_urls')
          .in('id', postIds);
        const map: Record<string, { thumb?: string | null }> = {};
        (posts || []).forEach((p: any) => {
          const thumb = p.image_url || (Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null);
          map[p.id] = { thumb };
        });
        setPostPreview(map);
      } else {
        setPostPreview({});
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load highlights');
    } finally {
      setLoading(false);
    }
  };

  const canAddMore = items.filter(i => i.visible).length < 12;

  const persistOrder = async (next: Highlight[]) => {
    try {
      setSaving(true);
      const updates = next.map((it, idx) => supabase
        .from('profile_highlights')
        .update({ order_index: idx })
        .eq('id', it.id)
      );
      const results = await Promise.all(updates);
      const err = results.find(r => (r as any).error)?.error;
      if (err) throw err;
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save order');
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (id: string, field: 'visible' | 'pinned') => {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const next = [...items];
    const current = next[idx];
    const newVal = !(current as any)[field];
    // Enforce max visible=12
    if (field === 'visible' && newVal && items.filter(i => i.visible).length >= 12) {
      Alert.alert('Limit reached', 'You can only have up to 12 visible highlights. Hide one to show another.');
      return;
    }
    (next[idx] as any)[field] = newVal;
    setItems(next);
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profile_highlights')
        .update({ [field]: newVal })
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update');
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    Alert.alert('Delete highlight', 'This cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setSaving(true);
          const { error } = await supabase.from('profile_highlights').delete().eq('id', id);
          if (error) throw error;
          setItems(items.filter(i => i.id !== id));
        } catch (e) {
          console.error(e);
          Alert.alert('Error', 'Failed to delete');
        } finally {
          setSaving(false);
        }
      }},
    ]);
  };

  // Creation happens from the post composer or post tile. Manage here focuses on reorder, edit title, toggles, and delete.

  const editItem = async (id: string, patch: Partial<Highlight>) => {
    try {
      setSaving(true);
      const { error, data } = await supabase
        .from('profile_highlights')
        .update(patch)
        .eq('id', id)
        .select('id,user_id,title,order_index,visible,pinned,post_id')
        .single();
      if (error) throw error;
      setItems(items.map(i => i.id === id ? (data as Highlight) : i));
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Highlights</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#4169E1" />
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          {/* Preview */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewHint}>This is how your Highlights appear on your profile</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewList}>
              {items.filter(i => i.visible).map((h) => (
                <View key={h.id} style={styles.previewItem}>
                  <View style={[styles.previewImageContainer, h.color ? { borderColor: h.color } : null]}>
                    {h.post_id && postPreview[h.post_id]?.thumb ? (
                      <Image source={{ uri: postPreview[h.post_id]?.thumb as string }} style={styles.previewImage} />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                        <Star size={18} color="#0A84FF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.previewItemTitle} numberOfLines={1}>{h.title || 'Highlight'}</Text>
                </View>
              ))}
              {items.filter(i => i.visible).length === 0 && (
                <Text style={styles.emptyText}>No visible highlights yet</Text>
              )}
            </ScrollView>
          </View>

          <View style={{ height: 12 }} />
          {/* Quick action to create a highlight from library */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/create-post?highlight=1&autoPick=1')}
          >
            <Text style={styles.addButtonText}>Add from library</Text>
          </TouchableOpacity>
          <View style={{ height: 12 }} />
          <DraggableFlatList<Highlight>
            contentContainerStyle={{ flexGrow: 1 }}
            data={items}
            keyExtractor={(item: Highlight) => item.id}
            onDragEnd={({ data }: { data: Highlight[] }) => { setItems(data); persistOrder(data); }}
            renderItem={({ item: h, drag, isActive }: RenderItemParams<Highlight>) => (
              <TouchableOpacity
                onLongPress={drag}
                activeOpacity={0.9}
                style={[styles.itemCard, isActive && { backgroundColor: '#F3F4F6' }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{h.title || 'Untitled'}</Text>
                  <Text style={styles.itemMeta}>{h.post_id ? 'Post highlight' : 'Highlight'}</Text>
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => toggleField(h.id, 'visible')}>
                    {h.visible ? <Eye size={18} color="#111827" /> : <EyeOff size={18} color="#111827" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => toggleField(h.id, 'pinned')}>
                    {h.pinned ? <Pin size={18} color="#111827" /> : <PinOff size={18} color="#111827" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => { setDraft({ id: h.id, title: h.title || '', visible: !!h.visible, pinned: !!h.pinned }); setShowEditModal(true); }}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(h.id)}>
                    <Trash size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={{ height: 8 }} />
          <Text style={styles.noteText}>Add new highlights from your post grid (tap a post → Add to highlights) or when creating a post.</Text>
          {!canAddMore && (
            <Text style={styles.noteText}>You have 12 visible highlights. Hide one to make space for another visible highlight.</Text>
          )}
        </View>
      )}

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit highlight</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Travel, Awards, Projects"
              value={draft.title as string}
              onChangeText={(t) => setDraft({ ...draft, title: t })}
            />

            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setDraft({ ...draft, visible: !(draft.visible !== false) })}>
                {(draft.visible !== false) ? <Eye size={16} color="#111827" /> : <EyeOff size={16} color="#111827" />}
                <Text style={styles.toggleText}>{(draft.visible !== false) ? 'Visible' : 'Hidden'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setDraft({ ...draft, pinned: !draft.pinned })}>
                {draft.pinned ? <Pin size={16} color="#111827" /> : <PinOff size={16} color="#111827" />}
                <Text style={styles.toggleText}>{draft.pinned ? 'Pinned' : 'Not pinned'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.primaryBtn} onPress={async () => { await editItem(draft.id as string, {
                title: (draft.title || '') as string,
                visible: draft.visible !== false,
                pinned: !!draft.pinned,
              }); setShowEditModal(false); }}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', marginTop: 8 }}>Saving…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  headerTitle: { fontSize: 18, color: '#111827', fontFamily: 'Inter-SemiBold' },
  loadingBox: { padding: 20 },
  emptyText: { textAlign: 'center', color: '#6B7280', fontFamily: 'Inter-Regular' },

  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF' },
  itemTitle: { fontSize: 14, color: '#111827', fontFamily: 'Inter-SemiBold' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  editBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EEF2FF' },
  editText: { color: '#1D4ED8', fontFamily: 'Inter-SemiBold' },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },

  addButton: { marginTop: 8, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  noteText: { color: '#6B7280', marginTop: 6, fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  kindPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F3F4F6' },
  kindPillActive: { backgroundColor: '#DBEAFE' },
  kindPillText: { color: '#111827', fontSize: 12, fontFamily: 'Inter-SemiBold' },
  kindPillTextActive: { color: '#1D4ED8' },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6' },
  toggleText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'flex-end' },
  primaryBtn: { backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  secondaryBtnText: { color: '#111827', fontFamily: 'Inter-SemiBold' },

  savingOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.9)' },
  // Preview styles
  previewCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 10 },
  previewHeader: { paddingHorizontal: 12, paddingBottom: 6 },
  previewTitle: { fontSize: 14, color: '#111827', fontFamily: 'Inter-SemiBold' },
  previewHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  previewList: { paddingHorizontal: 12, gap: 16 },
  previewItem: { alignItems: 'center', width: 70 },
  previewImageContainer: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', marginBottom: 6, borderWidth: 1, borderColor: '#DBDBDB' },
  previewImage: { width: '100%', height: '100%' },
  previewItemTitle: { fontSize: 12, color: '#000000', textAlign: 'center', fontFamily: 'Inter-Regular' },
});
