import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Dimensions, Modal, Alert } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, FileText, Download, Clock, Mail, Search, Filter, ChevronRight, Bell, CircleCheck as CheckCircle, CircleAlert as AlertCircle, CircleHelp as HelpCircle, Star, Send, X, User, MapPin, Phone } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

const TRANSCRIPT_TYPES = [
  {
    id: '1',
    title: 'Official Transcript',
    description: 'Sealed and certified academic record',
    price: '₵80.00',
    processingTime: '3-5 business days',
  },
  {
    id: '2',
    title: 'Digital Transcript',
    description: 'Secure electronic delivery',
    price: '₵15.00',
    processingTime: '1-2 business days',
  },
  {
    id: '3',
    title: 'Express Service',
    description: 'Expedited processing and delivery',
    price: '₵40.00',
    processingTime: '24 hours',
  },
];

const RECENT_REQUESTS = [
  {
    id: '1',
    type: 'Official Transcript',
    requestDate: 'March 15, 2024',
    status: 'Processing',
    deliveryMethod: 'Mail',
    trackingNumber: 'TRK123456789',
  },
  {
    id: '2',
    type: 'Digital Transcript',
    requestDate: 'March 10, 2024',
    status: 'Completed',
    deliveryMethod: 'Email',
    recipient: 'university@example.com',
  },
];

const RECOMMENDATIONS = [
  {
    id: '1',
    title: 'Academic Recommendation',
    description: 'For graduate school applications',
    status: 'Available',
    lastUpdated: 'March 1, 2024',
  },
  {
    id: '2',
    title: 'Professional Recommendation',
    description: 'For employment purposes',
    status: 'Pending',
    lastUpdated: 'March 5, 2024',
  },
];

