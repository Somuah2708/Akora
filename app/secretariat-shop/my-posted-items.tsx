import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Edit2, Trash2, Package, PlusCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

SplashScreen.preventAutoHideAsync();

export default function MyPostedItemsScreen() {
  const router = useRouter();
  const [postedItems, setPostedItems] = useState<any[]>([]);
  const [currency, setCurrency] = useState<'USD' | 'GHS'>('USD');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const loadPostedItems = async () => {
    try {
      const storedItems = await AsyncStorage.getItem('secretariat_posted_items');
      if (storedItems) {
        setPostedItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error('Error loading posted items:', error);
    }
  };

  useEffect(() => {
    loadPostedItems();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPostedItems();
    }, [])
  );

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleDelete = async (itemId: string, itemName: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
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
              const updatedItems = postedItems.filter(item => item.id !== itemId);
              await AsyncStorage.setItem('secretariat_posted_items', JSON.stringify(updatedItems));
              setPostedItems(updatedItems);
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
              console.error('Error deleting item:', error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item: any) => {
    router.push({
      pathname: '/secretariat-shop/edit-posted-item',
      params: { itemId: item.id },
    } as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>My Posted Items</Text>
            <Text style={styles.subtitle}>{postedItems.length} item{postedItems.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/secretariat-shop/post-item')}
          >
            <PlusCircle size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Currency Toggle */}
      <View style={styles.currencyToggleContainer}>
        <TouchableOpacity
          style={[styles.currencyButton, currency === 'USD' && styles.currencyButtonActive]}
          onPress={() => setCurrency('USD')}
        >
          <Text style={[styles.currencyButtonText, currency === 'USD' && styles.currencyButtonTextActive]}>
            USD ($)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.currencyButton, currency === 'GHS' && styles.currencyButtonActive]}
          onPress={() => setCurrency('GHS')}
        >
          <Text style={[styles.currencyButtonText, currency === 'GHS' && styles.currencyButtonTextActive]}>
            GHS (₵)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {postedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Items Posted Yet</Text>
            <Text style={styles.emptyText}>Start sharing products with the community!</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/secretariat-shop/post-item')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyButtonGradient}
              >
                <PlusCircle size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Post Your First Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsGrid}>
            {postedItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image 
                  source={{ uri: item.images[0] }} 
                  style={styles.itemImage} 
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                  <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
                  
                  <View style={styles.itemDetails}>
                    <View style={styles.priceContainer}>
                      <Text style={styles.currencySymbol}>
                        {currency === 'USD' ? '$' : '₵'}
                      </Text>
                      <Text style={styles.priceText}>
                        {(currency === 'USD' ? item.priceUSD : item.priceGHS).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>

                  <View style={styles.itemMeta}>
                    <Text style={styles.itemCondition}>{item.condition}</Text>
                    <Text style={styles.itemDate}>
                      {new Date(item.datePosted).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEdit(item)}
                    >
                      <Edit2 size={16} color="#10B981" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDelete(item.id, item.name)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
    backgroundColor: '#F8F9FC',
  },
  headerGradient: {
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  currencyToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#10B981',
  },
  currencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  currencyButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  itemsGrid: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  itemContent: {
    padding: 16,
  },
  itemName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  priceText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginLeft: 4,
  },
  itemQuantity: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 12,
  },
  itemCondition: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  itemDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
  },
});
