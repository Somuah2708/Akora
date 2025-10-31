import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Animated, Alert, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, Star, ArrowLeft, ChevronRight, Briefcase, GraduationCap, Wrench, Palette, Coffee, Stethoscope, Book, Camera, Plus, CircleAlert as AlertCircle, Heart, X, Home, Car, Shirt, Dumbbell, Scissors, PawPrint, Music, Hammer, Smartphone, Sofa, ShoppingCart, Watch, Backpack, Sparkles, Baby, Utensils, FileText } from 'lucide-react-native';
import { supabase, type ProductService } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CATEGORIES = [
  { id: '1', name: 'Business Services', icon: Briefcase },
  { id: '2', name: 'Education & Tutoring', icon: GraduationCap },
  { id: '3', name: 'Technical Services', icon: Wrench },
  { id: '4', name: 'Creative & Design', icon: Palette },
  { id: '5', name: 'Food & Catering', icon: Coffee },
  { id: '6', name: 'Healthcare', icon: Stethoscope },
  { id: '7', name: 'Publishing', icon: Book },
  { id: '8', name: 'Photography', icon: Camera },
  { id: '9', name: 'Home Services', icon: Home },
  { id: '10', name: 'Automotive', icon: Car },
  { id: '11', name: 'Fashion & Beauty', icon: Shirt },
  { id: '12', name: 'Fitness & Sports', icon: Dumbbell },
  { id: '13', name: 'Hair & Salon', icon: Scissors },
  { id: '14', name: 'Pet Care', icon: PawPrint },
  { id: '15', name: 'Entertainment', icon: Music },
  { id: '16', name: 'Construction', icon: Hammer },
  { id: '17', name: 'Electronics', icon: Smartphone },
  { id: '18', name: 'Furniture', icon: Sofa },
  { id: '19', name: 'Clothing & Apparel', icon: ShoppingCart },
  { id: '20', name: 'Watches & Jewelry', icon: Watch },
  { id: '21', name: 'Bags & Accessories', icon: Backpack },
  { id: '22', name: 'Books & Stationery', icon: Book },
  { id: '23', name: 'Beauty Products', icon: Sparkles },
  { id: '24', name: 'Baby & Kids', icon: Baby },
  { id: '25', name: 'Kitchen & Dining', icon: Utensils },
];

