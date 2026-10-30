import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import {
  compressImage,
  compressWebFile,
  extractStoragePath,
  deleteStorageImages,
} from './imageOptimizer';

export interface StorageAuditReport {
  totalFiles: number;
  totalSizeMB: number;
  webpFiles: number;
  legacyFiles: number;
  orphanedFiles: string[];
  orphanedSizeMB: number;
  listingsToConvert: number;
  listingImagesToConvert: number;
  settingsImagesToConvert: number;
  competitionImagesToConvert: number;
  emptyChatsIds: string[];
}

export interface OptimizationProgress {
  phase: 'analyzing' | 'cleaning_db' | 'converting_settings' | 'converting_listings' | 'cleaning_storage' | 'done';
  message: string;
  current: number;
  total: number;
  convertedImages: number;
  deletedFiles: number;
  deletedEmptyChats: number;
  savedMB: number;
}

const isLegacyImageUrl = (url: string | null | undefined): boolean => {
  const p = extractStoragePath(url);
  if (!p) return false;
  return /\.(jpe?g|png)$/i.test(p);
};

const listAllFolderFiles = async (
  supabaseClient: any,
  folder: string
): Promise<{ path: string; size: number }[]> => {
  const results: { path: string; size: number }[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabaseClient.storage
      .from('images')
      .list(folder, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error || !data || data.length === 0) break;

    for (const item of data) {
      if (item.id && item.name) {
        const fullPath = folder ? `${folder}/${item.name}` : item.name;
        const size = Number(item.metadata?.size || 0);
        results.push({ path: fullPath, size });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return results;
};

/**
 * Supabase bazasını və Storage-i analiz edir:
 * - Köhnə (.jpg / .png) şəkillərin sayını
 * - İstifadə olunmayan (yetim / orphan) faylları və tutduğu həcmi
 * - Mesajı olmayan boş çatları (chats)
 */
export const analyzeDatabaseAndStorage = async (
  supabaseClient: any
): Promise<StorageAuditReport> => {
  const [listingsRes, settingsRes, compRes, brandsRes, chatsRes, msgsRes] = await Promise.all([
    supabaseClient.from('listings').select('id, image_url, images'),
    supabaseClient.from('app_settings').select('key, value'),
    supabaseClient.from('competitions').select('id, prize_image_url, story_image_url'),
    supabaseClient.from('brands').select('id, logo_url'),
    supabaseClient.from('chats').select('id'),
    supabaseClient.from('messages').select('chat_id'),
  ]);

  const referencedPaths = new Set<string>();
  let listingsToConvert = 0;
  let listingImagesToConvert = 0;

  for (const l of listingsRes.data || []) {
    const urls = new Set<string>();
    if (l.image_url) urls.add(l.image_url);
    if (Array.isArray(l.images)) {
      for (const u of l.images) if (u) urls.add(u);
    }
    let hasLegacy = false;
    for (const u of urls) {
      const p = extractStoragePath(u);
      if (p) referencedPaths.add(p);
      if (isLegacyImageUrl(u)) {
        hasLegacy = true;
        listingImagesToConvert++;
      }
    }
    if (hasLegacy) listingsToConvert++;
  }

  let settingsImagesToConvert = 0;
  for (const s of settingsRes.data || []) {
    const p = extractStoragePath(s.value);
    if (p) {
      referencedPaths.add(p);
      if (isLegacyImageUrl(s.value)) settingsImagesToConvert++;
    }
  }

  let competitionImagesToConvert = 0;
  for (const c of compRes.data || []) {
    for (const u of [c.prize_image_url, c.story_image_url]) {
      const p = extractStoragePath(u);
      if (p) {
        referencedPaths.add(p);
        if (isLegacyImageUrl(u)) competitionImagesToConvert++;
      }
    }
  }

  for (const b of brandsRes.data || []) {
    const p = extractStoragePath(b.logo_url);
    if (p) referencedPaths.add(p);
  }

  // Boş çatları tap (0 mesajı olanlar)
  const chatIdsWithMessages = new Set<string>((msgsRes.data || []).map((m: any) => m.chat_id));
  const emptyChatsIds: string[] = (chatsRes.data || [])
    .filter((ch: any) => !chatIdsWithMessages.has(ch.id))
    .map((ch: any) => ch.id);

  // Storage qovluqlarını yoxla
  const folders = ['listings', 'banners', 'competitions', 'settings'];
  const folderLists = await Promise.all(folders.map((f) => listAllFolderFiles(supabaseClient, f)));
  const allFiles = folderLists.flat();

  let totalBytes = 0;
  let webpFiles = 0;
  let legacyFiles = 0;
  const orphanedFiles: string[] = [];
  let orphanedBytes = 0;

  for (const f of allFiles) {
    totalBytes += f.size;
    if (/\.webp$/i.test(f.path)) webpFiles++;
    else if (/\.(jpe?g|png)$/i.test(f.path)) legacyFiles++;

    if (!referencedPaths.has(f.path)) {
      orphanedFiles.push(f.path);
      orphanedBytes += f.size;
    }
  }

  return {
    totalFiles: allFiles.length,
    totalSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    webpFiles,
    legacyFiles,
    orphanedFiles,
    orphanedSizeMB: Number((orphanedBytes / (1024 * 1024)).toFixed(2)),
    listingsToConvert,
    listingImagesToConvert,
    settingsImagesToConvert,
    competitionImagesToConvert,
    emptyChatsIds,
  };
};

/**
 * Tək bir Supabase Storage şəkil URL-ini endirib WebP-ə çevirir və yenidən yükləyir.
 */
const convertSingleSupabaseUrlToWebp = async (
  supabaseClient: any,
  url: string,
  maxWidth = 1024,
  quality = 0.65
): Promise<{ newUrl: string; oldPath: string | null; savedBytes: number }> => {
  const oldPath = extractStoragePath(url);
  if (!oldPath || /\.webp$/i.test(oldPath)) {
    return { newUrl: url, oldPath: null, savedBytes: 0 };
  }

  const newPath = oldPath.replace(/\.(jpe?g|png)$/i, '.webp');

  try {
    if (Platform.OS === 'web') {
      const response = await fetch(url);
      if (!response.ok) return { newUrl: url, oldPath: null, savedBytes: 0 };
      const originalBlob = await response.blob();
      const originalSize = originalBlob.size;

      const { blob: webpBlob, uri: previewUri } = await compressWebFile(originalBlob, maxWidth, quality);
      if (previewUri && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(previewUri);
      }

      const { error: uploadErr } = await supabaseClient.storage
        .from('images')
        .upload(newPath, webpBlob, { contentType: 'image/webp', upsert: false });

      if (uploadErr && !/already exists|Duplicate/i.test(uploadErr.message || '')) {
        throw uploadErr;
      }

      const { data: { publicUrl } } = supabaseClient.storage.from('images').getPublicUrl(newPath);
      const savedBytes = Math.max(0, originalSize - webpBlob.size);
      return { newUrl: publicUrl, oldPath: oldPath !== newPath ? oldPath : null, savedBytes };
    } else {
      const compressed = await compressImage(url, maxWidth, quality);
      if (!compressed.base64) return { newUrl: url, oldPath: null, savedBytes: 0 };

      const buffer = decode(compressed.base64);
      const { error: uploadErr } = await supabaseClient.storage
        .from('images')
        .upload(newPath, buffer, { contentType: 'image/webp', upsert: false });

      if (uploadErr && !/already exists|Duplicate/i.test(uploadErr.message || '')) {
        throw uploadErr;
      }

      const { data: { publicUrl } } = supabaseClient.storage.from('images').getPublicUrl(newPath);
      // Təxmini qənaət: köhnə ~215KB - yeni ölçü
      const savedBytes = Math.max(0, 215000 - buffer.byteLength);
      return { newUrl: publicUrl, oldPath: oldPath !== newPath ? oldPath : null, savedBytes };
    }
  } catch (err) {
    console.warn('WebP conversion failed for:', url, err);
    return { newUrl: url, oldPath: null, savedBytes: 0 };
  }
};

/**
 * Bazadakı lazımsız məlumatları (boş çatlar, dublikat push_tokens, yetim şəkillər) təmizləyir
 * və bütün mövcud şəkilləri (ayarlar, reklamlar, yarışmalar, elanlar) WebP formatına çevirir.
 */
export const runFullWebpAndDatabaseOptimization = async (
  supabaseClient: any,
  onProgress?: (p: OptimizationProgress) => void,
  shouldCancel?: () => boolean
): Promise<OptimizationProgress> => {
  const state: OptimizationProgress = {
    phase: 'analyzing',
    message: 'Baza və Storage analiz edilir...',
    current: 0,
    total: 100,
    convertedImages: 0,
    deletedFiles: 0,
    deletedEmptyChats: 0,
    savedMB: 0,
  };
  let totalSavedBytes = 0;

  const emit = (patch?: Partial<OptimizationProgress>) => {
    if (patch) Object.assign(state, patch);
    state.savedMB = Number((totalSavedBytes / (1024 * 1024)).toFixed(2));
    onProgress?.({ ...state });
  };

  emit();

  // 1. Əgər SQL RPC mövcuddursa, server-tərəfli sürətli təmizliyi işə sal
  try {
    const { data: rpcResult } = await supabaseClient.rpc('cleanup_database_and_storage');
    if (rpcResult && typeof rpcResult === 'object') {
      state.deletedEmptyChats += Number(rpcResult.deleted_empty_chats || 0);
      state.deletedFiles += Number(rpcResult.deleted_orphan_files || 0);
    }
  } catch {
    // RPC hələ yaradılmayıbsa, client-tərəfli davam edirik
  }

  const audit = await analyzeDatabaseAndStorage(supabaseClient);

  // 2. Boş çatları və dublikat push_tokens-ləri təmizlə
  emit({
    phase: 'cleaning_db',
    message: `Baza təmizlənir (${audit.emptyChatsIds.length} boş çat)...`,
    current: 0,
    total: Math.max(1, audit.emptyChatsIds.length),
  });

  if (audit.emptyChatsIds.length > 0) {
    for (let i = 0; i < audit.emptyChatsIds.length; i += 50) {
      const chunk = audit.emptyChatsIds.slice(i, i + 50);
      const { error } = await supabaseClient.from('chats').delete().in('id', chunk);
      if (!error) state.deletedEmptyChats += chunk.length;
      emit({ current: Math.min(audit.emptyChatsIds.length, i + 50) });
    }
  }

  // Dublikat push_tokens təmizliyi
  try {
    const { data: tokens } = await supabaseClient
      .from('push_tokens')
      .select('token, device_id, created_at')
      .limit(2000);
    if (tokens && tokens.length > 0) {
      const byDevice: Record<string, any[]> = {};
      for (const r of tokens) {
        if (r.device_id) {
          if (!byDevice[r.device_id]) byDevice[r.device_id] = [];
          byDevice[r.device_id].push(r);
        }
      }
      const dupTokens: string[] = [];
      for (const rows of Object.values(byDevice)) {
        if (rows.length > 1) {
          rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          for (let i = 1; i < rows.length; i++) dupTokens.push(rows[i].token);
        }
      }
      if (dupTokens.length > 0) {
        await supabaseClient.from('push_tokens').delete().in('token', dupTokens);
      }
    }
  } catch {
    // ignore
  }

  // 3. Yetim (orphaned) Storage fayllarını sil
  if (audit.orphanedFiles.length > 0) {
    emit({
      phase: 'cleaning_storage',
      message: `${audit.orphanedFiles.length} istifadəsiz şəkil (${audit.orphanedSizeMB} MB) silinir...`,
      current: 0,
      total: audit.orphanedFiles.length,
    });
    const removed = await deleteStorageImages(supabaseClient, audit.orphanedFiles);
    state.deletedFiles += removed;
    if (removed > 0) {
      totalSavedBytes += audit.orphanedSizeMB * 1024 * 1024;
    }
    emit({ current: audit.orphanedFiles.length });
  }

  if (shouldCancel?.()) {
    emit({ phase: 'done', message: 'Optimizasiya dayandırıldı.' });
    return state;
  }

  // 4. Ayarlar (bannerlər, loqo, watermark) və Yarışmalar şəkillərini WebP-ə çevir
  emit({
    phase: 'converting_settings',
    message: 'Reklam bannerləri, loqo və yarışma şəkilləri WebP-ə çevrilir...',
    current: 0,
    total: Math.max(1, audit.settingsImagesToConvert + audit.competitionImagesToConvert),
  });

  const { data: settingsRows } = await supabaseClient.from('app_settings').select('*');
  for (const row of settingsRows || []) {
    if (shouldCancel?.()) break;
    if (isLegacyImageUrl(row.value)) {
      const { newUrl, oldPath, savedBytes } = await convertSingleSupabaseUrlToWebp(
        supabaseClient,
        row.value,
        1200,
        0.7
      );
      if (newUrl !== row.value) {
        const { error } = await supabaseClient
          .from('app_settings')
          .update({ value: newUrl })
          .eq('key', row.key);
        if (!error) {
          state.convertedImages++;
          totalSavedBytes += savedBytes;
          if (oldPath) {
            const del = await deleteStorageImages(supabaseClient, [oldPath]);
            state.deletedFiles += del;
          }
        }
      }
      emit({ current: state.convertedImages });
    }
  }

  const { data: compRows } = await supabaseClient
    .from('competitions')
    .select('id, prize_image_url, story_image_url');
  for (const comp of compRows || []) {
    if (shouldCancel?.()) break;
    const patch: Record<string, string> = {};
    const oldPaths: string[] = [];

    for (const field of ['prize_image_url', 'story_image_url'] as const) {
      const val = comp[field];
      if (isLegacyImageUrl(val)) {
        const { newUrl, oldPath, savedBytes } = await convertSingleSupabaseUrlToWebp(
          supabaseClient,
          val,
          1080,
          0.68
        );
        if (newUrl !== val) {
          patch[field] = newUrl;
          state.convertedImages++;
          totalSavedBytes += savedBytes;
          if (oldPath) oldPaths.push(oldPath);
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseClient.from('competitions').update(patch).eq('id', comp.id);
      if (!error && oldPaths.length > 0) {
        const del = await deleteStorageImages(supabaseClient, oldPaths);
        state.deletedFiles += del;
      }
      emit();
    }
  }

  // 5. Bütün elanların (listings) şəkillərini WebP-ə çevir
  const { data: allListings } = await supabaseClient
    .from('listings')
    .select('id, image_url, images')
    .order('created_at', { ascending: false });

  const legacyListings = (allListings || []).filter((l: any) => {
    if (isLegacyImageUrl(l.image_url)) return true;
    if (Array.isArray(l.images) && l.images.some((u: string) => isLegacyImageUrl(u))) return true;
    return false;
  });

  emit({
    phase: 'converting_listings',
    message: `Elan şəkilləri WebP-ə çevrilir (0 / ${legacyListings.length} elan)...`,
    current: 0,
    total: Math.max(1, legacyListings.length),
  });

  let processedListings = 0;
  const CONCURRENCY = 3;

  for (let i = 0; i < legacyListings.length; i += CONCURRENCY) {
    if (shouldCancel?.()) break;
    const batch = legacyListings.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (listing: any) => {
        if (shouldCancel?.()) return;

        const originalList: string[] =
          Array.isArray(listing.images) && listing.images.length > 0
            ? listing.images
            : listing.image_url
            ? [listing.image_url]
            : [];

        if (originalList.length === 0) return;

        const oldPathsToDelete: string[] = [];
        const newImages: string[] = [];

        // Elanın şəkillərini paralel çevir
        const convertedResults = await Promise.all(
          originalList.map(async (imgUrl) => {
            if (!isLegacyImageUrl(imgUrl)) {
              return { newUrl: imgUrl, oldPath: null, savedBytes: 0, changed: false };
            }
            const res = await convertSingleSupabaseUrlToWebp(supabaseClient, imgUrl, 1024, 0.65);
            return { ...res, changed: res.newUrl !== imgUrl };
          })
        );

        let anyChanged = false;
        for (const r of convertedResults) {
          newImages.push(r.newUrl);
          if (r.changed) {
            anyChanged = true;
            state.convertedImages++;
            totalSavedBytes += r.savedBytes;
            if (r.oldPath) oldPathsToDelete.push(r.oldPath);
          }
        }

        if (anyChanged) {
          const newMainUrl = newImages[0] || listing.image_url;
          const { error: updateErr } = await supabaseClient
            .from('listings')
            .update({
              image_url: newMainUrl,
              images: newImages,
            })
            .eq('id', listing.id);

          if (!updateErr && oldPathsToDelete.length > 0) {
            const del = await deleteStorageImages(supabaseClient, oldPathsToDelete);
            state.deletedFiles += del;
          }
        }

        processedListings++;
        emit({
          current: processedListings,
          message: `Elan şəkilləri WebP-ə çevrilir (${processedListings} / ${legacyListings.length} elan • ${state.convertedImages} şəkil)...`,
        });
      })
    );
  }

  emit({
    phase: 'done',
    current: legacyListings.length,
    total: Math.max(1, legacyListings.length),
    message: `Tamamlandı! ${state.convertedImages} şəkil WebP-ə çevrildi, ${state.deletedFiles} köhnə/artıq fayl və ${state.deletedEmptyChats} boş çat silindi (~${state.savedMB} MB qənaət).`,
  });

  return state;
};
