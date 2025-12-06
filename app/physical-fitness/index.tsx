import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, Bell, ChevronRight, Dumbbell, Heart, Activity, Apple, Timer, Footprints, Scale, Trophy, Target, ArrowUpRight, Flame, Utensils, Droplets, Moon } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const FITNESS_CATEGORIES = [
  { id: '1', name: 'Workouts', icon: Dumbbell, color: '#FFE4E4' },
  { id: '2', name: 'Nutrition', icon: Apple, color: '#E4EAFF' },
  { id: '3', name: 'Sleep', icon: Moon, color: '#E4FFF4' },
  { id: '4', name: 'Hydration', icon: Droplets, color: '#FFF4E4' },
];

const DAILY_STATS = [
  {
    title: 'Active Minutes',
    value: '45',
    target: '60 min',
    trend: '+15 vs yesterday',
    icon: Timer,
    isPositive: true,
  },
  {
    title: 'Steps',
    value: '8,547',
    target: '10,000',
    trend: '85% of goal',
    icon: Footprints,
    isPositive: true,
  },
  {
    title: 'Calories',
    value: '2,345',
    target: '2,500',
    trend: 'On track',
    icon: Flame,
    isPositive: true,
  },
];

const WORKOUT_PLANS = [
  {
    id: '1',
    title: 'Full Body Strength',
    duration: '45 min',
    difficulty: 'Intermediate',
    calories: '320',
    exercises: ['Squats', 'Push-ups', 'Deadlifts', 'Planks'],
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'HIIT Cardio',
    duration: '30 min',
    difficulty: 'Advanced',
    calories: '400',
    exercises: ['Burpees', 'Mountain Climbers', 'Jump Rope', 'Sprints'],
    image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&auto=format&fit=crop&q=60',
  },
];

const DAILY_INSIGHTS = [
  {
    id: '1',
    title: 'Nutrition Tip',
    content: 'Protein-rich foods help build and repair muscles after workouts.',
    icon: Apple,
  },
  {
    id: '2',
    title: 'Recovery Reminder',
    content: 'Remember to stretch and stay hydrated throughout your workout.',
    icon: Heart,
  },
  {
    id: '3',
    title: 'Weekly Progress',
    content: `You've completed 4 out of 5 planned workouts this week!`,
    icon: Trophy,
  },
];

const HEALTH_METRICS = [
  {
    id: '1',
    title: 'Weight Tracking',
    current: '165 lbs',
    change: '-2.5 lbs this month',
    icon: Scale,
  },
  {
    id: '2',
    title: 'Heart Rate',
    current: '72 bpm',
    change: 'Resting rate',
    icon: Heart,
  },
  {
    id: '3',
    title: 'Water Intake',
    current: '6/8 glasses',
    change: '75% of daily goal',
    icon: Droplets,
  },
];

export default function PhysicalFitnessScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('1');
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Physical Health & Fitness</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Activity size={32} color="#4169E1" />
            <Text style={styles.welcomeTitle}>Daily Activity Overview</Text>
            <Text style={styles.welcomeText}>
              Track your fitness journey and stay motivated
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          {DAILY_STATS.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View key={index} style={styles.statCard}>
                <IconComponent size={24} color={stat.isPositive ? '#10B981' : '#EF4444'} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statTarget}>{stat.target}</Text>
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
          {FITNESS_CATEGORIES.map((category) => {
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
                  size={24}
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
            <Text style={styles.sectionTitle}>Workout Plans</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workoutPlansContainer}
          >
            {WORKOUT_PLANS.map((plan) => (
              <TouchableOpacity key={plan.id} style={styles.workoutCard}>
                <View style={styles.workoutImageContainer}>
                  <View style={styles.workoutOverlay} />
                  <Text style={styles.workoutTitle}>{plan.title}</Text>
                  <View style={styles.workoutDetails}>
                    <View style={styles.workoutDetail}>
                      <Timer size={14} color="#FFFFFF" />
                      <Text style={styles.workoutDetailText}>{plan.duration}</Text>
                    </View>
                    <View style={styles.workoutDetail}>
                      <Flame size={14} color="#FFFFFF" />
                      <Text style={styles.workoutDetailText}>{plan.calories} cal</Text>
                    </View>
                  </View>
                  <View style={styles.difficultyTag}>
                    <Text style={styles.difficultyText}>{plan.difficulty}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Insights</Text>
          {DAILY_INSIGHTS.map((insight) => {
            const IconComponent = insight.icon;
            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: '#EBF0FF' }]}>
                  <IconComponent size={24} color="#4169E1" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightText}>{insight.content}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Metrics</Text>
          {HEALTH_METRICS.map((metric) => {
            const IconComponent = metric.icon;
            return (
              <View key={metric.id} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <IconComponent size={24} color="#4169E1" />
                  <Text style={styles.metricTitle}>{metric.title}</Text>
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricValue}>{metric.current}</Text>
                  <Text style={styles.metricChange}>{metric.change}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowWorkoutModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>Start Workout</Text>
      </TouchableOpacity>

      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start New Workout</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowWorkoutModal(false)}
              >
                <ArrowLeft size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {WORKOUT_PLANS.map((plan) => (
                <TouchableOpacity key={plan.id} style={styles.modalWorkoutCard}>
                  <Text style={styles.modalWorkoutTitle}>{plan.title}</Text>
                  <View style={styles.modalWorkoutDetails}>
                    <View style={styles.modalWorkoutDetail}>
                      <Timer size={16} color="#666666" />
                      <Text style={styles.modalDetailText}>{plan.duration}</Text>
                    </View>
                    <View style={styles.modalWorkoutDetail}>
                      <Flame size={16} color="#666666" />
                      <Text style={styles.modalDetailText}>{plan.calories} cal</Text>
                    </View>
                  </View>
                  <View style={styles.exerciseList}>
                    {plan.exercises.map((exercise, index) => (
                      <View key={index} style={styles.exerciseItem}>
                        <Dumbbell size={14} color="#666666" />
                        <Text style={styles.exerciseText}>{exercise}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.startButton}>
              <Text style={styles.startButtonText}>Begin Workout</Text>
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
  notificationButton: {
    padding: 8,
  },
  welcomeCard: {
    margin: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    gap: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
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
    marginBottom: 4,
    textAlign: 'center',
  },
  statTarget: {
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
    paddingVertical: 12,
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
    marginHorizontal: 16,
    marginBottom: 16,
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
  workoutPlansContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  workoutCard: {
    width: width - 64,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    marginRight: 16,
  },
  workoutImageContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  workoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  workoutTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  workoutDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  difficultyTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4169E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  insightCard: {
    flexDirection: 'row',
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
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  metricCard: {
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  metricContent: {
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  metricChange: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
    minHeight: '70%',
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
  modalScroll: {
    marginBottom: 24,
  },
  modalWorkoutCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalWorkoutTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  modalWorkoutDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  modalWorkoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  exerciseList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  startButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});