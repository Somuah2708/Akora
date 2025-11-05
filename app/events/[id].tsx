import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Share2,
  Heart,
  Bookmark,
  ExternalLink 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  capacity?: number;
  registered?: number;
  price?: string;
  contactEmail?: string;
  contactPhone?: string;
  agenda?: string[];
  speakers?: { name: string; title: string }[];
}

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.id as string;
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);

  // All events data
  const allEventsData: Event[] = [
    {
      id: 'sample-1',
      title: 'Annual Alumni Homecoming 2025',
      date: '2025-11-15',
      time: '10:00 AM',
      location: 'Main Campus Auditorium, Achimota',
      description: 'Join us for the biggest reunion of the year! Reconnect with old friends, network with fellow alumni, and celebrate our shared legacy.\n\nThe Annual Homecoming is a cherished tradition that brings together alumni from all graduating years. This day-long celebration features campus tours, award ceremonies, networking opportunities, and a spectacular evening gala. It\'s a wonderful opportunity to relive memories, make new connections, and see how your alma mater has evolved.',
      organizer: 'OAA Secretariat',
      imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
      isFeatured: true,
      category: 'Social',
      capacity: 500,
      registered: 342,
      price: 'Free Entry',
      contactEmail: 'homecoming@oaa.edu',
      contactPhone: '+233 20 123 4567',
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
      ]
    },
    {
      id: 'sample-2',
      title: 'Career Development Workshop: Digital Skills',
      date: '2025-11-08',
      time: '2:00 PM',
      location: 'Technology Hub, East Legon',
      description: 'Enhance your career prospects with cutting-edge digital skills. Learn about AI, data analytics, and digital marketing from industry experts.\n\nIn today\'s digital-first economy, staying current with technology is essential. This intensive workshop covers the most in-demand skills that employers are seeking. Whether you\'re looking to transition into tech or enhance your current role, you\'ll gain practical knowledge and hands-on experience.',
      organizer: 'Alumni Career Services',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
      isFeatured: true,
      category: 'Academic',
      capacity: 150,
      registered: 128,
      price: 'GHS 50',
      contactEmail: 'career@oaa.edu',
      contactPhone: '+233 24 567 8910',
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
      ]
    },
    {
      id: 'sample-3',
      title: 'Annual Inter-Alumni Sports Festival',
      date: '2025-11-22',
      time: '8:00 AM',
      location: 'School Sports Complex',
      description: 'Get ready for an action-packed day of sports! Football, basketball, volleyball, and more. Compete for the prestigious OAA Trophy.\n\nThe Sports Festival brings out the competitive spirit in our alumni community. Form teams with your year group, compete in various sporting events, and cheer on your fellow alumni. It\'s about fitness, fun, and fostering friendships through healthy competition.',
      organizer: 'OAA Sports Committee',
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=60',
      isFeatured: true,
      category: 'Sports',
      capacity: 1000,
      registered: 567,
      price: 'Free Entry',
      contactEmail: 'sports@oaa.edu',
      contactPhone: '+233 27 890 1234',
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
      ]
    },
    {
      id: 'sample-4',
      title: 'Cultural Night: Celebrating Our Heritage',
      date: '2025-11-29',
      time: '6:00 PM',
      location: 'Grand Hall, Achimota',
      description: 'An evening of traditional music, dance, and cuisine. Experience the rich cultural diversity of our alumni community.\n\nCultural Night is a celebration of our roots and the diverse backgrounds that make our community vibrant. Enjoy performances showcasing traditional dances, music, and fashion from various cultures. Sample authentic cuisine and immerse yourself in the beauty of our collective heritage.',
      organizer: 'Cultural Affairs Committee',
      imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=60',
      isFeatured: false,
      category: 'Cultural',
      capacity: 300,
      registered: 245,
      price: 'GHS 100',
      contactEmail: 'culture@oaa.edu',
      contactPhone: '+233 26 345 6789',
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
      ]
    },
    {
      id: 'sample-5',
      title: 'Board of Directors Meeting - Q4 2025',
      date: '2025-11-12',
      time: '9:00 AM',
      location: 'Executive Boardroom, Achimota',
      description: 'Quarterly board meeting to discuss strategic initiatives, financial reports, and upcoming projects for the alumni association.\n\nThis formal meeting brings together board members to review the association\'s performance, approve budgets, and set strategic direction. While primarily for board members, observers are welcome to attend and learn about the governance of our organization.',
      organizer: 'OAA Board of Directors',
      imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop&q=60',
      isFeatured: false,
      category: 'Meeting',
      capacity: 30,
      registered: 22,
      price: 'Board Members Only',
      contactEmail: 'board@oaa.edu',
      contactPhone: '+233 20 123 4567',
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
      ]
    },
    {
      id: 'sample-6',
      title: 'Founder\'s Day Celebration 2025',
      date: '2025-12-05',
      time: '11:00 AM',
      location: 'School Chapel and Main Grounds',
      description: 'Honor the founding fathers and mothers of our institution. A solemn ceremony followed by grand celebration.\n\nFounder\'s Day is a sacred tradition where we pay tribute to the visionaries who established our beloved institution. The day begins with a wreath-laying ceremony and memorial service, followed by historical presentations and a grand reception celebrating our legacy.',
      organizer: 'OAA Secretariat',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=60',
      isFeatured: true,
      category: 'Ceremony',
      capacity: 800,
      registered: 623,
      price: 'Free Entry',
      contactEmail: 'foundersday@oaa.edu',
      contactPhone: '+233 20 123 4567',
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
      ]
    },
    {
      id: 'sample-7',
      title: 'Youth Mentorship Program Launch',
      date: '2025-11-18',
      time: '3:00 PM',
      location: 'Student Center Auditorium',
      description: 'Launch of the new mentorship initiative connecting alumni with current students. Be part of shaping the next generation.\n\nOur Youth Mentorship Program creates meaningful connections between experienced alumni and current students. Share your wisdom, guide young minds, and make a lasting impact on the future leaders of our community.',
      organizer: 'Alumni Mentorship Committee',
      imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop&q=60',
      isFeatured: false,
      category: 'Academic',
      capacity: 200,
      registered: 156,
      price: 'Free Entry',
      contactEmail: 'mentorship@oaa.edu',
      contactPhone: '+233 24 789 0123',
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
      ]
    },
    {
      id: 'sample-8',
      title: 'End of Year Gala Dinner 2025',
      date: '2025-12-20',
      time: '7:00 PM',
      location: 'Kempinski Hotel Gold Coast City',
      description: 'A prestigious black-tie event to celebrate achievements and honor outstanding alumni. Featuring live music, awards, and gourmet dining.\n\nEnd the year in style at our most glamorous event! This elegant evening brings together the most distinguished members of our community for an unforgettable celebration of excellence, achievement, and camaraderie.',
      organizer: 'OAA Events Committee',
      imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f29da8c7d8?w=800&auto=format&fit=crop&q=60',
      isFeatured: true,
      category: 'Social',
      capacity: 250,
      registered: 198,
      price: 'GHS 500',
      contactEmail: 'gala@oaa.edu',
      contactPhone: '+233 20 123 4567',
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
      ]
    },
    {
      id: '1',
      title: 'Annual Alumni Gala',
      date: '2024-03-15',
      time: '7:00 PM',
      location: 'Grand Ballroom, Hotel Excellence',
      description: 'Join us for an unforgettable evening of networking, celebration, and reconnection with fellow alumni. The Annual Alumni Gala is our flagship event, bringing together distinguished alumni from across generations for an evening of elegance and camaraderie.\n\nThis year\'s gala will feature a cocktail reception, gourmet dinner, live entertainment, and special recognition of outstanding alumni achievements. It\'s the perfect opportunity to strengthen bonds, forge new connections, and celebrate our shared heritage.',
      organizer: 'Alumni Association',
      imageUrl: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
      isFeatured: true,
      category: 'Social',
      capacity: 300,
      registered: 178,
      price: 'GHS 500 / USD 45',
      contactEmail: 'gala@alumniassociation.com',
      contactPhone: '+233 50 123 4567',
      agenda: [
        '7:00 PM - Registration & Cocktail Reception',
        '8:00 PM - Welcome Remarks',
        '8:30 PM - Gourmet Dinner',
        '9:30 PM - Alumni Recognition Awards',
        '10:00 PM - Live Entertainment & Dancing',
        '12:00 AM - Event Conclusion'
      ],
      speakers: [
        { name: 'Dr. Sarah Mensah', title: 'Alumni Association President' },
        { name: 'Prof. Kwame Asante', title: 'Guest Speaker - Class of 1995' },
        { name: 'Hon. Grace Owusu', title: 'Keynote Speaker - Minister of Education' }
      ]
    },
    {
      id: '2',
      title: 'Career Development Workshop',
      date: '2024-03-20',
      time: '2:00 PM',
      location: 'Conference Center A',
      description: 'Elevate your career to the next level with our comprehensive Career Development Workshop. This intensive half-day session is designed to equip you with essential skills for career advancement and professional growth in today\'s competitive job market.\n\nLearn from industry experts about resume optimization, interview techniques, personal branding, networking strategies, and navigating career transitions. Whether you\'re looking to advance in your current role or explore new opportunities, this workshop provides practical tools and insights.',
      organizer: 'Professional Development Committee',
      imageUrl: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
      isFeatured: true,
      category: 'Professional',
      capacity: 100,
      registered: 67,
      price: 'Free for Alumni',
      contactEmail: 'career@alumniassociation.com',
      contactPhone: '+233 24 567 8901',
      agenda: [
        '2:00 PM - Registration',
        '2:15 PM - Resume & LinkedIn Optimization',
        '3:00 PM - Interview Mastery Techniques',
        '3:45 PM - Coffee Break & Networking',
        '4:00 PM - Personal Branding Workshop',
        '4:45 PM - Q&A Session',
        '5:30 PM - Closing Remarks'
      ],
      speakers: [
        { name: 'Michael Osei', title: 'HR Director - Global Tech Corp' },
        { name: 'Abena Darko', title: 'Career Coach & LinkedIn Expert' },
        { name: 'Emmanuel Addo', title: 'Recruitment Specialist' }
      ]
    },
    {
      id: '3',
      title: 'Monthly Networking Mixer',
      date: '2024-03-25',
      time: '6:00 PM',
      location: 'Sky Lounge, Downtown',
      description: 'Connect, collaborate, and create meaningful relationships at our Monthly Networking Mixer. This casual after-work event brings together professionals from various industries in a relaxed, sophisticated setting high above the city.\n\nEnjoy complimentary drinks and appetizers while expanding your professional network. Our mixers are designed to facilitate organic connections and conversations that can lead to business opportunities, mentorships, and lasting friendships.',
      organizer: 'Networking Committee',
      imageUrl: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg',
      isFeatured: false,
      category: 'Networking',
      capacity: 80,
      registered: 45,
      price: 'GHS 100 / USD 10',
      contactEmail: 'networking@alumniassociation.com',
      contactPhone: '+233 20 345 6789',
      agenda: [
        '6:00 PM - Arrival & Registration',
        '6:15 PM - Welcome & Ice Breaker Activity',
        '6:30 PM - Open Networking Session',
        '7:30 PM - Speed Networking Rounds',
        '8:00 PM - Casual Mingling & Refreshments',
        '9:00 PM - Event Wrap-up'
      ]
    },
    {
      id: '4',
      title: 'Tech Innovation Summit',
      date: '2024-04-02',
      time: '9:00 AM',
      location: 'Innovation Hub',
      description: 'Dive into the future of technology at our annual Tech Innovation Summit. This full-day conference explores cutting-edge developments in AI, blockchain, cybersecurity, and emerging technologies that are reshaping industries worldwide.\n\nFeaturing keynote presentations from tech leaders, panel discussions, interactive demos, and hands-on workshops, this summit is essential for anyone looking to stay ahead in the rapidly evolving tech landscape. Perfect for entrepreneurs, developers, and tech enthusiasts.',
      organizer: 'Tech Committee',
      imageUrl: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg',
      isFeatured: false,
      category: 'Technology',
      capacity: 200,
      registered: 134,
      price: 'GHS 300 / USD 27',
      contactEmail: 'tech@alumniassociation.com',
      contactPhone: '+233 55 789 0123',
      agenda: [
        '9:00 AM - Registration & Breakfast',
        '9:30 AM - Opening Keynote: The Future of AI',
        '10:30 AM - Panel: Blockchain in Business',
        '11:30 AM - Workshop Sessions (Track A & B)',
        '12:30 PM - Networking Lunch',
        '1:30 PM - Tech Demos & Exhibitions',
        '3:00 PM - Cybersecurity Masterclass',
        '4:00 PM - Startup Pitch Competition',
        '5:00 PM - Closing Remarks & Networking'
      ],
      speakers: [
        { name: 'Dr. Yaw Boateng', title: 'AI Research Scientist' },
        { name: 'Rita Mensah', title: 'Blockchain Entrepreneur' },
        { name: 'Kofi Amponsah', title: 'Cybersecurity Expert' },
        { name: 'Ama Serwaa', title: 'Tech Startup Founder' }
      ]
    },
    {
      id: '5',
      title: 'Community Service Day',
      date: '2024-04-10',
      time: '8:00 AM',
      location: 'Community Center',
      description: 'Make a difference in our community! Join fellow alumni for a day dedicated to giving back through various volunteer activities. Community Service Day is our opportunity to demonstrate the impact of education and collective action.\n\nActivities include school renovations, mentoring students, environmental cleanup, food distribution, and educational workshops for underprivileged youth. All skill levels welcome - there\'s a way for everyone to contribute!',
      organizer: 'Community Service Committee',
      imageUrl: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg',
      isFeatured: false,
      category: 'Community',
      capacity: 150,
      registered: 89,
      price: 'Free (Lunch Provided)',
      contactEmail: 'community@alumniassociation.com',
      contactPhone: '+233 24 890 1234',
      agenda: [
        '8:00 AM - Arrival & Team Assignments',
        '8:30 AM - Project Briefings',
        '9:00 AM - Community Service Activities Begin',
        '12:00 PM - Lunch Break',
        '1:00 PM - Afternoon Service Session',
        '3:30 PM - Project Wrap-up & Clean-up',
        '4:00 PM - Reflection & Group Photo',
        '4:30 PM - Closing Ceremony'
      ],
      speakers: [
        { name: 'Rev. Samuel Oppong', title: 'Community Leader' },
        { name: 'Beatrice Asamoah', title: 'NGO Director' }
      ]
    }
  ];

  useEffect(() => {
    loadEvent();
    checkBookmarkStatus();
    incrementViewCount();
  }, [eventId, user?.id]);

  const incrementViewCount = async () => {
    try {
      if (!eventId) return;
      
      // Try secretariat_events table first
      const { data: secretariatData } = await supabase
        .from('secretariat_events')
        .select('view_count')
        .eq('id', eventId)
        .single();
      
      if (secretariatData) {
        const newCount = (secretariatData.view_count || 0) + 1;
        await supabase
          .from('secretariat_events')
          .update({ view_count: newCount })
          .eq('id', eventId);
        return;
      }

      // Fall back to products_services table
      const { data: currentData } = await supabase
        .from('products_services')
        .select('view_count')
        .eq('id', eventId)
        .single();
      
      if (currentData) {
        const newCount = (currentData.view_count || 0) + 1;
        await supabase
          .from('products_services')
          .update({ view_count: newCount })
          .eq('id', eventId);
      }
        
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Non-critical, don't block page load
    }
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      
      // First, try to load from secretariat_events table (new table)
      const { data: secretariatData, error: secretariatError } = await supabase
        .from('secretariat_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!secretariatError && secretariatData) {
        // Load from new secretariat_events table
        const loadedEvent: Event = {
          id: secretariatData.id,
          title: secretariatData.title,
          date: secretariatData.date || 'TBA',
          time: secretariatData.time || 'TBA',
          location: secretariatData.location || 'TBA',
          description: secretariatData.description || '',
          organizer: secretariatData.organizer || 'OAA Secretariat',
          imageUrl: secretariatData.image_url || secretariatData.image_urls?.[0] || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
          isFeatured: false, // Can add this field to secretariat_events table later
          category: secretariatData.category || 'General',
          capacity: secretariatData.capacity || undefined,
          registered: secretariatData.registration_count || undefined,
          price: secretariatData.is_free ? 'Free Entry' : `${secretariatData.currency || 'GHS'} ${secretariatData.ticket_price || 0}`,
          contactEmail: secretariatData.contact_email,
          contactPhone: secretariatData.contact_phone,
          agenda: secretariatData.agenda || [],
          speakers: secretariatData.speakers || [],
        };
        setEvent(loadedEvent);
        return;
      }

      // Fall back to products_services table (old table)
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!error && data) {
        // Parse the event data from description
        const eventData = JSON.parse(data.description);
        const loadedEvent: Event = {
          id: data.id,
          title: data.title,
          date: eventData.date || 'TBA',
          time: eventData.time || 'TBA',
          location: eventData.location || 'TBA',
          description: eventData.description || '',
          organizer: eventData.organizer || 'OAA Secretariat',
          imageUrl: eventData.imageUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
          isFeatured: eventData.isFeatured || false,
          category: eventData.category || data.category_name?.replace('Event - ', '') || 'General',
          capacity: eventData.capacity ? parseInt(eventData.capacity) : undefined,
          registered: eventData.registered ? parseInt(eventData.registered) : undefined,
          price: data.price > 0 ? `GHS ${data.price}` : 'Free Entry',
          contactEmail: eventData.contactEmail,
          contactPhone: eventData.contactPhone,
          agenda: eventData.agenda || [],
          speakers: eventData.speakers || [],
        };
        setEvent(loadedEvent);
      } else {
        // Fall back to sample data if not found in database
        const foundEvent = allEventsData.find(e => e.id === eventId);
        setEvent(foundEvent || null);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      // Fall back to sample data on error
      const foundEvent = allEventsData.find(e => e.id === eventId);
      setEvent(foundEvent || null);
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    try {
      if (!user?.id || !eventId) return;

      const { data, error } = await supabase
        .from('event_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();

      if (!error && data) {
        setIsBookmarked(true);
        setBookmarkId(data.id);
      } else {
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      if (!user?.id) {
        Alert.alert('Login Required', 'Please login to save events');
        return;
      }

      if (isBookmarked && bookmarkId) {
        // Remove bookmark
        const { error } = await supabase
          .from('event_bookmarks')
          .delete()
          .eq('id', bookmarkId);

        if (error) throw error;

        setIsBookmarked(false);
        setBookmarkId(null);
        Alert.alert('Success', 'Event removed from saved');
      } else {
        // Add bookmark
        const { data, error } = await supabase
          .from('event_bookmarks')
          .insert({
            user_id: user.id,
            event_id: eventId,
          })
          .select()
          .single();

        if (error) throw error;

        setIsBookmarked(true);
        setBookmarkId(data.id);
        Alert.alert('Success', 'Event saved successfully');
      }
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFoundText}>Event not found</Text>
        <TouchableOpacity 
          style={styles.backToEventsButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToEventsText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRegister = () => {
    router.push({
      pathname: '/event-registration/[id]',
      params: { id: eventId }
    });
  };

  const handleShare = () => {
    Alert.alert('Share Event', 'Sharing functionality will be implemented soon!');
  };

  const handleContact = (type: 'email' | 'phone') => {
    if (type === 'email' && event.contactEmail) {
      Linking.openURL(`mailto:${event.contactEmail}`);
    } else if (type === 'phone' && event.contactPhone) {
      Linking.openURL(`tel:${event.contactPhone}`);
    }
  };

  const toggleInterest = () => {
    const newInterestState = !isInterested;
    setIsInterested(newInterestState);
    
    // Platform-specific success message
    const isWeb = typeof window !== 'undefined';
    
    if (newInterestState) {
      if (isWeb) {
        window.alert('Great! We\'ll notify you about updates for this event.');
      } else {
        Alert.alert('Success', 'Great! We\'ll notify you about updates for this event.');
      }
    }
  };

  const attendancePercentage = event.capacity && event.registered 
    ? (event.registered / event.capacity) * 100 
    : 0;

  return (
    <View style={styles.container}>
      {/* Header Image */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.imageUrl }} style={styles.headerImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonCircle}>
              <ArrowLeft size={24} color="#333" />
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Share2 size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={toggleBookmark}
            >
              <Bookmark size={20} color={isBookmarked ? '#007AFF' : '#333'} fill={isBookmarked ? '#007AFF' : 'none'} />
            </TouchableOpacity>
          </View>

          {/* Featured Badge */}
          {event.isFeatured && (
            <View style={styles.featuredBadgeDetail}>
              <Text style={styles.featuredTextDetail}>Featured Event</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Category */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>

          {/* Event Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Calendar size={20} color="#007AFF" />
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>

            <View style={styles.infoCard}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{event.time}</Text>
            </View>
          </View>

          <View style={[styles.infoGrid, { marginTop: 12 }]}>
            <View style={styles.infoCard}>
              <MapPin size={20} color="#007AFF" />
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{event.location}</Text>
            </View>

            <View style={styles.infoCard}>
              <User size={20} color="#007AFF" />
              <Text style={styles.infoLabel}>Organizer</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{event.organizer}</Text>
            </View>
          </View>

          {/* Capacity & Price */}
          {event.capacity && event.registered && (
            <View style={styles.capacitySection}>
              <View style={styles.capacityHeader}>
                <Users size={20} color="#666" />
                <Text style={styles.capacityText}>
                  {event.registered} / {event.capacity} registered
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${attendancePercentage}%` }]} />
              </View>
            </View>
          )}

          {event.price && (
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Ticket Price</Text>
              <Text style={styles.priceValue}>{event.price}</Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Agenda */}
          {event.agenda && event.agenda.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Agenda</Text>
              {event.agenda.map((item, index) => (
                <View key={index} style={styles.agendaItem}>
                  <View style={styles.agendaDot} />
                  <Text style={styles.agendaText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Speakers & Hosts</Text>
              {event.speakers.map((speaker, index) => (
                <View key={index} style={styles.speakerCard}>
                  <View style={styles.speakerIcon}>
                    <User size={24} color="#007AFF" />
                  </View>
                  <View style={styles.speakerInfo}>
                    <Text style={styles.speakerName}>{speaker.name}</Text>
                    <Text style={styles.speakerTitle}>{speaker.title}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Contact Information */}
          {(event.contactEmail || event.contactPhone) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              {event.contactEmail && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleContact('email')}
                >
                  <Text style={styles.contactLabel}>Email</Text>
                  <View style={styles.contactValue}>
                    <Text style={styles.contactText}>{event.contactEmail}</Text>
                    <ExternalLink size={16} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              )}
              {event.contactPhone && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => handleContact('phone')}
                >
                  <Text style={styles.contactLabel}>Phone</Text>
                  <View style={styles.contactValue}>
                    <Text style={styles.contactText}>{event.contactPhone}</Text>
                    <ExternalLink size={16} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Interest Button */}
          <TouchableOpacity 
            style={[styles.interestButton, isInterested && styles.interestedButton]}
            onPress={toggleInterest}
          >
            <Heart size={20} color={isInterested ? '#fff' : '#007AFF'} fill={isInterested ? '#fff' : 'none'} />
            <Text style={[styles.interestText, isInterested && styles.interestedText]}>
              {isInterested ? 'Interested' : 'Mark as Interested'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Register Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <LinearGradient
            colors={['#007AFF', '#0051D5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.registerGradient}
          >
            <Text style={styles.registerText}>Register for Event</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredBadgeDetail: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredTextDetail: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
    lineHeight: 36,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  capacitySection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  priceSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  agendaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginTop: 6,
    marginRight: 12,
  },
  agendaText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  speakerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  speakerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  speakerInfo: {
    flex: 1,
  },
  speakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  speakerTitle: {
    fontSize: 13,
    color: '#666',
  },
  contactItem: {
    marginBottom: 16,
  },
  contactLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  contactValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  interestedButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  interestText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  interestedText: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  registerGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 24,
  },
  backToEventsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4169E1',
    borderRadius: 12,
  },
  backToEventsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
