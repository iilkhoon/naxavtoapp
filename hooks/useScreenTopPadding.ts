import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top padding for a screen's custom header.
 *
 * Replaces the old hard-coded `Platform.OS === 'ios' ? 60 : 40`, which left a
 * gap on iOS sheets (they start below the status bar) and was wrong on
 * Android edge-to-edge and on phones without a notch.
 */
export function useScreenTopPadding(presentedAsModal = false) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return 20;
  if (presentedAsModal && Platform.OS === 'ios') return 16;
  return insets.top + 12;
}
