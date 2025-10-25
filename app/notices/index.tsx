import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Search, Filter, Bell, Megaphone, Calendar, CircleAlert as AlertCircle, FileText, ChevronRight, Users, Star, Flag, Mail } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const NOTICE_CATEGORIES = [
  { id: 'all', name: 'All Notices' },
  { id: 'academic', name: 'Academic' },
  { id: 'administrative', name: 'Administrative' },
  { id: 'events', name: 'Events' },
  { id: 'urgent', name: 'Urgent' },
];

const URGENT_NOTICES = [
  {
    id: '1',
    title: 'Mid-Term Examination Schedule Change',
    type: 'Academic',
    date: 'March 15, 2024',
    priority: 'High',
    description: 'Important changes to the examination timetable. Please check updated schedule.',
  },
  {
    id: '2',
    title: 'Campus Security Update',
    type: 'Administrative',
    date: 'March 14, 2024',
    priority: 'High',
    description: 'New security measures implemented. All students must carry ID cards.',
  },
];

const RECENT_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'School Fees Payment Deadline',
    type: 'Administrative',
    date: 'March 10, 2024',
    sender: 'Bursar\'s Office',
    description: 'Final reminder for outstanding school fees payment for the current term.',
    attachments: 2,
  },
  {
    id: '2',
    title: 'Annual Sports Festival',
    type: 'Events',
    date: 'March 8, 2024',
    sender: 'Sports Department',
    description: 'Schedule and registration details for the upcoming inter-house sports competition.',
    attachments: 1,
  },
  {
    id: '3',
    title: 'Parent-Teacher Meeting',
    type: 'Academic',
    date: 'March 5, 2024',
    sender: 'Academic Office',
    description: 'Schedule for the upcoming parent-teacher consultation meeting.',
    attachments: 3,
  },
];

const UPCOMING_EVENTS = [
  {
    id: '1',
    title: 'Science Fair 2024',
    date: 'March 25, 2024',
    type: 'Academic',
    venue: 'School Auditorium',
  },
  {
    id: '2',
    title: 'Career Guidance Day',
    date: 'March 30, 2024',
    type: 'Events',
    venue: 'Assembly Hall',
  },
];

const DEPARTMENT_NOTICES = [
  {
    id: '1',
    department: 'Science Department',
    title: 'Laboratory Safety Guidelines Update',
    date: 'March 12, 2024',
  },
  {
    id: '2',
    department: 'Arts Department',
    title: 'Cultural Exhibition Preparations',
    date: 'March 11, 2024',
  },
  {
    id: '3',
    department: 'Sports Department',
    title: 'Team Selection Process',
    date: 'March 9, 2024',
  },
];

export default function NoticesScreen() {
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
        <Text style={styles.title}>Notices</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color="#000000" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notices..."
            placeholderTextColor="#666666"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {NOTICE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              activeCategory === category.id && styles.activeCategoryButton,
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === category.id && styles.activeCategoryText,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Urgent Notices</Text>
        {URGENT_NOTICES.map((notice) => (
          <TouchableOpacity key={notice.id} style={styles.urgentCard}>
            <View style={styles.urgentHeader}>
              <View style={styles.urgentBadge}>
                <AlertCircle size={14} color="#FFFFFF" />
                <Text style={styles.urgentBadgeText}>Urgent</Text>
              </View>
              <Text style={styles.urgentDate}>{notice.date}</Text>
            </View>
            <Text style={styles.urgentTitle}>{notice.title}</Text>
            <Text style={styles.urgentDescription}>{notice.description}</Text>
            <View style={styles.urgentFooter}>
              <View style={styles.urgentType}>
                <Megaphone size={14} color="#4169E1" />
                <Text style={styles.urgentTypeText}>{notice.type}</Text>
              </View>
              <TouchableOpacity style={styles.readMoreButton}>
                <Text style={styles.readMoreText}>Read More</Text>
                <ChevronRight size={14} color="#4169E1" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Announcements</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {RECENT_ANNOUNCEMENTS.map((announcement) => (
          <TouchableOpacity key={announcement.id} style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <View style={styles.announcementType}>
                <Megaphone size={14} color="#4169E1" />
                <Text style={styles.announcementTypeText}>{announcement.type}</Text>
              </View>
              <Text style={styles.announcementDate}>{announcement.date}</Text>
            </View>
            <Text style={styles.announcementTitle}>{announcement.title}</Text>
            <Text style={styles.announcementDescription}>{announcement.description}</Text>
            <View style={styles.announcementFooter}>
              <View style={styles.senderInfo}>
                <Mail size={14} color="#666666" />
                <Text style={styles.senderText}>From: {announcement.sender}</Text>
              </View>
              {announcement.attachments > 0 && (
                <View style={styles.attachments}>
                  <FileText size={14} color="#666666" />
                  <Text style={styles.attachmentsText}>{announcement.attachments} attachments</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        <View style={styles.eventsGrid}>
          {UPCOMING_EVENTS.map((event) => (
            <TouchableOpacity key={event.id} style={styles.eventCard}>
              <Calendar size={24} color="#4169E1" />
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>{event.date}</Text>
              <Text style={styles.eventVenue}>{event.venue}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Department Notices</Text>
        {DEPARTMENT_NOTICES.map((notice) => (
          <TouchableOpacity key={notice.id} style={styles.departmentCard}>
            <View style={styles.departmentInfo}>
              <Users size={20} color="#4169E1" />
              <View>
                <Text style={styles.departmentName}>{notice.department}</Text>
                <Text style={styles.departmentNoticeTitle}>{notice.title}</Text>
              </View>
            </View>
            <Text style={styles.departmentDate}>{notice.date}</Text>
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
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
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
  categoriesScroll: {
    marginBottom: 24,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  activeCategoryButton: {
    backgroundColor: '#4169E1',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  urgentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF4F4',
    borderRadius: 12,
    padding: 16,
  },
  urgentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  urgentDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  urgentTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  urgentDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  urgentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  announcementCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  announcementType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  announcementTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  announcementDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  announcementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  announcementDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  senderText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  attachments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attachmentsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  eventCard: {
    width: (width - 48) / 2,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    textAlign: 'center',
  },
  eventDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  eventVenue: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  departmentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  departmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  departmentNoticeTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  departmentDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginLeft: 32,
  },
});