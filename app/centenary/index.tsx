import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ArrowLeft, Calendar, Users, Clock, HeartHandshake, ChevronRight, ChevronDown, ChevronUp, Map, Theater, Archive, Radio, Heart, FileText, Footprints, Trophy, Target, Home, Wallet, Compass, Mic, Gift, Music, ClipboardCheck, Settings, Sparkles } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { hideSplashScreen } from '@/lib/splashScreen';
import { useAuth } from '@/hooks/useAuth';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const CENTENARY_DATE = new Date('2027-01-27T00:00:00Z');

// Committee display data with matching database circle names
const COMMITTEES = [
  { id: 'memorabilia', dbName: 'Memorabilia Committee', name: 'Memorabilia', desc: 'Preserving Achimota\'s rich history and heritage through archives and exhibitions', icon: Archive, color: '#EDE9FE' },
  { id: 'publicity', dbName: 'Publicity Committee', name: 'Publicity', desc: 'Global media coverage and social campaigns for the centenary', icon: Radio, color: '#ECFDF5' },
  { id: 'healthwalks', dbName: 'Health Walks Committee', name: 'Health Walks', desc: 'Wellness activities, campus tours, and fitness challenges', icon: Heart, color: '#FFF7ED' },
  { id: 'historicaldoc', dbName: 'Historical Documentation Committee', name: 'Historical Documentation', desc: 'Archive preservation and video documentation', icon: FileText, color: '#EFF6FF' },
  { id: 'healthwalks2', dbName: 'Health Walks II Committee', name: 'Health Walks II', desc: 'Extended wellness programs across regions', icon: Footprints, color: '#FFF7ED' },
  { id: 'achimotasubjugates', dbName: 'Achimota Subjugates Committee', name: 'Achimota Subjugates', desc: 'Sports tournaments and athletic competitions', icon: Trophy, color: '#F0FDF4' },
  { id: 'sports', dbName: 'Sports Committee', name: 'Sports', desc: 'Inter-school competitions and sports galas', icon: Target, color: '#FAF5FF' },
  { id: 'homecoming', dbName: 'Homecoming Committee', name: 'Homecoming', desc: 'Alumni reunions and networking sessions', icon: Home, color: '#EFF6FF' },
  { id: 'finance', dbName: 'Finance Committee', name: 'Finance', desc: 'Fundraising, budgeting, and sponsor relations', icon: Wallet, color: '#EDE9FE' },
  { id: 'gambagatoaccra', dbName: 'Gambaga to Accra Committee', name: 'Gambaga to Accra', desc: 'Heritage tours and historical journey documentation', icon: Compass, color: '#F0FDF4' },
  { id: 'achimotaspeaks', dbName: 'Achimota Speaks Committee', name: 'Achimota Speaks', desc: 'Lectures, seminars, and panel discussions', icon: Mic, color: '#EFF6FF' },
  { id: 'yeargroup', dbName: 'Year Group Celebrations Committee', name: 'Year Group Celebrations', desc: 'Year group events and reunion celebrations', icon: Gift, color: '#FFF7ED' },
  { id: 'operadrama', dbName: 'Opera and Drama Committee', name: 'Opera and Drama', desc: 'Theatrical productions and cultural performances', icon: Music, color: '#ECFDF5' },
  { id: 'centenaryplanning', dbName: 'Centenary Planning Committee', name: 'Centenary Planning', desc: 'Central coordination of all centenary activities', icon: ClipboardCheck, color: '#EDE9FE' },
];

// Interfaces for database items
interface Activity {
  id: string;
  title: string;
  description: string | null;
  month: string | null;
  year: number | null;
  sort_order: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  milestone_date: string | null;
  sort_order: number;
  is_completed: boolean;
}

interface Committee {
  id: string;
  name: string;
  db_name: string;
  description: string | null;
  icon_name: string | null;
  color: string | null;
  sort_order: number;
}

// Icon mapping for dynamic icons
const ICON_MAP: Record<string, any> = {
  Archive, Radio, Heart, FileText, Footprints, Trophy, Target, Home, Wallet, Compass, Mic, Gift, Music, ClipboardCheck, Users, Calendar, Map, Theater, Settings, ChevronRight, ChevronDown, ChevronUp, HeartHandshake, Clock
};

