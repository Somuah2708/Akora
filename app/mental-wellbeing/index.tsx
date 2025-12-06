import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, Bell, ChevronRight, Smile, Brain, Heart, Sun, Moon, CloudSun, Coffee, Music, Book, Cog as Yoga, MessageCircle, ArrowUpRight, PenLine } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const MOOD_CATEGORIES = [
  { id: '1', name: 'Morning', icon: Sun, color: '#FFE4E4' },
  { id: '2', name: 'Afternoon', icon: CloudSun, color: '#E4EAFF' },
  { id: '3', name: 'Evening', icon: Moon, color: '#E4FFF4' },
];

const WELLNESS_ACTIVITIES = [
  { id: '1', name: 'Meditation', icon: Brain, color: '#FFE4E4' },
  { id: '2', name: 'Exercise', icon: Yoga, color: '#E4EAFF' },
  { id: '3', name: 'Reading', icon: Book, color: '#E4FFF4' },
  { id: '4', name: 'Music', icon: Music, color: '#FFF4E4' },
  { id: '5', name: 'Journaling', icon: PenLine, color: '#FFE4F4' },
];

const DAILY_INSIGHTS = [
  {
    id: '1',
    title: 'Morning Reflection',
    quote: 'Every morning is a fresh beginning. Every day is the world made new.',
    author: 'Sarah Chauncey Woolsey',
    image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '2',
    title: 'Mindful Moment',
    quote: 'The present moment is filled with joy and happiness. If you are attentive, you will see it.',
    author: 'Thich Nhat Hanh',
    image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=60',
  },
];

const MOOD_TRACKING = [
  {
    date: 'Today',
    moods: [
      { time: 'Morning', mood: 'Happy', icon: Smile },
      { time: 'Afternoon', mood: 'Calm', icon: Sun },
      { time: 'Evening', mood: 'Relaxed', icon: Moon },
    ],
  },
];

const STATS = [
  {
    title: 'Mood Score',
    value: '85%',
    trend: '+5% this week',
    icon: Smile,
    isPositive: true,
  },
  {
    title: 'Mindful Days',
    value: '12',
    trend: '4 day streak',
    icon: Brain,
    isPositive: true,
  },
  {
    title: 'Journal Entries',
    value: '28',
    trend: '+3 this week',
    icon: PenLine,
    isPositive: true,
  },
];

export default function MentalWellbeingScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('1');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalEntry, setJournalEntry] = useState('');
  const [journalEntries, setJournalEntries] = useState([
    { id: '1', date: new Date().toISOString(), content: 'Today I felt grateful for the small moments of peace I found throughout the day. I noticed how the sunlight filtered through the trees during my morning walk, and how a simple cup of tea brought me comfort in the afternoon.' },
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), content: 'I struggled with focus today, but I\'m proud that I still completed my most important tasks. Tomorrow I\'ll try to create more structure in my morning routine.' }
  ]);
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

  const handleSaveJournalEntry = () => {
    if (journalEntry.trim()) {
      const newEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content: journalEntry.trim()
      };
      
      setJournalEntries([newEntry, ...journalEntries]);
      setJournalEntry('');
      setShowJournalModal(false);
      
      // Update stats
      const newStats = [...STATS];
      newStats[2].value = (parseInt(newStats[2].value) + 1).toString();
      
      // Show success message
      alert('Journal entry saved successfully!');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Mental Well-being</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <ThumbsUp size={32} color="#4169E1" />
            <Text style={styles.welcomeTitle}>How are you feeling today?</Text>
            <Text style={styles.welcomeText}>
              Take a moment to check in with yourself
            </Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Insights</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.insightsContainer}
          >
            {DAILY_INSIGHTS.map((insight) => (
              <TouchableOpacity key={insight.id} style={styles.insightCard}>
                <View style={styles.insightImageContainer}>
                  <View style={styles.insightOverlay} />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightQuote}>"{insight.quote}"</Text>
                  <Text style={styles.insightAuthor}>- {insight.author}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Tracking</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.moodCategoriesScroll}
            contentContainerStyle={styles.moodCategoriesContent}
          >
            {MOOD_CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.moodCategoryButton,
                    { backgroundColor: category.color },
                    activeCategory === category.id && styles.activeMoodCategory,
                  ]}
                  onPress={() => setActiveCategory(category.id)}
                >
                  <IconComponent
                    size={20}
                    color={activeCategory === category.id ? '#FFFFFF' : '#000000'}
                  />
                  <Text
                    style={[
                      styles.moodCategoryText,
                      activeCategory === category.id && styles.activeMoodCategoryText,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Journal Entries</Text>
          {journalEntries.map((entry) => (
            <View key={entry.id} style={styles.journalCard}>
              <Text style={styles.journalDate}>{formatDate(entry.date)}</Text>
              <Text style={styles.journalContent} numberOfLines={4}>{entry.content}</Text>
              <TouchableOpacity style={styles.readMoreButton}>
                <Text style={styles.readMoreText}>Read More</Text>
                <ChevronRight size={16} color="#4169E1" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wellness Activities</Text>
          <View style={styles.activitiesGrid}>
            {WELLNESS_ACTIVITIES.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[styles.activityCard, { backgroundColor: activity.color }]}
                >
                  <IconComponent size={24} color="#000000" />
                  <Text style={styles.activityName}>{activity.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowJournalModal(true)}
      >
        <PenLine size={24} color="#FFFFFF" />
        <Text style={styles.floatingButtonText}>Journal Entry</Text>
      </TouchableOpacity>

      <Modal
        visible={showJournalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJournalModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Journal Entry</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowJournalModal(false)}
              >
                <ArrowLeft size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.journalInput}
              placeholder="How are you feeling today?"
              placeholderTextColor="#666666"
              multiline
              textAlignVertical="top"
              value={journalEntry}
              onChangeText={setJournalEntry}
            />

            <TouchableOpacity 
              style={[
                styles.saveButton,
                !journalEntry.trim() && styles.saveButtonDisabled
              ]}
              onPress={handleSaveJournalEntry}
              disabled={!journalEntry.trim()}
            >
              <Text style={styles.saveButtonText}>Save Entry</Text>
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
  insightsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  insightCard: {
    width: width - 64,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    marginRight: 16,
  },
  insightImageContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  insightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  insightTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  insightQuote: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  insightAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  moodCategoriesScroll: {
    marginBottom: 24,
  },
  moodCategoriesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  moodCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  activeMoodCategory: {
    backgroundColor: '#4169E1',
  },
  moodCategoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activeMoodCategoryText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  journalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
  },
  journalDate: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginBottom: 8,
  },
  journalContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    lineHeight: 20,
    marginBottom: 8,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  readMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  activityCard: {
    width: (width - 48) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  activityName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
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
  journalInput: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});