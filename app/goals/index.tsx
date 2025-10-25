import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Target, Star, Clock, Calendar, ChevronRight, Plus, Bell, CircleCheck as CheckCircle, ChartBar as BarChart3, Brain, Rocket, Trophy, Flag, Sparkles, ArrowUpRight, X } from 'lucide-react-native';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const GOAL_CATEGORIES = [
  { id: '1', name: 'Career', icon: Rocket, color: '#FFE4E4' },
  { id: '2', name: 'Education', icon: Brain, color: '#E4EAFF' },
  { id: '3', name: 'Personal', icon: Star, color: '#E4FFF4' },
  { id: '4', name: 'Health', icon: Target, color: '#FFF4E4' },
  { id: '5', name: 'Financial', icon: BarChart3, color: '#FFE4F4' },
];

interface GoalWithUser extends ProductService {
  user: Profile;
  deadline?: string;
  progress?: number;
  milestones?: Array<{ title: string; completed: boolean }>;
}

const ACHIEVEMENTS = [
  {
    id: '1',
    title: 'Tech Leadership Award',
    date: 'February 2024',
    description: 'Recognized for innovation in AI',
    icon: Trophy,
  },
  {
    id: '2',
    title: 'Project Milestone',
    date: 'January 2024',
    description: 'Successfully launched MVP',
    icon: Flag,
  },
  {
    id: '3',
    title: 'Skill Mastery',
    date: 'December 2023',
    description: 'Advanced certification in ML',
    icon: Sparkles,
  },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeGoals, setActiveGoals] = useState<GoalWithUser[]>([]);
  const [visionBoard, setVisionBoard] = useState<GoalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch goals from products_services table
      const { data: goalsData, error: goalsError } = await supabase
        .from('products_services')
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .like('category_name', 'Goal - %')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      
      if (goalsError) throw goalsError;
      
      // Process the goals data
      const processedGoals = (goalsData || []).map(goal => {
        // Extract category from category_name (format: "Goal - Category")
        const categoryParts = goal.category_name.split(' - ');
        const category = categoryParts.length > 1 ? categoryParts[1] : 'Personal';
        
        // Extract deadline from description if available
        let deadline = '';
        let description = goal.description;
        
        if (description.startsWith('Deadline:')) {
          const parts = description.split(' | ');
          if (parts.length > 1) {
            deadline = parts[0].replace('Deadline: ', '');
            description = parts.slice(1).join(' | ');
          }
        }
        
        // Generate random progress for demo purposes
        const progress = Math.floor(Math.random() * 80) + 20; // 20-100%
        
        // Generate random milestones for demo purposes
        const milestoneCount = Math.floor(Math.random() * 3) + 2; // 2-4 milestones
        const milestones = [];
        
        for (let i = 0; i < milestoneCount; i++) {
          milestones.push({
            title: `Milestone ${i + 1}`,
            completed: i < Math.floor(progress / 25), // Complete based on progress
          });
        }
        
        return {
          ...goal,
          user: goal.profiles as Profile,
          category,
          deadline: deadline || 'December 2024',
          progress,
          milestones,
          description,
        };
      });
      
      // Split into regular goals and vision board items
      const goals = processedGoals.filter(goal => !goal.is_featured);
      const vision = processedGoals.filter(goal => goal.is_featured);
      
      setActiveGoals(goals);
      setVisionBoard(vision);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  if (!fontsLoaded) {
    return null;
  }

  // Filter goals based on selected category
  const filteredGoals = activeCategory === 'all' 
    ? activeGoals 
    : activeGoals.filter(goal => goal.category === GOAL_CATEGORIES.find(cat => cat.id === activeCategory)?.name);
  
  // Filter vision board items based on selected category
  const filteredVision = activeCategory === 'all'
    ? visionBoard
    : visionBoard.filter(item => item.category === GOAL_CATEGORIES.find(cat => cat.id === activeCategory)?.name);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Goals & Vision</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Plus size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressOverview}>
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Goal Progress</Text>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Target size={24} color="#4169E1" />
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Active Goals</Text>
            </View>
            <View style={styles.statItem}>
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <ArrowUpRight size={24} color="#F59E0B" />
              <Text style={styles.statValue}>75%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {GOAL_CATEGORIES.map((category) => {
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
          <Text style={styles.sectionTitle}>Active Goals</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading goals...</Text>
          </View>
        ) : filteredGoals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No goals found</Text>
            <Text style={styles.emptySubtext}>
              {activeCategory === 'all' 
                ? 'Tap the + button to add your first goal' 
                : 'Try selecting a different category or add a new goal'}
            </Text>
          </View>
        ) : (
          filteredGoals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              {goal.image_url && (
                <Image source={{ uri: goal.image_url }} style={styles.goalImage} />
              )}
              <View style={styles.goalContent}>
                <View style={styles.goalHeader}>
                  <View style={styles.categoryTag}>
                    <Target size={14} color="#4169E1" />
                    <Text style={styles.categoryTagText}>{goal.category}</Text>
                  </View>
                  <View style={styles.deadlineTag}>
                    <Calendar size={14} color="#F59E0B" />
                    <Text style={styles.deadlineText}>{goal.deadline}</Text>
                  </View>
                </View>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{goal.progress}%</Text>
                </View>
                <View style={styles.milestones}>
                  {goal.milestones?.map((milestone, index) => (
                    <View key={index} style={styles.milestone}>
                      <View style={[
                        styles.milestoneIndicator,
                        milestone.completed && styles.completedMilestone
                      ]}>
                        <CheckCircle size={12} color={milestone.completed ? '#FFFFFF' : '#666666'} />
                      </View>
                      <Text style={styles.milestoneText}>{milestone.title}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vision Board</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Customize</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading vision board...</Text>
          </View>
        ) : filteredVision.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your vision board is empty</Text>
            <Text style={styles.emptySubtext}>
              Add items to your vision board to visualize your dreams
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.visionContent}
          >
            {filteredVision.map((vision) => (
              <TouchableOpacity key={vision.id} style={styles.visionCard}>
                <Image source={{ uri: vision.image_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60' }} style={styles.visionImage} />
                <View style={styles.visionOverlay}>
                  <Text style={styles.visionTitle}>{vision.title}</Text>
                  <Text style={styles.visionDescription}>{vision.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {ACHIEVEMENTS.map((achievement) => {
          const IconComponent = achievement.icon;
          return (
            <View key={achievement.id} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <IconComponent size={24} color="#4169E1" />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <View style={styles.achievementDate}>
                  <Clock size={14} color="#666666" />
                  <Text style={styles.dateText}>{achievement.date}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/goals/create-goal')}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>New Goal</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Goal</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Goal creation form would go here</Text>
          </View>
        </View>
      </Modal>
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
  progressOverview: {
    padding: 16,
  },
  progressCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  goalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  goalImage: {
    width: '100%',
    height: 160,
  },
  goalContent: {
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  categoryTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  deadlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  goalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  milestones: {
    gap: 8,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedMilestone: {
    backgroundColor: '#10B981',
  },
  milestoneText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  visionContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  visionCard: {
    width: 240,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
  },
  visionImage: {
    width: '100%',
    height: '100%',
  },
  visionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  visionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  visionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  achievementDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', 
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#4169E1',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold', 
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginTop: 100,
  },
});