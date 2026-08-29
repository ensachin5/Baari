import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { Colors } from '../../lib/theme';

export default function OnboardingLayout() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);
  const isHydrated = useSession((state) => state.isHydrated);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    let isMounted = true;
    async function checkExistingFlat() {
      try {
        const data = await api.get<{ flat: any }>('/api/flats/me');
        if (data?.flat) {
          setActiveFlat({
            id: data.flat.id,
            name: data.flat.name,
            inviteCode: data.flat.inviteCode,
            role: data.flat.role,
          });
          router.replace('/(tabs)/home');
          return;
        }
      } catch (_) {
        // Not in a flat or error, remain in onboarding
      } finally {
        if (isMounted) setChecking(false);
      }
    }

    checkExistingFlat();
    return () => {
      isMounted = false;
    };
  }, [isHydrated]);

  if (!isHydrated || checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.navy} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="choose" />
      <Stack.Screen name="create-flat" />
      <Stack.Screen name="join-flat" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
