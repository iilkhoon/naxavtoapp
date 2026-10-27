import React from 'react';
import { Shield } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Card, EmptyState, useWebTokens } from '../../components/web/WebKit';
import { AdminPage } from '../../components/web/AdminKit';
import { FinancePanel, FinanceTab, FINANCE_TABS } from '../../components/finance/FinancePanel';

export default function AdminFinanceWeb() {
  const t = useWebTokens();
  const router = useRouter();
  const { isSuperAdmin, loading } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = (FINANCE_TABS.some((x) => x.value === params.tab) ? params.tab : 'overview') as FinanceTab;

  if (!loading && !isSuperAdmin) {
    return (
      <AdminPage title="Finans">
        <Card><EmptyState icon={<Shield size={28} color={t.textSecondary} />} title="Giriş yoxdur" subtitle="Finans bölməsinə yalnız superadmin daxil ola bilər." /></Card>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Finans" subtitle="Kassa, alış-satış, borclar, kreditlər və maaşlar">
      {!loading && <FinancePanel tab={tab} onTab={(next) => router.setParams({ tab: next })} />}
    </AdminPage>
  );
}
