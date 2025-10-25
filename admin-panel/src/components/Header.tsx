import { 
  Box, 
  Flex, 
  Input, 
  InputGroup, 
  InputLeftElement,
  IconButton,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      py={4}
      px={6}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <InputGroup maxW="400px">
        <InputLeftElement pointerEvents="none">
          <Text>🔍</Text>
        </InputLeftElement>
        <Input placeholder="Search..." borderRadius="full" />
      </InputGroup>

      <Flex align="center">
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<Text fontSize="xl">🔔</Text>}
            variant="ghost"
            aria-label="Notifications"
            mr={4}
          />
          <MenuList>
            <MenuItem>No new notifications</MenuItem>
          </MenuList>
        </Menu>

        <Menu>
          <MenuButton>
            <Avatar size="sm" name={user?.email || 'Admin User'} />
          </MenuButton>
          <MenuList>
            <MenuItem>Profile</MenuItem>
            <MenuItem>Settings</MenuItem>
            <MenuItem onClick={() => signOut()}>Sign Out</MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  );
}