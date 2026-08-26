import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Platform, Linking, Dimensions,
    StatusBar, KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Instagram, Heart, Share2, CheckCircle2, Gift } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useToast } from '../contexts/ToastContext';
import LoadingAnimation from '../components/LoadingAnimation';

const { width } = Dimensions.get('window');

export default function CompetitionScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [competition, setCompetition] = useState<any>(null);
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [alreadyParticipated, setAlreadyParticipated] = useState(false);

    useEffect(() => {
        fetchCompetition();
    }, []);

    const fetchCompetition = async () => {
        try {
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .eq('is_active', true)
                .gte('end_date', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // If error (like table doesn't exist yet, just mock it for UI testing)
            if (error) {
                throw error;
            }
            setCompetition(data);
        } catch (err) {
            console.log('Error fetching competition:', err);
            // Fallback UI data until table is created by user
            setCompetition({
                id: 'mock-id',
                title: 'iPhone 15 Pro Max',
                description: 'Böyük NaxAvto yarışmasına qoşulun və möhtəşəm iPhone 15 Pro Max qazanan şanslı şəxs siz olun!',
                prize_image_url: 'https://images.unsplash.com/photo-1696446700622-faec9d412d09?q=80&w=600&auto=format&fit=crop',
                story_image_url: 'https://images.unsplash.com/photo-1696446700622-faec9d412d09?q=80&w=600&auto=format&fit=crop', // Provide a real image banner here if available
                instagram_account_url: 'https://instagram.com/naxcivanavto',
                instagram_post_url: 'https://instagram.com/naxcivanavto',
                end_date: new Date(Date.now() + 86400000 * 5).toISOString(),
            });
        } finally {
            setLoading(false);
        }
    };

    const shareToInstagramStory = async () => {
        if (!competition?.story_image_url) {
            Alert.alert('Xəta', 'Paylaşılacaq şəkil tapılmadı.');
            return;
        }

        try {
            setLoading(true);
            // @ts-ignore
            const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + 'naxavto_story_share.jpg';
            const downloadResult = await FileSystem.downloadAsync(competition.story_image_url, fileUri);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Instagram Story-də Paylaş',
                    UTI: 'public.jpeg' // More generic UTI that works widely
                });
                setIsShared(true);
            } else {
                Alert.alert('Paylaşım İcazəsi', 'Bu cihazda paylaşım dəstəklənmir.');
            }
        } catch (error: any) {
            console.log('Error sharing to IG Story:', error);
            Alert.alert('Xəta', 'Şəkli paylaşmaq mümkün olmadı: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = () => {
        if (competition?.instagram_account_url) {
            Linking.openURL(competition.instagram_account_url);
        } else {
            Linking.openURL('https://instagram.com');
        }
        setIsFollowing(true);
    };

    const handleLike = () => {
        if (competition?.instagram_post_url) {
            Linking.openURL(competition.instagram_post_url);
        } else {
            Linking.openURL('https://instagram.com');
        }
        setIsLiked(true);
    };

    const handleParticipate = async () => {
        if (!username.trim()) {
            Alert.alert('XəbərdaTırlıq', 'Zəhmət olmasa Instagram adınızı daxil edin.');
            return;
        }
        if (!fullName.trim()) {
            Alert.alert('XəbərdaTı', 'Zəhmət olmasa ad soyadınızı daxil edin.');
            return;
        }
        if (!phone.trim() || phone.length < 7) {
            Alert.alert('XəbərdaTırlıq', 'Zəhmət olmasa əlaqə nömrənizi yazın.');
            return;
        }

        if (!isFollowing || !isLiked || !isShared) {
            Alert.alert('Diqqət', 'Yarışmaya qatılmaq üçün əvvəlcə yuxarıdakı 3 tapşırığı tamamladığınıza əmin olun!');
            return;
        }

        try {
            setSubmitting(true);

            if (competition.id === 'mock-id') {
                setTimeout(() => {
                    showToast('Təbriklər! Yarışmaya qatıldınız.', 'success');
                    setSubmitting(false);
                    router.back();
                }, 1000);
                return;
            }

            const cleanUsername = username.replace('@', '').trim();
            const cleanPhone = phone.trim();

            // Call Edge Function directly - works without auth
            const response = await fetch(
                'https://cqpsvgahjayvvnbqwdcn.supabase.co/functions/v1/join-competition',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        competition_id: competition.id,
                        instagram_username: cleanUsername,
                        full_name: fullName.trim(),
                        phone: cleanPhone,
                    }),
                }
            );

            const result = await response.json();

            if (response.status === 409 || result.error === 'already_participated') {
                Alert.alert('Artıq Qatılmısınız', 'Siz bu yarışmaya artıq qatılmısınız.');
                setAlreadyParticipated(true);
            } else if (!response.ok) {
                throw new Error(result.error || 'Xəta baş verdi');
            } else {
                showToast('Təbriklər! Yarışmaya uğurla qatıldınız.', 'success');
                router.back();
            }
        } catch (err: any) {
            Alert.alert('Xəta', 'Xəta baş verdi. Zəhmət olmasa təkrar cəhd edin.');
            console.log(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingAnimation />;

    if (!competition) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Gift size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={{ color: colors.text, fontSize: 18, fontFamily: 'RethinkSans_700Bold' }}>
                    Hazırda aktiv yarışma yoxdur
                </Text>
                <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Ana Səhifəyə Qayıt</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Cover Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: competition.prize_image_url }}
                        style={styles.image}
                        contentFit="cover"
                    />
                    <View style={styles.overlay} />
                    <TouchableOpacity
                        style={[styles.backButton, { top: insets.top + 10 }]}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Content Details */}
                <View style={styles.content}>
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400 }}
                        style={[styles.titleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.badgeText, { color: colors.primary }]}>YENİ YARIŞMA</Text>
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{competition.title}</Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>{competition.description}</Text>

                        {competition.end_date && (
                            <View style={styles.dateContainer}>
                                <Text style={[styles.dateText, { color: colors.primary }]}>
                                    Son Qatılma: {formatDate(competition.end_date)}
                                </Text>
                            </View>
                        )}
                    </MotiView>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Qatılmaq üçün Şərtlər</Text>

                    {/* Tasks */}
                    <View style={styles.tasksContainer}>
                        {/* Task 1 */}
                        <TouchableOpacity
                            style={[styles.taskCard, { backgroundColor: colors.card, borderColor: isFollowing ? colors.success : colors.border }]}
                            onPress={handleFollow}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.taskIconBg, { backgroundColor: isFollowing ? colors.success + '20' : isDark ? '#333' : '#F2F2F7' }]}>
                                {isFollowing ? <CheckCircle2 size={24} color={colors.success} /> : <Instagram size={24} color={colors.text} />}
                            </View>
                            <View style={styles.taskTextContainer}>
                                <Text style={[styles.taskTitle, { color: colors.text }]}>1. Bizi İzlə</Text>
                                <Text style={[styles.taskSubtitle, { color: colors.textSecondary }]}>Instagram səhifəmizi izlə</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Task 2 */}
                        <TouchableOpacity
                            style={[styles.taskCard, { backgroundColor: colors.card, borderColor: isLiked ? colors.success : colors.border }]}
                            onPress={handleLike}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.taskIconBg, { backgroundColor: isLiked ? colors.success + '20' : colors.primary + '20' }]}>
                                {isLiked ? <CheckCircle2 size={24} color={colors.success} /> : <Heart size={24} color={colors.primary} />}
                            </View>
                            <View style={styles.taskTextContainer}>
                                <Text style={[styles.taskTitle, { color: colors.text }]}>2. Bəyən və Şərh Yaz</Text>
                                <Text style={[styles.taskSubtitle, { color: colors.textSecondary }]}>Yarışma postuna reaksiya ver</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Task 3 */}
                        <TouchableOpacity
                            style={[styles.taskCard, { backgroundColor: colors.card, borderColor: isShared ? colors.success : colors.border }]}
                            onPress={shareToInstagramStory}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.taskIconBg, { backgroundColor: isShared ? colors.success + '20' : '#E1306C' + '20' }]}>
                                {isShared ? <CheckCircle2 size={24} color={colors.success} /> : <Share2 size={24} color="#E1306C" />}
                            </View>
                            <View style={styles.taskTextContainer}>
                                <Text style={[styles.taskTitle, { color: colors.text }]}>3. Story-də Paylaş</Text>
                                <Text style={[styles.taskSubtitle, { color: colors.textSecondary }]}>Tap vuraraq birbaşa paylaş</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    {alreadyParticipated ? (
                        <View style={[styles.formContainer, { backgroundColor: '#22C55E20', borderColor: '#22C55E50' }]}>
                            <Text style={{ color: '#22C55E', fontFamily: 'RethinkSans_700Bold', fontSize: 15, textAlign: 'center' }}>✅ Siz artıq bu yarışmada iştirak edirsiniz!</Text>
                        </View>
                    ) : (
                        <View style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {/* Instagram */}
                            <View style={[styles.inputRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>@</Text>
                                <TextInput
                                    style={[styles.compactInput, { color: colors.text }]}
                                    placeholder="Instagram adı"
                                    placeholderTextColor={colors.placeholder}
                                    value={username.replace('@', '')}
                                    onChangeText={(t) => setUsername(t)}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                />
                            </View>
                            {/* Full name */}
                            <View style={[styles.inputRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ad</Text>
                                <TextInput
                                    style={[styles.compactInput, { color: colors.text }]}
                                    placeholder="Ad Soyad"
                                    placeholderTextColor={colors.placeholder}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                />
                            </View>
                            {/* Phone */}
                            <View style={styles.inputRow}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tel</Text>
                                <TextInput
                                    style={[styles.compactInput, { color: colors.text }]}
                                    placeholder="+994 XX XXX XX XX"
                                    placeholderTextColor={colors.placeholder}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    returnKeyType="done"
                                />
                            </View>
                        </View>
                    )}

                </View>
            </ScrollView>

            {/* Footer Button */}
            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.submitButton, {
                        backgroundColor: (!alreadyParticipated && isFollowing && isLiked && isShared && username.length > 2 && fullName.length > 2 && phone.length > 6)
                            ? colors.primary : colors.placeholder
                    }]}
                    onPress={alreadyParticipated ? () => router.back() : handleParticipate}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>
                            {alreadyParticipated ? 'Geri Qayıt' : 'Yarışmaya Qatıl'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
    },
    imageContainer: {
        width: '100%',
        height: 320,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 20,
        marginTop: -40,
    },
    titleCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
        marginBottom: 24,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_800ExtraBold',
        letterSpacing: 1,
    },
    title: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 8,
        lineHeight: 32,
    },
    description: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
        lineHeight: 22,
    },
    dateContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.2)',
    },
    dateText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 16,
        marginLeft: 4,
    },
    tasksContainer: {
        gap: 12,
        marginBottom: 24,
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    taskIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    taskTextContainer: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 4,
    },
    taskSubtitle: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    formContainer: {
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 2,
    },
    formSubtitle: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
        marginBottom: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    inputLabel: {
        width: 40,
        fontSize: 13,
        fontFamily: 'RethinkSans_700Bold',
    },
    compactInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    submitButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
});
