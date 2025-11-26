import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SplashScreen, useRouter } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ArrowLeft, Calendar, Users, Star, Clock, HeartHandshake, ChevronRight, Map, Award } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const CENTENARY_DATE = new Date('2027-01-27T00:00:00Z');

const COMMITTEES = [
  { id: 'memorabilia', name: 'Memorabilia', desc: 'Master schedule, venues, and operations', icon: Calendar, color: '#EDE9FE' },
  { id: 'publicity', name: 'Publicity', desc: 'Partners, donors, and grants', icon: HeartHandshake, color: '#ECFDF5' },
  { id: 'healthwalks', name: 'Health Walks', desc: 'Wellness activities and campus tours', icon: Star, color: '#FFF7ED' },
  { id: 'historicaldoc', name: 'Historical Documentation', desc: 'Archive preservation and records', icon: Users, color: '#EFF6FF' },
  { id: 'healthwalks2', name: 'Health Walks', desc: 'Wellness activities and campus tours', icon: Star, color: '#FFF7ED' },
  { id: 'achimotasubjugates', name: 'Achimota Subjugates', desc: 'Sports, games, and competitions', icon: Map, color: '#F0FDF4' },
  { id: 'sports', name: 'Sports', desc: 'Athletic events and tournaments', icon: Award, color: '#FAF5FF' },
  { id: 'homecoming', name: 'Homecoming', desc: 'Alumni reunions and networking', icon: Users, color: '#EFF6FF' },
];

const ACTIVITIES = [
  { id: 'a1', month: 'Jan', year: 2026, title: 'Committee Onboarding', summary: 'Kick-off workshops and alignment' },
  { id: 'a2', month: 'Apr', year: 2026, title: 'Sponsorship Drive', summary: 'Launch official sponsor packages' },
  { id: 'a3', month: 'Aug', year: 2026, title: 'Heritage Exhibition Prep', summary: 'Curation and archival digitization' },
  { id: 'a4', month: 'Nov', year: 2026, title: 'Volunteers Recruitment', summary: 'Campus and alumni volunteers' },
  { id: 'a5', month: 'Mar', year: 2027, title: 'Centenary Gala', summary: 'Flagship celebration night' },
];

export default function CentenaryScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achimota Centenary 2027</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Hero - Bold black & white countdown */}
      <View style={styles.heroBW}>
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
          <Text style={styles.countdownDate}>27th January, 2027</Text>
        </View>

        <Text style={styles.motto}>
          Achimota @ 100 celebrating the vision, honouring the legacy, inspiring the future
        </Text>
      </View>

      {/* Committees */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Centenary Committees</Text>
          <TouchableOpacity onPress={() => router.push('/circles')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See Roles</Text>
            <ChevronRight size={16} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.committeesGrid}>
          {COMMITTEES.map((c) => {
            const Icon = c.icon;
            return (
              <View key={c.id} style={[styles.committeeCard, { backgroundColor: c.color }]}> 
                <Icon size={20} color="#111827" />
                <Text style={styles.committeeName}>{c.name}</Text>
                <Text style={styles.committeeDesc}>{c.desc}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Activities & Preparation */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activities & Preparation</Text>
          <TouchableOpacity onPress={() => router.push('/events')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>View Events</Text>
            <ChevronRight size={16} color="#111827" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {ACTIVITIES.map((a) => (
            <View key={a.id} style={styles.activityCard}>
              <View style={styles.activityBadge}><Text style={styles.activityBadgeText}>{a.month} {a.year}</Text></View>
              <Text style={styles.activityTitle}>{a.title}</Text>
              <Text style={styles.activitySummary}>{a.summary}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Road to 2027</Text>
        <View style={styles.timeline}>
          {[
            { date: 'Q1 2026', text: 'Committee onboarding & scopes' },
            { date: 'Q2 2026', text: 'Sponsorship packages & partnerships' },
            { date: 'Q3 2026', text: 'Media campaign & heritage curation' },
            { date: 'Q4 2026', text: 'Volunteer training & logistics checks' },
            { date: '2027', text: 'Centenary celebrations' },
          ].map((t, idx) => (
            <View key={idx} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{t.date}</Text>
                <Text style={styles.timelineText}>{t.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Call to Action */}
      <View style={styles.ctaBox}>
        <Text style={styles.ctaTitle}>Get Involved</Text>
        <Text style={styles.ctaText}>Join a committee, volunteer, or become a sponsor to make the centenary unforgettable.</Text>
        <View style={styles.ctaButtons}>
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#111827' }]} onPress={() => router.push('/create-group')}>
            <Text style={styles.ctaBtnTextLight}>Join Committee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => router.push('/donation')}>
            <Text style={styles.ctaBtnTextDark}>Sponsor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, color: '#111827', fontFamily: 'Inter-SemiBold' },
  hero: { margin: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  heroImg: { width: '100%', height: 200 },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter-SemiBold' },
  heroSubtitle: { color: '#F3F4F6', marginTop: 4 },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  countdownText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  /* New black & white hero styles */
  heroBW: { margin: 16, borderRadius: 16, paddingVertical: 26, paddingHorizontal: 16, backgroundColor: '#111827', alignItems: 'center' },
  bigTitle: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter-SemiBold', letterSpacing: 0.6, marginBottom: 16 },
  timerContainer: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  timerBlock: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  timerNumber: { color: '#111827', fontSize: 28, fontFamily: 'Inter-SemiBold' },
  timerLabel: { color: '#6B7280', marginTop: 3, fontFamily: 'Inter-Regular', fontSize: 10 },
  timerColon: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter-SemiBold', marginBottom: 16 },
  countdownDate: { color: '#FFFFFF', marginTop: 14, fontSize: 13, fontFamily: 'Inter-SemiBold', letterSpacing: 0.4 },
  motto: { color: '#F3F4F6', marginTop: 12, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 8, fontSize: 11 },
  section: { marginTop: 8, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, color: '#111827', fontFamily: 'Inter-SemiBold' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
  committeesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  committeeCard: { width: (width - 16*2 - 12) / 2, borderRadius: 14, padding: 12, gap: 6 },
  committeeName: { fontFamily: 'Inter-SemiBold', color: '#111827' },
  committeeDesc: { color: '#4B5563' },
  activityCard: { width: 220, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12 },
  activityBadge: { alignSelf: 'flex-start', backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  activityBadgeText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 12 },
  activityTitle: { fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 4 },
  activitySummary: { color: '#4B5563' },
  timeline: { paddingHorizontal: 16, gap: 14 },
  timelineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#111827', marginTop: 6 },
  timelineContent: { flex: 1 },
  timelineDate: { fontFamily: 'Inter-SemiBold', color: '#111827' },
  timelineText: { color: '#4B5563' },
  ctaBox: { margin: 16, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16 },
  ctaTitle: { fontFamily: 'Inter-SemiBold', color: '#111827', fontSize: 18 },
  ctaText: { color: '#4B5563', marginTop: 6 },
  ctaButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctaBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ctaBtnTextLight: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  ctaBtnTextDark: { color: '#111827', fontFamily: 'Inter-SemiBold' },
});
