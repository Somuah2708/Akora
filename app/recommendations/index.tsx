import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Plus, Clock, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Status = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'submitted';
type Purpose = 'job' | 'scholarship' | 'graduate_school' | 'other';

type RecReq = {
  id: string;
  requester_id: string;
  recommender_id: string | null;
  recommender_email: string;
  purpose: Purpose;
  organization_name?: string | null;
  deadline?: string | null; // DATE
  context?: string | null;
  status: Status;
  created_at?: string;
};

const statusColors: Record<Status, string> = {
  pending: '#999',
  accepted: '#4169E1',
  declined: '#CC3333',
  in_progress: '#A66BFF',
  submitted: '#2E8B57',
};

export default function RecommendationListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<RecReq[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recommendation_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as RecReq[]) || []);
    } catch (err) {
      console.error('Load recommendations failed', err);
      Alert.alert('Error', 'Could not load your recommendation requests.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>Please sign in to view recommendation requests.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommendation Requests</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/recommendations/new')}>
          <Plus size={20} color="#4169E1" />
          <Text style={styles.addText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Users size={36} color="#999" />
          <Text style={styles.emptyTitle}>No recommendation requests yet</Text>
          <Text style={styles.emptySub}>Create a request to invite a recommender.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/recommendations/new')}>
            <Plus size={18} color="#fff" />
            <Text style={styles.ctaText}>Request Recommendation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((it) => (
            <View key={it.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{labelPurpose(it.purpose)}</Text>
                <Text style={styles.cardSub}>To: {it.recommender_email}</Text>
                {it.organization_name ? <Text style={styles.cardSubSmall}>Org: {it.organization_name}</Text> : null}
                {it.deadline ? <Text style={styles.cardSubSmall}>Deadline: {it.deadline}</Text> : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColors[it.status] }]}>
                {it.status === 'submitted' ? <CheckCircle2 size={14} color="#fff" /> : <Clock size={14} color="#fff" />}
                <Text style={styles.statusText}>{it.status.replace('_',' ')}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function labelPurpose(p: Purpose) {
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
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#4169E1' },
  addText: { color: '#4169E1', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  emptySub: { marginTop: 4, fontSize: 13, color: '#666', textAlign: 'center' },
  cta: { marginTop: 16, backgroundColor: '#4169E1', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#F8FAFF', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { marginTop: 2, fontSize: 13, color: '#444' },
  cardSubSmall: { marginTop: 2, fontSize: 12, color: '#666' },
  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
