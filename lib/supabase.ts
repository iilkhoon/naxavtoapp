import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Polyfill for native platforms
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Key missing! Check .env file.');
}

// Custom storage adapter to handle Web (localStorage), SSR, and Native (AsyncStorage)
const SafeStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        // Ignore quota/private browsing errors
      }
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Ignore errors
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Ignore errors
    }
  },
};

// React Native's fetch has no timeout on Android. On a cold start the session
// refresh request can hang before the network is ready, and every query waits
// for it, so the app never loads until it is restarted. Abort slow requests
// instead so the client can recover.
const REQUEST_TIMEOUT_MS = 15000;
// Image uploads on a slow mobile connection can legitimately take longer
const UPLOAD_TIMEOUT_MS = 120000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const timeoutMs = url.includes('/storage/v1/') ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Keep a caller's own abort signal working (e.g. realtime, storage uploads)
  const callerSignal = init?.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort());
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

// Client that never stores a session. Used to sign up other users
// (e.g. new admins) without replacing the current user's session.
export const createIsolatedClient = () =>
  createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: SafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Serialises session refreshes inside the JS runtime (recommended for React Native)
    ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

// Native apps: only refresh the session while in the foreground, and refresh
// right away when the app comes back (recommended Supabase React Native setup).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
