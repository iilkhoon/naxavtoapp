import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const STORAGE_PUBLIC_MARKER = '/storage/v1/object/public/images/';

/**
 * Şəkli WebP formatında sıxır və ölçüsünü kiçildir:
 * 1. Maksimum genişlik: 1024px
 * 2. Keyfiyyət: 0.65 (WebP üçün optimal keyfiyyət / minimum həcm balansı — ~40-75 KB)
 * 3. Format: WebP (image/webp)
 */
export const compressImage = async (uri: string, maxWidth = 1024, quality = 0.65) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.WEBP,
        base64: true,
      }
    );
    return result;
  } catch (error) {
    console.error('Image compression failed:', error);
    return { uri, width: 0, height: 0, base64: null };
  }
};

/**
 * Vebdə (<input type="file"> və ya Blob) seçilən şəkli HTML5 Canvas vasitəsilə
 * ölçüsünü kiçildərək (max 1024px) birbaşa WebP Blob-a çevirir.
 */
export const compressWebFile = async (
  file: File | Blob,
  maxWidth = 1024,
  quality = 0.65
): Promise<{ blob: Blob; uri: string }> => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    const uri = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '';
    return { blob: file, uri };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let targetWidth = img.naturalWidth || img.width || maxWidth;
        let targetHeight = img.naturalHeight || img.height || maxWidth;

        if (targetWidth > maxWidth) {
          const ratio = maxWidth / targetWidth;
          targetWidth = maxWidth;
          targetHeight = Math.max(1, Math.round(targetHeight * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ blob: file, uri: objectUrl });
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (webpBlob) => {
            URL.revokeObjectURL(objectUrl);
            if (!webpBlob) {
              const fallbackUri = URL.createObjectURL(file);
              resolve({ blob: file, uri: fallbackUri });
              return;
            }
            const previewUri = URL.createObjectURL(webpBlob);
            resolve({ blob: webpBlob, uri: previewUri });
          },
          'image/webp',
          quality
        );
      } catch {
        resolve({ blob: file, uri: objectUrl });
      }
    };

    img.onerror = () => {
      resolve({ blob: file, uri: objectUrl });
    };

    img.src = objectUrl;
  });
};

/**
 * Supabase public URL-dən "images" bucket daxilindəki nisbi fayl yolunu çıxarır.
 * Məsələn: ".../storage/v1/object/public/images/listings/abc.jpg" -> "listings/abc.jpg"
 */
export const extractStoragePath = (urlOrPath: string | null | undefined): string | null => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  const idx = trimmed.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx !== -1) {
    const rawPath = trimmed.slice(idx + STORAGE_PUBLIC_MARKER.length).split('?')[0];
    return decodeURIComponent(rawPath);
  }

  // Əgər artıq nisbi yoldursa (məs: "listings/123.webp")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.replace(/^\/+/, '');
  }

  return null;
};

/**
 * URL siyahısından unikal nisbi fayl yollarını çıxarır.
 */
export const extractStoragePaths = (urls: (string | null | undefined)[]): string[] => {
  const set = new Set<string>();
  for (const u of urls) {
    const p = extractStoragePath(u);
    if (p) set.add(p);
  }
  return Array.from(set);
};

/**
 * Verilən URL və ya fayl yollarını Supabase "images" bucket-dən silir.
 */
export const deleteStorageImages = async (
  supabaseClient: any,
  urlsOrPaths: (string | null | undefined)[]
): Promise<number> => {
  const paths = extractStoragePaths(urlsOrPaths);
  if (paths.length === 0) return 0;

  let removedCount = 0;
  try {
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { data, error } = await supabaseClient.storage.from('images').remove(chunk);
      if (!error && Array.isArray(data)) {
        removedCount += data.length;
      }
    }
  } catch (err) {
    console.warn('Failed to remove storage images:', err);
  }
  return removedCount;
};
