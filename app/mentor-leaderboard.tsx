import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import MentorLeaderboard from '@/components/MentorLeaderboard';

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mentor Leaderboard',
          headerShown: true,
        }}
      />
      <MentorLeaderboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
