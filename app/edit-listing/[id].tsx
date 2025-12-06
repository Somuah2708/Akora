import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, SplashScreen } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Trash2, Save, CheckCircle, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

const CATEGORIES = [
  { id: '1', name: 'Business Services' },
  { id: '2', name: 'Education & Tutoring' },
  { id: '3', name: 'Technical Services' },
  { id: '4', name: 'Creative & Design' },
  { id: '5', name: 'Food & Catering' },
  { id: '6', name: 'Healthcare' },
  { id: '7', name: 'Publishing' },
  { id: '8', name: 'Photography' },
  { id: '9', name: 'Home Services' },
  { id: '10', name: 'Automotive' },
  { id: '11', name: 'Fashion & Beauty' },
  { id: '12', name: 'Fitness & Sports' },
  { id: '13', name: 'Hair & Salon' },
  { id: '14', name: 'Pet Care' },
  { id: '15', name: 'Entertainment' },
  { id: '16', name: 'Construction' },
  { id: '17', name: 'Electronics' },
  { id: '18', name: 'Furniture' },
  { id: '19', name: 'Clothing & Apparel' },
  { id: '20', name: 'Watches & Jewelry' },
  { id: '21', name: 'Bags & Accessories' },
  { id: '22', name: 'Books & Stationery' },
  { id: '23', name: 'Beauty Products' },
  { id: '24', name: 'Baby & Kids' },
  { id: '25', name: 'Kitchen & Dining' },
];

