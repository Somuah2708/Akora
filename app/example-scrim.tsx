/**
 * Example Screen - Demonstrates Status Bar Scrim Usage
 * 
 * This example shows how the scrim system works with:
 * - ScrollView content
 * - Safe area insets
 * - Dark header background
 * - Content scrolling behind the scrim
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExampleScrimScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header - With safe area top padding */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Example Screen</Text>
          <Text style={styles.headerSubtitle}>
            Notice how content scrolls behind the translucent scrim
          </Text>
        </View>

        {/* Content Cards */}
        <View style={styles.content}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
            <View key={item} style={styles.card}>
              <Text style={styles.cardTitle}>Card {item}</Text>
              <Text style={styles.cardText}>
                This is example content. Scroll up and down to see how the
                status bar scrim stays fixed while content moves behind it.
                The scrim ensures status bar icons remain readable.
              </Text>
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • The scrim is automatically applied to all screens{'\n'}
            • It respects safe area insets (notches, dynamic island){'\n'}
            • Content uses insets.top + padding for the header{'\n'}
            • Scrim stays fixed with zIndex: 9999{'\n'}
            • Auto-adjusts for light/dark mode{'\n'}
            • pointerEvents="none" allows touches to pass through
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0F172A', // Dark background for contrast with light status bar
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#EFF6FF',
    margin: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 22,
  },
});
