import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, TextInput, FlatList, Alert, Share, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ArrowLeft, Lightbulb, Image as ImageIcon, Link2, FileText, Heart, Users, Send, Check, CheckCheck } from 'lucide-react-native';
import { SplashScreen } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

// Mock data for committees
const COMMITTEE_DATA = {
  memorabilia: {
    name: 'Memorabilia',
    desc: 'Preserve and celebrate Achimota\'s rich history and heritage',
    color: '#EDE9FE',
    goals: ['Digitize historical archives', 'Create centenary exhibition', 'Produce commemorative items'],
    vision: 'To create a lasting legacy of Achimota\'s 100 years of excellence',
    members: 245,
  },
  publicity: {
    name: 'Publicity',
    desc: 'Spread the word about Achimota\'s centenary celebration',
    color: '#ECFDF5',
    goals: ['Media coverage', 'Social media campaigns', 'Press releases'],
    vision: 'To ensure global recognition of Achimota\'s centenary',
    members: 189,
  },
  healthwalks: {
    name: 'Health Walks',
    desc: 'Wellness activities and campus tours',
    color: '#FFF7ED',
    goals: ['Weekly wellness activities', 'Campus heritage tours', 'Fitness challenges'],
    vision: 'To promote health and community bonding',
    members: 156,
  },
  historicaldoc: {
    name: 'Historical Documentation',
    desc: 'Archive preservation and records',
    color: '#EFF6FF',
    goals: ['Document centenary events', 'Preserve memories', 'Create video archives'],
    vision: 'To maintain accurate records for future generations',
    members: 124,
  },
  achimotasubjugates: {
    name: 'Achimota Subjugates',
    desc: 'Sports, games, and competitions',
    color: '#F0FDF4',
    goals: ['Organize sports tournaments', 'Host friendly competitions', 'Showcase athletic talent'],
    vision: 'To celebrate Achimota\'s sporting excellence',
    members: 278,
  },
  sports: {
    name: 'Sports',
    desc: 'Athletic events and tournaments',
    color: '#FAF5FF',
    goals: ['Inter-school competitions', 'Sports gala', 'Athlete recognition'],
    vision: 'To inspire athletic excellence',
    members: 203,
  },
  homecoming: {
    name: 'Homecoming',
    desc: 'Alumni reunions and networking',
    color: '#EFF6FF',
    goals: ['Alumni homecoming event', 'Networking sessions', 'Alumni mentorship'],
    vision: 'To strengthen alumni bonds and celebrate unity',
    members: 167,
  },
  finance: {
    name: 'Finance',
    desc: 'Budgeting, accounting, and fundraising',
    color: '#EDE9FE',
    goals: ['Fundraising campaigns', 'Budget management', 'Sponsor relations'],
    vision: 'To ensure sustainable funding for centenary events',
    members: 98,
  },
  gambagatoaccra: {
    name: 'Gambaga to Accra',
    desc: 'Heritage tour and historical journey',
    color: '#F0FDF4',
    goals: ['Historical journey tours', 'Heritage documentation', 'Community engagement'],
    vision: 'To reconnect with Achimota\'s roots and history',
    members: 134,
  },
  achimotaspeaks: {
    name: 'Achimota Speaks',
    desc: 'Lectures, seminars, and discussions',
    color: '#EFF6FF',
    goals: ['Host notable speakers', 'Panel discussions', 'Educational seminars'],
    vision: 'To inspire through knowledge and discourse',
    members: 211,
  },
  yeargroup: {
    name: 'Celebrating Year Group Rep',
    desc: 'Year group celebrations and reunions',
    color: '#FFF7ED',
    goals: ['Year group events', 'Reunion celebrations', 'Class photographs'],
    vision: 'To celebrate each generation\'s contribution',
    members: 456,
  },
  operadrama: {
    name: 'Opera and Drama',
    desc: 'Theatrical performances and cultural shows',
    color: '#ECFDF5',
    goals: ['Stage centenary production', 'Drama workshops', 'Cultural performances'],
    vision: 'To showcase artistic talent and creativity',
    members: 189,
  },
  centenaryplanning: {
    name: 'Centenary Planning Committee',
    desc: 'Overall coordination and planning',
    color: '#EDE9FE',
    goals: ['Coordinate all events', 'Manage timelines', 'Ensure quality execution'],
    vision: 'To orchestrate a memorable centenary celebration',
    members: 87,
  },
};

const MOCK_CHATS = [
  { id: '1', author: 'John Doe', message: 'Great work on the last meeting!', time: '09:30 AM', isOwn: false, read: true },
  { id: '2', author: 'Jane Smith', message: 'When is our next gathering?', time: '09:45 AM', isOwn: false, read: true },
  { id: '3', author: 'Alex Brown', message: 'Looking forward to the centenary! 🎉', time: '10:15 AM', isOwn: false, read: true },
  { id: '4', author: 'You', message: 'Thanks everyone! Let\'s keep the momentum going.', time: '10:20 AM', isOwn: true, read: true },
  { id: '5', author: 'John Doe', message: 'Absolutely! I\'ve prepared the first draft', time: '10:22 AM', isOwn: false, read: true },
  { id: '6', author: 'Jane Smith', message: 'That sounds great! Can\'t wait to see it.', time: '10:25 AM', isOwn: false, read: true },
];

