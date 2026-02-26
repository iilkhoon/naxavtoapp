import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Colors';
import { Mail, Lock } from 'lucide-react-native';

export default function NovoAdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Xəta', 'Zəhmət olmasa email və şifrəni daxil edin');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            router.replace('/admin/listings');
        } catch (error: any) {
            Alert.alert('Xəta', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Admin Panel</Text>
                <Text style={styles.subtitle}>Sistemə daxil olun</Text>

                <View style={styles.inputContainer}>
                    <Mail size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Lock size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Şifrə"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Giriş</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    content: { flex: 1, padding: 24, justifyContent: 'center', maxWidth: 400, width: '100%', alignSelf: 'center' },
    title: { fontSize: 32, fontFamily: 'RethinkSans_700Bold', color: '#FFF', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#AAA', marginBottom: 40, fontFamily: 'RethinkSans_400Regular', textAlign: 'center' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 12,
        marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2C2C2E'
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#FFF', paddingVertical: 16, fontSize: 16, fontFamily: 'RethinkSans_500Medium', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any },
    button: {
        backgroundColor: Colors.dark.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24,
        ...Platform.select({
            ios: { shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
            android: { elevation: 4 },
            web: { boxShadow: `0px 4px 8px ${Colors.dark.primary}4D` }
        })
    },
    buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
});
