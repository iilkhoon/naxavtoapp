import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Home, Eye } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MotiView } from 'moti';
const { width } = Dimensions.get('window');

export default function SuccessScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        style={[styles.iconCircle, { backgroundColor: colors.success }]}
      >
        <Check size={50} color="#FFF" strokeWidth={3} />
      </MotiView>

      <MotiView
        from={{ translateY: 20, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ delay: 300, type: 'timing' }}
        style={styles.textContainer}
      >
        <Text style={[styles.title, { color: colors.text }]}>Uğurla Yerləşdirildi!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Elanınız yoxlanışa göndərildi. Təsdiqləndikdən sonra yayımlanacaq.
        </Text>
      </MotiView>

      <MotiView
        from={{ translateY: 50, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ delay: 500, type: 'timing' }}
        style={styles.buttonContainer}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Home size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Ana Səhifə</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => router.replace('/')} // Or navigate to user's listings if available
        >
          <Eye size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={[styles.buttonText, { color: '#FFF' }]}>Elanlara Bax</Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 24,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'RethinkSans_500Medium',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
});
