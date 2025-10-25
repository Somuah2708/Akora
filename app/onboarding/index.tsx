import { View, Text, StyleSheet, Image } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { SplashScreen, useRouter } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function OnboardingScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Navigate to sign-in after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/auth/sign-in');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={{ uri: 'https://pbs.twimg.com/ext_tw_video_thumb/1718554520555249664/pu/img/xfF3Zh9JEM4sc96I.jpg:large' }}
          style={styles.logo}
        />
        <Text style={styles.title}>Welcome to Akora</Text>
        <Text style={styles.subtitle}>Connect with your alumni community</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
});