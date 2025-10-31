import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Search, TrendingUp, Heart, Users, Sparkles, ChevronRight, Zap, Award, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

export default function DiscoverScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const trendingTopics = [
    { id: '1', name: 'Tech Innovation', icon: Zap, color: '#4169E1' },
    { id: '2', name: 'Community Events', icon: Users, color: '#10B981' },
    { id: '3', name: 'Achievement', icon: Award, color: '#F59E0B' },
    { id: '4', name: 'Goals & Growth', icon: Target, color: '#EF4444' },
  ];

  const featuredContent = [
    {
      id: '1',
      title: 'Connect with Alumni',
      description: 'Discover opportunities through our alumni network',
      category: 'Networking',
    },
    {
      id: '2',
      title: 'Marketplace Deals',
      description: 'Explore the latest products and services',
      category: 'Shopping',
    },
    {
      id: '3',
      title: 'Educational Resources',
      description: 'Access learning materials and courses',
      category: 'Education',
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Discover</Text>
            <Text style={styles.headerSubtitle}>Explore what's trending</Text>
          </View>
          <TouchableOpacity 
            style={styles.favoritesButton}
            onPress={() => router.push('/favorites' as any)}
          >
            <Heart size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for anything..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Trending Topics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#4169E1" />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsScroll}>
            {trendingTopics.map((topic) => (
              <TouchableOpacity key={topic.id} style={styles.topicCard}>
                <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
                  <topic.icon size={24} color={topic.color} />
                </View>
                <Text style={styles.topicName}>{topic.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Content */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color="#4169E1" />
            <Text style={styles.sectionTitle}>Featured for You</Text>
          </View>
          {featuredContent.map((item) => (
            <TouchableOpacity key={item.id} style={styles.featureCard}>
              <View style={styles.featureContent}>
                <Text style={styles.featureCategory}>{item.category}</Text>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  favoritesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
  },
  topicsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  topicCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 100,
  },
  topicIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  topicName: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureCategory: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
