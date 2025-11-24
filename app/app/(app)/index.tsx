import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '@/lib/location-tracking';
import { findNearbyBonfires, getMyBonfires, getBonfireSecret } from '@/lib/bonfire-utils';
import { NearbyBonfire, MyBonfire } from '@bonfire/shared';
import { BonfireCard } from '@/components/bonfire/BonfireCard';

interface BonfireSection {
  title: string;
  data: (MyBonfire | NearbyBonfire)[];
  type: 'my' | 'nearby' | 'past';
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const [myBonfires, setMyBonfires] = useState<MyBonfire[]>([]);
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
      await loadBonfires();
    } catch (error) {
      console.error('HomeScreen: Failed to start location tracking:', error);
      setLocationEnabled(false);
      // Still load my bonfires even without location
      try {
        const myBonfiresData = await getMyBonfires();
        setMyBonfires(myBonfiresData);
      } catch (err) {
        console.error('HomeScreen: Failed to load my bonfires:', err);
      }
      Alert.alert(
        'Location Required',
        'Please enable location permissions to discover nearby bonfires.',
        [{ text: 'OK' }]
      );
    } finally {
      setInitialLoad(false);
    }
  }

  async function loadBonfires() {
    try {
      setLoading(true);

      // Load my bonfires (always available)
      const myBonfiresData = await getMyBonfires();
      setMyBonfires(myBonfiresData);

      // Load nearby bonfires (requires location)
      if (locationEnabled) {
        const location = await getCurrentLocation();
        const nearbyBonfiresData = await findNearbyBonfires(
          location.latitude,
          location.longitude,
          50 // 50m search radius
        );
        setNearbyBonfires(nearbyBonfiresData);
      }
    } catch (error: any) {
      console.error('HomeScreen: Failed to load bonfires:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load bonfires. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const handleMyBonfirePress = (bonfire: MyBonfire) => {
    // Direct navigation to chat for joined bonfires
    router.push(`/bonfire/${bonfire.id}`);
  };

  const handleNearbyBonfirePress = async (bonfire: NearbyBonfire) => {
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

  // Split my bonfires into active and expired
  const activeBonfires = myBonfires.filter(b => b.is_active && new Date(b.expires_at) > new Date());
  const expiredBonfires = myBonfires.filter(b => !b.is_active || new Date(b.expires_at) <= new Date());

  // Prepare sections data
  const sections: BonfireSection[] = [
    { title: 'My Bonfires', data: activeBonfires, type: 'my' },
    { title: 'Nearby Bonfires', data: nearbyBonfires, type: 'nearby' },
    ...(expiredBonfires.length > 0
      ? [{ title: 'Past Bonfires', data: expiredBonfires, type: 'past' as const }]
      : []
    ),
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box className="flex-1 bg-gray-50">
        {/* Header */}
        <Box className="bg-white p-4 border-b border-gray-200">
          <Heading size="2xl" className="mb-1">
            Bonfires
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
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={({ item, section }) => {
                const isMyBonfire = section.type === 'my' || section.type === 'past';
                const bonfire = item as MyBonfire | NearbyBonfire;

                return (
                  <BonfireCard
                    bonfire={bonfire}
                    onPress={() => {
                      if (section.type === 'nearby') {
                        handleNearbyBonfirePress(bonfire as NearbyBonfire);
                      } else {
                        handleMyBonfirePress(bonfire as MyBonfire);
                      }
                    }}
                    variant={section.type === 'past' ? 'expired' : 'default'}
                    showHostBadge={isMyBonfire && (bonfire as MyBonfire).is_creator}
                  />
                );
              }}
              renderSectionHeader={({ section }) => (
                <Box className="bg-gray-50 px-4 py-2">
                  <Heading size="md" className="text-gray-700">
                    {section.title}
                  </Heading>
                </Box>
              )}
              renderSectionFooter={({ section }) => {
                if (section.data.length === 0) {
                  let emptyMessage = '';
                  if (section.type === 'my') {
                    emptyMessage = "You haven't joined any bonfires yet. Discover one nearby or create your own!";
                  } else if (section.type === 'nearby') {
                    emptyMessage = locationEnabled
                      ? 'No bonfires nearby. Create one!'
                      : 'Enable location to discover bonfires';
                  }

                  return (
                    <Box className="px-4 py-3">
                      <Text className="text-gray-500 text-sm text-center">
                        {emptyMessage}
                      </Text>
                    </Box>
                  );
                }
                return null;
              }}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadBonfires}
                />
              }
              contentContainerStyle={{ paddingBottom: 16 }}
              stickySectionHeadersEnabled={false}
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
