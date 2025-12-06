import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Send, Plus, X, Upload, DollarSign, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { resolveRecommendationPrice, formatPrice } from '@/config/academicPricing';
import { pickDocument } from '@/lib/media';
import { uploadEvidenceFiles } from '@/lib/evidence';
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
  // Identity fields
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [indexNumber, setIndexNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  // Teachers list & activities description
  const [teacherInput, setTeacherInput] = useState('');
  const [teachers, setTeachers] = useState<string[]>([]);
  const [activities, setActivities] = useState('');
  // Evidence documents (multi-file)
  const [evidenceFiles, setEvidenceFiles] = useState<{ uri: string; name?: string; mimeType?: string }[]>([]);
  // Pricing (currently free)
  const price = resolveRecommendationPrice();

  if (!user) {
    return (
      <View style={styles.center}>        
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>Please sign in to request a recommendation.</Text>
      </View>
    );
  }

  const validate = () => {
    if (!fullName.trim()) { Alert.alert('Missing full name', 'Provide your full name.'); return false; }
  if (!className.trim()) { Alert.alert('Missing class', 'Provide your class.'); return false; }
  if (!phoneNumber.trim()) { Alert.alert('Missing phone', 'Provide a phone number.'); return false; }
    if (!graduationYear.trim() || !/^[0-9]{4}$/.test(graduationYear.trim())) { Alert.alert('Invalid graduation year', 'Use YYYY format.'); return false; }
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
      // Insert recommendation request with new identity & context fields
      const price_amount = price.amount;
      const price_currency = price.currency;
      const { data, error } = await supabase
        .from('recommendation_requests')
        .insert({
          requester_id: user.id,
          recommender_email: recommenderEmail.trim().toLowerCase(),
          purpose,
          organization_name: organization.trim() || null,
          deadline: deadline.trim() || null,
          context: context.trim() || null,
          status: 'pending',
          full_name: fullName.trim(),
          class_name: className.trim(),
          graduation_year: parseInt(graduationYear.trim(), 10),
          index_number: indexNumber.trim() || null,
          phone_number: phoneNumber.trim(),
          teachers: teachers.length ? teachers : null,
          activities: activities.trim() || null,
          price_amount,
          price_currency,
        })
        .select('id')
        .single();
      if (error) throw error;

      const requestId = data?.id as string;

      // Upload evidence documents if any and patch record with paths array
      if (evidenceFiles.length) {
        const uploaded = await uploadEvidenceFiles(evidenceFiles, user.id, requestId);
        const paths = uploaded.map(u => u.path);
        const { error: upErr } = await supabase
          .from('recommendation_requests')
          .update({ activity_docs: paths })
          .eq('id', requestId);
        if (upErr) throw upErr;
      }
      Alert.alert('Requested', 'Your recommendation request has been created.', [
        { text: 'OK', onPress: () => debouncedRouter.replace('/recommendations') }
      ]);
    } catch (err: any) {
      console.error('Submit recommendation error', err);
      Alert.alert('Error', err?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const addTeacher = () => {
    const t = teacherInput.trim();
    if (!t) return;
    if (teachers.includes(t)) { setTeacherInput(''); return; }
    setTeachers([...teachers, t]);
    setTeacherInput('');
  };

  const removeTeacher = (t: string) => {
    setTeachers(teachers.filter(x => x !== t));
  };

  const handlePickEvidence = async () => {
    try {
      const doc = await pickDocument();
      if (doc) setEvidenceFiles([...evidenceFiles, { uri: doc.uri, name: doc.name, mimeType: doc.mimeType }]);
    } catch (e) {
      console.error('pick evidence error', e);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Request Recommendation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput value={fullName} onChangeText={setFullName} placeholder="Your full name" style={styles.input} />

        <Text style={styles.label}>Class</Text>
        <TextInput value={className} onChangeText={setClassName} placeholder="e.g., Science A" style={styles.input} />

        <Text style={styles.label}>Graduation Year</Text>
        <TextInput value={graduationYear} onChangeText={setGraduationYear} placeholder="YYYY" keyboardType="number-pad" style={styles.input} />

  <Text style={styles.label}>Index Number (optional)</Text>
        <TextInput value={indexNumber} onChangeText={setIndexNumber} placeholder="Index number" style={styles.input} />

  <Text style={styles.label}>Phone Number</Text>
  <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="e.g., 0241234567" keyboardType="phone-pad" style={styles.input} />

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

        <Text style={styles.label}>Teachers (add multiple)</Text>
        <View style={styles.row}>          
          <TextInput value={teacherInput} onChangeText={setTeacherInput} placeholder="Teacher name" style={[styles.input, { flex: 1 }]} />
          <TouchableOpacity onPress={addTeacher} style={styles.smallBtn}>
            <Plus size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        {teachers.length ? (
          <View style={styles.chipsWrap}>
            {teachers.map(t => (
              <View key={t} style={styles.chip}>                
                <Text style={styles.chipText}>{t}</Text>
                <TouchableOpacity onPress={() => removeTeacher(t)} style={styles.chipRemove}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Activities / Achievements</Text>
        <TextInput value={activities} onChangeText={setActivities} placeholder="Clubs, leadership, awards..." style={[styles.input, { minHeight: 80 }]} multiline />

        <Text style={styles.label}>Evidence Documents (optional)</Text>
        <TouchableOpacity onPress={handlePickEvidence} style={styles.pickBtn}>          
          <Upload size={18} color="#4169E1" />
          <Text style={styles.pickText}>Add File (PDF/Image)</Text>
        </TouchableOpacity>
        {evidenceFiles.length ? (
          <View style={styles.filesList}>
            {evidenceFiles.map((f, i) => (
              <View key={i} style={styles.fileRow}>
                <Text style={styles.fileName}>{f.name || f.uri.split('/').pop()}</Text>
                <TouchableOpacity onPress={() => setEvidenceFiles(evidenceFiles.filter((_, idx) => idx !== i))} style={styles.removeFileBtn}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.priceBox}>          
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <DollarSign size={20} color="#1F3B7A" />
            <Text style={styles.priceMain}>Cost of Service: {formatPrice(price)}</Text>
          </View>
          <Text style={styles.priceSub}>Currently free. If a cost is introduced later, payment instructions & proof upload will appear here.</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={async () => { try { await Clipboard.setStringAsync(String(price.amount)); Alert.alert('Copied','Base cost value copied (currently 0).'); } catch { Alert.alert('Copy failed','Please copy manually.'); }}}>
            <Copy size={14} color="#fff" />
            <Text style={styles.copyText}>Copy Cost</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity disabled={submitting} onPress={handleSubmit} style={[styles.submitBtn, submitting && { opacity: 0.7 }]}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
          <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Send Request'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContainer: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  input: { marginTop: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  segmentText: { color: '#111', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  smallBtn: { backgroundColor: '#4169E1', padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4169E1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  chipRemove: { padding: 4 },
  pickBtn: { marginTop: 8, borderWidth: 1, borderColor: '#4169E1', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  pickText: { color: '#4169E1', fontWeight: '600' },
  filesList: { marginTop: 8, gap: 8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0F5FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  fileName: { fontSize: 12, color: '#1F3B7A', flex: 1, marginRight: 8 },
  removeFileBtn: { backgroundColor: '#CC3333', padding: 6, borderRadius: 8 },
  priceBox: { marginTop: 20, backgroundColor: '#EBF3FF', borderWidth: 1.5, borderColor: '#B6D3FF', borderRadius: 14, padding: 16 },
  priceMain: { fontSize: 20, fontWeight: '700', color: '#1F3B7A' },
  priceSub: { marginTop: 8, fontSize: 12, color: '#1F3B7A' },
  copyBtn: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4169E1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  copyText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  submitBtn: { marginTop: 20, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
