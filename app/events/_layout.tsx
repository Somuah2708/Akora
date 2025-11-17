import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-settings" />
      <Stack.Screen name="my-akora-events" />
      <Stack.Screen name="my-events" />
      <Stack.Screen name="organizer-dashboard" />
      <Stack.Screen name="search" />
    </Stack>
  );
}