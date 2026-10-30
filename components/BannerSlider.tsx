import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, FlatList, useWindowDimensions, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { openTarget } from '../lib/links';

interface BannerSliderProps {
    images: string[];
    /** Per-image target (listing or URL), same order as images; see lib/links */
    links?: (string | undefined)[];
    height?: number;
    autoPlayInterval?: number;
    contentFit?: 'cover' | 'contain' | 'fill';
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
    images,
    links = [],
    height = 160,
    autoPlayInterval = 3000,
    contentFit = 'cover'
}) => {
    const { width } = useWindowDimensions();
    const itemWidth = Math.min(width - 40, 400); // Inner visible banner width

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);

    // Empty slots are dropped together with their link so the pairs stay aligned
    const slides = useMemo(
        () => images.map((image, i) => ({ image, link: links[i] })).filter((s) => s.image && s.image.length > 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [images.join('|'), links.join('|')],
    );
    const validImages = slides.map((s) => s.image);

    useEffect(() => {
        if (validImages.length <= 1 || isAutoPlayPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => {
                const nextIndex = prevIndex === validImages.length - 1 ? 0 : prevIndex + 1;
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                return nextIndex;
            });
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [validImages.length, autoPlayInterval, isAutoPlayPaused]);

    const renderItem = ({ item, index }: { item: string; index: number }) => {
        const link = slides[index]?.link;
        return (
        <View style={{ width, justifyContent: 'center', alignItems: 'center' }}>
            <Pressable
                onPressIn={() => setIsAutoPlayPaused(true)}
                onPressOut={() => setIsAutoPlayPaused(false)}
                onPress={link ? () => openTarget(link) : undefined}
                accessibilityRole={link ? 'link' : undefined}
                style={[styles.slide, { height, width: itemWidth }]}
            >
                <Image
                    source={{ uri: item }}
                    accessibilityLabel={`Reklam banneri ${index + 1}`}
                    style={styles.image}
                    contentFit={contentFit}
                    transition={200}
                />
            </Pressable>
        </View>
        );
    };

    const onMomentumScrollEnd = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    const getItemLayout = (_: any, index: number) => ({
        length: width,
        offset: width * index,
        index,
    });

    if (validImages.length === 0) return null;

    return (
        <View style={[styles.container, { height, width }]}>
            <FlatList
                ref={flatListRef}
                data={validImages}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => index.toString()}
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={getItemLayout}
                decelerationRate="fast"
                onScrollBeginDrag={() => setIsAutoPlayPaused(true)}
                onScrollEndDrag={() => setIsAutoPlayPaused(false)}
            />

            {validImages.length > 1 && (
                <View style={[styles.pagination, { width: width }]}>
                    {validImages.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                index === currentIndex ? styles.paginationDotActive : styles.paginationDotInactive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        position: 'relative',
    },
    slide: {
        overflow: 'hidden',
        borderRadius: 16,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        position: 'absolute',
        bottom: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    paginationDot: {
        height: 6,
        borderRadius: 3,
    },
    paginationDotActive: {
        width: 20,
        backgroundColor: '#FFFFFF',
    },
    paginationDotInactive: {
        width: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});
