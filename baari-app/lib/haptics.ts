import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Safely trigger haptic feedback on iOS/Android devices.
 * Gracefully falls back to no-op on Web platform.
 */
export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        break;
      case 'selection':
        Haptics.selectionAsync().catch(() => {});
        break;
    }
  } catch (_) {
    // Ignore haptic errors on unsupported hardware
  }
}
