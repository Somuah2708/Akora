import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Calendar, Chrome as Home } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

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

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [house, setHouse] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHouseDropdown, setShowHouseDropdown] = useState(false);
  
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

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Generate a username from first name and surname
      const username = `${firstName.toLowerCase()}.${surname.toLowerCase()}`;
      const fullName = `${firstName} ${surname}`;
      
      const { data, error } = await signUp(
        email.trim(),
        password,
        username,
        fullName,
        firstName.trim(),
        surname.trim(),
        classGroup.trim(),
        yearGroup.trim(),
        house
      );
      
      if (error) throw error;
      
      Alert.alert(
        'Sign Up Successful',
        'Your account has been created. Please check your email for verification.',
        [{ text: 'OK', onPress: () => router.replace('/auth/sign-in') }]
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
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
        
        <View style={styles.inputContainer}>
          <User size={20} color="#666666" />
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#666666"
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
            value={surname}
            onChangeText={setSurname}
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
          onPress={() => router.push('/auth/sign-in')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
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
    color: '#4169E1',
    fontFamily: 'Inter-SemiBold',
  },
  termsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  signUpButton: {
    backgroundColor: '#4169E1',
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
    color: '#4169E1',
  },
});