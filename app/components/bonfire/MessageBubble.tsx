import { Image, Pressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { BonfireMessage } from '@bonfire/shared';
import { useState } from 'react';

interface MessageBubbleProps {
  message: BonfireMessage;
  isOwnMessage: boolean;
  onImagePress?: (imageUrl: string) => void;
}

export function MessageBubble({ message, isOwnMessage, onImagePress }: MessageBubbleProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Box
      className={`mb-2 max-w-[80%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}
    >
      {/* Sender info (if not own message) */}
      {!isOwnMessage && (
        <Text className="text-xs text-gray-500 mb-1">
          {message.sender_nickname || 'Unknown'}
        </Text>
      )}

      {/* Message bubble */}
      <Box
        className={`rounded-2xl p-3 ${
          isOwnMessage
            ? 'bg-primary-600'
            : 'bg-gray-200'
        }`}
      >
        {/* Image message */}
        {message.message_type === 'image' && message.image_url && (
          <VStack className="gap-2">
            <Pressable onPress={() => onImagePress?.(message.image_url!)}>
              <Image
                source={{ uri: message.image_url }}
                style={{
                  width: 250,
                  height: message.image_height && message.image_width
                    ? (250 * message.image_height) / message.image_width
                    : 250,
                  borderRadius: 8,
                  backgroundColor: '#f0f0f0',
                }}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <Box className="absolute inset-0 items-center justify-center bg-gray-100 rounded-lg">
                  <Text className="text-gray-400">Loading...</Text>
                </Box>
              )}
            </Pressable>

            {/* Caption */}
            {message.content && (
              <Text className={isOwnMessage ? 'text-white' : 'text-gray-900'}>
                {message.content}
              </Text>
            )}
          </VStack>
        )}

        {/* Text message */}
        {message.message_type === 'text' && (
          <Text className={isOwnMessage ? 'text-white' : 'text-gray-900'}>
            {message.content}
          </Text>
        )}
      </Box>

      {/* Timestamp */}
      <Text className="text-xs text-gray-400 mt-1">
        {new Date(message.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Box>
  );
}
