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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  VStack,
  Select,
  IconButton,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { supabase, type QuickAction } from '../lib/supabaseAdmin';

// List of available Lucide icon names
const AVAILABLE_ICONS = [
  'Building2',
  'Home',
  'Calendar',
  'History',
  'School',
  'Newspaper',
  'Users',
  'BookOpen',
  'GraduationCap',
  'Briefcase',
  'Heart',
  'Star',
  'Award',
  'Globe',
  'MapPin',
  'MessageCircle',
  'Bell',
  'Settings',
  'FileText',
  'Wallet',
  'ShoppingBag',
  'Coffee',
  'Music',
  'Camera',
  'Video',
  'Dumbbell',
  'Brain',
  'Target',
  'Clock',
];

// List of predefined colors
const PREDEFINED_COLORS = [
  '#E4EAFF', // Light Blue
  '#E4FFF4', // Light Green
  '#FFF4E4', // Light Orange
  '#FFE4F4', // Light Pink
  '#E4F4FF', // Light Sky Blue
  '#F4E4FF', // Light Purple
  '#FFE4E4', // Light Red
  '#E4FFE4', // Light Mint
];

interface QuickActionFormData {
  id?: string;
  title: string;
  icon_name: string;
  color: string;
  route: string;
  order_index: number;
}

export default function QuickActionManagement() {
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuickActionFormData>({
    title: '',
    icon_name: 'Building2',
    color: '#E4EAFF',
    route: '/',
    order_index: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    fetchQuickActions();
  }, []);

  async function fetchQuickActions() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('quick_actions')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      setQuickActions(data || []);
    } catch (err: any) {
      console.error('Error fetching quick actions:', err);
      setError(err.message || 'Failed to fetch quick actions');
      toast({
        title: 'Error fetching quick actions',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAddModal() {
    // Find the highest order_index and add 1
    const nextOrderIndex = quickActions.length > 0
      ? Math.max(...quickActions.map(qa => qa.order_index)) + 1
      : 1;
    
    setFormData({
      title: '',
      icon_name: 'Building2',
      color: '#E4EAFF',
      route: '/',
      order_index: nextOrderIndex,
    });
    setIsEditing(false);
    onOpen();
  }

  function handleOpenEditModal(quickAction: QuickAction) {
    setFormData({
      id: quickAction.id,
      title: quickAction.title,
      icon_name: quickAction.icon_name,
      color: quickAction.color,
      route: quickAction.route,
      order_index: quickAction.order_index,
    });
    setIsEditing(true);
    onOpen();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order_index' ? parseInt(value, 10) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      if (isEditing) {
        // Update existing quick action
        const { error } = await supabase
          .from('quick_actions')
          .update({
            title: formData.title,
            icon_name: formData.icon_name,
            color: formData.color,
            route: formData.route,
            order_index: formData.order_index,
          })
          .eq('id', formData.id);
        
        if (error) throw error;
        
        toast({
          title: 'Quick action updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new quick action
        const { error } = await supabase
          .from('quick_actions')
          .insert({
            title: formData.title,
            icon_name: formData.icon_name,
            color: formData.color,
            route: formData.route,
            order_index: formData.order_index,
          });
        
        if (error) throw error;
        
        toast({
          title: 'Quick action created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Refresh the list
      await fetchQuickActions();
      onClose();
    } catch (err: any) {
      console.error('Error saving quick action:', err);
      toast({
        title: 'Error saving quick action',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this quick action?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('quick_actions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Quick action deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      await fetchQuickActions();
    } catch (err: any) {
      console.error('Error deleting quick action:', err);
      toast({
        title: 'Error deleting quick action',
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
      <Heading mb={6}>Quick Action Management</Heading>
      
      <HStack mb={6} justify="space-between">
        <Button colorScheme="blue" onClick={handleOpenAddModal}>Add New Quick Action</Button>
        <Button onClick={fetchQuickActions} isLoading={loading}>
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
                <Th>Order</Th>
                <Th>Title</Th>
                <Th>Icon</Th>
                <Th>Color</Th>
                <Th>Route</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {quickActions.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center">
                    No quick actions found
                  </Td>
                </Tr>
              ) : (
                quickActions.map((quickAction) => (
                  <Tr key={quickAction.id}>
                    <Td>{quickAction.order_index}</Td>
                    <Td>{quickAction.title}</Td>
                    <Td>
                      <HStack>
                        <Box
                          w="24px"
                          h="24px"
                          bg={quickAction.color}
                          borderRadius="md"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          mr={2}
                        >
                          <Text fontSize="xs">{quickAction.icon_name.substring(0, 1)}</Text>
                        </Box>
                        {quickAction.icon_name}
                      </HStack>
                    </Td>
                    <Td>
                      <HStack>
                        <Box
                          w="24px"
                          h="24px"
                          bg={quickAction.color}
                          borderRadius="md"
                          mr={2}
                        />
                        {quickAction.color}
                      </HStack>
                    </Td>
                    <Td>{quickAction.route}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleOpenEditModal(quickAction)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDelete(quickAction.id)}
                        >
                          Delete
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      )}
      
      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditing ? 'Edit Quick Action' : 'Add Quick Action'}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Title</FormLabel>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter title"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Icon</FormLabel>
                  <Select
                    name="icon_name"
                    value={formData.icon_name}
                    onChange={handleInputChange}
                  >
                    {AVAILABLE_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Color</FormLabel>
                  <Flex mb={2} wrap="wrap" gap={2}>
                    {PREDEFINED_COLORS.map((color) => (
                      <Box
                        key={color}
                        w="24px"
                        h="24px"
                        bg={color}
                        borderRadius="md"
                        cursor="pointer"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        border={formData.color === color ? '2px solid black' : 'none'}
                      />
                    ))}
                  </Flex>
                  <Input
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="Enter color (hex)"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Route</FormLabel>
                  <Input
                    name="route"
                    value={formData.route}
                    onChange={handleInputChange}
                    placeholder="Enter route (e.g., /projects)"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Order Index</FormLabel>
                  <Input
                    name="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={handleInputChange}
                    placeholder="Enter order index"
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                type="submit"
                isLoading={isSubmitting}
              >
                {isEditing ? 'Save Changes' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
}