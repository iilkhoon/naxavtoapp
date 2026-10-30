// Targets that banners and push notifications open.
// Stored as text: "listing:<id>", "plate:<id>", an in-app path ("/listing/abc") or a web URL.
import { Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

export type PickOption = { label: string; value: string };

/** In-app path for a stored target, or null when it is a web URL / empty */
export const targetPath = (target?: string | null): string | null => {
  const v = (target || '').trim();
  if (v.startsWith('listing:')) return `/listing/${v.slice(8)}`;
  if (v.startsWith('plate:')) return `/plate/${v.slice(6)}`;
  // Only our own detail pages; anything else could be an arbitrary route
  if (/^\/(listing|plate)\/[A-Za-z0-9_-]+$/.test(v)) return v;
  return null;
};

export const openTarget = (target?: string | null) => {
  const v = (target || '').trim();
  if (!v) return;
  const path = targetPath(v);
  if (path) {
    router.push(path as any);
    return;
  }
  const url = /^https?:\/\//i.test(v) ? v : /^[\w.-]+\.[a-z]{2,}/i.test(v) ? `https://${v}` : null;
  if (!url) return;
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url).catch(() => {});
};

const fmt = (n: number) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cur = (c?: string) => (!c || c === 'AZN' ? '₼' : c);

export const listingLabel = (l: any) => `${l.make} ${l.model}${l.year ? `, ${l.year}` : ''} — ${fmt(l.price)} ${cur(l.currency)}`;
export const plateLabel = (p: any) => `${p.region}-${p.series}-${p.number} — ${fmt(p.price)} ${cur(p.currency)}`;

/** Approved cars and plates as picker options (value is a stored target) */
export async function loadTargetOptions(): Promise<PickOption[]> {
  const [cars, plates] = await Promise.all([
    supabase.from('listings').select('id, short_id, make, model, year, price, currency')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(500),
    supabase.from('plates').select('id, short_id, region, series, number, price, currency')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(300),
  ]);
  if (cars.error) throw cars.error;
  return [
    ...(cars.data || []).map((l: any) => ({ label: `🚗 ${listingLabel(l)}`, value: `listing:${l.short_id || l.id}` })),
    ...(plates.data || []).map((p: any) => ({ label: `🔢 ${plateLabel(p)}`, value: `plate:${p.short_id || p.id}` })),
  ];
}
