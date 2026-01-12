import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Calendar, Chrome as Home, MapPin, Phone, Briefcase, Building, ArrowLeft, Camera } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase, capitalizeName, AVATAR_BUCKET } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

SplashScreen.preventAutoHideAsync();

// House options for dropdown
const HOUSES = [
  // Male Houses
  'Aggrey House',
  'Guggisberg House',
  'Gyamfi House',
  'Cadbury House',
  'Lugard House',
  'Livingstone House',
  'Fraser House',
  'Kwapong House',
  // Female Houses
  'Kingsley House',
  'McCarthy House',
  'Slessor House',
  'Clark House',
  'Ofori-Atta House',
  'Baeta-Jiagge House',
  'Stopford House',
  'Atta Mills House',
  'Joyce Aryee House',
  'Other'
];

// Occupation status options
const OCCUPATION_STATUS_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'other', label: 'Other' },
];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  // Required Form state
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [otherNames, setOtherNames] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [house, setHouse] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Optional Form state
  const [occupationStatus, setOccupationStatus] = useState('student');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [programOfStudy, setProgramOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [currentStudyYear, setCurrentStudyYear] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  
  // Avatar state
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHouseDropdown, setShowHouseDropdown] = useState(false);
  const [showOccupationDropdown, setShowOccupationDropdown] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const validateForm = () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return false;
    }
    
    if (!surname.trim()) {
      setError('Please enter your surname');
      return false;
    }
    
    if (!classGroup.trim()) {
      setError('Please enter your class');
      return false;
    }
    
    if (!yearGroup.trim()) {
      setError('Please enter your year group');
      return false;
    }
    
    if (!house) {
      setError('Please select your house');
      return false;
    }
    
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }
    
    if (!password) {
      setError('Please enter a password');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  // Pick profile photo from gallery
  const pickImage = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need photo library access to set a profile photo');
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
        setAvatarUri(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Upload avatar to Supabase storage (called during signup)
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarUri) return null;
    
    try {
      setIsUploadingAvatar(true);
      
      // Use expo-file-system to read file as base64
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      const base64 = await readAsStringAsync(avatarUri, { encoding: 'base64' });
      
      // Determine file extension from URI or default to jpg
      const uriParts = avatarUri.split('.');
      const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      
      // Decode base64 to ArrayBuffer for upload
      const { decode } = await import('base64-arraybuffer');
      const arrayBuffer = decode(base64);
      
      const filePath = `${userId}/${Date.now()}.${ext}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, arrayBuffer, { upsert: true, contentType: mime });
      
      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return null;
      }
      
      // Get the public URL
      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Capitalize names properly
      const capitalizedFirstName = capitalizeName(firstName.trim());
      const capitalizedSurname = capitalizeName(surname.trim());
      const capitalizedOtherNames = capitalizeName(otherNames.trim());
      
      // Generate a username from first name and surname
      const username = `${firstName.toLowerCase().trim()}.${surname.toLowerCase().trim()}`;
      // Full name includes other names if provided
      const fullName = capitalizedOtherNames 
        ? `${capitalizedFirstName} ${capitalizedOtherNames} ${capitalizedSurname}`
        : `${capitalizedFirstName} ${capitalizedSurname}`;
      
      // First create the account
      const { data, error } = await signUp(
        email.trim(),
        password,
        username,
        fullName,
        capitalizedFirstName,
        capitalizedSurname,
        capitalizedOtherNames,
        classGroup.trim(),
        yearGroup.trim(),
        house,
        // Optional fields
        occupationStatus,
        jobTitle.trim(),
        companyName.trim(),
        institutionName.trim(),
        programOfStudy.trim(),
        graduationYear.trim(),
        currentStudyYear.trim(),
        location.trim(),
        phone.trim(),
        bio.trim()
      );
      
      if (error) throw error;
      
      // If user selected an avatar, upload it after account creation
      if (avatarUri && data?.user?.id) {
        const uploadedAvatarUrl = await uploadAvatar(data.user.id);
        if (uploadedAvatarUrl) {
          // Update profile with avatar URL
          await supabase
            .from('profiles')
            .update({ avatar_url: uploadedAvatarUrl })
            .eq('id', data.user.id);
        }
      }
      
      Alert.alert(
        'Sign Up Successful',
        'Your account has been created. Please check your email for verification.',
        [{ text: 'OK', onPress: () => debouncedRouter.replace('/auth/sign-in') }]
      );
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.keyboardAvoid} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => debouncedRouter.back()}
        >
          <ArrowLeft size={24} color="#0F172A" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the Akora community</Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        {/* Profile Photo Picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={pickImage}
            disabled={isUploadingAvatar}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera size={32} color="#666666" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarText}>Add Profile Photo</Text>
          <Text style={styles.avatarSubtext}>(Optional)</Text>
        </View>
        
        <View style={styles.inputContainer}>
          <User size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#666666"
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <User size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Surname"
            placeholderTextColor="#666666"
            autoCapitalize="words"
            value={surname}
            onChangeText={setSurname}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <User size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Other Names (Optional)"
            placeholderTextColor="#666666"
            autoCapitalize="words"
            value={otherNames}
            onChangeText={setOtherNames}
          />
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
        
        <View style={styles.inputContainer}>
          <Home size={20} color="#666666" />
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowHouseDropdown(!showHouseDropdown)}
          >
            <Text style={house ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
              {house || 'Select House'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showHouseDropdown && (
          <View style={styles.dropdown}>
            {HOUSES.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.dropdownItem}
                onPress={() => {
                  setHouse(item);
                  setShowHouseDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  house === item && styles.dropdownItemTextSelected
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={styles.sectionHeader}>Optional Information</Text>
        
        <View style={styles.inputContainer}>
          <Briefcase size={20} color="#666666" />
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowOccupationDropdown(!showOccupationDropdown)}
          >
            <Text style={occupationStatus ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
              {OCCUPATION_STATUS_OPTIONS.find(opt => opt.value === occupationStatus)?.label || 'Select Status'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showOccupationDropdown && (
          <View style={styles.dropdown}>
            {OCCUPATION_STATUS_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setOccupationStatus(item.value);
                  setShowOccupationDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  occupationStatus === item.value && styles.dropdownItemTextSelected
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {(occupationStatus === 'employed' || occupationStatus === 'self_employed') && (
          <>
            <View style={styles.inputContainer}>
              <Briefcase size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Job Title (Optional)"
                placeholderTextColor="#666666"
                value={jobTitle}
                onChangeText={setJobTitle}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Building size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Company Name (Optional)"
                placeholderTextColor="#666666"
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>
          </>
        )}
        
        {occupationStatus === 'student' && (
          <>
            <View style={styles.inputContainer}>
              <GraduationCap size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Institution Name (Optional)"
                placeholderTextColor="#666666"
                value={institutionName}
                onChangeText={setInstitutionName}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <GraduationCap size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Program of Study (Optional)"
                placeholderTextColor="#666666"
                value={programOfStudy}
                onChangeText={setProgramOfStudy}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Calendar size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Current Study Year (Optional)"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                value={currentStudyYear}
                onChangeText={setCurrentStudyYear}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Calendar size={20} color="#666666" />
              <TextInput
                style={styles.input}
                placeholder="Expected Graduation Year (Optional)"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                value={graduationYear}
                onChangeText={setGraduationYear}
              />
            </View>
          </>
        )}
        
        <View style={styles.inputContainer}>
          <MapPin size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Current Location (e.g., Accra)"
            placeholderTextColor="#666666"
            value={location}
            onChangeText={setLocation}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Phone size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Phone Number (Optional)"
            placeholderTextColor="#666666"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        
        <View style={[styles.inputContainer, styles.bioContainer]}>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Bio (Optional)"
            placeholderTextColor="#666666"
            multiline
            numberOfLines={3}
            value={bio}
            onChangeText={setBio}
          />
        </View>
        
        <Text style={styles.sectionHeader}>Account Details</Text>
        
        <View style={styles.inputContainer}>
          <Mail size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Lock size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666666"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#666666" />
            ) : (
              <Eye size={20} color="#666666" />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Lock size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#666666"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color="#666666" />
            ) : (
              <Eye size={20} color="#666666" />
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.termsText}>
          By signing up, you agree to our Terms of Service and Privacy Policy
        </Text>
        
        <TouchableOpacity 
          style={[
            styles.signUpButton,
            isSubmitting && styles.signUpButtonDisabled
          ]}
          onPress={handleSignUp}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.signUpButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => debouncedRouter.push('/auth/sign-in')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 60,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  form: {
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginTop: 8,
  },
  avatarSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#FFE4E4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
    marginLeft: 12,
  },
  eyeButton: {
    padding: 8,
  },
  dropdownButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    marginLeft: 12,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  dropdownSelectedText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  dropdownItemTextSelected: {
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 12,
  },
  bioContainer: {
    alignItems: 'flex-start',
    minHeight: 100,
    paddingTop: 16,
    paddingBottom: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  termsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  signUpButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  signUpButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  signInButton: {
    marginLeft: 8,
  },
  signInButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
});