import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface LoadingAnimationProps {
    size?: number;
    fullScreen?: boolean;
}

export default function LoadingAnimation({ size = 200, fullScreen = true }: LoadingAnimationProps) {
    const { colors } = useTheme();
    const finalSize = Platform.OS === 'web' ? 50 : size;

    if (!fullScreen) {
        return (
            <View style={styles.centered}>
                <LottieView
                    source={require('../icons/loading-animation.json')}
                    autoPlay
                    loop
                    style={{
                        width: finalSize,
                        height: finalSize,
                        marginLeft: 15, // Bir balaca sağa sürüşdür (Vizuallığı düzəltmək üçün)
                    }}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LottieView
                source={require('../icons/loading-animation.json')}
                autoPlay
                loop
                style={{
                    width: finalSize,
                    height: finalSize,
                    marginLeft: 15, // Bir balaca sağa sürüşdür (Vizuallığı düzəltmək üçün)
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
