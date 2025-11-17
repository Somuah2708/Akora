import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MentorStatsProps {
  totalRequests: number;
  acceptedRequests: number;
  completedRequests: number;
  acceptanceRate: number;
  avgResponseTimeHours?: number;
}

export default function MentorStats({
  totalRequests,
  acceptedRequests,
  completedRequests,
  acceptanceRate,
  avgResponseTimeHours,
}: MentorStatsProps) {
  const completionRate = totalRequests > 0 
    ? Math.round((completedRequests / totalRequests) * 100) 
    : 0;

  const formatResponseTime = (hours?: number): string => {
    if (!hours || hours === 0) return 'N/A';
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mentor Statistics</Text>
      
      <View style={styles.statsGrid}>
        {/* Total Requests */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="mail" size={20} color="#2563EB" />
          </View>
          <Text style={styles.statValue}>{totalRequests}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>

        {/* Acceptance Rate */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{acceptanceRate}%</Text>
          <Text style={styles.statLabel}>Acceptance Rate</Text>
        </View>

        {/* Completed */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="trophy" size={20} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{completedRequests}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        {/* Completion Rate */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="ribbon" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Completion Rate</Text>
        </View>

        {/* Response Time */}
        {avgResponseTimeHours !== undefined && (
          <View style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="time" size={20} color="#EC4899" />
            </View>
            <Text style={styles.statValue}>{formatResponseTime(avgResponseTimeHours)}</Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
        )}

        {/* Accepted */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="thumbs-up" size={20} color="#059669" />
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
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});
