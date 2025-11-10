import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const { pendingNickname } = useAuthStore();

  useEffect(() => {
    if (pendingNickname) {
      router.replace('/(auth)/select-nickname');
    }
  }, [pendingNickname]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
