import React, { useMemo } from 'react';
import { View, Platform, useWindowDimensions, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { Image } from 'expo-image';

export const WebSideBanners = ({ side }: { side: 'left' | 'right' }) => {
    const { settings } = useSettings();
    const { width } = useWindowDimensions();

    // Only render on web platforms and when the screen is wide enough
    const isDesktop = width >= 1024;

    if (Platform.OS !== 'web' || !isDesktop) {
        return null;
    }

    const handlePress = async (url?: string) => {
        if (!url) return;
        const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
        const canOpen = await Linking.canOpenURL(formattedUrl);
        if (canOpen) {
            Linking.openURL(formattedUrl);
        }
    };

    const hasBanner = side === 'left' ? !!settings.web_left_banner_url : !!settings.web_right_banner_url;

    if (!hasBanner) {
        return null;
    }

    // Calculate dynamic size
    const MAX_CONTENT_WIDTH = 1260; // Slightly tighter than 1280 to ensure it fits perfectly next to it
    const BANNER_MAX_WIDTH = 160;

    // Space from screen edge to the center content wrapper
    const sideSpace = Math.max(0, (width - MAX_CONTENT_WIDTH) / 2);

    // Adaptive width: min 100px, max 160px.
    const bannerWidth = Math.max(100, Math.min(BANNER_MAX_WIDTH, sideSpace - 16));

    if (bannerWidth < 100) return null; // Not enough space to look good

    const bannerUrl = side === 'left' ? settings.web_left_banner_url : settings.web_right_banner_url;
    const bannerLink = side === 'left' ? settings.web_left_banner_link : settings.web_right_banner_link;

    return (
        <View style={[styles.bannerContainer, { width: bannerWidth }]}>
            <View style={styles.stickyWrapper}>
                <TouchableOpacity
                    style={styles.bannerTouchable}
                    onPress={() => handlePress(bannerLink)}
                    activeOpacity={0.9}
                >
                    <Image
                        source={{ uri: bannerUrl }}
                        style={styles.image}
                        contentFit="contain"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bannerContainer: {
        height: '100%',
        paddingHorizontal: 8,
        paddingTop: 48, // Aligns roughly with the top of the Son Elanlar section
    },
    stickyWrapper: {
        position: 'sticky' as any,
        top: 100, // Distance from the top of the screen when scrolling
        height: '80vh' as any, // Take up most of the viewport height when fully in view
        maxHeight: 800,
        zIndex: 10,
    },
    bannerTouchable: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
    }
});
