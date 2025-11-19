import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MentorStatsProps {
  totalRequests: number;
  acceptedRequests: number;
  completedRequests: number;
  acceptanceRate?: number;
  avgResponseTimeHours?: number;
}

export default function MentorStats({
  totalRequests,
  acceptedRequests,
  completedRequests,
}: MentorStatsProps) {

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mentor Statistics</Text>
      
      <View style={styles.statsGrid}>
        {/* Total Requests */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="mail" size={24} color="#2563EB" />
          </View>
          <Text style={styles.statValue}>{totalRequests}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>

        {/* Completed */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="trophy" size={24} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{completedRequests}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        {/* Accepted */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="thumbs-up" size={24} color="#059669" />
          </View>
          <Text style={styles.statValue}>{acceptedRequests}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
