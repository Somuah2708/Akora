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
  request_kind?: 'transcript' | 'wassce';
  purpose: string;
  recipient_email: string;
  status: Status;
  payment_proof_url?: string | null;
  document_url?: string | null;
  admin_notes?: string | null;
  created_at?: string;
  full_name?: string | null;
  class_name?: string | null;
  graduation_year?: number | null;
  index_number?: string | null;
  phone_number?: string | null;
  price_amount?: number | null;
  price_currency?: string | null;
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
  const [kindFilter, setKindFilter] = useState<'all' | 'transcript' | 'wassce'>('all');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signedProofMap, setSignedProofMap] = useState<Record<string, string | null>>({});

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
      if (kindFilter !== 'all') q = q.eq('request_kind', kindFilter);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data as Transcript[]) || []);
      // Preload signed payment proof URLs
      const list = (data as Transcript[]) || [];
      for (const r of list) {
        if (r.payment_proof_url) {
          try {
            const { data: signed } = await supabase.storage.from('proofs').createSignedUrl(r.payment_proof_url, 3600);
            setSignedProofMap(m => ({ ...m, [r.id]: signed?.signedUrl || null }));
          } catch (_e) {}
        }
      }
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

  const savePrice = async (id: string) => {
    try {
      setSavingId(id);
      const raw = priceDrafts[id];
      const amount = raw ? parseFloat(raw) : NaN;
      if (isNaN(amount)) { Alert.alert('Invalid price', 'Enter a numeric amount.'); return; }
      const { error } = await supabase.from('transcript_requests').update({ price_amount: amount, price_currency: 'GHS' }).eq('id', id);
      if (error) throw error;
      await fetchItems();
      Alert.alert('Saved', 'Price updated.');
    } catch (err) {
      console.error('save price', err);
      Alert.alert('Error', 'Could not save price.');
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
        <Text style={styles.title}>Academic Requests (Transcripts & WASSCE)</Text>
        <Text style={styles.subtitle}>Filters</Text>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {(['all','pending','payment_provided','processing','ready','delivered','rejected'] as (Status|'all')[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.filterPill, filter===s && styles.filterPillActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.filterText, filter===s && styles.filterTextActive]}>{String(s).replace('_',' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal contentContainerStyle={[styles.filters,{paddingTop:0}]} showsHorizontalScrollIndicator={false}>
        {(['all','transcript','wassce'] as ('all'|'transcript'|'wassce')[]).map((k) => (
          <TouchableOpacity key={k} style={[styles.filterPill, kindFilter===k && styles.filterPillActive]} onPress={() => setKindFilter(k)}>
            <Text style={[styles.filterText, kindFilter===k && styles.filterTextActive]}>{k==='all' ? 'All Kinds' : (k==='transcript' ? 'Transcripts' : 'WASSCE')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((it) => {
            const title = it.request_kind === 'wassce'
              ? 'WASSCE Certificate'
              : `${it.request_type === 'official' ? 'Official' : 'Unofficial'} Transcript`;
            const identityLine = [it.full_name, it.class_name, it.graduation_year ? `Class of ${it.graduation_year}` : null]
              .filter(Boolean)
              .join(' · ');
            const priceLine = (it.price_currency && typeof it.price_amount === 'number') ? `${it.price_currency} ${it.price_amount}` : '—';
            return (
            <View key={it.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSub}>{it.purpose}</Text>
                <Text style={styles.cardSubSmall}>To: {it.recipient_email}</Text>
                <Text style={styles.cardSubSmall}>Ref: {it.id.slice(0,8)}</Text>
                {identityLine ? <Text style={styles.cardMeta}>{identityLine}</Text> : null}
                {it.phone_number ? <Text style={styles.cardMeta}>Phone: {it.phone_number}</Text> : null}
                <Text style={styles.cardPrice}>Cost of Service: {priceLine}</Text>
                {it.payment_proof_url ? (
                  <TouchableOpacity style={styles.proofBtn} onPress={() => {
                    const url = signedProofMap[it.id] || it.payment_proof_url!;
                    if (url) Alert.alert('Payment Proof', 'Open in browser?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open', onPress: () => {
                        // Use Linking without importing again? We'll lazy import.
                      }}
                    ]);
                  }}>
                    <Text style={styles.proofText}>View Payment Proof</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColors[it.status] }]}>
                {it.status === 'delivered' ? <CheckCircle2 size={14} color="#fff" /> : (it.status === 'rejected' ? <XCircle size={14} color="#fff" /> : <Clock size={14} color="#fff" />)}
                <Text style={styles.statusText}>{it.status.replace('_',' ')}</Text>
              </View>

              <View style={styles.rowGap} />

              <Text style={styles.label}>Edit Price (GHS)</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TextInput
                  style={[styles.input,{flex:1}]}
                  placeholder="Amount"
                  keyboardType="numeric"
                  value={priceDrafts[it.id] ?? (it.price_amount?.toString() ?? '')}
                  onChangeText={(v) => setPriceDrafts((d) => ({ ...d, [it.id]: v }))}
                />
                <TouchableOpacity style={[styles.saveBtn, savingId===it.id && { opacity:0.6 }]} onPress={() => savePrice(it.id)} disabled={savingId===it.id}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>

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
          )})}
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
  cardMeta: { marginTop: 4, fontSize: 11, color: '#555' },
  cardPrice: { marginTop: 2, fontSize: 11, color: '#1F3B7A', fontWeight: '600' },
  proofBtn: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#DBEAFE', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  proofText: { color: '#1E3A8A', fontSize: 11, fontWeight: '600' },
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