export default function TranscriptsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('transcripts');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    graduationYear: '',
    deliveryAddress: '',
    phoneNumber: '',
    email: '',
    additionalNotes: '',
  });
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  const handleRequestClick = (transcript: any) => {
    setSelectedTranscript(transcript);
    setShowRequestModal(true);
  };

  const handleSubmitRequest = () => {
    // Validate form
    if (!formData.fullName || !formData.studentId || !formData.email) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    // Submit logic here
    Alert.alert(
      'Request Submitted', 
      `Your ${selectedTranscript?.title} request has been submitted successfully. You will receive a confirmation email shortly.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowRequestModal(false);
            setFormData({
              fullName: '',
              studentId: '',
              graduationYear: '',
              deliveryAddress: '',
              phoneNumber: '',
              email: '',
              additionalNotes: '',
            });
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Academic Records</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'transcripts' && styles.activeTab]}
          onPress={() => setActiveTab('transcripts')}
        >
          <Text style={[styles.tabText, activeTab === 'transcripts' && styles.activeTabText]}>
            Transcripts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            Recommendations
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'transcripts' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Transcript</Text>
            <View style={styles.transcriptTypesGrid}>
              {TRANSCRIPT_TYPES.map((type) => (
                <TouchableOpacity key={type.id} style={styles.transcriptTypeCard}>
                  <FileText size={24} color="#4169E1" />
                  <Text style={styles.typeTitle}>{type.title}</Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                  <View style={styles.typeDetails}>
                    <Text style={styles.typePrice}>{type.price}</Text>
                    <View style={styles.processingTime}>
                      <Clock size={12} color="#666666" />
                      <Text style={styles.processingTimeText}>{type.processingTime}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.requestButton}
                    onPress={() => handleRequestClick(type)}
                  >
                    <Text style={styles.requestButtonText}>Request</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Requests</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color="#666666" />
              </TouchableOpacity>
            </View>
            {RECENT_REQUESTS.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestType}>
                    <FileText size={20} color="#4169E1" />
                    <Text style={styles.requestTypeText}>{request.type}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: request.status === 'Completed' ? '#E4FFF4' : '#FFF4E4' }
                  ]}>
                    {request.status === 'Completed' ? (
                      <CheckCircle size={14} color="#10B981" />
                    ) : (
                      <Clock size={14} color="#F59E0B" />
                    )}
                    <Text style={[
                      styles.statusText,
                      { color: request.status === 'Completed' ? '#10B981' : '#F59E0B' }
                    ]}>{request.status}</Text>
                  </View>
                </View>
                <View style={styles.requestDetails}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#666666" />
                    <Text style={styles.detailText}>Requested: {request.requestDate}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    {request.deliveryMethod === 'Mail' ? (
                      <>
                        <Send size={14} color="#666666" />
                        <Text style={styles.detailText}>Tracking: {request.trackingNumber}</Text>
                      </>
                    ) : (
                      <>
                        <Mail size={14} color="#666666" />
                        <Text style={styles.detailText}>Sent to: {request.recipient}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.helpCard}>
              <HelpCircle size={24} color="#4169E1" />
              <Text style={styles.helpTitle}>Need Assistance?</Text>
              <Text style={styles.helpText}>
                Contact our academic records office for help with transcript requests
              </Text>
              <TouchableOpacity style={styles.contactButton}>
                <Text style={styles.contactButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {RECOMMENDATIONS.map((recommendation) => (
            <View key={recommendation.id} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Star size={20} color="#FFB800" />
                <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
              </View>
              <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
              <View style={styles.recommendationFooter}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: recommendation.status === 'Available' ? '#E4FFF4' : '#FFF4E4' }
                ]}>
                  {recommendation.status === 'Available' ? (
                    <CheckCircle size={14} color="#10B981" />
                  ) : (
                    <Clock size={14} color="#F59E0B" />
                  )}
                  <Text style={[
                    styles.statusText,
                    { color: recommendation.status === 'Available' ? '#10B981' : '#F59E0B' }
                  ]}>{recommendation.status}</Text>
                </View>
                <View style={styles.lastUpdated}>
                  <Clock size={14} color="#666666" />
                  <Text style={styles.lastUpdatedText}>Updated: {recommendation.lastUpdated}</Text>
                </View>
              </View>
              {recommendation.status === 'Available' && (
                <TouchableOpacity style={styles.downloadButton}>
                  <Download size={16} color="#FFFFFF" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Request Form Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Request {selectedTranscript?.title}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowRequestModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Total Cost:</Text>
                <Text style={styles.priceValue}>{selectedTranscript?.price}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <User size={20} color="#666666" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({...formData, fullName: text})}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Student ID <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <FileText size={20} color="#666666" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your student ID"
                    value={formData.studentId}
                    onChangeText={(text) => setFormData({...formData, studentId: text})}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Graduation Year</Text>
                <View style={styles.inputContainer}>
                  <Clock size={20} color="#666666" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 2024"
                    value={formData.graduationYear}
                    onChangeText={(text) => setFormData({...formData, graduationYear: text})}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#666666" />
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Phone size={20} color="#666666" />
                  <TextInput
                    style={styles.input}
                    placeholder="+233 XX XXX XXXX"
                    value={formData.phoneNumber}
                    onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Delivery Address</Text>
                <View style={styles.inputContainer}>
                  <MapPin size={20} color="#666666" />
                  <TextInput
                    style={styles.input}
                    placeholder="Street address, City"
                    value={formData.deliveryAddress}
                    onChangeText={(text) => setFormData({...formData, deliveryAddress: text})}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Additional Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any special instructions or requests..."
                  value={formData.additionalNotes}
                  onChangeText={(text) => setFormData({...formData, additionalNotes: text})}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.processingInfo}>
                <Clock size={16} color="#4169E1" />
                <Text style={styles.processingInfoText}>
                  Processing Time: {selectedTranscript?.processingTime}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmitRequest}
              >
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  notificationButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
  },
  activeTab: {
    borderBottomColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  activeTabText: {
    color: '#4169E1',
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  transcriptTypesGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  transcriptTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  typeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  typeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePrice: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  processingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  processingTimeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  requestButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestTypeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  requestDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  helpCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  helpTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  contactButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  recommendationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  recommendationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 12,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastUpdatedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  formScroll: {
    paddingHorizontal: 20,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  priceValue: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  processingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  processingInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});