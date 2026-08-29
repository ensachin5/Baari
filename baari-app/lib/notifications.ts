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
  if (isExpoGo || !Notifications) {
    console.log('[Notifications] Push notifications disabled in Expo Go (requires dev build)');
    return null;
  }

  try {
    const perm: any = await Notifications.getPermissionsAsync();
    let isGranted = perm.granted || perm.status === 'granted';

    if (!isGranted) {
      const req: any = await Notifications.requestPermissionsAsync();
      isGranted = req.granted || req.status === 'granted';
    }

    if (!isGranted) {
      console.log('[Notifications] Permission not granted for push notifications');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (token) {
      await api.post('/api/push-tokens', {
        token,
        deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      console.log('[Notifications] Registered push token with backend:', token);
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Error registering for push notifications:', error);
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

  useEffect(() => {
    if (isExpoGo || !Notifications || !token || !activeFlat) return;

    // Register push token after user has an active session and flat
    registerForPushNotificationsAsync();

    // Listen for notification responses (user taps notification)
    try {
      const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
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
  }, [token, activeFlat?.id]);
}
