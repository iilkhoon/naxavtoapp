import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminLayout() {
    const { session, loading, isAdmin } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();

    useEffect(() => {
        if (!loading) {
            if (!session) {
                router.replace('/novo');
            } else if (!isAdmin) {
                router.replace('/novo');
            }
        }
    }, [session, loading, isAdmin]);

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
