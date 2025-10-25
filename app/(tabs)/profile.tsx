import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch, Modal, Linking, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter'; 
import { SplashScreen } from 'expo-router';
import { Settings, MessageCircle, MapPin, Phone, Mail, Activity, Heart, Award, BookOpen, Calendar, ChevronRight, Bell, Moon, Lock, CircleHelp as HelpCircle, LogOut, Shield, Languages, MessageSquare, Bookmark, CreditCard as Edit } from 'lucide-react-native';
import { supabase, type Profile as ProfileType, type Post } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// Default contact info as fallback
const DEFAULT_CONTACT_INFO = {
  phone: '+1 (555) 123-4567',
  email: 'john.smith@school.edu',
  location: 'Beijing, China',
};

const ACHIEVEMENTS = [
  {
    id: '1',
    title: 'Academic Excellence',
    date: 'Class of 2024',
    icon: Award,
  },
  {
    id: '2',
    title: 'Science Fair Winner',
    date: '2023',
    icon: BookOpen,
  },
  {
    id: '3',
    title: 'Student Council',
    date: '2022-2024',
    icon: Heart,
  },
];

// Default posts as fallback
const DEFAULT_POSTS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
    likes: 342,
    comments: 24,
    caption: 'Great reunion with my high school buddies! Missing those good old days 🎓 #ClassReunion #Memories',
    timeAgo: '2 hours ago'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60',
    likes: 567,
    comments: 45,
    caption: 'Just gave a guest lecture at our alma mater! Incredible to be back and inspire the next generation 📚',
    timeAgo: '5 hours ago'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?w=800&auto=format&fit=crop&q=60',
    likes: 892,
    comments: 76,
    caption: 'Won the Young Alumni Achievement Award! Thank you to all my teachers and classmates who supported me 🏆',
    timeAgo: '1 day ago'
  }
];

const windowWidth = Dimensions.get('window').width;
const postWidth = (windowWidth - 48) / 3;

