import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { 
  Target, 
  Sparkles, 
  Dumbbell, 
  Clock, 
  Wallet, 
  BookOpen, 
  PenLine,
  ChevronRight,
  TrendingUp,
  Brain
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

const GROWTH_CATEGORIES = [
  {
    id: '1',
    title: 'Goals & Vision Planning',
    description: 'Track your life vision and SMART goals',
    icon: Target,
    color: '#FFE4E4',
    progress: 75,
  },
  {
    id: '2',
    title: 'Habits & Daily Routines',
    description: 'Build and maintain positive habits',
    icon: Sparkles,
    color: '#E4EAFF',
    progress: 60,
  },
  {
    id: '3',
    title: 'Physical Health & Fitness',
    description: 'Track workouts and health metrics',
    icon: Dumbbell,
    color: '#E4FFF4',
    progress: 70,
  },
  {
    id: '4',
    title: 'Mental Well-being',
    description: 'Journal entries and mood tracking',
    icon: Brain,
    color: '#FFF4E4',
    progress: 65,
  },
  {
    id: '7',
    title: 'Time Management',
    description: 'Optimize your daily schedule',
    icon: Clock,
    color: '#F4E4FF',
    progress: 55,
  },
  {
    id: '9',
    title: 'Financial Planning',
    description: 'Track savings and investments',
    icon: Wallet,
    color: '#FFE4EA',
    progress: 40,
  },
  {
    id: '10',
    title: 'Personal Reflection',
    description: 'Document your journey',
    icon: PenLine,
    color: '#E4FFFF',
    progress: 90,
  },
];

const QUICK_STATS = [
  {
    title: 'Active Goals',
    value: '12',
    trend: '+2 this week',
    isPositive: true,
  },
  {
    title: 'Habits Tracked',
    value: '8',
    trend: '85% consistency',
    isPositive: true,
  },
  {
    title: 'Learning Hours',
    value: '24',
    trend: '+5 hrs this week',
    isPositive: true,
  },
];

export default function GrowScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user } = useAuth();
  const [stats, setStats] = useState(QUICK_STATS);
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Simulate fetching user stats
  useEffect(() => {
    if (user) {
      // In a real app, this would fetch from an API or database
      const fetchStats = async () => {
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Update stats with "real" data
          setStats([
            {
              title: 'Active Goals',
              value: Math.floor(Math.random() * 10 + 5).toString(), // 5-15 goals
              trend: `+${Math.floor(Math.random() * 5)} this week`,
              isPositive: true,
            },
            {
              title: 'Habits Tracked',
              value: Math.floor(Math.random() * 8 + 3).toString(), // 3-10 habits
              trend: `${Math.floor(Math.random() * 20 + 70)}% consistency`,
              isPositive: true,
            },
            {
              title: 'Learning Hours',
              value: Math.floor(Math.random() * 30 + 10).toString(), // 10-40 hours
              trend: `+${Math.floor(Math.random() * 10)} hrs this week`,
              isPositive: true,
            },
          ]);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };
      
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // Add navigation based on category
    switch (categoryId) {
      case '1':
        router.push('/goals');
        break;
      case '2':
        router.push('/habits');
        break;
      case '3':
        router.push('/physical-fitness');
        break;
      case '4':
        router.push('/mental-wellbeing');
        break;
      case '4':
        router.push('/professional');
        break;
      case '5':
        router.push('/academic');
        break;
      case '9':
        router.push('/financial-planning');
        break;
      case '10':
        router.push('/personal-reflection');
        break;
      case '7':
        router.push('/time-management');
        break;
      // Add other category routes as needed
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Personal Growth</Text>
        <Text style={styles.subtitle}>Track your journey of continuous improvement</Text>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.statCard}
            onPress={() => {
              // Show more details about the stat
              Alert.alert(
                stat.title,
                `Current value: ${stat.value}\nTrend: ${stat.trend}\n\nTap on any growth area below to explore more details and track your progress.`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
            <View style={styles.trendContainer}>
              <TrendingUp size={14} color={stat.isPositive ? '#10B981' : '#EF4444'} />
              <Text style={[styles.trendText, { color: stat.isPositive ? '#10B981' : '#EF4444' }]}>
                {stat.trend}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.categoriesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Growth Areas</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {GROWTH_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: category.color }]}
                onPress={() => handleCategoryPress(category.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <IconComponent size={24} color="#000000" strokeWidth={1.5} />
                  </View>
                  <View style={[styles.progressBar, { width: `${category.progress}%` }]} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {category.title}
                  </Text>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {category.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  categoriesContainer: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryCard: {
    width: (Dimensions.get('window').width - 64) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
    opacity: 0.1,
  },
  cardContent: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 16,
  },
});