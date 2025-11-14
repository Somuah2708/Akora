import { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, FilePlus2, Upload, DollarSign, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickDocument } from '@/lib/media';
import { uploadProofFromUri } from '@/lib/storage';
import { PAYSTACK_REDIRECT_URL, STRIPE_CHECKOUT_URL } from '@/config/payments';
import { resolveTranscriptPrice, resolveWasscePrice, formatPrice } from '@/config/academicPricing';

type RequestType = 'official' | 'unofficial';
type RequestKind = 'transcript' | 'wassce';

export default function NewTranscriptScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // Transcript specific sub-type (official/unofficial)
  const [requestType, setRequestType] = useState<RequestType>('official');
  // Kind: transcript or wassce certificate request
  const [requestKind, setRequestKind] = useState<RequestKind>('transcript');
  const [purpose, setPurpose] = useState('Application Review');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickedProof, setPickedProof] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  // Identity fields
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [graduationYear, setGraduationYear] = useState(''); // store as string then parseInt
  const [indexNumber, setIndexNumber] = useState(''); // optional

  // Derived price based on kind + transcript type
  const price = useMemo(() => {
    if (requestKind === 'transcript') return resolveTranscriptPrice(requestType);
    return resolveWasscePrice('certificate');
  }, [requestKind, requestType]);

  if (!user) {
    return (
      <View style={styles.center}>        
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>Please sign in to request a transcript.</Text>
      </View>
    );
  }

  const validate = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing full name', 'Please provide your full name.');
      return false;
    }
    if (!className.trim()) {
      Alert.alert('Missing class', 'Please provide your class name.');
      return false;
    }
    if (!graduationYear.trim() || !/^[0-9]{4}$/.test(graduationYear.trim())) {
      Alert.alert('Invalid graduation year', 'Enter a 4-digit graduation year.');
      return false;
    }
    if (!purpose.trim()) {
      Alert.alert('Missing purpose', 'Please enter a short purpose.');
      return false;
    }
    const email = recipientEmail.trim();
    if (!email) {
      Alert.alert('Missing recipient', 'Please provide the recipient email.');
      return false;
    }
    const emailOk = /.+@.+\..+/.test(email);
    if (!emailOk) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handlePickProof = async () => {
    try {
      const doc = await pickDocument();
      if (doc) setPickedProof({ uri: doc.uri, name: doc.name, mimeType: doc.mimeType });
    } catch (e) {
      console.error('pick proof error', e);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // 1) Create request (pending by default)
      // NOTE: For WASSCE we still need request_type column (schema) -> default to 'official'
      const effectiveRequestType = requestKind === 'wassce' ? 'official' : requestType;
      const price_amount = price.amount;
      const price_currency = price.currency;
      const { data, error } = await supabase
        .from('transcript_requests')
        .insert({
          user_id: user.id,
          request_kind: requestKind,
          request_type: effectiveRequestType,
          purpose: purpose.trim(),
          recipient_email: recipientEmail.trim(),
          status: 'pending',
          full_name: fullName.trim(),
          class_name: className.trim(),
          graduation_year: parseInt(graduationYear.trim(), 10),
          index_number: indexNumber.trim() || null,
          price_amount,
          price_currency,
        })
        .select('id')
        .single();

      if (error) throw error;

      const id = data?.id as string;

      // 2) Upload proof if picked (to private 'proofs' bucket) and mark payment provided
      if (pickedProof) {
        const { path } = await uploadProofFromUri(pickedProof.uri, user.id);
        const { error: upErr } = await supabase
          .from('transcript_requests')
          .update({ payment_proof_url: path, status: 'payment_provided' })
          .eq('id', id);
        if (upErr) throw upErr;
      }

      Alert.alert('Submitted', 'Your academic request has been submitted.', [
        { text: 'View', onPress: () => router.replace(`/transcripts/${id}`) },
      ]);
    } catch (err: any) {
      console.error('Submit transcript error', err);
      Alert.alert('Error', err?.message || 'Failed to submit request');
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
        <Text style={styles.title}>Academic Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Request Kind</Text>
        <View style={styles.segment}>
          <TouchableOpacity onPress={() => setRequestKind('transcript')} style={[styles.segmentBtn, requestKind==='transcript' && styles.segmentBtnActive]}>          
            <Text style={[styles.segmentText, requestKind==='transcript' && styles.segmentTextActive]}>Transcript</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRequestKind('wassce')} style={[styles.segmentBtn, requestKind==='wassce' && styles.segmentBtnActive]}>          
            <Text style={[styles.segmentText, requestKind==='wassce' && styles.segmentTextActive]}>WASSCE Certificate</Text>
          </TouchableOpacity>
        </View>

        {requestKind === 'transcript' && (
          <>
            <Text style={styles.label}>Transcript Type</Text>
            <View style={styles.segment}>
              <TouchableOpacity onPress={() => setRequestType('official')} style={[styles.segmentBtn, requestType==='official' && styles.segmentBtnActive]}>          
                <Text style={[styles.segmentText, requestType==='official' && styles.segmentTextActive]}>Official</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRequestType('unofficial')} style={[styles.segmentBtn, requestType==='unofficial' && styles.segmentBtnActive]}>          
                <Text style={[styles.segmentText, requestType==='unofficial' && styles.segmentTextActive]}>Unofficial</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full legal name"
          style={styles.input}
        />

        <Text style={styles.label}>Class</Text>
        <TextInput
          value={className}
          onChangeText={setClassName}
          placeholder="e.g., Science A"
          style={styles.input}
        />

        <Text style={styles.label}>Graduation Year</Text>
        <TextInput
          value={graduationYear}
          onChangeText={setGraduationYear}
          placeholder="e.g., 2024"
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Index Number (optional)</Text>
        <TextInput
          value={indexNumber}
          onChangeText={setIndexNumber}
          placeholder="Index number if available"
          style={styles.input}
        />

        <Text style={styles.label}>Purpose</Text>
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder="e.g., Job application, Graduate school"
          style={styles.input}
        />

        <Text style={styles.label}>Recipient Email</Text>
        <TextInput
          value={recipientEmail}
          onChangeText={setRecipientEmail}
          placeholder="recipient@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <View style={styles.callout}>
          <DollarSign size={16} color="#4169E1" />
          <Text style={styles.calloutText}>Price: {formatPrice(price)}. After payment, optionally upload a proof. Admins verify before processing.</Text>
        </View>

  <Text style={styles.label}>Pay Online</Text>
        <View style={styles.payRow}>
          <TouchableOpacity style={styles.payBtn} onPress={() => WebBrowser.openBrowserAsync(PAYSTACK_REDIRECT_URL)}>
            <ExternalLink size={16} color="#fff" />
            <Text style={styles.payText}>Pay with Paystack</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.payBtn, { backgroundColor: '#111827' }]} onPress={() => WebBrowser.openBrowserAsync(STRIPE_CHECKOUT_URL)}>
            <ExternalLink size={16} color="#fff" />
            <Text style={styles.payText}>Pay with Stripe</Text>
          </TouchableOpacity>
        </View>

  <Text style={styles.label}>Proof of Payment (optional)</Text>
        <TouchableOpacity onPress={handlePickProof} style={styles.pickBtn}>          
          <Upload size={18} color="#4169E1" />
          <Text style={styles.pickText}>{pickedProof ? pickedProof.name : 'Pick file (PDF/Image)'}</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={submitting} onPress={handleSubmit} style={[styles.submitBtn, submitting && { opacity: 0.7 }]}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <FilePlus2 size={18} color="#fff" />}
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit & Continue'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
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
  segment: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  segmentText: { color: '#111', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  callout: { marginTop: 16, backgroundColor: '#F0F5FF', borderWidth: 1, borderColor: '#D6E2FF', borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  calloutText: { flex: 1, fontSize: 13, color: '#1F3B7A' },
  pickBtn: { marginTop: 8, borderWidth: 1, borderColor: '#4169E1', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  pickText: { color: '#4169E1', fontWeight: '600' },
  payRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  payBtn: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  payText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  submitBtn: { marginTop: 20, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
