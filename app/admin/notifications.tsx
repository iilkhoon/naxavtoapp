import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import { haptics } from '../../utils/haptics';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, TextArea, AdminButton, useAdminColors, F,
} from '../../components/admin/AdminUI';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sendNotification`;

export default function SendNotificationScreen() {
  const c = useAdminColors();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
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

  const fail = (message: string) => {
    haptics.error();
    showToast(message, 'error');
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return fail('Başlıq və mesajı daxil edin');
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return fail('Sessiya tapılmadı. Yenidən daxil olun.');

      // Plain fetch with the user's token: functions.invoke sometimes sent the anon key
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) return fail(responseData?.error ?? `Server xətası: ${response.status}`);

      const count: number = responseData?.sent ?? 0;
      haptics.success();
      showToast(`${count} istifadəçiyə göndərildi`, 'success');
      await supabase.from('sent_notifications').insert({ title: title.trim(), body: body.trim(), sent_count: count });
      fetchHistory();
      setTitle('');
      setBody('');
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
        <Group title="Yeni bildiriş">
          <FieldRow label="Başlıq" value={title} onChangeText={setTitle} placeholder="Yeni elanlar var!" maxLength={65} />
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
                title={item.title}
                subtitle={`${formatDate(item.created_at)} · ${new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}`}
                value={`${item.sent_count} nəfər`}
              />
            ))}
          </Group>
        )}
      </AdminScroll>
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
