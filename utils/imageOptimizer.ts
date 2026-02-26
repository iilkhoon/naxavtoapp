import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Şəkli SÜRƏTLİ açılması üçün optimal optimizasiya:
 * 1. Genişlik: 1024px (Daha keyfiyyətli görünüş üçün artırıldı)
 * 2. Keyfiyyət: 0.7 (70%) - Balanslı keyfiyyət və ölçü.
 * 3. Format: JPEG
 */
export const compressImage = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );
    return result;
  } catch (error) {
    console.error("Image compression failed:", error);
    return { uri, width: 0, height: 0, base64: null };
  }
};
