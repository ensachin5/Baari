import React, { useEffect } from 'react';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { Colors, Typography } from '../../lib/theme';
import { CheckSquare, Receipt, Activity, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSession } from '../../store/session';
import { useAuthSession } from '../../lib/auth-client';

export default function TabsLayout() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);
  const { data: authSession, isPending: isAuthPending } = useAuthSession();

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

  if (isHydrated && !isAuthPending && !authSession) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.grayBlack,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          ...Typography.Caption,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expense"
        options={{
          title: 'Expense',
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
