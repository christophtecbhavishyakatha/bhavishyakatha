import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Admin Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
    <Tabs.Screen
  name="pendingAstrologer"
  options={{
    title: 'Pending Astrologers',
    href: null,
    headerShown: true,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="verified"
  options={{
    title: 'Verified Astrologers',
    href: null,
    headerShown: true,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="ticket"
  options={{
    title: 'View Tickets',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="social-posts"
  options={{
    title: 'Social Posts',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>

  <Tabs.Screen
  name="walletBalance"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="rechargeLogs"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="callLogs"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="users"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
  <Tabs.Screen
  name="astrologerLogs"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>

 <Tabs.Screen
  name="notification"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>

 <Tabs.Screen
  name="comment"
  options={{
    title: '',
    href: null,
    headerShown: false,
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>
    </Tabs>
  );
}
