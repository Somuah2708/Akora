import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Types

type Status = 'pending' | 'payment_provided' | 'processing' | 'ready' | 'delivered' | 'rejected';

type Transcript = {
  id: string;
  user_id: string;
  request_type: 'official' | 'unofficial';
  purpose: string;
  recipient_email: string;
  status: Status;
  payment_proof_url?: string | null;
  document_url?: string | null;
  admin_notes?: string | null;
  created_at?: string;
};

type Profile = { id: string; role?: string | null };

const statusColors: Record<Status, string> = {
  pending: '#9CA3AF',
  payment_provided: '#2563EB',
  processing: '#8B5CF6',
  ready: '#1D4ED8',
  delivered: '#059669',
  rejected: '#DC2626',
};

const quickStatuses: Status[] = ['processing', 'ready', 'delivered', 'rejected'];

export default function AdminTranscriptsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Transcript[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('payment_provided');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [docDrafts, setDocDrafts] = useState<Record<string, string>>({});

  const fetchRole = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();
    if (error) { console.error('profile load', error); return; }
    setRole((data as Profile)?.role ?? null);
  }, [user]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      let q = supabase.from('transcript_requests').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data as Transcript[]) || []);
    } catch (err) {
      console.error('load transcripts admin', err);
      Alert.alert('Error', 'Failed to load transcript requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRole(); }, [fetchRole]);
  useEffect(() => { if (role) fetchItems(); }, [fetchItems, role]);

  const notAdmin = !user || !(role === 'admin' || role === 'staff');

  const updateStatus = async (id: string, status: Status) => {
    try {
      setSavingId(id);
      const { data: updated, error } = await supabase
        .from('transcript_requests')
        .update({ status })
        .eq('id', id)
        .select('id,user_id,request_type,purpose,recipient_email,status')
        .single();
      if (error) throw error;
      // Fire a lightweight in-app notification to the requester
      if (updated && updated.user_id) {
        const title = 'Transcript status updated';
        const body = `${updated.request_type === 'official' ? 'Official' : 'Unofficial'} transcript is now ${String(status).replace('_',' ')}`;
        await supabase.from('app_notifications').insert({ user_id: updated.user_id, title, body });
      }
      await fetchItems();
    } catch (err) {
      console.error('update status', err);
      Alert.alert('Error', 'Could not update status.');
    } finally {
      setSavingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    try {
      setSavingId(id);
      const notes = notesDrafts[id] ?? '';
      const { error } = await supabase.from('transcript_requests').update({ admin_notes: notes }).eq('id', id);
      if (error) throw error;
      await fetchItems();
      Alert.alert('Saved', 'Admin notes updated.');
    } catch (err) {
      console.error('save notes', err);
      Alert.alert('Error', 'Could not save notes.');
    } finally {
      setSavingId(null);
    }
  };

  const saveDocumentUrl = async (id: string) => {
    try {
      setSavingId(id);
      const url = docDrafts[id]?.trim() || null;
      const { error } = await supabase.from('transcript_requests').update({ document_url: url }).eq('id', id);
      if (error) throw error;
      await fetchItems();
      Alert.alert('Saved', 'Document URL updated.');
    } catch (err) {
      console.error('save doc', err);
      Alert.alert('Error', 'Could not save document URL.');
    } finally {
      setSavingId(null);
    }
  };

  if (notAdmin) {
    return (
      <View style={styles.center}> 
        <Text style={styles.title}>Admin Access Required</Text>
        <Text style={styles.subtitle}>You must be an admin or staff to manage transcript requests.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transcripts Admin</Text>
        <Text style={styles.subtitle}>Filter</Text>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {(['all','pending','payment_provided','processing','ready','delivered','rejected'] as (Status|'all')[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.filterPill, filter===s && styles.filterPillActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.filterText, filter===s && styles.filterTextActive]}>{String(s).replace('_',' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((it) => (
            <View key={it.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{it.request_type === 'official' ? 'Official' : 'Unofficial'} Transcript</Text>
                <Text style={styles.cardSub}>{it.purpose}</Text>
                <Text style={styles.cardSubSmall}>To: {it.recipient_email}</Text>
                <Text style={styles.cardSubSmall}>Ref: {it.id.slice(0,8)}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColors[it.status] }]}>
                {it.status === 'delivered' ? <CheckCircle2 size={14} color="#fff" /> : (it.status === 'rejected' ? <XCircle size={14} color="#fff" /> : <Clock size={14} color="#fff" />)}
                <Text style={styles.statusText}>{it.status.replace('_',' ')}</Text>
              </View>

              <View style={styles.rowGap} />

              <View style={styles.actionsRow}>
                {quickStatuses.map((s) => (
                  <TouchableOpacity key={s} style={[styles.smallBtn, savingId===it.id && { opacity: 0.6 }]} onPress={() => updateStatus(it.id, s)} disabled={savingId===it.id}>
                    <Text style={styles.smallBtnText}>{s.replace('_',' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowGap} />

              <Text style={styles.label}>Admin Notes</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add notes for this request"
                multiline
                value={notesDrafts[it.id] ?? (it.admin_notes ?? '')}
                onChangeText={(v) => setNotesDrafts((d) => ({ ...d, [it.id]: v }))}
              />
              <TouchableOpacity style={[styles.saveBtn, savingId===it.id && { opacity: 0.6 }]} onPress={() => saveNotes(it.id)} disabled={savingId===it.id}>
                <Text style={styles.saveText}>Save Notes</Text>
              </TouchableOpacity>

              <View style={styles.rowGap} />

              <Text style={styles.label}>Document URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                autoCapitalize="none"
                value={docDrafts[it.id] ?? (it.document_url ?? '')}
                onChangeText={(v) => setDocDrafts((d) => ({ ...d, [it.id]: v }))}
              />
              <TouchableOpacity style={[styles.saveBtn, savingId===it.id && { opacity: 0.6 }]} onPress={() => saveDocumentUrl(it.id)} disabled={savingId===it.id}>
                <Text style={styles.saveText}>Save Document URL</Text>
              </TouchableOpacity>
            </View>
          ))}
          {items.length === 0 && (
            <View style={styles.center}><Text>No requests for this filter.</Text></View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filters: { paddingHorizontal: 12, paddingBottom: 8 },
  filterPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', marginRight: 8 },
  filterPillActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  filterText: { color: '#374151' },
  filterTextActive: { color: '#3730A3', fontWeight: '700' },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { marginTop: 2, fontSize: 13, color: '#374151' },
  cardSubSmall: { marginTop: 2, fontSize: 12, color: '#6B7280' },
  statusPill: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#EEF2FF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  smallBtnText: { color: '#111827', fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },
  rowGap: { height: 10 },
  label: { fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 6 },
  textArea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#fff', minHeight: 80, padding: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#fff', padding: 10 },
  saveBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
