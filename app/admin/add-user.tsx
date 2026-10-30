import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, createIsolatedClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { haptics } from '../../utils/haptics';
import { AdminModule } from '../../constants/adminMenu';
import { ModulePicker } from '../../components/admin/ModulePicker';
import {
  AdminHeader, AdminScroll, Group, FieldRow, AdminButton, LoadingView, useAdminColors,
} from '../../components/admin/AdminUI';

export default function AddUserScreen() {
  const router = useRouter();
  const c = useAdminColors();
  const { showToast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modules, setModules] = useState<AdminModule[]>(['listings']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      // Alert.alert is a no-op on the web, so the guard reports through a toast
      showToast('Yeni istifadəçini yalnız superadmin yarada bilər', 'error');
      router.back();
    }
  }, [isSuperAdmin, authLoading, router, showToast]);

  const fail = (message: string) => {
    haptics.error();
    showToast(message, 'error');
  };

  const handleCreateUser = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return fail('Email və şifrəni daxil edin');
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return fail('Email düzgün deyil');
    if (password.length < 6) return fail('Şifrə ən azı 6 simvol olmalıdır');
    if (modules.length === 0) return fail('Ən azı bir bölmə seçin');

    setLoading(true);
    try {
      // A separate client keeps the superadmin signed in while the new account is created
      const { data, error } = await createIsolatedClient().auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: fullName.trim() || cleanEmail.split('@')[0] } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('İstifadəçi yaradılmadı');

      // Access is granted server-side; admin_save_user checks that the caller is a superadmin
      const { error: roleError } = await supabase.rpc('admin_save_user', {
        p_user_id: data.user.id,
        p_email: cleanEmail,
        p_full_name: fullName.trim(),
        p_modules: modules,
      });
      if (roleError) throw roleError;

      haptics.success();
      showToast('İstifadəçi yaradıldı', 'success');
      router.back();
    } catch (error: any) {
      const msg = error?.message || '';
      fail(msg.includes('already registered') ? 'Bu email artıq qeydiyyatdadır' : msg || 'Xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingView />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader title="Yeni istifadəçi" subtitle="Hesab yaradın və bölmələri seçin" backLabel="İstifadəçilər" />
      <AdminScroll>
        <Group title="Hesab" footer="İstifadəçi bu email və şifrə ilə /novo səhifəsindən daxil olacaq.">
          <FieldRow label="Ad" value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" autoCapitalize="words" />
          <FieldRow
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="mail@numune.az"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FieldRow
            label="Şifrə"
            value={password}
            onChangeText={setPassword}
            placeholder="Ən azı 6 simvol"
            secureTextEntry
            textContentType="newPassword"
          />
        </Group>

        <ModulePicker value={modules} onChange={setModules} />

        <View style={{ marginTop: 8 }}>
          <AdminButton title="İstifadəçi yarat" onPress={handleCreateUser} loading={loading} />
        </View>
      </AdminScroll>
    </KeyboardAvoidingView>
  );
}
