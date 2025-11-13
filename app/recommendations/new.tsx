import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Purpose = 'job' | 'scholarship' | 'graduate_school' | 'other';

export default function NewRecommendationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recommenderEmail, setRecommenderEmail] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('job');
  const [organization, setOrganization] = useState('');
  const [deadline, setDeadline] = useState(''); // YYYY-MM-DD
  const [context, setContext] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <View style={styles.center}>        
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>Please sign in to request a recommendation.</Text>
      </View>
    );
  }

  const validate = () => {
    const email = recommenderEmail.trim();
    if (!email) { Alert.alert('Missing email', 'Please enter the recommender email.'); return false; }
    if (!/.+@.+\..+/.test(email)) { Alert.alert('Invalid email', 'Enter a valid email address.'); return false; }
    if (deadline.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      Alert.alert('Invalid date', 'Deadline must be in YYYY-MM-DD format or left empty.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('recommendation_requests')
        .insert({
          requester_id: user.id,
          recommender_email: recommenderEmail.trim().toLowerCase(),
          purpose,
          organization_name: organization.trim() || null,
          deadline: deadline.trim() || null,
          context: context.trim() || null,
          status: 'pending',
        });
      if (error) throw error;
      Alert.alert('Requested', 'Your recommendation request has been created.', [
        { text: 'OK', onPress: () => router.replace('/recommendations') }
      ]);
    } catch (err: any) {
      console.error('Submit recommendation error', err);
      Alert.alert('Error', err?.message || 'Failed to create request');
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
        <Text style={styles.title}>Request Recommendation</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Recommender Email</Text>
        <TextInput value={recommenderEmail} onChangeText={setRecommenderEmail} placeholder="recommender@example.com" autoCapitalize="none" keyboardType="email-address" style={styles.input} />

        <Text style={styles.label}>Purpose</Text>
        <View style={styles.segment}>
          {(['job','scholarship','graduate_school','other'] as Purpose[]).map(p => (
            <TouchableOpacity key={p} onPress={() => setPurpose(p)} style={[styles.segmentBtn, purpose===p && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, purpose===p && styles.segmentTextActive]}>{labelPurpose(p)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Organization (optional)</Text>
        <TextInput value={organization} onChangeText={setOrganization} placeholder="Company/School" style={styles.input} />

        <Text style={styles.label}>Deadline (optional)</Text>
        <TextInput value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" autoCapitalize="none" style={styles.input} />

        <Text style={styles.label}>Context for Recommender (optional)</Text>
        <TextInput value={context} onChangeText={setContext} placeholder="What should they highlight?" style={[styles.input, { minHeight: 80 }]} multiline />

        <TouchableOpacity disabled={submitting} onPress={handleSubmit} style={[styles.submitBtn, submitting && { opacity: 0.7 }]}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
          <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Send Request'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function labelPurpose(p: Purpose) {
  switch (p) {
    case 'job': return 'Job';
    case 'scholarship': return 'Scholarship';
    case 'graduate_school': return 'Grad School';
    default: return 'Other';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 6 },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666' },
  content: { padding: 16 },
  label: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  input: { marginTop: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  segmentText: { color: '#111', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  submitBtn: { marginTop: 20, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
