import '@/global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAuthStore } from '../store/authStore';

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
      <SafeAreaProvider>
        <GluestackUIProvider mode="light">
          <Center className="flex-1">
            <Spinner size="large" />
          </Center>
        </GluestackUIProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="light">
        <Slot />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
