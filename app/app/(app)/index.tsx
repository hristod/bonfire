import {
  Box,
  VStack,
  Text,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Box flex={1} bg="$white" p="$5" justifyContent="center" alignItems="center">
      <VStack space="$4" width="100%">
        <Text size="xl" bold textAlign="center" mb="$4">
          Welcome, {profile?.nickname}!
        </Text>

        <Button
          onPress={() => router.push('/(app)/profile')}
        >
          <ButtonText>View Profile</ButtonText>
        </Button>

        <Button
          action="negative"
          onPress={handleSignOut}
        >
          <ButtonText>Sign Out</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
