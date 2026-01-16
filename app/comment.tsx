import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { Send, User, MessageSquare, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { MotiView } from 'moti';

export default function CommentScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { listingId } = useLocalSearchParams();
  
  const [fullName, setFullName] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fullName.trim() || !text.trim()) return;
    setLoading(true);
    try {
        const { error } = await supabase.from('comments').insert({ 
            listing_id: listingId, 
            full_name: fullName, 
            text 
        });
        if (error) throw error;
        
        showToast('Rəyiniz əlavə edildi', 'success');
        router.back();
    } catch (error: any) {
        showToast('Xəta: ' + error.message, 'error');
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
            <Stack.Screen options={{ 
                headerShown: false, // Custom header for better control
            }} />

            {/* Custom Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Rəy Bildir</Text>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={[styles.closeButton, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                >
                    <X size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <MotiView 
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 100 }}
                >
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                            <MessageSquare size={40} color={colors.primary} />
                        </View>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Fikirləriniz bizim üçün önəmlidir.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Ad və Soyad</Text>
                        <View style={[
                            styles.inputContainer, 
                            { 
                                backgroundColor: colors.card, 
                                borderColor: focusedInput === 'name' ? colors.primary : colors.border 
                            }
                        ]}>
                            <User size={20} color={focusedInput === 'name' ? colors.primary : colors.textSecondary} style={{marginRight: 10}} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Adınızı daxil edin"
                                placeholderTextColor={colors.placeholder}
                                value={fullName}
                                onChangeText={setFullName}
                                onFocus={() => setFocusedInput('name')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Rəyiniz</Text>
                        <View style={[
                            styles.textAreaContainer, 
                            { 
                                backgroundColor: colors.card, 
                                borderColor: focusedInput === 'text' ? colors.primary : colors.border 
                            }
                        ]}>
                            <TextInput
                                style={[styles.input, styles.textArea, { color: colors.text }]}
                                placeholder="Fikirlərinizi yazın..."
                                placeholderTextColor={colors.placeholder}
                                value={text}
                                onChangeText={setText}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                onFocus={() => setFocusedInput('text')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[
                            styles.submitButton, 
                            { backgroundColor: colors.primary }, 
                            (!fullName || !text) && styles.disabledButton
                        ]} 
                        onPress={handleSubmit}
                        disabled={loading || !fullName || !text}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Send size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.submitText}>Göndər</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </MotiView>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 24 },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 24 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 56 },
  textAreaContainer: { borderRadius: 16, borderWidth: 1, padding: 16, minHeight: 140 },
  input: { flex: 1, fontSize: 16 },
  textArea: { height: '100%' },
  submitButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, borderRadius: 20, marginTop: 10, shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  disabledButton: { opacity: 0.5 },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
