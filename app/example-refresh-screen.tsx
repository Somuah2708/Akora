/**
 * Example Screen with Pull-to-Refresh
 * 
 * Demonstrates the global pull-to-refresh pattern for new screens.
 */

import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { useRefresh } from '@/hooks/useRefresh';

export default function ExampleRefreshScreen() {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize refresh hook
  const { isRefreshing, handleRefresh } = useRefresh({
    onRefresh: async () => {
      // Your refresh logic goes here
      await fetchData();
    },
    onError: (error) => {
      console.error('Refresh failed:', error);
      // Optional: Show error toast
    },
  });

  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update data
      setData(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
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

  // Loading state
  if (loading && !isRefreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      // Add RefreshControl here
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          // iOS spinner color
          tintColor="#4169E1"
          // Android spinner colors
          colors={['#4169E1']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Pull to Refresh Example</Text>
        <Text style={styles.subtitle}>Pull down to reload data</Text>
      </View>

      {data.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Inter-Regular',
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
  itemText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
});
