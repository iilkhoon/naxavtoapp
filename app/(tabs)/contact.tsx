import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Linking, Dimensions,
  ActivityIndicator, TouchableOpacity, Platform
} from 'react-native';
import {
  Phone, Mail, MapPin, MessageCircle, Instagram, Video,
  Globe, ChevronRight, Shield, FileText, ExternalLink
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [settings, setSettings] = useState<any>({});
  const [phones, setPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').order('key');
    if (data) {
      const settingsMap: any = {};
      const phoneList: string[] = [];
      data.forEach(item => {
        settingsMap[item.key] = item.value;
        if (item.key.startsWith('phone_') && item.value && item.value.trim() !== '') {
          phoneList.push(item.value);
        }
      });
      if (phoneList.length === 0 && settingsMap.phone) {
        phoneList.push(settingsMap.phone);
      }
      setSettings(settingsMap);
      setPhones(phoneList);
    }
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchSettings();
    }, [])
  );

  const handleCall = (number: string) => Linking.openURL(`tel:${number}`);
  const handleEmail = () => Linking.openURL(`mailto:${settings.email}`);
  const handleWhatsapp = () => Linking.openURL(settings.whatsapp || 'https://whatsapp.com');
  const handleInstagram = () => Linking.openURL(settings.instagram || 'https://instagram.com');
  const handleTiktok = () => Linking.openURL(settings.tiktok || 'https://tiktok.com');
  const handleWeb = () => Linking.openURL(settings.website || 'https://naxcivanavto.com');
  const handleMap = () => Linking.openURL(`https://maps.google.com/?q=${settings.address || 'Naxçıvan'}`);

  // Updated to navigate to the dedicated Privacy Page
  const handlePrivacyPolicy = () => router.push('/privacy');

  const ContactCard = ({ icon: Icon, title, subtitle, onPress, color = colors.primary, delay = 0, isLarge = false }: any) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay, type: 'timing', duration: 500 }}
      style={{ width: '100%', marginBottom: 12 }}
    >
      <AnimatedPressable
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          isLarge && styles.largeCard
        ]}
        onPress={onPress}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <Icon size={24} color={color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle || 'Məlumat yoxdur'}</Text>
          </View>
        </View>
        <View style={[styles.arrowCircle, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </AnimatedPressable>
    </MotiView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerBg}>
        <LinearGradient
          colors={[colors.primary, 'transparent']}
          style={styles.gradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.header}
        >
          <Text style={[styles.title, { color: colors.text }]}>Əlaqə Mərkəzi</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sualınız var? Bizimlə asanlıqla əlaqə saxlayın.
          </Text>
        </MotiView>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bizimlə Əlaqə</Text>
          {phones.length > 0 ? (
            phones.map((phone, index) => (
              <ContactCard
                key={index}
                icon={Phone}
                title={index === 0 ? "Qaynar Xətt" : `Operator ${index + 1}`}
                subtitle={phone}
                onPress={() => handleCall(phone)}
                delay={100 + (index * 50)}
                color={colors.primary}
              />
            ))
          ) : (
            <ContactCard
              icon={Phone}
              title="Qaynar Xətt"
              subtitle="+994 50 123 45 67"
              onPress={() => handleCall("+994501234567")}
              delay={100}
              color={colors.primary}
            />
          )}

          <ContactCard
            icon={MessageCircle}
            title="WhatsApp"
            subtitle="Yazışma üçün toxunun"
            onPress={handleWhatsapp}
            color="#25D366"
            delay={200}
          />

          <ContactCard
            icon={Mail}
            title="Email"
            subtitle={settings.email || 'info@naxcivanavto.com'}
            onPress={handleEmail}
            color="#007AFF"
            delay={250}
          />
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300 }}
          style={styles.socialSection}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sosial Media</Text>
          <View style={styles.socialGrid}>
            <AnimatedPressable style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleInstagram}>
              <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(225, 48, 108, 0.1)' }]}>
                <Instagram size={24} color="#E1306C" />
              </View>
              <Text style={[styles.socialText, { color: colors.text }]}>Instagram</Text>
            </AnimatedPressable>

            <AnimatedPressable style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleTiktok}>
              <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(0, 0, 0, 0.1)' }]}>
                <Video size={24} color={isDark ? "#FFF" : "#000"} />
              </View>
              <Text style={[styles.socialText, { color: colors.text }]}>TikTok</Text>
            </AnimatedPressable>

            <AnimatedPressable style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleWeb}>
              <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <Globe size={24} color="#007AFF" />
              </View>
              <Text style={[styles.socialText, { color: colors.text }]}>Vebsayt</Text>
            </AnimatedPressable>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400 }}
          style={styles.mapSection}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ünvan</Text>
          <AnimatedPressable
            style={[styles.card, styles.largeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleMap}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
                <MapPin size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Baş Ofis</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{settings.address || 'Naxçıvan ş.'}</Text>
              </View>
            </View>
            <View style={[styles.arrowCircle, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
              <ExternalLink size={18} color={colors.textSecondary} />
            </View>
          </AnimatedPressable>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 500 }}
          style={styles.legalSection}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hüquqi</Text>
          <AnimatedPressable
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handlePrivacyPolicy}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                <Shield size={24} color={colors.text} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Məxfilik Siyasəti</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Qaydalar və Şərtlər</Text>
              </View>
            </View>
            <View style={[styles.arrowCircle, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
              <FileText size={18} color={colors.textSecondary} />
            </View>
          </AnimatedPressable>
        </MotiView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/menu')} activeOpacity={0.7} style={{ alignItems: 'center' }}>
            <Text style={[styles.copyright, { color: colors.textSecondary }]}>© 2025 Naxçıvan Avto</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Versiya 1.0.1</Text>
            <Text style={[styles.version, { color: colors.textSecondary, marginTop: 4 }]}>Created by İlkin Rzayev / +994 55 466 66 63</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 250, opacity: 0.1 },
  gradient: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 32, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 8, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', opacity: 0.8, lineHeight: 22, fontFamily: 'RethinkSans_400Regular' },
  section: { marginBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)', elevation: 2 },
  largeCard: { paddingVertical: 20 },
  cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sectionTitle: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 16, marginLeft: 4 },
  socialSection: { marginBottom: 32 },
  socialGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  socialButton: { flex: 1, paddingVertical: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)', elevation: 2 },
  socialIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  socialText: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold' },
  mapSection: { marginBottom: 32 },
  legalSection: { marginBottom: 32 },
  footer: { alignItems: 'center', marginTop: 10 },
  copyright: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 4, textAlign: 'center' },
  version: { fontSize: 12, textAlign: 'center', opacity: 0.6, fontFamily: 'RethinkSans_400Regular' },
});
