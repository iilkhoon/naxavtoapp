import '../utils/ssr-polyfill';
import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform, Text, TextInput, Linking, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AlertCircle } from 'lucide-react-native';
import {
  useFonts,
  RethinkSans_400Regular,
  RethinkSans_500Medium,
  RethinkSans_600SemiBold,
  RethinkSans_700Bold,
  RethinkSans_800ExtraBold
} from '@expo-google-fonts/rethink-sans';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { InstagramPopup } from '../components/InstagramPopup';
import { WebSideBanners } from '../components/WebSideBanners';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Apply default font globally using defaultProps
const applyGlobalFont = () => {
  if (Platform.OS === 'web') return;

  const CustomTextProps = {
    style: { fontFamily: 'RethinkSans_400Regular' },
  };

  const CustomTextInputProps = {
    style: { fontFamily: 'RethinkSans_400Regular' },
  };

  // @ts-ignore
  if (Text.defaultProps) {
    // @ts-ignore
    Text.defaultProps.style = [{ fontFamily: 'RethinkSans_400Regular' }];
  } else {
    // @ts-ignore
    Text.defaultProps = CustomTextProps;
  }

  // @ts-ignore
  if (TextInput.defaultProps) {
    // @ts-ignore
    TextInput.defaultProps.style = [{ fontFamily: 'RethinkSans_400Regular' }];
  } else {
    // @ts-ignore
    TextInput.defaultProps = CustomTextInputProps;
  }
};

// Execute the patch
applyGlobalFont();

// Helper to compare semantic versions (e.g. "1.0.6" vs "1.0.7")
// Returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
function compareVersions(v1: string, v2: string): number {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  usePushNotifications(); // Register push token
  const { settings, loading } = useSettings();

  // Global Smooth Transition Configuration
  const screenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
    headerTitleStyle: {
      fontFamily: 'RethinkSans_700Bold',
      fontSize: 17,
    },
    headerBackTitle: 'Geri',
    headerBackTitleStyle: { fontFamily: 'RethinkSans_500Medium' },
    headerTintColor: colors.primary,
    // Use platform default for best native feel (smooth slide on iOS, slide/fade on Android)
    animation: (Platform.OS === 'ios' ? 'default' : 'fade_from_bottom') as any,
    animationDuration: 350,
    gestureEnabled: true, // Enable swipe back gesture
    gestureDirection: 'horizontal' as const,
  } as const;

  // Configuration for Modals (Slide from bottom)
  const modalScreenOptions = {
    // 'modal' presentation on iOS gives the native sheet look & feel with drag-to-dismiss
    // 'card' on Android with slide_from_bottom mimics a full-screen modal nicely
    presentation: (Platform.OS === 'ios' ? 'modal' : 'card') as any,
    animation: (Platform.OS === 'ios' ? 'default' : 'slide_from_bottom') as any,
    gestureDirection: 'vertical' as const,
    gestureEnabled: true,
    headerShown: false,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentVersion = Constants.expoConfig?.version || "1.0.0";
  const requiredVersion = settings.required_app_version || "0.0.0";
  // Never block web users with app version update screen
  const needsUpdate = Platform.OS !== 'web' && compareVersions(currentVersion, requiredVersion) < 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {needsUpdate ? (
        <View style={[styles.updateBlocker, { backgroundColor: colors.background }]}>
          <AlertCircle size={64} color={colors.primary} style={{ marginBottom: 24 }} />
          <Text style={[styles.updateTitle, { color: colors.text }]}>Vacib Güncəlləmə</Text>
          <Text style={[styles.updateDesc, { color: colors.textSecondary }]}>
            Tətbiqin yeni və daha mükəmməl versiyası artıq mövcuddur. Xahiş edirik, istifadəyə davam etmək üçün tətbiqi güncəlləyin.
          </Text>
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (settings.update_url) {
                Linking.openURL(settings.update_url).catch(err => console.error("URL aça bilmədi", err));
              }
            }}
          >
            <Text style={styles.updateButtonText}>Güncəllə</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Stack screenOptions={screenOptions}>
          {/* Main Tabs */}
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

          <Stack.Screen name="+not-found" />

          {/* Modals & Menus */}
          <Stack.Screen name="menu" options={modalScreenOptions} />
          <Stack.Screen name="add-listing" options={modalScreenOptions} />
          <Stack.Screen name="select-option" options={modalScreenOptions} />
          <Stack.Screen name="filter" options={modalScreenOptions} />
          <Stack.Screen name="comment" options={modalScreenOptions} />

          {/* Auth */}
          <Stack.Screen
            name="auth/login"
            options={{
              ...modalScreenOptions,
              headerShown: true,
              title: 'Giriş',
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: 'RethinkSans_700Bold' },
            }}
          />

          {/* Standard Screens (Will inherit slide_from_right/default) */}
          <Stack.Screen name="calculator" />
          <Stack.Screen name="brands/index" />
          <Stack.Screen name="models/index" />

          {/* Admin Screens */}
          <Stack.Screen name="admin" />

          {/* Loan Screens */}
          <Stack.Screen name="my-loans" />

          {/* Detail Screens */}
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="plate/[id]" />
        </Stack>
      )}
      <StatusBar style={isDark ? "light" : "dark"} />
      {Platform.OS === 'web' && (
        <>
          <WebSideBanners side="left" />
          <WebSideBanners side="right" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  updateBlocker: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  updateTitle: {
    fontSize: 24,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  updateDesc: {
    fontSize: 15,
    fontFamily: 'RethinkSans_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  updateButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
    textAlign: 'center',
  }
});

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    RethinkSans_400Regular,
    RethinkSans_500Medium,
    RethinkSans_600SemiBold,
    RethinkSans_700Bold,
    RethinkSans_800ExtraBold,
  });

  useEffect(() => {
    // Fail-safe: Ensure splash screen hides within 2.5 seconds no matter what
    const failSafeTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);

    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }

    return () => clearTimeout(failSafeTimer);
  }, [fontsLoaded]);

  // Check for OTA updates in background after startup delay to avoid blocking cold start
  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__) return;
    const timer = setTimeout(() => {
      async function checkForUpdates() {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (e) {
          // Ignore errors silently
        }
      }
      checkForUpdates();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <ToastProvider>
                <RootLayoutNav />
                <InstagramPopup />
              </ToastProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
