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
  Textarea,
  Select,
  useDisclosure,
  VStack,
  Image,
} from '@chakra-ui/react';
import { supabase, type ProductService } from '../lib/supabaseAdmin';

interface ProductServiceWithUser extends ProductService {
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface NewsFormData {
  id?: string;
  title: string;
  content: string;
  category: string;
  image_url: string;
}

const NEWS_CATEGORIES = [
  'Alumni Updates',
  'School News',
  'World News',
  'Technology',
  'Business',
];

export default function NewsManagement() {
  const [news, setNews] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<ProductServiceWithUser | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: '',
    content: '',
    category: 'School News',
    image_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('products_services')
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .like('category_name', 'News - %')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setNews(data || []);
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(err.message || 'Failed to fetch news');
      toast({
        title: 'Error fetching news',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAddForm() {
    setFormData({
      title: '',
      content: '',
      category: 'School News',
      image_url: '',
    });
    onFormOpen();
  }

  function handleOpenEditForm(newsItem: ProductServiceWithUser) {
    // Extract category from category_name (format: "News - Category")
    const categoryParts = newsItem.category_name.split(' - ');
    const category = categoryParts.length > 1 ? categoryParts[1] : 'School News';
    
    setFormData({
      id: newsItem.id,
      title: newsItem.title,
      content: newsItem.description,
      category,
      image_url: newsItem.image_url || '',
    });
    onFormOpen();
  }

  function handleViewDetails(newsItem: ProductServiceWithUser) {
    setSelectedNews(newsItem);
    onViewOpen();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.category) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const newsData = {
        title: formData.title,
        description: formData.content,
        category_name: `News - ${formData.category}`,
        image_url: formData.image_url || null,
        is_approved: true, // Admin-created news is auto-approved
        is_featured: false,
        is_premium_listing: false,
        price: null,
      };
      
      if (formData.id) {
        // Update existing news
        const { error } = await supabase
          .from('products_services')
          .update(newsData)
          .eq('id', formData.id);
        
        if (error) throw error;
        
        toast({
          title: 'News updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new news
        // Get the current user's ID
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('User not authenticated');
        
        const { error } = await supabase
          .from('products_services')
          .insert({
            ...newsData,
            user_id: user.id,
          });
        
        if (error) throw error;
        
        toast({
          title: 'News created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Refresh the list
      await fetchNews();
      onFormClose();
    } catch (err: any) {
      console.error('Error saving news:', err);
      toast({
        title: 'Error saving news',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const { error } = await supabase
        .from('products_services')
        .update({ is_approved: true })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'News approved',
        description: 'The news article has been approved and is now visible to users',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchNews();
    } catch (err: any) {
      console.error('Error approving news:', err);
      toast({
        title: 'Error approving news',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this news article?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'News deleted',
        description: 'The news article has been removed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchNews();
    } catch (err: any) {
      console.error('Error deleting news:', err);
      toast({
        title: 'Error deleting news',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function getCategoryFromName(categoryName: string) {
    const parts = categoryName.split(' - ');
    return parts.length > 1 ? parts[1] : categoryName;
  }

  return (
    <Box>
      <Heading mb={6}>News Management</Heading>
      
      <HStack mb={6} justify="space-between">
        <Button colorScheme="blue" onClick={handleOpenAddForm}>Add News Article</Button>
        <Button onClick={fetchNews} isLoading={loading}>
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
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>Status</Th>
                <Th>Published</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {news.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center">
                    No news articles found
                  </Td>
                </Tr>
              ) : (
                news.map((article) => (
                  <Tr key={article.id}>
                    <Td>{article.title}</Td>
                    <Td>{getCategoryFromName(article.category_name)}</Td>
                    <Td>
                      {article.profiles?.full_name || article.profiles?.username}
                    </Td>
                    <Td>
                      <Badge colorScheme={article.is_approved ? 'green' : 'yellow'}>
                        {article.is_approved ? 'Published' : 'Pending'}
                      </Badge>
                    </Td>
                    <Td>
                      {article.created_at
                        ? formatDate(article.created_at)
                        : 'N/A'}
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleViewDetails(article)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="teal"
                          onClick={() => handleOpenEditForm(article)}
                        >
                          Edit
                        </Button>
                        {!article.is_approved && (
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleApprove(article.id)}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDelete(article.id)}
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
      
      {/* View News Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>News Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedNews && (
              <Box>
                <Heading size="md" mb={2}>{selectedNews.title}</Heading>
                <Badge colorScheme={selectedNews.is_approved ? 'green' : 'yellow'} mb={4}>
                  {selectedNews.is_approved ? 'Published' : 'Pending Approval'}
                </Badge>
                
                <Text fontWeight="bold" mb={1}>Category:</Text>
                <Text mb={3}>{getCategoryFromName(selectedNews.category_name)}</Text>
                
                <Text fontWeight="bold" mb={1}>Content:</Text>
                <Text mb={3} whiteSpace="pre-wrap">{selectedNews.description}</Text>
                
                <Text fontWeight="bold" mb={1}>Author:</Text>
                <Text mb={3}>{selectedNews.profiles?.full_name || selectedNews.profiles?.username}</Text>
                
                <Text fontWeight="bold" mb={1}>Published On:</Text>
                <Text mb={3}>{formatDate(selectedNews.created_at)}</Text>
                
                {selectedNews.image_url && (
                  <>
                    <Text fontWeight="bold" mb={1}>Featured Image:</Text>
                    <Image 
                      src={selectedNews.image_url} 
                      alt={selectedNews.title}
                      maxH="300px"
                      objectFit="cover"
                      borderRadius="md"
                      mb={3}
                      fallback={<Box bg="gray.100" height="200px" width="100%" borderRadius="md" />}
                    />
                  </>
                )}
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            {selectedNews && !selectedNews.is_approved && (
              <Button colorScheme="green" mr={3} onClick={() => {
                handleApprove(selectedNews.id);
                onViewClose();
              }}>
                Approve
              </Button>
            )}
            <Button colorScheme="blue" mr={3} onClick={() => {
              if (selectedNews) {
                handleOpenEditForm(selectedNews);
                onViewClose();
              }
            }}>
              Edit
            </Button>
            <Button variant="ghost" onClick={onViewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Add/Edit News Modal */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{formData.id ? 'Edit News Article' : 'Add News Article'}</ModalHeader>
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
                    placeholder="Enter news title"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Category</FormLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {NEWS_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Content</FormLabel>
                  <Textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Enter news content"
                    minHeight="200px"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Image URL</FormLabel>
                  <Input
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    placeholder="Enter image URL"
                  />
                </FormControl>
                
                {formData.image_url && (
                  <Box>
                    <Text fontWeight="bold" mb={1}>Image Preview:</Text>
                    <Image 
                      src={formData.image_url} 
                      alt="Preview"
                      maxH="200px"
                      objectFit="cover"
                      borderRadius="md"
                      fallback={<Box bg="gray.100" height="200px" width="100%" borderRadius="md" />}
                    />
                  </Box>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onFormClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                type="submit"
                isLoading={isSubmitting}
              >
                {formData.id ? 'Update' : 'Publish'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
}