// Admin push broadcasts (supabase/functions/sendNotification) and listing promos.
import { supabase } from './supabase';
import { listingLabel, plateLabel, targetPath } from './links';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sendNotification`;

export type PushKind = 'new' | 'vip' | 'urgent';

export const PUSH_KINDS: { value: PushKind; label: string; title: string }[] = [
  { value: 'new', label: 'Yeni elan', title: '🆕 Yeni elan' },
  { value: 'vip', label: 'VIP elan', title: '⭐ VIP elan' },
  { value: 'urgent', label: 'Təcili satılır', title: '🔥 Təcili satılır' },
];

/** Default title and body for a listing push; the admin can still edit both */
export const listingPushText = (kind: PushKind, item: any, isPlate: boolean) => ({
  title: PUSH_KINDS.find((k) => k.value === kind)!.title,
  body: `${isPlate ? plateLabel(item) : listingLabel(item)}. Baxmaq üçün toxunun.`,
});

/** Loads one car or plate by a stored target ("listing:<id>" / "plate:<id>") */
export async function loadTargetItem(target: string) {
  const isPlate = target.startsWith('plate:');
  const id = target.split(':')[1] || '';
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const { data } = await supabase
    .from(isPlate ? 'plates' : 'listings')
    .select(isPlate ? 'id, short_id, region, series, number, price, currency, is_vip' : 'id, short_id, make, model, year, price, currency, is_vip, is_urgent, images, image_url')
    .eq(isUuid ? 'id' : 'short_id', id)
    .maybeSingle();
  return data ? { item: data as any, isPlate } : null;
}

/** Sends to every device; returns how many pushes Expo accepted */
export async function sendPush({ title, body, target, kind }: {
  title: string; body: string; target?: string | null; kind?: PushKind | null;
}): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Sessiya tapılmadı. Yenidən daxil olun.');

  const url = targetPath(target) || undefined;
  // Plain fetch with the user's token: functions.invoke sometimes sent the anon key
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ title, body, url }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error ?? `Server xətası: ${response.status}`);

  const count: number = json?.sent ?? 0;
  const row = { title, body, sent_count: count };
  const { error } = await supabase.from('sent_notifications').insert({ ...row, kind: kind || null, url: url || null });
  // kind/url come with migration 20261028; keep the history row on an older schema
  if (error) await supabase.from('sent_notifications').insert(row);
  return count;
}

/** Admin notifications screen pre-filled for one car or plate (category from its flags) */
export const pushHref = (item: any, isPlate: boolean) => {
  const kind: PushKind = item.is_urgent ? 'urgent' : item.is_vip ? 'vip' : 'new';
  const target = `${isPlate ? 'plate' : 'listing'}:${item.short_id || item.id}`;
  return `/admin/notifications?target=${encodeURIComponent(target)}&kind=${kind}`;
};
