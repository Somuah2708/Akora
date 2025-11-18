# Email Digest & Smart Matching Implementation Guide

## Overview
This guide covers the implementation of two Priority 2 features:
1. **Email Digest** - Weekly summary emails for mentors with pending requests, upcoming sessions, and stats
2. **Smart Matching Recommendations** - AI-powered mentor recommendations based on mentee profiles and goals

---

## 1. Email Digest System

### Database Migration

```sql
-- ADD_EMAIL_DIGEST.sql

-- Email digest subscriptions table
CREATE TABLE IF NOT EXISTS email_digest_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('mentor_weekly', 'mentee_weekly', 'admin_monthly')),
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, digest_type)
);

-- Email digest logs for tracking
CREATE TABLE IF NOT EXISTS email_digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_to TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  content_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_digest_subscriptions_user ON email_digest_subscriptions(user_id);
CREATE INDEX idx_digest_logs_user_sent ON email_digest_logs(user_id, sent_at DESC);

-- RLS Policies
ALTER TABLE email_digest_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON email_digest_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON email_digest_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON email_digest_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs"
  ON email_digest_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Function to get mentor weekly digest data
CREATE OR REPLACE FUNCTION get_mentor_weekly_digest(mentor_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  digest_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'mentor_info', (
      SELECT jsonb_build_object(
        'full_name', am.full_name,
        'email', p.email,
        'total_mentees', am.total_mentees,
        'average_rating', am.average_rating
      )
      FROM alumni_mentors am
      JOIN profiles p ON p.id = am.user_id
      WHERE am.user_id = mentor_user_id
    ),
    'pending_requests', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', mr.id,
          'mentee_name', p.full_name,
          'message', mr.message,
          'requested_at', mr.created_at,
          'areas_of_interest', mr.areas_of_interest
        )
      ), '[]'::jsonb)
      FROM mentorship_requests mr
      JOIN profiles p ON p.id = mr.user_id
      WHERE mr.mentor_id = mentor_user_id
        AND mr.status = 'pending'
        AND mr.created_at >= NOW() - INTERVAL '7 days'
    ),
    'upcoming_sessions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', msb.id,
          'mentee_name', p.full_name,
          'scheduled_at', msb.scheduled_at,
          'duration', msb.duration_minutes,
          'notes', msb.notes
        )
      ), '[]'::jsonb)
      FROM mentor_session_bookings msb
      JOIN profiles p ON p.id = msb.mentee_id
      WHERE msb.mentor_id = mentor_user_id
        AND msb.status = 'confirmed'
        AND msb.scheduled_at >= NOW()
        AND msb.scheduled_at <= NOW() + INTERVAL '7 days'
    ),
    'week_stats', (
      SELECT jsonb_build_object(
        'new_requests', COUNT(DISTINCT CASE WHEN mr.created_at >= NOW() - INTERVAL '7 days' THEN mr.id END),
        'completed_sessions', COUNT(DISTINCT CASE WHEN msb.status = 'completed' AND msb.scheduled_at >= NOW() - INTERVAL '7 days' THEN msb.id END),
        'new_favorites', COUNT(DISTINCT CASE WHEN mf.created_at >= NOW() - INTERVAL '7 days' THEN mf.id END)
      )
      FROM alumni_mentors am
      LEFT JOIN mentorship_requests mr ON mr.mentor_id = am.user_id
      LEFT JOIN mentor_session_bookings msb ON msb.mentor_id = am.user_id
      LEFT JOIN mentor_favorites mf ON mf.mentor_id = am.user_id
      WHERE am.user_id = mentor_user_id
    )
  ) INTO digest_data;

  RETURN digest_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark digest as sent
CREATE OR REPLACE FUNCTION log_digest_sent(
  p_user_id UUID,
  p_digest_type TEXT,
  p_email_to TEXT,
  p_content_summary JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Insert log
  INSERT INTO email_digest_logs (user_id, digest_type, email_to, content_summary)
  VALUES (p_user_id, p_digest_type, p_email_to, p_content_summary)
  RETURNING id INTO log_id;

  -- Update subscription last_sent_at
  UPDATE email_digest_subscriptions
  SET last_sent_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id AND digest_type = p_digest_type;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### React Native Component

```tsx
// components/EmailDigestSettings.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DigestSubscription {
  id: string;
  digest_type: string;
  frequency: string;
  is_enabled: boolean;
}

