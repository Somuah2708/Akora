import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Mail, Bell, TrendingUp, Clock, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DigestSubscription {
  id: string;
  digest_type: string;
  frequency: string;
  is_enabled: boolean;
  last_sent_at: string | null;
}

export default function EmailDigestSettings() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<DigestSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    checkMentorStatus();
    fetchSubscriptions();
  }, []);

  const checkMentorStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('alumni_mentors')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      setIsMentor(!!data);
    } catch (error) {
      console.error('Error checking mentor status:', error);
    }
  };

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('email_digest_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Initialize defaults if none exist
      if (!data || data.length === 0) {
        await initializeSubscriptions();
        return;
      }

      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSubscriptions = async () => {
    if (!user) return;

    try {
      const defaultSubscriptions = [
        { user_id: user.id, digest_type: 'mentee_weekly', is_enabled: true }
      ];

      // Add mentor digest only if user is a mentor
      if (isMentor) {
        defaultSubscriptions.push({
          user_id: user.id,
          digest_type: 'mentor_weekly',
          is_enabled: true
        });
      }

      const { data, error } = await supabase
        .from('email_digest_subscriptions')
        .insert(defaultSubscriptions)
        .select();

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error initializing subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async (digestType: string, enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('email_digest_subscriptions')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('digest_type', digestType);

      if (error) throw error;

      setSubscriptions(prev =>
        prev.map(sub =>
          sub.digest_type === digestType ? { ...sub, is_enabled: enabled } : sub
        )
      );

      Alert.alert(
        'Success',
        `Email digest ${enabled ? 'enabled' : 'disabled'}. ${enabled ? 'You will receive weekly summaries.' : 'You will no longer receive these emails.'}`
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const getDigestInfo = (digestType: string) => {
    switch (digestType) {
      case 'mentor_weekly':
        return {
          icon: <TrendingUp size={20} color="#10B981" />,
          title: 'Mentor Weekly Digest',
          description: 'Summary of pending requests, new favorites, and your mentorship stats',
          color: '#10B981',
          bgColor: '#D1FAE5',
        };
      case 'mentee_weekly':
        return {
          icon: <Mail size={20} color="#4169E1" />,
          title: 'Mentee Weekly Digest',
          description: 'Your request updates and recommended mentors based on your interests',
          color: '#4169E1',
          bgColor: '#EFF6FF',
        };
      default:
        return {
          icon: <Bell size={20} color="#9CA3AF" />,
          title: digestType,
          description: 'Email digest',
          color: '#9CA3AF',
          bgColor: '#F3F4F6',
        };
    }
  };

  const formatLastSent = (date: string | null) => {
    if (!date) return 'Never sent';
    
    const sentDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return sentDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Mail size={24} color="#4169E1" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Email Digest Settings</Text>
          <Text style={styles.subtitle}>
            Manage your weekly email summaries
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No email digests available</Text>
            <Text style={styles.emptySubtext}>
              {isMentor ? 'You have access to both mentor and mentee digests' : 'Become a mentor to receive mentor digests'}
            </Text>
          </View>
        ) : (
          subscriptions.map(sub => {
            const info = getDigestInfo(sub.digest_type);
            return (
              <View key={sub.id} style={[styles.digestCard, { borderLeftColor: info.color }]}>
                <View style={[styles.iconContainer, { backgroundColor: info.bgColor }]}>
                  {info.icon}
                </View>
                
                <View style={styles.digestInfo}>
                  <View style={styles.digestHeader}>
                    <Text style={styles.digestTitle}>{info.title}</Text>
                    <Switch
                      value={sub.is_enabled}
                      onValueChange={(enabled) => toggleSubscription(sub.digest_type, enabled)}
                      trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                      thumbColor={sub.is_enabled ? info.color : '#F3F4F6'}
                    />
                  </View>
                  
                  <Text style={styles.digestDescription}>{info.description}</Text>
                  
                  <View style={styles.digestMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={14} color="#6B7280" />
                      <Text style={styles.metaText}>Every {sub.frequency}</Text>
                    </View>
                    {sub.last_sent_at && (
                      <View style={styles.metaItem}>
                        <CheckCircle size={14} color="#10B981" />
                        <Text style={styles.metaText}>Last sent {formatLastSent(sub.last_sent_at)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ About Email Digests</Text>
        <Text style={styles.infoText}>
          • Digests are sent weekly on Monday mornings{'\n'}
          • You can unsubscribe at any time{'\n'}
          • No spam - only relevant updates{'\n'}
          • Your email is never shared with third parties
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  digestCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digestInfo: {
    flex: 1,
  },
  digestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  digestTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    flex: 1,
  },
  digestDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 10,
  },
  digestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
    lineHeight: 20,
  },
});
