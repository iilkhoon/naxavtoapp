import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

// Using useEffect for redirect prevents SSR/Static Rendering issues
// where Redirect component might trigger invalid response status codes.
export default function AddPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    // Small delay to ensure router is mounted
    const timer = setTimeout(() => {
        router.replace('/');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
