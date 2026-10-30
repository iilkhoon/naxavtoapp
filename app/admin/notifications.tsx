import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, Car } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import { haptics } from '../../utils/haptics';
import { loadTargetOptions, listingLabel, plateLabel, PickOption } from '../../lib/links';
import { PUSH_KINDS, PushKind, listingPushText, loadTargetItem, sendPush } from '../../lib/push';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, TextArea, AdminButton, Segmented, Chips, SelectRow, PickerSheet, useAdminColors, F,
} from '../../components/admin/AdminUI';

type Mode = 'general' | 'listing';

export default function SendNotificationScreen() {
  const c = useAdminColors();
  const { showToast } = useToast();
  // Opened from a listing row: /admin/notifications?target=listing:<id>
  const params = useLocalSearchParams<{ target?: string; kind?: string }>();
  const [mode, setMode] = useState<Mode>(params.target ? 'listing' : 'general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<string>(params.target || '');
  const [targetLabel, setTargetLabel] = useState('');
  const [kind, setKind] = useState<PushKind>((PUSH_KINDS.some((k) => k.value === params.kind) ? params.kind : 'new') as PushKind);
  const [options, setOptions] = useState<PickOption[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    const { data, error } = await supabase.from('sent_notifications').select('*').order('created_at', { ascending: false }).limit(20);
    if (!error && data) setHistory(data);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchHistory, 0);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  // Fill title/body from the chosen listing and category (still editable)
  useEffect(() => {
    if (mode !== 'listing' || !target) return;
    let cancelled = false;
    loadTargetItem(target).then((found) => {
      if (cancelled || !found) return;
      const text = listingPushText(kind, found.item, found.isPlate);
      setTitle(text.title);
      setBody(text.body);
      setTargetLabel(found.isPlate ? plateLabel(found.item) : listingLabel(found.item));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [mode, target, kind]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (options) return;
    try {
      setOptions(await loadTargetOptions());
    } catch (e: any) {
      showToast('Elanlar yüklənmədi: ' + e.message, 'error');
      setOptions([]);
    }
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setTitle('');
    setBody('');
  };

  const fail = (message: string) => {
    haptics.error();
    showToast(message, 'error');
  };

  const handleSend = async () => {
    if (mode === 'listing' && !target) return fail('Elan seçin');
    if (!title.trim() || !body.trim()) return fail('Başlıq və mesajı daxil edin');
    setLoading(true);
    try {
      const count = await sendPush({
        title: title.trim(),
        body: body.trim(),
        target: mode === 'listing' ? target : null,
        kind: mode === 'listing' ? kind : null,
      });
      haptics.success();
      showToast(`${count} istifadəçiyə göndərildi`, 'success');
      fetchHistory();
      setTitle('');
      setBody('');
      if (mode === 'listing') { setTarget(''); setTargetLabel(''); }
    } catch (error: any) {
      fail(error?.message ?? 'Bildiriş göndərilmədi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader title="Bildirişlər" subtitle="Bütün istifadəçilərə push bildiriş" backLabel="Admin" />
      <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }}>
        <Segmented<Mode>
          options={[{ value: 'general', label: 'Ümumi' }, { value: 'listing', label: 'Elan göndər' }]}
          value={mode}
          onChange={changeMode}
          style={{ marginBottom: 20 }}
        />

        {mode === 'listing' && (
          <>
            <Text style={[styles.caption, { color: c.textSecondary }]}>KATEQORİYA</Text>
            <Chips<PushKind> options={PUSH_KINDS.map((k) => ({ value: k.value, label: k.label }))} value={kind} onChange={setKind} style={{ marginBottom: 16 }} />
            <Group footer="Bildirişə toxunan istifadəçi birbaşa bu elanı görəcək.">
              <SelectRow label="Elan" value={targetLabel || (target ? '…' : '')} placeholder="Seçin" onPress={openPicker} />
            </Group>
          </>
        )}

        <Group title={mode === 'listing' ? 'Mətn' : 'Yeni bildiriş'}>
          <FieldRow label="Başlıq" value={title} onChangeText={setTitle} placeholder={mode === 'listing' ? 'Elan seçin' : 'Yeni elanlar var!'} maxLength={65} />
          <TextArea value={body} onChangeText={setBody} placeholder="Mesaj mətni" maxLength={240} />
        </Group>

        <Text style={[styles.caption, { color: c.textSecondary }]}>ÖN BAXIŞ</Text>
        {/* Lock-screen style preview */}
        <View style={[styles.preview, { backgroundColor: c.card, borderColor: c.hairline }]}>
          <View style={styles.previewHead}>
            <View style={[styles.previewIcon, { backgroundColor: c.primary }]}><Text style={styles.previewIconText}>N</Text></View>
            <Text style={[styles.previewApp, { color: c.textSecondary }]}>NAXÇIVAN AVTO</Text>
            <Text style={[styles.previewApp, { color: c.textSecondary, flex: 0 }]}>indi</Text>
          </View>
          <Text style={[styles.previewTitle, { color: c.text }]} numberOfLines={1}>{title || 'Bildiriş başlığı'}</Text>
          <Text style={[styles.previewBody, { color: c.text }]} numberOfLines={3}>{body || 'Mesaj burada belə görünəcək.'}</Text>
        </View>

        <AdminButton title="İndi göndər" icon={<Send size={17} color="#FFF" />} onPress={handleSend} loading={loading} style={{ marginBottom: 28 }} />

        {history.length > 0 && (
          <Group title="Son göndərilənlər">
            {history.map((item) => (
              <GroupRow
                key={item.id}
                icon={item.url ? Car : undefined}
                tint="#FF9500"
                title={item.title}
                subtitle={`${formatDate(item.created_at)} · ${new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}`}
                value={`${item.sent_count} nəfər`}
              />
            ))}
          </Group>
        )}
      </AdminScroll>

      <PickerSheet
        visible={pickerOpen}
        title="Elan seçin"
        options={options || []}
        selected={target}
        onSelect={(o) => { setTarget(o.value); setTargetLabel(o.label.replace(/^\S+\s/, '')); }}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 13, fontFamily: F.semibold, letterSpacing: 0.4, marginBottom: 8, marginLeft: 16 },
  preview: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 20 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  previewIcon: { width: 20, height: 20, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  previewIconText: { color: '#FFF', fontSize: 11, fontFamily: F.heavy },
  previewApp: { flex: 1, fontSize: 12, fontFamily: F.medium },
  previewTitle: { fontSize: 15, fontFamily: F.semibold },
  previewBody: { fontSize: 14, lineHeight: 19, fontFamily: F.regular, marginTop: 1 },
});
