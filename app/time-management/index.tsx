import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Modal, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Plus, Bell, ChevronRight, Clock, Calendar, Target, SquareCheck as CheckSquare, ChartBar as BarChart3, ArrowUpRight, X, AlarmClock, ListTodo, Briefcase, BookOpen, Coffee, Dumbbell, Heart, Users, Utensils, Tv, Smartphone, Zap, CreditCard as Edit3, Trash2 } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

// Placeholder data for time blocks
const TIME_BLOCKS = [
  {
    id: '1',
    title: 'Morning Routine',
    startTime: '06:00',
    endTime: '07:30',
    category: 'Personal',
    color: '#FFE4E4',
    activities: ['Meditation', 'Exercise', 'Breakfast'],
  },
  {
    id: '2',
    title: 'Deep Work Session',
    startTime: '08:00',
    endTime: '11:00',
    category: 'Work',
    color: '#E4EAFF',
    activities: ['Project Planning', 'Coding', 'Documentation'],
  },
  {
    id: '3',
    title: 'Lunch Break',
    startTime: '12:00',
    endTime: '13:00',
    category: 'Break',
    color: '#E4FFF4',
    activities: ['Eat', 'Short Walk'],
  },
  {
    id: '4',
    title: 'Meetings',
    startTime: '14:00',
    endTime: '16:00',
    category: 'Work',
    color: '#E4EAFF',
    activities: ['Team Sync', 'Client Call'],
  },
  {
    id: '5',
    title: 'Learning Time',
    startTime: '17:00',
    endTime: '18:30',
    category: 'Education',
    color: '#FFF4E4',
    activities: ['Online Course', 'Reading'],
  },
  {
    id: '6',
    title: 'Family Time',
    startTime: '19:00',
    endTime: '21:00',
    category: 'Personal',
    color: '#FFE4E4',
    activities: ['Dinner', 'Games', 'Conversation'],
  },
];

// Placeholder data for tasks
const TASKS = [
  {
    id: '1',
    title: 'Complete Project Proposal',
    dueDate: '2024-07-20',
    priority: 'High',
    category: 'Work',
    completed: false,
    estimatedTime: 120, // minutes
  },
  {
    id: '2',
    title: 'Review Team Presentations',
    dueDate: '2024-07-18',
    priority: 'Medium',
    category: 'Work',
    completed: false,
    estimatedTime: 60,
  },
  {
    id: '3',
    title: 'Schedule Doctor Appointment',
    dueDate: '2024-07-19',
    priority: 'Medium',
    category: 'Personal',
    completed: true,
    estimatedTime: 15,
  },
  {
    id: '4',
    title: 'Prepare for Weekly Meeting',
    dueDate: '2024-07-17',
    priority: 'High',
    category: 'Work',
    completed: false,
    estimatedTime: 45,
  },
];

// Placeholder data for time analytics
const TIME_ANALYTICS = {
  workHours: 35,
  personalHours: 14,
  educationHours: 8,
  breakHours: 7,
  totalHours: 64,
  productiveHours: 43,
  distractionHours: 21,
};

// Categories for time blocks and tasks
const CATEGORIES = [
  { id: 'work', name: 'Work', icon: Briefcase, color: '#E4EAFF' },
  { id: 'personal', name: 'Personal', icon: Heart, color: '#FFE4E4' },
  { id: 'education', name: 'Education', icon: BookOpen, color: '#FFF4E4' },
  { id: 'break', name: 'Break', icon: Coffee, color: '#E4FFF4' },
  { id: 'exercise', name: 'Exercise', icon: Dumbbell, color: '#FFE4F4' },
  { id: 'social', name: 'Social', icon: Users, color: '#E4F4FF' },
  { id: 'meals', name: 'Meals', icon: Utensils, color: '#F4E4FF' },
  { id: 'entertainment', name: 'Entertainment', icon: Tv, color: '#E4FFEA' },
];

// Priority levels for tasks
const PRIORITIES = [
  { id: 'high', name: 'High', color: '#FF4444' },
  { id: 'medium', name: 'Medium', color: '#F59E0B' },
  { id: 'low', name: 'Low', color: '#10B981' },
];

