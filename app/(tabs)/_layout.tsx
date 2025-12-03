import { Tabs } from 'expo-router';
import { Home, LayoutGrid, MessageSquare, Compass, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useMemo, useCallback } from 'react';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Memoize tab bar style to prevent recalculation
  const tabBarStyle = useMemo(() => ({
    backgroundColor: '#0F172A',
    borderTopWidth: 0,
    height: Platform.OS === 'android' ? 75 + insets.bottom : 70 + insets.bottom,
    paddingBottom: insets.bottom + (Platform.OS === 'android' ? 6 : 4),
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  }), [insets.bottom]);
  
  const tabBarLabelStyle = useMemo(() => ({
    fontSize: Platform.OS === 'android' ? 10.5 : 11,
    fontFamily: 'Inter-SemiBold',
    marginTop: Platform.OS === 'android' ? 3 : 2,
    marginBottom: Platform.OS === 'android' ? 0 : 2,
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  }), []);
  
  const tabBarIconStyle = useMemo(() => ({
    marginTop: Platform.OS === 'android' ? 0 : 2,
  }), []);
  
  // Memoize icon renderers
  const renderHomeIcon = useCallback(({ color }: { color: string }) => 
    <Home size={24} color={color} strokeWidth={2.5} />, []);
  const renderHubIcon = useCallback(({ color }: { color: string }) => 
    <LayoutGrid size={24} color={color} strokeWidth={2.5} />, []);
  const renderDiscoverIcon = useCallback(({ color }: { color: string }) => 
    <Compass size={24} color={color} strokeWidth={2.5} />, []);
  const renderChatIcon = useCallback(({ color }: { color: string }) => 
    <MessageSquare size={24} color={color} strokeWidth={2.5} />, []);
  const renderProfileIcon = useCallback(({ color }: { color: string }) => 
    <User size={24} color={color} strokeWidth={2.5} />, []);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#ffc857',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarLabelStyle,
        tabBarIconStyle,
        tabBarHideOnKeyboard: Platform.OS === 'android',
        // Android: instant switching like Instagram (no lazy, no animation)
        // iOS: keep smooth animations
        lazy: Platform.OS === 'ios',
        animation: Platform.OS === 'ios' ? 'shift' : 'none',
        freezeOnBlur: Platform.OS === 'android',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tabs.Screen
        name="hub"
        options={{
          title: 'Hub',
          tabBarIcon: renderHubIcon,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: renderDiscoverIcon,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: renderChatIcon,
        }}
      />
      <Tabs.Screen
        name="grow"
        options={{
          title: 'Profile',
          unmountOnBlur: Platform.OS === 'ios',
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tabs>
  );
}