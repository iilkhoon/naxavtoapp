import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { Send, Bell, MessageSquare, CheckCircle, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';

export default function SendNotificationWeb() {
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [history, setHistory] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [])
    );

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('sent_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            if (!error && data) {
                setHistory(data);
            }
        } catch (err) {
            console.error('Error fetching notification history:', err);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            showToast('Zəhmət olmasa başlıq və mesajı daxil edin', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            if (sessionError || !accessToken) {
                showToast('Sessiya tapılmadı. Yenidən daxil olun.', 'error');
                setLoading(false);
                return;
            }

            const response = await fetch(
                'https://cqpsvgahjayvvnbqwdcn.supabase.co/functions/v1/sendNotification',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        title: title.trim(),
                        body: body.trim(),
                    }),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                const msg = responseData?.error ?? `Server xətası: ${response.status}`;
                showToast(msg, 'error');
                return;
            }

            const successCount: number = responseData?.sent ?? 0;
            setSentCount(successCount);
            showToast(`${successCount} istifadəçiyə bildiriş göndərildi!`, 'success');

            await supabase.from('sent_notifications').insert({
                title: title.trim(),
                body: body.trim(),
                sent_count: successCount
            });

            fetchHistory();
            setTitle('');
            setBody('');

        } catch (error: any) {
            console.error('[Notification] Unhandled error:', error);
            showToast(error.message ?? 'Bildiriş göndərilmədi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Bildiriş Göndər</Text>
                <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                    Bütün tətbiq istifadəçilərinə anlıq bildiriş (Push Notification) göndərin.
                </Text>
            </View>

            <View style={styles.mainGrid}>
                {/* Form Section */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Bildiriş Başlığı</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                            placeholder="Məs: Yeni Elanlar Var!"
                            placeholderTextColor={colors.placeholder}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Mesaj mətni</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                            placeholder="İstifadəçilərə nə demək istəyirsiniz?"
                            placeholderTextColor={colors.placeholder}
                            value={body}
                            onChangeText={setBody}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                        onPress={handleSend}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Send size={18} color="#FFF" />
                                <Text style={styles.sendBtnText}>İndi Göndər</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {sentCount > 0 && (
                        <View style={[styles.successBanner, { backgroundColor: '#22C55E15', borderColor: '#22C55E30' }]}>
                            <CheckCircle size={16} color="#22C55E" />
                            <Text style={[styles.successText, { color: '#22C55E' }]}>
                                Sonuncu bildiriş {sentCount} nəfərə uğurla çatdırıldı.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Preview & History Section */}
                <View style={styles.sideCol}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ön Baxış (Mobil)</Text>
                    <View style={[styles.previewCard, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', borderColor: colors.border }]}>
                        <View style={styles.previewHeader}>
                            <View style={styles.previewIconWrap}>
                                <Smartphone size={10} color="#FFF" />
                            </View>
                            <Text style={styles.previewAppName}>NAXÇIVAN AVTO</Text>
                            <Text style={styles.previewTime}>İndi</Text>
                        </View>
                        <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
                            {title || 'Sizin Başlıq'}
                        </Text>
                        <Text style={[styles.previewBody, { color: colors.textSecondary }]} numberOfLines={2}>
                            {body || 'Göndərəcəyiniz bildiriş mətni burada belə görünəcək...'}
                        </Text>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>Son Göndərilənlər</Text>
                    <View style={styles.historyList}>
                        {history.length === 0 ? (
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Tarixçə boşdur.</Text>
                        ) : (
                            history.map((item) => (
                                <View key={item.id} style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={styles.historyTop}>
                                        <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                                        <Text style={[styles.historySent, { color: colors.primary }]}>{item.sent_count} nəfər</Text>
                                    </View>
                                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                                        {formatDate(item.created_at)} {new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 32, maxWidth: 1200, alignSelf: 'center', width: '100%' },
    header: { marginBottom: 32 },
    pageTitle: { fontSize: 28, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 8 },
    pageSubtitle: { fontSize: 16, fontFamily: 'RethinkSans_400Regular' },
    mainGrid: { flexDirection: 'row', gap: 32 },
    card: { flex: 1.5, padding: 32, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    sideCol: { flex: 1 },
    sectionTitle: { fontSize: 12, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    formGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 8 },
    input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
    textArea: { height: 120, paddingTop: 16, textAlignVertical: 'top' },
    sendBtn: { flexDirection: 'row', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 8 },
    sendBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
    successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, padding: 12, borderRadius: 12, borderWidth: 1 },
    successText: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },

    previewCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    previewIconWrap: { width: 18, height: 18, borderRadius: 4, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' },
    previewAppName: { fontSize: 10, color: '#888', fontWeight: 'bold', flex: 1 },
    previewTime: { fontSize: 10, color: '#888' },
    previewTitle: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
    previewBody: { fontSize: 13, fontFamily: 'RethinkSans_400Regular' },

    historyList: { gap: 12 },
    historyItem: { padding: 16, borderRadius: 16, borderWidth: 1 },
    historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    historyTitle: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', flex: 1, marginRight: 8 },
    historySent: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
    historyDate: { fontSize: 12, fontFamily: 'RethinkSans_400Regular' }
});
