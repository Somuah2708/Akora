import { Stack } from 'expo-router';

export default function FinancialPlanningLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}