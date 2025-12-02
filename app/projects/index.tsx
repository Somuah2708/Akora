import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Search, Filter, Target, Clock, Users, ChevronRight, Building2, Calendar, Heart, Star, Briefcase, ArrowUpRight, CircleCheck as CheckCircle } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const PROJECT_CATEGORIES = [
  { id: '1', name: 'Infrastructure', icon: Building2, color: '#FFE4E4' },
  { id: '2', name: 'Academic', icon: Briefcase, color: '#E4EAFF' },
  { id: '3', name: 'Community', icon: Users, color: '#E4FFF4' },
  { id: '4', name: 'Innovation', icon: Star, color: '#FFF4E4' },
];

const FEATURED_PROJECTS = [
  {
    id: '1',
    title: 'New Science Complex',
    category: 'Infrastructure',
    status: 'In Progress',
    progress: 65,
    timeline: 'Est. Completion: Dec 2024',
    budget: '$2.5M',
    description: 'State-of-the-art science facility featuring modern laboratories and research spaces.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    team: {
      lead: 'Dr. Sarah Chen',
      members: 12,
    },
  },
  {
    id: '2',
    title: 'Digital Learning Initiative',
    category: 'Academic',
    status: 'Planning',
    progress: 25,
    timeline: 'Starting: March 2024',
    budget: '$800K',
    description: 'Comprehensive digital transformation of learning spaces and resources.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
    team: {
      lead: 'Prof. Michael Thompson',
      members: 8,
    },
  },
];

const ONGOING_PROJECTS = [
  {
    id: '1',
    title: 'Library Renovation',
    category: 'Infrastructure',
    progress: 45,
    deadline: 'June 2024',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Sports Complex Upgrade',
    category: 'Infrastructure',
    progress: 80,
    deadline: 'April 2024',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    title: 'Scholarship Program 2024',
    category: 'Academic',
    progress: 30,
    deadline: 'May 2024',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
  },
];

const UPCOMING_PROJECTS = [
  {
    id: '1',
    title: 'Green Campus Initiative',
    category: 'Community',
    startDate: 'July 2024',
    estimatedBudget: '$1.2M',
    description: 'Sustainable campus development project focusing on renewable energy and waste management.',
    image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'AI Research Center',
    category: 'Innovation',
    startDate: 'September 2024',
    estimatedBudget: '$3M',
    description: 'Establishment of a dedicated artificial intelligence research and development center.',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=60',
  },
];

const STATS = [
  {
    title: 'Active Projects',
    value: '12',
    trend: '+3 this quarter',
    icon: Target,
    isPositive: true,
  },
  {
    title: 'Total Budget',
    value: '$8.5M',
    trend: '85% allocated',
    icon: Briefcase,
    isPositive: true,
  },
  {
    title: 'Team Members',
    value: '45',
    trend: '+8 new hires',
    icon: Users,
    isPositive: true,
  },
];

export default function ProjectsScreen() {
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
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#4169E1"
          colors={['#4169E1']}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>School Projects</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor="#666666"
          />
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
        {PROJECT_CATEGORIES.map((category) => {
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
          <Text style={styles.sectionTitle}>Featured Projects</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredContent}
        >
          {FEATURED_PROJECTS.map((project) => (
            <TouchableOpacity key={project.id} style={styles.featuredCard}>
              <Image source={{ uri: project.image }} style={styles.featuredImage} />
              <View style={styles.featuredOverlay}>
                <View style={styles.categoryTag}>
                  <Building2 size={14} color="#4169E1" />
                  <Text style={styles.categoryTagText}>{project.category}</Text>
                </View>
                <Text style={styles.projectTitle}>{project.title}</Text>
                <Text style={styles.projectDescription}>{project.description}</Text>
                <View style={styles.projectStats}>
                  <View style={styles.statItem}>
                    <Clock size={14} color="#FFFFFF" />
                    <Text style={styles.statText}>{project.timeline}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Briefcase size={14} color="#FFFFFF" />
                    <Text style={styles.statText}>{project.budget}</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamLead}>Lead: {project.team.lead}</Text>
                  <View style={styles.teamMembers}>
                    <Users size={14} color="#FFFFFF" />
                    <Text style={styles.teamMembersText}>{project.team.members} members</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ongoing Projects</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {ONGOING_PROJECTS.map((project) => (
          <TouchableOpacity key={project.id} style={styles.ongoingCard}>
            <Image source={{ uri: project.image }} style={styles.ongoingImage} />
            <View style={styles.ongoingInfo}>
              <View style={styles.ongoingHeader}>
                <Text style={styles.ongoingTitle}>{project.title}</Text>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{project.category}</Text>
                </View>
              </View>
              <View style={styles.ongoingProgress}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{project.progress}%</Text>
              </View>
              <View style={styles.deadlineInfo}>
                <Clock size={14} color="#666666" />
                <Text style={styles.deadlineText}>Deadline: {project.deadline}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Projects</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {UPCOMING_PROJECTS.map((project) => (
          <TouchableOpacity key={project.id} style={styles.upcomingCard}>
            <Image source={{ uri: project.image }} style={styles.upcomingImage} />
            <View style={styles.upcomingOverlay}>
              <View style={styles.upcomingContent}>
                <View style={styles.categoryTag}>
                  <Building2 size={14} color="#4169E1" />
                  <Text style={styles.categoryTagText}>{project.category}</Text>
                </View>
                <Text style={styles.upcomingTitle}>{project.title}</Text>
                <Text style={styles.upcomingDescription}>{project.description}</Text>
                <View style={styles.upcomingDetails}>
                  <View style={styles.detailItem}>
                    <Calendar size={14} color="#FFFFFF" />
                    <Text style={styles.detailText}>Start: {project.startDate}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Briefcase size={14} color="#FFFFFF" />
                    <Text style={styles.detailText}>Budget: {project.estimatedBudget}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
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
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
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
  featuredContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  featuredCard: {
    width: CARD_WIDTH,
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 12,
  },
  categoryTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  projectTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 16,
  },
  projectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },
  teamInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamLead: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  teamMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamMembersText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  ongoingCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ongoingImage: {
    width: 100,
    height: 100,
  },
  ongoingInfo: {
    flex: 1,
    padding: 12,
  },
  ongoingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ongoingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  categoryChip: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  ongoingProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  upcomingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  upcomingImage: {
    width: '100%',
    height: '100%',
  },
  upcomingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  upcomingContent: {
    padding: 16,
  },
  upcomingTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  upcomingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 12,
  },
  upcomingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
});