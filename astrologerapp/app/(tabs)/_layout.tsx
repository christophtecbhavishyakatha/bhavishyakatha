import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
         tabBarStyle: {
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: "#000000",
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
        }}
      />
            <Tabs.Screen
        name="bank-details"
        options={{
          title: 'Profile',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
        }}
      />
                  <Tabs.Screen
        name="support"
        options={{
          title: 'Profile',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Profile',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: 'Photos',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />
       <Tabs.Screen
        name="chatList"
        options={{
          title: 'Photos',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />
       <Tabs.Screen
        name="chatroom"
        options={{
          title: 'Photos',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />
         <Tabs.Screen
        name="withdrawalHistory"
        options={{
          title: 'Photos',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />      

        <Tabs.Screen
        name="QuickMessage"
        options={{
          title: 'Photos',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />  

              <Tabs.Screen
        name="feedback"
        options={{
          title: 'Photos',
          href: null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="photo.fill" color={color} />,
        }}
      />       
    </Tabs>
  );
}
