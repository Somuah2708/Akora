import { Stack } from 'expo-router';

export default function AlumniCenterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="directory" />
      <Stack.Screen name="events" />
      <Stack.Screen name="news" />
      <Stack.Screen name="my-profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile/[id]" />
    </Stack>
  );
}
