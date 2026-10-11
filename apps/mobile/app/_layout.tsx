import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from '../store/session';
import { useSocket } from '../lib/socket';
import { useNotificationObserver } from '../lib/notifications';
import { OfflineBanner } from '../components/ui/OfflineBanner';

// Prevent native splash screen from auto-hiding before fonts and session are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    },
    mutations: {
      retry: 3,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const hydrate = useSession((state) => state.hydrate);
  const isHydrated = useSession((state) => state.isHydrated);

  // Mount socket lifecycle manager hook (connects non-blocking in background)
  useSocket();

  // Mount push notification response observer hook
  useNotificationObserver();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isHydrated]);

  if (!fontsLoaded || !isHydrated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </QueryClientProvider>
  );
}