export default function TimeManagementScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('schedule');
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [timeBlocks, setTimeBlocks] = useState(TIME_BLOCKS);
  const [tasks, setTasks] = useState(TASKS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Time block form state
  const [blockTitle, setBlockTitle] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockCategory, setBlockCategory] = useState('');
  const [blockActivities, setBlockActivities] = useState('');
  
  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('');
  const [taskCategory, setTaskCategory] = useState('');
  const [taskEstimatedTime, setTaskEstimatedTime] = useState('');
  
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
  
  const handleAddTimeBlock = () => {
    if (!blockTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the time block');
      return;
    }
    
    if (!blockStartTime.trim()) {
      Alert.alert('Error', 'Please enter a start time');
      return;
    }
    
    if (!blockEndTime.trim()) {
      Alert.alert('Error', 'Please enter an end time');
      return;
    }
    
    if (!blockCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const category = CATEGORIES.find(cat => cat.id === blockCategory);
      
      const newBlock = {
        id: Date.now().toString(),
        title: blockTitle.trim(),
        startTime: blockStartTime.trim(),
        endTime: blockEndTime.trim(),
        category: category?.name || 'Other',
        color: category?.color || '#E2E8F0',
        activities: blockActivities.split(',').map(act => act.trim()).filter(act => act),
      };
      
      setTimeBlocks([...timeBlocks, newBlock]);
      
      // Reset form
      setBlockTitle('');
      setBlockStartTime('');
      setBlockEndTime('');
      setBlockCategory('');
      setBlockActivities('');
      
      setIsSubmitting(false);
      setShowAddBlockModal(false);
      
      Alert.alert('Success', 'Time block added successfully');
    }, 1000);
  };
  
  const handleAddTask = () => {
    if (!taskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    
    if (!taskDueDate.trim()) {
      Alert.alert('Error', 'Please enter a due date');
      return;
    }
    
    if (!taskPriority) {
      Alert.alert('Error', 'Please select a priority level');
      return;
    }
    
    if (!taskCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    if (!taskEstimatedTime.trim() || isNaN(Number(taskEstimatedTime)) || Number(taskEstimatedTime) <= 0) {
      Alert.alert('Error', 'Please enter a valid estimated time in minutes');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const category = CATEGORIES.find(cat => cat.id === taskCategory);
      
      const newTask = {
        id: Date.now().toString(),
        title: taskTitle.trim(),
        dueDate: taskDueDate.trim(),
        priority: taskPriority,
        category: category?.name || 'Other',
        completed: false,
        estimatedTime: Number(taskEstimatedTime),
      };
      
      setTasks([...tasks, newTask]);
      
      // Reset form
      setTaskTitle('');
      setTaskDueDate('');
      setTaskPriority('');
      setTaskCategory('');
      setTaskEstimatedTime('');
      
      setIsSubmitting(false);
      setShowAddTaskModal(false);
      
      Alert.alert('Success', 'Task added successfully');
    }, 1000);
  };
  
  const toggleTaskCompletion = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };
  
  const deleteTask = (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            setTasks(tasks.filter(task => task.id !== taskId));
          },
          style: 'destructive',
        },
      ]
    );
  };
  
  const deleteTimeBlock = (blockId) => {
    Alert.alert(
      'Delete Time Block',
      'Are you sure you want to delete this time block?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            setTimeBlocks(timeBlocks.filter(block => block.id !== blockId));
          },
          style: 'destructive',
        },
      ]
    );
  };
  
  const formatTimeRange = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const getPriorityColor = (priority) => {
    const priorityObj = PRIORITIES.find(p => p.id === priority || p.name === priority);
    return priorityObj?.color || '#666666';
  };
  
  const getCategoryIcon = (categoryName) => {
    const category = CATEGORIES.find(cat => cat.name === categoryName || cat.id === categoryName);
    return category?.icon || Briefcase;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Time Management</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
          onPress={() => setActiveTab('schedule')}
        >
          <Clock size={20} color={activeTab === 'schedule' ? "#4169E1" : "#666666"} />
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
            Schedule
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <CheckSquare size={20} color={activeTab === 'tasks' ? "#4169E1" : "#666666"} />
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>
            Tasks
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <BarChart3 size={20} color={activeTab === 'analytics' ? "#4169E1" : "#666666"} />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'schedule' && (
          <View style={styles.scheduleContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color="#666666" />
              </TouchableOpacity>
            </View>
            
            {timeBlocks.map((block) => {
              const CategoryIcon = getCategoryIcon(block.category);
              return (
                <View key={block.id} style={styles.timeBlockCard}>
                  <View style={[styles.timeBlockLeftBorder, { backgroundColor: block.color }]} />
                  
                  <View style={styles.timeBlockContent}>
                    <View style={styles.timeBlockHeader}>
                      <View style={styles.timeBlockInfo}>
                        <Text style={styles.timeBlockTitle}>{block.title}</Text>
                        <View style={styles.timeRange}>
                          <Clock size={14} color="#666666" />
                          <Text style={styles.timeRangeText}>
                            {formatTimeRange(block.startTime, block.endTime)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={[styles.categoryTag, { backgroundColor: block.color }]}>
                        <CategoryIcon size={14} color="#000000" />
                        <Text style={styles.categoryText}>{block.category}</Text>
                      </View>
                    </View>
                    
                    {block.activities && block.activities.length > 0 && (
                      <View style={styles.activitiesList}>
                        {block.activities.map((activity, index) => (
                          <View key={index} style={styles.activityItem}>
                            <View style={styles.activityBullet} />
                            <Text style={styles.activityText}>{activity}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    <View style={styles.timeBlockActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <Edit3 size={16} color="#4169E1" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => deleteTimeBlock(block.id)}
                      >
                        <Trash2 size={16} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddBlockModal(true)}
            >
              <Plus size={16} color="#4169E1" />
              <Text style={styles.addButtonText}>Add Time Block</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {activeTab === 'tasks' && (
          <View style={styles.tasksContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tasks</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color="#666666" />
              </TouchableOpacity>
            </View>
            
            {tasks.map((task) => {
              const CategoryIcon = getCategoryIcon(task.category);
              const priorityColor = getPriorityColor(task.priority);
              
              return (
                <View key={task.id} style={styles.taskCard}>
                  <TouchableOpacity 
                    style={[
                      styles.taskCheckbox,
                      task.completed && styles.taskCheckboxCompleted
                    ]}
                    onPress={() => toggleTaskCompletion(task.id)}
                  >
                    {task.completed && <CheckSquare size={20} color="#FFFFFF" />}
                  </TouchableOpacity>
                  
                  <View style={styles.taskContent}>
                    <Text 
                      style={[
                        styles.taskTitle,
                        task.completed && styles.taskTitleCompleted
                      ]}
                    >
                      {task.title}
                    </Text>
                    
                    <View style={styles.taskDetails}>
                      <View style={styles.taskDetail}>
                        <Calendar size={14} color="#666666" />
                        <Text style={styles.taskDetailText}>
                          {formatDate(task.dueDate)}
                        </Text>
                      </View>
                      
                      <View style={styles.taskDetail}>
                        <Clock size={14} color="#666666" />
                        <Text style={styles.taskDetailText}>
                          {task.estimatedTime} min
                        </Text>
                      </View>
                      
                      <View style={[styles.priorityTag, { backgroundColor: priorityColor }]}>
                        <Zap size={14} color="#FFFFFF" />
                        <Text style={styles.priorityText}>{task.priority}</Text>
                      </View>
                      
                      <View style={[styles.categoryTag, { backgroundColor: getCategoryIcon(task.category)?.color || '#E2E8F0' }]}>
                        <CategoryIcon size={14} color="#000000" />
                        <Text style={styles.categoryText}>{task.category}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteTask(task.id)}
                  >
                    <Trash2 size={16} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddTaskModal(true)}
            >
              <Plus size={16} color="#4169E1" />
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {activeTab === 'analytics' && (
          <View style={styles.analyticsContainer}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>Weekly Time Distribution</Text>
              
              <View style={styles.timeDistribution}>
                <View style={styles.distributionItem}>
                  <View style={[styles.distributionBar, { height: 120 * (TIME_ANALYTICS.workHours / TIME_ANALYTICS.totalHours), backgroundColor: '#E4EAFF' }]} />
                  <Text style={styles.distributionLabel}>Work</Text>
                  <Text style={styles.distributionValue}>{TIME_ANALYTICS.workHours}h</Text>
                </View>
                
                <View style={styles.distributionItem}>
                  <View style={[styles.distributionBar, { height: 120 * (TIME_ANALYTICS.personalHours / TIME_ANALYTICS.totalHours), backgroundColor: '#FFE4E4' }]} />
                  <Text style={styles.distributionLabel}>Personal</Text>
                  <Text style={styles.distributionValue}>{TIME_ANALYTICS.personalHours}h</Text>
                </View>
                
                <View style={styles.distributionItem}>
                  <View style={[styles.distributionBar, { height: 120 * (TIME_ANALYTICS.educationHours / TIME_ANALYTICS.totalHours), backgroundColor: '#FFF4E4' }]} />
                  <Text style={styles.distributionLabel}>Education</Text>
                  <Text style={styles.distributionValue}>{TIME_ANALYTICS.educationHours}h</Text>
                </View>
                
                <View style={styles.distributionItem}>
                  <View style={[styles.distributionBar, { height: 120 * (TIME_ANALYTICS.breakHours / TIME_ANALYTICS.totalHours), backgroundColor: '#E4FFF4' }]} />
                  <Text style={styles.distributionLabel}>Break</Text>
                  <Text style={styles.distributionValue}>{TIME_ANALYTICS.breakHours}h</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.productivityCard}>
              <Text style={styles.analyticsTitle}>Productivity Analysis</Text>
              
              <View style={styles.productivityStats}>
                <View style={styles.productivityStat}>
                  <Text style={styles.productivityValue}>{TIME_ANALYTICS.productiveHours}h</Text>
                  <Text style={styles.productivityLabel}>Productive Time</Text>
                  <View style={styles.productivityPercentage}>
                    <ArrowUpRight size={14} color="#10B981" />
                    <Text style={[styles.percentageText, { color: '#10B981' }]}>
                      {Math.round((TIME_ANALYTICS.productiveHours / TIME_ANALYTICS.totalHours) * 100)}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.productivityDivider} />
                
                <View style={styles.productivityStat}>
                  <Text style={styles.productivityValue}>{TIME_ANALYTICS.distractionHours}h</Text>
                  <Text style={styles.productivityLabel}>Distraction Time</Text>
                  <View style={styles.productivityPercentage}>
                    <ArrowUpRight size={14} color="#FF4444" style={{ transform: [{ rotate: '90deg' }] }} />
                    <Text style={[styles.percentageText, { color: '#FF4444' }]}>
                      {Math.round((TIME_ANALYTICS.distractionHours / TIME_ANALYTICS.totalHours) * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.productivityBar}>
                <View 
                  style={[
                    styles.productiveBar, 
                    { 
                      width: `${(TIME_ANALYTICS.productiveHours / TIME_ANALYTICS.totalHours) * 100}%` 
                    }
                  ]} 
                />
                <View 
                  style={[
                    styles.distractionBar, 
                    { 
                      width: `${(TIME_ANALYTICS.distractionHours / TIME_ANALYTICS.totalHours) * 100}%` 
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Time Management Tips</Text>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipNumber}>1</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipHeading}>Use the Pomodoro Technique</Text>
                  <Text style={styles.tipText}>Work for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer break of 15-30 minutes.</Text>
                </View>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipNumber}>2</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipHeading}>Prioritize with the Eisenhower Matrix</Text>
                  <Text style={styles.tipText}>Categorize tasks as: Important & Urgent, Important & Not Urgent, Not Important & Urgent, Not Important & Not Urgent.</Text>
                </View>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipNumber}>3</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipHeading}>Time Block Your Day</Text>
                  <Text style={styles.tipText}>Assign specific time blocks for different activities to maintain focus and reduce context switching.</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => activeTab === 'schedule' ? setShowAddBlockModal(true) : setShowAddTaskModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Add Time Block Modal */}
      <Modal
        visible={showAddBlockModal}
        animationType="slide"
        onRequestClose={() => setShowAddBlockModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Time Block</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddBlockModal(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter time block title"
                placeholderTextColor="#666666"
                value={blockTitle}
                onChangeText={setBlockTitle}
              />
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>Start Time</Text>
                <View style={styles.timeInputContainer}>
                  <Clock size={20} color="#666666" />
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#666666"
                    value={blockStartTime}
                    onChangeText={setBlockStartTime}
                  />
                </View>
              </View>
              
              <View style={styles.formGroupHalf}>
                <Text style={styles.label}>End Time</Text>
                <View style={styles.timeInputContainer}>
                  <Clock size={20} color="#666666" />
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#666666"
                    value={blockEndTime}
                    onChangeText={setBlockEndTime}
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {CATEGORIES.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: category.color },
                        blockCategory === category.id && styles.selectedCategoryChip
                      ]}
                      onPress={() => setBlockCategory(category.id)}
                    >
                      <IconComponent size={16} color="#000000" />
                      <Text style={styles.categoryChipText}>{category.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Activities (comma separated)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter activities for this time block"
                placeholderTextColor="#666666"
                multiline
                value={blockActivities}
                onChangeText={setBlockActivities}
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!blockTitle || !blockStartTime || !blockEndTime || !blockCategory || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleAddTimeBlock}
              disabled={!blockTitle || !blockStartTime || !blockEndTime || !blockCategory || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Add Time Block</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        animationType="slide"
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Task</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddTaskModal(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task title"
                placeholderTextColor="#666666"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Due Date</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={20} color="#666666" />
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666666"
                  value={taskDueDate}
                  onChangeText={setTaskDueDate}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityButtons}>
                {PRIORITIES.map((priority) => (
                  <TouchableOpacity
                    key={priority.id}
                    style={[
                      styles.priorityButton,
                      { borderColor: priority.color },
                      taskPriority === priority.id && { backgroundColor: priority.color }
                    ]}
                    onPress={() => setTaskPriority(priority.id)}
                  >
                    <Text 
                      style={[
                        styles.priorityButtonText,
                        { color: priority.color },
                        taskPriority === priority.id && { color: '#FFFFFF' }
                      ]}
                    >
                      {priority.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {CATEGORIES.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: category.color },
                        taskCategory === category.id && styles.selectedCategoryChip
                      ]}
                      onPress={() => setTaskCategory(category.id)}
                    >
                      <IconComponent size={16} color="#000000" />
                      <Text style={styles.categoryChipText}>{category.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Estimated Time (minutes)</Text>
              <View style={styles.timeInputContainer}>
                <Clock size={20} color="#666666" />
                <TextInput
                  style={styles.timeInput}
                  placeholder="Enter estimated time in minutes"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  value={taskEstimatedTime}
                  onChangeText={setTaskEstimatedTime}
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!taskTitle || !taskDueDate || !taskPriority || !taskCategory || !taskEstimatedTime || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleAddTask}
              disabled={!taskTitle || !taskDueDate || !taskPriority || !taskCategory || !taskEstimatedTime || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Add Task</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  activeTabText: {
    color: '#4169E1',
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  scheduleContainer: {
    padding: 16,
  },
  tasksContainer: {
    padding: 16,
  },
  analyticsContainer: {
    padding: 16,
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
  timeBlockCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  timeBlockLeftBorder: {
    width: 6,
    backgroundColor: '#4169E1',
  },
  timeBlockContent: {
    flex: 1,
    padding: 16,
  },
  timeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timeBlockInfo: {
    flex: 1,
    marginRight: 12,
  },
  timeBlockTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  timeRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  activitiesList: {
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666666',
    marginRight: 8,
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  timeBlockActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
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
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4169E1',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#666666',
  },
  taskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDetailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  priorityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 8,
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  analyticsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  timeDistribution: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  distributionItem: {
    alignItems: 'center',
    width: 60,
  },
  distributionBar: {
    width: 24,
    backgroundColor: '#4169E1',
    borderRadius: 4,
    marginBottom: 8,
  },
  distributionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  distributionValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  productivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  productivityStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productivityStat: {
    flex: 1,
    alignItems: 'center',
  },
  productivityDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  productivityValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  productivityLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  productivityPercentage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentageText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  productivityBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  productiveBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  distractionBar: {
    height: '100%',
    backgroundColor: '#FF4444',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  tipsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4169E1',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipHeading: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formGroupHalf: {
    width: '48%',
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
    height: 100,
    textAlignVertical: 'top',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  timeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  selectedCategoryChip: {
    borderWidth: 2,
    borderColor: '#000000',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  priorityButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  submitButton: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});