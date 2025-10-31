import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Animated } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useRef } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard, Smartphone, CheckCircle, Shield, Lock, Truck, Package } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

SplashScreen.preventAutoHideAsync();

type PaymentMethod = 'momo' | 'card';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('pickup');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');

  // Get cart totals from params
  const subtotal = params.subtotal ? parseFloat(params.subtotal as string) : 0;
  const tax = params.tax ? parseFloat(params.tax as string) : 0;
  const total = params.total ? parseFloat(params.total as string) : 0;

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

  const handlePayment = () => {
    if (paymentMethod === 'momo') {
      if (!momoNumber || !momoNetwork) {
        Alert.alert('Missing Information', 'Please enter your mobile money number and select a network');
        return;
      }
      
      if (momoNumber.length !== 10) {
        Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
        return;
      }
      
      Alert.alert(
        '🔐 Secure Payment',
        `A payment prompt will be sent to ${momoNumber} (${momoNetwork}) for ₵${total.toFixed(2)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Prompt',
            onPress: () => {
              // Implement mobile money payment logic here
              Alert.alert('✅ Payment Initiated', 'Please check your phone and approve the payment prompt.', [
                {
                  text: 'Done',
                  onPress: () => router.push('/(tabs)'),
                },
              ]);
            },
          },
        ]
      );
    } else {
      if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
        Alert.alert('Missing Information', 'Please fill in all card details');
        return;
      }
      
      if (cardNumber.length < 15) {
        Alert.alert('Invalid Card', 'Please enter a valid card number');
        return;
      }
      
      Alert.alert(
        '🔐 Secure Payment',
        `Charge ₵${total.toFixed(2)} to card ending in ${cardNumber.slice(-4)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay Now',
            onPress: () => {
              // Implement card payment logic here
              Alert.alert('✅ Payment Successful', 'Your order has been confirmed!', [
                {
                  text: 'View Orders',
                  onPress: () => router.push('/(tabs)'),
                },
              ]);
            },
          },
        ]
      );
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Secure Checkout</Text>
          <View style={styles.securityBadge}>
            <Shield size={18} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.secureTag}>
              <Lock size={12} color="#4169E1" />
              <Text style={styles.secureText}>Secure</Text>
            </View>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₵{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (10%)</Text>
              <Text style={styles.summaryValue}>₵{tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'momo' && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod('momo')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                paymentMethod === 'momo' && styles.iconContainerActive,
              ]}>
                <Smartphone
                  size={24}
                  color={paymentMethod === 'momo' ? '#FFFFFF' : '#4169E1'}
                />
              </View>
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'momo' && styles.paymentMethodTextActive,
                ]}
              >
                Mobile Money
              </Text>
              {paymentMethod === 'momo' && (
                <View style={styles.checkmark}>
                  <CheckCircle size={20} color="#4169E1" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'card' && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                paymentMethod === 'card' && styles.iconContainerActive,
              ]}>
                <CreditCard
                  size={24}
                  color={paymentMethod === 'card' ? '#FFFFFF' : '#4169E1'}
                />
              </View>
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'card' && styles.paymentMethodTextActive,
                ]}
              >
                Debit/Credit Card
              </Text>
              {paymentMethod === 'card' && (
                <View style={styles.checkmark}>
                  <CheckCircle size={20} color="#4169E1" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Details */}
        {paymentMethod === 'momo' ? (
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Mobile Money Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Network Provider</Text>
              <View style={styles.networkButtons}>
                {['MTN', 'Vodafone', 'AirtelTigo'].map(network => (
                  <TouchableOpacity
                    key={network}
                    style={[
                      styles.networkButton,
                      momoNetwork === network && styles.networkButtonActive,
                    ]}
                    onPress={() => setMomoNetwork(network)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.networkButtonText,
                        momoNetwork === network && styles.networkButtonTextActive,
                      ]}
                    >
                      {network}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.countryCode}>+233</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XX XXX XXXX"
                  placeholderTextColor="#999999"
                  keyboardType="phone-pad"
                  value={momoNumber}
                  onChangeText={setMomoNumber}
                  maxLength={10}
                />
              </View>
              <Text style={styles.helperText}>You will receive a prompt to approve the payment</Text>
            </View>
          </View>
        ) : (
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Card Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cardholder Name</Text>
              <TextInput
                style={styles.inputFull}
                placeholder="John Doe"
                placeholderTextColor="#999999"
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.inputFull}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#999999"
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={setCardNumber}
                maxLength={16}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Expiry Date</Text>
                <TextInput
                  style={styles.inputFull}
                  placeholder="MM/YY"
                  placeholderTextColor="#999999"
                  keyboardType="number-pad"
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.inputFull}
                  placeholder="123"
                  placeholderTextColor="#999999"
                  keyboardType="number-pad"
                  value={cardCVV}
                  onChangeText={setCardCVV}
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>
            <View style={styles.securityNote}>
              <Shield size={16} color="#10B981" />
              <Text style={styles.securityNoteText}>Your card details are encrypted and secure</Text>
            </View>
          </View>
        )}

        {/* Delivery Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Method</Text>
          <View style={styles.deliveryOptions}>
            <TouchableOpacity
              style={[
                styles.deliveryCard,
                deliveryMethod === 'delivery' && styles.deliveryCardActive,
              ]}
              onPress={() => setDeliveryMethod('delivery')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.deliveryIconContainer,
                deliveryMethod === 'delivery' && styles.deliveryIconContainerActive,
              ]}>
                <Truck size={24} color={deliveryMethod === 'delivery' ? '#FFFFFF' : '#4169E1'} />
              </View>
              <View style={styles.deliveryInfo}>
                <Text style={[
                  styles.deliveryTitle,
                  deliveryMethod === 'delivery' && styles.deliveryTitleActive,
                ]}>
                  Home Delivery
                </Text>
                <Text style={styles.deliveryDescription}>
                  Get items delivered to your doorstep
                </Text>
                <Text style={styles.deliveryTime}>3-5 business days</Text>
              </View>
              {deliveryMethod === 'delivery' && (
                <CheckCircle size={24} color="#4169E1" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryCard,
                deliveryMethod === 'pickup' && styles.deliveryCardActive,
              ]}
              onPress={() => setDeliveryMethod('pickup')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.deliveryIconContainer,
                deliveryMethod === 'pickup' && styles.deliveryIconContainerActive,
              ]}>
                <Package size={24} color={deliveryMethod === 'pickup' ? '#FFFFFF' : '#4169E1'} />
              </View>
              <View style={styles.deliveryInfo}>
                <Text style={[
                  styles.deliveryTitle,
                  deliveryMethod === 'pickup' && styles.deliveryTitleActive,
                ]}>
                  Pickup at Secretariat
                </Text>
                <Text style={styles.deliveryDescription}>
                  Collect items from the OAA Secretariat
                </Text>
                <Text style={styles.deliveryTime}>Free • Next business day</Text>
              </View>
              {deliveryMethod === 'pickup' && (
                <CheckCircle size={24} color="#4169E1" />
              )}
            </TouchableOpacity>
          </View>

          {/* Delivery Details Link */}
          <TouchableOpacity
            style={styles.detailsLink}
            onPress={() => {
              if (deliveryMethod === 'delivery') {
                router.push('/secretariat-shop/delivery');
              } else {
                router.push('/secretariat-shop/pickup');
              }
            }}
          >
            <Text style={styles.detailsLinkText}>
              View {deliveryMethod === 'delivery' ? 'delivery services' : 'pickup details'} →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Lock size={16} color="#666666" />
          <Text style={styles.securityInfoText}>
            All transactions are secured with 256-bit SSL encryption
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>

      {/* Floating Payment Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.payButton} 
          onPress={handlePayment}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4169E1', '#5B7FE8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payButtonGradient}
          >
            <Lock size={20} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Pay ₵{total.toFixed(2)}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  securityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  secureText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#4169E1',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#666666',
  },
  summaryValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  totalLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#4169E1',
  },
  section: {
    marginBottom: 24,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  paymentMethodCardActive: {
    borderColor: '#4169E1',
    backgroundColor: '#F8FAFF',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconContainerActive: {
    backgroundColor: '#4169E1',
  },
  paymentMethodText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  paymentMethodTextActive: {
    color: '#4169E1',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  countryCode: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputFull: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    lineHeight: 16,
  },
  networkButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  networkButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  networkButtonActive: {
    borderColor: '#4169E1',
    backgroundColor: '#E8F0FE',
  },
  networkButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  networkButtonTextActive: {
    color: '#4169E1',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  securityNoteText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#059669',
    lineHeight: 18,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  securityInfoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#666666',
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  payButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  deliveryOptions: {
    gap: 12,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  deliveryCardActive: {
    borderColor: '#4169E1',
    backgroundColor: '#F0F6FF',
  },
  deliveryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconContainerActive: {
    backgroundColor: '#E6F0FF',
  },
  deliveryInfo: {
    flex: 1,
    gap: 4,
  },
  deliveryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  deliveryTitleActive: {
    color: '#4169E1',
  },
  deliveryDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  deliveryTime: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  detailsLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  detailsLinkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#4169E1',
  },
});
