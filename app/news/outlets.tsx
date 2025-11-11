import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COUNTRY_OUTLETS } from '@/lib/constants/news-outlets';
import { CountryOutlets, NewsOutlet } from '@/lib/types/outlets';
import OutletCard from '@/components/news/OutletCard';

function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '🏳️';
  const codePoints = cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function NewsOutletsDirectory() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const mapped = COUNTRY_OUTLETS.map((c) => {
      let data = c.outlets;
      if (q) {
        data = c.outlets.filter(o => o.name.toLowerCase().includes(q) || o.url.toLowerCase().includes(q));
      }
      return {
        title: `${flagEmoji(c.countryCode)} ${c.countryName}`,
        countryCode: c.countryCode,
        data,
      };
    }).filter(s => s.data.length > 0);
    return mapped;
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>News Outlets Directory</Text>
        <Text style={styles.subtitle}>Tap a publisher to open their official site</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search outlets or URLs"
          placeholderTextColor="#8E8E93"
          style={styles.search}
          returnKeyType="search"
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item: NewsOutlet) => item.id}
        renderItem={({ item }) => <OutletCard outlet={item} />}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F8F9FB',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#636366',
    marginTop: 2,
    marginBottom: 10,
  },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    paddingVertical: 8,
  },
});
