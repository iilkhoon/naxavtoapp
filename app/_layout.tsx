import '../utils/ssr-polyfill';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform, Text, TextInput } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  useFonts, 
  RethinkSans_400Regular, 
  RethinkSans_500Medium, 
  RethinkSans_600SemiBold, 
  RethinkSans_700Bold, 
  RethinkSans_800ExtraBold 
} from '@expo-google-fonts/rethink-sans';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

// Apply default font globally
const applyGlobalFont = () => {
  if (Platform.OS === 'web') return; 

  const oldTextRender = Text.render;
  // @ts-ignore
  Text.render = function (...args) {
    const origin = oldTextRender.call(this, ...args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: 'RethinkSans_400Regular' }, origin.props.style],
    });
  };

  const oldTextInputRender = TextInput.render;
  // @ts-ignore
  TextInput.render = function (...args) {
    const origin = oldTextInputRender.call(this, ...args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: 'RethinkSans_400Regular' }, origin.props.style],
    });
  };
};

// Execute the patch
applyGlobalFont();

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  usePushNotifications(); // Register push token

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
    animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom', 
    animationDuration: 350,
    gestureEnabled: true, // Enable swipe back gesture
    gestureDirection: 'horizontal',
  } as const;

  // Configuration for Modals (Slide from bottom)
  const modalScreenOptions = {
    // 'modal' presentation on iOS gives the native sheet look & feel with drag-to-dismiss
    // 'card' on Android with slide_from_bottom mimics a full-screen modal nicely
    presentation: Platform.OS === 'ios' ? 'modal' : 'card', 
    animation: Platform.OS === 'ios' ? 'default' : 'slide_from_bottom', 
    gestureDirection: 'vertical' as const,
    gestureEnabled: true,
    headerShown: false,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
        <Stack.Screen name="admin/settings" />
        <Stack.Screen name="admin/features" />
        <Stack.Screen name="admin/listings" />
        <Stack.Screen name="admin/add-user" />
        <Stack.Screen name="admin/notifications" />
        <Stack.Screen name="admin/edit-listing/[id]" />
        <Stack.Screen name="admin/edit-plate/[id]" />
        <Stack.Screen name="admin/vip-listings" />
        
        {/* Detail Screens */}
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="plate/[id]" />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

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
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
              </ToastProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
