import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box className="flex-1 p-5 justify-center items-center">
        <VStack space="lg" className="w-full">
        <Heading size="2xl" className="text-center mb-5">
          Welcome, {profile?.nickname}!
        </Heading>

        <Button
          onPress={() => router.push('/(app)/profile')}
          className="w-full"
        >
          <ButtonText>View Profile</ButtonText>
        </Button>

          <Button
            onPress={handleSignOut}
            action="negative"
            className="w-full"
          >
            <ButtonText>Sign Out</ButtonText>
          </Button>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}