export default function EditListing() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [location, setLocation] = useState('');
  const [localImages, setLocalImages] = useState<string[]>([]);

  // Education-specific fields
  const [applicationUrl, setApplicationUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingCurrency, setFundingCurrency] = useState<'USD' | 'GHS'>('USD');

  // Alumni mentor fields
  const [mentorHeadline, setMentorHeadline] = useState('');
  const [mentorLinkedInUrl, setMentorLinkedInUrl] = useState('');
  const [mentorWebsiteUrl, setMentorWebsiteUrl] = useState('');
  const [mentorCompany, setMentorCompany] = useState('');
  const [mentorRole, setMentorRole] = useState('');
  const [mentorTimezone, setMentorTimezone] = useState('');
  const [mentorAvailability, setMentorAvailability] = useState('');
  const [mentorMeetingFormats, setMentorMeetingFormats] = useState<string[]>([]); // ['Chat','Audio','Video']
  const [mentorLanguages, setMentorLanguages] = useState(''); // comma separated
  const [mentorExpertise, setMentorExpertise] = useState(''); // comma separated
  const [mentorIsProBono, setMentorIsProBono] = useState(false);
  const [mentorRate, setMentorRate] = useState('');
  const [mentorMaxMentees, setMentorMaxMentees] = useState('');

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!id) return;
    fetchListing(id as string);
  }, [id]);

  const fetchListing = async (listingId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) throw error;

      setListing(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      if (data.price && typeof data.price === 'string') {
        if (data.price.startsWith('USD')) {
          setCurrency('USD');
          setPrice(data.price.replace(/^USD\s*/, ''));
        } else if (data.price.startsWith('GHS')) {
          setCurrency('GHS');
          setPrice(data.price.replace(/^GHS\s*/, ''));
        } else {
          setCurrency('GHS');
          setPrice(data.price);
        }
      } else {
        setCurrency('GHS');
        setPrice(data.price != null ? String(data.price) : '');
      }
  setCategory(data.category_name || '');
      
      // Handle image_url which might be JSON array or string
      if (data.image_url) {
        try {
          const parsed = JSON.parse(data.image_url);
          if (Array.isArray(parsed)) {
            setLocalImages(parsed);
            setImageUrl('');
          } else {
            setImageUrl(data.image_url);
          }
        } catch {
          setImageUrl(data.image_url);
        }
      }

      // Prefill education fields if present on record
      if (data.application_url || data.application_link) {
        setApplicationUrl((data.application_url || data.application_link) as string);
      }
  if (data.website_url) setWebsiteUrl(String(data.website_url));
  if (data.funding_amount != null) setFundingAmount(String(data.funding_amount));
  if (data.funding_currency) setFundingCurrency(String(data.funding_currency) === 'GHS' ? 'GHS' : 'USD');
  if (data.deadline_date) setDeadlineDate(String(data.deadline_date));
  else if (data.deadline_text) setDeadlineDate(String(data.deadline_text));
      if (data.eligibility_criteria) setEligibility(String(data.eligibility_criteria));
      if (data.contact_email) setContactEmail(String(data.contact_email));
      if (data.location) setLocation(String(data.location));

      // Prefill mentor fields
      if (data.mentor_headline) setMentorHeadline(String(data.mentor_headline));
      if (data.mentor_linkedin_url) setMentorLinkedInUrl(String(data.mentor_linkedin_url));
      if (data.mentor_website_url) setMentorWebsiteUrl(String(data.mentor_website_url));
      if (data.mentor_company) setMentorCompany(String(data.mentor_company));
      if (data.mentor_role) setMentorRole(String(data.mentor_role));
      if (data.mentor_timezone) setMentorTimezone(String(data.mentor_timezone));
      if (data.mentor_availability) setMentorAvailability(String(data.mentor_availability));
      if (Array.isArray(data.mentor_meeting_formats)) setMentorMeetingFormats(data.mentor_meeting_formats as string[]);
      if (Array.isArray(data.mentor_languages)) setMentorLanguages((data.mentor_languages as string[]).join(', '));
      if (Array.isArray(data.mentor_expertise)) setMentorExpertise((data.mentor_expertise as string[]).join(', '));
      if (typeof data.mentor_is_pro_bono === 'boolean') setMentorIsProBono(!!data.mentor_is_pro_bono);
      if (data.mentor_rate != null) setMentorRate(String(data.mentor_rate));
      if (data.mentor_max_mentees != null) setMentorMaxMentees(String(data.mentor_max_mentees));
    } catch (err) {
      console.error('Failed to fetch listing', err);
      Alert.alert('Error', 'Failed to load listing');
      debouncedRouter.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const uris = result.assets.map(asset => asset.uri);
      setLocalImages(uris);
      setImageUrl('');
    }
  };

  const handleSave = async () => {
    console.log('💾 Save button clicked');
    
    if (!listing) return;
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to edit listings');
      return;
    }

    const isAdmin = !!(profile?.is_admin || profile?.role === 'admin');
    // Ensure user owns the listing, unless admin
    if (listing.user_id !== user.id && !isAdmin) {
      Alert.alert('Forbidden', 'You can only edit your own listings');
      return;
    }

    const isEducation = category === 'Universities' || category === 'Scholarships';
    const isMentor = category === 'Alumni Mentors';
    const isListing = !isEducation && !isMentor;
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (isEducation) {
      if (!applicationUrl.trim()) {
        Alert.alert('Error', 'Please provide the Application Link');
        return;
      }
    } else if (isListing) {
      if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) {
        Alert.alert('Error', 'Please enter a valid price (or 0 for free)');
        return;
      }
    }

    try {
      setSaving(true);
      let finalImageUrls: string[] = [];
      if (localImages.length > 0) {
        finalImageUrls = localImages;
      } else if (imageUrl.trim()) {
        finalImageUrls = [imageUrl.trim()];
      }
          // Filter out blob URLs
          const validImageUrls = finalImageUrls.filter(url => url && !url.startsWith('blob:'));
          const isEducationUpdate = category === 'Universities' || category === 'Scholarships';
          const isMentorUpdate = category === 'Alumni Mentors';
          const updates: any = {
            title: title.trim(),
            description: description.trim(),
            category_name: category,
            image_url: validImageUrls.length > 0 ? JSON.stringify(validImageUrls) : null,
          };
          if (isEducationUpdate) {
            updates.application_url = applicationUrl.trim();
            // Persist website_url if provided (requires DB migration adding website_url TEXT)
            if (websiteUrl.trim()) updates.website_url = websiteUrl.trim();
            else updates.website_url = null;
            updates.contact_email = contactEmail.trim() || null;
            updates.location = location.trim() || null;
            // Validate deadline_date: only save if it's a valid ISO date (YYYY-MM-DD)
            // If not valid, store as deadline_text so it can still display in UI
            const dd = deadlineDate.trim();
            if (dd) {
              const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
              if (isoDateRegex.test(dd)) {
                const testDate = new Date(dd);
                if (!isNaN(testDate.getTime())) {
                  updates.deadline_date = dd; // TIMESTAMPTZ will parse YYYY-MM-DD
                  updates.deadline_text = null;
                } else {
                  updates.deadline_text = dd;
                  updates.deadline_date = null;
                }
              } else {
                updates.deadline_text = dd;
                updates.deadline_date = null;
              }
            } else {
              // If cleared, null out both fields
              updates.deadline_date = null;
              updates.deadline_text = null;
            }
            if (eligibility.trim()) updates.eligibility_criteria = eligibility.trim();
            if (category === 'Scholarships') {
              if (fundingAmount.trim()) {
                const amt = Number(fundingAmount.replace(/[^0-9.]/g, ''));
                if (!Number.isNaN(amt)) updates.funding_amount = amt;
              } else {
                updates.funding_amount = null;
              }
              updates.funding_currency = fundingCurrency;
            }
          } else if (isMentorUpdate) {
            updates.contact_email = contactEmail.trim() || null;
            updates.location = location.trim() || null;
            updates.mentor_headline = mentorHeadline.trim() || null;
            updates.mentor_linkedin_url = mentorLinkedInUrl.trim() || null;
            updates.mentor_website_url = mentorWebsiteUrl.trim() || null;
            updates.mentor_company = mentorCompany.trim() || null;
            updates.mentor_role = mentorRole.trim() || null;
            updates.mentor_timezone = mentorTimezone.trim() || null;
            updates.mentor_availability = mentorAvailability.trim() || null;
            updates.mentor_meeting_formats = mentorMeetingFormats.length ? mentorMeetingFormats : null;
            updates.mentor_languages = mentorLanguages.trim() ? mentorLanguages.split(',').map(s=>s.trim()).filter(Boolean) : null;
            updates.mentor_expertise = mentorExpertise.trim() ? mentorExpertise.split(',').map(s=>s.trim()).filter(Boolean) : null;
            updates.mentor_is_pro_bono = mentorIsProBono;
            updates.mentor_rate = mentorRate.trim() ? Number(mentorRate) : null;
            updates.mentor_max_mentees = mentorMaxMentees.trim() ? Number(mentorMaxMentees) : null;
          } else {
            // Regular listing (products/services)
            updates.price = Number(price.trim());
            // Note: 'currency' column doesn't exist in products_services schema
            // Store price as-is; UI can display currency separately
          }
          console.log('📝 Updating listing:', updates);
          const { error } = await supabase
            .from('products_services')
            .update(updates)
            .eq('id', listing.id);
          if (error) {
            console.error('Database error:', error);
            throw error;
          }
          Alert.alert('✅ Success!', 'Your listing has been updated successfully!');
          setTimeout(() => {
            if ((isEducationUpdate || isMentorUpdate) && (profile?.is_admin || profile?.role === 'admin')) {
              debouncedRouter.replace('/education/admin');
            } else {
              debouncedRouter.replace('/my-listings');
            }
          }, 500);
    } catch (err) {
      console.error('❌ Failed to update listing', err);
      Alert.alert('Error', 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    console.log('🗑️ Delete button clicked');
    console.log('Listing:', listing);
    console.log('User:', user?.id);
    
    if (!listing) {
      console.log('❌ No listing found');
      return;
    }
    if (!user) {
      console.log('❌ No user found');
      Alert.alert('Authentication Required', 'Please sign in to delete listings');
      return;
    }
    const isAdmin = !!(profile?.is_admin || profile?.role === 'admin');
    if (listing.user_id !== user.id && !isAdmin) {
      console.log('❌ User does not own this listing');
      Alert.alert('Forbidden', 'You can only delete your own listings');
      return;
    }
    
    console.log('✅ All checks passed, showing confirmation dialog');
    
    // Use native confirm for web compatibility
    const confirmed = confirm('⚠️ Delete Listing\n\nAre you sure you want to delete this listing? This action cannot be undone.');
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    // User confirmed, proceed with deletion
    console.log('🗑️ Deleting listing:', listing.id);
    setSaving(true);
    
    (async () => {
      try {
        const { error } = await supabase
          .from('products_services')
          .delete()
          .eq('id', listing.id);
        
        if (error) {
          console.error('❌ Supabase delete error:', error);
          alert(`Error: Failed to delete listing - ${error.message || 'Unknown error'}`);
          return;
        }
        
        console.log('✅ Listing deleted successfully');
        
        // Navigate to my-listings page
        if ((category === 'Universities' || category === 'Scholarships' || category === 'Alumni Mentors') && (profile?.is_admin || profile?.role === 'admin')) {
          debouncedRouter.push('/education/admin');
        } else {
          debouncedRouter.push('/my-listings');
        }
        
        // Show success message after navigation
        setTimeout(() => {
          alert('✅ Success! Your listing has been deleted successfully!');
        }, 500);
        
      } catch (error: any) {
        console.error('❌ Error deleting listing:', error);
        alert(`Error: ${error.message || 'Failed to delete listing'}`);
      } finally {
        setSaving(false);
      }
    })();
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  if (!listing) {
    return null;
  }

  const isEducation = category === 'Universities' || category === 'Scholarships';
  const isMentor = category === 'Alumni Mentors';
  const isListing = !isEducation && !isMentor;
  const isButtonDisabled = !title.trim() || !description.trim() || !category || (isEducation ? !applicationUrl.trim() : isListing ? !price.trim() : false) || saving;

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#4169E1', '#5B7FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => debouncedRouter.push('/my-listings')}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit {isEducation ? (category === 'Universities' ? 'University' : 'Scholarship') : isMentor ? 'Alumni Mentor' : 'Listing'}</Text>
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              isButtonDisabled && styles.submitButtonDisabled
            ]}
            onPress={handleSave}
            disabled={isButtonDisabled}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Save size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Professional Web Design Services"
            placeholderTextColor="#999999"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={isEducation ? 'Describe the opportunity, requirements, and overview...' : 'Describe your product or service in detail...'}
            placeholderTextColor="#999999"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>
        
        {!isEducation && (
        <View style={styles.formGroup}>
          <View style={{backgroundColor:'#F8F9FA',borderRadius:16,padding:18,marginBottom:18,shadowColor:'#4169E1',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:2,borderWidth:1,borderColor:'#E2E8F0'}}>
            <Text style={{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1',marginBottom:10}}>Price *</Text>
            <View style={{flexDirection:'row',gap:12,marginBottom:8,marginTop:4}}>
              <TouchableOpacity style={[styles.currencyButton,currency==='USD'&&styles.currencyButtonActive]} onPress={()=>setCurrency('USD')}>
                <Text style={[{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1'},currency==='USD'&&{color:'#FFFFFF',fontWeight:'bold'}]}>$ USD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.currencyButton,currency==='GHS'&&styles.currencyButtonActive]} onPress={()=>setCurrency('GHS')}>
                <Text style={[{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1'},currency==='GHS'&&{color:'#FFFFFF',fontWeight:'bold'}]}>₵ GHS</Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:12,paddingHorizontal:16,marginTop:8,marginBottom:8,borderWidth:1,borderColor:'#E2E8F0'}}>
              <Text style={{fontSize:22,fontFamily:'Inter-Bold',color:'#4169E1',marginRight:8}}>{currency==='USD'?'$':'₵'}</Text>
              <TextInput style={{flex:1,padding:16,fontSize:18,fontFamily:'Inter-SemiBold',color:'#4169E1',backgroundColor:'#F8F9FA',borderRadius:8}} placeholder="0.00" placeholderTextColor="#999999" keyboardType="decimal-pad" value={price} onChangeText={setPrice}/>
              <Text style={{fontSize:14,color:'#4169E1',marginLeft:8,fontFamily:'Inter-SemiBold'}}>/hour</Text>
            </View>
            <Text style={{fontSize:12,color:'#666666',marginTop:4,fontFamily:'Inter-Regular'}}>Enter the hourly rate in your selected currency</Text>
          </View>
        </View>
        )}

        {isEducation && (
          <>
            {category === 'Scholarships' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Funding Amount (Optional)</Text>
                <View style={{backgroundColor:'#F8F9FA',borderRadius:16,padding:14,marginBottom:10,borderWidth:1,borderColor:'#E2E8F0'}}>
                  <View style={{flexDirection:'row',gap:12,marginBottom:10}}>
                    <TouchableOpacity style={[styles.currencyButton,fundingCurrency==='USD'&&styles.currencyButtonActive]} onPress={()=>setFundingCurrency('USD')}>
                      <Text style={[{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1'},fundingCurrency==='USD'&&{color:'#FFFFFF',fontWeight:'bold'}]}>$ USD</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.currencyButton,fundingCurrency==='GHS'&&styles.currencyButtonActive]} onPress={()=>setFundingCurrency('GHS')}>
                      <Text style={[{fontSize:16,fontFamily:'Inter-SemiBold',color:'#4169E1'},fundingCurrency==='GHS'&&{color:'#FFFFFF',fontWeight:'bold'}]}>₵ GHS</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF',borderRadius:12,paddingHorizontal:16,borderWidth:1,borderColor:'#E2E8F0'}}>
                    <Text style={{fontSize:20,fontFamily:'Inter-Bold',color:'#4169E1',marginRight:8}}>{fundingCurrency==='USD'?'$':'₵'}</Text>
                    <TextInput
                      style={{flex:1,paddingVertical:12,fontSize:16,fontFamily:'Inter-SemiBold',color:'#1F2937'}}
                      placeholder="0.00"
                      placeholderTextColor="#999999"
                      value={fundingAmount}
                      onChangeText={setFundingAmount}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Application Link *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://apply.example.com"
                placeholderTextColor="#999999"
                value={applicationUrl}
                onChangeText={setApplicationUrl}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Website Link (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://www.university.edu"
                placeholderTextColor="#999999"
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Deadline (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2025-12-15)"
                placeholderTextColor="#999999"
                value={deadlineDate}
                onChangeText={setDeadlineDate}
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                Enter a valid date in YYYY-MM-DD format. Other formats will be saved as text.
              </Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Eligibility (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Who can apply, GPA, nationality, etc."
                placeholderTextColor="#999999"
                multiline
                value={eligibility}
                onChangeText={setEligibility}
                textAlignVertical="top"
              />
            </View>
          </>
        )}

        {category === 'Alumni Mentors' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Headline (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Senior Data Engineer at Stripe"
                placeholderTextColor="#999999"
                value={mentorHeadline}
                onChangeText={setMentorHeadline}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>LinkedIn URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://www.linkedin.com/in/username"
                placeholderTextColor="#999999"
                value={mentorLinkedInUrl}
                onChangeText={setMentorLinkedInUrl}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Personal Website (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://your-site.com"
                placeholderTextColor="#999999"
                value={mentorWebsiteUrl}
                onChangeText={setMentorWebsiteUrl}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Company / Organization (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Microsoft"
                placeholderTextColor="#999999"
                value={mentorCompany}
                onChangeText={setMentorCompany}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Role / Title (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Staff Engineer"
                placeholderTextColor="#999999"
                value={mentorRole}
                onChangeText={setMentorRole}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Timezone (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., GMT, UTC+1"
                placeholderTextColor="#999999"
                value={mentorTimezone}
                onChangeText={setMentorTimezone}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Availability (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Weekdays 6–8pm, Sat mornings"
                placeholderTextColor="#999999"
                value={mentorAvailability}
                onChangeText={setMentorAvailability}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meeting Formats (Optional)</Text>
              <View style={{flexDirection:'row', gap:8}}>
                {['Chat','Audio','Video'].map(mode => {
                  const active = mentorMeetingFormats.includes(mode);
                  return (
                    <TouchableOpacity key={mode} style={[styles.currencyButton, active && styles.currencyButtonActive]} onPress={() => setMentorMeetingFormats(prev => active ? prev.filter(m=>m!==mode) : [...prev, mode])}>
                      <Text style={{color: active ? '#FFFFFF' : '#4169E1', fontFamily:'Inter-SemiBold'}}>{mode}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Expertise (Comma-separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., React, Grants, Interview prep"
                placeholderTextColor="#999999"
                value={mentorExpertise}
                onChangeText={setMentorExpertise}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Languages (Comma-separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., English, French"
                placeholderTextColor="#999999"
                value={mentorLanguages}
                onChangeText={setMentorLanguages}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mentoring Type</Text>
              <View style={{flexDirection:'row',gap:8}}>
                <TouchableOpacity style={[styles.currencyButton, mentorIsProBono && styles.currencyButtonActive]} onPress={()=>setMentorIsProBono(true)}>
                  <Text style={{color: mentorIsProBono ? '#FFFFFF':'#4169E1', fontFamily:'Inter-SemiBold'}}>Pro bono</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.currencyButton, !mentorIsProBono && styles.currencyButtonActive]} onPress={()=>setMentorIsProBono(false)}>
                  <Text style={{color: !mentorIsProBono ? '#FFFFFF':'#4169E1', fontFamily:'Inter-SemiBold'}}>Paid</Text>
                </TouchableOpacity>
              </View>
            </View>
            {!mentorIsProBono && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rate (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 20 (per session/hour)"
                  placeholderTextColor="#999999"
                  value={mentorRate}
                  onChangeText={setMentorRate}
                  keyboardType="decimal-pad"
                />
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Max Mentees (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3"
                placeholderTextColor="#999999"
                value={mentorMaxMentees}
                onChangeText={setMentorMaxMentees}
                keyboardType="number-pad"
              />
            </View>
          </>
        )}
        
        {!isEducation && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.name && styles.selectedCategoryChip
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  {category === cat.name && (
                    <CheckCircle size={16} color="#FFFFFF" style={styles.checkIcon} />
                  )}
                  <Text 
                    style={[
                      styles.categoryChipText,
                      category === cat.name && styles.selectedCategoryChipText
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com (optional)"
            placeholderTextColor="#999999"
            value={contactEmail}
            onChangeText={setContactEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {isEducation ? null : (
            <Text style={styles.helperText}>This field is optional and not stored in database</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Accra, Ghana (optional)"
            placeholderTextColor="#999999"
            value={location}
            onChangeText={setLocation}
          />
          {isEducation ? null : (
            <Text style={styles.helperText}>This field is optional and not stored in database</Text>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Images</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
              <ImageIcon size={20} color="#4169E1" />
              <Text style={{ color: '#4169E1', fontFamily: 'Inter-SemiBold' }}>Upload Images</Text>
            </TouchableOpacity>
            <View style={styles.imageUrlContainer}>
              <ImageIcon size={20} color="#666666" />
              <TextInput
                style={styles.imageUrlInput}
                placeholder="Or paste image URL"
                placeholderTextColor="#999999"
                value={imageUrl}
                onChangeText={setImageUrl}
                autoCapitalize="none"
              />
            </View>
          </View>
          
          {(localImages.length > 0 || imageUrl) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {localImages.map((uri, index) => (
                <Image 
                  key={index} 
                  source={{ uri }} 
                  style={styles.imagePreview} 
                  onError={() => Alert.alert('Invalid Image', 'The selected image is not valid.')}
                />
              ))}
              {!localImages.length && imageUrl && (
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.imagePreview} 
                  onError={() => Alert.alert('Invalid Image', 'The image URL is not valid.')}
                />
              )}
            </View>
          )}
        </View>

        {/* Large Save Button */}
        <TouchableOpacity 
          style={[
            styles.submitButtonLarge,
            isButtonDisabled && styles.submitButtonLargeDisabled
          ]}
          onPress={handleSave}
          disabled={isButtonDisabled}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isButtonDisabled 
              ? ['#CBD5E1', '#CBD5E1'] 
              : ['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonLargeText}>Saving Changes...</Text>
              </>
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonLargeText}>Save Changes</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity 
          style={styles.deleteButtonLarge}
          onPress={() => {
            console.log('👆 Delete button touch detected');
            handleDelete();
          }}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Delete Listing</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  currencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 2,
  },
  currencyButtonActive: {
    backgroundColor: '#4169E1',
    borderWidth: 2,
    borderColor: '#4169E1',
  },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  headerGradient: { paddingTop: 50, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  submitButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20, padding: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  formContainer: { flex: 1, padding: 20 },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#1F2937', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: 'Inter-Regular', color: '#111827' },
  textArea: { height: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter-Regular', marginTop: 4, textAlign: 'right' },
  helperText: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter-Regular', marginTop: 4 },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16 },
  currencySymbol: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#4169E1', marginRight: 8 },
  priceInput: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: 'Inter-Regular', color: '#111827' },
  categoriesContainer: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedCategoryChip: { backgroundColor: '#4169E1', borderColor: '#4169E1' },
  categoryChipText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#6B7280' },
  selectedCategoryChipText: { color: '#FFFFFF' },
  checkIcon: { marginRight: 4 },
  imagePickerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  imageUrlContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  imageUrlInput: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', color: '#111827' },
  imagePreview: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F3F4F6' },
  submitButtonLarge: { marginTop: 24, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  submitButtonLargeDisabled: { opacity: 0.5 },
  submitButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 24 },
  submitButtonLargeText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter-Bold' },
  deleteButtonLarge: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, backgroundColor: '#FEF2F2', borderRadius: 16, borderWidth: 2, borderColor: '#FEE2E2' },
  deleteButtonText: { color: '#EF4444', fontSize: 16, fontFamily: 'Inter-SemiBold' },
  bottomPadding: { height: 40 },
});
