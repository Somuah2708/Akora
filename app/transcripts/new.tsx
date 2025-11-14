import { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FilePlus2, Upload, DollarSign, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickDocument } from '@/lib/media';
import { uploadProofFromUri } from '@/lib/storage';
import { MOBILE_MONEY, BANK_ACCOUNT, PAYMENT_HELP_TEXT } from '@/config/manualPayment';
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
  const [phoneNumber, setPhoneNumber] = useState(''); // required for quick contact

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
    if (!phoneNumber.trim()) {
      Alert.alert('Missing phone', 'Please provide a phone number we can reach.');
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
      if (price.amount > 0 && !pickedProof) {
        Alert.alert('Payment proof required', 'Upload a screenshot of your payment before submitting.');
        setSubmitting(false);
        return;
      }
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
          phone_number: phoneNumber.trim(),
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

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.label}>Request Kind</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentScroll}
          >
            <TouchableOpacity 
              onPress={() => setRequestKind('transcript')} 
              style={[styles.segmentBtn, requestKind==='transcript' && styles.segmentBtnActive]}
            >          
              <Text style={[styles.segmentText, requestKind==='transcript' && styles.segmentTextActive]}>Transcript</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setRequestKind('wassce')} 
              style={[styles.segmentBtn, requestKind==='wassce' && styles.segmentBtnActive]}
            >          
              <Text style={[styles.segmentText, requestKind==='wassce' && styles.segmentTextActive]}>WASSCE Certificate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/recommendations/new')} 
              style={styles.segmentBtn}
            >          
              <Text style={styles.segmentText}>Recommendations</Text>
            </TouchableOpacity>
          </ScrollView>

        {requestKind === 'transcript' && (
          <>
            <Text style={styles.label}>Transcript Type</Text>
            <View style={styles.typeSegment}>
              <TouchableOpacity onPress={() => setRequestType('official')} style={[styles.typeSegmentBtn, requestType==='official' && styles.segmentBtnActive]}>          
                <Text style={[styles.segmentText, requestType==='official' && styles.segmentTextActive]}>Official</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRequestType('unofficial')} style={[styles.typeSegmentBtn, requestType==='unofficial' && styles.segmentBtnActive]}>          
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

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="e.g., 0241234567"
          keyboardType="phone-pad"
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

        <View style={styles.priceBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <DollarSign size={20} color="#1F3B7A" />
            <Text style={styles.priceMain}>Cost of Service: {formatPrice(price)}</Text>
          </View>
          <Text style={styles.priceSub}>{PAYMENT_HELP_TEXT}</Text>
        </View>

        <Text style={styles.label}>Payment Methods</Text>
        <View style={styles.methodBox}>
          <Text style={styles.methodTitle}>Mobile Money</Text>
          <Text style={styles.methodLine}>{MOBILE_MONEY.provider} · {MOBILE_MONEY.number}</Text>
          <Text style={styles.methodLine}>{MOBILE_MONEY.accountName}</Text>
          {MOBILE_MONEY.notes ? <Text style={styles.methodNotes}>{MOBILE_MONEY.notes}</Text> : null}
          <TouchableOpacity style={styles.copyBtn} onPress={async () => {
            try { await Clipboard.setStringAsync(MOBILE_MONEY.number); Alert.alert('Copied', 'Mobile Money number copied to clipboard.'); } catch { Alert.alert('Copy failed','Please copy manually.'); }
          }}> 
            <Copy size={14} color="#fff" />
            <Text style={styles.copyText}>Copy Number</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.methodBox}>
          <Text style={styles.methodTitle}>Bank Transfer</Text>
          <Text style={styles.methodLine}>{BANK_ACCOUNT.bankName}</Text>
          <Text style={styles.methodLine}>{BANK_ACCOUNT.accountName}</Text>
          <Text style={styles.methodLine}>{BANK_ACCOUNT.accountNumber}</Text>
          {BANK_ACCOUNT.branch ? <Text style={styles.methodLine}>Branch: {BANK_ACCOUNT.branch}</Text> : null}
          {BANK_ACCOUNT.swiftCode ? <Text style={styles.methodLine}>SWIFT: {BANK_ACCOUNT.swiftCode}</Text> : null}
          {BANK_ACCOUNT.notes ? <Text style={styles.methodNotes}>{BANK_ACCOUNT.notes}</Text> : null}
          <TouchableOpacity style={styles.copyBtn} onPress={async () => {
            try { await Clipboard.setStringAsync(BANK_ACCOUNT.accountNumber); Alert.alert('Copied', 'Bank account number copied to clipboard.'); } catch { Alert.alert('Copy failed','Please copy manually.'); }
          }}> 
            <Copy size={14} color="#fff" />
            <Text style={styles.copyText}>Copy Account Number</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Payment Proof {price.amount > 0 ? '(required)' : '(optional)'}</Text>
        <TouchableOpacity onPress={handlePickProof} style={styles.pickBtn}>          
          <Upload size={18} color="#4169E1" />
          <Text style={styles.pickText}>{pickedProof ? pickedProof.name : 'Pick file (PDF/Image)'}</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={submitting} onPress={handleSubmit} style={[styles.submitBtn, submitting && { opacity: 0.7 }]}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <FilePlus2 size={18} color="#fff" />}
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit & Continue'}</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  segmentScroll: { gap: 8, marginTop: 8, paddingRight: 16 },
  segmentBtn: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center', minWidth: 140 },
  typeSegment: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeSegmentBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  segmentText: { color: '#111', fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#fff' },
  priceBox: { marginTop: 20, backgroundColor: '#EBF3FF', borderWidth: 1.5, borderColor: '#B6D3FF', borderRadius: 14, padding: 16 },
  priceMain: { fontSize: 20, fontWeight: '700', color: '#1F3B7A' },
  priceSub: { marginTop: 8, fontSize: 12, color: '#1F3B7A' },
  methodBox: { marginTop: 14, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#E0E7FF', borderRadius: 12, padding: 12, gap: 4 },
  methodTitle: { fontSize: 14, fontWeight: '700', color: '#1F3B7A' },
  methodLine: { fontSize: 12, color: '#1F3B7A' },
  methodNotes: { fontSize: 11, color: '#374151', marginTop: 4 },
  copyBtn: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4169E1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  copyText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  pickBtn: { marginTop: 8, borderWidth: 1, borderColor: '#4169E1', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  pickText: { color: '#4169E1', fontWeight: '600' },
  submitBtn: { marginTop: 20, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
