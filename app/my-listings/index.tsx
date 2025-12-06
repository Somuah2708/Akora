import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit, Trash2, Star, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number | null;
  category_name: string;
  image_url: string | null;
  rating?: string;
  reviews?: number;
  created_at: string;
  is_active?: boolean;
  is_approved?: boolean;
  is_featured?: boolean;
  contact_email?: string;
  location?: string;
}

export default function MyListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyListings();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMyListings();
      }
    }, [user])
  );

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const jobCategories = ['Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering'];
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('user_id', user?.id)
        .not('category_name', 'in', `(${jobCategories.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    console.log('🗑️ Delete requested for listing:', listingId);
    
    // Use native confirm for web compatibility
    const confirmed = confirm('⚠️ Delete Listing\n\nAre you sure you want to delete this listing? This action cannot be undone.');
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    console.log('✅ Delete confirmed for listing:', listingId);
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', listingId);

      if (error) {
        console.error('❌ Supabase delete error:', error);
        alert(`Error: Failed to delete listing - ${error.message || 'Unknown error'}`);
        return;
      }
      
      console.log('✅ Listing deleted successfully');
      alert('✅ Success! Your listing has been deleted successfully!');
      
      // Refresh the list
      fetchMyListings();
    } catch (error: any) {
      console.error('❌ Error deleting listing:', error);
      alert(`Error: ${error.message || 'Failed to delete listing'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (listingId: string, categoryName: string) => {
    // Check if it's a job listing
    const jobCategories = ['Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering'];
    const isJobListing = jobCategories.includes(categoryName);
    
    // Navigate to appropriate edit page
    if (isJobListing) {
      debouncedRouter.push(`/edit-job-listing/${listingId}`);
    } else {
      debouncedRouter.push(`/edit-listing/${listingId}`);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free';
    return `₵${price}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>My Listings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please sign in to view your listings</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>My Listings</Text>
        <TouchableOpacity 
          onPress={() => debouncedRouter.push('/create-listing')}
          style={styles.addButton}
        >
          <Plus size={24} color="#4169E1" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading your listings...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't created any listings yet</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => debouncedRouter.push('/create-listing')}
            >
              <Text style={styles.createButtonText}>Create Your First Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listingsContainer}>
            {listings.map((listing) => (
              <TouchableOpacity 
                key={listing.id}
                style={styles.listingCard}
                onPress={() => debouncedRouter.push(`/services/${listing.id}`)}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: (() => {
                    if (!listing.image_url) return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60';
                    try {
                      const arr = JSON.parse(listing.image_url);
                      if (Array.isArray(arr) && arr.length > 0) return arr[0];
                    } catch {}
                    return listing.image_url;
                  })() }} 
                  style={styles.listingImage} 
                />
                <View style={styles.listingContent}>
                  <View style={styles.listingHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{listing.category_name}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(listing.created_at)}</Text>
                  </View>
                  
                  <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                  <Text style={styles.listingDescription} numberOfLines={2}>{listing.description}</Text>
                  
                  <View style={styles.listingFooter}>
                    <View style={styles.priceRatingContainer}>
                      <Text style={styles.listingPrice}>{formatPrice(listing.price)}</Text>
                      <View style={styles.ratingContainer}>
                        <Star size={14} color="#FFB800" fill="#FFB800" />
                        <Text style={styles.rating}>{listing.rating || '0.0'}</Text>
                        <Text style={styles.reviews}>({listing.reviews || 0})</Text>
                      </View>
                    </View>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleEdit(listing.id, listing.category_name);
                        }}
                      >
                        <Edit size={18} color="#4169E1" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(listing.id);
                        }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  listingsContainer: {
    padding: 16,
    gap: 16,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listingImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  listingContent: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EBF1FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  listingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  listingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRatingContainer: {
    flex: 1,
  },
  listingPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  reviews: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EBF1FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
