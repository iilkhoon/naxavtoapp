import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Users, Search, ArrowLeft, ChevronRight, UserPlus, Shield
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { MotiView } from 'moti';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminUsers() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { isSuperAdmin, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!authLoading) {
            if (!isSuperAdmin) {
                showToast('Bu səhifəyə yalnız superadminlər daxil ola bilər!', 'error');
                router.back();
            } else {
                fetchUsers();
            }
        }
    }, [isSuperAdmin, authLoading]);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = users.filter(user => 
            (user.full_name?.toLowerCase().includes(query)) || 
            (user.email?.toLowerCase().includes(query))
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'admin')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (e: any) {
            showToast('İstifadəçilər yüklənərkən xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || (!isSuperAdmin && loading)) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Admin İstifadəçilər</Text>
                <TouchableOpacity 
                    onPress={() => router.push('/admin/add-user')}
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                >
                    <UserPlus size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Ad və ya email ilə axtar..."
                        placeholderTextColor={colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {filteredUsers.length === 0 ? (
                        <View style={styles.empty}>
                            <Users size={48} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Admin istifadəçi tapılmadı</Text>
                        </View>
                    ) : (
                        filteredUsers.map((user, index) => (
                            <MotiView
                                key={user.id}
                                from={{ opacity: 0, translateY: 10 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ delay: index * 50 }}
                            >
                                <TouchableOpacity 
                                    style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => router.push(`/admin/user-detail?id=${user.id}` as any)}
                                >
                                    <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                                            {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                                        </Text>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <View style={styles.nameRow}>
                                            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                                {user.full_name || 'Adsız İstifadəçi'}
                                            </Text>
                                            {user.is_superadmin ? (
                                                <View style={[styles.adminBadge, { backgroundColor: '#AF52DE15' }]}>
                                                    <Shield size={10} color="#AF52DE" />
                                                    <Text style={[styles.adminBadgeText, { color: '#AF52DE' }]}>Superadmin</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.adminBadge, { backgroundColor: '#FF3B3015' }]}>
                                                    <Shield size={10} color="#FF3B30" />
                                                    <Text style={styles.adminBadgeText}>Admin</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {user.email}
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} color={colors.border} />
                                </TouchableOpacity>
                            </MotiView>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
    addBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    searchSection: { padding: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, gap: 12 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 12 },
    emptyText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold' },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    userName: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
    userEmail: { fontSize: 13, fontFamily: 'RethinkSans_400Regular' },
    adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    adminBadgeText: { fontSize: 10, color: '#FF3B30', fontWeight: 'bold' }
});
