import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock, XCircle, FileText, DollarSign, Settings } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Types

type Status = 'pending' | 'payment_provided' | 'processing' | 'ready' | 'delivered' | 'rejected';

type Transcript = {
  id: string;
  user_id: string;
  request_type: 'official' | 'unofficial';
  request_kind?: 'transcript' | 'wassce' | 'recommendation' | 'proficiency';
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
  // Recommendation specific fields
  recommender_name?: string | null;
  recommender_email?: string | null;
  // Proficiency test specific fields
  test_subject?: string | null;
  test_level?: string | null;
  preferred_test_date?: string | null;
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
  const [kindFilter, setKindFilter] = useState<'all' | 'transcript' | 'wassce' | 'recommendation' | 'proficiency'>('all');
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
      let allItems: Transcript[] = [];

      // Fetch transcripts, WASSCE, and proficiency if needed
      if (kindFilter === 'all' || kindFilter === 'transcript' || kindFilter === 'wassce' || kindFilter === 'proficiency') {
        let q = supabase.from('transcript_requests').select('*').order('created_at', { ascending: false });
        if (filter !== 'all') q = q.eq('status', filter);
        if (kindFilter === 'transcript' || kindFilter === 'wassce' || kindFilter === 'proficiency') {
          q = q.eq('request_kind', kindFilter);
        }
        const { data, error } = await q;
        if (error) throw error;
        allItems = [...allItems, ...(data as Transcript[]) || []];
      }

      // Fetch recommendations if needed
      if (kindFilter === 'all' || kindFilter === 'recommendation') {
        let q = supabase.from('recommendation_requests').select('*').order('created_at', { ascending: false });
        if (filter !== 'all') q = q.eq('status', filter);
        const { data, error } = await q;
        if (error) throw error;
        // Normalize recommendation data to match Transcript type
        const recommendations = (data || []).map((rec: any) => ({
          ...rec,
          request_kind: 'recommendation' as const,
          request_type: 'official' as const, // Recommendations don't have this field
        }));
        allItems = [...allItems, ...recommendations];
      }

      // Sort by created_at descending
      allItems.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setItems(allItems);

      // Preload signed payment proof URLs
      for (const r of allItems) {
        if (r.payment_proof_url) {
          try {
            const { data: signed } = await supabase.storage.from('proofs').createSignedUrl(r.payment_proof_url, 3600);
            setSignedProofMap(m => ({ ...m, [r.id]: signed?.signedUrl || null }));
          } catch (_e) {}
        }
      }
    } catch (err) {
      console.error('load requests admin', err);
      Alert.alert('Error', 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [filter, kindFilter]);

  useEffect(() => { fetchRole(); }, [fetchRole]);
  useEffect(() => { if (role) fetchItems(); }, [fetchItems, role]);

  const notAdmin = !user || !(role === 'admin' || role === 'staff');

  const updateStatus = async (id: string, status: Status) => {
    try {
      setSavingId(id);
      const item = items.find(i => i.id === id);
      const tableName = item?.request_kind === 'recommendation' ? 'recommendation_requests' : 'transcript_requests';
      
      const { data: updated, error } = await supabase
        .from(tableName)
        .update({ status })
        .eq('id', id)
        .select('id,user_id,purpose,recipient_email,status')
        .single();
      if (error) throw error;
      // Fire a lightweight in-app notification to the requester
      if (updated && updated.user_id) {
        const requestType = item?.request_kind === 'recommendation' 
          ? 'Recommendation'
          : item?.request_kind === 'wassce'
          ? 'WASSCE certificate'
          : item?.request_kind === 'proficiency'
          ? 'Proficiency test'
          : `${item?.request_type === 'official' ? 'Official' : 'Unofficial'} transcript`;
        const title = 'Request status updated';
        const body = `${requestType} is now ${String(status).replace('_',' ')}`;
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
      const item = items.find(i => i.id === id);
      const tableName = item?.request_kind === 'recommendation' ? 'recommendation_requests' : 'transcript_requests';
      const notes = notesDrafts[id] ?? '';
      const { error } = await supabase.from(tableName).update({ admin_notes: notes }).eq('id', id);
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
      const item = items.find(i => i.id === id);
      const tableName = item?.request_kind === 'recommendation' ? 'recommendation_requests' : 'transcript_requests';
      const url = docDrafts[id]?.trim() || null;
      const { error } = await supabase.from(tableName).update({ document_url: url }).eq('id', id);
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
      const item = items.find(i => i.id === id);
      const tableName = item?.request_kind === 'recommendation' ? 'recommendation_requests' : 'transcript_requests';
      const raw = priceDrafts[id];
      const amount = raw ? parseFloat(raw) : NaN;
      if (isNaN(amount)) { Alert.alert('Invalid price', 'Enter a numeric amount.'); return; }
      const { error } = await supabase.from(tableName).update({ price_amount: amount, price_currency: 'GHS' }).eq('id', id);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Manage academic requests</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/transcripts/admin/settings')}
        >
          <Settings size={20} color="#4169E1" />
        </TouchableOpacity>
        <View style={styles.badge}>
          <FileText size={16} color="#4169E1" />
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {(['all','pending','payment_provided','processing','ready','delivered','rejected'] as (Status|'all')[]).map((s) => (
            <TouchableOpacity key={s} style={[styles.filterPill, filter===s && styles.filterPillActive]} onPress={() => setFilter(s)}>
              <Text style={[styles.filterText, filter===s && styles.filterTextActive]}>{String(s).replace('_',' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Type Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Request Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {(['all','transcript','wassce','proficiency','recommendation'] as ('all'|'transcript'|'wassce'|'proficiency'|'recommendation')[]).map((k) => (
            <TouchableOpacity key={k} style={[styles.filterPill, kindFilter===k && styles.filterPillActive]} onPress={() => setKindFilter(k)}>
              <Text style={[styles.filterText, kindFilter===k && styles.filterTextActive]}>
                {k==='all' ? 'All Types' : (k==='transcript' ? 'Transcripts' : k==='wassce' ? 'WASSCE' : k==='proficiency' ? 'Proficiency' : 'Recommendations')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((it) => {
            const title = it.request_kind === 'recommendation'
              ? 'Recommendation Letter'
              : it.request_kind === 'wassce'
              ? 'WASSCE Certificate'
              : it.request_kind === 'proficiency'
              ? 'Proficiency Test'
              : `${it.request_type === 'official' ? 'Official' : 'Unofficial'} Transcript`;
            const identityLine = it.request_kind === 'recommendation'
              ? [it.full_name, `For: ${it.recipient_email}`].filter(Boolean).join(' · ')
              : [it.full_name, it.class_name, it.graduation_year ? `Class of ${it.graduation_year}` : null]
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
                
                {/* Proficiency Test Specific Info */}
                {it.request_kind === 'proficiency' && (
                  <>
                    {it.test_subject ? <Text style={styles.cardMeta}>Subject: {it.test_subject}</Text> : null}
                    {it.test_level ? <Text style={styles.cardMeta}>Level: {it.test_level}</Text> : null}
                    {it.preferred_test_date ? <Text style={styles.cardMeta}>Preferred Date: {it.preferred_test_date}</Text> : null}
                  </>
                )}
                
                {/* Price Display */}
                <View style={styles.priceRow}>
                  <DollarSign size={14} color="#1F3B7A" />
                  <Text style={styles.cardPrice}>{priceLine}</Text>
                </View>

                {/* Status Badge */}
                <View style={[styles.statusPill, { backgroundColor: statusColors[it.status] }]}>
                  {it.status === 'delivered' ? <CheckCircle2 size={14} color="#fff" /> : (it.status === 'rejected' ? <XCircle size={14} color="#fff" /> : <Clock size={14} color="#fff" />)}
                  <Text style={styles.statusText}>{it.status.replace('_',' ')}</Text>
                </View>

                {/* Payment Proof Button */}
                {it.payment_proof_url ? (
                  <TouchableOpacity style={styles.proofBtn} onPress={() => {
                    const url = signedProofMap[it.id] || it.payment_proof_url!;
                    if (url) {
                      Alert.alert('Payment Proof', 'Open payment proof in browser?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open', onPress: () => Linking.openURL(url) }
                      ]);
                    }
                  }}>
                    <Text style={styles.proofText}>📎 View Payment Proof</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Quick Actions Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                  {quickStatuses.map((s) => (
                    <TouchableOpacity 
                      key={s} 
                      style={[
                        styles.actionBtn, 
                        it.status === s && styles.actionBtnActive,
                        savingId===it.id && { opacity: 0.6 }
                      ]} 
                      onPress={() => updateStatus(it.id, s)} 
                      disabled={savingId===it.id}
                    >
                      <Text style={[styles.actionBtnText, it.status === s && styles.actionBtnTextActive]}>
                        {s.replace('_',' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Management Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price (GHS)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyLabel}>GHS</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={priceDrafts[it.id] ?? (it.price_amount?.toString() ?? '')}
                      onChangeText={(v) => setPriceDrafts((d) => ({ ...d, [it.id]: v }))}
                    />
                  </View>
                  <TouchableOpacity 
                    style={[styles.primaryBtn, savingId===it.id && { opacity:0.6 }]} 
                    onPress={() => savePrice(it.id)} 
                    disabled={savingId===it.id}
                  >
                    {savingId===it.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Admin Notes Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Admin Notes</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Add internal notes about this request..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={notesDrafts[it.id] ?? (it.admin_notes ?? '')}
                  onChangeText={(v) => setNotesDrafts((d) => ({ ...d, [it.id]: v }))}
                />
                <TouchableOpacity 
                  style={[styles.secondaryBtn, savingId===it.id && { opacity: 0.6 }]} 
                  onPress={() => saveNotes(it.id)} 
                  disabled={savingId===it.id}
                >
                  {savingId===it.id ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Save Notes</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Document URL Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Document URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://drive.google.com/..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={docDrafts[it.id] ?? (it.document_url ?? '')}
                  onChangeText={(v) => setDocDrafts((d) => ({ ...d, [it.id]: v }))}
                />
                <TouchableOpacity 
                  style={[styles.secondaryBtn, savingId===it.id && { opacity: 0.6 }]} 
                  onPress={() => saveDocumentUrl(it.id)} 
                  disabled={savingId===it.id}
                >
                  {savingId===it.id ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Save Document URL</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )})}
          {items.length === 0 && (
            <View style={styles.center}><Text>No requests for this filter.</Text></View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F3F4F6' 
  },
  
  // Header
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: { 
    fontSize: 14, 
    color: '#6B7280',
    marginTop: 2
  },
  settingsButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4169E1'
  },
  
  // Filters
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8
  },
  filterPill: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    backgroundColor: '#fff'
  },
  filterPillActive: { 
    backgroundColor: '#4169E1', 
    borderColor: '#4169E1' 
  },
  filterText: { 
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  filterTextActive: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  
  // Cards
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginHorizontal: 16, 
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  cardSub: { 
    fontSize: 14, 
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 4
  },
  cardSubSmall: { 
    fontSize: 12, 
    color: '#9CA3AF',
    marginBottom: 2
  },
  cardMeta: { 
    fontSize: 12, 
    color: '#6B7280',
    marginTop: 2
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 8
  },
  cardPrice: { 
    fontSize: 14, 
    color: '#1F3B7A', 
    fontWeight: '700'
  },
  statusPill: { 
    alignSelf: 'flex-start', 
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  statusText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  proofBtn: { 
    marginTop: 8, 
    alignSelf: 'flex-start', 
    backgroundColor: '#DBEAFE', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  proofText: { 
    color: '#1E40AF', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  
  // Dividers and Sections
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20
  },
  section: {
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  
  // Actions
  actionsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8
  },
  actionBtn: { 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    minWidth: 100,
    alignItems: 'center'
  },
  actionBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4169E1'
  },
  actionBtnText: { 
    color: '#374151', 
    fontWeight: '600', 
    fontSize: 13, 
    textTransform: 'capitalize' 
  },
  actionBtnTextActive: {
    color: '#4169E1'
  },
  
  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingLeft: 12
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8
  },
  input: { 
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 12,
    fontSize: 14,
    color: '#111827'
  },
  textArea: { 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 10, 
    backgroundColor: '#F9FAFB', 
    minHeight: 100, 
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top'
  },
  
  // Buttons
  primaryBtn: { 
    backgroundColor: '#4169E1', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 14 
  },
  secondaryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  secondaryBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14
  },
  
  // Center
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20
  }
});
