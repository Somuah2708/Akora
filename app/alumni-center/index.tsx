import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Users,
  Calendar,
  Newspaper,
  TrendingUp,
  MapPin,
  Briefcase,
  GraduationCap,
  Plus,
  Bell,
  UserPlus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

export default function AlumniCenterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalAlumni: 0,
    activeMembers: 0,
    upcomingEvents: 0,
    departments: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total alumni count
      const { count: alumniCount } = await supabase
        .from('alumni_profiles')
        .select('*', { count: 'exact', head: true });

      // Get unique departments count
      const { data: deptData } = await supabase
        .from('alumni_profiles')
        .select('department');
      
      const uniqueDepts = new Set(deptData?.map(d => d.department).filter(Boolean));

      // Get upcoming events count
      const { count: eventsCount } = await supabase
        .from('alumni_events')
        .select('*', { count: 'exact', head: true })
        .gte('event_date', new Date().toISOString());

      setStats({
        totalAlumni: alumniCount || 0,
        activeMembers: alumniCount || 0,
        upcomingEvents: eventsCount || 0,
        departments: uniqueDepts.size,
      });
    } catch (error) {
      console.error('[Alumni Center] Error loading stats:', error);
    }
  };

  const quickActions = [
    {
      id: 'directory',
      title: 'Alumni Directory',
      description: 'Find fellow graduates',
      icon: Users,
      color: '#4169E1',
      route: '/alumni-center/directory',
    },
    {
      id: 'events',
      title: 'Events',
      description: 'Reunions & gatherings',
      icon: Calendar,
      color: '#10B981',
      route: '/alumni-center/events',
    },
    {
      id: 'news',
      title: 'News & Updates',
      description: 'Alumni achievements',
      icon: Newspaper,
      color: '#F59E0B',
      route: '/alumni-center/news',
    },
    {
      id: 'profile',
      title: 'My Profile',
      description: 'Update your info',
      icon: UserPlus,
      color: '#8B5CF6',
      route: '/alumni-center/my-profile',
    },
  ];

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
          <TouchableOpacity 
            onPress={() => router.push('/hub')} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Alumni Center</Text>
            <Text style={styles.headerSubtitle}>Stay Connected</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/alumni-center/notifications')}
          >
            <Bell size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <GraduationCap size={48} color="#FFFFFF" />
            <Text style={styles.heroTitle}>Welcome to the Alumni Network</Text>
            <Text style={styles.heroText}>
              Stay connected with your fellow graduates and your alma mater.
              Share experiences, attend events, and grow together.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/alumni-center/my-profile')}
            >
              <UserPlus size={20} color="#4169E1" />
              <Text style={styles.heroButtonText}>Join the Network</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Users size={24} color="#4169E1" />
              <Text style={styles.statNumber}>{stats.totalAlumni}</Text>
              <Text style={styles.statLabel}>Total Alumni</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={24} color="#10B981" />
              <Text style={styles.statNumber}>{stats.activeMembers}</Text>
              <Text style={styles.statLabel}>Active Members</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Calendar size={24} color="#F59E0B" />
              <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
              <Text style={styles.statLabel}>Upcoming Events</Text>
            </View>
            <View style={styles.statCard}>
              <GraduationCap size={24} color="#8B5CF6" />
              <Text style={styles.statNumber}>{stats.departments}</Text>
              <Text style={styles.statLabel}>Departments</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionCard}
                  onPress={() => router.push(action.route as any)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                    <IconComponent size={28} color={action.color} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Featured Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Alumni</Text>
            <TouchableOpacity onPress={() => router.push('/alumni-center/directory')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FeaturedAlumniCard
              name="Dr. Kwame Mensah"
              year="Class of 2010"
              title="CEO, Tech Innovations Ltd"
              location="Accra, Ghana"
              image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
            />
            <FeaturedAlumniCard
              name="Ama Asante"
              year="Class of 2012"
              title="Senior Architect"
              location="London, UK"
              image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
            />
            <FeaturedAlumniCard
              name="Kofi Boateng"
              year="Class of 2015"
              title="Medical Director"
              location="Toronto, Canada"
              image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
            />
          </ScrollView>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/alumni-center/events')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <EventCard
            title="Annual Alumni Reunion 2025"
            date="March 15, 2025"
            location="Main Campus"
            attendees={245}
          />
          <EventCard
            title="Career Mentorship Session"
            date="March 22, 2025"
            location="Virtual Event"
            attendees={89}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FeaturedAlumniCard({ name, year, title, location, image }: any) {
  return (
    <View style={styles.featuredCard}>
      <Image source={{ uri: image }} style={styles.featuredImage} />
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredName}>{name}</Text>
        <Text style={styles.featuredYear}>{year}</Text>
        <View style={styles.featuredRow}>
          <Briefcase size={14} color="#666" />
          <Text style={styles.featuredText}>{title}</Text>
        </View>
        <View style={styles.featuredRow}>
          <MapPin size={14} color="#666" />
          <Text style={styles.featuredText}>{location}</Text>
        </View>
      </View>
    </View>
  );
}

function EventCard({ title, date, location, attendees }: any) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventIconContainer}>
        <Calendar size={24} color="#4169E1" />
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{title}</Text>
        <View style={styles.eventDetails}>
          <Text style={styles.eventDate}>{date}</Text>
          <Text style={styles.eventSeparator}>•</Text>
          <Text style={styles.eventLocation}>{location}</Text>
        </View>
        <Text style={styles.eventAttendees}>{attendees} attending</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.95,
    marginBottom: 24,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4169E1',
  },
  statsSection: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  featuredCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  featuredInfo: {
    padding: 12,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  featuredYear: {
    fontSize: 12,
    color: '#4169E1',
    marginBottom: 8,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  featuredText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E4EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  eventSeparator: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  eventAttendees: {
    fontSize: 12,
    color: '#4169E1',
    fontWeight: '600',
  },
});
