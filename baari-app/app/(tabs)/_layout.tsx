import React, { useEffect } from 'react';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { Colors, Typography } from '../../lib/theme';
import { House, Wallet, Zap, User } from 'lucide-react-native';
import { useSession } from '../../store/session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    if (!token) {
      router.replace('/(auth)/sign-in');
    } else if (!activeFlat) {
      router.replace('/(onboarding)/choose');
    }
  }, [isHydrated, token, activeFlat]);

  // Reactive guard: if signed out, immediately return Redirect
  if (isHydrated && !token) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.mutedNavy,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 54 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          ...Typography.Caption,
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <House
              size={22}
              color={focused ? Colors.navy : color}
              strokeWidth={focused ? 2.3 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="expense"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) => (
            <Wallet
              size={22}
              color={focused ? Colors.navy : color}
              strokeWidth={focused ? 2.3 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <Zap
              size={22}
              color={focused ? Colors.navy : color}
              strokeWidth={focused ? 2.3 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User
              size={22}
              color={focused ? Colors.navy : color}
              strokeWidth={focused ? 2.3 : 1.8}
            />
          ),
        }}
      />
    </Tabs>
  );
}
