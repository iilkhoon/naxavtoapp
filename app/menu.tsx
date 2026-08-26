import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, RefreshControl, Dimensions, StatusBar, Image as RNImage } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { X, LogOut, CarFront, Layers, Settings, Palette, FileText, AlertCircle, Hash, Crown, ChevronRight, TrendingUp, ShieldCheck, UserPlus, Bell, Zap, PieChart, Gift, MessageSquare, CreditCard, Users } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MotiView } from 'moti';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function MenuScreen() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [stats, setStats] = useState({ activeCars: 0, pendingListings: 0, activePlates: 0, totalUsers: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [versionClickCount, setVersionClickCount] = useState(0);

  const fetchStats = async () => {
    try {
      const { count: activeCars } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      const { count: pendingCars } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: pendingPlates } = await supabase.from('plates').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: activePlates } = await supabase.from('plates').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      setStats({ activeCars: activeCars || 0, pendingListings: (pendingCars || 0) + (pendingPlates || 0), activePlates: activePlates || 0, totalUsers: 1 });
    } catch (error) { console.error(error); } finally { setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { if (user) fetchStats(); }, [user]));
  const onRefresh = () => { setRefreshing(true); fetchStats(); };
  const handleLogoutPress = () => setLogoutModalVisible(true);
  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try { const { error } = await supabase.auth.signOut(); if (error) throw error; showToast('Hesabdan çıxış edildi', 'info'); router.dismiss(); } catch (error: any) { showToast('Xəta: ' + error.message, 'error'); }
  };

  const handleVersionClick = () => {
    const newCount = versionClickCount + 1;
    if (newCount === 5) {
      setVersionClickCount(0);
      router.push('/admin/secret-winners');
    } else {
      setVersionClickCount(newCount);
      // Optional: hide/show subtler feedback if needed
    }
  };

  const PremiumStatCard = ({ label, value, icon: Icon, gradientColors, delay }: any) => (
    <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay, type: 'timing', duration: 400 }} style={styles.statCardWrapper}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
        <View style={styles.statHeader}>
          <View style={styles.statIconContainer}><Icon size={18} color="#FFF" /></View>
          <View style={styles.trendBadge}><TrendingUp size={12} color="#FFF" /></View>
        </View>
        <View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
        <View style={styles.decorCircle1} /><View style={styles.decorCircle2} />
      </LinearGradient>
    </MotiView>
  );

  const PremiumMenuItem = ({ icon: Icon, label, desc, route, color, delay, isLast }: any) => (
    <MotiView from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay, type: 'timing' }}>
      <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }, isLast && { marginBottom: 0, borderBottomWidth: 0 }]} onPress={() => router.push(route)} activeOpacity={0.7}>
        <LinearGradient colors={[color, `${color}80`]} style={styles.menuIconContainer} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}><Icon size={20} color="#FFF" /></LinearGradient>
        <View style={styles.menuTextContainer}><Text style={[styles.menuTitle, { color: colors.text }]}>{label}</Text><Text style={[styles.menuDesc, { color: colors.textSecondary }]}>{desc}</Text></View>
        <View style={[styles.arrowContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}><ChevronRight size={16} color={colors.textSecondary} /></View>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerBg}>
        <LinearGradient colors={['#000000', '#1a1a1a', colors.background]} style={StyleSheet.absoluteFill} />
        <RNImage source={{ uri: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1000&q=80' }} style={styles.headerImage} blurRadius={3} />
        <LinearGradient colors={['rgba(0,0,0,0.6)', colors.background]} style={StyleSheet.absoluteFill} />
      </View>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <View style={styles.badgeContainer}><ShieldCheck size={12} color="#FFD700" style={{ marginRight: 4 }} /><Text style={styles.headerBadge}>ADMINISTRATOR</Text></View>
            <Text style={styles.headerTitle}>İdarəetmə Paneli</Text>
          </View>
          <TouchableOpacity onPress={() => router.dismiss()} style={styles.closeButton}><BlurView intensity={30} tint="dark" style={styles.closeButtonBlur}><X size={20} color="#FFF" /></BlurView></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>
          {user ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContainer} decelerationRate="fast" snapToInterval={150}>
                <PremiumStatCard label="Aktiv Elan" value={stats.activeCars} icon={CarFront} gradientColors={['#2E8B57', '#4CD964']} delay={0} />
                <PremiumStatCard label="Gözləyən" value={stats.pendingListings} icon={AlertCircle} gradientColors={['#FF5E3A', '#FF9500']} delay={100} />
                <PremiumStatCard label="Nömrələr" value={stats.activePlates} icon={Hash} gradientColors={['#5856D6', '#007AFF']} delay={200} />
              </ScrollView>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Əsas Əməliyyatlar</Text>
                <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <PremiumMenuItem icon={PieChart} label="Statistika" desc="Genişləndirilmiş tətbiq statistikası" route="/admin/statistics" color="#5856D6" delay={250} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  {isSuperAdmin && (
                    <>
                      <PremiumMenuItem icon={CreditCard} label="Kredit Paneli" desc="Kredit və nağd satışları idarə et" route="/admin/loans" color="#00C7BE" delay={260} />
                      <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    </>
                  )}
                  <PremiumMenuItem icon={FileText} label="Kredit Müraciətləri" desc="Müştəri kredit müraciətlərini idarə et" route="/admin/applications" color="#FF9500" delay={270} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={MessageSquare} label="Canlı Dəstək" desc="Müştəri çatlarına cavab verin" route="/admin/chats" color="#007AFF" delay={275} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={FileText} label="Elanlar" desc="Bütün elanları təsdiqlə və ya sil" route="/admin/listings" color="#FF3B30" delay={300} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={Crown} label="VIP Elanlar" desc="VIP statusunu idarə et" route="/admin/vip-listings" color="#FFD700" delay={350} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={Zap} label="Təcili Elanlar" desc="Təcili satış statusunu idarə et" route="/admin/urgent-listings" color="#FF3B30" delay={365} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={Bell} label="Bildirişlər" desc="İstifadəçilərə push bildiriş göndər" route="/admin/notifications" color="#AF52DE" delay={380} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={Layers} label="Reklam İdarəetməsi" desc="Banner və reklamları idarə et" route="/admin/banners" color="#34C759" delay={390} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  {isSuperAdmin && (
                    <>
                      <PremiumMenuItem icon={Users} label="Admin İstifadəçilər" desc="Admin və superadminləri idarə et" route="/admin/users" color="#5856D6" delay={395} />
                      <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    </>
                  )}
                  <PremiumMenuItem icon={Settings} label="Ayarlar" desc="Loqo, əlaqə və ümumi tənzimləmələr" route="/admin/settings" color="#007AFF" delay={400} />
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  <PremiumMenuItem icon={Gift} label="Yarışmalar" desc="Səhifə böyütmək üçün hədiyyəli yarışmalar" route="/admin/competitions" color="#FF9500" delay={410} isLast />
                </View>
              </View>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Verilənlər Bazası</Text>
                <View style={styles.grid}>
                  <TouchableOpacity style={[styles.smallCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/brands')} activeOpacity={0.7}>
                    <View style={[styles.smallCardIcon, { backgroundColor: 'rgba(175, 82, 222, 0.15)' }]}><CarFront size={24} color="#AF52DE" /></View>
                    <Text style={[styles.smallCardText, { color: colors.text }]}>Markalar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/models')} activeOpacity={0.7}>
                    <View style={[styles.smallCardIcon, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}><Layers size={24} color="#FF9500" /></View>
                    <Text style={[styles.smallCardText, { color: colors.text }]}>Modellər</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/admin/features')} activeOpacity={0.7}>
                    <View style={[styles.smallCardIcon, { backgroundColor: 'rgba(88, 86, 214, 0.15)' }]}><Palette size={24} color="#5856D6" /></View>
                    <Text style={[styles.smallCardText, { color: colors.text }]}>Xüsusiyyət</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={[styles.logoutButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)' }]} onPress={handleLogoutPress}>
                <LogOut size={20} color="#FF3B30" style={{ marginRight: 10 }} />
                <Text style={styles.logoutText}>Hesabdan Çıxış</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleVersionClick} activeOpacity={1}>
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>Naxçıvan Avto Admin v1.0.1</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.guestContainer}>
              <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={[styles.guestIconCircle, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}>
                <Crown size={50} color={colors.primary} />
              </MotiView>
              <Text style={[styles.guestTitle, { color: colors.text }]}>Giriş Tələb Olunur</Text>
              <Text style={[styles.guestSub, { color: colors.textSecondary }]}>Admin panelinə daxil olmaq üçün zəhmət olmasa hesabınıza giriş edin.</Text>
              <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginButtonText}>Giriş</Text>
                <ChevronRight size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <ConfirmModal visible={logoutModalVisible} title="Çıxış" message="Hesabdan çıxmaq istədiyinizə əminsiniz?" onConfirm={confirmLogout} onCancel={() => setLogoutModalVisible(false)} confirmText="Bəli, Çıx" cancelText="Ləğv et" isDestructive />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  headerImage: { width: '100%', height: '100%', opacity: 0.5 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: Platform.OS === 'android' ? 50 : 20 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  headerBadge: { color: '#FFD700', fontSize: 10, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: 1 },
  headerTitle: { color: '#FFF', fontSize: 28, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: 0.5 },
  closeButton: { borderRadius: 20, overflow: 'hidden' },
  closeButtonBlur: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  content: { paddingBottom: 50 },
  statsScroll: { marginTop: 10, marginBottom: 30 },
  statsContainer: { paddingHorizontal: 24, gap: 14 },
  statCardWrapper: { width: 140, height: 110, borderRadius: 24, overflow: 'hidden', boxShadow: '0px 8px 12px rgba(0, 0, 0, 0.3)', elevation: 8 },
  statCard: { flex: 1, padding: 16, justifyContent: 'space-between', position: 'relative' },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  trendBadge: { padding: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  statValue: { color: '#FFF', fontSize: 26, fontFamily: 'RethinkSans_800ExtraBold' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', marginTop: 2 },
  decorCircle1: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' },
  decorCircle2: { position: 'absolute', bottom: -10, left: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)' },
  section: { paddingHorizontal: 24, marginBottom: 30 },
  sectionTitle: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  menuGroup: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
  menuDesc: { fontSize: 12, fontFamily: 'RethinkSans_400Regular' },
  arrowContainer: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  separator: { height: 1, marginLeft: 72 },
  grid: { flexDirection: 'row', gap: 12 },
  smallCard: { flex: 1, height: 110, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  smallCardIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  smallCardText: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },
  logoutButton: { flexDirection: 'row', marginHorizontal: 24, padding: 18, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1 },
  logoutText: { color: '#FF3B30', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  versionText: { textAlign: 'center', marginTop: 20, fontSize: 12, opacity: 0.5, fontFamily: 'RethinkSans_400Regular' },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  guestIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2 },
  guestTitle: { fontSize: 24, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 12 },
  guestSub: { textAlign: 'center', marginBottom: 32, fontSize: 15, lineHeight: 24, opacity: 0.8, fontFamily: 'RethinkSans_400Regular' },
  loginButton: { flexDirection: 'row', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', width: '100%', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)', elevation: 5 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginRight: 8 },
});
