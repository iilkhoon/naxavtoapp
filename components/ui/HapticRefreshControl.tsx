import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { haptics } from '../../utils/haptics';

// RefreshControl that gives a light bump when pull-to-refresh triggers
export function HapticRefreshControl({ onRefresh, ...props }: RefreshControlProps) {
  return (
    <RefreshControl
      {...props}
      onRefresh={() => {
        haptics.impact();
        onRefresh?.();
      }}
    />
  );
}
