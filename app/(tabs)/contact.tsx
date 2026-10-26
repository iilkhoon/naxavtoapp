import React from 'react';
import Constants from 'expo-constants';
import {
  View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, Image,
} from 'react-native';
import {
  Phone, Mail, MapPin, MessageCircle, Instagram, Video,
  Globe, ChevronRight, Shield, MessagesSquare,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AdminExpensesSection } from '../../components/AdminExpensesSection';

const APP_ICON = require('../../icons/android-icon.png');

// "+994501234567" -> "+994 50 123 45 67"
const formatPhone = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, '');
  const m = digits.match(/^(\+994)(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : raw;
};

// Row inside a grouped (iOS Settings-style) list
const ListRow = ({ icon: Icon, tint, title, value, onPress, colors, last }: any) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6} accessibilityRole="button">
    <View style={[styles.rowIcon, { backgroundColor: tint }]}>
      <Icon size={16} color="#FFF" strokeWidth={2.2} />
    </View>
    <View style={[styles.rowBody, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {!!value && <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1}>{value}</Text>}
      </View>
      <ChevronRight size={18} color={colors.placeholder} />
    </View>
  </TouchableOpacity>
);

// Round quick action, like the buttons on an iOS contact card
const QuickAction = ({ icon: Icon, label, onPress, colors, isDark }: any) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
    <View style={[styles.quickCircle, { backgroundColor: isDark ? 'rgba(255,69,58,0.18)' : 'rgba(255,59,48,0.1)' }]}>
      <Icon size={22} color={colors.primary} strokeWidth={2} />
    </View>
    <Text style={[styles.quickLabel, { color: colors.primary }]}>{label}</Text>
  </TouchableOpacity>
);

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isAdmin, isSuperAdmin } = useAuth();
  const { settings, refreshSettings } = useSettings();

  // Settings are already loaded app-wide; refresh quietly when the tab gains focus
  useFocusEffect(
    React.useCallback(() => {
      refreshSettings();
    }, [])
  );

  const phones = Object.keys(settings)
    .filter((key) => key.startsWith('phone_') && settings[key]?.trim())
    .sort()
    .map((key) => settings[key]);
  if (phones.length === 0 && settings.phone) phones.push(settings.phone);

  const primaryPhone = phones[0];
  const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

  const open = (url?: string) => url && Linking.openURL(url).catch(() => {});
  const call = (number: string) => open(`tel:${number.replace(/\s/g, '')}`);
  const openMap = () => open(`https://maps.google.com/?q=${encodeURIComponent(settings.address || 'Naxçıvan')}`);

  const group = [styles.group, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)' }];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {isAdmin && isSuperAdmin && <AdminExpensesSection />}

      {/* Identity */}
      <View style={styles.identity}>
        <View style={[styles.avatar, { borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)', backgroundColor: colors.card }]}>
          <Image source={logoUrl ? { uri: logoUrl } : APP_ICON} style={styles.avatarImage} resizeMode="contain" />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>Naxçıvan Avto</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>Avtomobil və nömrə elanları · Naxçıvan</Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <QuickAction icon={Phone} label="Zəng" onPress={() => primaryPhone && call(primaryPhone)} colors={colors} isDark={isDark} />
        <QuickAction icon={MessageCircle} label="WhatsApp" onPress={() => open(settings.whatsapp || 'https://whatsapp.com')} colors={colors} isDark={isDark} />
        <QuickAction icon={MessagesSquare} label="Çat" onPress={() => router.push('/chat')} colors={colors} isDark={isDark} />
        <QuickAction icon={MapPin} label="Xəritə" onPress={openMap} colors={colors} isDark={isDark} />
      </View>

      {/* Phones */}
      {phones.length > 0 && (
        <>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Telefon</Text>
          <View style={group}>
            {phones.map((phone, i) => (
              <ListRow
                key={phone}
                icon={Phone}
                tint="#34C759"
                title={formatPhone(phone)}
                value={i === 0 ? 'Qaynar xətt' : `Operator ${i + 1}`}
                onPress={() => call(phone)}
                colors={colors}
                last={i === phones.length - 1}
              />
            ))}
          </View>
        </>
      )}

      {/* Other channels */}
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Əlaqə</Text>
      <View style={group}>
        <ListRow icon={Mail} tint="#007AFF" title="Email" value={settings.email || 'info@naxcivanavto.com'} onPress={() => open(`mailto:${settings.email || 'info@naxcivanavto.com'}`)} colors={colors} />
        <ListRow icon={MapPin} tint="#FF9500" title="Ünvan" value={settings.address || 'Naxçıvan şəhəri'} onPress={openMap} colors={colors} />
        <ListRow icon={Globe} tint="#5856D6" title="Vebsayt" value={(settings.website || 'https://naxavto.com').replace(/^https?:\/\//, '')} onPress={() => open(settings.website || 'https://naxavto.com')} colors={colors} last />
      </View>

      {/* Social */}
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Sosial şəbəkələr</Text>
      <View style={group}>
        <ListRow icon={Instagram} tint="#E1306C" title="Instagram" value="Yeni elanlar və kampaniyalar" onPress={() => open(settings.instagram || 'https://instagram.com')} colors={colors} />
        <ListRow icon={Video} tint="#111111" title="TikTok" value="Video baxışlar" onPress={() => open(settings.tiktok || 'https://tiktok.com')} colors={colors} last />
      </View>

      {/* Legal */}
      <View style={[group, { marginTop: 28 }]}>
        <ListRow icon={Shield} tint="#8E8E93" title="Məxfilik siyasəti" onPress={() => router.push('/privacy')} colors={colors} last />
      </View>

      {/* Footer: tapping it opens the hidden admin menu */}
      <TouchableOpacity onPress={() => router.push('/menu')} activeOpacity={0.7} style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          © {new Date().getFullYear()} Naxçıvan Avto · Versiya {Constants.expoConfig?.version}
        </Text>
        <Text style={[styles.footerText, { color: colors.placeholder }]}>Created by İlkin Rzayev</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 130 },
  identity: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    marginBottom: 12,
    boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.08)',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 18 },
  name: { fontSize: 26, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: -0.4 },
  tagline: { fontSize: 14, fontFamily: 'RethinkSans_500Medium', marginTop: 4 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  quickAction: { alignItems: 'center', width: '24%' },
  quickCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold' },
  groupTitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 16,
  },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: 12, minHeight: 56 },
  rowTitle: { fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
  rowValue: { fontSize: 13, fontFamily: 'RethinkSans_500Medium', marginTop: 1 },
  footer: { alignItems: 'center', marginTop: 32, gap: 4 },
  footerText: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
});
