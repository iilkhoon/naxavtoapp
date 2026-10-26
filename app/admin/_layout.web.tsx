import React, { useEffect, useState } from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LogOut, Menu, X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { WebHeader } from '../../components/WebHeader.web';
import { useWebTokens, useBreakpoints, Loading, HEADER_HEIGHT, FONT } from '../../components/web/WebKit';
import { visibleAdminMenu, ADMIN_MENU } from '../../constants/adminMenu';

type Counters = { pendingApplications: number; pendingListings: number };

export default function AdminLayoutWeb() {
    const { session, loading, isAdmin, isSuperAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [counters, setCounters] = useState<Counters>({ pendingApplications: 0, pendingListings: 0 });

    useEffect(() => {
        if (!loading && (!session || !isAdmin)) router.replace('/novo');
    }, [session, loading, isAdmin, router]);

    // Pending counts for the sidebar badges; refreshed on every page change
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        (async () => {
            const head = { count: 'exact' as const, head: true };
            const [apps, cars, plates] = await Promise.all([
                supabase.from('credit_applications').select('id', head).eq('status', 'pending'),
                supabase.from('listings').select('id', head).eq('status', 'pending'),
                supabase.from('plates').select('id', head).eq('status', 'pending'),
            ]);
            if (!cancelled) {
                setCounters({ pendingApplications: apps.count || 0, pendingListings: (cars.count || 0) + (plates.count || 0) });
            }
        })().catch(() => {});
        return () => { cancelled = true; };
    }, [isAdmin, pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/novo');
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: HEADER_HEIGHT.desktop }}>
                <WebHeader />
                <Loading />
            </View>
        );
    }

    if (!session || !isAdmin) return null;

    const groups = visibleAdminMenu(isSuperAdmin, 'web');
    const current = ADMIN_MENU.flatMap((g) => g.items).find((i) => pathname.startsWith(i.path));

    const sidebar = (
        <ScrollView
            style={[styles.sidebar, { backgroundColor: t.surface, borderRightColor: t.hairline }, isMobile && styles.drawer]}
            contentContainerStyle={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
        >
            <Text style={[styles.brand, { color: t.text }]}>Admin panel</Text>
            {groups.map((group) => (
                <View key={group.group} style={styles.group}>
                    <Text style={[styles.groupTitle, { color: t.textSecondary }]}>{group.group}</Text>
                    {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname.startsWith(item.path);
                        const badge = item.badge ? counters[item.badge] : 0;
                        return (
                            <TouchableOpacity
                                key={item.path}
                                aria-current={active ? 'page' : undefined}
                                style={[styles.item, active && { backgroundColor: t.fill }]}
                                onPress={() => {
                                    router.push(item.path as any);
                                    setDrawerOpen(false);
                                }}
                            >
                                <View style={[styles.itemIcon, { backgroundColor: item.tint }]}>
                                    <Icon size={13} color="#FFF" strokeWidth={2.4} />
                                </View>
                                <Text style={[styles.itemText, { color: t.text, fontFamily: active ? FONT.semibold : FONT.medium }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                {badge > 0 && (
                                    <View style={[styles.badge, { backgroundColor: t.accent }]}>
                                        <Text style={styles.badgeText}>{badge}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
            <TouchableOpacity style={[styles.item, { marginTop: 8 }]} onPress={handleLogout}>
                <View style={[styles.itemIcon, { backgroundColor: t.accentSoft }]}>
                    <LogOut size={13} color={t.accent} strokeWidth={2.4} />
                </View>
                <Text style={[styles.itemText, { color: t.accent }]}>Çıxış</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <View style={{ flex: 1, backgroundColor: t.bg, height: '100vh' as any }}>
            <WebHeader />
            <View style={[styles.body, { paddingTop: isMobile ? HEADER_HEIGHT.mobile : HEADER_HEIGHT.desktop }]}>
                {isMobile ? (
                    <>
                        <TouchableOpacity
                            style={[styles.mobileBar, { backgroundColor: t.surface, borderBottomColor: t.hairline }]}
                            onPress={() => setDrawerOpen((v) => !v)}
                            accessibilityLabel="Admin menyusu"
                        >
                            {drawerOpen ? <X size={18} color={t.text} /> : <Menu size={18} color={t.text} />}
                            <Text style={[styles.mobileBarText, { color: t.text }]} numberOfLines={1}>
                                {current?.title || 'Admin panel'}
                            </Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Slot />
                            {drawerOpen && (
                                <>
                                    <TouchableOpacity style={styles.scrim} onPress={() => setDrawerOpen(false)} accessibilityLabel="Menyunu bağla" />
                                    {sidebar}
                                </>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        {sidebar}
                        <View style={{ flex: 1, overflow: 'hidden' }}>
                            <Slot />
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    body: { flex: 1 },
    sidebar: { width: 248, flexGrow: 0, borderRightWidth: StyleSheet.hairlineWidth },
    drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 20, boxShadow: '0px 16px 48px rgba(0,0,0,0.2)' as any },
    sidebarContent: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 24 },
    brand: { fontSize: 20, fontFamily: FONT.heavy, letterSpacing: -0.4, paddingHorizontal: 10, marginBottom: 12 },
    group: { marginTop: 14 },
    groupTitle: { fontSize: 11, fontFamily: FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 10, marginBottom: 4 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 34, paddingHorizontal: 10, borderRadius: 8, cursor: 'pointer' as any },
    itemIcon: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    itemText: { flex: 1, fontSize: 14 },
    badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: '#FFF', fontSize: 11, fontFamily: FONT.bold },
    mobileBar: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, cursor: 'pointer' as any },
    mobileBarText: { fontSize: 16, fontFamily: FONT.semibold, flex: 1 },
    scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.25)' },
});
