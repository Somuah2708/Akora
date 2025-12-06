import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { FileText, Plus, Clock, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type TranscriptRequest = {
  id: string;
  user_id: string;
  request_type: 'official' | 'unofficial';
  request_kind?: 'transcript' | 'wassce';
  purpose: string;
  recipient_email: string;
  status: 'pending' | 'payment_provided' | 'processing' | 'ready' | 'delivered' | 'rejected';
  payment_proof_url?: string | null;
  document_url?: string | null;
  full_name?: string | null;
  class_name?: string | null;
  graduation_year?: number | null;
  index_number?: string | null;
  price_amount?: number | null;
  price_currency?: string | null;
  created_at?: string;
};

const statusColors: Record<TranscriptRequest['status'], string> = {
  pending: '#999999',
  payment_provided: '#4169E1',
  processing: '#A66BFF',
  ready: '#1E90FF',
  delivered: '#2E8B57',
  rejected: '#CC3333',
};

export default function TranscriptListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<TranscriptRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin and redirect to admin panel
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin, role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Failed to check admin status:', error);
          setCheckingAdmin(false);
          return;
        }
        
        const isUserAdmin = data?.is_admin === true || data?.role === 'admin' || data?.role === 'staff';
        setIsAdmin(isUserAdmin);
        
        if (isUserAdmin) {
          // Redirect to admin panel
          debouncedRouter.replace('/transcripts/admin');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      } finally {
        setCheckingAdmin(false);
      }
    }
    
    checkAdminStatus();
  }, [user, router]);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transcript_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as TranscriptRequest[]) || []);
    } catch (err) {
      console.error('Failed to fetch transcript requests', err);
      Alert.alert('Error', 'Could not load your transcript requests.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      fetchItems();
    }
  }, [fetchItems, checkingAdmin, isAdmin]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>Please sign in to view your transcript requests.</Text>
      </View>
    );
  }

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#4169E1" />
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  // Don't render anything if admin (will redirect)
  if (isAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#4169E1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Academic Requests</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => debouncedRouter.push('/transcripts/new')}>
          <Plus size={20} color="#4169E1" />
          <Text style={styles.addText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>          
          <ActivityIndicator size="small" color="#4169E1" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <FileText size={36} color="#999" />
          <Text style={styles.emptyTitle}>No transcript requests yet</Text>
          <Text style={styles.emptySub}>Create your first request to get started.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => debouncedRouter.push('/transcripts/new')}>
            <Plus size={18} color="#fff" />
            <Text style={styles.ctaText}>Request Transcript</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((it) => {
            const kind = it.request_kind || 'transcript';
            const title = kind === 'wassce'
              ? 'WASSCE Certificate'
              : `${it.request_type === 'official' ? 'Official' : 'Unofficial'} Transcript`;
            const identityLine = [it.full_name, it.class_name, it.graduation_year ? `Class of ${it.graduation_year}` : null]
              .filter(Boolean)
              .join(' · ');
            const priceLine = (it.price_currency && typeof it.price_amount === 'number')
              ? `${it.price_currency} ${it.price_amount}`
              : null;
            return (
              <TouchableOpacity key={it.id} style={styles.card} onPress={() => debouncedRouter.push(`/transcripts/${it.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardSub}>{it.purpose}</Text>
                  <Text style={styles.cardSubSmall}>Recipient: {it.recipient_email}</Text>
                  {identityLine ? <Text style={styles.cardMeta}>{identityLine}</Text> : null}
                  {priceLine ? <Text style={styles.cardPrice}>Cost of Service: {priceLine}</Text> : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColors[it.status] }] }>
                  {it.status === 'delivered' ? <CheckCircle2 size={14} color="#fff" /> : <Clock size={14} color="#fff" />}
                  <Text style={styles.statusText}>{it.status.replace('_', ' ')}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
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
  cardMeta: { marginTop: 4, fontSize: 11, color: '#555' },
  cardPrice: { marginTop: 2, fontSize: 11, color: '#1F3B7A', fontWeight: '600' },
  statusPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
 