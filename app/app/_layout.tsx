import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../config/gluestack-theme.config';
import { useAuthStore } from '../store/authStore';
import { Box, Spinner } from '@gluestack-ui/themed';

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

  return (
    <GluestackUIProvider config={config}>
      <Slot />
      {(!initialized || loading) && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          flex={1}
          justifyContent="center"
          alignItems="center"
          bg="$white"
        >
          <Spinner size="large" />
        </Box>
      )}
    </GluestackUIProvider>
  );
}
