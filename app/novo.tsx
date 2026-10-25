import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { ShieldCheck, ArrowLeft, Sun, Moon, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AdminLoginForm } from '../components/AdminLoginForm';

const APP_ICON = require('../icons/android-icon.png');

export default function NovoAdminLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { session, isAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const alreadyAdmin = !!session && isAdmin;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const goToPanel = () => router.replace('/admin');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Dark hero, same look as the admin menu header */}
      <LinearGradient
        colors={['#000000', '#1A0B0A', colors.background]}
        locations={[0, 0.55, 1]}
        style={[styles.hero, { height: (isDesktop ? 360 : 330) + insets.top }]}
      />
      <View style={[styles.glow, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={goBack} style={styles.glassButton} activeOpacity={0.7} accessibilityLabel="Geri">
            <ArrowLeft size={18} color="#FFF" />
            <Text style={styles.glassButtonText}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleTheme} style={styles.glassIconButton} activeOpacity={0.7} accessibilityLabel="Temanı dəyiş">
            {isDark ? <Sun size={18} color="#FFF" /> : <Moon size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
            isDesktop && styles.scrollContentDesktop,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450 }}
            style={styles.brandHeader}
          >
            <View style={styles.logoRing}>
              <Image source={APP_ICON} style={styles.logo} />
            </View>

            <View style={styles.rolePill}>
              <ShieldCheck size={12} color="#FFD700" />
              <Text style={styles.rolePillText}>ADMINISTRATOR</Text>
            </View>

            <Text style={styles.title}>İdarəetmə Paneli</Text>
            <Text style={styles.subtitle}>Naxçıvan Avto platformasının idarəetmə bölməsinə daxil olun</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 120 }}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              isDesktop && styles.cardDesktop,
            ]}
          >
            {alreadyAdmin ? (
              <View>
                <View style={[styles.signedInBanner, { borderColor: 'rgba(52, 199, 89, 0.3)' }]}>
                  <CheckCircle2 size={20} color="#34C759" />
                  <Text style={[styles.signedInText, { color: colors.text }]}>
                    Siz artıq administrator kimi daxil olmusunuz.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.panelButton, { backgroundColor: colors.primary }]}
                  onPress={goToPanel}
                  activeOpacity={0.85}
                >
                  <Text style={styles.panelButtonText}>Panelə keç</Text>
                  <ChevronRight size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Admin girişi</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Hesab məlumatlarınızı daxil edin
                </Text>
                <AdminLoginForm onSuccess={goToPanel} />
              </>
            )}
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  glow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  glassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  glassButtonText: {
    color: '#FFF',
    fontFamily: 'RethinkSans_600SemiBold',
    fontSize: 13,
  },
  glassIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  scrollContentDesktop: {
    alignItems: 'center',
    paddingTop: 24,
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
  },
  logoRing: {
    width: 84,
    height: 84,
    borderRadius: 26,
    padding: 3,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  rolePillText: {
    color: '#FFD700',
    fontSize: 10,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'RethinkSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)' },
    }),
  },
  cardDesktop: {
    maxWidth: 440,
    padding: 32,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_400Regular',
    marginBottom: 20,
  },
  signedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  signedInText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  panelButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  panelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
});
