// Updated imports for chat functionality
import { 
  fetchUserChats, 
  getOrCreateDirectChat, 
  searchUsers as searchUsersHelper 
} from '@/lib/chats';

// Replace your fetchChats function with this:
const fetchChats = async () => {
  if (!user) return;
  setLoading(true);
  const userChats = await fetchUserChats(user.id);
  setChats(userChats);
  setLoading(false);
};

// Replace your searchUsers function with this:
const searchUsers = async (query: string) => {
  if (!query.trim() || !user) return;
  setSearchLoading(true);
  const results = await searchUsersHelper(query, user.id);
  setSearchResults(results);
  setSearchLoading(false);
};

// Replace your createDirectChat function with this:
const createDirectChat = async (otherUserId: string) => {
  if (!user) return;
  
  const chatId = await getOrCreateDirectChat(user.id, otherUserId);
  
  if (chatId) {
    router.push(`/chat/${chatId}`);
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    fetchChats();
  } else {
    Alert.alert('Error', 'Failed to create chat');
  }
};

// Add this effect to refresh chats when screen is focused:
useEffect(() => {
  const unsubscribe = router.subscribe(() => {
    if (user) {
      fetchChats();
    }
  });
  return unsubscribe;
}, [user]);
