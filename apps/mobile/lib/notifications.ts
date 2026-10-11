import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { api } from './api';
import { useSession } from '../store/session';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Safely require expo-notifications only outside Expo Go to prevent module load exception
function getNotificationsModule() {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

const Notifications = getNotificationsModule();

// Configure foreground notification presentation
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (_) {}
}

/**
 * Register for Expo Push Notifications and upload the push token to the backend.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('[Notifications] Starting registerForPushNotificationsAsync on Platform:', Platform.OS);

  if (isExpoGo || !Notifications) {
    console.log('[Notifications] Push notifications disabled in Expo Go (requires development build / standalone binary)');
    return null;
  }

  try {
    // 1. Check existing permission status
    const perm: any = await Notifications.getPermissionsAsync();
    console.log('[Notifications Permission] Current permission status:', JSON.stringify(perm, null, 2));
    let isGranted = perm.granted || perm.status === 'granted';

    // 2. Request permission if not already granted
    if (!isGranted) {
      console.log('[Notifications Permission] Permission not granted yet. Prompting user with requestPermissionsAsync()...');
      const req: any = await Notifications.requestPermissionsAsync();
      console.log('[Notifications Permission] Permission prompt response:', JSON.stringify(req, null, 2));
      isGranted = req.granted || req.status === 'granted';
    }

    if (!isGranted) {
      console.warn('[Notifications Permission] User denied or dismissed push notification permission.');
      return null;
    }

    console.log('[Notifications Permission] ✅ Push notification permission GRANTED.');

    // 3. Fetch Expo Push Token
    console.log('[Notifications Token] Fetching Expo Push Token via Notifications.getExpoPushTokenAsync()...');
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('[Notifications Token] ✅ Received Expo Push Token:', token);

    // 4. Send token to backend
    if (token) {
      const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
      const tokenPreview = token.length > 25 ? `${token.substring(0, 15)}...${token.substring(token.length - 8)}` : token;
      console.log(`[Notifications Backend] Dispatched POST /api/push-tokens (deviceType: ${deviceType}, token: ${tokenPreview})...`);

      const res = await api.post<{ message: string }>('/api/push-tokens', {
        token,
        deviceType,
      });
      console.log('[Notifications Backend] ✅ POST /api/push-tokens SUCCEEDED. Backend response:', JSON.stringify(res, null, 2));
    }

    return token;
  } catch (error: any) {
    console.error('[Notifications Backend] ❌ Error during push notification registration pipeline:', error?.message || error);
    return null;
  }
}

/**
 * Hook to set up notification response listener for deep-linking when a user taps a push notification.
 */
export function useNotificationObserver() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const user = useSession((state) => state.user);

  useEffect(() => {
    console.log('[Notifications Hook] Evaluated post-auth/onboarding condition:', {
      hasAuthToken: !!token,
      activeFlatId: activeFlat?.id || null,
      flatName: activeFlat?.name || null,
      userName: user?.name || null,
      isExpoGo,
    });

    if (isExpoGo || !Notifications || !token || !activeFlat) {
      console.log('[Notifications Hook] Skipping registration (either in Expo Go, no auth token, or flat onboarding not complete yet).');
      return;
    }

    console.log('[Notifications Hook] Post-onboarding / session active condition MET. Triggering registerForPushNotificationsAsync()...');
    // Register push token after user has an active session and flat
    registerForPushNotificationsAsync();

    // Listen for notification responses (user taps notification)
    try {
      const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        console.log('[Notifications Response] User tapped notification with payload data:', JSON.stringify(data, null, 2));
        if (!data) return;

        if (data.type === 'task' || data.type === 'chat') {
          router.push('/(tabs)/home');
        } else if (data.type === 'expense') {
          router.push('/(tabs)/expense');
        }
      });

      return () => {
        subscription.remove();
      };
    } catch (_) {}
  }, [token, activeFlat?.id, user?.id]);
}
