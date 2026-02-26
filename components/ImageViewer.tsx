import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { X } from 'lucide-react-native';
import { useSettings } from '../contexts/SettingsContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  images: { uri: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewer = ({ visible, images, initialIndex = 0, onClose }: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { settings } = useSettings();

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setCurrentIndex(roundIndex);
  };

  const getWatermarkStyle = () => {
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
  };

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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />

        {/* Close Button */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Image List */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          initialScrollIndex={initialIndex}
          onScroll={onScroll}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent
                contentContainerStyle={styles.scrollContent}
              >
                <ExpoImage
                  source={{ uri: item.uri }}
                  style={styles.image}
                  contentFit="contain"
                  transition={200}
                />
              </ScrollView>

              {settings.watermark_url && (
                <ExpoImage
                  source={{ uri: settings.watermark_url }}
                  style={getWatermarkStyle() as any}
                  contentFit="contain"
                />
              )}
            </View>
          )}
        />

        {/* Footer / Counter */}
        <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      </View>
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
    zIndex: 10,
    alignItems: 'flex-end',
    padding: 20,
  },
  closeButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
});
