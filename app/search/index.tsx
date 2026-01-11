import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { useRefresh } from '@/hooks/useRefresh';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Search, UserPlus, UserCheck, Clock, X, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  searchUsers,
  sendFriendRequest,
  checkFriendshipStatus,
} from '@/lib/friends';
import { getDisplayName, type Profile } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

interface UserWithFriendshipStatus extends Profile {
  friendshipStatus: 'friends' | 'request_sent' | 'request_received' | 'none';
}

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserWithFriendshipStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const { isRefreshing, handleRefresh } = useRefresh({
    onRefresh: async () => {
      if (searchQuery.trim()) {
        await handleSearch();
      }
    },
  });

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    try {
      const results = await searchUsers(searchQuery);

      // Filter out current user and get friendship status for each user
      const filteredResults = results.filter(profile => profile.id !== user.id);
      
      const usersWithStatus = await Promise.all(
        filteredResults.map(async (profile) => {
          const status = await checkFriendshipStatus(user.id, profile.id);
          return {
            ...profile,
            friendshipStatus: status as 'friends' | 'request_sent' | 'request_received' | 'none',
          };
        })
      );

      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 1) {
        handleSearch();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, handleSearch]);

  const handleAddFriend = async (targetUser: UserWithFriendshipStatus) => {
    if (!user) return;

    setSendingRequest(targetUser.id);
    try {
      await sendFriendRequest(targetUser.id, user.id);
      Alert.alert('Success', `Friend request sent to ${getDisplayName(targetUser)}`);

      // Update the user's friendship status in the list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, friendshipStatus: 'request_sent' }
            : u
        )
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleMessage = async (targetUser: UserWithFriendshipStatus) => {
    if (!user) return;

    try {
      // Navigate directly to the direct message screen
      debouncedRouter.push(`/chat/direct/${targetUser.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat');
    }
  };

  const handleViewProfile = (targetUser: UserWithFriendshipStatus) => {
    debouncedRouter.push(`/user-profile/${targetUser.id}`);
  };

  const renderConnectionButton = (targetUser: UserWithFriendshipStatus) => {
    const isLoading = sendingRequest === targetUser.id;

    if (isLoading) {
      return (
        <View style={styles.connectButton}>
          <ActivityIndicator size="small" color="#4169E1" />
        </View>
      );
    }

    if (targetUser.friendshipStatus === 'friends') {
      return (
        <TouchableOpacity
          style={[styles.connectButton, styles.connectedButton]}
          onPress={() => handleMessage(targetUser)}
        >
          <UserCheck size={18} color="#10B981" />
          <Text style={styles.connectedText}>Message</Text>
        </TouchableOpacity>
      );
    }

    if (targetUser.friendshipStatus === 'request_sent') {
      return (
        <View style={[styles.connectButton, styles.pendingButton]}>
          <Clock size={18} color="#F59E0B" />
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      );
    }

    if (targetUser.friendshipStatus === 'request_received') {
      return (
        <View style={[styles.connectButton, styles.pendingButton]}>
          <Clock size={18} color="#F59E0B" />
          <Text style={styles.pendingText}>Respond</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => handleAddFriend(targetUser)}
      >
        <UserPlus size={18} color="#4169E1" />
        <Text style={styles.connectText}>Add Friend</Text>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }: { item: UserWithFriendshipStatus }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleViewProfile(item)}
    >
      {item.avatar_url ? (
        <Image
          source={{ uri: item.avatar_url }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{getDisplayName(item)}</Text>
        {item.bio && <Text style={styles.userBio} numberOfLines={2}>{item.bio}</Text>}
      </View>
      {renderConnectionButton(item)}
    </TouchableOpacity>
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find People</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4169E1" />
        </View>
      ) : users.length === 0 && searchQuery.length >= 2 ? (
        <View style={styles.centered}>
          <Search size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptyText}>Try searching with a different name</Text>
        </View>
      ) : searchQuery.length < 1 ? (
        <View style={styles.centered}>
          <Search size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Start Searching</Text>
          <Text style={styles.emptyText}>Start typing to find friends</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#4169E1"
              colors={['#4169E1']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    lineHeight: 18,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4169E1',
    backgroundColor: '#FFFFFF',
  },
  connectText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  connectedButton: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  connectedText: {
    color: '#10B981',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  pendingButton: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  pendingText: {
    color: '#F59E0B',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});
