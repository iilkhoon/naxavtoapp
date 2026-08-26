import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(externalDeviceId?: string) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const [internalDeviceId, setInternalDeviceId] = useState<string | undefined>(externalDeviceId);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const { user } = useAuth();

  // Handle Internal Device ID persistence
  useEffect(() => {
    const handleDeviceId = async () => {
      if (externalDeviceId) {
        setInternalDeviceId(externalDeviceId);
        return;
      }

      try {
        let savedId = await AsyncStorage.getItem('device_id');
        if (!savedId) {
          savedId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          await AsyncStorage.setItem('device_id', savedId);
        }
        setInternalDeviceId(savedId);
      } catch (e) {
        console.error('Error handling device_id in hook:', e);
      }
    };
    handleDeviceId();
  }, [externalDeviceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      registerForPushNotificationsAsync().then(token => {
        setExpoPushToken(token);
        if (token) {
          saveTokenToDatabase(token, internalDeviceId);
          AsyncStorage.setItem('expo_push_token', token).catch(e => console.error('Error saving push token to storage:', e));
        }
      });
    }, 1500);

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      clearTimeout(timer);
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [internalDeviceId]);

  // Update user_id or device_id if they change
  useEffect(() => {
    if ((user || internalDeviceId) && expoPushToken) {
      saveTokenToDatabase(expoPushToken, internalDeviceId);
    }
  }, [user, expoPushToken, internalDeviceId]);

  const saveTokenToDatabase = async (token: string, dId?: string) => {
    try {
      console.log(`[Push] Saving token ${token.substring(0, 15)}... with user: ${user?.id}, device: ${dId}`);
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          token,
          user_id: user?.id || null,
          device_id: dId || null
        }, { onConflict: 'token' });

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      console.log('[Push] Getting token for projectId:', projectId);
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[Push] Token obtained:', token);
    } catch (e: any) {
      console.error('[Push] getExpoPushTokenAsync failed:', e?.message ?? e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
