import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Text,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSettings } from '../contexts/SettingsContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableImageProps {
  uri: string;
  watermarkUrl?: string;
  watermarkStyle?: any;
  onZoomChange?: (isZoomed: boolean) => void;
  onToggleUI?: () => void;
  isActive: boolean;
}

const ZoomableImage = memo(({
  uri,
  watermarkUrl,
  watermarkStyle,
  onZoomChange,
  onToggleUI,
  isActive,
}: ZoomableImageProps) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset zoom when sliding away to another image
  useEffect(() => {
    if (!isActive) {
      scale.value = withTiming(1, { duration: 150 });
      savedScale.value = 1;
      translateX.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(0, { duration: 150 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      if (onZoomChange) onZoomChange(false);
    }
  }, [isActive, onZoomChange]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const nextScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(nextScale, 0.85), 5);
      if (onZoomChange && scale.value > 1.05) {
        runOnJS(onZoomChange)(true);
      }
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 250 });
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture is ONLY active when zoomed in (scale > 1.05), so FlatList receives 100% of swipes at 1x
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .manualActivation(true)
    .onTouchesMove((_e, state) => {
      if (scale.value > 1.05) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        const maxTranslateX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxTranslateY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

        const newX = savedTranslateX.value + e.translationX;
        const newY = savedTranslateY.value + e.translationY;

        // Allow slight rubber-band overdrag
        translateX.value = Math.min(Math.max(newX, -maxTranslateX - 40), maxTranslateX + 40);
        translateY.value = Math.min(Math.max(newY, -maxTranslateY - 40), maxTranslateY + 40);
      }
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else {
        const maxTranslateX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxTranslateY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

        if (Math.abs(translateX.value) > maxTranslateX) {
          translateX.value = withSpring(Math.sign(translateX.value) * maxTranslateX, { damping: 20, stiffness: 200 });
        }
        if (Math.abs(translateY.value) > maxTranslateY) {
          translateY.value = withSpring(Math.sign(translateY.value) * maxTranslateY, { damping: 20, stiffness: 200 });
        }
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onStart((e) => {
      if (scale.value > 1.1) {
        // Zoom back to 1x
        scale.value = withTiming(1, { duration: 250 });
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else {
        // Zoom in to 2.5x focused at tapped position
        const targetScale = 2.5;
        const targetX = (SCREEN_WIDTH / 2 - e.x) * (targetScale - 1);
        const targetY = (SCREEN_HEIGHT / 2 - e.y) * (targetScale - 1);

        const maxTranslateX = (SCREEN_WIDTH * (targetScale - 1)) / 2;
        const maxTranslateY = (SCREEN_HEIGHT * (targetScale - 1)) / 2;

        const clampedX = Math.min(Math.max(targetX, -maxTranslateX), maxTranslateX);
        const clampedY = Math.min(Math.max(targetY, -maxTranslateY), maxTranslateY);

        scale.value = withTiming(targetScale, { duration: 250 });
        translateX.value = withTiming(clampedX, { duration: 250 });
        translateY.value = withTiming(clampedY, { duration: 250 });
        savedScale.value = targetScale;
        savedTranslateX.value = clampedX;
        savedTranslateY.value = clampedY;
        if (onZoomChange) runOnJS(onZoomChange)(true);
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onStart(() => {
      if (onToggleUI) runOnJS(onToggleUI)();
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGestures);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={styles.imageContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.animatedImageWrapper, animatedStyle]}>
          <ExpoImage
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
          {watermarkUrl && (
            <ExpoImage
              source={{ uri: watermarkUrl }}
              style={watermarkStyle as any}
              contentFit="contain"
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

interface ImageViewerProps {
  visible: boolean;
  images: { uri: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewer = ({ visible, images, initialIndex = 0, onClose }: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setShowUI(true);
    }
  }, [visible, initialIndex]);

  const onScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize > 0) {
      const index = event.nativeEvent.contentOffset.x / slideSize;
      const roundIndex = Math.round(index);
      if (roundIndex >= 0 && roundIndex < images.length) {
        setCurrentIndex(roundIndex);
        setIsZoomed(false);
      }
    }
  }, [images.length]);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  const handleToggleUI = useCallback(() => {
    setShowUI((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  }, [currentIndex]);

  const getWatermarkStyle = useCallback(() => {
    const pos = settings.watermark_position || 'bottom_right';
    const scaleStr = settings.watermark_scale ? String(settings.watermark_scale).replace(',', '.') : '1';
    const scale = parseFloat(scaleStr) || 1;
    const baseStyle = { position: 'absolute', width: 100 * scale, height: 50 * scale, opacity: 0.6, zIndex: 5 };

    switch (pos) {
      case 'top_left': return { ...baseStyle, top: 100, left: 20 };
      case 'top_right': return { ...baseStyle, top: 100, right: 20 };
      case 'bottom_left': return { ...baseStyle, bottom: 100, left: 20 };
      case 'center': return { ...baseStyle, top: '50%', left: '50%', marginTop: -25 * scale, marginLeft: -50 * scale };
      default: return { ...baseStyle, bottom: 100, right: 20 };
    }
  }, [settings]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />

        {/* Header / Close Button */}
        {showUI && (
          <SafeAreaView style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.zoomHintBadge}>
                <ZoomIn size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
                <Text style={styles.zoomHintText}>İki dəfə toxun və ya iki barmaqla böyüt</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}

        {/* Image List */}
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          initialScrollIndex={initialIndex}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 100);
          }}
          renderItem={({ item, index }) => (
            <ZoomableImage
              uri={item.uri}
              watermarkUrl={settings.watermark_url}
              watermarkStyle={getWatermarkStyle()}
              onZoomChange={handleZoomChange}
              onToggleUI={handleToggleUI}
              isActive={currentIndex === index}
            />
          )}
        />

        {/* Left / Right Arrow Navigation Overlay */}
        {showUI && !isZoomed && images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.arrowButton, styles.leftArrow]}
                onPress={handlePrev}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <ChevronLeft size={28} color="#FFF" />
              </TouchableOpacity>
            )}
            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.arrowButton, styles.rightArrow]}
                onPress={handleNext}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <ChevronRight size={28} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Footer / Counter */}
        {showUI && (
          <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  zoomHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
  },
  closeButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  counterText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
