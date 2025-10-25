import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Plus, Bell, Sparkles, Sun, Moon, Coffee, Book, Dumbbell, Brain, Heart, Battery, CircleCheck as CheckCircle2, ChartBar as BarChart3, Calendar, Clock, ArrowUpRight, Target, X } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const HABIT_CATEGORIES = [
  { id: '1', name: 'Morning Routine', icon: Sun, color: '#FFE4E4' },
  { id: '2', name: 'Evening Routine', icon: Moon, color: '#E4EAFF' },
  { id: '3', name: 'Health', icon: Heart, color: '#E4FFF4' },
  { id: '4', name: 'Productivity', icon: Brain, color: '#FFF4E4' },
  { id: '5', name: 'Fitness', icon: Dumbbell, color: '#FFE4F4' },
];

const ACTIVE_HABITS = [
  {
    id: '1',
    title: 'Morning Meditation',
    category: 'Morning Routine',
    streak: 15,
    completionRate: 90,
    timeOfDay: '6:00 AM',
    daysCompleted: [true, true, true, false, true, true, true],
  },
  {
    id: '2',
    title: 'Reading',
    category: 'Evening Routine',
    streak: 8,
    completionRate: 75,
    timeOfDay: '9:00 PM',
    daysCompleted: [true, true, false, true, true, false, true],
  },
  {
    id: '3',
    title: 'Exercise',
    category: 'Fitness',
    streak: 12,
    completionRate: 85,
    timeOfDay: '7:00 AM',
    daysCompleted: [true, true, true, true, false, true, true],
  },
];

const STATS = [
  {
    title: 'Active Habits',
    value: '8',
    trend: '+2 this week',
    icon: Target,
    isPositive: true,
  },
  {
    title: 'Completion Rate',
    value: '85%',
    trend: '+5% vs last week',
    icon: CheckCircle2,
    isPositive: true,
  },
  {
    title: 'Longest Streak',
    value: '15',
    trend: 'Current record',
    icon: ArrowUpRight,
    isPositive: true,
  },
];

export default function HabitsScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
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

  const getDayName = (index: number) => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return days[index];
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Habits & Routines</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={24} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: '#4169E1' }]}
              onPress={() => setShowAddModal(true)}
            >
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
          {HABIT_CATEGORIES.map((category) => {
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
          <Text style={styles.sectionTitle}>Today's Habits</Text>
          {ACTIVE_HABITS.map((habit) => (
            <View key={habit.id} style={styles.habitCard}>
              <View style={styles.habitHeader}>
                <View style={styles.habitTitleContainer}>
                  <Text style={styles.habitTitle}>{habit.title}</Text>
                  <View style={styles.categoryTag}>
                    <Sparkles size={14} color="#4169E1" />
                    <Text style={styles.categoryTagText}>{habit.category}</Text>
                  </View>
                </View>
                <View style={styles.timeContainer}>
                  <Clock size={14} color="#666666" />
                  <Text style={styles.timeText}>{habit.timeOfDay}</Text>
                </View>
              </View>

              <View style={styles.habitStats}>
                <View style={styles.streakContainer}>
                  <BarChart3 size={16} color="#4169E1" />
                  <Text style={styles.streakText}>{habit.streak} day streak</Text>
                </View>
                <View style={styles.completionContainer}>
                  <Battery size={16} color="#10B981" />
                  <Text style={styles.completionText}>{habit.completionRate}% completion</Text>
                </View>
              </View>

              <View style={styles.weekProgress}>
                {habit.daysCompleted.map((completed, index) => (
                  <View key={index} style={styles.dayContainer}>
                    <Text style={styles.dayText}>{getDayName(index)}</Text>
                    <View style={[styles.dayIndicator, completed && styles.completedDay]}>
                      <CheckCircle2 size={16} color={completed ? '#FFFFFF' : '#E5E7EB'} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>New Habit</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Habit</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Quick Add</Text>
              <View style={styles.quickAddGrid}>
                <TouchableOpacity style={styles.quickAddItem}>
                  <View style={[styles.quickAddIcon, { backgroundColor: '#FFE4E4' }]}>
                    <Sun size={24} color="#000000" />
                  </View>
                  <Text style={styles.quickAddText}>Morning Routine</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAddItem}>
                  <View style={[styles.quickAddIcon, { backgroundColor: '#E4EAFF' }]}>
                    <Moon size={24} color="#000000" />
                  </View>
                  <Text style={styles.quickAddText}>Evening Routine</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAddItem}>
                  <View style={[styles.quickAddIcon, { backgroundColor: '#E4FFF4' }]}>
                    <Dumbbell size={24} color="#000000" />
                  </View>
                  <Text style={styles.quickAddText}>Exercise</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAddItem}>
                  <View style={[styles.quickAddIcon, { backgroundColor: '#FFF4E4' }]}>
                    <Book size={24} color="#000000" />
                  </View>
                  <Text style={styles.quickAddText}>Reading</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.customHabitButton}>
              <Plus size={20} color="#4169E1" />
              <Text style={styles.customHabitText}>Create Custom Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  habitTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  habitTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  categoryTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  habitStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  completionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  weekProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dayContainer: {
    alignItems: 'center',
    gap: 4,
  },
  dayText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedDay: {
    backgroundColor: '#10B981',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4169E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  closeButton: {
    padding: 8,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickAddItem: {
    width: (width - 64) / 2,
    alignItems: 'center',
    gap: 8,
  },
  quickAddIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    textAlign: 'center',
  },
  customHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF0FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  customHabitText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});