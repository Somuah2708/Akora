import { supabase, type ProductService, type Profile } from './supabase';

export interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: number;
  reviews?: number;
  isBookmarked?: boolean;
}

export interface ServiceReview {
  id: string;
  product_service_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Profile;
}

/**
 * Fetch all products/services with user profiles and ratings
 */
export async function fetchAllProducts(): Promise<ProductServiceWithUser[]> {
  try {
    // Fetch products
    const { data: productsData, error: productsError } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;
    if (!productsData || productsData.length === 0) return [];

    // Fetch user profiles
    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Fetch ratings for all products
    const productIds = productsData.map(p => p.id);
    const { data: ratingsData } = await supabase
      .rpc('get_service_rating_stats', { service_id: productIds[0] });

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5, // Will be replaced with actual ratings
      reviews: 0,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(category: string): Promise<ProductServiceWithUser[]> {
  try {
    const { data: productsData, error: productsError } = await supabase
      .from('products_services')
      .select('*')
      .eq('category_name', category)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;
    if (!productsData || productsData.length === 0) return [];

    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5,
      reviews: 0,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}

/**
 * Fetch featured products/services
 */
export async function fetchFeaturedProducts(): Promise<ProductServiceWithUser[]> {
  try {
    const { data: productsData, error } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_featured', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!productsData || productsData.length === 0) return [];

    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5,
      reviews: 0,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

/**
 * Create a new product/service listing
 */
export async function createListing(
  userId: string,
  data: {
    title: string;
    description: string;
    price: number;
    imageUrl?: string;
    category: string;
  }
) {
  try {
    // Create listing - users have unlimited listings
    const { data: listing, error } = await supabase
      .from('products_services')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: data.imageUrl,
        category_name: data.category,
        is_approved: true, // Auto-approve for now
      })
      .select()
      .single();

    if (error) throw error;
    return listing;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
}

/**
 * Update a product/service listing
 */
export async function updateListing(
  listingId: string,
  userId: string,
  data: Partial<{
    title: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
  }>
) {
  try {
    const { data: listing, error } = await supabase
      .from('products_services')
      .update({
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: data.imageUrl,
        category_name: data.category,
      })
      .eq('id', listingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return listing;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
}

/**
 * Delete a product/service listing
 */
export async function deleteListing(listingId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('products_services')
      .delete()
      .eq('id', listingId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}

/**
 * Add a review for a product/service
 */
export async function addReview(
  productId: string,
  userId: string,
  rating: number,
  comment?: string
) {
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .insert({
        product_service_id: productId,
        user_id: userId,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
}

/**
 * Fetch reviews for a product/service
 */
export async function fetchReviews(productId: string): Promise<ServiceReview[]> {
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .eq('product_service_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Toggle bookmark for a product/service
 */
export async function toggleBookmark(productId: string, userId: string): Promise<boolean> {
  try {
    // Check if already bookmarked
    const { data: existing } = await supabase
      .from('service_bookmarks')
      .select('id')
      .eq('product_service_id', productId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove bookmark
      await supabase
        .from('service_bookmarks')
        .delete()
        .eq('id', existing.id);
      return false;
    } else {
      // Add bookmark
      await supabase
        .from('service_bookmarks')
        .insert({
          product_service_id: productId,
          user_id: userId,
        });
      return true;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
}

/**
 * Check if user has bookmarked a product
 */
export async function isBookmarked(productId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('service_bookmarks')
      .select('id')
      .eq('product_service_id', productId)
      .eq('user_id', userId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Fetch user's bookmarked products
 */
export async function fetchBookmarkedProducts(userId: string): Promise<ProductServiceWithUser[]> {
  try {
    const { data: bookmarks, error } = await supabase
      .from('service_bookmarks')
      .select('product_service_id')
      .eq('user_id', userId);

    if (error) throw error;
    if (!bookmarks || bookmarks.length === 0) return [];

    const productIds = bookmarks.map(b => b.product_service_id);
    const { data: productsData } = await supabase
      .from('products_services')
      .select('*')
      .in('id', productIds);

    if (!productsData) return [];

    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5,
      reviews: 0,
      isBookmarked: true,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching bookmarked products:', error);
    return [];
  }
}
