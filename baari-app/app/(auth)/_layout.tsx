import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSession } from '../../store/session';

export default function AuthLayout() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated && token) {
      router.replace('/(tabs)/home');
    }
  }, [isHydrated, token]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
