import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Instagram, X, ArrowRight } from 'lucide-react-native';
import { useSettings } from '../contexts/SettingsContext';
import { Image } from 'expo-image';

export const InstagramPopup = () => {
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if enabled
        if (settings.startup_popup_enabled === 'true') {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [settings.startup_popup_enabled]);

    const handleAction = async () => {
        const url = settings.startup_popup_url || 'https://www.instagram.com/naxcivan_avto/';
        const canOpen = await Linking.canOpenURL(url);

        if (canOpen) {
            await Linking.openURL(url);
        }
        setIsVisible(false);
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const title = settings.startup_popup_title || 'Sən hələdə instagramda bizi izləmirsən?';
    const subtitle = settings.startup_popup_subtitle || 'Ən son elanlardan və yeniliklərdən xəbərdar olmaq üçün bizi izlə!';
    const buttonText = settings.startup_popup_button_text || 'Bizi İzlə';
    const imageUrl = settings.startup_popup_image;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        {imageUrl ? (
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.popupImage}
                                    contentFit="cover"
                                />
                            </View>
                        ) : (
                            <View style={styles.iconContainer}>
                                <Instagram size={48} color="#E1306C" />
                            </View>
                        )}

                        <Text style={[styles.title, { color: colors.text }]}>
                            {title}
                        </Text>

                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {subtitle}
                        </Text>

                        <TouchableOpacity
                            style={[styles.followButton, { backgroundColor: imageUrl ? colors.primary : '#E1306C' }]}
                            onPress={handleAction}
                        >
                            {!imageUrl && <Instagram size={20} color="white" style={styles.buttonIcon} />}
                            <Text style={styles.buttonText}>{buttonText}</Text>
                            {imageUrl && <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        ...Platform.select({
            ios: { justifyContent: 'flex-end' },
            android: { justifyContent: 'flex-end' },
            web: { justifyContent: 'center', alignItems: 'center' },
        }),
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 16,
        borderWidth: 1,
        borderBottomWidth: 0,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 20,
            },
            web: {
                width: 400,
                maxWidth: '90%',
                borderRadius: 24,
                borderBottomWidth: 1,
                boxShadow: '0px 8px 30px rgba(0,0,0,0.15)' as any,
            }
        }),
    },
    header: {
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    closeButton: {
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
    },
    body: {
        alignItems: 'center',
        paddingBottom: 24,
    },
    iconContainer: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: 'rgba(225, 48, 108, 0.1)',
        borderRadius: 50,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    popupImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'RethinkSans_600SemiBold',
    },
});
