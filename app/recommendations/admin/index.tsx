import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { supabase, getDisplayName } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Status = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'submitted';

type RecReq = {
  id: string;
  requester_id: string;
  recommender_id: string | null;
  recommender_email: string;
  purpose: 'job' | 'scholarship' | 'graduate_school' | 'other';
  organization_name?: string | null;
  deadline?: string | null;
  context?: string | null;
  status: Status;
  verification_code?: string | null;
  created_at?: string;
  full_name?: string | null;
  class_name?: string | null;
  graduation_year?: number | null;
  index_number?: string | null;
  phone_number?: string | null;
  teachers?: string[] | null;
  activities?: string | null;
  activity_docs?: string[] | null;
  payment_proof_url?: string | null;
  price_amount?: number | null;
  price_currency?: string | null;
};

type Profile = { id: string; role?: string | null };

const statusColors: Record<Status, string> = {
  pending: '#9CA3AF',
  accepted: '#2563EB',
  in_progress: '#8B5CF6',
  submitted: '#059669',
  declined: '#DC2626',
};

const quickStatuses: Status[] = ['accepted', 'in_progress', 'submitted', 'declined'];

export default function AdminRecommendationsScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RecReq[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [signedEvidenceMap, setSignedEvidenceMap] = useState<Record<string, (string | null)[]>>({});

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
      let q = supabase.from('recommendation_requests').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (error) throw error;
      const list = (data as RecReq[]) || [];
      setItems(list);
      for (const r of list) {
        if (r.activity_docs && r.activity_docs.length) {
          try {
            const { data: signedRaw } = await supabase.storage.from('evidence').createSignedUrls(
              r.activity_docs.map(p => ({ path: p, expiresIn: 3600 })) as any
            );
            const urls: (string | null)[] = Array.isArray(signedRaw) ? signedRaw.map((x: any) => x.signedUrl || null) : [];
            setSignedEvidenceMap(m => ({ ...m, [r.id]: urls }));
          } catch (_e) {}
        }
      }
    } catch (err) {
      console.error('load recommendations admin', err);
      Alert.alert('Error', 'Failed to load recommendation requests.');
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
        .from('recommendation_requests')
        .update({ status })
        .eq('id', id)
        .select('id, requester_id, purpose, status')
        .single();
      if (error) throw error;
      // Notify requester
      if (updated && (updated as any).requester_id) {
        const title = 'Recommendation status updated';
        const body = `Your ${String((updated as any).purpose).replace('_',' ')} recommendation is now ${String(status).replace('_',' ')}`;
        await supabase.from('app_notifications').insert({ user_id: (updated as any).requester_id, title, body });
      }
      await fetchItems();
    } catch (err) {
      console.error('update status rec', err);
      Alert.alert('Error', 'Could not update status.');
    } finally {
      setSavingId(null);
    }
  };

  const viewLetter = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('recommendation_letters')
        .select('content, signature_name')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      if (!data) { Alert.alert('No Letter', 'No letter submitted for this request.'); return; }
      Alert.alert('Recommendation Letter', `${data.content}\n\n— ${data.signature_name ?? 'Signature'}`);
    } catch (err) {
      console.error('view letter', err);
      Alert.alert('Error', 'Could not load the letter.');
    }
  };

  const savePrice = async (id: string) => {
    try {
      setSavingId(id);
      const raw = priceDrafts[id];
      const amount = raw ? parseFloat(raw) : NaN;
      if (isNaN(amount)) { Alert.alert('Invalid price', 'Enter a numeric amount.'); return; }
      const { error } = await supabase
        .from('recommendation_requests')
        .update({ price_amount: amount, price_currency: 'GHS' })
        .eq('id', id);
      if (error) throw error;
      await fetchItems();
      Alert.alert('Saved', 'Price updated.');
    } catch (err) {
      console.error('save price rec', err);
      Alert.alert('Error', 'Could not save price.');
    } finally {
      setSavingId(null);
    }
  };

  if (notAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Admin Access Required</Text>
        <Text style={styles.subtitle}>You must be an admin or staff to manage recommendation requests.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommendations Admin</Text>
        <Text style={styles.subtitle}>Filter</Text>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {(['all','pending','accepted','in_progress','submitted','declined'] as (Status|'all')[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.filterPill, filter===s && styles.filterPillActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.filterText, filter===s && styles.filterTextActive]}>{String(s).replace('_',' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#0F172A" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((it) => {
            const identityLine = [getDisplayName(it), it.class_name, it.graduation_year ? `Class of ${it.graduation_year}` : null].filter(Boolean).join(' · ');
            const priceLine = (it.price_currency && typeof it.price_amount === 'number') ? `${it.price_currency} ${it.price_amount}` : '—';
            const evidenceSigned = signedEvidenceMap[it.id];
            return (
              <View key={it.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{labelPurpose(it.purpose)}</Text>
                  {it.organization_name ? <Text style={styles.cardSub}>{it.organization_name}</Text> : null}
                  {it.recommender_email ? <Text style={styles.cardSubSmall}>Recommender: {it.recommender_email}</Text> : null}
                  <Text style={styles.cardSubSmall}>Ref: {it.id.slice(0,8)} · Code: {it.verification_code}</Text>
                  {identityLine ? <Text style={styles.cardMeta}>{identityLine}</Text> : null}
                  {it.index_number ? <Text style={styles.cardMeta}>Index: {it.index_number}</Text> : null}
                  {it.phone_number ? <Text style={styles.cardMeta}>Phone: {it.phone_number}</Text> : null}
                  <Text style={styles.cardPrice}>Cost of Service: {priceLine}</Text>
                  {it.payment_proof_url ? <Text style={styles.cardMeta}>Payment Proof Uploaded</Text> : null}
                  {it.teachers && it.teachers.length ? (
                    <View style={styles.chipsWrap}>
                      {it.teachers.map(t => (
                        <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
                      ))}
                    </View>
                  ) : null}
                  {it.activities ? <Text style={styles.activities}>{it.activities}</Text> : null}
                  {it.activity_docs && it.activity_docs.length ? (
                    <View style={styles.filesList}>
                      {it.activity_docs.map((p, idx) => {
                        const url = evidenceSigned ? evidenceSigned[idx] || p : p;
                        return (
                          <TouchableOpacity key={p} style={styles.fileRow} onPress={() => url && Linking.openURL(url)}>
                            <Text style={styles.fileName}>{p.split('/').pop()}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColors[it.status] }]}>
                  <Text style={styles.statusText}>{it.status.replace('_',' ')}</Text>
                </View>

                <View style={styles.rowGap} />

                <View style={styles.actionsRow}>
                  {quickStatuses.map((s) => (
                    <TouchableOpacity key={s} style={[styles.smallBtn, savingId===it.id && { opacity: 0.6 }]} onPress={() => updateStatus(it.id, s)} disabled={savingId===it.id}>
                      <Text style={styles.smallBtnText}>{s.replace('_',' ')}</Text>
                    </TouchableOpacity>
                  ))}
                  {it.status === 'submitted' && (
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#ECFEFF', borderColor: '#67E8F9' }]} onPress={() => viewLetter(it.id)}>
                      <Text style={[styles.smallBtnText, { color: '#0E7490' }]}>View Letter</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.rowGap} />
                <Text style={styles.label}>Edit Price (GHS)</Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <TextInput
                    style={[styles.input,{flex:1}]}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={priceDrafts[it.id] ?? (it.price_amount?.toString() ?? '')}
                    onChangeText={(v) => setPriceDrafts(d => ({ ...d, [it.id]: v }))}
                  />
                  <TouchableOpacity style={[styles.saveBtn, savingId===it.id && { opacity:0.6 }]} onPress={() => savePrice(it.id)} disabled={savingId===it.id}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {items.length === 0 && (
            <View style={styles.center}><Text>No requests for this filter.</Text></View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function labelPurpose(p: RecReq['purpose']) {
  switch (p) {
    case 'job': return 'Job Recommendation';
    case 'scholarship': return 'Scholarship Recommendation';
    case 'graduate_school': return 'Graduate School Recommendation';
    default: return 'Recommendation';
  }
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
  statusPill: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#EEF2FF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  smallBtnText: { color: '#111827', fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },
  rowGap: { height: 10 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { backgroundColor: '#4169E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  activities: { marginTop: 6, fontSize: 12, color: '#374151' },
  filesList: { marginTop: 8, gap: 6 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F5FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  fileName: { fontSize: 12, color: '#1F3B7A', flex: 1 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#fff', padding: 8, fontSize: 13 },
  saveBtn: { backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  label: { fontSize: 12, color: '#6B7280', marginTop: 8, marginBottom: 6 },
});
