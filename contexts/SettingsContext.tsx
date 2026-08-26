import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  loading: true,
  refreshSettings: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

const SETTINGS_CACHE_KEY = 'app_settings_cache';

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const timeoutPromise = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 2500)
      );

      const fetchPromise = supabase.from('app_settings').select('*');
      const res = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (res && res.data && Array.isArray(res.data)) {
        const settingsMap: Record<string, string> = {};
        res.data.forEach((item: { key: string; value: string }) => {
          settingsMap[item.key] = item.value;
        });
        setSettings(settingsMap);
        AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settingsMap)).catch(() => {});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_CACHE_KEY)
      .then((cached) => {
        if (cached) {
          try {
            setSettings(JSON.parse(cached));
            setLoading(false);
          } catch (e) {}
        }
      })
      .catch(() => {})
      .finally(() => {
        fetchSettings();
      });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
