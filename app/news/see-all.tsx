import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function SeeAllNewsScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const [newsItems, setNewsItems] = useState<Array<{ id: string; title: string; category_name: string; image_url: string; description: string; link?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    loadingText: { textAlign: 'center', marginTop: 40 },
    emptyText: { textAlign: 'center', marginTop: 40 },
    card: { flexDirection: 'row', margin: 16, backgroundColor: '#f9f9f9', borderRadius: 12, overflow: 'hidden' },
    image: { width: 100, height: 100, borderRadius: 12 },
    content: { flex: 1, padding: 12 },
    category: { fontSize: 14, color: '#007AFF', marginBottom: 4 },
    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    excerpt: { fontSize: 14, color: '#444' }
  });
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('is_approved', true)
          .order('published_at', { ascending: false });
        if (error || !data || data.length === 0) {
          if (type === 'featured') {
            setNewsItems([
              {
                id: '1',
                title: 'Alumni Achievement: Dr. Sarah Chen Wins Nobel Prize',
                category_name: 'News - Akora Updates',
                image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60',
                description: 'Dr. Sarah Chen, Akora alumna, wins Nobel Prize for her groundbreaking research in medicine...',
                link: 'https://example.com/sarah-chen-nobel-prize',
              },
              {
                id: '2',
                title: 'School Launches New Innovation Hub',
                category_name: 'News - School News',
                image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&auto=format&fit=crop&q=60',
                description: 'The school has launched a new innovation hub to foster creativity and entrepreneurship...',
                link: 'https://example.com/innovation-hub-launch',
              },
            ]);
          } else if (type === 'latest') {
            setNewsItems([
              {
                id: '1',
                title: 'Global Tech Summit 2024: Alumni Panel Discussion',
                category_name: 'News - Akora Updates',
                image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
                description: 'Distinguished alumni share insights on AI and future of technology...',
                link: 'https://example.com/tech-summit-2024',
              },
              {
                id: '2',
                title: 'Breakthrough in Renewable Energy Research',
                category_name: 'News - World News',
                image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&auto=format&fit=crop&q=60',
                description: 'Scientists discover new method for efficient solar energy storage...',
                link: 'https://example.com/renewable-energy-breakthrough',
              },
              {
                id: '3',
                title: 'Annual Alumni Giving Day Sets New Record',
                category_name: 'News - School News',
                image_url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=60',
                description: 'Community raises over $10 million for scholarship fund...',
                link: 'https://example.com/alumni-giving-day-record',
              },
            ]);
          } else {
            setNewsItems([]);
          }
        } else {
          if (type === 'featured') {
            setNewsItems(data.slice(0, 2));
          } else if (type === 'latest') {
            setNewsItems(data.slice(2, 5));
          } else {
            setNewsItems(data);
          }
        }
      } catch (e) {
        setNewsItems([]);
      }
      setLoading(false);
    };
    fetchNews();
  }, [type]);
  // ...existing code...
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All News</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : newsItems.length === 0 ? (
          <Text style={styles.emptyText}>No news found.</Text>
        ) : (
          newsItems.map(item => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.image_url }} style={styles.image} />
              <View style={styles.content}>
                <Text style={styles.category}>{
                  item.category_name.replace('News - ', '').replace(/Alumni Events/i, 'Akora Events')
                }</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.excerpt}>
                  {(item.description ? item.description.substring(0, 120) : '')}...
                  {item.link && typeof item.link === 'string' && (
                    <Text style={{ color: '#007AFF', textDecorationLine: 'underline' }} onPress={() => {
                      import('react-native').then(RN => RN.Linking.openURL(item.link as string));
                    }}>
                      {' '}Read more
                    </Text>
                  )}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

