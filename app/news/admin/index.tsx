import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit3, Trash2, Save, RefreshCw } from 'lucide-react-native';
import { COUNTRY_OUTLETS } from '@/lib/constants/news-outlets';
import * as ImagePicker from 'expo-image-picker';

type DbNewsOutlet = {
  id: string;
  country_code: string;
  name: string;
  url: string;
  logo?: string | null;
};

export default function NewsOutletsAdmin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const isAdmin = !!(profile?.is_admin || profile?.role === 'admin');
  const authLoading = (typeof user === 'undefined') || (typeof profile === 'undefined');

  const [items, setItems] = useState<DbNewsOutlet[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DbNewsOutlet | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchItems();
  }, [isAdmin]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_outlets')
        .select('id, country_code, name, url, logo')
        .order('country_code');
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.log('news_outlets fetch error', e);
      Alert.alert('Database not ready', 'Please run CREATE_NEWS_OUTLETS_TABLE.sql to enable admin management.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.url.toLowerCase().includes(q) || i.country_code.toLowerCase().includes(q));
  }, [items, query]);

  const seedFromCurated = async () => {
    try {
      // Build a set of existing unique keys to avoid duplicates
      const existing = new Set(items.map(i => `${i.country_code.toLowerCase()}|${i.name.toLowerCase()}`));
      const toInsert: Partial<DbNewsOutlet>[] = [];
      COUNTRY_OUTLETS.forEach(c => {
        c.outlets.forEach(o => {
          const key = `${c.countryCode.toLowerCase()}|${o.name.toLowerCase()}`;
          if (!existing.has(key)) {
            toInsert.push({ country_code: c.countryCode.toLowerCase(), name: o.name, url: o.url, logo: o.logo || null } as any);
          }
        });
      });
      if (toInsert.length === 0) {
        Alert.alert('Nothing to seed', 'Database already contains curated outlets.');
        return;
      }
      // Insert in chunks to avoid payload limits
      const chunkSize = 200;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('news_outlets').insert(chunk);
        if (error) throw error;
      }
      await fetchItems();
      Alert.alert('Seeded', `Inserted ${toInsert.length} outlets from curated list.`);
    } catch (e) {
      console.log('seed error', e);
      Alert.alert('Seed failed', 'Could not seed curated outlets. Check console for details.');
    }
  };

  const openModal = (outlet?: DbNewsOutlet) => {
    if (outlet) {
      setEditing(outlet);
      setCountryCode(outlet.country_code);
      setName(outlet.name);
      setUrl(outlet.url);
      setLogo(outlet.logo || '');
    } else {
      setEditing(null);
      setCountryCode('');
      setName('');
      setUrl('');
      setLogo('');
    }
    setModalVisible(true);
  };

  const saveItem = async () => {
    if (!countryCode || !name || !url) {
      Alert.alert('Missing fields', 'Country code, name, and URL are required.');
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase
          .from('news_outlets')
          .update({ country_code: countryCode.toLowerCase(), name, url, logo: logo || null })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('news_outlets')
          .insert({ country_code: countryCode.toLowerCase(), name, url, logo: logo || null });
        if (error) throw error;
      }
      setModalVisible(false);
      fetchItems();
    } catch (e) {
      console.log('save outlet error', e);
      Alert.alert('Save failed', 'Could not save outlet. Check console for details.');
    }
  };

  const deleteItem = async (id: string) => {
    Alert.alert('Delete outlet', 'Are you sure you want to delete this outlet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('news_outlets').delete().eq('id', id);
            if (error) throw error;
            fetchItems();
          } catch (e) {
            console.log('delete outlet error', e);
            Alert.alert('Delete failed', 'Could not delete outlet.');
          }
        }
      }
    ]);
  };

  const pickAndUploadLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a logo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        // Prefer new API; fallback to old to avoid breaking on older Expo SDKs
        mediaTypes: (ImagePicker as any).MediaType ? [(ImagePicker as any).MediaType.IMAGE] : (ImagePicker as any).MediaTypeOptions?.Images,
        allowsEditing: true,
        quality: 0.9,
      });
      if (res.canceled) return;
      const asset = (res as any).assets?.[0] || (res as any);
      const uri: string = asset.uri;
      if (!uri) return;

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';
      const fileNameSafe = (name || 'outlet').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const key = `${(countryCode || 'xx').toLowerCase()}/${fileNameSafe}-${Date.now()}.${fileExt}`;

      // React Native fetch on local URIs may not support resp.blob(); use arrayBuffer instead
      const resp = await fetch(uri);
      const arrayBuffer = await resp.arrayBuffer();

      const { error: upErr } = await supabase.storage
        .from('news-logos')
        .upload(key, arrayBuffer as any, { upsert: true, contentType });
      if (upErr) {
        console.log('upload error', upErr);
        Alert.alert('Upload failed', 'Could not upload logo. Ensure a public bucket named "news-logos" exists in Supabase Storage.');
        return;
      }
      const { data } = supabase.storage.from('news-logos').getPublicUrl(key);
      if (data?.publicUrl) {
        setLogo(data.publicUrl);
      } else {
        Alert.alert('URL error', 'Uploaded but could not retrieve public URL. Make the bucket public or use signed URLs.');
      }
    } catch (e) {
      console.log('pick/upload logo error', e);
      Alert.alert('Logo error', 'There was a problem picking or uploading the logo.');
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}> 
        <View style={styles.headerRow}>
          <View style={{ width: 22 }} />
          <Text style={styles.title}>News Outlets Admin</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={styles.notice}>Checking permissions…</Text>
      </View>
    );
  }

  if (!user || !isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={styles.title}>News Outlets Admin</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={styles.notice}>Not authorized. Admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}> 
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.title}>News Outlets Admin</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={fetchItems} style={styles.iconPill} accessibilityLabel="Refresh outlets">
            <RefreshCw size={18} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity onPress={seedFromCurated} style={styles.seedBtn} accessibilityLabel="Seed curated outlets">
            <Text style={styles.seedText}>Seed</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openModal()} style={styles.addBtn} accessibilityLabel="Add outlet">
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, URL, or country code"
        placeholderTextColor="#8E8E93"
        style={styles.search}
        returnKeyType="search"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.url}</Text>
              <Text style={styles.cardMeta}>{item.country_code.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)} style={styles.iconBtn}>
              <Edit3 size={18} color="#1C1C1E" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.iconBtn}>
              <Trash2 size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      />

      {(!loading && items.length === 0) && (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.notice}>No database outlets yet. Use Seed to import the curated list, or Add to create one.</Text>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Outlet' : 'Add Outlet'}</Text>
            <TextInput value={countryCode} onChangeText={setCountryCode} placeholder="Country code (e.g., gh)" placeholderTextColor="#3A3A3C" style={styles.input} />
            <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="#3A3A3C" style={styles.input} />
            <TextInput value={url} onChangeText={setUrl} placeholder="URL (https://...)" autoCapitalize="none" placeholderTextColor="#3A3A3C" style={styles.input} />
            <View style={styles.logoRow}>
              <TextInput value={logo} onChangeText={setLogo} placeholder="Logo URL (optional)" autoCapitalize="none" placeholderTextColor="#3A3A3C" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
              <TouchableOpacity onPress={pickAndUploadLogo} style={styles.uploadBtn} accessibilityLabel="Upload logo image">
                <Text style={styles.uploadText}>Upload</Text>
              </TouchableOpacity>
            </View>
            {!!logo && (
              <View style={styles.logoPreviewWrap}>
                <Image source={{ uri: logo }} style={styles.logoPreview} />
                <Text style={styles.logoHint}>Preview</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: '#E5E5EA' }]}> 
                <Text style={[styles.modalBtnText, { color: '#1C1C1E' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveItem} style={[styles.modalBtn, { backgroundColor: '#007AFF' }]}> 
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  addBtn: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 18,
  },
  iconPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 6,
    borderRadius: 14,
  },
  seedBtn: {
    backgroundColor: '#EFEFF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  seedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardSubtitle: {
    color: '#636366',
    fontSize: 12,
  },
  cardMeta: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  iconBtn: {
    padding: 8,
  },
  notice: {
    color: '#8E8E93',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Added styles for logo upload row and preview
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  uploadBtn: {
    backgroundColor: '#EFEFF4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginLeft: 8,
  },
  uploadText: {
    color: '#1C1C1E',
    fontWeight: '700',
    fontSize: 13,
  },
  logoPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoPreview: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  logoHint: {
    color: '#8E8E93',
    fontSize: 12,
  },
});
