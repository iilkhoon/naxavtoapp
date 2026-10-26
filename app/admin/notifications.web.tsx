import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Send, CheckCircle } from 'lucide-react-native';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Card, Button, TextField, GroupCaption, useWebTokens, useBreakpoints, FONT } from '../../components/web/WebKit';
import { AdminPage } from '../../components/web/AdminKit';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sendNotification`;

export default function SendNotificationWeb() {
    const t = useWebTokens();
    const { isTablet } = useBreakpoints();
    const { showToast } = useToast();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [history, setHistory] = useState<any[]>([]);

    const fetchHistory = useCallback(async () => {
        const { data, error } = await supabase.from('sent_notifications').select('*').order('created_at', { ascending: false }).limit(15);
        if (!error && data) setHistory(data);
    }, []);

    useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            showToast('Başlıq və mesajı daxil edin', 'error');
            return;
        }
        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (!accessToken) {
                showToast('Sessiya tapılmadı. Yenidən daxil olun.', 'error');
                return;
            }

            // Plain fetch with the user's token: functions.invoke sometimes sent the anon key
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ title: title.trim(), body: body.trim() }),
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                showToast(responseData?.error ?? `Server xətası: ${response.status}`, 'error');
                return;
            }

            const count: number = responseData?.sent ?? 0;
            setSentCount(count);
            showToast(`${count} istifadəçiyə bildiriş göndərildi`, 'success');
            await supabase.from('sent_notifications').insert({ title: title.trim(), body: body.trim(), sent_count: count });
            fetchHistory();
            setTitle('');
            setBody('');
        } catch (error: any) {
            showToast(error?.message ?? 'Bildiriş göndərilmədi', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminPage title="Bildirişlər" subtitle="Bütün tətbiq istifadəçilərinə push bildiriş göndərin" maxWidth={1040}>
            <View style={[styles.grid, isTablet && { flexDirection: 'column' }]}>
                <Card style={[{ flex: 1.4, gap: 18 }, isTablet && { width: '100%' }]} padding={24}>
                    <TextField label="Başlıq" placeholder="Məs: Yeni elanlar var!" value={title} onChangeText={setTitle} maxLength={65} />
                    <TextField label="Mesaj" placeholder="İstifadəçilərə nə demək istəyirsiniz?" value={body} onChangeText={setBody} multiline maxLength={240} hint={`${body.length}/240`} />
                    <Button title="İndi göndər" size="lg" icon={<Send size={17} color="#FFF" />} loading={loading} onPress={handleSend} />
                    {sentCount > 0 && (
                        <View style={[styles.success, { backgroundColor: `${t.success}1A` }]}>
                            <CheckCircle size={16} color={t.success} />
                            <Text style={[styles.successText, { color: t.success }]}>Sonuncu bildiriş {sentCount} nəfərə çatdırıldı.</Text>
                        </View>
                    )}
                </Card>

                <View style={[{ flex: 1 }, isTablet && { width: '100%' }]}>
                    <GroupCaption>Ön baxış</GroupCaption>
                    {/* iOS lock-screen notification */}
                    <View style={[styles.preview, { backgroundColor: t.isDark ? 'rgba(44,44,46,0.9)' : 'rgba(255,255,255,0.9)', borderColor: t.hairline, boxShadow: t.shadow } as any]}>
                        <View style={styles.previewHead}>
                            <View style={[styles.previewIcon, { backgroundColor: t.accent }]}><Text style={styles.previewIconText}>N</Text></View>
                            <Text style={[styles.previewApp, { color: t.textSecondary }]}>NAXÇIVAN AVTO</Text>
                            <Text style={[styles.previewApp, { color: t.textSecondary }]}>indi</Text>
                        </View>
                        <Text style={[styles.previewTitle, { color: t.text }]} numberOfLines={1}>{title || 'Bildiriş başlığı'}</Text>
                        <Text style={[styles.previewBody, { color: t.text }]} numberOfLines={3}>{body || 'Göndərəcəyiniz mətn burada belə görünəcək.'}</Text>
                    </View>

                    <GroupCaption style={{ marginTop: 28 }}>Son göndərilənlər</GroupCaption>
                    <Card padding={0} style={{ overflow: 'hidden' }}>
                        {history.length === 0 ? (
                            <Text style={[styles.empty, { color: t.textSecondary }]}>Hələ bildiriş göndərilməyib.</Text>
                        ) : history.map((item, i) => (
                            <View key={item.id} style={[styles.historyRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={[styles.historyTitle, { color: t.text }]} numberOfLines={1}>{item.title}</Text>
                                    <Text style={[styles.historyDate, { color: t.textSecondary }]}>
                                        {formatDate(item.created_at)} · {new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <Text style={[styles.historyCount, { color: t.textSecondary }]}>{item.sent_count} nəfər</Text>
                            </View>
                        ))}
                    </Card>
                </View>
            </View>
        </AdminPage>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
    success: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
    successText: { fontSize: 13, fontFamily: FONT.semibold },
    preview: { padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, backdropFilter: 'blur(20px)' as any },
    previewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    previewIcon: { width: 20, height: 20, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
    previewIconText: { color: '#FFF', fontSize: 11, fontFamily: FONT.heavy },
    previewApp: { fontSize: 12, fontFamily: FONT.medium, flex: 1 },
    previewTitle: { fontSize: 15, fontFamily: FONT.semibold },
    previewBody: { fontSize: 14, fontFamily: FONT.regular, marginTop: 1, lineHeight: 19 },
    empty: { padding: 18, fontSize: 14, fontFamily: FONT.regular },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    historyTitle: { fontSize: 14, fontFamily: FONT.semibold },
    historyDate: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
    historyCount: { fontSize: 13, fontFamily: FONT.medium },
});
