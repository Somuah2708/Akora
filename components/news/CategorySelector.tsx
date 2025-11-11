import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NewsCategoryConfig } from '@/lib/types/news';

interface CategorySelectorProps {
  categories: NewsCategoryConfig[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategorySelector({
  categories,
  activeCategory,
  onCategoryChange,
}: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              isActive && { backgroundColor: category.color },
            ]}
            onPress={() => onCategoryChange(category.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                isActive && styles.activeCategoryText,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  container: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
});
