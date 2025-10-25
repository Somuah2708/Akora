import { Box, VStack, Text, Flex, Icon, Divider, Button } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Import icons (you can use any icon library you prefer)
// For this example, we'll use simple string representations
const icons = {
  dashboard: '📊',
  users: '👥',
  chats: '💬',
  quickActions: '⚡',
  education: '🎓',
  news: '📰',
  content: '📄',
  settings: '⚙️',
  logout: '🚪',
};

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: icons.dashboard },
    { name: 'Users', path: '/users', icon: icons.users },
    { name: 'Chats', path: '/chats', icon: icons.chats },
    { name: 'Quick Actions', path: '/quick-actions', icon: icons.quickActions },
    { name: 'Educational Listings', path: '/educational-listings', icon: icons.education },
    { name: 'Educational Listings', path: '/educational-listings', icon: icons.education },
    { name: 'News Management', path: '/news', icon: icons.news },
    { name: 'Content', path: '/content', icon: icons.content },
    { name: 'Settings', path: '/settings', icon: icons.settings },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Box
      w="250px"
      h="100vh"
      bg="gray.800"
      color="white"
      py={5}
      px={3}
      position="sticky"
      top={0}
    >
      <Flex align="center" justify="center" mb={8}>
        <Text fontSize="2xl" fontWeight="bold">
          Admin Panel
        </Text>
      </Flex>

      <VStack spacing={1} align="stretch">
        {navItems.map((item) => (
          <Link to={item.path} key={item.path}>
            <Flex
              align="center"
              p={3}
              borderRadius="md"
              bg={location.pathname === item.path ? 'blue.500' : 'transparent'}
              _hover={{ bg: location.pathname === item.path ? 'blue.500' : 'gray.700' }}
              transition="all 0.2s"
            >
              <Text mr={3} fontSize="lg">
                {item.icon}
              </Text>
              <Text>{item.name}</Text>
            </Flex>
          </Link>
        ))}
      </VStack>

      <Divider my={6} />

      <Button
        leftIcon={<Text>{icons.logout}</Text>}
        variant="outline"
        colorScheme="red"
        w="full"
        onClick={handleSignOut}
      >
        Sign Out
      </Button>
    </Box>
  );
}