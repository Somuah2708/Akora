import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, GraduationCap, Plus, Bell, ChevronRight, BookOpen, Star, Award, Brain, Target, Clock, CircleCheck as CheckCircle, ChartBar as BarChart3, ArrowUpRight, FileText, Calculator, Beaker, Globe, Palette } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const SUBJECT_CATEGORIES = [
  { id: '1', name: 'Mathematics', icon: Calculator, color: '#FFE4E4' },
  { id: '2', name: 'Sciences', icon: Beaker, color: '#E4EAFF' },
  { id: '3', name: 'Languages', icon: Globe, color: '#E4FFF4' },
  { id: '4', name: 'Arts', icon: Palette, color: '#FFF4E4' },
  { id: '5', name: 'Literature', icon: BookOpen, color: '#FFE4F4' },
];

const CURRENT_COURSES = [
  {
    id: '1',
    title: 'Advanced Mathematics',
    instructor: 'Dr. Sarah Johnson',
    grade: 'A',
    progress: 85,
    nextAssignment: 'Calculus Project',
    dueDate: 'March 20, 2024',
  },
  {
    id: '2',
    title: 'Physics',
    instructor: 'Prof. Michael Chen',
    grade: 'A-',
    progress: 78,
    nextAssignment: 'Lab Report',
    dueDate: 'March 22, 2024',
  },
  {
    id: '3',
    title: 'World Literature',
    instructor: 'Dr. Emma Thompson',
    grade: 'B+',
    progress: 72,
    nextAssignment: 'Essay Analysis',
    dueDate: 'March 25, 2024',
  },
];

const ACADEMIC_ACHIEVEMENTS = [
  {
    id: '1',
    title: 'Dean\'s List',
    semester: 'Fall 2023',
    description: 'Achieved GPA of 3.8',
    date: 'December 2023',
  },
  {
    id: '2',
    title: 'Research Excellence',
    semester: 'Fall 2023',
    description: 'Best Research Paper Award',
    date: 'November 2023',
  },
];

const UPCOMING_EXAMS = [
  {
    id: '1',
    subject: 'Advanced Mathematics',
    date: 'March 28, 2024',
    time: '9:00 AM',
    location: 'Room 201',
    topics: ['Calculus', 'Linear Algebra', 'Statistics'],
  },
  {
    id: '2',
    subject: 'Physics',
    date: 'April 2, 2024',
    time: '10:30 AM',
    location: 'Science Hall',
    topics: ['Mechanics', 'Thermodynamics'],
  },
];

const STATS = [
  {
    title: 'Current GPA',
    value: '3.8',
    trend: '+0.2 this term',
    icon: Award,
    isPositive: true,
  },
  {
    title: 'Study Hours',
    value: '45',
    trend: '+5 this week',
    icon: Clock,
    isPositive: true,
  },
  {
    title: 'Assignments',
    value: '12/15',
    trend: '80% complete',
    icon: FileText,
    isPositive: true,
  },
];

export default function AcademicScreen() {
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Academic Excellence</Text>
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
          {SUBJECT_CATEGORIES.map((category) => {
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
            <Text style={styles.sectionTitle}>Current Courses</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {CURRENT_COURSES.map((course) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.instructor}>{course.instructor}</Text>
                </View>
                <View style={styles.gradeContainer}>
                  <Text style={styles.gradeText}>{course.grade}</Text>
                </View>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${course.progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{course.progress}%</Text>
              </View>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentTitle}>Next: {course.nextAssignment}</Text>
                <View style={styles.dueDate}>
                  <Clock size={14} color="#666666" />
                  <Text style={styles.dueDateText}>Due: {course.dueDate}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Exams</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {UPCOMING_EXAMS.map((exam) => (
            <View key={exam.id} style={styles.examCard}>
              <View style={styles.examHeader}>
                <GraduationCap size={24} color="#4169E1" />
                <View style={styles.examInfo}>
                  <Text style={styles.examSubject}>{exam.subject}</Text>
                  <View style={styles.examDateTime}>
                    <Clock size={14} color="#666666" />
                    <Text style={styles.examDateTimeText}>{exam.date} at {exam.time}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.examDetails}>
                <Text style={styles.examLocation}>{exam.location}</Text>
                <View style={styles.topicsContainer}>
                  {exam.topics.map((topic, index) => (
                    <View key={index} style={styles.topicTag}>
                      <Text style={styles.topicText}>{topic}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Academic Achievements</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          {ACADEMIC_ACHIEVEMENTS.map((achievement) => (
            <View key={achievement.id} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Award size={24} color="#4169E1" />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <View style={styles.achievementMeta}>
                  <Text style={styles.semesterText}>{achievement.semester}</Text>
                  <Text style={styles.dateText}>{achievement.date}</Text>
                </View>
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
        <Text style={styles.floatingButtonText}>Add Task</Text>
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
              <Text style={styles.modalTitle}>Add Academic Task</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <ArrowLeft size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Quick Add</Text>
                <View style={styles.quickAddGrid}>
                  <TouchableOpacity style={styles.quickAddItem}>
                    <View style={[styles.quickAddIcon, { backgroundColor: '#FFE4E4' }]}>
                      <FileText size={24} color="#000000" />
                    </View>
                    <Text style={styles.quickAddText}>Assignment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickAddItem}>
                    <View style={[styles.quickAddIcon, { backgroundColor: '#E4EAFF' }]}>
                      <BookOpen size={24} color="#000000" />
                    </View>
                    <Text style={styles.quickAddText}>Study Session</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickAddItem}>
                    <View style={[styles.quickAddIcon, { backgroundColor: '#E4FFF4' }]}>
                      <Brain size={24} color="#000000" />
                    </View>
                    <Text style={styles.quickAddText}>Exam Prep</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickAddItem}>
                    <View style={[styles.quickAddIcon, { backgroundColor: '#FFF4E4' }]}>
                      <Target size={24} color="#000000" />
                    </View>
                    <Text style={styles.quickAddText}>Project</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.customTaskButton}>
                <Plus size={20} color="#4169E1" />
                <Text style={styles.customTaskText}>Create Custom Task</Text>
              </TouchableOpacity>
            </ScrollView>
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
  courseCard: {
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
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  gradeContainer: {
    backgroundColor: '#E4FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  assignmentInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  assignmentTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  examCard: {
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
  examHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  examInfo: {
    flex: 1,
  },
  examSubject: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  examDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examDateTimeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  examDetails: {
    gap: 8,
  },
  examLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topicText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  achievementCard: {
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
  achievementMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  semesterText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  dateText: {
    fontSize: 12,
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
  customTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF0FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  customTaskText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
});