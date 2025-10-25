import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Brain, Plus, Bell, ChevronRight, BookOpen, Star, Award, Briefcase, ChartLine as LineChart, Code, GraduationCap, Target, Clock, CircleCheck as CheckCircle, ChartBar as BarChart3, ArrowUpRight } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const SKILL_CATEGORIES = [
  { id: '1', name: 'Technical Skills', icon: Code, color: '#FFE4E4' },
  { id: '2', name: 'Leadership', icon: Target, color: '#E4EAFF' },
  { id: '3', name: 'Business', icon: Briefcase, color: '#E4FFF4' },
  { id: '4', name: 'Soft Skills', icon: Brain, color: '#FFF4E4' },
  { id: '5', name: 'Certifications', icon: Award, color: '#FFE4F4' },
];

const LEARNING_PATHS = [
  {
    id: '1',
    title: 'Full Stack Development',
    progress: 75,
    totalCourses: 12,
    completedCourses: 9,
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Project Management',
    progress: 60,
    totalCourses: 8,
    completedCourses: 5,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
  },
];

const CURRENT_SKILLS = [
  {
    id: '1',
    name: 'React Native',
    category: 'Technical',
    level: 'Advanced',
    progress: 85,
    lastPracticed: '2 days ago',
  },
  {
    id: '2',
    name: 'Team Leadership',
    category: 'Leadership',
    level: 'Intermediate',
    progress: 70,
    lastPracticed: '1 week ago',
  },
  {
    id: '3',
    name: 'Data Analysis',
    category: 'Technical',
    level: 'Intermediate',
    progress: 65,
    lastPracticed: '3 days ago',
  },
];

const UPCOMING_CERTIFICATIONS = [
  {
    id: '1',
    title: 'AWS Solutions Architect',
    provider: 'Amazon Web Services',
    deadline: 'March 30, 2024',
    progress: 60,
  },
  {
    id: '2',
    title: 'Project Management Professional (PMP)',
    provider: 'PMI',
    deadline: 'April 15, 2024',
    progress: 45,
  },
];

const STATS = [
  {
    title: 'Skills',
    value: '24',
    trend: '+3 this month',
    icon: Brain,
    isPositive: true,
  },
  {
    title: 'Certifications',
    value: '5',
    trend: '+1 this quarter',
    icon: Award,
    isPositive: true,
  },
  {
    title: 'Learning Hours',
    value: '120',
    trend: '+15 this week',
    icon: Clock,
    isPositive: true,
  },
];

export default function ProfessionalScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Professional Development</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#4169E1' }]}>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {STATS.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View key={index} style={styles.statCard}>
              <IconComponent size={24} color={stat.isPositive ? '#10B981' : '#EF4444'} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <View style={styles.trendContainer}>
                <ArrowUpRight size={14} color={stat.isPositive ? '#10B981' : '#EF4444'} />
                <Text style={[styles.trendText, { color: stat.isPositive ? '#10B981' : '#EF4444' }]}>
                  {stat.trend}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {SKILL_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { backgroundColor: category.color },
                activeCategory === category.id && styles.activeCategoryButton,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <IconComponent
                size={20}
                color={activeCategory === category.id ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.activeCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Learning Paths</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {LEARNING_PATHS.map((path) => (
          <View key={path.id} style={styles.pathCard}>
            <View style={styles.pathHeader}>
              <View>
                <Text style={styles.pathTitle}>{path.title}</Text>
                <Text style={styles.pathProgress}>
                  {path.completedCourses} of {path.totalCourses} courses completed
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{path.progress}%</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${path.progress}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Skills</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {CURRENT_SKILLS.map((skill) => (
          <View key={skill.id} style={styles.skillCard}>
            <View style={styles.skillHeader}>
              <View>
                <Text style={styles.skillName}>{skill.name}</Text>
                <View style={styles.skillMeta}>
                  <View style={styles.categoryTag}>
                    <Brain size={12} color="#4169E1" />
                    <Text style={styles.categoryTagText}>{skill.category}</Text>
                  </View>
                  <Text style={styles.skillLevel}>{skill.level}</Text>
                </View>
              </View>
              <Text style={styles.lastPracticed}>{skill.lastPracticed}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${skill.progress}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Certifications</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {UPCOMING_CERTIFICATIONS.map((cert) => (
          <View key={cert.id} style={styles.certCard}>
            <View style={styles.certHeader}>
              <Award size={24} color="#4169E1" />
              <View style={styles.certInfo}>
                <Text style={styles.certTitle}>{cert.title}</Text>
                <Text style={styles.certProvider}>{cert.provider}</Text>
              </View>
            </View>
            <View style={styles.certFooter}>
              <View style={styles.deadlineContainer}>
                <Clock size={14} color="#666666" />
                <Text style={styles.deadlineText}>Due: {cert.deadline}</Text>
              </View>
              <View style={styles.certProgress}>
                <Text style={styles.certProgressText}>{cert.progress}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${cert.progress}%` }]} />
                </View>
              </View>
            </View>
          </View>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 8,
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
  categoriesScroll: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#4169E1',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  pathCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pathTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  pathProgress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },
  skillCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  skillName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  skillLevel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  lastPracticed: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  certCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  certProvider: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  certProgress: {
    alignItems: 'flex-end',
    gap: 4,
  },
  certProgressText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});