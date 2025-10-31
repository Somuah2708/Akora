import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@secretariat_shop_cart';
const CART_VIEWED_KEY = '@secretariat_cart_viewed';
const FAVORITES_STORAGE_KEY = '@secretariat_shop_favorites';

export interface SecretariatCartItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'GHS';
  image: string;
  category: string;
  quantity: number;
}

// Get all cart items
export const getCartItems = async (): Promise<SecretariatCartItem[]> => {
  try {
    const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error('Error getting cart items:', error);
    return [];
  }
};

// Add item to cart
export const addToCart = async (product: Omit<SecretariatCartItem, 'quantity'>): Promise<SecretariatCartItem[]> => {
  try {
    const cartItems = await getCartItems();
    const existingItemIndex = cartItems.findIndex(item => item.productId === product.productId);

    if (existingItemIndex > -1) {
      // Item exists, increment quantity
      cartItems[existingItemIndex].quantity += 1;
    } else {
      // New item, add to cart
      cartItems.push({ ...product, quantity: 1 });
    }

    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    return cartItems;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return [];
  }
};

// Update item quantity
export const updateCartItemQuantity = async (itemId: string, quantity: number): Promise<SecretariatCartItem[]> => {
  try {
    const cartItems = await getCartItems();
    const updatedItems = cartItems.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    );

    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedItems));
    return updatedItems;
  } catch (error) {
    console.error('Error updating cart item:', error);
    return [];
  }
};

// Remove item from cart
export const removeFromCart = async (itemId: string): Promise<SecretariatCartItem[]> => {
  try {
    const cartItems = await getCartItems();
    const updatedItems = cartItems.filter(item => item.id !== itemId);

    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedItems));
    return updatedItems;
  } catch (error) {
    console.error('Error removing from cart:', error);
    return [];
  }
};

// Clear all cart items
export const clearCart = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
};

// Get cart count
export const getCartCount = async (): Promise<number> => {
  try {
    const cartItems = await getCartItems();
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  } catch (error) {
    console.error('Error getting cart count:', error);
    return 0;
  }
};

// Get cart total
export const getCartTotal = async (): Promise<number> => {
  try {
    const cartItems = await getCartItems();
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  } catch (error) {
    console.error('Error calculating cart total:', error);
    return 0;
  }
};

// Mark cart as viewed
export const markCartAsViewed = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(CART_VIEWED_KEY, 'true');
  } catch (error) {
    console.error('Error marking cart as viewed:', error);
  }
};

// Check if cart has been viewed
export const hasCartBeenViewed = async (): Promise<boolean> => {
  try {
    const viewed = await AsyncStorage.getItem(CART_VIEWED_KEY);
    return viewed === 'true';
  } catch (error) {
    console.error('Error checking cart viewed status:', error);
    return false;
  }
};

// Reset cart viewed status (call when new item is added)
export const resetCartViewedStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CART_VIEWED_KEY);
  } catch (error) {
    console.error('Error resetting cart viewed status:', error);
  }
};

// Get favorite product IDs
export const getFavorites = async (): Promise<string[]> => {
  try {
    const favoritesData = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    return favoritesData ? JSON.parse(favoritesData) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

// Toggle favorite status for a product
export const toggleFavorite = async (productId: string): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    const isFavorite = favorites.includes(productId);
    
    let updatedFavorites: string[];
    if (isFavorite) {
      // Remove from favorites
      updatedFavorites = favorites.filter(id => id !== productId);
    } else {
      // Add to favorites
      updatedFavorites = [...favorites, productId];
    }
    
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
    return !isFavorite; // Return new favorite status
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
};

// Check if a product is favorited
export const isFavorite = async (productId: string): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    return favorites.includes(productId);
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};
