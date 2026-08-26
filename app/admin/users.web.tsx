import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, TextInput, Platform
} from 'react-native';
import {
    Users, Search, ArrowLeft, ChevronRight, UserPlus, Mail, Calendar, Shield
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';

export default function AdminUsersWeb() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>İstifadəçilər</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Sistemdəki bütün istifadəçilərin siyahısı</Text>
                    </View>
                </View>
                
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/admin/add-user')}
                >
                    <UserPlus size={20} color="#FFF" />
                    <Text style={styles.addButtonText}>Yeni İstifadəçi</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Search and Stats Row */}
                <View style={styles.topRow}>
                    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Search size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Ad və ya email ilə axtar..."
                            placeholderTextColor={colors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    
                    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Users size={20} color={colors.primary} />
                        <Text style={[styles.statsText, { color: colors.text }]}>
                            Cəmi: <Text style={{ fontWeight: 'bold' }}>{users.length}</Text>
                        </Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.columnHeader, { flex: 2, color: colors.textSecondary }]}>İstifadəçi</Text>
                            <Text style={[styles.columnHeader, { flex: 2, color: colors.textSecondary }]}>Email</Text>
                            <Text style={[styles.columnHeader, { flex: 1, color: colors.textSecondary }]}>Rol</Text>
                            <Text style={[styles.columnHeader, { flex: 1, color: colors.textSecondary }]}>Qeydiyyat</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {filteredUsers.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={{ color: colors.textSecondary }}>İstifadəçi tapılmadı</Text>
                            </View>
                        ) : (
                            filteredUsers.map((user) => (
                                <TouchableOpacity 
                                    key={user.id} 
                                    style={[styles.tableRow, { borderBottomColor: colors.border }]}
                                    onPress={() => router.push(`/admin/user-detail?id=${user.id}`)}
                                >
                                    <View style={[styles.cell, { flex: 2 }]}>
                                        <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                                            <Text style={[styles.avatarText, { color: colors.primary }]}>
                                                {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                                            </Text>
                                        </View>
                                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                            {user.full_name || 'Adsız İstifadəçi'}
                                        </Text>
                                    </View>
                                    
                                    <View style={[styles.cell, { flex: 2 }]}>
                                        <Mail size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                        <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {user.email}
                                        </Text>
                                    </View>

                                    <View style={[styles.cell, { flex: 1 }]}>
                                        <View style={[styles.roleBadge, { backgroundColor: user.role === 'admin' ? '#FF3B3020' : '#34C75920' }]}>
                                            <Shield size={12} color={user.role === 'admin' ? '#FF3B30' : '#34C759'} style={{ marginRight: 4 }} />
                                            <Text style={[styles.roleText, { color: user.role === 'admin' ? '#FF3B30' : '#34C759' }]}>
                                                {user.role === 'admin' ? 'Admin' : 'İstifadəçi'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { flex: 1 }]}>
                                        <Calendar size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                            {formatDate(user.created_at)}
                                        </Text>
                                    </View>

                                    <ChevronRight size={20} color={colors.border} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingHorizontal: 40,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 40,
        paddingTop: 24,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
        outlineStyle: 'none',
    } as any,
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    statsText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
    },
    tableCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        padding: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
    },
    columnHeader: {
        fontSize: 13,
        fontFamily: 'RethinkSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        padding: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    cell: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    userEmail: {
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_700Bold',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    loadingContainer: {
        padding: 100,
        alignItems: 'center',
    }
});
