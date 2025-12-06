import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Clock, CheckCircle2, Upload, Link as LinkIcon, FileText, XCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickDocument } from '@/lib/media';
import { getSignedProofUrl, uploadProofFromUri } from '@/lib/storage';

type Status = 'pending' | 'payment_provided' | 'processing' | 'ready' | 'delivered' | 'rejected';

type TranscriptRequest = {
  id: string;
  user_id: string;
  request_type: 'official' | 'unofficial';
  request_kind?: 'transcript' | 'wassce';
  purpose: string;
  recipient_email: string;
  status: Status;
  payment_proof_url?: string | null;
  document_url?: string | null;
  admin_notes?: string | null;
  verification_code?: string | null;
  full_name?: string | null;
  class_name?: string | null;
  graduation_year?: number | null;
  index_number?: string | null;
  phone_number?: string | null;
  price_amount?: number | null;
  price_currency?: string | null;
  created_at?: string;
};

const statusLabel: Record<Status, string> = {
  pending: 'Pending',
  payment_provided: 'Payment Provided',
  processing: 'Processing',
  ready: 'Ready',
  delivered: 'Delivered',
  rejected: 'Rejected',
};

export default function TranscriptDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [req, setReq] = useState<TranscriptRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signedProofUrl, setSignedProofUrl] = useState<string | null>(null);

  const id = String(params.id);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transcript_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setReq(data as TranscriptRequest);
    } catch (err) {
      console.error('Load transcript failed', err);
      Alert.alert('Error', 'Unable to load transcript request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      if (req?.payment_proof_url) {
        const url = await getSignedProofUrl(req.payment_proof_url);
        setSignedProofUrl(url);
      } else {
        setSignedProofUrl(null);
      }
    })();
  }, [req?.payment_proof_url]);

  const canUploadProof = req && user && req.user_id === user.id && (req.status === 'pending' || req.status === 'payment_provided');

  const handleUploadProof = async () => {
    if (!user || !req) return;
    try {
      setUploading(true);
      const doc = await pickDocument();
      if (!doc) { setUploading(false); return; }
      // Upload to private 'proofs' bucket and store path; preview uses signed URLs
      const { path } = await uploadProofFromUri(doc.uri, user.id);
      const { error } = await supabase
        .from('transcript_requests')
        .update({ payment_proof_url: path, status: 'payment_provided' })
        .eq('id', req.id);
      if (error) throw error;
      await load();
      Alert.alert('Uploaded', 'Proof of payment attached.');
    } catch (err) {
      console.error('Upload proof error', err);
      Alert.alert('Error', 'Failed to upload proof.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Academic Request Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4169E1" /></View>
      ) : !req ? (
        <View style={styles.center}><Text>Not found</Text></View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
          {/* Status Banner */}
          {req.status === 'pending' && (
            <View style={[styles.statusBanner, { backgroundColor: '#FFF4E6' }]}>
              <Clock size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#F59E0B' }]}>Payment Verification Pending</Text>
                <Text style={styles.statusDesc}>
                  Your payment proof is being verified. This typically takes up to 24 hours. You'll be notified once confirmed.
                </Text>
              </View>
            </View>
          )}
          
          {req.status === 'payment_provided' && (
            <View style={[styles.statusBanner, { backgroundColor: '#FFF4E6' }]}>
              <Clock size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#F59E0B' }]}>Payment Verification Pending</Text>
                <Text style={styles.statusDesc}>
                  Your payment proof is being verified. This typically takes up to 24 hours. You'll be notified once confirmed.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'processing' && (
            <View style={[styles.statusBanner, { backgroundColor: '#EFF6FF' }]}>
              <Clock size={20} color="#3B82F6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#3B82F6' }]}>Request Being Processed</Text>
                <Text style={styles.statusDesc}>
                  Payment confirmed! Your request is being processed. This typically takes 3-5 business days.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'ready' && (
            <View style={[styles.statusBanner, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={20} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#10B981' }]}>Ready for Collection</Text>
                <Text style={styles.statusDesc}>
                  Your document is ready! Check below for the download link or collection instructions.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'delivered' && (
            <View style={[styles.statusBanner, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={20} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#10B981' }]}>Delivered</Text>
                <Text style={styles.statusDesc}>
                  Your request has been completed and delivered.
                </Text>
              </View>
            </View>
          )}

          {req.status === 'rejected' && (
            <View style={[styles.statusBanner, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={20} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.statusTitle, { color: '#EF4444' }]}>Request Rejected</Text>
                <Text style={styles.statusDesc}>
                  Your request could not be processed. Check admin notes below for details.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.h1}>
            {req.request_kind === 'wassce'
              ? 'WASSCE Certificate'
              : `${req.request_type === 'official' ? 'Official' : 'Unofficial'} Transcript`}
          </Text>
          <Text style={styles.mono}>Ref: {req.id.slice(0, 8)} · Code: {req.verification_code}</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Identity</Text>
            <Text style={styles.value}>
              {[req.full_name, req.class_name, req.graduation_year ? `Class of ${req.graduation_year}` : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Text>
            {req.index_number ? <Text style={styles.meta}>Index: {req.index_number}</Text> : null}
            {req.phone_number ? <Text style={styles.meta}>Phone: {req.phone_number}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Cost of Service</Text>
            <Text style={styles.value}>
              {req.price_currency && typeof req.price_amount === 'number'
                ? `${req.price_currency} ${req.price_amount}`
                : 'Not set'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Purpose</Text>
            <Text style={styles.value}>{req.purpose}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Recipient</Text>
            <Text style={styles.value}>{req.recipient_email}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.timeline}>
              {(() => {
                const order: Status[] = ['pending','payment_provided','processing','ready','delivered'];
                const reached = (cur: Status, step: Status) => cur !== 'rejected' && order.indexOf(cur) >= order.indexOf(step);
                return order.map((s) => (
                  <View key={s} style={styles.timelineItem}>
                    {reached(req.status, s) ? (
                      <CheckCircle2 size={16} color={s === req.status ? '#4169E1' : '#10B981'} />
                    ) : (
                      <Clock size={16} color="#999" />
                    )}
                    <Text style={[styles.timelineText, s === req.status && { color: '#4169E1', fontWeight: '700' }]}>{s.replace('_',' ')}</Text>
                  </View>
                ));
              })()}
              {req.status === 'rejected' && (
                <View style={styles.timelineItem}><Clock size={16} color="#CC3333" /><Text style={[styles.timelineText,{color:'#CC3333',fontWeight:'700'}]}>rejected</Text></View>
              )}
            </View>
          </View>

          {req.admin_notes ? (
            <View style={styles.section}>
              <Text style={styles.label}>Admin Notes</Text>
              <Text style={styles.value}>{req.admin_notes}</Text>
            </View>
          ) : null}

          {req.payment_proof_url ? (
            <View style={styles.section}>
              <Text style={styles.label}>Payment Proof</Text>
              <TouchableOpacity style={styles.linkBtn} onPress={() => {
                const url = signedProofUrl || req.payment_proof_url!;
                Linking.openURL(url);
              }}>
                <Upload size={16} color="#4169E1" />
                <Text style={styles.linkText}>View uploaded proof</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {req.document_url ? (
            <View style={styles.section}>
              <Text style={styles.label}>Transcript Document</Text>
              <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(req.document_url!)}>
                <FileText size={16} color="#4169E1" />
                <Text style={styles.linkText}>Open transcript</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {canUploadProof && (
            <TouchableOpacity disabled={uploading} style={[styles.primaryBtn, uploading && { opacity: 0.7 }]} onPress={handleUploadProof}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Upload size={18} color="#fff" />}
              <Text style={styles.primaryText}>{uploading ? 'Uploading...' : (req.payment_proof_url ? 'Replace Proof' : 'Upload Proof')}</Text>
            </TouchableOpacity>
          )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 6 },
  title: { fontSize: 18, fontWeight: '600' },
  scrollContent: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 18, fontWeight: '700' },
  mono: { marginTop: 4, fontSize: 12, color: '#666' },
  section: { marginTop: 16 },
  label: { fontSize: 13, color: '#666', marginBottom: 4 },
  value: { fontSize: 14 },
  meta: { marginTop: 4, fontSize: 11, color: '#555' },
  timeline: { marginTop: 8, gap: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineText: { fontSize: 13, color: '#333', textTransform: 'capitalize' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  linkText: { color: '#4169E1', fontWeight: '600' },
  primaryBtn: { marginTop: 24, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  statusBanner: { marginBottom: 20, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start' },
  statusTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
});
