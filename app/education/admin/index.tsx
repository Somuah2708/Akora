import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;

/**
 * This screen redirects to the new Alumni Mentors Admin Panel
 * Old education/admin screen has been replaced with dedicated admin panel
 */
export default function EducationAdminScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new dedicated alumni mentors admin panel
    debouncedRouter.replace('/admin-alumni-mentors');
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#16a34a" />
      <Text style={styles.text}>Redirecting to Alumni Mentors Admin...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});
