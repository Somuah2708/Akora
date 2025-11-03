import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

// This route now simply redirects to the canonical profile screen
// so both owner and visitors get the exact same UI.
export default function RedirectUserProfile() {
  const router = useRouter();
  const { id, guest } = useLocalSearchParams<{ id: string; guest?: string }>();
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    // Build query for canonical screen using asUser param.
    const params = new URLSearchParams();
    params.set('asUser', String(id));
    if (guest === '1') params.set('guest', '1');
    router.replace(`/(tabs)/grow?${params.toString()}` as any);
  }, [id, guest]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
