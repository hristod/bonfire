import { Pressable, Image } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Lock, Users } from 'lucide-react-native';
import { NearbyBonfire } from '@bonfire/shared';

interface BonfireCardProps {
  bonfire: NearbyBonfire;
  onPress: () => void;
}

export function BonfireCard({ bonfire, onPress }: BonfireCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Join ${bonfire.name} bonfire`}
    >
      <Box className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
        <HStack className="items-start gap-3">
          {/* Creator avatar */}
          <Box className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
            {bonfire.creator_avatar_url ? (
              <Image
                source={{ uri: bonfire.creator_avatar_url }}
                style={{ width: 48, height: 48 }}
                resizeMode="cover"
              />
            ) : (
              <Box className="w-12 h-12 bg-primary-100 items-center justify-center">
                <Text className="text-primary-600 font-bold text-lg">
                  {bonfire.creator_nickname?.[0]?.toUpperCase() || '?'}
                </Text>
              </Box>
            )}
          </Box>

          {/* Bonfire info */}
          <VStack className="flex-1 gap-1">
            <HStack className="items-center gap-2">
              <Text className="text-lg font-bold text-gray-900">
                {bonfire.name}
              </Text>
              {bonfire.has_pin && (
                <Lock size={16} color="#6B7280" />
              )}
            </HStack>

            <Text className="text-sm text-gray-600">
              by {bonfire.creator_nickname}
            </Text>

            {bonfire.description && (
              <Text className="text-sm text-gray-700 mt-1">
                {bonfire.description}
              </Text>
            )}

            <HStack className="items-center gap-4 mt-2">
              <HStack className="items-center gap-1">
                <Users size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600">
                  {bonfire.participant_count}
                </Text>
              </HStack>

              <Text className="text-xs text-gray-500">
                {Math.round(bonfire.distance_meters)}m away
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
