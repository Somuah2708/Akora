import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Hash, ThumbsUp, MessageCircle, Activity as ActivityIcon } from 'lucide-react-native';
import { fetchTrendingDiscussions, TrendingDiscussionRow } from '@/lib/forum/analytics';
import { supabase } from '@/lib/supabase';

type Row = TrendingDiscussionRow & {
  profile?: { id: string; full_name: string; avatar_url?: string };
  title?: string;
  category?: string;
};

export default function TrendingListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
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
      const data = await fetchTrendingDiscussions(20);
      const ids = data.map(d => d.author_id);
      const discIds = data.map(d => d.id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => { map[p.id] = p; });
      // get discussion details for title and category
      const { data: details } = await supabase
        .from('forum_discussions')
        .select('id, title, category')
        .in('id', discIds);
      const detailsMap: Record<string, any> = {};
      (details || []).forEach((row: any) => { detailsMap[row.id] = row; });
      setRows(data.map(d => ({ ...d, profile: map[d.author_id], title: detailsMap[d.id]?.title, category: detailsMap[d.id]?.category })));
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
        <Text style={styles.title}>Trending Discussions</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}> 
          <ActivityIndicator size="large" color="#4169E1" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/forum/${item.id}` as any)}>
              <View style={styles.rowTop}>
                <View style={styles.rank}><Text style={styles.rankText}>#{index+1}</Text></View>
                {!!item.category && (
                  <View style={styles.chip}>
                    <Hash size={12} color="#4169E1" />
                    <Text style={styles.chipText}>{item.category}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title || '(Untitled discussion)'}</Text>
              <View style={styles.authorRow}>
                <Image source={{ uri: item.profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60' }} style={styles.avatar} />
                <Text style={styles.author} numberOfLines={1}>{item.profile?.full_name || 'Member'}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.time}>{getTimeAgo(item.last_activity_at)}</Text>
              </View>
              <View style={styles.metrics}>
                <View style={styles.pill}>
                  <ThumbsUp size={12} color="#1F2937" />
                  <Text style={styles.pillText}>{item.likes_count}</Text>
                </View>
                <View style={styles.pill}>
                  <MessageCircle size={12} color="#1F2937" />
                  <Text style={styles.pillText}>{item.comments_count}</Text>
                </View>
                <View style={[styles.pill, { marginLeft: 'auto' }]}>
                  <ActivityIcon size={12} color="#1F2937" />
                  <Text style={styles.pillText}>{item.trending_score.toFixed(2)}</Text>
                </View>
              </View>
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
  rowTop: { flexDirection:'row', alignItems:'center', marginBottom:8, gap:8 },
  rank: { backgroundColor:'#EEF2FF', paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  rankText: { fontSize:12, fontFamily:'Inter-SemiBold', color:'#3730A3' },
  chip: { flexDirection:'row', alignItems:'center', backgroundColor:'#EBF0FF', paddingHorizontal:8, paddingVertical:4, borderRadius:12, gap:6 },
  chipText: { fontSize:12, fontFamily:'Inter-SemiBold', color:'#4169E1' },
  cardTitle: { fontSize:16, fontFamily:'Inter-SemiBold', color:'#111827', marginBottom:8 },
  authorRow: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  avatar: { width:28, height:28, borderRadius:14, marginRight:8 },
  author: { fontSize:13, fontFamily:'Inter-SemiBold', color:'#111827', maxWidth:180 },
  dot: { marginHorizontal:6, color:'#9CA3AF' },
  time: { fontSize:12, color:'#6B7280', fontFamily:'Inter-Regular' },
  metrics: { flexDirection:'row', alignItems:'center', gap:8, marginTop:4 },
  pill: { flexDirection:'row', alignItems:'center', backgroundColor:'#F3F4F6', paddingHorizontal:10, paddingVertical:6, borderRadius:999, gap:6 },
  pillText: { fontSize:12, fontFamily:'Inter-SemiBold', color:'#1F2937' },
});
