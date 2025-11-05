import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Filter,
  MapPin,
  Briefcase,
  GraduationCap,
  Mail,
  Linkedin,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

interface AlumniProfile {
  id: string;
  full_name: string;
  email: string;
  graduation_year: number;
  department: string;
  program: string;
  job_title: string;
  company: string;
  location: string;
  profile_picture_url: string;
  bio: string;
}

const DEPARTMENTS = [
  'All',
  'Computer Science',
  'Engineering',
  'Medicine',
  'Architecture',
  'Business',
  'Law',
  'Arts',
  'Sciences',
];

const YEARS = ['All', '2024', '2023', '2022', '2021', '2020', '2015-2019', '2010-2014', 'Before 2010'];

export default function AlumniDirectoryScreen() {
  const router = useRouter();
  
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [filteredAlumni, setFilteredAlumni] = useState<AlumniProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAlumni();
  }, []);

  useEffect(() => {
    filterAlumni();
  }, [searchQuery, selectedDepartment, selectedYear, alumni]);

  const loadAlumni = async () => {
    try {
      setLoading(true);
      console.log('[Alumni Directory] Loading alumni...');

      const { data, error } = await supabase
        .from('alumni_profiles')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;

      console.log('[Alumni Directory] Loaded', data?.length || 0, 'alumni');
      setAlumni(data || []);
      setFilteredAlumni(data || []);
    } catch (error) {
      console.error('[Alumni Directory] Error loading alumni:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAlumni = () => {
    let filtered = [...alumni];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (person) =>
          person.full_name?.toLowerCase().includes(query) ||
          person.job_title?.toLowerCase().includes(query) ||
          person.company?.toLowerCase().includes(query) ||
          person.location?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (selectedDepartment !== 'All') {
      filtered = filtered.filter((person) => person.department === selectedDepartment);
    }

    // Year filter
    if (selectedYear !== 'All') {
      if (selectedYear.includes('-')) {
        const [start, end] = selectedYear.split('-').map(Number);
        filtered = filtered.filter(
          (person) => person.graduation_year >= start && person.graduation_year <= end
        );
      } else if (selectedYear === 'Before 2010') {
        filtered = filtered.filter((person) => person.graduation_year < 2010);
      } else {
        const year = parseInt(selectedYear);
        filtered = filtered.filter((person) => person.graduation_year === year);
      }
    }

    setFilteredAlumni(filtered);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4169E1', '#5B7FE8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push('/alumni-center')} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Alumni Directory</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading alumni directory...</Text>
        </View>
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
          <TouchableOpacity onPress={() => router.push('/alumni-center')} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Alumni Directory</Text>
            <Text style={styles.subtitle}>{filteredAlumni.length} members</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, company, or location..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? '#4169E1' : '#666'} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersSection}>
            <Text style={styles.filterLabel}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.filterChip,
                    selectedDepartment === dept && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedDepartment(dept)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedDepartment === dept && styles.filterChipTextActive,
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>Graduation Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {YEARS.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterChip,
                    selectedYear === year && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedYear === year && styles.filterChipTextActive,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </LinearGradient>

      {/* Alumni List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredAlumni.length === 0 ? (
          <View style={styles.emptyState}>
            <GraduationCap size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Alumni Found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <View style={styles.alumniList}>
            {filteredAlumni.map((person) => (
              <AlumniCard key={person.id} alumni={person} router={router} />
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function AlumniCard({ alumni, router }: { alumni: AlumniProfile; router: any }) {
  return (
    <TouchableOpacity
      style={styles.alumniCard}
      onPress={() => router.push(`/alumni-center/profile/${alumni.id}` as any)}
    >
      <Image
        source={{
          uri: alumni.profile_picture_url || 'https://via.placeholder.com/100',
        }}
        style={styles.alumniImage}
      />
      <View style={styles.alumniInfo}>
        <Text style={styles.alumniName}>{alumni.full_name}</Text>
        <Text style={styles.alumniYear}>Class of {alumni.graduation_year}</Text>
        
        {alumni.job_title && alumni.company && (
          <View style={styles.alumniRow}>
            <Briefcase size={14} color="#666" />
            <Text style={styles.alumniText}>
              {alumni.job_title} at {alumni.company}
            </Text>
          </View>
        )}
        
        {alumni.department && (
          <View style={styles.alumniRow}>
            <GraduationCap size={14} color="#666" />
            <Text style={styles.alumniText}>{alumni.department}</Text>
          </View>
        )}
        
        {alumni.location && (
          <View style={styles.alumniRow}>
            <MapPin size={14} color="#666" />
            <Text style={styles.alumniText}>{alumni.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#EBF0FF',
  },
  filtersSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 8,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4169E1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  alumniList: {
    padding: 16,
    gap: 16,
  },
  alumniCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alumniImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    marginRight: 16,
  },
  alumniInfo: {
    flex: 1,
  },
  alumniName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  alumniYear: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '600',
    marginBottom: 8,
  },
  alumniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alumniText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
