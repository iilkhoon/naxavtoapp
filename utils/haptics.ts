import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Thin wrappers so screens don't repeat platform checks. Haptics are a nicety:
// failures (simulators, devices without a Taptic Engine) are ignored.
const run = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

export const haptics = {
  /** Light tick for taps on cards, chips and tabs */
  tap: () => run(() => Haptics.selectionAsync()),
  /** Slightly firmer bump, e.g. when pull-to-refresh triggers */
  impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Toggles that change state (favourite on/off) */
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