export default function EmailDigestSettings() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<DigestSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

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
      const { data, error } = await supabase
        .from('email_digest_subscriptions')
        .insert([
          { user_id: user.id, digest_type: 'mentor_weekly', is_enabled: true },
          { user_id: user.id, digest_type: 'mentee_weekly', is_enabled: true }
        ])
        .select();

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error initializing subscriptions:', error);
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

      Alert.alert('Success', `Email digest ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Digest Settings</Text>
      <Text style={styles.subtitle}>
        Receive weekly summaries of your mentorship activity
      </Text>

      {subscriptions.map(sub => (
        <View key={sub.id} style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.label}>
              {sub.digest_type === 'mentor_weekly' ? 'Mentor Weekly Digest' : 'Mentee Weekly Digest'}
            </Text>
            <Text style={styles.description}>
              {sub.digest_type === 'mentor_weekly'
                ? 'Summary of requests, sessions, and stats'
                : 'Recommended mentors and opportunities'}
            </Text>
          </View>
          <Switch
            value={sub.is_enabled}
            onValueChange={(enabled) => toggleSubscription(sub.digest_type, enabled)}
            trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
            thumbColor={sub.is_enabled ? '#3B82F6' : '#F3F4F6'}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});
```

---

## 2. Smart Matching Recommendations

### Database Migration

```sql
-- ADD_SMART_MATCHING.sql

-- Mentor recommendations table
CREATE TABLE IF NOT EXISTS mentor_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) CHECK (match_score >= 0 AND match_score <= 1),
  match_reasons JSONB, -- Array of reason strings
  expertise_match TEXT[], -- Matched expertise areas
  industry_match BOOLEAN DEFAULT false,
  company_match BOOLEAN DEFAULT false,
  rating_weight DECIMAL(3,2),
  availability_weight DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  UNIQUE(user_id, mentor_id, created_at::DATE)
);

-- User preferences for matching
CREATE TABLE IF NOT EXISTS user_matching_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  career_goals TEXT[],
  preferred_industries TEXT[],
  preferred_expertise TEXT[],
  preferred_meeting_formats TEXT[],
  min_years_experience INTEGER DEFAULT 0,
  min_rating DECIMAL(2,1) DEFAULT 0,
  only_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recommendations_user ON mentor_recommendations(user_id, match_score DESC);
CREATE INDEX idx_recommendations_expires ON mentor_recommendations(expires_at);
CREATE INDEX idx_matching_prefs_user ON user_matching_preferences(user_id);

-- RLS Policies
ALTER TABLE mentor_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_matching_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
  ON mentor_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON user_matching_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Function to calculate mentor match score
CREATE OR REPLACE FUNCTION calculate_mentor_match_score(
  p_user_id UUID,
  p_mentor_id UUID
)
RETURNS TABLE (
  match_score DECIMAL(3,2),
  match_reasons JSONB,
  expertise_match TEXT[],
  industry_match BOOLEAN,
  rating_weight DECIMAL(3,2),
  availability_weight DECIMAL(3,2)
) AS $$
DECLARE
  v_user_prefs RECORD;
  v_mentor RECORD;
  v_score DECIMAL(3,2) := 0;
  v_reasons JSONB := '[]'::jsonb;
  v_expertise_matches TEXT[];
  v_industry_match BOOLEAN := false;
  v_rating_w DECIMAL(3,2) := 0;
  v_avail_w DECIMAL(3,2) := 0;
BEGIN
  -- Get user preferences
  SELECT * INTO v_user_prefs
  FROM user_matching_preferences
  WHERE user_id = p_user_id;

  -- Get mentor details
  SELECT * INTO v_mentor
  FROM alumni_mentors
  WHERE user_id = p_mentor_id AND is_available = true;

  -- If mentor not available, return 0
  IF v_mentor IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL(3,2), '[]'::jsonb, ARRAY[]::TEXT[], false, 0::DECIMAL(3,2), 0::DECIMAL(3,2);
    RETURN;
  END IF;

  -- Calculate expertise match (40% weight)
  IF v_user_prefs.preferred_expertise IS NOT NULL AND v_mentor.expertise_areas IS NOT NULL THEN
    v_expertise_matches := ARRAY(
      SELECT UNNEST(v_user_prefs.preferred_expertise)
      INTERSECT
      SELECT UNNEST(v_mentor.expertise_areas)
    );
    
    IF array_length(v_expertise_matches, 1) > 0 THEN
      v_score := v_score + (0.4 * (array_length(v_expertise_matches, 1)::DECIMAL / array_length(v_user_prefs.preferred_expertise, 1)::DECIMAL));
      v_reasons := v_reasons || jsonb_build_object('type', 'expertise', 'value', array_length(v_expertise_matches, 1) || ' matching expertise areas');
    END IF;
  END IF;

  -- Calculate industry match (20% weight)
  IF v_user_prefs.preferred_industries IS NOT NULL AND v_mentor.industry = ANY(v_user_prefs.preferred_industries) THEN
    v_industry_match := true;
    v_score := v_score + 0.2;
    v_reasons := v_reasons || jsonb_build_object('type', 'industry', 'value', 'Works in your preferred industry');
  END IF;

  -- Calculate rating weight (20% weight)
  IF v_mentor.average_rating IS NOT NULL AND v_mentor.average_rating >= v_user_prefs.min_rating THEN
    v_rating_w := LEAST(v_mentor.average_rating / 5.0, 1.0);
    v_score := v_score + (0.2 * v_rating_w);
    v_reasons := v_reasons || jsonb_build_object('type', 'rating', 'value', 'High rating (' || ROUND(v_mentor.average_rating, 1) || '/5)');
  END IF;

  -- Calculate experience weight (10% weight)
  IF v_mentor.years_of_experience >= v_user_prefs.min_years_experience THEN
    v_score := v_score + 0.1;
    v_reasons := v_reasons || jsonb_build_object('type', 'experience', 'value', v_mentor.years_of_experience || '+ years experience');
  END IF;

  -- Availability bonus (10% weight)
  IF v_mentor.is_available THEN
    v_avail_w := 1.0;
    v_score := v_score + 0.1;
    v_reasons := v_reasons || jsonb_build_object('type', 'availability', 'value', 'Currently available');
  END IF;

  RETURN QUERY SELECT 
    v_score,
    v_reasons,
    COALESCE(v_expertise_matches, ARRAY[]::TEXT[]),
    v_industry_match,
    v_rating_w,
    v_avail_w;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate recommendations for a user
CREATE OR REPLACE FUNCTION generate_mentor_recommendations(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS SETOF mentor_recommendations AS $$
BEGIN
  -- Delete old recommendations
  DELETE FROM mentor_recommendations
  WHERE user_id = p_user_id AND expires_at < NOW();

  -- Generate new recommendations
  RETURN QUERY
  INSERT INTO mentor_recommendations (
    user_id,
    mentor_id,
    match_score,
    match_reasons,
    expertise_match,
    industry_match,
    rating_weight,
    availability_weight
  )
  SELECT
    p_user_id,
    am.user_id,
    ms.match_score,
    ms.match_reasons,
    ms.expertise_match,
    ms.industry_match,
    ms.rating_weight,
    ms.availability_weight
  FROM alumni_mentors am
  CROSS JOIN LATERAL calculate_mentor_match_score(p_user_id, am.user_id) ms
  WHERE am.is_available = true
    AND am.user_id != p_user_id
    AND ms.match_score > 0.3 -- Minimum threshold
  ORDER BY ms.match_score DESC
  LIMIT p_limit
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### React Native Component

```tsx
// components/SmartMentorRecommendations.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Sparkles, Star, TrendingUp, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import MentorRatingSummary from './MentorRatingSummary';

interface Recommendation {
  id: string;
  mentor_id: string;
  match_score: number;
  match_reasons: { type: string; value: string }[];
  mentor: {
    full_name: string;
    current_title: string;
    company: string;
    profile_photo_url: string;
    average_rating: number;
    total_ratings: number;
    expertise_areas: string[];
  };
}

export default function SmartMentorRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = async () => {
    if (!user) return;

    try {
      // Call function to generate recommendations
      const { data, error } = await supabase.rpc('generate_mentor_recommendations', {
        p_user_id: user.id,
        p_limit: 5
      });

      if (error) throw error;

      // Fetch full mentor details
      if (data && data.length > 0) {
        const mentorIds = data.map((rec: any) => rec.mentor_id);
        
        const { data: mentors, error: mentorsError } = await supabase
          .from('alumni_mentors')
          .select('user_id, full_name, current_title, company, profile_photo_url, average_rating, total_ratings, expertise_areas')
          .in('user_id', mentorIds);

        if (mentorsError) throw mentorsError;

        // Combine recommendations with mentor data
        const enriched = data.map((rec: any) => ({
          ...rec,
          mentor: mentors?.find((m: any) => m.user_id === rec.mentor_id)
        })).filter((rec: any) => rec.mentor);

        setRecommendations(enriched);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Sparkles size={32} color="#4169E1" />
        <Text style={styles.loadingText}>Finding your perfect mentors...</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recommendations yet</Text>
        <Text style={styles.emptySubtext}>Update your preferences to get personalized matches</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={20} color="#4169E1" />
        <Text style={styles.title}>Recommended For You</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {recommendations.map((rec, idx) => (
          <TouchableOpacity
            key={rec.id}
            style={[styles.card, idx === 0 && styles.firstCard]}
            onPress={() => router.push(`/education/mentor/${rec.mentor_id}` as any)}
            activeOpacity={0.95}
          >
            <View style={styles.matchBadge}>
              <TrendingUp size={12} color="#10B981" />
              <Text style={styles.matchText}>{Math.round(rec.match_score * 100)}% Match</Text>
            </View>

            <Image
              source={{ uri: rec.mentor.profile_photo_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800' }}
              style={styles.avatar}
            />

            <Text style={styles.name}>{rec.mentor.full_name}</Text>
            <Text style={styles.title} numberOfLines={1}>{rec.mentor.current_title}</Text>
            
            <MentorRatingSummary
              averageRating={rec.mentor.average_rating || 0}
              totalRatings={rec.mentor.total_ratings || 0}
              size="small"
            />

            <View style={styles.reasonsContainer}>
              {rec.match_reasons.slice(0, 2).map((reason, idx) => (
                <View key={idx} style={styles.reasonChip}>
                  <Text style={styles.reasonText} numberOfLines={1}>{reason.value}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  scrollView: {
    paddingLeft: 16,
  },
  card: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4169E1',
  },
  firstCard: {
    borderColor: '#10B981',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  matchText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4169E1',
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  reasonsContainer: {
    marginTop: 12,
    gap: 6,
  },
  reasonChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
});
```

---

## Implementation Steps

### For Email Digest:
1. Run `ADD_EMAIL_DIGEST.sql` in Supabase SQL Editor
2. Set up email service (Supabase Auth emails, SendGrid, or AWS SES)
3. Create Edge Function or cron job to send weekly emails
4. Add `EmailDigestSettings` component to settings screen
5. Test with sample data

### For Smart Matching:
1. Run `ADD_SMART_MATCHING.sql` in Supabase SQL Editor
2. Create user preferences screen to capture career goals and preferences
3. Add `SmartMentorRecommendations` component to education/index.tsx
4. Test matching algorithm with various user profiles
5. Add refresh/regenerate recommendations button

---

## Server-Side Email Sending (Supabase Edge Function)

```typescript
// supabase/functions/send-weekly-digest/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Get all enabled mentor weekly subscriptions
    const { data: subscriptions, error } = await supabase
      .from('email_digest_subscriptions')
      .select('user_id, profiles(email, full_name)')
      .eq('digest_type', 'mentor_weekly')
      .eq('is_enabled', true)

    if (error) throw error

    for (const sub of subscriptions || []) {
      // Get digest data
      const { data: digestData } = await supabase
        .rpc('get_mentor_weekly_digest', { mentor_user_id: sub.user_id })

      if (digestData && digestData.mentor_info) {
        // Send email via your email service
        await sendDigestEmail(
          sub.profiles.email,
          sub.profiles.full_name,
          digestData
        )

        // Log the send
        await supabase.rpc('log_digest_sent', {
          p_user_id: sub.user_id,
          p_digest_type: 'mentor_weekly',
          p_email_to: sub.profiles.email,
          p_content_summary: digestData
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function sendDigestEmail(to: string, name: string, data: any) {
  // Implement with SendGrid, AWS SES, or similar
  console.log('Sending digest to:', to)
}
```

---

## Testing Checklist

- [ ] Email digest subscriptions can be toggled
- [ ] Weekly digest data is generated correctly
- [ ] Recommendations calculate accurate match scores
- [ ] User preferences update recommendation results
- [ ] Edge function sends emails on schedule
- [ ] Email logs are created properly
- [ ] Recommendations expire after 7 days
- [ ] UI components display data correctly
