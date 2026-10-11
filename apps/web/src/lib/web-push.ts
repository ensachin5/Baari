import { api } from './api';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/**
 * Register Web Push Subscription with Service Worker and backend.
 */
export async function registerWebPushAsync(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null;

  console.log('[WebPush] 🚀 Starting registerWebPushAsync pipeline...');

  // 1. Check browser feature support
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    console.warn('[WebPush] Web Push is not supported by this browser/environment.');
    return null;
  }

  try {
    // 2. Check current Notification permission
    const currentPermission = Notification.permission;
    console.log('[WebPush Permission] Current Notification.permission status:', currentPermission);

    let permission = currentPermission;
    if (permission === 'default') {
      console.log('[WebPush Permission] Requesting user permission via Notification.requestPermission()...');
      permission = await Notification.requestPermission();
      console.log('[WebPush Permission] Notification.requestPermission() result:', permission);
    }

    if (permission !== 'granted') {
      console.warn('[WebPush Permission] Permission was not granted by user. Status:', permission);
      return null;
    }

    console.log('[WebPush Permission] ✅ Web Notification permission GRANTED.');

    // 3. Obtain Service Worker registration
    console.log('[WebPush SW] Awaiting navigator.serviceWorker.ready...');
    const registration = await navigator.serviceWorker.ready;
    console.log('[WebPush SW] Service Worker ready. Active SW scope:', registration.scope);

    // 4. Check existing subscription or VAPID key
    const existingSubscription = await registration.pushManager.getSubscription();
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    console.log('[WebPush VAPID] NEXT_PUBLIC_VAPID_PUBLIC_KEY present:', !!vapidPublicKey);
    if (!vapidPublicKey && !existingSubscription) {
      console.warn(
        '[WebPush VAPID] ⚠️ NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured in environment variables. ' +
        'Browsers require a valid VAPID applicationServerKey to create a new PushSubscription via pushManager.subscribe().'
      );
    }

    let subscription = existingSubscription;

    if (!subscription) {
      if (!vapidPublicKey) {
        console.warn('[WebPush] Cannot create new PushSubscription without NEXT_PUBLIC_VAPID_PUBLIC_KEY. Skipping pushManager.subscribe().');
        return null;
      }

      console.log('[WebPush Subscribe] Calling registration.pushManager.subscribe() with VAPID key...');
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    console.log('[WebPush Subscription] ✅ Active PushSubscription object:', JSON.stringify(subscription, null, 2));

    // 5. Send subscription token to backend
    if (subscription) {
      const tokenPayload = JSON.stringify(subscription);
      console.log('[WebPush Backend] Dispatched POST /api/push-tokens (deviceType: web)...');

      const res = await api.post<{ message: string }>('/api/push-tokens', {
        token: tokenPayload,
        deviceType: 'web',
      });
      console.log('[WebPush Backend] ✅ POST /api/push-tokens SUCCEEDED. Backend response:', JSON.stringify(res, null, 2));
    }

    return subscription;
  } catch (error: any) {
    console.error('[WebPush] ❌ Error during Web Push registration:', error?.message || error);
    return null;
  }
}
