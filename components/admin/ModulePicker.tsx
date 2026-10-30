// Switch list of admin panel sections, used when creating or editing an admin
import React from 'react';
import { Switch } from 'react-native';
import { ADMIN_MODULES, AdminModule } from '../../constants/adminMenu';
import { haptics } from '../../utils/haptics';
import { Group, GroupRow, useAdminColors } from './AdminUI';

export function ModulePicker({ value, onChange, disabled }: {
  value: AdminModule[]; onChange: (next: AdminModule[]) => void; disabled?: boolean;
}) {
  const c = useAdminColors();
  const all = value.length === ADMIN_MODULES.length;
  const toggle = (key: AdminModule, on: boolean) => {
    haptics.tap();
    onChange(on ? [...value, key] : value.filter((m) => m !== key));
  };
  return (
    <Group title="Açıq bölmələr" footer="İstifadəçi admin paneldə yalnız seçilmiş bölmələri görəcək.">
      <GroupRow
        title="Hamısı"
        right={
          <Switch
            value={all}
            disabled={disabled}
            onValueChange={(on) => { haptics.tap(); onChange(on ? ADMIN_MODULES.map((m) => m.key) : []); }}
            trackColor={{ false: c.fill, true: c.success }}
          />
        }
      />
      {ADMIN_MODULES.map((m) => (
        <GroupRow
          key={m.key}
          title={m.title}
          subtitle={m.desc}
          right={
            <Switch
              value={value.includes(m.key)}
              disabled={disabled}
              onValueChange={(on) => toggle(m.key, on)}
              trackColor={{ false: c.fill, true: c.success }}
            />
          }
        />
      ))}
    </Group>
  );
}

/** "Superadmin", "Bütün bölmələr" or "3 bölmə" for lists */
export const accessLabel = (profile: any) => {
  if (profile?.is_superadmin) return 'Superadmin';
  if (!Array.isArray(profile?.modules) || profile.modules.length >= ADMIN_MODULES.length) return 'Bütün bölmələr';
  return `${profile.modules.length} bölmə`;
};
