import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to app if authenticated
      router.replace('/(app)');
    }
  }, [user, initialized, loading, segments]);

  if (!initialized || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GluestackUIProvider config={config}>
      <Slot />
    </GluestackUIProvider>
  );
}
