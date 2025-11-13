import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, XCircle, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
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
};

export default function RecommenderPortalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [req, setReq] = useState<RecReq | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [letterContent, setLetterContent] = useState('');
  const [signatureName, setSignatureName] = useState('');

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
      setReq(data as RecReq);
    } catch (err) {
      console.error('Load rec request failed', err);
      Alert.alert('Error', 'Unable to load the recommendation request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const canAct = !!user && !!req;
  const hasClaim = !!req?.recommender_id && user?.id === req?.recommender_id;

  const accept = async () => {
    if (!canAct) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('recommendation_requests')
        .update({ recommender_id: user!.id, status: 'accepted' })
        .eq('id', id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error('Accept failed', err);
      Alert.alert('Error', 'Failed to accept.');
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async () => {
    if (!canAct) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('recommendation_requests')
        .update({ recommender_id: user!.id, status: 'declined' })
        .eq('id', id);
      if (error) throw error;
      await load();
      Alert.alert('Declined', 'You declined this request.');
    } catch (err) {
      console.error('Decline failed', err);
      Alert.alert('Error', 'Failed to decline.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLetter = async () => {
    if (!hasClaim) { Alert.alert('Not authorized', 'Please accept the request first.'); return; }
    if (!letterContent.trim()) { Alert.alert('Missing content', 'Please enter the letter content.'); return; }
    if (!signatureName.trim()) { Alert.alert('Missing signature', 'Please enter your name.'); return; }
    setSubmitting(true);
    try {
      const { error: insErr } = await supabase
        .from('recommendation_letters')
        .insert({ request_id: id, recommender_id: user!.id, content: letterContent.trim(), signature_name: signatureName.trim() });
      if (insErr) throw insErr;
      const { error: upErr } = await supabase
        .from('recommendation_requests')
        .update({ status: 'submitted' })
        .eq('id', id);
      if (upErr) throw upErr;
      await load();
      Alert.alert('Submitted', 'Recommendation letter submitted.');
    } catch (err) {
      console.error('Submit letter failed', err);
      Alert.alert('Error', 'Could not submit letter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Recommender Portal</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : !req ? (
        <View style={styles.center}><Text>Not found</Text></View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.h1}>Recommendation Request</Text>
          <Text style={styles.mono}>Ref: {req.id.slice(0,8)} · Code: {req.verification_code}</Text>
          <View style={styles.section}>
            <Text style={styles.label}>Purpose</Text>
            <Text style={styles.value}>{labelPurpose(req.purpose)}</Text>
          </View>
          {req.organization_name ? (
            <View style={styles.section}><Text style={styles.label}>Organization</Text><Text style={styles.value}>{req.organization_name}</Text></View>
          ) : null}
          {req.deadline ? (
            <View style={styles.section}><Text style={styles.label}>Deadline</Text><Text style={styles.value}>{req.deadline}</Text></View>
          ) : null}
          {req.context ? (
            <View style={styles.section}><Text style={styles.label}>Context</Text><Text style={styles.value}>{req.context}</Text></View>
          ) : null}

          {!hasClaim && req.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity disabled={submitting} style={[styles.primaryBtn, submitting && { opacity: 0.7 }]} onPress={accept}>
                <Check size={18} color="#fff" /><Text style={styles.primaryText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={submitting} style={[styles.secondaryBtn, submitting && { opacity: 0.7 }]} onPress={decline}>
                <XCircle size={18} color="#CC3333" /><Text style={styles.secondaryText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasClaim && req.status !== 'declined' && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>Letter Content</Text>
              <TextInput style={[styles.input,{minHeight:120}]} multiline placeholder="Write your recommendation here..." value={letterContent} onChangeText={setLetterContent} />

              <Text style={styles.label}>Your Name (Signature)</Text>
              <TextInput style={styles.input} placeholder="Your full name" value={signatureName} onChangeText={setSignatureName} />

              <TouchableOpacity disabled={submitting} style={[styles.primaryBtn, { marginTop: 16 }, submitting && { opacity: 0.7 }]} onPress={submitLetter}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
                <Text style={styles.primaryText}>{submitting ? 'Submitting...' : 'Submit Letter'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
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
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 6 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 18, fontWeight: '700' },
  mono: { marginTop: 4, fontSize: 12, color: '#666' },
  section: { marginTop: 16 },
  label: { fontSize: 13, color: '#666', marginBottom: 4 },
  value: { fontSize: 14 },
  input: { marginTop: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  primaryBtn: { backgroundColor: '#4169E1', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#FFF5F5', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FBD5D5' },
  secondaryText: { color: '#CC3333', fontWeight: '700' },
});