export default function ProfileScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);
  
  const { user, signOut } = useAuth();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserPosts();
    } else {
      setAuthLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      
      setProfile(data);
      
      // Update contact info if available
      if (data) {
        setContactInfo({
          phone: data.phone || DEFAULT_CONTACT_INFO.phone,
          email: user?.email || DEFAULT_CONTACT_INFO.email,
          location: data.location || DEFAULT_CONTACT_INFO.location,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
      setAuthLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      
      if (!user?.id) {
        console.log('No user ID available for fetching posts');
        setUserPosts([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUserPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Fallback to empty array on network errors
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const handleContact = (type: string) => {
    switch (type) {
      case 'phone':
        Linking.openURL(`tel:${contactInfo.phone}`);
        break;
      case 'email':
        Linking.openURL(`mailto:${contactInfo.email}`);
        break;
      default:
        break;
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      setSettingsVisible(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };
  
  if (authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={[styles.container, styles.authPrompt]}>
        <Text style={styles.authPromptTitle}>Sign in to view your profile</Text>
        <Text style={styles.authPromptText}>
          You need to be signed in to view and manage your profile
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setSettingsVisible(true)}
        >
          <Settings size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {profileLoading ? (
              <View style={styles.profileImagePlaceholder} />
            ) : (
              <Image
                source={{ 
                  uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60' 
                }}
                style={styles.profileImage}
              />
            )}
            <TouchableOpacity style={styles.messageButton}>
              <MessageCircle size={20} color="#FFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.name}>{profile?.full_name || 'Loading...'}</Text>
            <Text style={styles.username}>@{profile?.username || user.email?.split('@')[0]}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{postsLoading ? '...' : userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Awards</Text>
            </View>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'about' && styles.activeTab]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
              onPress={() => setActiveTab('activity')}
            >
              <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Activity</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'about' && (
            <View style={styles.aboutSection}>
              <View style={styles.contactInfo}>
                <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('location')}>
                  <MapPin size={20} color="#666" />
                  <Text style={styles.contactText}>{contactInfo.location}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('phone')}>
                  <Phone size={20} color="#666" />
                  <Text style={styles.contactText}>{contactInfo.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactItem} onPress={() => handleContact('email')}>
                  <Mail size={20} color="#666" />
                  <Text style={styles.contactText}>{contactInfo.email}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.achievementsSection}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                {ACHIEVEMENTS.map((achievement) => (
                  <View key={achievement.id} style={styles.achievementItem}>
                    <achievement.icon size={24} color="#000" />
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      <Text style={styles.achievementDate}>{achievement.date}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.postsSection}>
                <Text style={styles.sectionTitle}>
                  Posts {postsLoading && <Text style={styles.loadingText}>(Loading...)</Text>}
                </Text>
                {postsLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading posts...</Text>
                  </View>
                ) : userPosts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No posts yet</Text>
                  </View>
                ) : (
                  userPosts.map((post) => (
                    <View key={post.id} style={styles.postCard}>
                      {post.image_url && (
                        <Image source={{ uri: post.image_url }} style={styles.postImage} />
                      )}
                      <View style={styles.postActions}>
                        <View style={styles.leftActions}>
                          <TouchableOpacity style={styles.actionButton}>
                            <Heart size={24} color="#666" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionButton}>
                            <MessageSquare size={24} color="#666" />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity>
                          <Bookmark size={24} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.postInfo}>
                        <Text style={styles.likesCount}>{Math.floor(Math.random() * 1000) + 100} likes</Text>
                        <Text style={styles.caption} numberOfLines={2}>{post.content}</Text>
                        <TouchableOpacity>
                          <Text style={styles.commentsText}>View all {Math.floor(Math.random() * 50) + 5} comments</Text>
                        </TouchableOpacity>
                        <Text style={styles.timeAgo}>{getTimeAgo(post.created_at)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {activeTab === 'activity' && (
            <View style={styles.activitySection}>
              {postsLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading activity...</Text>
                </View>
              ) : userPosts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No activity yet</Text>
                </View>
              ) : (
                userPosts.map((post) => (
                  <View key={post.id} style={styles.activityItem}>
                    <Activity size={24} color="#000" />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>Posted: {post.content.substring(0, 30)}...</Text>
                      <Text style={styles.activityDate}>{getTimeAgo(post.created_at)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Bell size={24} color="#000" />
                  <Text style={styles.settingText}>Notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#767577', true: '#000' }}
                  thumbColor={notifications ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Moon size={24} color="#000" />
                  <Text style={styles.settingText}>Dark Mode</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#767577', true: '#000' }}
                  thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Lock size={24} color="#000" />
                  <Text style={styles.settingText}>Privacy</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Shield size={24} color="#000" />
                  <Text style={styles.settingText}>Security</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Languages size={24} color="#000" />
                  <Text style={styles.settingText}>Language</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <HelpCircle size={24} color="#000" />
                  <Text style={styles.settingText}>Help & Support</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingItem, styles.logoutButton]}>
                <View style={styles.settingLeft}>
                  <LogOut size={24} color="#FF3B30" />
                  <Text 
                    style={[styles.settingText, styles.logoutText]}
                    onPress={handleSignOut}
                  >
                    Log Out
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  authPrompt: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authPromptTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 10,
  },
  authPromptText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  settingsButton: {
    padding: 8,
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  messageButtonText: {
    color: '#FFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  nameSection: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontFamily: 'Inter-SemiBold',
  },
  aboutSection: {
    gap: 24,
  },
  contactInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  achievementsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  activitySection: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 32,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000',
  },
  logoutButton: {
    marginTop: 16,
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF3B30',
  },
  postsSection: {
    gap: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    marginRight: 8,
  },
  postInfo: {
    padding: 12,
  },
  likesCount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000',
    marginBottom: 8,
  },
  commentsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
});