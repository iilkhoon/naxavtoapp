import React from 'react';
import { View, Text, StyleSheet, Platform, Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface PlateVisualProps {
  region: string;
  series: string;
  number: string;
  scale?: number;
}

export const PlateVisual = ({ region, series, number, scale = 1 }: PlateVisualProps) => {
  const ImageComponent = Platform.OS === 'web' ? RNImage : ExpoImage;
  const imageProps = Platform.OS === 'web' 
    ? { 
        source: { uri: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg' },
        resizeMode: 'cover' as const
      }
    : { 
        source: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg',
        contentFit: 'cover' as const
      };

  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={styles.borderContainer}>
        <View style={styles.leftSection}>
          <ImageComponent 
            style={styles.flag}
            {...imageProps}
          />
          <Text style={styles.azText}>AZ</Text>
        </View>
        
        <View style={styles.numberSection}>
          <Text style={styles.text}>{region}</Text>
          <View style={styles.dash} />
          <Text style={styles.text}>{series}</Text>
          <View style={styles.dash} />
          <Text style={styles.text}>{number}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000000',
    width: 300,
    height: 64,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  leftSection: {
    width: 50,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  flag: {
    width: 36,
    height: 24,
    borderRadius: 2,
  },
  azText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  numberSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo-Bold' : 'monospace',
    includeFontPadding: false,
  },
  dash: {
    width: 10,
    height: 6,
    backgroundColor: '#000000',
    marginHorizontal: 6,
    borderRadius: 2,
  },
});
