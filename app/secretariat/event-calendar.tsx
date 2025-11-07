import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Users, Filter, ChevronRight, Building2, Search, Plus, Bookmark, Bell, Edit } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  category: string;
  attendees?: number;
  capacity?: string;
  created_at: string;
}

const FILTER_CATEGORIES = ['All Events', 'Academic', 'Social', 'Sports', 'Cultural', 'Meeting', 'Ceremony'];

const MONTHS = ['All Months', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sample Events Data
const SAMPLE_EVENTS: Event[] = [
  {
    id: 'sample-1',
    title: 'Annual Alumni Homecoming 2025',
    description: JSON.stringify({
      description: 'Join us for the biggest reunion of the year! Reconnect with old friends, network with fellow alumni, and celebrate our shared legacy.',
      date: '2025-11-15',
      time: '10:00 AM',
      location: 'Main Campus Auditorium, Achimota',
      organizer: 'OAA Secretariat',
      category: 'Social',
      isFree: true,
      capacity: '500',
      agenda: [
        'Registration and Welcome Coffee (10:00 AM)',
        'Opening Ceremony and Alumni Awards (11:00 AM)',
        'Campus Tour and Photo Session (12:30 PM)',
        'Buffet Lunch (1:30 PM)',
        'Panel Discussion: Future of Education (3:00 PM)',
        'Networking Session and Closing (4:30 PM)'
      ],
      speakers: [
        { name: 'Dr. Kwame Asante', title: 'Class of 1995, University Dean' },
        { name: 'Mrs. Abena Mensah', title: 'Alumni President' },
        { name: 'Prof. John Boateng', title: 'Distinguished Alumni Speaker' }
      ],
      contactEmail: 'homecoming@oaa.edu',
      contactPhone: '+233 20 123 4567'
    }),
    date: '2025-11-15',
    time: '10:00 AM',
    location: 'Main Campus Auditorium, Achimota',
    organizer: 'OAA Secretariat',
    category: 'Social',
    attendees: 342,
    capacity: '500',
    created_at: new Date('2025-10-01').toISOString(),
  },
  {
    id: 'sample-2',
    title: 'Career Development Workshop: Digital Skills',
    description: JSON.stringify({
      description: 'Enhance your career prospects with cutting-edge digital skills. Learn about AI, data analytics, and digital marketing from industry experts.',
      date: '2025-11-08',
      time: '2:00 PM',
      location: 'Technology Hub, East Legon',
      organizer: 'Alumni Career Services',
      category: 'Academic',
      isFree: false,
      ticketPrice: 'GHS 50',
      capacity: '150',
      agenda: [
        'Introduction to AI and Machine Learning (2:00 PM)',
        'Data Analytics for Business (3:00 PM)',
        'Digital Marketing Strategies (4:00 PM)',
        'Q&A and Networking (5:00 PM)'
      ],
      speakers: [
        { name: 'Kwesi Osei', title: 'AI Specialist, Google Africa' },
        { name: 'Ama Darko', title: 'Data Scientist, Meta' },
        { name: 'Kofi Mensah', title: 'Digital Marketing Director' }
      ],
      contactEmail: 'career@oaa.edu',
      contactPhone: '+233 24 567 8910'
    }),
    date: '2025-11-08',
    time: '2:00 PM',
    location: 'Technology Hub, East Legon',
    organizer: 'Alumni Career Services',
    category: 'Academic',
    attendees: 128,
    capacity: '150',
    created_at: new Date('2025-10-05').toISOString(),
  },
  {
    id: 'sample-3',
    title: 'Annual Inter-Alumni Sports Festival',
    description: JSON.stringify({
      description: 'Get ready for an action-packed day of sports! Football, basketball, volleyball, and more. Compete for the prestigious OAA Trophy.',
      date: '2025-11-22',
      time: '8:00 AM',
      location: 'School Sports Complex',
      organizer: 'OAA Sports Committee',
      category: 'Sports',
      isFree: true,
      capacity: '1000',
      agenda: [
        'Opening Ceremony and Team Registration (8:00 AM)',
        'Football Matches - Quarter Finals (9:00 AM)',
        'Basketball Tournament (10:00 AM)',
        'Volleyball Championship (11:00 AM)',
        'Track and Field Events (2:00 PM)',
        'Finals and Award Ceremony (5:00 PM)'
      ],
      speakers: [
        { name: 'Michael Essien', title: 'Guest of Honor, Former Black Stars Captain' },
        { name: 'Coach Abdul Rahman', title: 'Sports Director' }
      ],
      contactEmail: 'sports@oaa.edu',
      contactPhone: '+233 27 890 1234'
    }),
    date: '2025-11-22',
    time: '8:00 AM',
    location: 'School Sports Complex',
    organizer: 'OAA Sports Committee',
    category: 'Sports',
    attendees: 567,
    capacity: '1000',
    created_at: new Date('2025-09-20').toISOString(),
  },
  {
    id: 'sample-4',
    title: 'Cultural Night: Celebrating Our Heritage',
    description: JSON.stringify({
      description: 'An evening of traditional music, dance, and cuisine. Experience the rich cultural diversity of our alumni community.',
      date: '2025-11-29',
      time: '6:00 PM',
      location: 'Grand Hall, Achimota',
      organizer: 'Cultural Affairs Committee',
      category: 'Cultural',
      isFree: false,
      ticketPrice: 'GHS 100',
      capacity: '300',
      agenda: [
        'Welcome Reception and Traditional Drinks (6:00 PM)',
        'Traditional Dance Performances (7:00 PM)',
        'Cultural Fashion Show (8:00 PM)',
        'Live Band Performance (9:00 PM)',
        'Dinner and Networking (10:00 PM)'
      ],
      speakers: [
        { name: 'Nana Akua Frimpong', title: 'Cultural Ambassador' },
        { name: 'Kojo Antwi', title: 'Highlife Legend' }
      ],
      contactEmail: 'culture@oaa.edu',
      contactPhone: '+233 26 345 6789'
    }),
    date: '2025-11-29',
    time: '6:00 PM',
    location: 'Grand Hall, Achimota',
    organizer: 'Cultural Affairs Committee',
    category: 'Cultural',
    attendees: 245,
    capacity: '300',
    created_at: new Date('2025-10-10').toISOString(),
  },
  {
    id: 'sample-5',
    title: 'Board of Directors Meeting - Q4 2025',
    description: JSON.stringify({
      description: 'Quarterly board meeting to discuss strategic initiatives, financial reports, and upcoming projects for the alumni association.',
      date: '2025-11-12',
      time: '9:00 AM',
      location: 'Executive Boardroom, Achimota',
      organizer: 'OAA Board of Directors',
      category: 'Meeting',
      isFree: true,
      capacity: '30',
      agenda: [
        'Call to Order and Approval of Minutes (9:00 AM)',
        'Financial Report Q4 2025 (9:30 AM)',
        'Strategic Initiatives Update (10:30 AM)',
        'Budget Review for 2026 (11:30 AM)',
        'New Business and Proposals (1:00 PM)',
        'Adjournment (2:00 PM)'
      ],
      speakers: [
        { name: 'Board President', title: 'Mrs. Abena Mensah' },
        { name: 'Treasurer', title: 'Mr. Yaw Boateng' },
        { name: 'Secretary', title: 'Dr. Akosua Owusu' }
      ],
      contactEmail: 'board@oaa.edu',
      contactPhone: '+233 20 123 4567'
    }),
    date: '2025-11-12',
    time: '9:00 AM',
    location: 'Executive Boardroom, Achimota',
    organizer: 'OAA Board of Directors',
    category: 'Meeting',
    attendees: 22,
    capacity: '30',
    created_at: new Date('2025-10-15').toISOString(),
  },
  {
    id: 'sample-6',
    title: 'Founder\'s Day Celebration 2025',
    description: JSON.stringify({
      description: 'Honor the founding fathers and mothers of our institution. A solemn ceremony followed by grand celebration.',
      date: '2025-12-05',
      time: '11:00 AM',
      location: 'School Chapel and Main Grounds',
      organizer: 'OAA Secretariat',
      category: 'Ceremony',
      isFree: true,
      capacity: '800',
      agenda: [
        'Wreath Laying Ceremony (11:00 AM)',
        'Memorial Service (11:30 AM)',
        'Historical Presentation (12:30 PM)',
        'Unveiling of New Memorial Plaque (1:30 PM)',
        'Grand Reception (2:00 PM)',
        'Entertainment and Closing (4:00 PM)'
      ],
      speakers: [
        { name: 'Chancellor', title: 'Prof. Emmanuel Asante' },
        { name: 'Guest Speaker', title: 'Hon. Justice Sophia Akuffo' },
        { name: 'Historian', title: 'Dr. Francis Nyamekye' }
      ],
      contactEmail: 'foundersday@oaa.edu',
      contactPhone: '+233 20 123 4567'
    }),
    date: '2025-12-05',
    time: '11:00 AM',
    location: 'School Chapel and Main Grounds',
    organizer: 'OAA Secretariat',
    category: 'Ceremony',
    attendees: 623,
    capacity: '800',
    created_at: new Date('2025-09-15').toISOString(),
  },
  {
    id: 'sample-7',
    title: 'Youth Mentorship Program Launch',
    description: JSON.stringify({
      description: 'Launch of the new mentorship initiative connecting alumni with current students. Be part of shaping the next generation.',
      date: '2025-11-18',
      time: '3:00 PM',
      location: 'Student Center Auditorium',
      organizer: 'Alumni Mentorship Committee',
      category: 'Academic',
      isFree: true,
      capacity: '200',
      agenda: [
        'Program Overview and Objectives (3:00 PM)',
        'Success Stories from Alumni Mentors (3:30 PM)',
        'Student Testimonials (4:00 PM)',
        'Mentor-Mentee Matching Session (4:30 PM)',
        'Refreshments and Networking (5:30 PM)'
      ],
      speakers: [
        { name: 'Dr. Patricia Owusu', title: 'Program Director' },
        { name: 'James Kwarteng', title: 'Tech Entrepreneur, Class of 2010' },
        { name: 'Akosua Sarpong', title: 'Medical Doctor, Class of 2008' }
      ],
      contactEmail: 'mentorship@oaa.edu',
      contactPhone: '+233 24 789 0123'
    }),
    date: '2025-11-18',
    time: '3:00 PM',
    location: 'Student Center Auditorium',
    organizer: 'Alumni Mentorship Committee',
    category: 'Academic',
    attendees: 156,
    capacity: '200',
    created_at: new Date('2025-10-20').toISOString(),
  },
  {
    id: 'sample-8',
    title: 'End of Year Gala Dinner 2025',
    description: JSON.stringify({
      description: 'A prestigious black-tie event to celebrate achievements and honor outstanding alumni. Featuring live music, awards, and gourmet dining.',
      date: '2025-12-20',
      time: '7:00 PM',
      location: 'Kempinski Hotel Gold Coast City',
      organizer: 'OAA Events Committee',
      category: 'Social',
      isFree: false,
      ticketPrice: 'GHS 500',
      capacity: '250',
      agenda: [
        'Red Carpet and Cocktail Reception (7:00 PM)',
        'Opening Remarks and Welcome Toast (8:00 PM)',
        'Three-Course Gourmet Dinner (8:30 PM)',
        'Alumni Awards Presentation (9:30 PM)',
        'Live Band and Dancing (10:30 PM)',
        'Midnight Toast and Closing (12:00 AM)'
      ],
      speakers: [
        { name: 'Mrs. Abena Mensah', title: 'Alumni President' },
        { name: 'Special Guest', title: 'Rt. Hon. Speaker of Parliament' },
        { name: 'Master of Ceremonies', title: 'Giovanni Caleb' }
      ],
      contactEmail: 'gala@oaa.edu',
      contactPhone: '+233 20 123 4567'
    }),
    date: '2025-12-20',
    time: '7:00 PM',
    location: 'Kempinski Hotel Gold Coast City',
    organizer: 'OAA Events Committee',
    category: 'Social',
    attendees: 198,
    capacity: '250',
    created_at: new Date('2025-09-01').toISOString(),
  },
];

export default function EventCalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [parsedUserEvents, setParsedUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Events');
  const [selectedMonth, setSelectedMonth] = useState<number>(-1); // -1 = All Months, 0-11 = specific months
  const [selectedYear, setSelectedYear] = useState<number>(-1); // -1 = All Years, else specific year
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [myEventsCount, setMyEventsCount] = useState(0);
  const [savedEventsCount, setSavedEventsCount] = useState(0);
  const [newEventsCount, setNewEventsCount] = useState(0);

  // Generate year options: All Years + (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const YEARS = [-1, ...Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)];

  useEffect(() => {
    loadEvents();
    loadMyCounts();
    loadNewEventsCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Only load if user is available
      if (user?.id) {
        loadEvents();
        loadMyCounts();
        loadNewEventsCount();
      }
    }, [user?.id])
  );

  const loadNewEventsCount = async () => {
    try {
      if (!user?.id) return;
      
      // Get events from last 7 days that were posted by others
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('id')
        .neq('user_id', user.id)
        .eq('is_approved', true)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (!error && data) {
        setNewEventsCount(data.length);
      }
    } catch (error) {
      console.error('Error loading new events count:', error);
    }
  };

  const loadMyCounts = async () => {
    if (!user) return;
    
    try {
      // Count my created events
      const { data: myEvents, error: myError } = await supabase
        .from('secretariat_events')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      if (!myError && myEvents) {
        setMyEventsCount(myEvents.length);
      }

      // Count saved events (bookmarks)
      const { data: savedEvents, error: savedError } = await supabase
        .from('event_bookmarks')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      if (!savedError && savedEvents) {
        setSavedEventsCount(savedEvents.length);
      }
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      console.log('[Event Calendar] Loading events for user:', user?.id);
      
      // Don't query if user is not loaded yet
      if (!user?.id) {
        console.log('[Event Calendar] User not loaded yet, skipping query');
        setEvents(SAMPLE_EVENTS);
        setParsedUserEvents([]);
        setLoading(false);
        return;
      }
      
      // Load events from Supabase - show approved events AND user's own events
      const { data, error } = await supabase
        .from('secretariat_events')
        .select('*')
        .or(`is_approved.eq.true,user_id.eq.${user.id}`)
        .order('created_at', { ascending: false});

      console.log('[Event Calendar] Query result:', { data, error, count: data?.length });

      let parsedEvents: Event[] = [];
      let userEvents: Event[] = [];

      if (!error && data && data.length > 0) {
        parsedEvents = data.map(event => {
          const parsedEvent = {
            id: event.id,
            title: event.title,
            description: event.description || '',
            date: event.date || 'TBA',
            time: event.time || 'TBA',
            location: event.location || 'TBA',
            organizer: event.organizer || 'OAA Secretariat',
            category: event.category || 'General',
            attendees: event.view_count || 0,
            capacity: event.capacity ? event.capacity.toString() : '',
            created_at: event.created_at,
          };
          
          // Track user's own events separately
          if (event.user_id === user.id) {
            userEvents.push(parsedEvent);
          }
          
          return parsedEvent;
        });
      }

      // Combine with sample events
      const allEvents = [...SAMPLE_EVENTS, ...parsedEvents];
      setEvents(allEvents);
      setParsedUserEvents(userEvents);
      
      console.log('[Event Calendar] User events count:', userEvents.length);
    } catch (error) {
      console.error('Error loading events:', error);
      // Fall back to sample events on error
      setEvents(SAMPLE_EVENTS);
      setParsedUserEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.organizer.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'All Events') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    // Filter by selected month and year
    filtered = filtered.filter(event => {
      if (event.date === 'TBA') return true;
      
      // If "All Months" and "All Years" are selected, show all events
      if (selectedMonth === -1 && selectedYear === -1) return true;
      
      const eventDate = new Date(event.date);
      
      // If "All Months" selected but specific year, filter by year only
      if (selectedMonth === -1 && selectedYear !== -1) {
        return eventDate.getFullYear() === selectedYear;
      }
      
      // If "All Years" selected but specific month, filter by month only
      if (selectedMonth !== -1 && selectedYear === -1) {
        return eventDate.getMonth() === selectedMonth;
      }
      
      // Both month and year are specific
      return eventDate.getMonth() === selectedMonth && eventDate.getFullYear() === selectedYear;
    });

    return filtered.sort((a, b) => {
      if (a.date === 'TBA') return 1;
      if (b.date === 'TBA') return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const formatDate = (dateStr: string) => {
    if (dateStr === 'TBA') return 'Date TBA';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getDayNumber = (dateStr: string) => {
    if (dateStr === 'TBA') return '?';
    try {
      const date = new Date(dateStr);
      return date.getDate();
    } catch {
      return '?';
    }
  };

  const getMonthName = (dateStr: string) => {
    if (dateStr === 'TBA') return 'TBA';
    try {
      const date = new Date(dateStr);
      return MONTHS[date.getMonth()];
    } catch {
      return 'TBA';
    }
  };

  const filteredEvents = filterEvents();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Building2 size={24} color="#FFFFFF" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerSubtitle}>OAA Secretariat</Text>
              <Text style={styles.title}>Event Calendar</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/secretariat/event-notifications' as any)}
          >
            <Bell size={24} color="#FFFFFF" />
            {newEventsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{newEventsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push('/secretariat/all-events' as any)}
          >
            <Text style={styles.statNumber}>{events.length}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push('/secretariat/this-month-events' as any)}
          >
            <Text style={styles.statNumber}>{filteredEvents.length}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push('/secretariat/upcoming-events' as any)}
          >
            <Text style={styles.statNumber}>
              {events.filter(e => new Date(e.date) > new Date()).length}
            </Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/create-event' as any)}
        >
          <LinearGradient
            colors={['#4169E1', '#5B7FE8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.quickActionGradient}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Add Event</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/secretariat/my-events' as any)}
        >
          <View style={styles.quickActionOutline}>
            <Edit size={20} color="#4169E1" />
            <Text style={styles.quickActionOutlineText}>My Events</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/secretariat/saved-events' as any)}
        >
          <View style={styles.quickActionOutline}>
            <Bookmark size={20} color="#4169E1" />
            <Text style={styles.quickActionOutlineText}>Saved</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, location, organizer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.filterIconButton, showFilters && styles.filterIconButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? "#FFFFFF" : "#4169E1"} />
        </TouchableOpacity>
      </View>

      {/* Category Filter - Only show if filters are enabled */}
      {showFilters && (
        <>
          <View style={styles.monthSelector}>
            <Text style={styles.filterLabel}>Select Month:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthScrollContent}
            >
              {MONTHS.map((month, index) => {
                const monthValue = index - 1; // -1 for "All Months", 0-11 for Jan-Dec
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthButton,
                      selectedMonth === monthValue && styles.monthButtonActive
                    ]}
                    onPress={() => setSelectedMonth(monthValue)}
                  >
                    <Text style={[
                      styles.monthButtonText,
                      selectedMonth === monthValue && styles.monthButtonTextActive
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Year:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {YEARS.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterButton,
                    selectedYear === year && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedYear === year && styles.filterButtonTextActive
                  ]}>
                    {year === -1 ? 'All Years' : year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Category:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {FILTER_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterButton,
                    selectedCategory === category && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedCategory === category && styles.filterButtonTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {/* Events List */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptyText}>
              No events found {selectedMonth === -1 ? '' : `in ${MONTHS[selectedMonth + 1]}`} {selectedYear === -1 ? '' : selectedYear} {selectedCategory !== 'All Events' ? `in the ${selectedCategory.toLowerCase()} category` : ''}.
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/events/${event.id}` as any)}
            >
              {/* Date Badge */}
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeDay}>{getDayNumber(event.date)}</Text>
                <Text style={styles.dateBadgeMonth}>{getMonthName(event.date)}</Text>
              </View>

              {/* Event Content */}
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{event.category}</Text>
                  </View>
                  {event.attendees && (
                    <View style={styles.attendeesInfo}>
                      <Users size={14} color="#666" />
                      <Text style={styles.attendeesText}>{event.attendees}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailRow}>
                    <CalendarIcon size={16} color="#666" />
                    <Text style={styles.eventDetailText}>{event.date}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Clock size={16} color="#666" />
                    <Text style={styles.eventDetailText}>{event.time}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.eventDetailText} numberOfLines={1}>{event.location}</Text>
                  </View>
                </View>

                <View style={styles.organizerContainer}>
                  <Building2 size={14} color="#999" />
                  <Text style={styles.organizerText}>Organized by {event.organizer}</Text>
                </View>
              </View>

              {/* Arrow */}
              <ChevronRight size={20} color="#CCCCCC" />
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  headerGradient: {
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  placeholder: {
    width: 40,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickActionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#4169E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  quickActionOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  clearButton: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },
  filterIconButton: {
    width: 48,
    height: 48,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconButtonActive: {
    backgroundColor: '#4169E1',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginRight: 12,
    marginLeft: 16,
  },
  monthSelector: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  monthButtonActive: {
    backgroundColor: '#4169E1',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterScrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  filterButtonActive: {
    backgroundColor: '#EBF0FF',
    borderColor: '#4169E1',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#4169E1',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  dateBadge: {
    width: 64,
    height: 64,
    backgroundColor: '#4169E1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateBadgeMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
    gap: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4169E1',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  eventDetails: {
    gap: 6,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  organizerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 20,
  },
});
