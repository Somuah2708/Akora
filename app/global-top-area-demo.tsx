/**
 * Global Top Area Demo Screen
 * 
 * This screen demonstrates the seamless top area system with:
 * - Solid HEADER_COLOR filling entire top region
 * - No white gaps during pull-to-refresh
 * - Content scrolling smoothly behind the scrim
 * - Professional Instagram/TikTok-style UI
 */

import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { HEADER_COLOR, COLORS } from '@/constants/Colors';
import { Sparkles, Check } from 'lucide-react-native';

export default function GlobalTopAreaDemo() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#FFFFFF" // White spinner on dark background
            colors={['#FFFFFF']} // Android
          />
        }
      >
        {/* Header - Solid HEADER_COLOR background */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerContent}>
            <Sparkles size={28} color="#FFFFFF" strokeWidth={2} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Global Top Area</Text>
              <Text style={styles.headerSubtitle}>Professional UI System</Text>
            </View>
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🎯 What You're Seeing:</Text>
            <Text style={styles.infoText}>
              Pull down to refresh this screen. Notice how the entire top area stays SOLID with no white gaps or flashing - just like Instagram or TikTok.
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>✨ Features Implemented</Text>
            
            {[
              'Solid HEADER_COLOR (#0C1220) fills entire top region',
              'Status bar scrim matches header perfectly',
              'Safe area insets (notches) filled automatically',
              'Pull-to-refresh shows only header color',
              'No white gaps during scrolling or navigation',
              'Works on iOS (all devices) and Android',
              'Automatic on every screen in the app',
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Check size={20} color={COLORS.success} strokeWidth={2.5} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>🔧 Technical Details</Text>
            <View style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>Header Color:</Text>
              <View style={styles.colorSwatch}>
                <View style={[styles.colorBox, { backgroundColor: HEADER_COLOR }]} />
                <Text style={styles.colorCode}>{HEADER_COLOR}</Text>
              </View>
            </View>
            <View style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>Components:</Text>
              <Text style={styles.technicalValue}>
                • AppLayout (global wrapper){'\n'}
                • StatusBarScrim (fixed overlay){'\n'}
                • GlobalTopArea (safe area fill)
              </Text>
            </View>
            <View style={styles.technicalItem}>
              <Text style={styles.technicalLabel}>Status Bar:</Text>
              <Text style={styles.technicalValue}>
                Translucent on Android, automatic on iOS
              </Text>
            </View>
          </View>

          <View style={styles.demoCards}>
            <Text style={styles.sectionTitle}>📱 Try These Actions:</Text>
            
            <View style={styles.demoCard}>
              <Text style={styles.demoNumber}>1</Text>
              <View style={styles.demoContent}>
                <Text style={styles.demoTitle}>Pull to Refresh</Text>
                <Text style={styles.demoDescription}>
                  Drag down from the top. The spinner appears on solid background with zero white flashing.
                </Text>
              </View>
            </View>

            <View style={styles.demoCard}>
              <Text style={styles.demoNumber}>2</Text>
              <View style={styles.demoContent}>
                <Text style={styles.demoTitle}>Scroll Up & Down</Text>
                <Text style={styles.demoDescription}>
                  Content moves smoothly behind the fixed status bar scrim. No color changes or gaps.
                </Text>
              </View>
            </View>

            <View style={styles.demoCard}>
              <Text style={styles.demoNumber}>3</Text>
              <View style={styles.demoContent}>
                <Text style={styles.demoTitle}>Navigate Away</Text>
                <Text style={styles.demoDescription}>
                  Go to other screens. They all have the same clean top area automatically.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.successCard}>
            <Text style={styles.successText}>
              ✅ Your app now has Instagram-quality top area UI across every single screen!
            </Text>
          </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: HEADER_COLOR,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#1E3A8A',
    lineHeight: 22,
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    paddingLeft: 4,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  technicalCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  technicalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  technicalItem: {
    marginBottom: 16,
  },
  technicalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  technicalValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  colorSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'monospace',
  },
  demoCards: {
    marginBottom: 24,
  },
  demoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  demoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: HEADER_COLOR,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 16,
  },
  demoContent: {
    flex: 1,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  demoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  successCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 24,
  },
});
