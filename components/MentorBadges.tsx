import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Award,
  Star,
  Trophy,
  Crown,
  Heart,
  Sparkles,
  Zap,
} from 'lucide-react-native';

interface Badge {
  badge_type: string;
  badge_name: string;
  badge_description: string;
  icon_name: string;
  earned_at: string;
}

interface MentorBadgesProps {
  badges: Badge[];
  size?: 'small' | 'medium' | 'large';
  maxDisplay?: number;
}

const BADGE_ICONS: Record<string, any> = {
  award: Award,
  star: Star,
  trophy: Trophy,
  crown: Crown,
  heart: Heart,
  sparkles: Sparkles,
  zap: Zap,
};

const BADGE_COLORS: Record<string, string> = {
  first_session: '#3B82F6',
  ten_sessions: '#10B981',
  twenty_five_sessions: '#F59E0B',
  fifty_sessions: '#8B5CF6',
  highly_rated: '#EF4444',
  perfect_rating: '#EC4899',
  active_mentor: '#14B8A6',
};

export default function MentorBadges({
  badges,
  size = 'medium',
  maxDisplay,
}: MentorBadgesProps) {
  if (!badges || badges.length === 0) {
    return null;
  }

  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const remainingCount = badges.length - displayBadges.length;

  const badgeSize = size === 'small' ? 28 : size === 'medium' ? 36 : 44;
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 18 : 22;

  return (
    <View style={styles.container}>
      <View style={styles.badgesRow}>
        {displayBadges.map((badge) => {
          const IconComponent = BADGE_ICONS[badge.icon_name] || Award;
          const badgeColor = BADGE_COLORS[badge.badge_type] || '#6B7280';

          return (
            <View
              key={badge.badge_type}
              style={[
                styles.badge,
                {
                  width: badgeSize,
                  height: badgeSize,
                  backgroundColor: badgeColor + '20',
                  borderColor: badgeColor,
                },
              ]}
            >
              <IconComponent size={iconSize} color={badgeColor} />
            </View>
          );
        })}
        {remainingCount > 0 && (
          <View
            style={[
              styles.badge,
              styles.moreBadge,
              {
                width: badgeSize,
                height: badgeSize,
              },
            ]}
          >
            <Text style={[styles.moreText, { fontSize: iconSize - 2 }]}>
              +{remainingCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  moreBadge: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  moreText: {
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
});
