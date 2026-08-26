import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FloatingChatButton() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Do not show on web for this specific request, as user wanted it on mobile app only.
    if (Platform.OS === 'web') return null;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: colors.primary,
                    bottom: (Platform.OS === 'ios' ? insets.bottom + 70 : 70) + 16, // Above bottom tabs
                    shadowColor: isDark ? '#000' : colors.primary,
                }
            ]}
            onPress={() => router.push('/chat')}
            activeOpacity={0.8}
        >
            <MessageCircle size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        // Shadows
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
});
