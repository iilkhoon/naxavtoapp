import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Heart, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { WebFooter } from '../../components/WebFooter.web';

export default function WebFavoritesScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFavorites = useCallback(async () => {
        setLoading(true);
        const favIds = await getFavorites();
        if (favIds.length === 0) {
            setListings([]);
            setLoading(false);
            return;
        }
        const { data } = await supabase
            .from('listings')
            .select('id, make, model, price, currency, image_url, images, location, created_at, mileage, engine, year, is_credit, is_barter, is_vip, is_new, short_id')
            .in('id', favIds);
        setListings(data || []);
        setLoading(false);
    }, []);

    // Load on mount + every focus
    useEffect(() => { loadFavorites(); }, []);
    useFocusEffect(useCallback(() => { loadFavorites(); }, []));

    const handleRemove = async (id: string) => {
        await toggleFavorite(id);
        setListings(prev => prev.filter(l => l.id !== id));
        showToast('Seçilmişlərdən silindi', 'info');
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ paddingTop: isMobile ? 60 : 76, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 16, paddingTop: 24 }]}>
                {/* Page header */}
                <View style={styles.pageHeader}>
                    <Heart size={28} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.pageTitle, { color: colors.text }]}>Seçilmişlər</Text>
                    {!loading && (
                        <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.countBadgeText}>{listings.length}</Text>
                        </View>
                    )}
                </View>

                {/* Loading */}
                {loading && (
                    <View style={{ alignItems: 'center', paddingTop: 80 }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                {/* Empty state */}
                {!loading && listings.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                            <Heart size={48} color={colors.border} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>Seçilmişlər boşdur</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Bəyəndiyiniz elanları ürək işarəsinə toxunaraq saxlaya bilərsiniz.
                        </Text>
                        <TouchableOpacity
                            style={[styles.browseBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/')}
                        >
                            <Text style={styles.browseBtnText}>Elanlara Bax →</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Grid */}
                {!loading && listings.length > 0 && (
                    <View style={[styles.grid, isMobile && { gap: 12 }]}>
                        {listings.map((car) => {
                            let allImages: string[] = [];
                            try {
                                if (Array.isArray(car.images) && car.images.length > 0) allImages = car.images;
                                else if (typeof car.images === 'string') allImages = JSON.parse(car.images);
                            } catch { }
                            if (!allImages.length && car.image_url) allImages = [car.image_url];
                            const mainImage = allImages[0] || '';
                            const formattedPrice = car.price.toLocaleString().replace(/,/g, '.');

                            return (
                                <TouchableOpacity
                                    key={car.id}
                                    style={[styles.card,
                                    { backgroundColor: colors.card, borderColor: colors.border },
                                    isMobile && { flexBasis: '48%', maxWidth: '50%' }
                                    ]}
                                    onPress={() => router.push(`/listing/${car.short_id || car.id}` as any)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.cardImgWrap, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                        {mainImage
                                            ? <Image source={{ uri: mainImage }} style={styles.cardImg} resizeMode="cover" />
                                            : <View style={[styles.cardImg, { justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Şəkil yoxdur</Text>
                                            </View>
                                        }
                                        {/* Top-left badges */}
                                        <View style={styles.badgesRow}>
                                            {car.is_credit && <View style={[styles.badge, { backgroundColor: '#007AFF' }]}><Text style={styles.badgeText}>Kredit</Text></View>}
                                            {car.is_barter && <View style={[styles.badge, { backgroundColor: '#FF9500' }]}><Text style={styles.badgeText}>Barter</Text></View>}
                                            {car.is_new && <View style={[styles.badge, { backgroundColor: '#34C759' }]}><Text style={styles.badgeText}>Yeni</Text></View>}
                                        </View>
                                        {/* VIP */}
                                        {car.is_vip && (
                                            <View style={[styles.vipBadge, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
                                                <Crown size={9} color="#FFD700" fill="#FFD700" />
                                                <Text style={{ color: isDark ? '#FFD700' : '#000', fontSize: 8, fontFamily: 'RethinkSans_800ExtraBold', marginLeft: 3 }}>VIP</Text>
                                            </View>
                                        )}
                                        {/* Remove (heart) */}
                                        <TouchableOpacity
                                            style={[styles.removeBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)' }]}
                                            onPress={(e: any) => { e.stopPropagation?.(); handleRemove(car.id); }}
                                        >
                                            <Heart size={16} color="#FF3B30" fill="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.cardBody}>
                                        <Text style={[styles.cardPrice, { color: colors.primary }]}>
                                            {formattedPrice} {car.currency === 'AZN' ? '₼' : car.currency}
                                        </Text>
                                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                                            {car.make} {car.model}
                                        </Text>
                                        <Text style={[styles.cardSpecs, { color: colors.textSecondary }]}>
                                            {car.year} • {car.engine} L • {car.mileage} km
                                        </Text>
                                        <Text style={[styles.cardLoc, { color: colors.textSecondary }]} numberOfLines={1}>
                                            📍 {car.location}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            <WebFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
        minHeight: 600,
    },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 32,
    },
    pageTitle: {
        fontSize: 30,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    countBadgeText: {
        color: '#FFF',
        fontFamily: 'RethinkSans_700Bold',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
        gap: 20,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    emptySubtitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        maxWidth: 360,
        lineHeight: 24,
    },
    browseBtn: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 20,
    },
    browseBtnText: {
        color: '#FFF',
        fontFamily: 'RethinkSans_700Bold',
        fontSize: 15,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        cursor: 'pointer' as any,
        flexBasis: 260,
        flexGrow: 1,
        maxWidth: 340,
    },
    cardImgWrap: {
        height: 190,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
    },
    cardImg: {
        width: '100%',
        height: '100%',
    },
    badgesRow: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        gap: 4,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'RethinkSans_700Bold',
    },
    vipBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    removeBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardBody: {
        padding: 16,
        gap: 4,
    },
    cardPrice: {
        fontSize: 20,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    cardTitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    cardSpecs: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
    },
    cardLoc: {
        fontSize: 11,
        fontFamily: 'RethinkSans_500Medium',
    },
    footer: {
        marginTop: 0,
    },
});
