import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail, GraduationCap, Calendar, MapPin, MessageCircle, UserPlus, UserCheck, UserMinus, Users, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { checkFriendshipStatus, sendFriendRequest, unfriend, getMutualFriendsCount } from '@/lib/friends';
import type { Profile } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

SplashScreen.preventAutoHideAsync();

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'request_sent' | 'request_received' | 'none' | null>(null);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

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
    if (id && user) {
      fetchUserProfile();
      checkFriendship();
      fetchMutualFriends();
    }
  }, [id, user]);

  // Subscribe to real-time profile updates
  useEffect(() => {
    if (!id) return;

    const subscription = supabase
      .channel(`profile_${id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setUserProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  // Subscribe to friendship changes
  useEffect(() => {
    if (!id || !user) return;

    const subscription = supabase
      .channel('friendship_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
        },
        () => {
          checkFriendship();
          fetchMutualFriends();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          checkFriendship();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, user]);

  const fetchUserProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async () => {
    if (!user || !id || user.id === id) return;

    try {
      const status = await checkFriendshipStatus(user.id, id);
      setFriendshipStatus(status);
    } catch (error) {
      console.error('Error checking friendship status:', error);
    }
  };

  const fetchMutualFriends = async () => {
    if (!user || !id || user.id === id) return;

    try {
      const count = await getMutualFriendsCount(user.id, id);
      setMutualFriendsCount(count);
    } catch (error) {
      console.error('Error fetching mutual friends:', error);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !id) return;

    try {
      setActionLoading(true);
      await sendFriendRequest(id, user.id);
      Alert.alert('Success', 'Friend request sent!');
      checkFriendship();
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user || !id) return;

    Alert.alert(
      'Unfriend',
      `Are you sure you want to remove ${userProfile?.full_name || userProfile?.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await unfriend(id);
              Alert.alert('Success', 'Friend removed');
              checkFriendship();
            } catch (error) {
              console.error('Error unfriending:', error);
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMessage = () => {
    if (!id) return;
    router.push(`/chat/direct/${id}`);
  };

  const renderActionButton = () => {
    if (!user || user.id === id) return null;

    if (actionLoading) {
      return (
        <View style={styles.actionButton}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      );
    }

    switch (friendshipStatus) {
      case 'friends':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={handleMessage}
            >
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.unfriendButton]}
              onPress={handleUnfriend}
            >
              <UserMinus size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        );

      case 'request_sent':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.disabledButton]} disabled>
            <UserCheck size={20} color="#666666" />
            <Text style={[styles.actionButtonText, styles.disabledButtonText]}>Request Sent</Text>
          </TouchableOpacity>
        );

      case 'request_received':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => router.push('/friends')}
          >
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Request</Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.addFriendButton]}
            onPress={handleAddFriend}
          >
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={() => setShowFullImage(true)}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri: userProfile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <Text style={styles.fullName}>
              {userProfile.full_name || userProfile.username || 'Unknown User'}
            </Text>
            {userProfile.username && (
              <Text style={styles.username}>@{userProfile.username}</Text>
            )}
            {userProfile.bio && (
              <Text style={styles.bio}>{userProfile.bio}</Text>
            )}
            
            {/* Mutual Friends */}
            {user && user.id !== id && mutualFriendsCount > 0 && (
              <View style={styles.mutualFriendsContainer}>
                <Users size={16} color="#666666" />
                <Text style={styles.mutualFriendsText}>
                  {mutualFriendsCount} mutual friend{mutualFriendsCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          {renderActionButton()}
        </View>

        {/* About Section */}
        <View style={styles.aboutSection}>
          <Text style={styles.sectionTitle}>About</Text>

          {userProfile.email && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Mail size={20} color="#4169E1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userProfile.email}</Text>
              </View>
            </View>
          )}

          {userProfile.year_group && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Calendar size={20} color="#4169E1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Year Group</Text>
                <Text style={styles.infoValue}>{userProfile.year_group}</Text>
              </View>
            </View>
          )}

          {userProfile.class && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <GraduationCap size={20} color="#4169E1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Class</Text>
                <Text style={styles.infoValue}>{userProfile.class}</Text>
              </View>
            </View>
          )}

          {userProfile.house && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <GraduationCap size={20} color="#4169E1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>House</Text>
                <Text style={styles.infoValue}>{userProfile.house}</Text>
              </View>
            </View>
          )}

          {userProfile.location && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MapPin size={20} color="#4169E1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{userProfile.location}</Text>
              </View>
            </View>
          )}

          {userProfile.phone && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Mail size={20} color="#4169E1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{userProfile.phone}</Text>
              </View>
            </View>
          )}

          {/* Show empty state if no info available */}
          {!userProfile.email && 
           !userProfile.year_group && 
           !userProfile.class && 
           !userProfile.house && 
           !userProfile.location && 
           !userProfile.phone && (
            <Text style={styles.emptyText}>No additional information available</Text>
          )}
        </View>
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <Pressable 
          style={styles.fullImageModal}
          onPress={() => setShowFullImage(false)}
        >
          <View style={styles.fullImageHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFullImage(false)}
            >
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.fullImageContainer}>
            <Image
              source={{
                uri: userProfile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=60',
              }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.fullImageFooter}>
            <Text style={styles.fullImageName}>
              {userProfile.full_name || userProfile.username || 'Unknown User'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E0E0E0',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  fullName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 26,
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  username: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  bio: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  mutualFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    width: '100%',
  },
  mutualFriendsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addFriendButton: {
    backgroundColor: '#4169E1',
  },
  messageButton: {
    backgroundColor: '#4169E1',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  unfriendButton: {
    backgroundColor: '#F0F0F0',
    flex: 0,
    paddingHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: '#F0F0F0',
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#666666',
  },
  aboutSection: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#000000',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#666666',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#000000',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  fullImageHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: 0,
  },
  fullImageFooter: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  fullImageName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
