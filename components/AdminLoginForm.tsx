import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  /** Called after a successful sign-in with an admin account */
  onSuccess?: () => void;
};

// Admin sign-in form shared by the /novo portal and the hidden admin menu
export function AdminLoginForm({ onSuccess }: Props) {
  const { colors, isDark } = useTheme();
  const { signIn } = useAuth();
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const haptic = (type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(type).catch(() => {});
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Zəhmət olmasa email və şifrəni daxil edin.');
      haptic(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(cleanEmail, password);

      if (!res.success) {
        setErrorMessage(res.error || 'Giriş zamanı xəta baş verdi.');
        haptic(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (res.isAdmin) {
        setSuccessMessage('Giriş uğurludur! Admin panelinə yönləndirilirsiniz...');
        haptic(Haptics.NotificationFeedbackType.Success);
        setPassword('');
        onSuccess?.();
      } else {
        setErrorMessage('Bu hesab administrator hüquqlarına malik deyil. Zəhmət olmasa admin hesabı ilə daxil olun.');
        haptic(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gözlənilməz xəta baş verdi.');
    } finally {
      setLoading(false);
    }
  };

  // iOS-style filled fields; the accent outline only shows on focus
  const inputBackground = isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)';

  return (
    <View>
      {errorMessage && (
        <View style={[styles.alertBox, styles.errorBox]}>
          <AlertCircle size={18} color="#FF3B30" style={styles.alertIcon} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View style={[styles.alertBox, styles.successBox]}>
          <CheckCircle2 size={18} color="#34C759" style={styles.alertIcon} />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email ünvanı</Text>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: inputBackground, borderColor: focusedField === 'email' ? colors.primary : 'transparent' },
          ]}
        >
          <Mail size={18} color={focusedField === 'email' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="admin@naxavto.az"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errorMessage) setErrorMessage(null);
            }}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Şifrə</Text>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: inputBackground, borderColor: focusedField === 'password' ? colors.primary : 'transparent' },
          ]}
        >
          <Lock size={18} color={focusedField === 'password' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            ref={passwordRef}
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
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
          >
            {showPassword ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }, loading && styles.submitButtonLoading]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        {loading ? (
          <View style={styles.buttonRow}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.submitButtonText}>Yoxlanılır...</Text>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <ShieldCheck size={20} color="#FFF" />
            <Text style={styles.submitButtonText}>Sistemə daxil ol</Text>
            <ArrowRight size={18} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.securityNote}>
        <Lock size={12} color={colors.textSecondary} />
        <Text style={[styles.securityNoteText, { color: colors.textSecondary }]}>
          Yalnız səlahiyyətli şəxslər üçün. Bağlantı şifrələnib.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  alertIcon: { marginRight: 8, marginTop: 1 },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  successText: {
    flex: 1,
    color: '#34C759',
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
    lineHeight: 18,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
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
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: 'RethinkSans_500Medium',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  eyeButton: { padding: 6 },
  submitButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonLoading: { opacity: 0.8 },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  securityNoteText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
  },
});
