import { Stack } from 'expo-router';

export default function ConnectionsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