const MOCK_SUGGESTIONS = [
  { id: '1', title: 'Host a virtual event', votes: 45 },
  { id: '2', title: 'Increase social media presence', votes: 38 },
  { id: '3', title: 'Organize fundraiser gala', votes: 52 },
];

export default function CommitteeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });
  const [chatMessage, setChatMessage] = useState('');
  const [chats, setChats] = useState(MOCK_CHATS);
  const [isJoined, setIsJoined] = useState(false);
  const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS);
  const [newSuggestion, setNewSuggestion] = useState('');

  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const committee = COMMITTEE_DATA[id as keyof typeof COMMITTEE_DATA] || COMMITTEE_DATA.memorabilia;
  const chatListRef = useRef<FlatList>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = { 
        id: String(chats.length + 1), 
        author: 'You', 
        message: chatMessage, 
        time: getCurrentTime(),
        isOwn: true,
        read: true
      };
      setChats([...chats, newMessage]);
      setChatMessage('');
      // Auto scroll to latest message
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleJoinCommittee = () => {
    setIsJoined(!isJoined);
    Alert.alert(
      isJoined ? 'Left Committee' : 'Joined Committee',
      isJoined 
        ? 'You have left the committee.' 
        : `You have successfully joined the ${committee.name} committee!`
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join the ${committee.name} committee for Achimota's Centenary! ${committee.desc}`,
        title: committee.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => 
      Alert.alert('Error', 'Unable to open link')
    );
  };

  const handleAddSuggestion = () => {
    if (newSuggestion.trim()) {
      setSuggestions([...suggestions, {
        id: String(suggestions.length + 1),
        title: newSuggestion,
        votes: 0,
      }]);
      setNewSuggestion('');
      Alert.alert('Success', 'Your suggestion has been added!');
    }
  };

  const handleVoteSuggestion = (suggestionId: string) => {
    setSuggestions(suggestions.map(s => 
      s.id === suggestionId ? { ...s, votes: s.votes + 1 } : s
    ));
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{committee.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: committee.color }]}>
        <Text style={styles.committeeName}>{committee.name}</Text>
        <Text style={styles.committeeDesc}>{committee.desc}</Text>
        <View style={styles.memberBadge}>
          <Users size={16} color="#111827" />
          <Text style={styles.memberText}>{committee.members} Members</Text>
        </View>
      </View>

      {/* Goals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals</Text>
        {committee.goals.map((goal, idx) => (
          <View key={idx} style={styles.goalItem}>
            <View style={styles.goalDot} />
            <Text style={styles.goalText}>{goal}</Text>
          </View>
        ))}
      </View>

      {/* Vision Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vision</Text>
        <View style={styles.visionBox}>
          <Heart size={20} color="#111827" />
          <Text style={styles.visionText}>{committee.vision}</Text>
        </View>
      </View>

      {/* Photos Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.photosGrid}>
          {[1, 2, 3, 4].map((i) => (
            <TouchableOpacity key={i} style={styles.photoPlaceholder} onPress={() => Alert.alert('Photos', `Opening photo gallery for ${committee.name}`)}>
              <ImageIcon size={32} color="#9CA3AF" />
              <Text style={styles.photoText}>Photo {i}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Links Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resources & Links</Text>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://example.com/guidelines')}
        >
          <Link2 size={18} color="#FFFFFF" />
          <Text style={styles.linkButtonText}>Committee Guidelines</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://example.com/schedule')}
        >
          <Link2 size={18} color="#FFFFFF" />
          <Text style={styles.linkButtonText}>Centenary Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://example.com/documents')}
        >
          <Link2 size={18} color="#FFFFFF" />
          <Text style={styles.linkButtonText}>Shared Documents</Text>
        </TouchableOpacity>
      </View>

      {/* Plans Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Committee Plans</Text>
        <View style={styles.planCard}>
          <FileText size={20} color="#111827" />
          <View style={styles.planContent}>
            <Text style={styles.planTitle}>Q1 2026 Initiatives</Text>
            <Text style={styles.planDesc}>Committee onboarding and strategy development</Text>
          </View>
        </View>
        <View style={styles.planCard}>
          <FileText size={20} color="#111827" />
          <View style={styles.planContent}>
            <Text style={styles.planTitle}>Q2-Q3 2026 Execution</Text>
            <Text style={styles.planDesc}>Implementation of major events and activities</Text>
          </View>
        </View>
      </View>

      {/* Suggestions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggestions & Ideas</Text>
        {suggestions.map((suggestion) => (
          <TouchableOpacity 
            key={suggestion.id} 
            style={styles.suggestionCard}
            onPress={() => handleVoteSuggestion(suggestion.id)}
          >
            <View style={styles.suggestionLeft}>
              <Lightbulb size={20} color="#111827" />
              <Text style={styles.suggestionText}>{suggestion.title}</Text>
            </View>
            <View style={styles.suggestionVotes}>
              <Text style={styles.votesText}>{suggestion.votes}</Text>
              <Heart size={14} color="#EF4444" fill="#EF4444" />
            </View>
          </TouchableOpacity>
        ))}
        <View style={styles.addSuggestionContainer}>
          <TextInput
            style={styles.suggestionInput}
            placeholder="Add your suggestion..."
            placeholderTextColor="#9CA3AF"
            value={newSuggestion}
            onChangeText={setNewSuggestion}
          />
          <TouchableOpacity style={styles.suggestButton} onPress={handleAddSuggestion}>
            <Lightbulb size={18} color="#FFFFFF" />
            <Text style={styles.suggestButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Section */}
      <View style={styles.chatSection}>
        <Text style={styles.sectionTitle}>Committee Chat</Text>
        <FlatList
          ref={chatListRef}
          data={chats}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          style={styles.chatListContainer}
          contentContainerStyle={styles.chatListContent}
          renderItem={({ item }) => (
            <View style={[styles.chatMessageWrapper, item.isOwn && styles.ownMessageWrapper]}>
              {!item.isOwn && <Text style={styles.chatSenderName}>{item.author}</Text>}
              <View style={[styles.chatBubble, item.isOwn && styles.ownBubble]}>
                <Text style={[styles.chatText, item.isOwn && styles.ownText]}>{item.message}</Text>
                <View style={styles.chatFooter}>
                  <Text style={[styles.chatTime, item.isOwn && styles.ownChatTime]}>{item.time}</Text>
                  {item.isOwn && (
                    <View style={styles.readReceipt}>
                      {item.read ? (
                        <CheckCheck size={12} color="#FFFFFF" />
                      ) : (
                        <Check size={12} color="#FFFFFF" />
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={chatMessage}
            onChangeText={setChatMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.joinButton, isJoined && styles.joinedButton]}
          onPress={handleJoinCommittee}
        >
          <Users size={20} color="#FFFFFF" />
          <Text style={styles.joinButtonText}>{isJoined ? 'Leave Committee' : 'Join Committee'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#111827' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 18, color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  heroCard: { margin: 16, borderRadius: 16, padding: 20, marginBottom: 24 },
  committeeName: { fontSize: 24, color: '#111827', fontFamily: 'Inter-SemiBold', marginBottom: 8 },
  committeeDesc: { fontSize: 14, color: '#4B5563', marginBottom: 12 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(17,24,39,0.1)', borderRadius: 8, padding: 8, alignSelf: 'flex-start' },
  memberText: { fontSize: 12, color: '#111827', fontFamily: 'Inter-SemiBold' },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, color: '#111827', fontFamily: 'Inter-SemiBold', marginBottom: 12 },
  goalItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  goalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#111827' },
  goalText: { flex: 1, fontSize: 14, color: '#4B5563' },
  visionBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16 },
  visionText: { flex: 1, fontSize: 14, color: '#111827', fontFamily: 'Inter-SemiBold' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoPlaceholder: { width: (width - 32 - 12) / 2, height: 120, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoText: { fontSize: 12, color: '#9CA3AF' },
  linkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 14, marginBottom: 10, gap: 10 },
  linkButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 14, flex: 1 },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12 },
  planContent: { flex: 1 },
  planTitle: { fontSize: 14, color: '#111827', fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  planDesc: { fontSize: 12, color: '#6B7280' },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 10 },
  suggestionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  suggestionText: { fontSize: 14, color: '#111827', flex: 1 },
  suggestionVotes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  votesText: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter-SemiBold' },
  addSuggestionContainer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  suggestionInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  suggestButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, padding: 10, gap: 6, justifyContent: 'center' },
  suggestButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 12 },
  // Chat Styles - WhatsApp/Telegram style
  chatSection: { paddingHorizontal: 16, marginBottom: 12 },
  chatListContainer: { height: 350, backgroundColor: '#F8FAFC', borderRadius: 12, marginVertical: 12 },
  chatListContent: { paddingHorizontal: 12, paddingVertical: 12 },
  chatMessageWrapper: { flexDirection: 'row', marginVertical: 6, justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 },
  ownMessageWrapper: { justifyContent: 'flex-end' },
  chatSenderName: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter-SemiBold', marginBottom: 4, marginLeft: 8 },
  chatBubble: { backgroundColor: '#E5E7EB', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '75%' },
  ownBubble: { backgroundColor: '#111827', borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  chatText: { fontSize: 14, color: '#111827', lineHeight: 18 },
  ownText: { color: '#FFFFFF' },
  chatFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  chatTime: { fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter-Regular' },
  ownChatTime: { color: 'rgba(255,255,255,0.7)' },
  readReceipt: { marginLeft: 2 },
  inputContainer: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 12 },
  chatInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827', maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  actionButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  joinButton: { flex: 1, flexDirection: 'row', backgroundColor: '#111827', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  joinedButton: { backgroundColor: '#059669' },
  joinButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 14 },
  shareButton: { flex: 1, flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  shareButtonText: { color: '#111827', fontFamily: 'Inter-SemiBold', fontSize: 14 },
});
