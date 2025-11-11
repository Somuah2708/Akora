import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit3, Trash2, Save } from 'lucide-react-native';

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

  if (!user || !isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.title}>News Outlets Admin</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addBtn}>
          <Plus size={22} color="#FFFFFF" />
        </TouchableOpacity>
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

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Outlet' : 'Add Outlet'}</Text>
            <TextInput value={countryCode} onChangeText={setCountryCode} placeholder="Country code (e.g., gh)" style={styles.input} />
            <TextInput value={name} onChangeText={setName} placeholder="Name" style={styles.input} />
            <TextInput value={url} onChangeText={setUrl} placeholder="URL (https://...)" autoCapitalize="none" style={styles.input} />
            <TextInput value={logo} onChangeText={setLogo} placeholder="Logo URL (optional)" autoCapitalize="none" style={styles.input} />
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
});
