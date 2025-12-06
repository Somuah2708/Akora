import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Alert, RefreshControl, Linking, Modal } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, ShoppingBag, Search, Heart, Plus, Phone, MessageCircle, Trash2, Edit2, Package, Settings, X } from 'lucide-react-native';
import { supabase, type SecretariatShopProduct, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Items' },
  { id: 'clothing', name: 'Clothing' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'homeware', name: 'Homeware' },
  { id: 'stationery', name: 'Stationery' },
  { id: 'books', name: 'Books' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'sports', name: 'Sports' },
];

const OAA_SECRETARIAT_PHONE = '+233302765432';
const OAA_SECRETARIAT_WHATSAPP = '+233302765432';

// Settings key for storing phone number
const SETTINGS_TABLE = 'app_settings';
const PHONE_SETTING_KEY = 'secretariat_phone';

export default function SecretariatShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'GHS'>('GHS');
  const [products, setProducts] = useState<SecretariatShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [secretariatPhone, setSecretariatPhone] = useState(OAA_SECRETARIAT_PHONE);
  const [editingPhone, setEditingPhone] = useState('');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Fetch user profile to check admin status
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user]);

  // Fetch products from database
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('secretariat_shop_products')
        .select(`
          *,
          user:profiles(id, username, full_name, avatar_url)
        `)
        .eq('in_stock', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load secretariat phone number from settings
  const loadSecretariatPhone = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', PHONE_SETTING_KEY)
        .maybeSingle();
      
      if (!error && data?.value) {
        setSecretariatPhone(data.value);
      }
    } catch (error) {
      console.error('Error loading phone setting:', error);
    }
  }, []);

  // Save secretariat phone number
  const saveSecretariatPhone = async () => {
    if (!userProfile?.is_admin) {
      Alert.alert('Error', 'Only admins can update settings.');
      return;
    }

    if (!editingPhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number.');
      return;
    }

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: PHONE_SETTING_KEY,
          value: editingPhone.trim(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      setSecretariatPhone(editingPhone.trim());
      setShowSettingsModal(false);
      Alert.alert('Success', 'Secretariat phone number updated successfully!');
    } catch (error) {
      console.error('Error saving phone setting:', error);
      Alert.alert('Error', 'Failed to save phone number. Please try again.');
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchUserProfile();
      loadSecretariatPhone();
    }, [fetchProducts, fetchUserProfile, loadSecretariatPhone])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = useCallback(async (productId: string, productName: string) => {
    if (!userProfile?.is_admin) {
      Alert.alert('Error', 'You do not have permission to delete products.');
      return;
    }

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('secretariat_shop_products')
                .delete()
                .eq('id', productId);

              if (error) throw error;

              Alert.alert('Success', 'Product deleted successfully.');
              fetchProducts();
            } catch (error: any) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', error.message || 'Failed to delete product.');
            }
          },
        },
      ]
    );
  }, [userProfile, fetchProducts]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || 
      product.category.toLowerCase() === activeCategory;
    
    const matchesSearch = searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const formatPrice = (priceUSD: number, priceGHS: number) => {
    if (currency === 'USD') {
      return `$${priceUSD.toFixed(2)}`;
    } else {
      return `₵${priceGHS.toFixed(2)}`;
    }
  };

  const handleContactToOrder = () => {
    Alert.alert(
      'Contact OAA Secretariat',
      'How would you like to place your order?',
      [
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${OAA_SECRETARIAT_PHONE}`),
        },
        {
          text: 'WhatsApp',
          onPress: () => Linking.openURL(`https://wa.me/${OAA_SECRETARIAT_WHATSAPP.replace(/\D/g, '')}`),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>OAA Shop</Text>
          <Text style={styles.subtitle}>Official Alumni Merchandise</Text>
        </View>
        {userProfile?.is_admin ? (
          <TouchableOpacity 
            onPress={() => {
              setEditingPhone(secretariatPhone);
              setShowSettingsModal(true);
            }} 
            style={styles.settingsButton}
          >
            <Settings size={24} color="#000000" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchandise..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Currency Toggle */}
      <View style={styles.currencyContainer}>
        <View style={styles.currencyToggle}>
          <TouchableOpacity
            style={[styles.currencyButton, currency === 'GHS' && styles.activeCurrencyButton]}
            onPress={() => setCurrency('GHS')}
          >
            <Text style={[styles.currencyButtonText, currency === 'GHS' && styles.activeCurrencyButtonText]}>
              GHS (₵)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyButton, currency === 'USD' && styles.activeCurrencyButton]}
            onPress={() => setCurrency('USD')}
          >
            <Text style={[styles.currencyButtonText, currency === 'USD' && styles.activeCurrencyButtonText]}>
              USD ($)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Admin Post Button */}
        {userProfile?.is_admin && (
          <View style={styles.adminActionsContainer}>
            <TouchableOpacity 
              style={styles.postButton}
              onPress={() => debouncedRouter.push('/secretariat-shop/post-item')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.postButtonGradient}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.postButtonText}>Post New Item</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.myItemsButton}
              onPress={() => debouncedRouter.push('/secretariat-shop/my-posted-items')}
            >
              <Package size={18} color="#4169E1" />
              <Text style={styles.myItemsText}>Manage Inventory</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {PRODUCT_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                activeCategory === category.id && styles.categoryChipActive
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text style={[
                styles.categoryChipText,
                activeCategory === category.id && styles.categoryChipTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Items</Text>
            <Text style={styles.itemCount}>{filteredProducts.length} items</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ShoppingBag size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try a different search term' : 
                 activeCategory !== 'all' ? 'No items in this category yet' :
                 'Check back soon for new merchandise!'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => debouncedRouter.push(`/secretariat-shop/${product.id}`)}
                >
                  <Image
                    source={{ uri: product.images[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800' }}
                    style={styles.productImage}
                  />
                  
                  {/* Admin Actions */}
                  {userProfile?.is_admin && (
                    <View style={styles.adminActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          debouncedRouter.push({
                            pathname: '/secretariat-shop/edit-posted-item',
                            params: { productId: product.id }
                          });
                        }}
                      >
                        <Edit2 size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id, product.name);
                        }}
                      >
                        <Trash2 size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Stock Badge */}
                  {product.quantity <= 5 && product.quantity > 0 && (
                    <View style={styles.lowStockBadge}>
                      <Text style={styles.lowStockText}>Only {product.quantity} left</Text>
                    </View>
                  )}

                  <View style={styles.productContent}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>
                        {formatPrice(product.price_usd, product.price_ghs)}
                      </Text>
                      {product.condition !== 'New' && (
                        <View style={styles.conditionBadge}>
                          <Text style={styles.conditionText}>{product.condition}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Contact to Order Section */}
        <View style={styles.contactSection}>
          <View style={styles.contactCard}>
            <ShoppingBag size={32} color="#4169E1" />
            <Text style={styles.contactTitle}>Ready to Order?</Text>
            <Text style={styles.contactDescription}>
              Contact the OAA Secretariat to place your order and arrange pickup or delivery
            </Text>
            <TouchableOpacity
              style={styles.callButtonFull}
              onPress={() => Linking.openURL(`tel:${secretariatPhone}`)}
            >
              <Phone size={18} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Call to Order</Text>
            </TouchableOpacity>
            <Text style={styles.contactInfo}>
              {secretariatPhone}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              ✓ All items are official OAA merchandise{'\n'}
              ✓ Proceeds support alumni initiatives{'\n'}
              ✓ Available for pickup at school or delivery{'\n'}
              ✓ Quality guaranteed
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Admin Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Secretariat Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Contact Phone Number</Text>
              <TextInput
                style={styles.settingInput}
                placeholder="+233 XXX XXX XXX"
                placeholderTextColor="#94A3B8"
                value={editingPhone}
                onChangeText={setEditingPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.settingHint}>
                This number will be displayed to users for placing orders
              </Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveSecretariatPhone}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  currencyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  currencyToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeCurrencyButton: {
    backgroundColor: '#FFFFFF',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  activeCurrencyButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  adminActionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  postButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  postButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  myItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    gap: 8,
  },
  myItemsText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  categoriesScroll: {
    marginTop: 16,
    maxHeight: 44,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  categoryChipTextActive: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  itemCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F8FAFC',
  },
  adminActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  editButton: {
    width: 32,
    height: 32,
    backgroundColor: '#4169E1',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  conditionBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  contactSection: {
    marginTop: 32,
    paddingHorizontal: 16,
    gap: 16,
  },
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginTop: 12,
  },
  contactDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  callButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  callButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  contactInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 16,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4338CA',
    lineHeight: 22,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  settingSection: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  settingHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 6,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
