import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function AppLayout() {
  const { user, initialized, loading } = useAuthStore();

  // Don't render anything while auth is initializing
  if (!initialized || loading) {
    return null;
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    />
  );
}
