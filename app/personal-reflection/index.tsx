import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Modal, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, Bell, ChevronRight, BookOpen, PenLine, Star, Calendar, Clock, Tag, Search, Filter, Heart, Lightbulb, Target, X, CreditCard as Edit3, Trash2 } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

// Placeholder data for journal entries
const INITIAL_JOURNAL_ENTRIES = [
  {
    id: '1',
    title: 'Finding My Purpose',
    content: 'Today I reflected on what truly matters to me in life. I realized that helping others and creating meaningful connections brings me the most joy. I want to focus more on building community and less on material pursuits.',
    date: '2024-07-15',
    mood: 'Thoughtful',
    tags: ['Purpose', 'Values', 'Connection'],
    isPrivate: false,
  },
  {
    id: '2',
    title: 'Overcoming Challenges',
    content: 'I faced a difficult situation at work today. Instead of reacting impulsively, I took a step back and considered multiple perspectives. This approach helped me find a solution that worked for everyone involved. I\'m proud of my growth in handling conflict.',
    date: '2024-07-12',
    mood: 'Proud',
    tags: ['Growth', 'Work', 'Conflict Resolution'],
    isPrivate: true,
  },
  {
    id: '3',
    title: 'Gratitude Practice',
    content: 'Three things I\'m grateful for today: 1) The support of my family during difficult times, 2) The opportunity to learn new skills through my current project, 3) The beautiful weather that allowed me to spend time in nature.',
    date: '2024-07-10',
    mood: 'Grateful',
    tags: ['Gratitude', 'Family', 'Nature'],
    isPrivate: false,
  },
];

// Placeholder data for reflection prompts
const REFLECTION_PROMPTS = [
  {
    id: '1',
    question: 'What made you feel most alive today?',
    category: 'Daily Reflection',
  },
  {
    id: '2',
    question: 'What is one thing you learned about yourself this week?',
    category: 'Weekly Reflection',
  },
  {
    id: '3',
    question: "What are three things you're grateful for right now?",
    category: 'Gratitude',
  },
  {
    id: '4',
    question: 'What is one small step you can take toward your biggest goal?',
    category: 'Goals',
  },
  {
    id: '5',
    question: 'How did you practice self-care today?',
    category: 'Self-Care',
  },
];

// Placeholder data for insights
const INSIGHTS = [
  {
    id: '1',
    title: 'Most Common Mood',
    value: 'Grateful',
    trend: '5 entries this month',
  },
  {
    id: '2',
    title: 'Reflection Streak',
    value: '12 days',
    trend: 'Personal best!',
  },
  {
    id: '3',
    title: 'Top Theme',
    value: 'Growth',
    trend: 'Recurring in 8 entries',
  },
];

// Mood options
const MOODS = [
  'Happy', 'Grateful', 'Inspired', 'Calm', 'Anxious', 
  'Frustrated', 'Sad', 'Excited', 'Proud', 'Thoughtful'
];

