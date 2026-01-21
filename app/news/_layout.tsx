import { Stack } from 'expo-router';

export default function NewsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="articles" />
      <Stack.Screen name="article-detail" />
      <Stack.Screen name="bookmarks" />
      <Stack.Screen name="outlets" />
      <Stack.Screen name="see-all" />
      <Stack.Screen name="add" />
    </Stack>
  );
}