export default function ServicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<ProductService[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    selectedInterests: [] as string[],
  });
  const bagScale = useRef(new Animated.Value(1)).current;
  const bagRotation = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });
  
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);
  
  useEffect(() => {
    fetchProducts();
    fetchFeaturedBusinesses();
    if (user) fetchBookmarks();
  }, [user]);

  // Refresh data when screen comes into focus (e.g., after creating a listing)
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchFeaturedBusinesses();
      if (user) fetchBookmarks();
    }, [user])
  );
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Exclude job/internship categories from marketplace
      const jobCategories = ['Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering'];
      
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_approved', true)
        .not('category_name', 'in', `(${jobCategories.join(',')})`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('📦 Fetched products:', data?.length || 0);
      data?.forEach(p => console.log(`  - ${p.title} (Category: ${p.category_name})`));
      setProducts(data || []);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFeaturedBusinesses = async () => {
    try {
      // Exclude job/internship categories from featured businesses
      const jobCategories = ['Full Time Jobs', 'Internships', 'National Service', 'Part Time', 'Remote Work', 'Volunteering'];
      
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_featured', true)
        .eq('is_approved', true)
        .not('category_name', 'in', `(${jobCategories.join(',')})`)
        .limit(10);
      
      if (error) {
        console.error('❌ Featured error:', error);
      }
      
      setFeaturedBusinesses(data || []);
    } catch (error) {
      console.error('❌ Error fetching featured:', error);
    }
  };
  
  const fetchBookmarks = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('service_bookmarks').select('product_service_id').eq('user_id', user.id);
      setBookmarkedItems(new Set(data?.map(b => b.product_service_id) || []));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProducts(),
      fetchFeaturedBusinesses(),
      user ? fetchBookmarks() : Promise.resolve()
    ]);
    setRefreshing(false);
  };
  
  const toggleBookmark = async (productId: string) => {
    if (!user) {
      Alert.alert('Sign in required');
      return;
    }
    const isBookmarked = bookmarkedItems.has(productId);
    try {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bagScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(bagRotation, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bagScale, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(bagRotation, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]),
      ]).start();
      if (isBookmarked) {
        await supabase.from('service_bookmarks').delete().eq('user_id', user.id).eq('product_service_id', productId);
        const newBookmarks = new Set(bookmarkedItems);
        newBookmarks.delete(productId);
        setBookmarkedItems(newBookmarks);
      } else {
        await supabase.from('service_bookmarks').insert({ user_id: user.id, product_service_id: productId });
        const newBookmarks = new Set(bookmarkedItems);
        newBookmarks.add(productId);
        setBookmarkedItems(newBookmarks);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  const filteredProducts = products.filter(product => {
    console.log('🔍 Filtering product:', product.title, 'Category:', product.category_name);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!product.title.toLowerCase().includes(query) && !product.description?.toLowerCase().includes(query)) {
        console.log('❌ Filtered out by search:', product.title);
        return false;
      }
    }
    
    if (selectedCategory) {
      const category = CATEGORIES.find(c => c.id === selectedCategory);
      console.log('🏷️ Selected category:', category?.name, 'Product category:', product.category_name);
      if (category && product.category_name !== category.name) {
        console.log('❌ Filtered out by category mismatch:', product.title);
        return false;
      }
    } else {
      console.log('✅ All tab - no category filter');
    }
    
    if (filters.minPrice && product.price && product.price < parseFloat(filters.minPrice)) {
      console.log('❌ Filtered out by min price:', product.title);
      return false;
    }
    if (filters.maxPrice && product.price && product.price > parseFloat(filters.maxPrice)) {
      console.log('❌ Filtered out by max price:', product.title);
      return false;
    }
    if (filters.selectedInterests.length > 0 && !filters.selectedInterests.includes(product.category_name || '')) {
      console.log('❌ Filtered out by interests:', product.title);
      return false;
    }
    
    console.log('✅ Product passed all filters:', product.title);
    return true;
  });
  
  console.log('📊 Total products:', products.length, 'Filtered products:', filteredProducts.length, 'Selected category:', selectedCategory);
  
  if (!fontsLoaded) return null;
  
  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4169E1']}
            tintColor="#4169E1"
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Marketplace</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/my-listings' as any)}>
              <FileText size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/favorites' as any)}>
              <Animated.View style={{ transform: [{ scale: bagScale }, { rotate: bagRotation.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] }) }] }}>
                <Heart size={24} color="#000" fill="none" />
              </Animated.View>
              {bookmarkedItems.size > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{bookmarkedItems.size}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Debug Info */}
        <View style={{ padding: 12, backgroundColor: '#F0F9FF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
          <Text style={{ fontSize: 12, color: '#4169E1', fontWeight: '600' }}>
            📊 Total: {products.length} | Shown: {filteredProducts.length} | Category: {selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.name : 'All'}
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#666" />
            <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <TouchableOpacity style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]} onPress={() => setSelectedCategory(null)}>
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map(category => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity key={category.id} style={[styles.categoryChip, isSelected && styles.categoryChipSelected]} onPress={() => setSelectedCategory(isSelected ? null : category.id)}>
                <Icon size={16} color={isSelected ? '#FFF' : '#4169E1'} />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products & Services</Text>
          </View>
          <View style={styles.productsGrid}>
            {loading ? (
              <ActivityIndicator size="large" color="#4169E1" />
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No products found</Text>
              </View>
            ) : (
              filteredProducts.map(product => {
                // Parse image_url if it's a JSON string
                let imageUri = product.image_url;
                if (imageUri && imageUri.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(imageUri);
                    imageUri = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageUri;
                  } catch (e) {
                    console.log('Failed to parse image_url for product:', product.id);
                  }
                }
                
                return (
                <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => router.push(`/services/${product.id}` as any)}>
                  <Image source={{ uri: imageUri || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800' }} style={styles.productImage} />
                  <TouchableOpacity style={styles.favoriteIcon} onPress={e => { e.stopPropagation(); toggleBookmark(product.id); }}>
                    <Heart size={20} color={bookmarkedItems.has(product.id) ? '#EF4444' : '#FFF'} fill={bookmarkedItems.has(product.id) ? '#EF4444' : 'none'} />
                  </TouchableOpacity>
                  <View style={styles.productContent}>
                    <Text style={styles.productName} numberOfLines={2}>{product.title}</Text>
                    <Text style={styles.price}>{product.price?.toFixed(2) || '0.00'}</Text>
                    <View style={styles.productFooter}>
                      <View style={styles.ratingContainer}>
                        <Star size={12} color="#FFB800" fill="#FFB800" />
                        <Text style={styles.rating}>4.5</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
              })
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.floatingButton} onPress={() => router.push('/create-listing' as any)}>
          <Plus size={24} color="#FFF" />
          <Text style={styles.floatingButtonText}>Add Listing</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={showFilterModal} transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.priceRangeContainer}>
                  <TextInput style={styles.priceRangeField} placeholder="Min" value={filters.minPrice} onChangeText={text => setFilters({ ...filters, minPrice: text })} keyboardType="decimal-pad" />
                  <Text> - </Text>
                  <TextInput style={styles.priceRangeField} placeholder="Max" value={filters.maxPrice} onChangeText={text => setFilters({ ...filters, maxPrice: text })} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categories</Text>
                <View style={styles.interestsContainer}>
                  {CATEGORIES.map(cat => {
                    const isSelected = filters.selectedInterests.includes(cat.name);
                    return (
                      <TouchableOpacity key={cat.id} style={[styles.interestChip, isSelected && styles.interestChipSelected]} onPress={() => setFilters({ ...filters, selectedInterests: isSelected ? filters.selectedInterests.filter(i => i !== cat.name) : [...filters.selectedInterests, cat.name] })}>
                        <Text style={[styles.interestChipText, isSelected && styles.interestChipTextSelected]}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={() => setFilters({ minPrice: '', maxPrice: '', selectedInterests: [] })}>
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFiltersButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyFiltersText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#FFF' },
  backButton: { padding: 8 },
  title: { fontSize: 24, fontFamily: 'Inter-SemiBold', color: '#000' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { padding: 8 },
  cartButton: { padding: 8, position: 'relative' },
  cartBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#FF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter-SemiBold' },
  searchContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontFamily: 'Inter-Regular', color: '#000' },
  filterButton: { width: 48, height: 48, backgroundColor: '#4169E1', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoriesScroll: { marginBottom: 24, marginTop: 16, paddingHorizontal: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F4FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, marginRight: 12 },
  categoryChipSelected: { backgroundColor: '#4169E1' },
  categoryChipText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#4169E1' },
  categoryChipTextSelected: { color: '#FFF' },
  section: { marginBottom: 24 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#000' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16 },
  productCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  favoriteIcon: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  productImage: { width: '100%', height: 150 },
  productContent: { padding: 12 },
  productName: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#000', marginBottom: 4 },
  price: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#4169E1', marginBottom: 8 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#000' },
  emptyContainer: { width: '100%', padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#666' },
  floatingButton: { backgroundColor: '#4169E1', flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, marginHorizontal: 20, marginVertical: 20 },
  floatingButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter-SemiBold', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#000' },
  formScroll: { paddingHorizontal: 20, paddingTop: 20 },
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#000', marginBottom: 12 },
  priceRangeContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceRangeField: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  interestChip: { backgroundColor: '#F8F9FA', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: '#E5E7EB' },
  interestChipSelected: { backgroundColor: '#EBF1FF', borderColor: '#4169E1' },
  interestChipText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#666' },
  interestChipTextSelected: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#4169E1' },
  filterFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  clearFiltersButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#4169E1', alignItems: 'center' },
  clearFiltersText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#4169E1' },
  applyFiltersButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#4169E1', alignItems: 'center' },
  applyFiltersText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFF' },
});
