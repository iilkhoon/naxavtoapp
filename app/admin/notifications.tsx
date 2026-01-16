import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Send, Bell, ArrowLeft, MessageSquare, CheckCircle, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SendNotificationScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Xəta', 'Zəhmət olmasa başlıq və mesajı daxil edin');
      return;
    }

    setLoading(true);
    try {
      // 1. Get all tokens from Supabase
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('token');

      if (error) throw error;

      if (!tokens || tokens.length === 0) {
          Alert.alert('Məlumat', 'Qeydiyyatdan keçmiş cihaz tapılmadı.');
          setLoading(false);
          return;
      }

      // 2. Filter valid Expo tokens
      const validTokens = tokens
        .map(t => t.token)
        .filter(t => t && t.startsWith('ExponentPushToken'));

      if (validTokens.length === 0) {
        Alert.alert('Xəta', 'Etibarlı token tapılmadı.');
        setLoading(false);
        return;
      }

      // 3. Prepare messages
      const messages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: { url: '/(tabs)' },
        badge: 1,
        color: '#FF3B30'
      }));

      // 4. Send in batches (Expo limit is 100)
      const CHUNK_SIZE = 100;
      let successCount = 0;

      for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
          const chunk = messages.slice(i, i + CHUNK_SIZE);
          
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk),
          });
          
          if (response.ok) {
            successCount += chunk.length;
          }
      }

      setSentCount(successCount);
      showToast(`${successCount} istifadəçiyə bildiriş göndərildi!`, 'success');
      setTitle('');
      setBody('');
      
    } catch (error: any) {
      Alert.alert('Xəta', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bildiriş Göndər</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Preview Card */}
            <MotiView 
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring' }}
                style={styles.previewSection}
            >
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Görünüş</Text>
                <View style={[styles.notificationPreview, { backgroundColor: isDark ? '#333' : '#FFF', borderColor: colors.border }]}>
                    <View style={styles.previewHeader}>
                        <View style={styles.previewAppIcon}>
                            <Smartphone size={12} color="#FFF" />
                        </View>
                        <Text style={styles.previewAppName}>NAXÇIVAN AVTO</Text>
                        <Text style={styles.previewTime}>İndi</Text>
                    </View>
                    <View style={styles.previewContent}>
                        <Text style={[styles.previewTitle, { color: colors.text }]}>{title || 'Bildiriş Başlığı'}</Text>
                        <Text style={[styles.previewBody, { color: colors.textSecondary }]}>{body || 'Bildiriş mətni burada görünəcək...'}</Text>
                    </View>
                </View>
            </MotiView>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                    <Bell size={32} color={colors.primary} />
                </View>
                
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Bütün istifadəçilərə anlıq bildiriş göndərin.
                </Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Başlıq</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Bell size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Məs: Yeni Endirimlər!"
                                placeholderTextColor={colors.placeholder}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Mesaj</Text>
                        <View style={[styles.textAreaContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <MessageSquare size={20} color={colors.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
                            <TextInput
                                style={[styles.input, styles.textArea, { color: colors.text }]}
                                placeholder="Mesajınızı bura yazın..."
                                placeholderTextColor={colors.placeholder}
                                value={body}
                                onChangeText={setBody}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.sendButton, { backgroundColor: colors.primary }]}
                        onPress={handleSend}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Send size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.sendButtonText}>Göndər</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {sentCount > 0 && (
                <MotiView 
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.successCard, { backgroundColor: 'rgba(76, 217, 100, 0.1)', borderColor: '#4CD964' }]}
                >
                    <CheckCircle size={24} color="#4CD964" style={{ marginRight: 10 }} />
                    <Text style={[styles.successText, { color: '#4CD964' }]}>
                        Son əməliyyatda {sentCount} istifadəçiyə bildiriş çatdırıldı.
                    </Text>
                </MotiView>
            )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  content: { padding: 20 },
  
  previewSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  notificationPreview: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  previewAppIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  previewAppName: { fontSize: 11, color: '#888', flex: 1, fontWeight: '600' },
  previewTime: { fontSize: 11, color: '#888' },
  previewContent: { paddingLeft: 26 },
  previewTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  previewBody: { fontSize: 13, lineHeight: 18 },

  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'RethinkSans_400Regular',
  },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { marginBottom: 8, fontSize: 14, fontFamily: 'RethinkSans_600SemiBold' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
  },
  inputIcon: { marginLeft: 16 },
  input: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  textAreaContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
  },
  textArea: { height: '100%', paddingTop: 16 },
  sendButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  successCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold', flex: 1 },
});
