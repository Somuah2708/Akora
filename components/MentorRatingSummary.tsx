import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MentorRatingSummaryProps {
  averageRating: number;
  totalRatings: number;
  size?: 'small' | 'medium' | 'large';
}

export default function MentorRatingSummary({
  averageRating,
  totalRatings,
  size = 'medium',
}: MentorRatingSummaryProps) {
  const renderStars = () => {
    const stars = [];
    const roundedRating = Math.round(averageRating * 2) / 2; // Round to nearest 0.5

    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(roundedRating)) {
        // Full star
        stars.push(
          <Ionicons
            key={i}
            name="star"
            size={sizes[size].star}
            color="#F59E0B"
          />
        );
      } else if (i === Math.ceil(roundedRating) && roundedRating % 1 !== 0) {
        // Half star
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={sizes[size].star}
            color="#F59E0B"
          />
        );
      } else {
        // Empty star
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={sizes[size].star}
            color="#D1D5DB"
          />
        );
      }
    }

    return stars;
  };

  if (totalRatings === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noRatingsText, { fontSize: sizes[size].text }]}>
          No ratings yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{renderStars()}</View>
      <View style={styles.ratingInfo}>
        <Text style={[styles.ratingValue, { fontSize: sizes[size].number }]}>
          {averageRating.toFixed(1)}
        </Text>
        <Text style={[styles.ratingCount, { fontSize: sizes[size].text }]}>
          ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
        </Text>
      </View>
    </View>
  );
}

const sizes = {
  small: {
    star: 14,
    number: 14,
    text: 12,
  },
  medium: {
    star: 18,
    number: 16,
    text: 13,
  },
  large: {
    star: 24,
    number: 20,
    text: 15,
  },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontWeight: '700',
    color: '#000000',
  },
  ratingCount: {
    color: '#6B7280',
  },
  noRatingsText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
