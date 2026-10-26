import React from 'react';
import { Zap } from 'lucide-react-native';
import { FlagListingsScreen } from '../../components/admin/FlagListingsScreen';

export default function UrgentListingsScreen() {
  return (
    <FlagListingsScreen
      flag="is_urgent"
      title="Təcili elanlar"
      flagLabel="Təcili"
      onText="Elan təcili edildi"
      offText="Təcili statusu götürüldü"
      icon={Zap}
    />
  );
}
