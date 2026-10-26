import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, createIsolatedClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { haptics } from '../../utils/haptics';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, AdminButton, LoadingView, useAdminColors,
} from '../../components/admin/AdminUI';

export default function AddUserScreen() {
  const router = useRouter();
  const c = useAdminColors();
  const { showToast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperAdminChecked, setIsSuperAdminChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      // Alert.alert is a no-op on the web, so the guard reports through a toast
      showToast('Yeni admini yalnız superadmin yarada bilər', 'error');
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

    setLoading(true);
    try {
      // A separate client keeps the superadmin signed in while the new account is created
      const { data, error } = await createIsolatedClient().auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanEmail.split('@')[0] } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('İstifadəçi yaradılmadı');

      // The role is granted server-side; set_admin_role checks that the caller is a superadmin
      const { error: roleError } = await supabase.rpc('set_admin_role', {
        p_user_id: data.user.id,
        p_email: cleanEmail,
        p_is_superadmin: isSuperAdminChecked,
      });
      if (roleError) throw roleError;

      haptics.success();
      showToast('Yeni admin yaradıldı', 'success');
      router.back();
    } catch (error: any) {
      fail(error.message || 'Xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingView />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader title="Yeni admin" subtitle="Admin və ya superadmin hesabı yaradın" backLabel="Adminlər" />
      <AdminScroll>
        <Group title="Hesab" footer="İstifadəçi bu email və şifrə ilə /novo səhifəsindən daxil olacaq.">
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

        <Group footer="Superadmin kredit panelini və admin istifadəçiləri də idarə edə bilir.">
          <GroupRow
            title="Superadmin"
            right={
              <Switch
                value={isSuperAdminChecked}
                onValueChange={(v) => { haptics.tap(); setIsSuperAdminChecked(v); }}
                trackColor={{ false: c.fill, true: c.success }}
              />
            }
          />
        </Group>

        <View style={{ marginTop: 8 }}>
          <AdminButton title="Admin yarat" onPress={handleCreateUser} loading={loading} />
        </View>
      </AdminScroll>
    </KeyboardAvoidingView>
  );
}
