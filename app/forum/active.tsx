import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { fetchActiveUsers, ActiveUserRow } from '@/lib/forum/analytics';
import { supabase } from '@/lib/supabase';

type Row = ActiveUserRow & {
  profile?: { id: string; full_name: string; avatar_url?: string };
};

export default function ActiveMembersScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getTimeAgo = (dateString: string) => {
    const normalized = (dateString && /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateString) && !/[zZ]$/.test(dateString))
      ? dateString.replace(' ', 'T') + 'Z'
      : dateString;
    const date = new Date(normalized);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveUsers(30);
      const ids = data.map(d => d.user_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => { map[p.id] = p; });
      setRows(data.map(d => ({ ...d, profile: map[d.user_id] })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Active Members</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator size="large" color="#4169E1" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/user-profile/${item.user_id}` as any)}>
              <View style={styles.topRow}>
                <Text style={styles.rank}>#{index+1}</Text>
              </View>
              <View style={styles.row}>
                <Image source={{ uri: item.profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60' }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.profile?.full_name || 'Member'}</Text>
                  <Text style={styles.time}>{getTimeAgo(item.last_activity_at)}</Text>
                </View>
                  {/* metrics removed for a cleaner UI */}
              </View>
                {/* progress bar removed */}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal:16, paddingTop: 60, paddingBottom: 12, borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent:'center', alignItems:'center', backgroundColor:'#F3F4F6' },
  title: { fontSize: 18, fontFamily: 'Inter-SemiBold', color:'#111827' },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  card: { backgroundColor:'#FFFFFF', borderRadius:12, padding:16, shadowColor:'#000', shadowOffset:{ width:0, height:2 }, shadowOpacity:0.1, shadowRadius:4, elevation:3 },
  topRow: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  rank: { fontSize:12, color:'#3730A3', fontFamily:'Inter-SemiBold' },
  row: { flexDirection:'row', alignItems:'center' },
  avatar: { width:40, height:40, borderRadius:20, marginRight:12 },
  name: { fontSize:14, color:'#111827', fontFamily:'Inter-SemiBold' },
  time: { fontSize:12, color:'#6B7280', fontFamily:'Inter-Regular' },
  pill: { flexDirection:'row', alignItems:'center', backgroundColor:'#F3F4F6', paddingHorizontal:10, paddingVertical:6, borderRadius:999, gap:6 },
  pillText: { fontSize:12, fontFamily:'Inter-SemiBold', color:'#1F2937' },
    // removed pill styles
});
