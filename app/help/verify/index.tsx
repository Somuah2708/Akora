import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type TMatch =
  | { kind: 'transcript'; id: string; status: string; request_type: string }
  | { kind: 'recommendation'; id: string; status: string; purpose: string };

export default function VerifyScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TMatch | null>(null);
  const [collision, setCollision] = useState<boolean>(false);

  const lookup = async () => {
    const v = code.trim();
    if (!v) { Alert.alert('Missing code', 'Enter the verification code.'); return; }
    setLoading(true);
    setResult(null);
    setCollision(false);
    try {
      // Query both to guard against rare code collisions
      const { data: tData, error: tErr } = await supabase
        .from('transcript_requests')
        .select('id, status, request_type')
        .eq('verification_code', v)
        .limit(2);
      if (tErr) throw tErr;
      const { data: rData, error: rErr } = await supabase
        .from('recommendation_requests')
        .select('id, status, purpose')
        .eq('verification_code', v)
        .limit(2);
      if (rErr) throw rErr;
      const t = Array.isArray(tData) ? tData : (tData ? [tData] : []);
      const r = Array.isArray(rData) ? rData : (rData ? [rData] : []);

      if (t.length === 0 && r.length === 0) {
        Alert.alert('Not found', 'No record matches that code.');
        return;
      }

      if (t.length > 0 && r.length > 0) {
        // Rare collision: show transcript by default and mark collision
        setCollision(true);
        setResult({ kind: 'transcript', id: t[0].id, status: t[0].status, request_type: (t[0] as any).request_type });
        return;
      }

      if (t.length > 0) {
        setResult({ kind: 'transcript', id: t[0].id, status: t[0].status, request_type: (t[0] as any).request_type });
        return;
      }
      if (r.length > 0) {
        setResult({ kind: 'recommendation', id: r[0].id, status: r[0].status, purpose: (r[0] as any).purpose });
        return;
      }
    } catch (err) {
      console.error('Verification lookup failed', err);
      Alert.alert('Error', 'Could not perform lookup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Code</Text>
      <Text style={styles.subtitle}>Enter a verification code to confirm status.</Text>

      <TextInput value={code} onChangeText={setCode} placeholder="Enter code" autoCapitalize="none" style={styles.input} />

      <TouchableOpacity disabled={loading} onPress={lookup} style={[styles.cta, loading && { opacity: 0.7 }]}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={18} color="#fff" />}
        <Text style={styles.ctaText}>{loading ? 'Searching...' : 'Search'}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{result.kind === 'transcript' ? 'Transcript' : 'Recommendation'} Found</Text>
          {collision && (
            <Text style={[styles.resultLine,{ color: '#B45309' }]}>Note: This code matches more than one record type. Showing the first match.</Text>
          )}
          {result.kind === 'transcript' ? (
            <>
              <Text style={styles.resultLine}>Type: {(result as any).request_type}</Text>
              <Text style={styles.resultLine}>Status: {result.status}</Text>
            </>
          ) : (
            <>
              <Text style={styles.resultLine}>Purpose: {(result as any).purpose}</Text>
              <Text style={styles.resultLine}>Status: {result.status}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#666' },
  input: { marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  cta: { marginTop: 16, backgroundColor: '#4169E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontWeight: '700' },
  resultBox: { marginTop: 20, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12 },
  resultTitle: { fontWeight: '700', fontSize: 16 },
  resultLine: { marginTop: 6, fontSize: 14 },
});
