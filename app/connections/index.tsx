import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, UserCheck, UserPlus, X, Check } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchPendingRequests,
  fetchSentRequests,
  fetchConnections,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  type Connection,
} from '@/lib/connections';
import { getDisplayName, type Profile } from '@/lib/supabase';
import { formatProfileSubtitle } from '@/lib/display';

SplashScreen.preventAutoHideAsync();

type TabType = 'received' | 'sent' | 'connections';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedRequests, setReceivedRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [received, sent, connected] = await Promise.all([
        fetchPendingRequests(user.id),
        fetchSentRequests(user.id),
        fetchConnections(user.id),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
      setConnections(connected);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (connection: Connection) => {
    setActioningId(connection.id);
    try {
      await acceptConnectionRequest(connection.id);
      Alert.alert('Success', 'Connection request accepted!');
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (connection: Connection) => {
    setActioningId(connection.id);
    try {
      await rejectConnectionRequest(connection.id);
      setReceivedRequests((prev) => prev.filter((c) => c.id !== connection.id));
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (connection: Connection) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this connection request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setActioningId(connection.id);
            try {
              await cancelConnectionRequest(connection.id);
              setSentRequests((prev) => prev.filter((c) => c.id !== connection.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  const renderReceivedRequest = (connection: Connection) => {
    const requester = connection.requester;
    if (!requester) return null;

    const isActioning = actioningId === connection.id;

    return (
      <View key={connection.id} style={styles.requestCard}>
        <Image
          source={{ uri: requester.avatar_url || 'https://i.pravatar.cc/150' }}
          style={styles.avatar}
        />
        <View style={styles.requestInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.requestName}>{getDisplayName(requester)}</Text>
            {(requester as any)?.is_admin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          {!!formatProfileSubtitle(requester) && (
            <Text style={styles.requestUsername}>{formatProfileSubtitle(requester)}</Text>
          )}
          <Text style={styles.requestTime}>
            {new Date(connection.created_at).toLocaleDateString()}
          </Text>
        </View>
        {isActioning ? (
          <ActivityIndicator size="small" color="#4169E1" />
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(connection)}
            >
              <Check size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(connection)}
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSentRequest = (connection: Connection) => {
    const addressee = connection.addressee;
    if (!addressee) return null;

    const isActioning = actioningId === connection.id;

    return (
      <View key={connection.id} style={styles.requestCard}>
        <Image
          source={{ uri: addressee.avatar_url || 'https://i.pravatar.cc/150' }}
          style={styles.avatar}
        />
        <View style={styles.requestInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.requestName}>{getDisplayName(addressee)}</Text>
            {(addressee as any)?.is_admin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          {!!formatProfileSubtitle(addressee) && (
            <Text style={styles.requestUsername}>{formatProfileSubtitle(addressee)}</Text>
          )}
          <Text style={styles.requestTime}>
            Sent {new Date(connection.created_at).toLocaleDateString()}
          </Text>
        </View>
        {isActioning ? (
          <ActivityIndicator size="small" color="#4169E1" />
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancel(connection)}
          >
            <X size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderConnection = (profile: Profile) => (
    <TouchableOpacity
      key={profile.id}
      style={styles.requestCard}
      onPress={() => debouncedRouter.push(`/user-profile/${profile.id}`)}
    >
      <Image
        source={{ uri: profile.avatar_url || 'https://i.pravatar.cc/150' }}
        style={styles.avatar}
      />
      <View style={styles.requestInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.requestName}>{getDisplayName(profile)}</Text>
          {(profile as any)?.is_admin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        {!!formatProfileSubtitle(profile) && (
          <Text style={styles.requestUsername}>{formatProfileSubtitle(profile)}</Text>
        )}
      </View>
      <UserCheck size={20} color="#10B981" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connections</Text>
        <TouchableOpacity onPress={() => debouncedRouter.push('/search')}>
          <UserPlus size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Received {receivedRequests.length > 0 && `(${receivedRequests.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            Sent {sentRequests.length > 0 && `(${sentRequests.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'connections' && styles.tabActive]}
          onPress={() => setActiveTab('connections')}
        >
          <Text style={[styles.tabText, activeTab === 'connections' && styles.tabTextActive]}>
            Connected {connections.length > 0 && `(${connections.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4169E1" />
          </View>
        ) : (
          <>
            {activeTab === 'received' && (
              <>
                {receivedRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <UserPlus size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No requests</Text>
                    <Text style={styles.emptyText}>
                      You don't have any pending connection requests
                    </Text>
                  </View>
                ) : (
                  receivedRequests.map(renderReceivedRequest)
                )}
              </>
            )}

            {activeTab === 'sent' && (
              <>
                {sentRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <UserPlus size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No sent requests</Text>
                    <Text style={styles.emptyText}>
                      You haven't sent any connection requests
                    </Text>
                  </View>
                ) : (
                  sentRequests.map(renderSentRequest)
                )}
              </>
            )}

            {activeTab === 'connections' && (
              <>
                {connections.length === 0 ? (
                  <View style={styles.emptyState}>
                    <UserCheck size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No connections yet</Text>
                    <Text style={styles.emptyText}>
                      Start connecting with people to build your network
                    </Text>
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={() => debouncedRouter.push('/search')}
                    >
                      <UserPlus size={20} color="#FFFFFF" />
                      <Text style={styles.searchButtonText}>Find People</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  connections.map(renderConnection)
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4169E1',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4169E1',
    borderRadius: 12,
  },
  searchButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  requestCard: {
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
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  requestUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EEF6FF',
    borderWidth: 1,
    borderColor: '#CDE3FF',
  },
  adminBadgeText: {
    color: '#0A84FF',
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
});
