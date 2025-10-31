import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Eye, EyeOff, User, GraduationCap, Calendar, Chrome as Home, MapPin, Phone, Mail } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [house, setHouse] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Occupation fields
  const [occupationStatus, setOccupationStatus] = useState<'student' | 'employed' | 'self_employed' | 'unemployed' | 'other'>('student');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Education fields
  const [educationLevel, setEducationLevel] = useState<'high_school' | 'undergraduate' | 'postgraduate' | 'doctorate' | 'other'>('undergraduate');
  const [institutionName, setInstitutionName] = useState('');
  const [programOfStudy, setProgramOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  
  // Visibility settings
  const [isClassPublic, setIsClassPublic] = useState(false);
  const [isYearGroupPublic, setIsYearGroupPublic] = useState(false);
  const [isHousePublic, setIsHousePublic] = useState(false);
  const [isContactPublic, setIsContactPublic] = useState(false);
  const [isOccupationPublic, setIsOccupationPublic] = useState(false);
  const [isEducationPublic, setIsEducationPublic] = useState(false);
  const [receivesNotifications, setReceivesNotifications] = useState(true);
  const [themePreference, setThemePreference] = useState('light');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setClassGroup(data.class || '');
        setYearGroup(data.year_group || '');
        setHouse(data.house || '');
        setPhone(data.phone || '');
        setLocation(data.location || '');
        setAvatarUrl(data.avatar_url || null);
        
        // Set occupation fields
        setOccupationStatus(data.occupation_status || 'student');
        setJobTitle(data.job_title || '');
        setCompanyName(data.company_name || '');
        
        // Set education fields
        setEducationLevel(data.education_level || 'undergraduate');
        setInstitutionName(data.institution_name || '');
        setProgramOfStudy(data.program_of_study || '');
        setGraduationYear(data.graduation_year?.toString() || '');
        
        // Set visibility preferences
        setIsClassPublic(data.is_class_public || false);
        setIsYearGroupPublic(data.is_year_group_public || false);
        setIsHousePublic(data.is_house_public || false);
        setIsContactPublic(data.is_contact_public || false);
        setIsOccupationPublic(data.is_occupation_public || false);
        setIsEducationPublic(data.is_education_public || false);
        setReceivesNotifications(data.receives_notifications !== false); // Default to true
        setThemePreference(data.theme_preference || 'light');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need camera roll permissions to upload a profile photo');
          return;
        }
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        await uploadImage(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      
      // For web, we need to convert the image to a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate a unique file name
      const fileExt = uri.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update avatar URL in state
      setAvatarUrl(data.publicUrl);
      
      Alert.alert('Success', 'Profile photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }
    
    if (!username.trim() || !fullName.trim()) {
      Alert.alert('Error', 'Username and full name are required');
      return;
    }
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          full_name: fullName.trim(),
          class: classGroup.trim(),
          year_group: yearGroup.trim(),
          house: house.trim(),
          phone: phone.trim(),
          location: location.trim(),
          avatar_url: avatarUrl,
          // Occupation fields
          occupation_status: occupationStatus,
          job_title: jobTitle.trim(),
          company_name: companyName.trim(),
          // Education fields
          education_level: educationLevel,
          institution_name: institutionName.trim(),
          program_of_study: programOfStudy.trim(),
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          // Visibility settings
          is_class_public: isClassPublic,
          is_year_group_public: isYearGroupPublic,
          is_house_public: isHousePublic,
          is_contact_public: isContactPublic,
          is_occupation_public: isOccupationPublic,
          is_education_public: isEducationPublic,
          receives_notifications: receivesNotifications,
          theme_preference: themePreference,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.push('/grow') }
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>You must be logged in to edit your profile</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/grow')}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color="#CCCCCC" />
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.changePhotoButton}
              onPress={pickImage}
              disabled={uploading}
            >
              <Camera size={16} color="#4169E1" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#666666"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#666666"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Class</Text>
                <View style={styles.visibilityToggle}>
                  <Text style={styles.visibilityText}>Public</Text>
                  <Switch
                    value={isClassPublic}
                    onValueChange={setIsClassPublic}
                    trackColor={{ false: '#767577', true: '#4169E1' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <GraduationCap size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="Class (e.g., Science, Arts, Business)"
                  placeholderTextColor="#666666"
                  value={classGroup}
                  onChangeText={setClassGroup}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Year Group</Text>
                <View style={styles.visibilityToggle}>
                  <Text style={styles.visibilityText}>Public</Text>
                  <Switch
                    value={isYearGroupPublic}
                    onValueChange={setIsYearGroupPublic}
                    trackColor={{ false: '#767577', true: '#4169E1' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Calendar size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="Year Group (e.g., 2010)"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  value={yearGroup}
                  onChangeText={setYearGroup}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>House</Text>
                <View style={styles.visibilityToggle}>
                  <Text style={styles.visibilityText}>Public</Text>
                  <Switch
                    value={isHousePublic}
                    onValueChange={setIsHousePublic}
                    trackColor={{ false: '#767577', true: '#4169E1' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Home size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="House (e.g., Livingstone, Aggrey)"
                  placeholderTextColor="#666666"
                  value={house}
                  onChangeText={setHouse}
                />
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <Text style={styles.sectionTitle}>Occupation</Text>
            <View style={styles.visibilityNote}>
              <Text style={styles.visibilityNoteText}>
                Share your current occupation status and work details
              </Text>
              <View style={styles.visibilityToggle}>
                <Text style={styles.visibilityText}>Public</Text>
                <Switch
                  value={isOccupationPublic}
                  onValueChange={setIsOccupationPublic}
                  trackColor={{ false: '#767577', true: '#4169E1' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Status',
                      'Choose your current occupation status',
                      [
                        { text: 'Student', onPress: () => setOccupationStatus('student') },
                        { text: 'Employed', onPress: () => setOccupationStatus('employed') },
                        { text: 'Self-Employed', onPress: () => setOccupationStatus('self_employed') },
                        { text: 'Unemployed', onPress: () => setOccupationStatus('unemployed') },
                        { text: 'Other', onPress: () => setOccupationStatus('other') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Text style={styles.pickerButtonText}>
                    {occupationStatus === 'student' ? 'Student' :
                     occupationStatus === 'employed' ? 'Employed' :
                     occupationStatus === 'self_employed' ? 'Self-Employed' :
                     occupationStatus === 'unemployed' ? 'Unemployed' : 'Other'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {(occupationStatus === 'employed' || occupationStatus === 'self_employed') && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Job Title</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color="#666666" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Software Engineer, Manager"
                      placeholderTextColor="#666666"
                      value={jobTitle}
                      onChangeText={setJobTitle}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Company/Organization</Text>
                  <View style={styles.inputContainer}>
                    <Home size={20} color="#666666" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Google, Ministry of Health"
                      placeholderTextColor="#666666"
                      value={companyName}
                      onChangeText={setCompanyName}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.sectionDivider} />

            <Text style={styles.sectionTitle}>Education</Text>
            <View style={styles.visibilityNote}>
              <Text style={styles.visibilityNoteText}>
                Share your educational background and program
              </Text>
              <View style={styles.visibilityToggle}>
                <Text style={styles.visibilityText}>Public</Text>
                <Switch
                  value={isEducationPublic}
                  onValueChange={setIsEducationPublic}
                  trackColor={{ false: '#767577', true: '#4169E1' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Education Level</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Level',
                      'Choose your current or highest education level',
                      [
                        { text: 'High School', onPress: () => setEducationLevel('high_school') },
                        { text: 'Undergraduate', onPress: () => setEducationLevel('undergraduate') },
                        { text: 'Postgraduate', onPress: () => setEducationLevel('postgraduate') },
                        { text: 'Doctorate', onPress: () => setEducationLevel('doctorate') },
                        { text: 'Other', onPress: () => setEducationLevel('other') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Text style={styles.pickerButtonText}>
                    {educationLevel === 'high_school' ? 'High School' :
                     educationLevel === 'undergraduate' ? 'Undergraduate' :
                     educationLevel === 'postgraduate' ? 'Postgraduate' :
                     educationLevel === 'doctorate' ? 'Doctorate' : 'Other'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Institution Name</Text>
              <View style={styles.inputContainer}>
                <GraduationCap size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., University of Ghana, Achimota School"
                  placeholderTextColor="#666666"
                  value={institutionName}
                  onChangeText={setInstitutionName}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Program of Study</Text>
              <View style={styles.inputContainer}>
                <GraduationCap size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Computer Science, Medicine, Business"
                  placeholderTextColor="#666666"
                  value={programOfStudy}
                  onChangeText={setProgramOfStudy}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Graduation Year</Text>
              <View style={styles.inputContainer}>
                <Calendar size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2025"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  maxLength={4}
                  value={graduationYear}
                  onChangeText={setGraduationYear}
                />
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.visibilityNote}>
              <Text style={styles.visibilityNoteText}>
                Toggle "Public" to make your contact information visible to other users
              </Text>
              <View style={styles.visibilityToggle}>
                <Text style={styles.visibilityText}>Public</Text>
                <Switch
                  value={isContactPublic}
                  onValueChange={setIsContactPublic}
                  trackColor={{ false: '#767577', true: '#4169E1' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#666666"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#666666" />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={user.email}
                  editable={false}
                />
              </View>
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="Location (e.g., Accra, Ghana)"
                  placeholderTextColor="#666666"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <Text style={styles.sectionTitle}>Preferences</Text>

            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Receive Notifications</Text>
              <Switch
                value={receivesNotifications}
                onValueChange={setReceivesNotifications}
                trackColor={{ false: '#767577', true: '#4169E1' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Dark Mode</Text>
              <Switch
                value={themePreference === 'dark'}
                onValueChange={(value) => setThemePreference(value ? 'dark' : 'light')}
                trackColor={{ false: '#767577', true: '#4169E1' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </ScrollView>
      )}
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
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FF4444',
    textAlign: 'center',
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changePhotoText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  formSection: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    marginLeft: 12,
  },
  disabledInput: {
    color: '#A0AEC0',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 4,
    marginLeft: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  visibilityNote: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  visibilityNoteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginRight: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  preferenceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  pickerContainer: {
    marginTop: 4,
  },
  pickerButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
});