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
  Avatar,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { supabase, type Profile } from '../lib/supabaseAdmin';

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
      toast({
        title: 'Error fetching users',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Heading mb={6}>User Management</Heading>
      
      <HStack mb={6} justify="space-between">
        <Button colorScheme="blue">Add New User</Button>
        <Button onClick={fetchUsers} isLoading={loading}>
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
                <Th>User</Th>
                <Th>Username</Th>
                <Th>Full Name</Th>
                <Th>Created At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.length === 0 ? (
                <Tr>
                  <Td colSpan={5} textAlign="center">
                    No users found
                  </Td>
                </Tr>
              ) : (
                users.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <HStack>
                        <Avatar
                          size="sm"
                          name={user.full_name}
                          src={user.avatar_url || undefined}
                        />
                      </HStack>
                    </Td>
                    <Td>{user.username}</Td>
                    <Td>{user.full_name}</Td>
                    <Td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : 'N/A'}
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton as={Button} size="sm">
                          Actions
                        </MenuButton>
                        <MenuList>
                          <MenuItem>View Profile</MenuItem>
                          <MenuItem>Edit User</MenuItem>
                          <MenuItem color="red.500">Delete User</MenuItem>
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