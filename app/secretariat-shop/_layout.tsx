import { Stack } from 'expo-router';

export default function SecretariatShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Secretariat Shop' }} />
      <Stack.Screen name="post-item" options={{ title: 'Post Item' }} />
      <Stack.Screen name="my-posted-items" options={{ title: 'My Posted Items' }} />
      <Stack.Screen name="edit-posted-item" options={{ title: 'Edit Item' }} />
      <Stack.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Stack.Screen name="delivery" options={{ title: 'Delivery' }} />
      <Stack.Screen name="pickup" options={{ title: 'Pickup' }} />
      <Stack.Screen name="[id]" options={{ title: 'Product Details' }} />
    </Stack>
  );
}