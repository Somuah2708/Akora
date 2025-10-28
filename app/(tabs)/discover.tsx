import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function DiscoverScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to favorites page
    router.replace('/favorites' as any);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4169E1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
