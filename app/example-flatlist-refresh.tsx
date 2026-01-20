/**
 * Example FlatList Screen with Pull-to-Refresh
 * 
 * Demonstrates pull-to-refresh pattern for list-based screens.
 */

import { View, Text, StyleSheet, FlatList, ActivityIndicator, ListRenderItem } from 'react-native';
import { useState, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { useRefresh } from '@/hooks/useRefresh';

interface ListItem {
  id: string;
  title: string;
  description: string;
}

export default function ExampleFlatListRefreshScreen() {
  const [data, setData] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize refresh hook
  const { isRefreshing, handleRefresh } = useRefresh({
    onRefresh: async () => {
      await fetchData();
    },
  });

  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate sample data
      const items: ListItem[] = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i + 1}`,
        title: `Item ${i + 1}`,
        description: `This is the description for item ${i + 1}`,
      }));
      
      setData(items);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Render individual list item
  const renderItem: ListRenderItem<ListItem> = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
    </View>
  );

  // List header
  const ListHeaderComponent = () => (
    <View style={styles.header}>
      <Text style={styles.title}>FlatList Pull to Refresh</Text>
      <Text style={styles.subtitle}>Pull down to reload the list</Text>
    </View>
  );

  // Empty state
  const ListEmptyComponent = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No items found</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      // Add RefreshControl to FlatList
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#4169E1"
          colors={['#4169E1']}
        />
      }
      // List components
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={!loading ? ListEmptyComponent : null}
      ListFooterComponent={
        loading && !isRefreshing ? (
          <View style={styles.footer}>
            <ActivityIndicator size="large" color="#0F172A" />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  item: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
