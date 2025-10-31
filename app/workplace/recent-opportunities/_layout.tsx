import { Stack } from 'expo-router';

export default function RecentOpportunitiesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
