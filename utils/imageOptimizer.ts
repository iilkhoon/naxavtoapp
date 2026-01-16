import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Şəkli SÜRƏTLİ açılması üçün aqressiv optimizasiya:
 * 1. Genişlik: 800px (Mobil üçün tam yetərlidir, 1024px-dən daha yüngüldür)
 * 2. Keyfiyyət: 0.4 (40%) - Gözlə görünən ciddi fərq yoxdur, amma fayl ölçüsü çox kiçikdir.
 * 3. Format: JPEG
 */
export const compressImage = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], 
      { 
        compress: 0.4, 
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
