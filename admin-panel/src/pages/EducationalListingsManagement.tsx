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
  useDisclosure,
  Image,
  Flex,
} from '@chakra-ui/react';
import { supabase, type ProductService } from '../lib/supabaseAdmin';

interface ProductServiceWithUser extends ProductService {
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function EducationalListingsManagement() {
  const [listings, setListings] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ProductServiceWithUser | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
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
        .in('category_name', [
          'Universities', 
          'Scholarships', 
          'Research Grants', 
          'Exchange Programs', 
          'Summer Schools'
        ])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setListings(data || []);
    } catch (err: any) {
      console.error('Error fetching educational listings:', err);
      setError(err.message || 'Failed to fetch educational listings');
      toast({
        title: 'Error fetching listings',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
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
        title: 'Listing approved',
        description: 'The educational listing has been approved and is now visible to users',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchListings();
    } catch (err: any) {
      console.error('Error approving listing:', err);
      toast({
        title: 'Error approving listing',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }

  async function handleReject(id: string) {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Listing rejected',
        description: 'The educational listing has been removed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the list
      fetchListings();
    } catch (err: any) {
      console.error('Error rejecting listing:', err);
      toast({
        title: 'Error rejecting listing',
        description: err.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }

  function handleViewDetails(listing: ProductServiceWithUser) {
    setSelectedListing(listing);
    onOpen();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  return (
    <Box>
      <Heading mb={6}>Educational Listings Management</Heading>
      
      <HStack mb={6} justify="space-between">
        <Button colorScheme="blue" onClick={fetchListings} isLoading={loading}>
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
                <Th>Submitted By</Th>
                <Th>Status</Th>
                <Th>Submitted On</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {listings.length === 0 ? (
                <Tr>
                  <Td colSpan={6} textAlign="center">
                    No educational listings found
                  </Td>
                </Tr>
              ) : (
                listings.map((listing) => (
                  <Tr key={listing.id}>
                    <Td>{listing.title}</Td>
                    <Td>{listing.category_name}</Td>
                    <Td>
                      {listing.profiles?.full_name || listing.profiles?.username}
                    </Td>
                    <Td>
                      <Badge colorScheme={listing.is_approved ? 'green' : 'yellow'}>
                        {listing.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </Td>
                    <Td>
                      {listing.created_at
                        ? formatDate(listing.created_at)
                        : 'N/A'}
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleViewDetails(listing)}
                        >
                          View
                        </Button>
                        {!listing.is_approved && (
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => handleApprove(listing.id)}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleReject(listing.id)}
                        >
                          {listing.is_approved ? 'Delete' : 'Reject'}
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
      
      {/* Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Listing Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedListing && (
              <Box>
                <Heading size="md" mb={2}>{selectedListing.title}</Heading>
                <Badge colorScheme={selectedListing.is_approved ? 'green' : 'yellow'} mb={4}>
                  {selectedListing.is_approved ? 'Approved' : 'Pending Approval'}
                </Badge>
                
                <Text fontWeight="bold" mb={1}>Category:</Text>
                <Text mb={3}>{selectedListing.category_name}</Text>
                
                <Text fontWeight="bold" mb={1}>Description:</Text>
                <Text mb={3}>{selectedListing.description}</Text>
                
                {selectedListing.price !== null && (
                  <>
                    <Text fontWeight="bold" mb={1}>Value/Cost:</Text>
                    <Text mb={3}>${selectedListing.price}</Text>
                  </>
                )}
                
                <Text fontWeight="bold" mb={1}>Submitted By:</Text>
                <Text mb={3}>{selectedListing.profiles?.full_name || selectedListing.profiles?.username}</Text>
                
                <Text fontWeight="bold" mb={1}>Submitted On:</Text>
                <Text mb={3}>{formatDate(selectedListing.created_at)}</Text>
                
                {selectedListing.image_url && (
                  <>
                    <Text fontWeight="bold" mb={1}>Image:</Text>
                    <Image 
                      src={selectedListing.image_url} 
                      alt={selectedListing.title}
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
            {selectedListing && !selectedListing.is_approved && (
              <Button colorScheme="green" mr={3} onClick={() => {
                handleApprove(selectedListing.id);
                onClose();
              }}>
                Approve
              </Button>
            )}
            <Button colorScheme="red" mr={3} onClick={() => {
              if (selectedListing) {
                handleReject(selectedListing.id);
                onClose();
              }
            }}>
              {selectedListing?.is_approved ? 'Delete' : 'Reject'}
            </Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}