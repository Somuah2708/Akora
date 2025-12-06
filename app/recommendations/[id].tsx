import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, FileText, CheckCircle2, Clock, Link as LinkIcon, XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getSignedEvidenceUrls } from '@/lib/evidence';
import { formatPrice } from '@/config/academicPricing';
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
  // New identity & context fields
  full_name?: string | null;
  class_name?: string | null;
  graduation_year?: number | null;
  index_number?: string | null;
  teachers?: string[] | null;
  activities?: string | null;
  activity_docs?: string[] | null;
  price_amount?: number | null;
  price_currency?: string | null;
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
  const [signedEvidence, setSignedEvidence] = useState<(string | null)[] | null>(null);

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
      // Resolve signed evidence URLs if present
      if (r.activity_docs && r.activity_docs.length) {
        const signed = await getSignedEvidenceUrls(r.activity_docs);
        setSignedEvidence(signed);
      } else {
        setSignedEvidence(null);
      }

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
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
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
          {/* Status Banner */}
          {req.status === 'pending' && (
            <View style={[styles.statusBanner, { backgroundColor: '#FFF4E6' }]}>
              <Clock size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#F59E0B' }]}>Awaiting Teacher Response</Text>
                <Text style={styles.statusDesc}>
                  Your recommendation request has been sent to the teacher. You'll be notified once they respond.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'accepted' && (
            <View style={[styles.statusBanner, { backgroundColor: '#EFF6FF' }]}>
              <CheckCircle2 size={20} color="#3B82F6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#3B82F6' }]}>Teacher Accepted</Text>
                <Text style={styles.statusDesc}>
                  The teacher has accepted your request and is working on your recommendation letter.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'in_progress' && (
            <View style={[styles.statusBanner, { backgroundColor: '#EFF6FF' }]}>
              <Clock size={20} color="#3B82F6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#3B82F6' }]}>Letter in Progress</Text>
                <Text style={styles.statusDesc}>
                  The teacher is currently writing your recommendation letter. This typically takes 3-5 business days.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'submitted' && (
            <View style={[styles.statusBanner, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={20} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#10B981' }]}>Letter Submitted</Text>
                <Text style={styles.statusDesc}>
                  Your recommendation letter has been completed and is ready for download.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'declined' && (
            <View style={[styles.statusBanner, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={20} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#EF4444' }]}>Request Declined</Text>
                <Text style={styles.statusDesc}>
                  The teacher was unable to fulfill this recommendation request.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.h1}>{req.purpose.replace('_',' ')} Recommendation</Text>
          <Text style={styles.mono}>Ref: {req.id.slice(0,8)} · Code: {req.verification_code}</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Identity</Text>
            <Text style={styles.value}>
              {[req.full_name, req.class_name, req.graduation_year ? `Class of ${req.graduation_year}` : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Text>
            {req.index_number ? <Text style={styles.meta}>Index: {req.index_number}</Text> : null}
          </View>

            <View style={styles.section}>
              <Text style={styles.label}>Pricing</Text>
              <Text style={styles.value}>{req.price_currency && typeof req.price_amount === 'number' ? formatPrice({ amount: req.price_amount, currency: req.price_currency }) : 'Not set'}</Text>
            </View>
          {req.teachers && req.teachers.length ? (
            <View style={styles.section}>
              <Text style={styles.label}>Teachers</Text>
              <View style={styles.chipsWrap}>
                {req.teachers.map(t => (
                  <View key={t} style={styles.chip}>
                    <Text style={styles.chipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {req.activities ? (
            <View style={styles.section}>
              <Text style={styles.label}>Activities / Achievements</Text>
              <Text style={styles.value}>{req.activities}</Text>
            </View>
          ) : null}

          {req.activity_docs && req.activity_docs.length ? (
            <View style={styles.section}>
              <Text style={styles.label}>Evidence Documents</Text>
              <View style={styles.filesList}>
                {req.activity_docs.map((p, i) => {
                  const url = signedEvidence ? signedEvidence[i] || p : p;
                  return (
                    <TouchableOpacity key={p} style={styles.fileRow} onPress={() => url && Linking.openURL(url)}>
                      <LinkIcon size={14} color="#4169E1" />
                      <Text style={styles.fileName}>{p.split('/').pop()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

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
  meta: { marginTop: 4, fontSize: 11, color: '#555' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { backgroundColor: '#4169E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  filesList: { marginTop: 8, gap: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F5FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  fileName: { fontSize: 12, color: '#1F3B7A', flex: 1 },
  timeline: { marginTop: 8, gap: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineText: { fontSize: 13, color: '#333' },
  letterBox: { marginTop: 8, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  letter: { fontSize: 14, lineHeight: 20, color: '#111' },
  signature: { marginTop: 8, fontStyle: 'italic', color: '#444' },
  statusBanner: { marginBottom: 20, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start' },
  statusTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
});
