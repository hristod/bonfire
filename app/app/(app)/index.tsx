import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '@/lib/location-tracking';
import { findNearbyBonfires, getBonfireSecret } from '@/lib/bonfire-utils';
import { NearbyBonfire } from '@bonfire/shared';
import { BonfireCard } from '@/components/bonfire/BonfireCard';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const [nearbyBonfires, setNearbyBonfires] = useState<NearbyBonfire[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    initializeLocationTracking();
    return () => {
      stopLocationTracking();
    };
  }, []);

  async function initializeLocationTracking() {
    try {
      await startLocationTracking();
      setLocationEnabled(true);
      await loadNearbyBonfires();
    } catch (error) {
      console.error('HomeScreen: Failed to start location tracking:', error);
      setLocationEnabled(false);
      Alert.alert(
        'Location Required',
        'Please enable location permissions to discover nearby bonfires.',
        [{ text: 'OK' }]
      );
    } finally {
      setInitialLoad(false);
    }
  }

  async function loadNearbyBonfires() {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      const bonfires = await findNearbyBonfires(
        location.latitude,
        location.longitude,
        50 // 50m search radius
      );
      setNearbyBonfires(bonfires);
    } catch (error: any) {
      console.error('HomeScreen: Failed to load nearby bonfires:', error);

      // Show user-friendly error
      Alert.alert(
        'Error',
        error.message || 'Failed to load nearby bonfires. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const handleBonfirePress = async (bonfire: NearbyBonfire) => {
    try {
      // Get current location
      const location = await getCurrentLocation();

      // Fetch secret code (validates proximity)
      const secretCode = await getBonfireSecret(
        bonfire.id,
        location.latitude,
        location.longitude
      );

      // Navigate to join screen with secret
      router.push({
        pathname: '/join-bonfire',
        params: {
          bonfireId: bonfire.id,
          secretCode: secretCode,
          hasPin: bonfire.has_pin.toString(),
          bonfireName: bonfire.name,
          description: bonfire.description || '',
        },
      });
    } catch (error: any) {
      console.error('HomeScreen: Failed to get bonfire secret:', error);
      Alert.alert(
        'Cannot Join',
        error.message || 'Failed to get bonfire access. Please try again.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box className="flex-1 bg-gray-50">
        {/* Header */}
        <Box className="bg-white p-4 border-b border-gray-200">
          <Heading size="2xl" className="mb-1">
            Nearby Bonfires
          </Heading>
          <Text className="text-gray-600">
            Welcome, {profile?.nickname}!
          </Text>
        </Box>

        {/* Loading state */}
        {initialLoad ? (
          <Box className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="text-gray-500 mt-4">Initializing location...</Text>
          </Box>
        ) : (
          <>
            {/* Bonfire list */}
            <FlatList
              data={nearbyBonfires}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <BonfireCard
                  bonfire={item}
                  onPress={() => handleBonfirePress(item)}
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadNearbyBonfires}
                />
              }
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Box className="p-4 items-center">
                  <Text className="text-gray-500 text-center mb-2">
                    {locationEnabled
                      ? 'No bonfires nearby. Create one!'
                      : 'Enable location to discover bonfires'}
                  </Text>
                </Box>
              }
            />

            {/* Action buttons */}
            <Box className="bg-white p-4 border-t border-gray-200">
              <VStack space="md" className="w-full">
                <Button
                  onPress={() => router.push('/(app)/create-bonfire')}
                  className="w-full bg-primary-600"
                >
                  <ButtonText>Create Bonfire</ButtonText>
                </Button>

                <Button
                  onPress={() => router.push('/(app)/profile')}
                  className="w-full"
                  variant="outline"
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
          </>
        )}
      </Box>
    </SafeAreaView>
  );
}