export default function PersonalReflectionScreen() {
  const router = useRouter();
  const [journalEntries, setJournalEntries] = useState(INITIAL_JOURNAL_ENTRIES);
  const [filteredEntries, setFilteredEntries] = useState(INITIAL_JOURNAL_ENTRIES);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showViewEntryModal, setShowViewEntryModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moodStats, setMoodStats] = useState({
    'Happy': 0,
    'Grateful': 0,
    'Inspired': 0,
    'Calm': 0,
    'Anxious': 0,
    'Frustrated': 0,
    'Sad': 0,
    'Excited': 0,
    'Proud': 0,
    'Thoughtful': 0
  });
  
  // New entry form state
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [entryMood, setEntryMood] = useState('');
  const [entryTags, setEntryTags] = useState('');
  const [entryIsPrivate, setEntryIsPrivate] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Filter entries based on search query and selected mood
  useEffect(() => {
    let filtered = [...journalEntries];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(query) || 
        entry.content.toLowerCase().includes(query) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (selectedMood) {
      filtered = filtered.filter(entry => entry.mood === selectedMood);
    }
    
    setFilteredEntries(filtered);
  }, [journalEntries, searchQuery, selectedMood]);

  // Calculate mood stats when journal entries change
  useEffect(() => {
    const stats = { ...moodStats };
    
    // Reset all counts
    Object.keys(stats).forEach(mood => {
      stats[mood] = 0;
    });
    
    // Count entries by mood
    journalEntries.forEach(entry => {
      if (entry.mood && stats[entry.mood] !== undefined) {
        stats[entry.mood]++;
      }
    });
    
    setMoodStats(stats);
  }, [journalEntries]);

  if (!fontsLoaded) {
    return null;
  }
  
  const handleAddEntry = () => {
    if (!entryTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for your journal entry');
      return;
    }
    
    if (!entryContent.trim()) {
      Alert.alert('Error', 'Please enter content for your journal entry');
      return;
    }
    
    if (!entryMood) {
      Alert.alert('Error', 'Please select a mood for your journal entry');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newEntry = {
        id: Date.now().toString(),
        title: entryTitle.trim(),
        content: entryContent.trim(),
        date: new Date().toISOString().split('T')[0],
        mood: entryMood,
        tags: entryTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPrivate: entryIsPrivate,
      };
      
      setJournalEntries([newEntry, ...journalEntries]);
      
      // Update insights based on new entry
      const updatedInsights = [...INSIGHTS];
      if (entryMood === 'Grateful') {
        updatedInsights[0].value = 'Grateful';
        updatedInsights[0].trend = `${moodStats['Grateful'] + 1} entries this month`;
      }
      
      // Update reflection streak
      const currentStreak = parseInt(updatedInsights[1].value.split(' ')[0]);
      updatedInsights[1].value = `${currentStreak + 1} days`;
      updatedInsights[1].trend = 'Personal best!';
      
      // Update top theme if tags include 'Growth'
      if (entryTags.includes('Growth')) {
        const growthCount = parseInt(updatedInsights[2].trend.split(' ')[0]) + 1;
        updatedInsights[2].trend = `Recurring in ${growthCount} entries`;
      }
      
      // Reset form
      setEntryTitle('');
      setEntryContent('');
      setEntryMood('');
      setEntryTags('');
      setEntryIsPrivate(false);
      
      setIsSubmitting(false);
      setShowAddEntryModal(false);
      
      Alert.alert('Success', 'Journal entry added successfully');
    }, 1000);
  };
  
  const handleDeleteEntry = (entryId) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            setJournalEntries(journalEntries.filter(entry => entry.id !== entryId));
            setShowViewEntryModal(false);
          },
          style: 'destructive',
        },
      ]
    );
  };
  
  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
    setShowViewEntryModal(true);
  };
  
  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setEntryTitle(prompt.category);
    setEntryContent(prompt.question + '\n\n');
    setShowPromptModal(false);
    setShowAddEntryModal(true);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const getRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * REFLECTION_PROMPTS.length);
    return REFLECTION_PROMPTS[randomIndex];
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Personal Reflection</Text>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => debouncedRouter.push('/notices')}
          >
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search journal entries..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => {
              Alert.alert(
                'Filter Options',
                'Filter by:',
                [
                  { text: 'Date (Newest)', onPress: () => {
                    const sorted = [...journalEntries].sort((a, b) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    setJournalEntries(sorted);
                    Alert.alert('Success', 'Entries sorted by newest first');
                  }},
                  { text: 'Date (Oldest)', onPress: () => {
                    const sorted = [...journalEntries].sort((a, b) => 
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    setJournalEntries(sorted);
                    Alert.alert('Success', 'Entries sorted by oldest first');
                  }},
                  { text: 'Private Only', onPress: () => {
                    setFilteredEntries(journalEntries.filter(entry => entry.isPrivate));
                    Alert.alert('Success', 'Showing private entries only');
                  }},
                  { text: 'Public Only', onPress: () => {
                    setFilteredEntries(journalEntries.filter(entry => !entry.isPrivate));
                    Alert.alert('Success', 'Showing public entries only');
                  }},
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <Filter size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.moodsScroll}
          contentContainerStyle={styles.moodsContent}
        >
          <TouchableOpacity
            style={[
              styles.moodChip,
              !selectedMood && styles.selectedMoodChip
            ]}
            onPress={() => {
              setSelectedMood('');
              setFilteredEntries(journalEntries);
            }}
          >
            <Text style={[
              styles.moodChipText,
              !selectedMood && styles.selectedMoodChipText
            ]}>All</Text>
          </TouchableOpacity>
          
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.moodChip,
                selectedMood === mood && styles.selectedMoodChip
              ]}
              onPress={() => {
                const newMood = mood === selectedMood ? '' : mood;
                setSelectedMood(newMood);
                
                if (newMood) {
                  // Show count in an alert
                  const count = moodStats[mood] || 0;
                  Alert.alert(
                    `${mood} Entries`,
                    `You have ${count} entries with this mood.`,
                    [{ text: 'OK' }]
                  );
                }
              }}
            >
              <Text style={[
                styles.moodChipText,
                selectedMood === mood && styles.selectedMoodChipText
              ]}>{mood}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.insightsContainer}>
          {INSIGHTS.map((insight, index) => (
            <View key={insight.id} style={styles.insightCard}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightValue}>{insight.value}</Text>
              <Text style={styles.insightTrend}>{insight.trend}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Journal Entries</Text>
            <TouchableOpacity 
              style={styles.promptButton}
              onPress={() => setShowPromptModal(true)}
            >
              <Lightbulb size={16} color="#4169E1" />
              <Text style={styles.promptButtonText}>Get Prompt</Text>
            </TouchableOpacity>
          </View>
          
          {filteredEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No journal entries found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedMood 
                  ? 'Try adjusting your search or filters' 
                  : 'Start your reflection journey by adding your first entry'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => setShowAddEntryModal(true)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Add Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredEntries.map((entry) => (
              <TouchableOpacity 
                key={entry.id} 
                style={styles.entryCard}
                onPress={() => handleViewEntry(entry)}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryTitleContainer}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    {entry.isPrivate && (
                      <View style={styles.privateTag}>
                        <Text style={styles.privateTagText}>Private</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                </View>
                
                <Text style={styles.entryContent} numberOfLines={3}>
                  {entry.content}
                </Text>
                
                <View style={styles.entryFooter}>
                  <View style={styles.moodTag}>
                    <ThumbsUp size={14} color="#4169E1" />
                    <Text style={styles.moodText}>{entry.mood}</Text>
                  </View>
                  
                  <View style={styles.tagsContainer}>
                    {entry.tags.slice(0, 2).map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Tag size={12} color="#666666" />
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                    {entry.tags.length > 2 && (
                      <Text style={styles.moreTags}>+{entry.tags.length - 2}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reflection Prompts</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsContainer}
          >
            {REFLECTION_PROMPTS.map((prompt) => (
              <TouchableOpacity 
                key={prompt.id} 
                style={styles.promptCard}
                onPress={() => handleSelectPrompt(prompt)}
              >
                <View style={styles.promptCategory}>
                  <Text style={styles.promptCategoryText}>{prompt.category}</Text>
                </View>
                <Text style={styles.promptQuestion}>{prompt.question}</Text>
                <TouchableOpacity style={styles.usePromptButton}>
                  <Text style={styles.usePromptText}>Use This Prompt</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowAddEntryModal(true)}
      >
        <PenLine size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* View Entry Modal */}
      <Modal
        visible={showViewEntryModal}
        animationType="slide"
        onRequestClose={() => setShowViewEntryModal(false)}
      >
        {selectedEntry && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowViewEntryModal(false)}
              >
                <ArrowLeft size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Journal Entry</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerAction}>
                  <Edit3 size={20} color="#000000" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerAction}
                  onPress={() => handleDeleteEntry(selectedEntry.id)}
                >
                  <Trash2 size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.entryMetadata}>
                <Text style={styles.viewEntryDate}>{formatDate(selectedEntry.date)}</Text>
                <View style={styles.moodTag}>
                  <Heart size={14} color="#4169E1" />
                  <Text style={styles.moodText}>{selectedEntry.mood}</Text>
                </View>
              </View>
              
              <Text style={styles.viewEntryTitle}>{selectedEntry.title}</Text>
              
              <Text style={styles.viewEntryContent}>{selectedEntry.content}</Text>
              
              {selectedEntry.tags.length > 0 && (
                <View style={styles.viewTagsContainer}>
                  <Text style={styles.tagsLabel}>Tags:</Text>
                  <View style={styles.viewTags}>
                    {selectedEntry.tags.map((tag, index) => (
                      <View key={index} style={styles.viewTag}>
                        <Tag size={12} color="#666666" />
                        <Text style={styles.viewTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {selectedEntry.isPrivate && (
                <View style={styles.privateNote}>
                  <Text style={styles.privateNoteText}>
                    This entry is private and only visible to you
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
      
      {/* Add Entry Modal */}
      <Modal
        visible={showAddEntryModal}
        animationType="slide"
        onRequestClose={() => setShowAddEntryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddEntryModal(false)}
            >
              <ArrowLeft size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Journal Entry</Text>
            <TouchableOpacity 
              style={[
                styles.saveButton,
                (!entryTitle.trim() || !entryContent.trim() || !entryMood || isSubmitting) && styles.saveButtonDisabled
              ]}
              onPress={handleAddEntry}
              disabled={!entryTitle.trim() || !entryContent.trim() || !entryMood || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a title for your entry"
                placeholderTextColor="#666666"
                value={entryTitle}
                onChangeText={setEntryTitle}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your thoughts, reflections, or experiences..."
                placeholderTextColor="#666666"
                multiline
                textAlignVertical="top"
                value={entryContent}
                onChangeText={setEntryContent}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>How are you feeling?</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodsContainer}
              >
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodButton,
                      entryMood === mood && styles.selectedMoodButton
                    ]}
                    onPress={() => setEntryMood(mood)}
                  >
                    <Text style={[
                      styles.moodButtonText,
                      entryMood === mood && styles.selectedMoodButtonText
                    ]}>{mood}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tags (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Growth, Learning, Gratitude"
                placeholderTextColor="#666666"
                value={entryTags}
                onChangeText={setEntryTags}
              />
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Make this entry private</Text>
              <TouchableOpacity 
                style={[styles.switchTrack, entryIsPrivate && styles.switchTrackActive]}
                onPress={() => setEntryIsPrivate(!entryIsPrivate)}
              >
                <View style={[styles.switchThumb, entryIsPrivate && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Prompts Modal */}
      <Modal
        visible={showPromptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPromptModal(false)}
      >
        <View style={styles.promptModalOverlay}>
          <View style={styles.promptModalContainer}>
            <View style={styles.promptModalHeader}>
              <Text style={styles.promptModalTitle}>Reflection Prompts</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPromptModal(false)}
              >
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.promptModalContent}>
              {REFLECTION_PROMPTS.map((prompt) => (
                <TouchableOpacity 
                  key={prompt.id} 
                  style={styles.promptModalItem}
                  onPress={() => handleSelectPrompt(prompt)}
                >
                  <View style={styles.promptModalCategory}>
                    <Text style={styles.promptModalCategoryText}>{prompt.category}</Text>
                  </View>
                  <Text style={styles.promptModalQuestion}>{prompt.question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.randomPromptButton}
              onPress={() => handleSelectPrompt(getRandomPrompt())}
            >
              <Text style={styles.randomPromptText}>Give Me a Random Prompt</Text>
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
    paddingBottom: 80, // Add padding to account for floating button
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
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
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodsScroll: {
    marginBottom: 16,
  },
  moodsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  moodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
  },
  selectedMoodChip: {
    backgroundColor: '#4169E1',
  },
  moodChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  selectedMoodChipText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  insightsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  insightValue: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  insightTrend: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
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
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  promptButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    margin: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
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
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 8,
  },
  entryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  privateTag: {
    backgroundColor: '#FFE4E4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FF4444',
  },
  entryDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  entryContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    lineHeight: 20,
    marginBottom: 12,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  moodText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  moreTags: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  promptsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  promptCard: {
    width: 280,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
  },
  promptCategory: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  promptCategoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  promptQuestion: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  usePromptButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  usePromptText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  closeButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerAction: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  entryMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewEntryDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  viewEntryTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  viewEntryContent: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    lineHeight: 24,
    marginBottom: 24,
  },
  viewTagsContainer: {
    marginBottom: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  viewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  viewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  privateNote: {
    backgroundColor: '#FFE4E4',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  privateNoteText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FF4444',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  moodsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  moodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
  },
  selectedMoodButton: {
    backgroundColor: '#4169E1',
  },
  moodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  selectedMoodButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: '#4169E1',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  promptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  promptModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  promptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  promptModalContent: {
    maxHeight: 400,
  },
  promptModalItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  promptModalCategory: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  promptModalCategoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  promptModalQuestion: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  randomPromptButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  randomPromptText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});