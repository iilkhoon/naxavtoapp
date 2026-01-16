import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width for standard mobile design (iPhone 11/12/13/14 Pro width)
const BASE_WIDTH = 375;

/**
 * Scales a size based on the screen width relative to the base width.
 * Useful for fonts, margins, paddings, and fixed heights.
 */
export const normalize = (size: number) => {
  const newSize = size * (SCREEN_WIDTH / BASE_WIDTH);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Returns true if the device is considered a tablet (width > 768px)
 */
export const isTablet = () => SCREEN_WIDTH >= 768;

/**
 * Returns the appropriate number of columns for a grid based on screen width
 */
export const getGridColumns = () => {
  if (SCREEN_WIDTH >= 1024) return 4; // Large Tablet/Desktop
  if (SCREEN_WIDTH >= 768) return 3;  // Tablet
  return 2; // Phone
};

/**
 * Calculates the width for a card item in a grid with spacing
 */
export const getCardWidth = (spacing: number = 20, columns?: number) => {
  const numColumns = columns || getGridColumns();
  // Total padding = spacing * 2 (left/right) + (spacing * (numColumns - 1)) (gaps between items)
  // Actually, usually grid logic is: (Screen - (Padding * 2) - (Gap * (Cols - 1))) / Cols
  const totalHorizontalPadding = spacing * 2; 
  const gapSpace = spacing * (numColumns - 1); // Gap between items
  
  const availableWidth = SCREEN_WIDTH - totalHorizontalPadding - gapSpace;
  return availableWidth / numColumns;
};

export const Screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};
