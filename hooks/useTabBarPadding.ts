import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_TAB_BAR = 49;
// Custom floating bar on Android: 58pt high, 12pt above the safe area
const ANDROID_TAB_BAR = 58 + 12;
const GAP = 24;

/**
 * Bottom padding for scrollable content inside a tab, so the last item clears
 * the tab bar without leaving a big empty band.
 *
 * `autoInset`: on iOS the system tab bar already insets a screen's *first*
 * ScrollView, so such screens only need the small gap. Screens whose scroll
 * view is nested (header above it, SafeAreaView root…) get no automatic inset
 * and must pass `false`.
 */
export function useTabBarPadding({ autoInset = false } = {}) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'web') return GAP;
  if (Platform.OS === 'ios') return autoInset ? GAP : insets.bottom + IOS_TAB_BAR + GAP;
  return insets.bottom + ANDROID_TAB_BAR + GAP;
}