// Map committee dbName to circle ID from database
interface CircleMap {
  [key: string]: string;
}

export default function CentenaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });
  const [circleIds, setCircleIds] = useState<CircleMap>({});
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [expandedCommittee, setExpandedCommittee] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCommittee(expandedCommittee === id ? null : id);
  };

  const toggleActivityExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedActivity(expandedActivity === id ? null : id);
  };

  useEffect(() => {
    if (fontsLoaded) hideSplashScreen();
  }, [fontsLoaded]);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        setIsAdmin(data?.is_admin || false);
      } catch (error) {
        console.error('Error checking admin:', error);
      }
    };
    checkAdmin();
  }, [user]);

  // Fetch activities, milestones, and committees
  useEffect(() => {
    const fetchCentenaryData = async () => {
      try {
        // Fetch committees
        const { data: committeesData } = await supabase
          .from('centenary_committees')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (committeesData && committeesData.length > 0) {
          setCommittees(committeesData);
        }

        // Fetch activities
        const { data: activitiesData } = await supabase
          .from('centenary_activities')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (activitiesData) setActivities(activitiesData);

        // Fetch milestones
        const { data: milestonesData } = await supabase
          .from('centenary_milestones')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (milestonesData) setMilestones(milestonesData);
      } catch (error) {
        console.error('Error fetching centenary data:', error);
      }
    };
    fetchCentenaryData();
  }, []);

  // Fetch centenary circle IDs from database
  useEffect(() => {
    const fetchCentenaryCircles = async () => {
      try {
        const { data, error } = await supabase
          .from('circles')
          .select('id, name')
          .eq('category', 'Centenary');

        if (error) {
          console.error('Error fetching centenary circles:', error);
          return;
        }

        if (data) {
          const mapping: CircleMap = {};
          data.forEach((circle) => {
            mapping[circle.name] = circle.id;
          });
          setCircleIds(mapping);
        }
      } catch (error) {
        console.error('Error fetching centenary circles:', error);
      } finally {
        setLoadingCircles(false);
      }
    };

    fetchCentenaryCircles();
  }, []);

  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, CENTENARY_DATE.getTime() - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, seconds };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, CENTENARY_DATE.getTime() - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, seconds });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achimota Centenary 2027</Text>
        {isAdmin ? (
          <TouchableOpacity onPress={() => debouncedRouter.push('/centenary/admin')} style={styles.adminBtn}>
            <Settings size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Hero - Enhanced with theme colors */}
      <View style={styles.heroBW}>
        <View style={styles.heroAccent} />
        <Text style={styles.bigTitle}>Achimota @ 100</Text>
        <View style={styles.timerContainer}>
          <View style={styles.timerRow}>
            <View style={styles.timerBlock}>
              <Text style={styles.timerNumber}>{timeLeft.days}</Text>
              <Text style={styles.timerLabel}>Days</Text>
            </View>
            <Text style={styles.timerColon}>:</Text>
            <View style={styles.timerBlock}>
              <Text style={styles.timerNumber}>{String(timeLeft.hours).padStart(2, '0')}</Text>
              <Text style={styles.timerLabel}>Hours</Text>
            </View>
            <Text style={styles.timerColon}>:</Text>
            <View style={styles.timerBlock}>
              <Text style={styles.timerNumber}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
              <Text style={styles.timerLabel}>Seconds</Text>
            </View>
          </View>
          <View style={styles.dateContainer}>
            <View style={styles.dateBadge}>
              <Text style={styles.countdownDate}>27th January, 2027</Text>
            </View>
          </View>
        </View>

        <Text style={styles.motto}>
          Achimota @ 100 celebrating the vision, honouring the legacy, inspiring the future
        </Text>
      </View>

      {/* Committees */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Centenary Committees</Text>
            <View style={styles.sectionUnderline} />
          </View>
        </View>
        <Text style={[styles.sectionSubtitle, { paddingHorizontal: 16, marginBottom: 16 }]}>Join a committee and contribute to Achimota's centenary celebration</Text>
        {loadingCircles ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.tabBarActive} />
          </View>
        ) : (
          <View style={styles.committeesList}>
            {(committees.length > 0 ? committees : COMMITTEES).map((c: any) => {
              const Icon = ICON_MAP[c.icon_name || c.icon] || Users;
              const circleId = circleIds[c.db_name || c.dbName];
              const isExpanded = expandedCommittee === c.id;
              const cardColor = c.color || '#EDE9FE';
              const cardDesc = c.description || c.desc || '';
              const cardName = c.name;
              const cardDbName = c.db_name || c.dbName;
              
              const handleCardPress = () => {
                // Navigate to new committee detail page instead of circles
                debouncedRouter.push(`/centenary/committee/${c.id}`);
              };
              
              return (
                <View key={c.id} style={[styles.committeeCard, isExpanded && styles.committeeCardExpanded]}>
                  {/* Main card row - tappable to open circle */}
                  <TouchableOpacity 
                    onPress={handleCardPress} 
                    style={styles.committeeMainRow}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <Icon size={24} color={COLORS.tabBarActive} strokeWidth={2.2} />
                    </View>
                    <View style={styles.committeeTextContainer}>
                      <Text style={styles.committeeName} numberOfLines={isExpanded ? undefined : 1}>{cardName}</Text>
                      {!isExpanded && (
                        <Text style={styles.committeeDescPreview} numberOfLines={1}>{cardDesc}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* Expand/Collapse button */}
                  <TouchableOpacity 
                    onPress={() => toggleExpand(c.id)} 
                    style={styles.expandBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isExpanded ? (
                      <ChevronUp size={18} color={COLORS.textSecondary} />
                    ) : (
                      <ChevronDown size={18} color={COLORS.textSecondary} />
                    )}
                  </TouchableOpacity>
                  
                  {/* Expanded description */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.committeeDescFull}>{cardDesc}</Text>
                      <TouchableOpacity 
                        onPress={handleCardPress}
                        style={styles.viewCommitteeBtn}
                      >
                        <Text style={styles.viewCommitteeBtnText}>View Committee</Text>
                        <ChevronRight size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Activities & Preparation */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Activities & Preparation</Text>
            <View style={styles.sectionUnderline} />
          </View>
          <TouchableOpacity onPress={() => debouncedRouter.push('/centenary/activities')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>All</Text>
            <ChevronRight size={16} color={COLORS.tabBarActive} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
          {activities.length > 0 ? activities.map((a) => {
            const isExpanded = expandedActivity === a.id;
            return (
              <TouchableOpacity 
                key={a.id} 
                style={[styles.activityCard, isExpanded && styles.activityCardExpanded]}
                onPress={() => toggleActivityExpand(a.id)}
                activeOpacity={0.8}
              >
                <View style={styles.activityHeader}>
                  <View style={styles.activityBadge}>
                    <Text style={styles.activityBadgeText}>{a.month} {a.year}</Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color="#9CA3AF" />
                  ) : (
                    <ChevronDown size={16} color="#9CA3AF" />
                  )}
                </View>
                <Text style={styles.activityTitle}>{a.title}</Text>
                {!isExpanded && a.description && (
                  <Text style={styles.activitySummary} numberOfLines={2}>{a.description}</Text>
                )}
                {isExpanded && a.description && (
                  <Text style={styles.activityDescriptionFull}>{a.description}</Text>
                )}
                <View style={styles.activityIndicator} />
              </TouchableOpacity>
            );
          }) : (
            <View style={styles.emptyActivities}>
              <Text style={styles.emptyActivitiesText}>No activities yet</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderAlt}>
          <Text style={styles.sectionTitle}>Road to 2027</Text>
          <View style={styles.sectionUnderline} />
        </View>
        <View style={styles.timeline}>
          {milestones.length > 0 ? milestones.map((m, idx) => (
            <View key={m.id} style={styles.timelineRow}>
              <View style={styles.timelineDotContainer}>
                <View style={[styles.timelineDot, m.is_completed && styles.timelineDotCompleted]} />
                {idx < milestones.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{m.milestone_date}</Text>
                <Text style={styles.timelineText}>{m.title}</Text>
                {m.description && (
                  <Text style={styles.timelineDescription}>{m.description}</Text>
                )}
              </View>
            </View>
          )) : (
            [
              { date: 'Q1 2026', text: 'Committee onboarding & scopes' },
              { date: 'Q2 2026', text: 'Sponsorship packages & partnerships' },
              { date: 'Q3 2026', text: 'Media campaign & heritage curation' },
              { date: 'Q4 2026', text: 'Volunteer training & logistics checks' },
              { date: '2027', text: 'Centenary celebrations' },
            ].map((t, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timelineDotContainer}>
                  <View style={styles.timelineDot} />
                  {idx < 4 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>{t.date}</Text>
                  <Text style={styles.timelineText}>{t.text}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Sponsor Card */}
      <View style={styles.ctaBox}>
        <View style={styles.ctaAccent} />
        <Text style={styles.ctaTitle}>Become a Sponsor</Text>
        <Text style={styles.ctaText}>Support Achimota's centenary celebration and help make this milestone unforgettable.</Text>
        <TouchableOpacity 
          style={styles.sponsorButton} 
          onPress={() => debouncedRouter.push('/donation')}
          activeOpacity={0.85}
        >
          <HeartHandshake size={18} color="#0F172A" strokeWidth={2.5} />
          <Text style={styles.sponsorButtonText}>Sponsor Now</Text>
          <ChevronRight size={18} color="#0F172A" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 60, 
    paddingBottom: 16, 
    backgroundColor: COLORS.tabBar,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: { 
    fontSize: 18, 
    color: '#FFFFFF', 
    fontFamily: 'Inter-SemiBold' 
  },
  hero: { 
    margin: 16, 
    borderRadius: 16, 
    overflow: 'hidden', 
    position: 'relative' 
  },
  heroImg: { 
    width: '100%', 
    height: 200 
  },
  heroOverlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    padding: 16, 
    backgroundColor: 'rgba(0,0,0,0.35)' 
  },
  heroTitle: { 
    color: '#FFFFFF', 
    fontSize: 22, 
    fontFamily: 'Inter-SemiBold' 
  },
  heroSubtitle: { 
    color: '#F3F4F6', 
    marginTop: 4 
  },
  countdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 8 
  },
  countdownText: { 
    color: '#FFFFFF', 
    fontFamily: 'Inter-SemiBold' 
  },
  /* Enhanced hero styles with theme colors */
  heroBW: { 
    margin: 16, 
    borderRadius: 20, 
    paddingVertical: 32, 
    paddingHorizontal: 20, 
    backgroundColor: COLORS.tabBar, 
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroAccent: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.tabBarActive,
    opacity: 0.15,
  },
  bigTitle: { 
    color: '#FFFFFF', 
    fontSize: 32, 
    fontFamily: 'Inter-SemiBold', 
    letterSpacing: 1, 
    marginBottom: 24,
    textAlign: 'center',
  },
  timerContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%' 
  },
  timerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
    width: '100%',
  },
  timerBlock: { 
    width: 85, 
    height: 85, 
    borderRadius: 16, 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: COLORS.tabBarActive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: COLORS.tabBarActive,
  },
  timerNumber: { 
    color: COLORS.tabBar, 
    fontSize: 30, 
    fontFamily: 'Inter-SemiBold' 
  },
  timerLabel: { 
    color: '#6B7280', 
    marginTop: 2, 
    fontFamily: 'Inter-Regular', 
    fontSize: 11,
    letterSpacing: 0.5,
  },
  timerColon: { 
    color: COLORS.tabBarActive, 
    fontSize: 32, 
    fontFamily: 'Inter-SemiBold', 
    marginBottom: 16 
  },
  dateContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  dateBadge: {
    backgroundColor: COLORS.tabBarActive,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  countdownDate: { 
    color: COLORS.tabBar, 
    fontSize: 14, 
    fontFamily: 'Inter-SemiBold', 
    letterSpacing: 0.5,
  },
  motto: { 
    color: '#E5E7EB', 
    marginTop: 20, 
    fontStyle: 'italic', 
    textAlign: 'center', 
    paddingHorizontal: 12, 
    fontSize: 13,
    lineHeight: 20,
  },
  section: { 
    marginTop: 12, 
    marginBottom: 28 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    marginBottom: 16 
  },
  sectionHeaderAlt: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 22, 
    color: COLORS.tabBar, 
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },
  titleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.tabBarActive,
  },
  sectionTitleLarge: {
    fontSize: 24,
    color: COLORS.tabBar,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  sectionUnderline: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.tabBarActive,
    marginTop: 6,
    borderRadius: 2,
  },
  seeAllBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  seeAllText: { 
    color: COLORS.tabBarActive, 
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  committeesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  committeeCard: { 
    borderRadius: 18, 
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  committeeCardExpanded: {
    borderColor: COLORS.tabBarActive,
    borderWidth: 2,
    shadowOpacity: 0.12,
  },
  committeeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 16,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tabBar,
    borderWidth: 2,
    borderColor: COLORS.tabBarActive,
    shadowColor: COLORS.tabBarActive,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  iconGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  committeeTextContainer: {
    flex: 1,
    paddingRight: 40,
  },
  committeeName: { 
    fontFamily: 'Inter-SemiBold', 
    color: COLORS.tabBar,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  committeeDescPreview: {
    fontFamily: 'Inter-Regular',
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  expandBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFBFC',
  },
  committeeDescFull: { 
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  viewCommitteeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.tabBar,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  viewCommitteeBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  committeeArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  activityCard: { 
    width: 240, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  activityCardExpanded: {
    width: 280,
    backgroundColor: '#FFFBEB',
    borderColor: COLORS.tabBarActive,
  },
  activityHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityBadge: { 
    alignSelf: 'flex-start', 
    backgroundColor: COLORS.tabBar, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 6,
  },
  activityBadgeText: { 
    color: COLORS.tabBarActive, 
    fontFamily: 'Inter-SemiBold', 
    fontSize: 12,
    letterSpacing: 0.5,
  },
  activityTitle: { 
    fontFamily: 'Inter-SemiBold', 
    color: COLORS.tabBar, 
    marginBottom: 6,
    fontSize: 16,
    lineHeight: 22,
  },
  activitySummary: { 
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  activityDescriptionFull: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyActivities: {
    width: 240,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyActivitiesText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  activityIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.tabBarActive,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  timeline: { 
    paddingHorizontal: 16, 
    gap: 0,
  },
  timelineRow: { 
    flexDirection: 'row', 
    gap: 16, 
    alignItems: 'flex-start',
    paddingBottom: 20,
  },
  timelineDotContainer: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: COLORS.tabBarActive,
    borderWidth: 3,
    borderColor: COLORS.tabBar,
    zIndex: 2,
  },
  timelineDotCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineContent: { 
    flex: 1,
    paddingTop: 2,
  },
  timelineDate: { 
    fontFamily: 'Inter-SemiBold', 
    color: COLORS.tabBar,
    fontSize: 15,
    marginBottom: 4,
  },
  timelineText: { 
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  timelineDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    opacity: 0.8,
  },
  ctaBox: { 
    margin: 16, 
    padding: 24, 
    backgroundColor: COLORS.tabBar, 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  ctaAccent: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.tabBarActive,
    opacity: 0.15,
  },
  ctaTitle: { 
    fontFamily: 'Inter-SemiBold', 
    color: '#FFFFFF', 
    fontSize: 24,
    marginBottom: 8,
  },
  ctaText: { 
    color: '#E5E7EB', 
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8,
  },
  ctaBtn: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  ctaBtnPrimary: {
    backgroundColor: COLORS.tabBarActive,
  },
  ctaBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.tabBarActive,
  },
  ctaBtnTextLight: { 
    color: COLORS.tabBar, 
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  ctaBtnTextDark: { 
    color: COLORS.tabBar, 
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  sponsorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: '#ffc857',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignSelf: 'center',
    shadowColor: '#ffc857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sponsorButtonText: {
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
