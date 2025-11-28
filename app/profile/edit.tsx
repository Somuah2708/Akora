import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Switch, Platform, Modal, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SplashScreen, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Trash2, User, GraduationCap, Calendar, Chrome as Home, MapPin, Phone, Mail, Link as LinkIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase, AVATAR_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);

  // Track initial snapshot to warn on unsaved changes
  const [initialSnapshot, setInitialSnapshot] = useState<any | null>(null);
  
  // Form state
  // Usernames removed – we only use full names
  const [fullName, setFullName] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [house, setHouse] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Social links
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  
  // Occupation fields
  const [occupationStatus, setOccupationStatus] = useState<'student' | 'employed' | 'self_employed' | 'unemployed' | 'other'>('student');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentStudyYear, setCurrentStudyYear] = useState('');
  
  // Education fields
  const [educationLevel, setEducationLevel] = useState<'high_school' | 'undergraduate' | 'postgraduate' | 'doctorate' | 'other'>('undergraduate');
  const [institutionName, setInstitutionName] = useState('');
  const [programOfStudy, setProgramOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  
  // Visibility settings
  const [receivesNotifications, setReceivesNotifications] = useState(true);
  
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
        setFullName(data.full_name || '');
        setClassGroup(data.class || '');
        setYearGroup(data.year_group || '');
        setHouse(data.house || '');
        setPhone(data.phone || '');
        setLocation(data.location || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || null);
  // Social links
  setWebsiteUrl((data as any).website_url || '');
  setLinkedinUrl((data as any).linkedin_url || '');
  setTwitterUrl((data as any).twitter_url || '');
  setInstagramUrl((data as any).instagram_url || '');
  setFacebookUrl((data as any).facebook_url || '');
        
  // Set occupation fields (normalize legacy 'worker' to 'employed')
  setOccupationStatus((data.occupation_status === 'worker' ? 'employed' : data.occupation_status) || 'student');
        setJobTitle(data.job_title || '');
        setCompanyName(data.company_name || '');
        
        // Set education fields
        setEducationLevel(data.education_level || 'undergraduate');
        setInstitutionName(data.institution_name || '');
        setProgramOfStudy(data.program_of_study || '');
        setGraduationYear(data.graduation_year?.toString() || '');
  setCurrentStudyYear((data as any).current_study_year?.toString?.() || '');
        
        setReceivesNotifications(data.receives_notifications !== false); // Default to true

        // Capture initial snapshot for unsaved changes detection
        setInitialSnapshot({
          fullName: data.full_name || '',
          classGroup: data.class || '',
          yearGroup: data.year_group || '',
          house: data.house || '',
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || '',
          avatarUrl: data.avatar_url || null,
          websiteUrl: (data as any).website_url || '',
          linkedinUrl: (data as any).linkedin_url || '',
          twitterUrl: (data as any).twitter_url || '',
          instagramUrl: (data as any).instagram_url || '',
          facebookUrl: (data as any).facebook_url || '',
          occupationStatus: data.occupation_status || 'student',
          jobTitle: data.job_title || '',
          companyName: data.company_name || '',
          educationLevel: data.education_level || 'undergraduate',
          institutionName: data.institution_name || '',
          programOfStudy: data.program_of_study || '',
          graduationYear: data.graduation_year?.toString() || '',
          currentStudyYear: (data as any).current_study_year?.toString?.() || '',
          receivesNotifications: data.receives_notifications !== false,
        });
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
        ...(Platform.OS === 'android' && {
          presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
        }),
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
      
      // Use expo-file-system to read file as base64 (works on mobile)
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      
      // Determine file extension from URI or default to jpg
      const uriParts = uri.split('.');
      const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      
      // Decode base64 to ArrayBuffer for upload
      const { decode } = await import('base64-arraybuffer');
      const arrayBuffer = decode(base64);
      
      const filePath = `${user?.id}/${Date.now()}.${ext}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, arrayBuffer, { upsert: true, contentType: mime });
      
      if (uploadError) {
        // Provide clearer guidance if the bucket doesn't exist
        if ((uploadError as any)?.message?.toLowerCase?.().includes('bucket not found')) {
          Alert.alert(
            'Storage Bucket Missing',
            `The storage bucket "${AVATAR_BUCKET}" was not found. Please create it in Supabase Storage or set EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET to an existing bucket.`,
          );
        }
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
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
    
    // Basic validation
    const fullNameTrim = fullName.trim();
    if (!fullNameTrim) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    if (graduationYear && !/^\d{4}$/.test(graduationYear)) {
      Alert.alert('Invalid year', 'Graduation year must be a 4-digit year, e.g., 2025.');
      return;
    }
    if (occupationStatus === 'student' && currentStudyYear && !/^\d{1,2}$/.test(currentStudyYear)) {
      Alert.alert('Invalid current year', 'Current study year must be a number (e.g., 1, 2, 3).');
      return;
    }
    
    // Simple URL normalize + validate
    const normalizeUrl = (v: string) => {
      let s = (v || '').trim();
      if (!s) return '';
      if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
      try {
        // Will throw if invalid
        new URL(s);
        return s;
      } catch {
        return '';
      }
    };

  const normalizedWebsite = normalizeUrl(websiteUrl);
  const normalizedLinkedin = normalizeUrl(linkedinUrl);
  const normalizedTwitter = normalizeUrl(twitterUrl);
  const normalizedInstagram = normalizeUrl(instagramUrl);
  const normalizedFacebook = normalizeUrl(facebookUrl);

    // If user typed something invalid (doesn't parse as URL even after scheme add), block save
    if (websiteUrl.trim() && !normalizedWebsite) {
      Alert.alert('Invalid website URL', 'Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    if (linkedinUrl.trim() && !normalizedLinkedin) {
      Alert.alert('Invalid LinkedIn URL', 'Please enter a valid URL (e.g., https://linkedin.com/in/username)');
      return;
    }
    if (twitterUrl.trim() && !normalizedTwitter) {
      Alert.alert('Invalid Twitter URL', 'Please enter a valid URL (e.g., https://twitter.com/username)');
      return;
    }
    if (instagramUrl.trim() && !normalizedInstagram) {
      Alert.alert('Invalid Instagram URL', 'Please enter a valid URL (e.g., https://instagram.com/username)');
      return;
    }
    if (facebookUrl.trim() && !normalizedFacebook) {
      Alert.alert('Invalid Facebook URL', 'Please enter a valid URL (e.g., https://facebook.com/username)');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullNameTrim,
          class: classGroup.trim(),
          year_group: yearGroup.trim(),
          house: house.trim(),
          phone: phone.trim(),
          location: location.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim(),
          // Social links
          website_url: normalizedWebsite || null,
          linkedin_url: normalizedLinkedin || null,
          twitter_url: normalizedTwitter || null,
          instagram_url: normalizedInstagram || null,
          facebook_url: normalizedFacebook || null,
          // Occupation fields
          occupation_status: occupationStatus,
          job_title: jobTitle.trim(),
          company_name: companyName.trim(),
          // Education fields
          education_level: educationLevel,
          institution_name: institutionName.trim(),
          program_of_study: programOfStudy.trim(),
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          current_study_year: currentStudyYear ? parseInt(currentStudyYear) : null,
          // Visibility settings
          receives_notifications: receivesNotifications,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      // Reset initial snapshot after successful save
      setInitialSnapshot({
        fullName: fullNameTrim,
        classGroup: classGroup.trim(),
        yearGroup: yearGroup.trim(),
        house: house.trim(),
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatarUrl,
        websiteUrl: normalizedWebsite || '',
        linkedinUrl: normalizedLinkedin || '',
        twitterUrl: normalizedTwitter || '',
  instagramUrl: normalizedInstagram || '',
  facebookUrl: normalizedFacebook || '',
        occupationStatus,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        educationLevel,
        institutionName: institutionName.trim(),
        programOfStudy: programOfStudy.trim(),
        graduationYear,
        currentStudyYear,
        receivesNotifications,
      });

      Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.push('/grow') }]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = () => {
    if (!initialSnapshot) return false;
    const current = {
      fullName,
      classGroup,
      yearGroup,
      house,
      phone,
      location,
      bio,
      avatarUrl,
      occupationStatus,
      jobTitle,
      companyName,
      educationLevel,
      institutionName,
      programOfStudy,
      graduationYear,
      currentStudyYear,
      receivesNotifications,
      websiteUrl,
      linkedinUrl,
      twitterUrl,
      instagramUrl,
      facebookUrl,
    };
    try {
      return JSON.stringify(current) !== JSON.stringify(initialSnapshot);
    } catch {
      return true;
    }
  };

  const handleBack = () => {
    if (saving) return;
    if (isDirty()) {
      Alert.alert('Discard changes?', 'You have unsaved changes. Do you want to discard them?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.push('/grow') },
      ]);
      return;
    }
    router.push('/grow');
  };

  const removeAvatar = () => {
    if (!avatarUrl) return;
    Alert.alert('Remove photo?', 'This will remove your current profile photo.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAvatarUrl(null) },
    ]);
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
      {/* Avatar Preview Modal */}
      <Modal
        transparent
        visible={avatarPreviewVisible}
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <TouchableOpacity style={styles.imageFullOverlay} activeOpacity={1} onPress={() => setAvatarPreviewVisible(false)}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width, height }}
              resizeMode="contain"
            />
          ) : (
            <View style={[{ width, height }, styles.avatarPlaceholder]} />
          )}
        </TouchableOpacity>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
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
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Avatar Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile Photo</Text>
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={() => avatarUrl && setAvatarPreviewVisible(true)}>
                <View style={styles.avatarContainer}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <User size={40} color="#FFFFFF" />
                    </View>
                  )}
                  {uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.avatarActions}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  <Camera size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Change Photo</Text>
                </TouchableOpacity>
                {avatarUrl && (
                  <TouchableOpacity style={styles.dangerButton} onPress={removeAvatar}>
                    <Trash2 size={16} color="#FFFFFF" />
                    <Text style={styles.dangerButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Bio Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bio</Text>
            <View style={[styles.inputContainer, { alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
                placeholder="Tell others about you"
                placeholderTextColor="#666666"
                multiline
                maxLength={240}
                value={bio}
                onChangeText={setBio}
              />
            </View>
            <Text style={styles.helperText}>{bio.length}/240</Text>
          </View>

          {/* About Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
          <View style={styles.formGroup}>
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
              <Text style={styles.label}>Class</Text>
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
              <Text style={styles.label}>Year Group</Text>
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
              <Text style={styles.label}>House</Text>
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
          </View>
          </View>

          {/* Occupation Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Occupation</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.segmentedContainer}>
                {[{k:'student',l:'Student'}, {k:'employed',l:'Worker'}, {k:'self_employed',l:'Self-Employed'}, {k:'unemployed',l:'Unemployed'}, {k:'other',l:'Other'}].map((opt:any) => (
                  <TouchableOpacity
                    key={opt.k}
                    style={[styles.segmentedOption, occupationStatus === opt.k && styles.segmentedOptionSelected]}
                    onPress={() => setOccupationStatus(opt.k)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.segmentedLabel, occupationStatus === opt.k && styles.segmentedLabelSelected]}>
                      {opt.l}
                    </Text>
                  </TouchableOpacity>
                ))}
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

            {/* Close Occupation Card */}
          </View>

            {/* Education Card (only when Student) */}
            {occupationStatus === 'student' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Education</Text>

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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Year</Text>
              <View style={styles.inputContainer}>
                <GraduationCap size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  maxLength={2}
                  value={currentStudyYear}
                  onChangeText={setCurrentStudyYear}
                />
              </View>
            </View>

            {/* Close Education Card */}
          </View>
          )}

            {/* Contact Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Information</Text>

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

          </View>

          {/* Interests Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interests</Text>
            <Text style={styles.helperText}>Manage the topics that personalize your feed and profile chips.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/discover?openInterestModal=1')}
            >
              <Text style={styles.primaryButtonText}>Edit Interests</Text>
            </TouchableOpacity>
          </View>

          {/* Links Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Links (optional)</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Website</Text>
              <View style={styles.inputContainer}>
                <LinkIcon size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com"
                  placeholderTextColor="#666666"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>LinkedIn</Text>
              <View style={styles.inputContainer}>
                <LinkIcon size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="https://linkedin.com/in/username"
                  placeholderTextColor="#666666"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={linkedinUrl}
                  onChangeText={setLinkedinUrl}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Twitter</Text>
              <View style={styles.inputContainer}>
                <LinkIcon size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="https://twitter.com/username"
                  placeholderTextColor="#666666"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={twitterUrl}
                  onChangeText={setTwitterUrl}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Instagram</Text>
              <View style={styles.inputContainer}>
                <LinkIcon size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="https://instagram.com/username"
                  placeholderTextColor="#666666"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={instagramUrl}
                  onChangeText={setInstagramUrl}
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Facebook</Text>
              <View style={styles.inputContainer}>
                <LinkIcon size={20} color="#666666" />
                <TextInput
                  style={styles.input}
                  placeholder="https://facebook.com/username"
                  placeholderTextColor="#666666"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={facebookUrl}
                  onChangeText={setFacebookUrl}
                />
              </View>
            </View>
            <Text style={styles.helperText}>We’ll show these as small link pills on your profile.</Text>
          </View>

          {/* Preferences Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preferences</Text>
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Receive Notifications</Text>
              <Switch
                value={receivesNotifications}
                onValueChange={setReceivesNotifications}
                trackColor={{ false: '#767577', true: '#000000' }}
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
    backgroundColor: '#000000',
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
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#000000',
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
  segmentedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentedOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  segmentedOptionSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  segmentedLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  segmentedLabelSelected: {
    color: '#FFFFFF',
  },
  // Cards & Layout
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  dangerButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  // Modal preview styles
  imageFullOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
});