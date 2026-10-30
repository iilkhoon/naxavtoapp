import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { accessForPath } from '../../constants/adminMenu';

export default function AdminLayout() {
    const { session, loading, isAdmin, isSuperAdmin, hasModule } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { colors } = useTheme();
    // Sections the admin was not given (see "İstifadəçilər") are closed
    const access = accessForPath(pathname);
    const allowed = !access || (access === 'superadmin' ? isSuperAdmin : hasModule(access));

    useEffect(() => {
        if (!loading) {
            if (!session || !isAdmin) {
                router.replace('/novo');
            } else if (!allowed) {
                router.replace('/menu' as any);
            }
        }
    }, [session, loading, isAdmin, allowed]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!session || !isAdmin) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
            }}
        />
    );
}
