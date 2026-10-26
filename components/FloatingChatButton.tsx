import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of the bar the button has to clear: the system tab bar on iOS,
// the floating custom tab bar (plus its margin) on Android.
const TAB_BAR_CLEARANCE = Platform.select({ ios: 49, default: 70 });

export function FloatingChatButton() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Mobile only
    if (Platform.OS === 'web') return null;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: colors.primary,
                    bottom: insets.bottom + TAB_BAR_CLEARANCE + 14,
                },
            ]}
            onPress={() => router.push('/chat')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Canlı dəstək"
        >
            <MessageCircle size={24} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        right: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        boxShadow: '0px 6px 16px rgba(255, 59, 48, 0.32), 0px 2px 4px rgba(0, 0, 0, 0.12)',
    },
});
