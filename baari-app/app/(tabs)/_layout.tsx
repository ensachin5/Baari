import React, { useEffect } from 'react';
import { Tabs, useRouter, Redirect } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../lib/theme';
import { CheckCircle2, Wallet, Zap, User } from 'lucide-react-native';
import { useSession } from '../../store/session';

export default function TabsLayout() {
  const router = useRouter();
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.mutedNavy,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          ...Typography.Caption,
          fontWeight: '600',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Kaam',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
              <CheckCircle2
                size={20}
                color={focused ? Colors.navy : color}
                strokeWidth={focused ? 2.3 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="expense"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
              <Wallet
                size={20}
                color={focused ? Colors.navy : color}
                strokeWidth={focused ? 2.3 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
              <Zap
                size={20}
                color={focused ? Colors.navy : color}
                strokeWidth={focused ? 2.3 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && styles.tabIconActive]}>
              <User
                size={20}
                color={focused ? Colors.navy : color}
                strokeWidth={focused ? 2.3 : 1.8}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: Colors.paleSky,
  },
});
