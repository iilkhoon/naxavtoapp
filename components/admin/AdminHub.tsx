import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { X, LogOut, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { visibleAdminMenu } from '../../constants/adminMenu';
import { ConfirmModal } from '../ConfirmModal';
import { AdminLoginForm } from '../AdminLoginForm';
import { haptics } from '../../utils/haptics';
import { AdminHeader, AdminScroll, Group, GroupRow, HeaderAction, StatTile, useAdminColors, F } from './AdminUI';

type Counters = { activeCars: number; activePlates: number; pendingListings: number; pendingApplications: number };

/**
 * Admin home: key figures and the full admin menu as an inset grouped list.
 * Used by the hidden menu sheet (app/menu.tsx) and by /admin.
 */
export function AdminHub({ presentation }: { presentation: 'sheet' | 'screen' }) {
  const router = useRouter();
  const c = useAdminColors();
  const { user, isAdmin, isSuperAdmin, hasModule } = useAuth();
  const { showToast } = useToast();
  const [counters, setCounters] = useState<Counters>({ activeCars: 0, activePlates: 0, pendingListings: 0, pendingApplications: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);

  const fetchCounters = useCallback(async () => {
    const head = { count: 'exact' as const, head: true };
    try {
      const [cars, plates, pendingCars, pendingPlates, apps] = await Promise.all([
        supabase.from('listings').select('id', head).eq('status', 'approved'),
        supabase.from('plates').select('id', head).eq('status', 'approved'),
        supabase.from('listings').select('id', head).eq('status', 'pending'),
        supabase.from('plates').select('id', head).eq('status', 'pending'),
        supabase.from('credit_applications').select('id', head).eq('status', 'pending'),
      ]);
      setCounters({
        activeCars: cars.count || 0,
        activePlates: plates.count || 0,
        pendingListings: (pendingCars.count || 0) + (pendingPlates.count || 0),
        pendingApplications: apps.count || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (user && isAdmin) fetchCounters();
  }, [user, isAdmin, fetchCounters]));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const confirmLogout = async () => {
    setLogoutVisible(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast('Xəta: ' + error.message, 'error');
      return;
    }
    haptics.success();
    showToast('Hesabdan çıxış edildi', 'info');
    if (presentation === 'sheet') close();
    else router.replace('/novo');
  };

  // Five taps on the version line open the hidden competition winners screen
  const onVersionTap = () => {
    const next = versionTaps + 1;
    if (next >= 5) {
      setVersionTaps(0);
      haptics.medium();
      router.push('/admin/secret-winners');
    } else {
      setVersionTaps(next);
    }
  };

  const signedIn = !!user && isAdmin;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AdminHeader
        title={signedIn ? 'Admin' : 'Admin girişi'}
        subtitle={signedIn ? 'Naxçıvan Avto idarəetmə paneli' : 'Panelə daxil olmaq üçün hesabınızla giriş edin'}
        hideBack={presentation === 'sheet'}
        backLabel="Sayt"
        modal={presentation === 'sheet'}
        right={presentation === 'sheet' ? <HeaderAction icon={X} label="Bağla" onPress={close} tint={c.text} /> : undefined}
      />

      <AdminScroll refreshing={refreshing} onRefresh={signedIn ? () => { setRefreshing(true); fetchCounters(); } : undefined}>
        {signedIn ? (
          <>
            <View style={styles.stats}>
              <StatTile label="Aktiv elan" value={counters.activeCars} />
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={() => { haptics.tap(); router.push('/admin/listings'); }}>
                <StatTile label="Təsdiq gözləyir" value={counters.pendingListings} tone={counters.pendingListings ? c.warning : undefined} />
              </TouchableOpacity>
              <StatTile label="Nömrə" value={counters.activePlates} />
            </View>

            {visibleAdminMenu(isSuperAdmin, 'native', hasModule).map((group) => (
              <Group key={group.group} title={group.group}>
                {group.items.map((item) => (
                  <GroupRow
                    key={item.path}
                    icon={item.icon}
                    tint={item.tint}
                    title={item.title}
                    subtitle={item.desc}
                    badge={item.badge ? counters[item.badge] : undefined}
                    onPress={() => router.push(item.path as any)}
                  />
                ))}
              </Group>
            ))}

            <Group>
              <GroupRow icon={LogOut} tint={c.primary} title="Hesabdan çıxış" destructive chevron={false} onPress={() => setLogoutVisible(true)} />
            </Group>

            <TouchableOpacity onPress={onVersionTap} activeOpacity={1} style={styles.versionWrap}>
              <Text style={[styles.version, { color: c.textSecondary }]}>
                Naxçıvan Avto Admin · v{Constants.expoConfig?.version}
              </Text>
              <Text style={[styles.version, { color: c.tertiary }]}>İlkin Rzayev / Novo Media · +994 51 500 00 77</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.loginCard, { backgroundColor: c.card, borderColor: c.hairline }]}>
            <View style={[styles.loginIcon, { backgroundColor: c.accentSoft }]}>
              <ShieldCheck size={22} color={c.primary} />
            </View>
            {/* After sign-in isAdmin flips and the menu renders */}
            <AdminLoginForm />
          </View>
        )}
      </AdminScroll>

      <ConfirmModal
        visible={logoutVisible}
        title="Hesabdan çıxış"
        message="Admin hesabından çıxmaq istəyirsiniz?"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutVisible(false)}
        confirmText="Çıxış"
        cancelText="Ləğv et"
        isDestructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  versionWrap: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  version: { fontSize: 12, fontFamily: F.medium },
  loginCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 20, marginTop: 8 },
  loginIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
});
