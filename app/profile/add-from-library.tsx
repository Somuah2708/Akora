import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react-native';
import { useToast } from '@/components/Toast';

export default function AddFromLibrary() {
  const router = useRouter();
  const { t } = useLocalSearchParams<{ t?: string }>();
  const { user } = useAuth();
  const groupTitle = useMemo(() => (t ? decodeURIComponent(String(t)) : 'Highlight'), [t]);
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlightOnly, setHighlightOnly] = useState(true);

  const pickAndAdd = async () => {
    try {
      if (!user?.id) return;
      setPicking(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        setPicking(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.9,
      });
      setPicking(false);
      if (result.canceled || !result.assets?.length) return;

      setSaving(true);
      // Upload all selected assets to storage and collect URLs
      const urls: string[] = [];
      for (const asset of result.assets) {
        const uri = asset.uri;
        const name = `hl_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const res = await fetch(uri);
        const blob = await res.blob();
        const filePath = `highlights/${name}`;
        const { error: upErr } = await supabase.storage.from('media').upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('media').getPublicUrl(filePath);
        urls.push(pub.publicUrl);
      }

      // Create a post that aggregates these as slides (hidden if highlightOnly)
      const { data: postData, error: pErr } = await supabase
        .from('posts')
        .insert({ user_id: user.id, content: '', image_urls: urls, is_highlight_only: highlightOnly })
        .select('id')
        .single();
      if (pErr) throw pErr;
      const postId = postData.id as string;

      // Append into this group's highlight as one item per slide
      const { data: currentRows } = await supabase
        .from('profile_highlights')
        .select('order_index')
        .eq('user_id', user.id)
        .eq('title', groupTitle)
        .order('order_index', { ascending: false })
        .limit(1);
      let start = (currentRows && currentRows[0]?.order_index) ?? -1;
      const inserts = urls.map((_, idx) => ({
        user_id: user.id,
        title: groupTitle,
        visible: true,
        pinned: false,
        post_id: postId,
        slide_index: idx,
        order_index: ++start,
      }));
      const { error: iErr } = await supabase.from('profile_highlights').insert(inserts);
      if (iErr) {
        const msg = (iErr as any)?.message || '';
        if (msg.toLowerCase().includes('12') && msg.toLowerCase().includes('visible')) {
          const hidden = inserts.map((it) => ({ ...it, visible: false }));
          const { error: hErr } = await supabase.from('profile_highlights').insert(hidden);
          if (hErr) throw hErr;
          toast.show(`Added ${urls.length} ${urls.length === 1 ? 'image' : 'images'} to ${groupTitle} (hidden due to server limit)`, { type: 'info' });
        } else {
          throw iErr;
        }
      } else {
        toast.show('Highlight added successfully');
      }
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add from library');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add from library</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <Text style={styles.lead}>Highlight only</Text>
          <Switch value={highlightOnly} onValueChange={setHighlightOnly} />
        </View>
        <View style={{ height: 8 }} />
        <Text style={styles.lead}>Select images from your gallery to add into “{groupTitle}”.</Text>
        <TouchableOpacity style={styles.primaryBtn} disabled={picking || saving} onPress={pickAndAdd}>
          <Text style={styles.primaryText}>{saving ? 'Adding…' : 'Choose images'}</Text>
        </TouchableOpacity>
        {(picking || saving) && (
          <View style={{ marginTop: 16 }}><ActivityIndicator /></View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { fontSize: 16, color: '#111827', fontFamily: 'Inter-SemiBold' },
  body: { flex: 1, padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lead: { color: '#374151', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
});
