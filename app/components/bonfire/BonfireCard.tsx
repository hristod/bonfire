import { Pressable, Image } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Badge, BadgeText } from '@/components/ui/badge';
import { MapPin, Users, Clock } from 'lucide-react-native';
import { NearbyBonfire, MyBonfire } from '@bonfire/shared';

interface BonfireCardProps {
  bonfire: NearbyBonfire | MyBonfire;
  onPress: () => void;
  variant?: 'default' | 'expired';
  showHostBadge?: boolean;
}

export function BonfireCard({
  bonfire,
  onPress,
  variant = 'default',
  showHostBadge = false
}: BonfireCardProps) {
  const isExpired = variant === 'expired';
  const cardOpacity = isExpired ? 'opacity-60' : 'opacity-100';
  const cardScale = isExpired ? 'scale-95' : 'scale-100';

  // Calculate time remaining
  const expiresAt = new Date(bonfire.expires_at);
  const now = new Date();
  const hoursRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
  return (
    <Pressable onPress={onPress}>
      <Box className={`bg-white rounded-lg p-4 mb-3 border border-gray-200 ${cardOpacity} ${cardScale}`}>
        <VStack space="sm">
          {/* Header with name and host badge */}
          <HStack space="sm" className="items-center justify-between">
            <HStack space="sm" className="items-center flex-1">
              <Text className="text-lg font-bold text-gray-900 flex-shrink">
                {bonfire.name}
              </Text>
              {showHostBadge && (
                <Badge action="success" variant="solid" size="sm">
                  <BadgeText>Host</BadgeText>
                </Badge>
              )}
            </HStack>
          </HStack>

          {/* Description */}
          {bonfire.description && (
            <Text className="text-gray-600 text-sm" numberOfLines={2}>
              {bonfire.description}
            </Text>
          )}

          {/* Metadata */}
          <HStack space="md" className="flex-wrap">
            {/* Participant count */}
            <HStack space="xs" className="items-center">
              <Users size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600">
                {bonfire.participant_count} {bonfire.participant_count === 1 ? 'person' : 'people'}
              </Text>
            </HStack>

            {/* Distance (only for NearbyBonfire) */}
            {'distance_meters' in bonfire && (
              <HStack space="xs" className="items-center">
                <MapPin size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600">
                  {Math.round(bonfire.distance_meters)}m away
                </Text>
              </HStack>
            )}

            {/* Time remaining */}
            {!isExpired && (
              <HStack space="xs" className="items-center">
                <Clock size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600">
                  {hoursRemaining > 0 ? `${hoursRemaining}h left` : 'Ending soon'}
                </Text>
              </HStack>
            )}

            {/* Expired indicator */}
            {isExpired && (
              <HStack space="xs" className="items-center">
                <Clock size={16} color="#DC2626" />
                <Text className="text-sm text-red-600">
                  Ended
                </Text>
              </HStack>
            )}
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );
}
