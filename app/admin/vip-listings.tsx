import React from 'react';
import { Crown } from 'lucide-react-native';
import { FlagListingsScreen } from '../../components/admin/FlagListingsScreen';

export default function VipListingsScreen() {
  return (
    <FlagListingsScreen
      flag="is_vip"
      title="VIP elanlar"
      flagLabel="VIP"
      onText="Elan VIP edildi"
      offText="VIP statusu götürüldü"
      icon={Crown}
    />
  );
}
