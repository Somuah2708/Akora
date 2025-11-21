import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type ProductService } from '@/lib/supabase';
import { ArrowLeft, CheckCircle2, Star, Trash2 } from 'lucide-react-native';

export default function AdminMarketplaceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductService[]>([]);

  const isAdmin = (user as any)?.is_admin;

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      Alert.alert('Access denied', 'You must be an admin to view this screen.');
      router.back();
      return;
    }

    const loadItems = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products_services')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        setItems((data as any) || []);
      } catch (err) {
        console.error('Error loading marketplace items for admin', err);
        Alert.alert('Error', 'Could not load marketplace items.');
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [user, isAdmin, router]);

  const toggleApproved = async (item: ProductService) => {
    try {
      const next = !item.is_approved;
      const { error } = await supabase
        .from('products_services')
        .update({ is_approved: next })
        .eq('id', item.id);

      if (error) throw error;
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_approved: next } : p))
      );
    } catch (err) {
      console.error('Error toggling approval', err);
      Alert.alert('Error', 'Could not update approval status.');
    }
  };

  const toggleFeatured = async (item: ProductService) => {
    try {
      const next = !item.is_featured;
      const { error } = await supabase
        .from('products_services')
        .update({ is_featured: next })
        .eq('id', item.id);

      if (error) throw error;
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, is_featured: next } : p))
      );
    } catch (err) {
      console.error('Error toggling featured', err);
      Alert.alert('Error', 'Could not update featured status.');
    }
  };

  const deleteItem = (item: ProductService) => {
    Alert.alert(
      'Delete listing',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products_services')
                .delete()
                .eq('id', item.id);

              if (error) throw error;
              setItems((prev) => prev.filter((p) => p.id !== item.id));
            } catch (err) {
              console.error('Error deleting listing', err);
              Alert.alert('Error', 'Could not delete listing.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#020617" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Marketplace Admin</Text>
          <Text style={styles.headerSubtitle}>Manage products & services listings</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <Text style={styles.helperText}>Loading listings...</Text>
        ) : items.length === 0 ? (
          <Text style={styles.helperText}>No listings found.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardPrice} numberOfLines={1}>
                  {item.price != null ? `GHS ${item.price}` : 'Price on request'}
                </Text>
              </View>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {(item as any).category_name || 'No category'}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                ID: {item.id}
              </Text>

              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.badge,
                    item.is_approved ? styles.badgeApproved : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.is_approved ? styles.badgeTextApproved : styles.badgeTextPending,
                    ]}
                  >
                    {item.is_approved ? 'Approved' : 'Pending'}
                  </Text>
                </View>
                {item.is_featured && (
                  <View style={[styles.badge, styles.badgeFeatured]}>
                    <Text style={[styles.badgeText, styles.badgeTextFeatured]}>Featured</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleApproved(item)}
                >
                  <CheckCircle2
                    size={16}
                    color={item.is_approved ? '#16A34A' : '#6B7280'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.actionText}>
                    {item.is_approved ? 'Unapprove' : 'Approve'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleFeatured(item)}
                >
                  <Star
                    size={16}
                    color={item.is_featured ? '#F59E0B' : '#6B7280'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.actionText}>
                    {item.is_featured ? 'Unfeature' : 'Feature'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteItem(item)}
                >
                  <Trash2 size={16} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginRight: 8,
  },
  cardPrice: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#16A34A',
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeApproved: {
    backgroundColor: '#DCFCE7',
  },
  badgePending: {
    backgroundColor: '#FEFCE8',
  },
  badgeFeatured: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  badgeTextApproved: {
    color: '#166534',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeTextFeatured: {
    color: '#92400E',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deleteText: {
    color: '#DC2626',
  },
});
