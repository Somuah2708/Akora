import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Users, ChevronRight, Bell, GraduationCap, Book, Flag, Trophy, Sparkles } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const TERMS = [
  { id: '1', name: 'First Term', active: true },
  { id: '2', name: 'Second Term', active: false },
  { id: '3', name: 'Third Term', active: false },
];

const UPCOMING_EVENTS = [
  {
    id: '1',
    title: 'Mid-Term Examinations',
    date: 'March 15-22, 2024',
    type: 'Academic',
    icon: Book,
    color: '#FFE4E4',
    location: 'All Classrooms',
    description: 'Mid-term assessments for all subjects',
  },
  {
    id: '2',
    title: 'Science & Tech Fair',
    date: 'March 25, 2024',
    type: 'Event',
    icon: Sparkles,
    color: '#E4EAFF',
    location: 'School Auditorium',
    description: 'Annual science and technology exhibition',
  },
  {
    id: '3',
    title: 'Sports Festival',
    date: 'April 5-7, 2024',
    type: 'Sports',
    icon: Trophy,
    color: '#E4FFF4',
    location: 'Sports Complex',
    description: 'Inter-house sports competition',
  },
];

const ACADEMIC_CALENDAR = [
  {
    month: 'March 2024',
    events: [
      {
        date: 'March 1',
        events: [
          {
            title: 'Term Paper Submission',
            time: '9:00 AM',
            type: 'Academic',
          }
        ]
      },
      {
        date: 'March 15-22',
        events: [
          {
            title: 'Mid-Term Examinations',
            time: 'All Day',
            type: 'Academic',
          }
        ]
      },
      {
        date: 'March 25',
        events: [
          {
            title: 'Science & Tech Fair',
            time: '10:00 AM',
            type: 'Event',
          }
        ]
      },
      {
        date: 'March 30',
        events: [
          {
            title: 'Parent-Teacher Meeting',
            time: '2:00 PM',
            type: 'Meeting',
          }
        ]
      }
    ]
  },
  {
    month: 'April 2024',
    events: [
      {
        date: 'April 5-7',
        events: [
          {
            title: 'Sports Festival',
            time: 'All Day',
            type: 'Sports',
          }
        ]
      },
      {
        date: 'April 15',
        events: [
          {
            title: 'Cultural Day',
            time: '10:00 AM',
            type: 'Event',
          }
        ]
      },
      {
        date: 'April 25',
        events: [
          {
            title: 'Career Guidance Day',
            time: '9:00 AM',
            type: 'Event',
          }
        ]
      }
    ]
  },
  {
    month: 'May 2024',
    events: [
      {
        date: 'May 2',
        events: [
          {
            title: 'Math Olympiad',
            time: '9:00 AM',
            type: 'Academic',
          }
        ]
      },
      {
        date: 'May 15-30',
        events: [
          {
            title: 'Final Examinations',
            time: 'All Day',
            type: 'Academic',
          }
        ]
      }
    ]
  }
];

const IMPORTANT_DATES = [
  {
    title: 'Term Start',
    date: 'January 15, 2024',
    icon: Flag,
  },
  {
    title: 'Mid-Term Break',
    date: 'March 23-30, 2024',
    icon: CalendarIcon,
  },
  {
    title: 'Term End',
    date: 'May 31, 2024',
    icon: GraduationCap,
  },
];

export default function CalendarScreen() {
  const router = useRouter();
  const [activeTerm, setActiveTerm] = useState('1');
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
        <Text style={styles.title}>Academic Calendar</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.termsContainer}>
        {TERMS.map((term) => (
          <TouchableOpacity
            key={term.id}
            style={[
              styles.termButton,
              activeTerm === term.id && styles.activeTermButton,
            ]}
            onPress={() => setActiveTerm(term.id)}
          >
            <Text
              style={[
                styles.termText,
                activeTerm === term.id && styles.activeTermText,
              ]}
            >
              {term.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Important Dates</Text>
        <View style={styles.importantDatesContainer}>
          {IMPORTANT_DATES.map((date, index) => {
            const IconComponent = date.icon;
            return (
              <View key={index} style={styles.importantDateCard}>
                <IconComponent size={24} color="#4169E1" />
                <View>
                  <Text style={styles.importantDateTitle}>{date.title}</Text>
                  <Text style={styles.importantDateText}>{date.date}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.upcomingEventsContainer}
        >
          {UPCOMING_EVENTS.map((event) => {
            const IconComponent = event.icon;
            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: event.color }]}
              >
                <View style={styles.eventHeader}>
                  <IconComponent size={24} color="#000000" />
                  <View style={styles.eventType}>
                    <Text style={styles.eventTypeText}>{event.type}</Text>
                  </View>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetail}>
                    <CalendarIcon size={14} color="#666666" />
                    <Text style={styles.eventDetailText}>{event.date}</Text>
                  </View>
                  <View style={styles.eventDetail}>
                    <MapPin size={14} color="#666666" />
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calendar</Text>
        {ACADEMIC_CALENDAR.map((month, monthIndex) => (
          <View key={monthIndex} style={styles.monthContainer}>
            <Text style={styles.monthTitle}>{month.month}</Text>
            {month.events.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayContainer}>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>{day.date}</Text>
                </View>
                <View style={styles.dayEvents}>
                  {day.events.map((event, eventIndex) => (
                    <View key={eventIndex} style={styles.dayEvent}>
                      <View style={[styles.eventIndicator, { backgroundColor: getEventColor(event.type) }]} />
                      <View style={styles.dayEventContent}>
                        <Text style={styles.dayEventTitle}>{event.title}</Text>
                        <View style={styles.dayEventTime}>
                          <Clock size={12} color="#666666" />
                          <Text style={styles.dayEventTimeText}>{event.time}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function getEventColor(type: string): string {
  switch (type) {
    case 'Academic':
      return '#FFE4E4';
    case 'Event':
      return '#E4EAFF';
    case 'Sports':
      return '#E4FFF4';
    case 'Meeting':
      return '#FFF4E4';
    default:
      return '#F8F9FA';
  }
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
  termsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  termButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  activeTermButton: {
    backgroundColor: '#4169E1',
  },
  termText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  activeTermText: {
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
  importantDatesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  importantDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  importantDateTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  importantDateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
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
  upcomingEventsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  eventCard: {
    width: 300,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventType: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  eventTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  eventDetails: {
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  monthContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  dayContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateContainer: {
    width: 80,
    paddingRight: 16,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  dayEvents: {
    flex: 1,
    gap: 8,
  },
  dayEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dayEventContent: {
    flex: 1,
  },
  dayEventTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  dayEventTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayEventTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});