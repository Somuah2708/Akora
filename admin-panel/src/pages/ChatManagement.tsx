import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  HStack,
  useToast,
  Spinner,
  Text,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  Avatar,
} from '@chakra-ui/react';
import { supabase, type Chat, type ChatWithDetails } from '../lib/supabaseAdmin';

export default function ChatManagement() {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchChats();
  }, []);

  async function fetchChats() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch chats with their participants
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants(
            user_id,
            joined_at,
            profiles(
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (chatError) throw chatError;
      
      // For each chat, fetch the last message
      const chatsWithLastMessage = await Promise.all(
        (chatData || []).map(async (chat) => {
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              sender_id,
              profiles(
                username,
                full_name
              )
            `)
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (messageError) {
            console.error('Error fetching last message:', messageError);
            return {
              ...chat,
              participants: chat.chat_participants || [],
              messages: [],
              last_message: null,
            };
          }
          
          return {
            ...chat,
            participants: chat.chat_participants || [],
            messages: messageData || [],
            last_message: messageData?.[0] || null,
          };
        })
      );
      
      setChats(chatsWithLastMessage);
    } catch (err: any) {
      console.error('Error fetching chats:', err);
      setError(err.message || 'Failed to fetch chats');
      toast({
        title: 'Error fetching chats',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  return (
    <Box>
      <Heading mb={6}>Chat Management</Heading>
      
      <HStack mb={6} justify="space-between">
        <Button colorScheme="blue">Create New Chat</Button>
        <Button onClick={fetchChats} isLoading={loading}>
          Refresh
        </Button>
      </HStack>
      
      {loading && <Spinner size="xl" />}
      
      {error && (
        <Text color="red.500" mb={4}>
          Error: {error}
        </Text>
      )}
      
      {!loading && !error && (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Chat ID</Th>
                <Th>Type</Th>
                <Th>Participants</Th>
                <Th>Last Message</Th>
                <Th>Created At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {chats.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center">
                    No chats found
                  </Td>
                </Tr>
              ) : (
                chats.map((chat) => (
                  <Tr key={chat.id}>
                    <Td>{chat.id.substring(0, 8)}...</Td>
                    <Td>
                      <Badge colorScheme={chat.type === 'direct' ? 'green' : 'purple'}>
                        {chat.type}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex>
                        {chat.participants.slice(0, 3).map((participant) => (
                          <Avatar
                            key={participant.user_id}
                            size="xs"
                            name={participant.profiles?.full_name || participant.profiles?.username}
                            src={participant.profiles?.avatar_url || undefined}
                            ml={-2}
                            first={0}
                            border="2px solid white"
                          />
                        ))}
                        {chat.participants.length > 3 && (
                          <Box
                            ml={-2}
                            bg="gray.400"
                            color="white"
                            borderRadius="full"
                            size="xs"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            w="24px"
                            h="24px"
                            fontSize="xs"
                            border="2px solid white"
                          >
                            +{chat.participants.length - 3}
                          </Box>
                        )}
                      </Flex>
                    </Td>
                    <Td>
                      {chat.last_message ? (
                        <Text noOfLines={1}>
                          <Text as="span" fontWeight="bold">
                            {chat.last_message.profiles?.username}:
                          </Text>{' '}
                          {chat.last_message.content}
                        </Text>
                      ) : (
                        <Text color="gray.500">No messages</Text>
                      )}
                    </Td>
                    <Td>{chat.created_at ? formatDate(chat.created_at) : 'N/A'}</Td>
                    <Td>
                      <Menu>
                        <MenuButton as={Button} size="sm">
                          Actions
                        </MenuButton>
                        <MenuList>
                          <MenuItem>View Messages</MenuItem>
                          <MenuItem>Edit Participants</MenuItem>
                          <MenuItem color="red.500">Delete Chat</MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}