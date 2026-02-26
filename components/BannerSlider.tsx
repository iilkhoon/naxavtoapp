import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, FlatList, useWindowDimensions, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

interface BannerSliderProps {
    images: string[];
    height?: number;
    autoPlayInterval?: number;
    contentFit?: 'cover' | 'contain' | 'fill';
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
    images,
    height = 160,
    autoPlayInterval = 3000,
    contentFit = 'cover'
}) => {
    const { width } = useWindowDimensions();
    const itemWidth = Math.min(width - 40, 400); // Max width of 400px for banners (phone size)

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);

    // Use useMemo to prevent unnecessary re-calculations
    const validImages = useMemo(() => images.filter(img => img && img.length > 0), [images]);

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
    }, [validImages.length, autoPlayInterval, isAutoPlayPaused]); // Removed currentIndex dependency

    const renderItem = ({ item }: { item: string }) => (
        <Pressable
            onPressIn={() => setIsAutoPlayPaused(true)}
            onPressOut={() => setIsAutoPlayPaused(false)}
            style={[styles.slide, { height, width: itemWidth }]}
        >
            <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit={contentFit}
                transition={200}
            />
        </Pressable>
    );

    const onMomentumScrollEnd = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
        setCurrentIndex(index);
    };

    const getItemLayout = (_: any, index: number) => ({
        length: itemWidth,
        offset: itemWidth * index,
        index,
    });

    if (validImages.length === 0) return null;

    return (
        <View style={[styles.container, { height, width: itemWidth, alignSelf: 'center' }]}>
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
                contentContainerStyle={styles.listContent}
                snapToInterval={itemWidth}
                decelerationRate="fast"
                onScrollBeginDrag={() => setIsAutoPlayPaused(true)}
                onScrollEndDrag={() => setIsAutoPlayPaused(false)}
            />

            {validImages.length > 1 && (
                <View style={[styles.pagination, { width: itemWidth }]}>
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
        borderRadius: 16,
        overflow: 'hidden',
        // marginHorizontal: 20, // Handled by width calculation now
        position: 'relative',
    },
    listContent: {
        // paddingHorizontal: 0 is default
    },
    slide: {
        // width handled dynamically
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
        left: 0,
        // right: 0, // Removed right: 0 because width is explicit
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
