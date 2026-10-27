import React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { AdminHeader, EmptyView, useAdminColors } from '../../components/admin/AdminUI';
import { FinancePanel, FinanceTab, FINANCE_TABS } from '../../components/finance/FinancePanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// App version of the web Finans page; same panel, native header
export default function AdminFinance() {
  const c = useAdminColors();
  const router = useRouter();
  const { isSuperAdmin, loading } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = (FINANCE_TABS.some((x) => x.value === params.tab) ? params.tab : 'overview') as FinanceTab;
  const bottom = useSafeAreaInsets().bottom;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AdminHeader title="Finans" />
      {!loading && !isSuperAdmin ? (
        <EmptyView title="Giriş yoxdur" subtitle="Finans bölməsinə yalnız superadmin daxil ola bilər." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24 }} keyboardShouldPersistTaps="handled">
          {!loading && <FinancePanel tab={tab} onTab={(next) => router.setParams({ tab: next })} />}
        </ScrollView>
      )}
    </View>
  );
}
