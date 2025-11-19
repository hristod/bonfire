import { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { useBonfireStore } from '@/store/bonfireStore';
import { useAuthStore } from '@/store/authStore';
import { MessageBubble } from '@/components/bonfire/MessageBubble';
import { MessageInput } from '@/components/bonfire/MessageInput';
import { ImageViewerModal } from '@/components/bonfire/ImageViewerModal';
import { getBonfireWithParticipants, updatePresence } from '@/lib/bonfire-utils';

export default function BonfireScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    activeBonfire,
    participants,
    messages,
    loading,
    setActiveBonfire,
    setParticipants,
    subscribeToMessages,
    reset,
  } = useBonfireStore();

  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) {
      console.error('BonfireScreen: No bonfire ID provided');
      router.back();
      return;
    }

    loadBonfire();
    subscribeToMessages(id);

    // Update presence every 30 seconds
    const presenceInterval = setInterval(() => {
      updatePresence(id);
    }, 30000);

    return () => {
      clearInterval(presenceInterval);
      reset();
    };
  }, [id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  async function loadBonfire() {
    if (!id) return;

    try {
      const { bonfire, participants } = await getBonfireWithParticipants(id);

      // Check if current user is a participant
      const isParticipant = participants.some(p => p.user_id === user?.id);

      if (!isParticipant) {
        // User is not a participant, redirect to join screen
        console.log('BonfireScreen: User is not a participant, redirecting to join screen');
        router.replace({
          pathname: '/join-bonfire',
          params: {
            bonfireId: bonfire.id,
            secretCode: bonfire.current_secret_code || '',
            hasPin: bonfire.has_pin?.toString() || 'false',
            bonfireName: bonfire.name,
            description: bonfire.description || '',
          },
        });
        return;
      }

      setActiveBonfire(bonfire);
      setParticipants(participants);
    } catch (error) {
      console.error('BonfireScreen: Failed to load bonfire:', error);
      router.back();
    }
  }

  if (!activeBonfire || !id) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Box className="flex-1 items-center justify-center bg-gray-50">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-gray-500 mt-4">Loading bonfire...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <Box className="flex-1 bg-gray-50">
          {/* Header */}
          <Box className="bg-white border-b border-gray-200 p-4">
            <Text className="text-xl font-bold text-gray-900">
              {activeBonfire.name}
            </Text>
            <Text className="text-sm text-gray-600">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </Text>
          </Box>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwnMessage={item.user_id === user?.id}
                onImagePress={(url) => setImageViewerUrl(url)}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Box className="flex-1 items-center justify-center py-8">
                <Text className="text-gray-500">No messages yet</Text>
                <Text className="text-gray-400 text-sm mt-1">
                  Be the first to say something!
                </Text>
              </Box>
            }
          />

          {/* Message input */}
          <MessageInput bonfireId={id} />
        </Box>
      </KeyboardAvoidingView>

      {/* Image viewer */}
      <ImageViewerModal
        visible={!!imageViewerUrl}
        imageUrl={imageViewerUrl}
        onClose={() => setImageViewerUrl(null)}
      />
    </SafeAreaView>
  );
}
