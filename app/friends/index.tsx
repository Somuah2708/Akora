import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Search, UserPlus, Check, X, MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  searchUsers,
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  checkFriendshipStatus,
  type Friend,
  type FriendRequest,
} from '@/lib/friends';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      if (activeTab === 'friends') {
        const friendsList = await getFriends(user.id);
        setFriends(friendsList);
      } else if (activeTab === 'requests') {
        const [received, sent] = await Promise.all([
          getPendingFriendRequests(user.id),
          getSentFriendRequests(user.id),
        ]);
        setReceivedRequests(received);
        setSentRequests(sent);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await searchUsers(query);
      
      // Filter out current user and get friendship status for each result
      const filteredResults = await Promise.all(
        results
          .filter((result) => result.id !== user.id)
          .map(async (result) => {
            const status = await checkFriendshipStatus(user.id, result.id);
            return { ...result, friendshipStatus: status };
          })
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!user) return;

    try {
      await sendFriendRequest(receiverId, user.id);
      Alert.alert('Success', 'Friend request sent!');
      handleSearch(searchQuery); // Refresh search results
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted!');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      Alert.alert('Success', 'Friend request rejected');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject request');
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.listItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/chat/direct/${item.friend_id}`)}
      >
        {item.friend?.avatar_url ? (
          <Image source={{ uri: item.friend.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.friend?.full_name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.friend?.full_name}</Text>
          <Text style={styles.userHandle}>@{item.friend?.username}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => router.push(`/chat/direct/${item.friend_id}`)}
      >
        <MessageCircle size={20} color="#4169E1" />
      </TouchableOpacity>
    </View>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.listItem}>
      <View style={styles.userInfo}>
        {item.sender?.avatar_url ? (
          <Image source={{ uri: item.sender.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.sender?.full_name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.sender?.full_name}</Text>
          <Text style={styles.userHandle}>@{item.sender?.username}</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <Check size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleRejectRequest(item.id)}
        >
          <X size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => {
    const getButtonContent = () => {
      switch (item.friendshipStatus) {
        case 'friends':
          return { text: 'Friends', color: '#10B981', disabled: true };
        case 'request_sent':
          return { text: 'Pending', color: '#94A3B8', disabled: true };
        case 'request_received':
          return { text: 'Accept', color: '#4169E1', disabled: false };
        default:
          return { text: 'Add Friend', color: '#4169E1', disabled: false };
      }
    };

    const buttonContent = getButtonContent();

    return (
      <View style={styles.listItem}>
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {item.full_name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.full_name}</Text>
            <Text style={styles.userHandle}>@{item.username}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: buttonContent.color },
            buttonContent.disabled && styles.disabledButton,
          ]}
          onPress={() => !buttonContent.disabled && handleSendRequest(item.id)}
          disabled={buttonContent.disabled}
        >
          <Text style={styles.addButtonText}>{buttonContent.text}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends {friends.length > 0 && `(${friends.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
            {receivedRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{receivedRequests.length}</Text>
              </View>
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - Show on search tab */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchLoading && <ActivityIndicator size="small" color="#4169E1" />}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
        </View>
      ) : (
        <>
          {activeTab === 'friends' && (
            <FlatList
              data={friends}
              renderItem={renderFriend}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <UserPlus size={64} color="#E5E7EB" />
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptyText}>
                    Search for people to connect with!
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === 'requests' && (
            <>
              {receivedRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Received Requests</Text>
                  <FlatList
                    data={receivedRequests}
                    renderItem={renderRequest}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                  />
                </>
              )}
              
              {sentRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Sent Requests</Text>
                  <FlatList
                    data={sentRequests}
                    renderItem={({ item }) => (
                      <View style={styles.listItem}>
                        <View style={styles.userInfo}>
                          {item.receiver?.avatar_url ? (
                            <Image source={{ uri: item.receiver.avatar_url }} style={styles.avatar} />
                          ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                              <Text style={styles.avatarText}>
                                {item.receiver?.full_name?.[0]?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}
                          <View style={styles.userDetails}>
                            <Text style={styles.userName}>{item.receiver?.full_name}</Text>
                            <Text style={styles.userHandle}>@{item.receiver?.username}</Text>
                          </View>
                        </View>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>Pending</Text>
                        </View>
                      </View>
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                  />
                </>
              )}

              {receivedRequests.length === 0 && sentRequests.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptyText}>You're all caught up!</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'search' && (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                searchQuery ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchLoading ? 'Searching...' : 'No users found'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Search size={64} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>Search for friends</Text>
                    <Text style={styles.emptyText}>
                      Enter a name or username to find people
                    </Text>
                  </View>
                )
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#4169E1',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  pendingText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
