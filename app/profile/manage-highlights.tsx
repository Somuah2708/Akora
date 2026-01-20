import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Pressable, Image, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trash, Eye, EyeOff, Pin, PinOff, Star } from 'lucide-react-native';
import { useToast } from '@/components/Toast';
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
  caption?: string | null;
};

export default function ManageHighlightsScreen() {
  const router = useRouter();
  const { t } = useLocalSearchParams<{ t?: string }>();
  const groupTitle = useMemo(() => (t ? decodeURIComponent(String(t)) : null), [t]);
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Highlight[]>([]);
  const [postPreview, setPostPreview] = useState<Record<string, { thumb?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);

  // New item draft
  const [draft, setDraft] = useState<Partial<Highlight>>({ title: '', visible: true, pinned: false, caption: '' });
  const [renameTitle, setRenameTitle] = useState<string>(groupTitle || '');

  // Cross-platform confirm helper (Alert on native, confirm on web)
  const confirmAsync = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      try {
        // eslint-disable-next-line no-alert
        const ok = typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false;
        return Promise.resolve(!!ok);
      } catch {
        return Promise.resolve(false);
      }
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  useEffect(() => {
    if (user?.id) {
      load();
    }
  }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      let query = supabase
        .from('profile_highlights')
        .select('id,user_id,title,order_index,visible,pinned,post_id,slide_index,caption')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('order_index', { ascending: true });
      if (groupTitle) query = query.eq('title', groupTitle);
      const { data, error } = await query;
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

      // Load custom cover for this group, if any
      if (groupTitle) {
        try {
          const { data: coverRows, error: cErr } = await supabase
            .from('profile_highlight_covers')
            .select('cover_url')
            .eq('user_id', user.id)
            .eq('title', groupTitle);
          if (!cErr && Array.isArray(coverRows) && coverRows.length > 0) {
            setCoverUrl(coverRows[0]?.cover_url || null);
          } else {
            setCoverUrl(null);
          }
        } catch {}
      } else {
        setCoverUrl(null);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load highlights');
    } finally {
      setLoading(false);
    }
  };

  // No hard limit on visible highlights anymore

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
      toast.show('Order saved', { type: 'success' });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save order');
      load();
    } finally {
      setSaving(false);
    }
  };

  const pickAndSetCover = async () => {
    try {
      if (!user?.id || !groupTitle) return;
      setCoverBusy(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        setCoverBusy(false);
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsMultipleSelection: false,
      });
      if (res.canceled || !res.assets?.length) { setCoverBusy(false); return; }
      const asset = res.assets[0];
      const uri = asset.uri;
      const safeTitle = (groupTitle || 'highlight').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const name = `cover_${user.id}_${safeTitle}_${Date.now()}.jpg`;
      const filePath = `highlight_covers/${user.id}/${name}`;
      const blob = await (await fetch(uri)).blob();
      const { error: upErr } = await supabase.storage.from('media').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('media').getPublicUrl(filePath);
      const url = pub.publicUrl;
      // Upsert cover row
      const { error: upsertErr } = await supabase
        .from('profile_highlight_covers')
        .upsert({ user_id: user.id, title: groupTitle, cover_url: url }, { onConflict: 'user_id,title' } as any);
      if (upsertErr) throw upsertErr;
      setCoverUrl(url);
      toast.show('Cover updated', { type: 'success' });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to set cover');
    } finally {
      setCoverBusy(false);
    }
  };

  const clearCover = async () => {
    if (!user?.id || !groupTitle) return;
    try {
      setCoverBusy(true);
      const { error } = await supabase
        .from('profile_highlight_covers')
        .delete()
        .eq('user_id', user.id)
        .eq('title', groupTitle);
      if (error) throw error;
      setCoverUrl(null);
      toast.show('Cover removed', { type: 'success' });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to remove cover');
    } finally {
      setCoverBusy(false);
    }
  };

  const toggleField = async (id: string, field: 'visible' | 'pinned') => {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const next = [...items];
    const current = next[idx];
    const newVal = !(current as any)[field];
    // Allow unlimited visible items
    (next[idx] as any)[field] = newVal;
    setItems(next);
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profile_highlights')
        .update({ [field]: newVal })
        .eq('id', id);
      if (error) throw error;
      toast.show(`${field === 'visible' ? 'Visibility' : 'Pin'} updated`, { type: 'success' });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update');
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    const ok = await confirmAsync('Delete highlight', 'This cannot be undone. Continue?');
    if (!ok) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('profile_highlights').delete().eq('id', id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      toast.show('Highlight deleted', { type: 'success' });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to delete');
    } finally {
      setSaving(false);
    }
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
      toast.show('Changes saved', { type: 'success' });
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
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupTitle ? `Manage: ${groupTitle}` : 'Manage Highlights'}</Text>
        {groupTitle ? (
          <TouchableOpacity style={styles.backButton} onPress={() => setShowRenameModal(true)}>
            <Text style={{ fontSize: 12, color: '#111827' }}>Rename</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#0F172A" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <DraggableFlatList<Highlight>
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 160 }}
            stickyHeaderIndices={[0]}
            ListHeaderComponent={(
              <View style={{ padding: 16 }}>
                {groupTitle ? (
                  <View style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                      <Text style={styles.previewTitle}>Cover</Text>
                      <Text style={styles.previewHint}>Custom cover shown on your profile for “{groupTitle}”</Text>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 10 }}>
                      <View style={{ width: 96, height: 96, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#DBDBDB', alignSelf: 'flex-start' }}>
                        {coverUrl ? (
                          <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                            <Star size={18} color="#0A84FF" />
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#111827', paddingHorizontal: 12 }]} disabled={coverBusy} onPress={pickAndSetCover}>
                          <Text style={styles.addButtonText}>{coverBusy ? 'Updating…' : (coverUrl ? 'Change cover' : 'Set cover')}</Text>
                        </TouchableOpacity>
                        {coverUrl ? (
                          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#F3F4F6', paddingHorizontal: 12 }]} disabled={coverBusy} onPress={clearCover}>
                            <Text style={[styles.addButtonText, { color: '#111827' }]}>Remove</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : null}
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
                {/* Quick action to add media into this group */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.addButton, { flex: 1 }]}
                    onPress={() => {
                      if (groupTitle) {
                        debouncedRouter.push(`/profile/add-from-library?t=${encodeURIComponent(groupTitle)}` as any);
                      } else {
                        debouncedRouter.push(`/profile/add-from-library`);
                      }
                    }}
                  >
                    <Text style={styles.addButtonText}>Add from library</Text>
                  </TouchableOpacity>
                  {groupTitle ? (
                    <TouchableOpacity
                      style={[styles.addButton, { flex: 1, backgroundColor: '#0A84FF' }]}
                      onPress={() => debouncedRouter.push(`/profile/add-to-highlight?t=${encodeURIComponent(groupTitle)}` as any)}
                    >
                      <Text style={styles.addButtonText}>Add from posts</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={{ height: 12 }} />
              </View>
            )}
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
                  {h.caption ? (
                    <Text style={[styles.itemMeta, { marginTop: 4 }]} numberOfLines={1}>{h.caption}</Text>
                  ) : null}
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => toggleField(h.id, 'visible')}>
                    {h.visible ? <Eye size={18} color="#111827" /> : <EyeOff size={18} color="#111827" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => toggleField(h.id, 'pinned')}>
                    {h.pinned ? <Pin size={18} color="#111827" /> : <PinOff size={18} color="#111827" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => { setDraft({ id: h.id, title: h.title || '', visible: !!h.visible, pinned: !!h.pinned, caption: h.caption || '' }); setShowEditModal(true); }}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(h.id)}>
                    <Trash size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Text style={styles.noteText}>Add new highlights from your post grid (tap a post → Add to highlights) or when creating a post.</Text>
          </View>
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

            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.input}
              placeholder="Add a caption for this item (optional)"
              value={(draft.caption as string) || ''}
              onChangeText={(t) => setDraft({ ...draft, caption: t })}
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
                caption: (draft.caption || '') as string,
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

      {/* Rename group modal */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRenameModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rename highlight group</Text>
            <Text style={styles.label}>New title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Travel"
              value={renameTitle}
              onChangeText={setRenameTitle}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!user?.id || !groupTitle) { setShowRenameModal(false); return; }
                  try {
                    setSaving(true);
                    const { error } = await supabase
                      .from('profile_highlights')
                      .update({ title: renameTitle })
                      .eq('user_id', user.id)
                      .eq('title', groupTitle);
                    if (error) throw error;
                    // Also update custom cover title if present
                    try {
                      await supabase
                        .from('profile_highlight_covers')
                        .update({ title: renameTitle })
                        .eq('user_id', user.id)
                        .eq('title', groupTitle);
                    } catch {}
                    setShowRenameModal(false);
                    // reload and update route
                    await load();
                    debouncedRouter.replace(`/profile/manage-highlights?t=${encodeURIComponent(renameTitle)}` as any);
                    toast.show('Group renamed', { type: 'success' });
                  } catch (e) {
                    Alert.alert('Error', 'Failed to rename group');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowRenameModal(false)}>
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
