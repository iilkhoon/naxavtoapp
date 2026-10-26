import React, { useState, useCallback } from 'react';
import { Heart, ArrowLeftRight } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useToast } from '../../contexts/ToastContext';
import { WebFooter } from '../../components/WebFooter.web';
import { SeoHead } from '../../components/web/SeoHead';
import { CarCard } from '../../components/CarCard';
import {
    WebScreen, LargeTitle, Button, WebGrid, HoverLift, EmptyState, Loading, useWebTokens, useBreakpoints, carCardProps,
} from '../../components/web/WebKit';

export default function WebFavoritesScreen() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const { showToast } = useToast();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFavorites = useCallback(async () => {
        try {
            const favIds = await getFavorites();
            if (favIds.length === 0) {
                setListings([]);
                return;
            }
            const { data, error } = await supabase
                .from('listings')
                .select('id, make, model, price, currency, image_url, images, location, created_at, mileage, engine, year, is_credit, is_barter, is_vip, is_urgent, is_new, short_id')
                .in('id', favIds)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setListings(data || []);
        } catch (e) {
            console.error(e);
            showToast('Seçilmişlər yüklənmədi', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    // Reload whenever the tab gets focus (favourites change on other pages)
    useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

    const handleRemove = async (id: string) => {
        setListings(prev => prev.filter(l => l.id !== id));
        await toggleFavorite(id);
        showToast('Seçilmişlərdən silindi', 'info');
    };

    return (
        <WebScreen footer={<WebFooter />}>
            <SeoHead title="Seçilmişlər" path="/favorites" />
            <LargeTitle
                title="Seçilmişlər"
                subtitle={loading ? undefined : listings.length ? `${listings.length} elan saxlanılıb` : 'Bəyəndiyiniz elanlar burada toplanır.'}
                right={listings.length >= 2 ? (
                    <Button
                        variant="secondary"
                        title="Müqayisə et"
                        icon={<ArrowLeftRight size={16} color={t.text} />}
                        onPress={() => router.push('/compare' as any)}
                    />
                ) : undefined}
            />

            {loading ? (
                <Loading />
            ) : listings.length === 0 ? (
                <EmptyState
                    icon={<Heart size={30} color={t.textSecondary} />}
                    title="Hələ heç nə seçilməyib"
                    subtitle="Elan kartındakı ürək işarəsinə toxunun — elan bura əlavə olunacaq."
                    action={<Button title="Elanlara bax" onPress={() => router.push('/')} />}
                />
            ) : (
                <WebGrid
                    data={listings}
                    keyExtractor={(c) => c.id}
                    minItemWidth={isMobile ? 150 : 220}
                    gap={isMobile ? 12 : 16}
                    renderItem={(car) => (
                        <HoverLift>
                            <CarCard
                                {...carCardProps(car)}
                                isFavorite
                                onToggleFavorite={handleRemove}
                                onPress={() => router.push(`/listing/${car.short_id || car.id}` as any)}
                            />
                        </HoverLift>
                    )}
                />
            )}
        </WebScreen>
    );
}
