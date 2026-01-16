import { Platform } from 'react-native';
import React from 'react';

// Polyfill useLayoutEffect for SSR to prevent "useLayoutEffect does nothing on the server" warning
if (Platform.OS === 'web' && typeof window === 'undefined') {
  React.useLayoutEffect = React.useEffect;
}
