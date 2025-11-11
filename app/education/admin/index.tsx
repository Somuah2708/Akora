import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Search, ShieldCheck, ShieldOff, Edit3, Trash2, RefreshCw, GraduationCap, Award } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

type Tab = 'universities' | 'scholarships';

type EduItem = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  category_name: string; // 'Universities' | 'Scholarships'
  is_approved?: boolean;
  created_at?: string;
  location?: string;
};

export default function EducationAdminScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('universities');
  const [items, setItems] = useState<EduItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const isAdmin = !!(profile?.is_admin || profile?.role === 'admin');

  useEffect(() => {
    if (!isAdmin) return;
    fetchItems();
  }, [activeTab, isAdmin]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const category = activeTab === 'universities' ? 'Universities' : 'Scholarships';
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('category_name', category)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data as EduItem[] || []);
    } catch (e) {
      console.error('Error loading items', e);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.location || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleDelete = async (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to permanently delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setBusyId(id);
          const { error } = await supabase
            .from('products_services')
            .delete()
            .eq('id', id);
          if (error) throw error;
          setItems(prev => prev.filter(it => it.id !== id));
        } catch (e) {
          console.error('Delete failed', e);
          Alert.alert('Error', 'Failed to delete');
        } finally {
          setBusyId(null);
        }
      }}
    ]);
  };

  const toggleApproval = async (item: EduItem) => {
    try {
      setBusyId(item.id);
      const { error } = await supabase
        .from('products_services')
        .update({ is_approved: !item.is_approved })
        .eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, is_approved: !item.is_approved } : it));
    } catch (e) {
      console.error('Approval toggle failed', e);
      Alert.alert('Error', 'Failed to update approval');
    } finally {
      setBusyId(null);
    }
  };

  const goEdit = (id: string) => {
    router.push(`/edit-listing/${id}` as any);
  };

  const goAdd = () => {
    router.push('/create-educational-listing');
  };

  if (!fontsLoaded) return null;

  if (!user || !isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Education Admin</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.notice}>Not authorized. Admin access required.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Education Admin</Text>
        <TouchableOpacity onPress={goAdd} style={styles.iconButton}>
          <Plus size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('universities')} style={[styles.tab, activeTab==='universities' && styles.tabActive]}>
          <GraduationCap size={18} color={activeTab==='universities' ? '#FFFFFF' : '#4169E1'} />
          <Text style={[styles.tabText, activeTab==='universities' && styles.tabTextActive]}>Universities</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('scholarships')} style={[styles.tab, activeTab==='scholarships' && styles.tabActive]}>
          <Award size={18} color={activeTab==='scholarships' ? '#FFFFFF' : '#4169E1'} />
          <Text style={[styles.tabText, activeTab==='scholarships' && styles.tabTextActive]}>Scholarships</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={fetchItems} style={styles.refresh}>
          <RefreshCw size={18} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={18} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading {activeTab}...</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No {activeTab} found</Text>
              <Text style={styles.emptyText}>Add new or adjust your filters.</Text>
            </View>
          ) : (
            filtered.map(item => (
              <View key={item.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                  <Text style={styles.itemSub} numberOfLines={2}>{item.description || 'No description'}</Text>
                  <Text style={styles.itemMeta}>{item.category_name} • {item.is_approved ? 'Approved' : 'Pending'}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.iconAction} onPress={() => toggleApproval(item)} disabled={busyId===item.id}>
                    {item.is_approved ? (
                      <ShieldOff size={20} color="#FF3B30" />
                    ) : (
                      <ShieldCheck size={20} color="#34C759" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconAction} onPress={() => goEdit(item.id)}>
                    <Edit3 size={20} color="#4169E1" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconAction} onPress={() => handleDelete(item.id)} disabled={busyId===item.id}>
                    <Trash2 size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  tabActive: { backgroundColor: '#4169E1' },
  tabText: { color: '#4169E1', fontFamily: 'Inter-SemiBold' },
  tabTextActive: { color: '#FFFFFF' },
  refresh: { marginLeft: 'auto', padding: 8 },
  searchRow: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  list: { flex: 1, paddingHorizontal: 16, marginTop: 16 },
  loadingBox: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 8, color: '#666' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  emptyText: { color: '#666', marginTop: 4 },
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF4',
  },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  itemSub: { fontSize: 14, color: '#555', marginTop: 4 },
  itemMeta: { fontSize: 12, color: '#888', marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconAction: { padding: 6 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notice: { color: '#666' },
});
