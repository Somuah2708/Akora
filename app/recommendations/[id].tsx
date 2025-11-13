import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, CheckCircle2, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Status = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'submitted';

type RecommendationRequest = {
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
};

type RecommendationLetter = {
  id: string;
  request_id: string;
  recommender_id: string;
  content: string;
  signature_name?: string | null;
  created_at?: string;
};

const statusLabel: Record<Status, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  in_progress: 'In Progress',
  submitted: 'Submitted',
};

export default function RecommendationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [req, setReq] = useState<RecommendationRequest | null>(null);
  const [letter, setLetter] = useState<RecommendationLetter | null>(null);
  const [loading, setLoading] = useState(true);

  const id = String(params.id);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recommendation_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const r = data as RecommendationRequest;
      // Ensure requester owns it
      if (user && r.requester_id !== user.id) {
        throw new Error('Not authorized');
      }
      setReq(r);

      if (r.status === 'submitted') {
        const { data: letters, error: lerr } = await supabase
          .from('recommendation_letters')
          .select('*')
          .eq('request_id', r.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (lerr) throw lerr;
        setLetter((letters && letters[0]) || null);
      } else {
        setLetter(null);
      }
    } catch (err) {
      console.error('Load recommendation failed', err);
      Alert.alert('Error', 'Unable to load recommendation request.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Recommendation</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : !req ? (
        <View style={styles.center}><Text>Not found</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.h1}>{req.purpose.replace('_',' ')} Recommendation</Text>
          <Text style={styles.mono}>Ref: {req.id.slice(0,8)} · Code: {req.verification_code}</Text>

          {req.organization_name ? (
            <View style={styles.section}>
              <Text style={styles.label}>Organization</Text>
              <Text style={styles.value}>{req.organization_name}</Text>
            </View>
          ) : null}

          {req.deadline ? (
            <View style={styles.section}>
              <Text style={styles.label}>Deadline</Text>
              <Text style={styles.value}>{req.deadline}</Text>
            </View>
          ) : null}

          {req.context ? (
            <View style={styles.section}>
              <Text style={styles.label}>Context</Text>
              <Text style={styles.value}>{req.context}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.timeline}>
              {(['pending','accepted','in_progress','submitted'] as Status[]).map((s) => (
                <View key={s} style={styles.timelineItem}>
                  {(['accepted','in_progress','submitted'].includes(req.status) && ['accepted','in_progress','submitted'].indexOf(req.status as any) >= ['accepted','in_progress','submitted'].indexOf(s as any)) || s==='pending' ? (
                    <CheckCircle2 size={16} color={s === req.status ? '#4169E1' : '#10B981'} />
                  ) : (
                    <Clock size={16} color="#999" />
                  )}
                  <Text style={[styles.timelineText, s === req.status && { color: '#4169E1', fontWeight: '700' }]}>{statusLabel[s]}</Text>
                </View>
              ))}
              {req.status === 'declined' && (
                <View style={styles.timelineItem}><Clock size={16} color="#CC3333" /><Text style={[styles.timelineText,{color:'#CC3333',fontWeight:'700'}]}>Declined</Text></View>
              )}
            </View>
          </View>

          {letter ? (
            <View style={styles.section}>
              <Text style={styles.label}>Submitted Letter</Text>
              <View style={styles.letterBox}>
                <Text style={styles.letter}>{letter.content}</Text>
                {letter.signature_name ? <Text style={styles.signature}>— {letter.signature_name}</Text> : null}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Letter</Text>
              <Text style={styles.value}>Not available yet.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 6 },
  title: { fontSize: 18, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  h1: { fontSize: 18, fontWeight: '700' },
  mono: { marginTop: 4, fontSize: 12, color: '#666' },
  section: { marginTop: 16 },
  label: { fontSize: 13, color: '#666', marginBottom: 4 },
  value: { fontSize: 14 },
  timeline: { marginTop: 8, gap: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineText: { fontSize: 13, color: '#333' },
  letterBox: { marginTop: 8, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  letter: { fontSize: 14, lineHeight: 20, color: '#111' },
  signature: { marginTop: 8, fontStyle: 'italic', color: '#444' },
});
