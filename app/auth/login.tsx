import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  LogIn,
  Car,
  ShieldCheck,
} from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signIn, session, isAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const safeClose = () => {
    try {
      if (router.canDismiss()) {
        router.dismiss();
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Zəhmət olmasa email və şifrəni daxil edin.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(cleanEmail, password);

      if (!res.success) {
        setErrorMessage(res.error || 'Giriş zamanı xəta baş verdi.');
        return;
      }

      setSuccessMessage('Uğurla daxil oldunuz!');

      setTimeout(() => {
        if (res.isAdmin) {
          router.replace('/admin');
        } else {
          safeClose();
        }
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Giriş zamanı xəta baş verdi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            isDesktop && styles.cardDesktop,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoCircle,
                { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` },
              ]}
            >
              <Car size={26} color={colors.primary} />
            </View>

            <View style={styles.brandNameRow}>
              <Text style={[styles.brandMain, { color: colors.text }]}>NAXÇIVAN</Text>
              <Text style={[styles.brandSub, { color: colors.primary }]}>AVTO</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Hesaba Giriş</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Elanlarınızı və kreditlərinizi izləmək üçün daxil olun.
            </Text>
          </View>

          {/* Already logged in check */}
          {session && (
            <View style={[styles.alreadyLoggedBox, { backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: 'rgba(52, 199, 89, 0.3)' }]}>
              <CheckCircle2 size={18} color="#34C759" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alreadyLoggedText, { color: colors.text }]}>
                  Siz artıq daxil olmusunuz ({session.user?.email}).
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.portalBtn, { backgroundColor: colors.primary }]}
                onPress={() => (isAdmin ? router.replace('/admin') : safeClose())}
              >
                <Text style={styles.portalBtnText}>{isAdmin ? 'Admin Panel' : 'Davam et'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#FF3B30" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Success Message */}
          {successMessage && (
            <View style={styles.successBox}>
              <CheckCircle2 size={18} color="#34C759" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Email field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Ünvanı</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#18181A' : '#F6F6F9',
                  borderColor: focusedField === 'email' ? colors.primary : colors.border,
                },
              ]}
            >
              <Mail
                size={18}
                color={focusedField === 'email' ? colors.primary : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="numune@mail.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Şifrə</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#18181A' : '#F6F6F9',
                  borderColor: focusedField === 'password' ? colors.primary : colors.border,
                },
              ]}
            >
              <Lock
                size={18}
                color={focusedField === 'password' ? colors.primary : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSecondary} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: colors.primary },
              loading && { opacity: 0.8 },
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.loginBtnText}>Daxil olunur...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <LogIn size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.loginBtnText}>Giriş Et</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Dismiss / Return Button */}
          <TouchableOpacity
            style={[styles.dismissBtn, { borderColor: colors.border }]}
            onPress={safeClose}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.dismissBtnText, { color: colors.textSecondary }]}>
              Geri Qayıt
            </Text>
          </TouchableOpacity>

          {/* Admin Portal hint */}
          <View style={[styles.footerHint, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => router.push('/novo')}
              style={styles.adminLink}
              activeOpacity={0.7}
            >
              <ShieldCheck size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.adminLinkText, { color: colors.primary }]}>
                İdarəetmə / Admin Girişi
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 32,
  },
  scrollContentDesktop: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  cardDesktop: {
    maxWidth: 440,
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  brandMain: {
    fontSize: 16,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 16,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: 3,
  },
  title: {
    fontSize: 26,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'RethinkSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  alreadyLoggedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  alreadyLoggedText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
  },
  portalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  portalBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'RethinkSans_700Bold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    color: '#34C759',
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 54,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: 'RethinkSans_500Medium',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  eyeBtn: {
    padding: 6,
  },
  loginButton: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 6px 16px rgba(255, 59, 48, 0.25)',
      },
    }),
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  dismissBtnText: {
    fontSize: 14,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  footerHint: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  adminLinkText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
});
