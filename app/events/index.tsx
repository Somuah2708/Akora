import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, Filter, Bell, Plus, X } from 'lucide-react-native';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer: string;
  imageUrl: string;
  isFeatured: boolean;
  category: string;
}

export default function EventsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  const featuredEvents: Event[] = [
    {
      id: '1',
      title: 'Annual Alumni Gala',
      date: '2024-03-15',
      time: '7:00 PM',
      location: 'Grand Ballroom, Hotel Excellence',
      description: 'Join us for an evening of networking, celebration, and reconnection with fellow alumni.',
      organizer: 'Alumni Association',
      imageUrl: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
      isFeatured: true,
      category: 'Social'
    },
    {
      id: '2',
      title: 'Career Development Workshop',
      date: '2024-03-20',
      time: '2:00 PM',
      location: 'Conference Center A',
      description: 'Learn essential skills for career advancement and professional growth.',
      organizer: 'Professional Development Committee',
      imageUrl: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
      isFeatured: true,
      category: 'Professional'
    }
  ];

  const upcomingEvents: Event[] = [
    {
      id: '3',
      title: 'Monthly Networking Mixer',
      date: '2024-03-25',
      time: '6:00 PM',
      location: 'Sky Lounge, Downtown',
      description: 'Connect with professionals from various industries in a relaxed setting.',
      organizer: 'Networking Committee',
      imageUrl: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg',
      isFeatured: false,
      category: 'Networking'
    },
    {
      id: '4',
      title: 'Tech Innovation Summit',
      date: '2024-04-02',
      time: '9:00 AM',
      location: 'Innovation Hub',
      description: 'Explore the latest trends in technology and innovation.',
      organizer: 'Tech Committee',
      imageUrl: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg',
      isFeatured: false,
      category: 'Technology'
    },
    {
      id: '5',
      title: 'Community Service Day',
      date: '2024-04-10',
      time: '8:00 AM',
      location: 'Community Center',
      description: 'Give back to the community through various volunteer activities.',
      organizer: 'Community Service Committee',
      imageUrl: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg',
      isFeatured: false,
      category: 'Community'
    }
  ];

  const allEvents = [...featuredEvents, ...upcomingEvents];

  useEffect(() => {
    setFilteredEvents(allEvents);
  }, []);

  useEffect(() => {
    if (params.filter) {
      handleFilter(params.filter as string);
    }
  }, [params.filter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
    
    if (query.trim() === '') {
      setFilteredEvents(allEvents);
      return;
    }

    const filtered = allEvents.filter(event =>
      event.title.toLowerCase().includes(query.toLowerCase()) ||
      event.description.toLowerCase().includes(query.toLowerCase()) ||
      event.location.toLowerCase().includes(query.toLowerCase()) ||
      event.organizer.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredEvents(filtered);
  };

  const handleFilter = (filterType: string) => {
    switch (filterType) {
      case 'featured':
        setFilteredEvents(featuredEvents);
        setActiveCategory('featured');
        break;
      case 'upcoming':
        setFilteredEvents(upcomingEvents);
        setActiveCategory('upcoming');
        break;
      case 'thisMonth':
        const thisMonth = allEvents.filter(event => {
          const eventDate = new Date(event.date);
          const now = new Date();
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        });
        setFilteredEvents(thisMonth);
        setActiveCategory('thisMonth');
        break;
      default:
        setFilteredEvents(allEvents);
        setActiveCategory('all');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setFilteredEvents(allEvents);
  };

  const renderEventCard = (event: Event) => (
    <TouchableOpacity key={event.id} style={styles.eventCard}>
      <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDate}>{event.date} at {event.time}</Text>
        <Text style={styles.eventLocation}>{event.location}</Text>
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>
        <Text style={styles.eventOrganizer}>Organized by {event.organizer}</Text>
      </View>
      {event.isFeatured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Akora Events</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              Alert.alert(
                'Filter Events',
                'Choose a filter option:',
                [
                  { text: 'All Events', onPress: () => handleFilter('all') },
                  { text: 'Featured Only', onPress: () => handleFilter('featured') },
                  { text: 'Upcoming Only', onPress: () => handleFilter('upcoming') },
                  { text: 'This Month Only', onPress: () => handleFilter('thisMonth') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <Filter size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/notices')}
          >
            <Bell size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {isSearching && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results Indicator */}
      {isSearching && (
        <View style={styles.searchResults}>
          <Text style={styles.searchResultsText}>
            Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* Featured Events Section */}
      {!isSearching && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Events</Text>
            <TouchableOpacity onPress={() => handleFilter('featured')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredEvents.map(renderEventCard)}
          </ScrollView>
        </View>
      )}

      {/* Upcoming Events Section */}
      {!isSearching && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => handleFilter('upcoming')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingEvents.map(renderEventCard)}
        </View>
      )}

      {/* This Month Section */}
      {!isSearching && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Month</Text>
            <TouchableOpacity onPress={() => handleFilter('thisMonth')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {allEvents.filter(event => {
            const eventDate = new Date(event.date);
            const now = new Date();
            return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
          }).map(renderEventCard)}
        </View>
      )}

      {/* Search Results */}
      {isSearching && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {filteredEvents.length > 0 ? (
            filteredEvents.map(renderEventCard)
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No events found matching your search.</Text>
            </View>
          )}
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          if (isSearching) {
            clearSearch();
          } else {
            router.push('/create-event');
          }
        }}
      >
        {isSearching ? (
          <X size={24} color="#fff" />
        ) : (
          <Plus size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchResultsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  eventOrganizer: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});