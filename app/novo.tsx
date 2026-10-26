import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Sun, Moon, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AdminLoginForm } from '../components/AdminLoginForm';
import { AdminButton, useAdminColors, F } from '../components/admin/AdminUI';
import { useScreenTopPadding } from '../hooks/useScreenTopPadding';
import { haptics } from '../utils/haptics';

const APP_ICON = require('../icons/android-icon.png');

// Admin sign-in portal (/novo): app icon, title and the shared login form
export default function NovoAdminLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTopPadding();
  const { isDark, toggleTheme } = useTheme();
  const c = useAdminColors();
  const { session, isAdmin } = useAuth();

  const alreadyAdmin = !!session && isAdmin;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const goToPanel = () => router.replace('/admin');

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: top }]}>
          <TouchableOpacity onPress={() => { haptics.tap(); goBack(); }} style={styles.back} hitSlop={10} accessibilityLabel="Geri">
            <ChevronLeft size={24} color={c.primary} strokeWidth={2.4} />
            <Text style={[styles.backText, { color: c.primary }]}>Geri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.tap(); toggleTheme(); }}
            style={[styles.iconBtn, { backgroundColor: c.fill }]}
            accessibilityLabel={isDark ? 'İşıqlı rejim' : 'Qaranlıq rejim'}
          >
            {isDark ? <Sun size={17} color={c.text} /> : <Moon size={17} color={c.text} />}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <View style={[styles.iconWrap, { backgroundColor: c.card, borderColor: c.hairline }]}>
              <Image source={APP_ICON} style={styles.icon} accessibilityLabel="Naxçıvan Avto" />
            </View>
            <Text style={[styles.title, { color: c.text }]}>Admin girişi</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Naxçıvan Avto idarəetmə panelinə daxil olmaq üçün admin hesabınızla giriş edin.
            </Text>

            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.hairline }]}>
              {alreadyAdmin ? (
                <View style={{ gap: 16 }}>
                  <View style={[styles.signedIn, { backgroundColor: `${c.success}1A` }]}>
                    <CheckCircle2 size={20} color={c.success} />
                    <Text style={[styles.signedInText, { color: c.text }]}>Admin kimi daxil olmusunuz.</Text>
                  </View>
                  <AdminButton title="Panelə keç" onPress={goToPanel} />
                </View>
              ) : (
                <AdminLoginForm onSuccess={goToPanel} />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  backText: { fontSize: 17, fontFamily: F.medium },
  iconBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', paddingTop: 24 },
  iconWrap: { width: 84, height: 84, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 6, marginBottom: 18, boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.08)' },
  icon: { width: '100%', height: '100%', borderRadius: 17 },
  title: { fontSize: 30, fontFamily: F.heavy, letterSpacing: -0.6, textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 21, fontFamily: F.medium, textAlign: 'center', marginTop: 6, marginBottom: 28, maxWidth: 340 },
  card: { width: '100%', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 20, boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 8px 24px rgba(0, 0, 0, 0.06)' },
  signedIn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  signedInText: { flex: 1, fontSize: 15, fontFamily: F.semibold },
});
