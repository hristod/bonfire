import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { HStack } from '@/components/ui/hstack';
import { Camera, Image as ImageIcon, Send, X } from 'lucide-react-native';
import { pickAndUploadBonfireImage, takeAndUploadBonfireImage } from '@/lib/uploadBonfireImage';
import { sendTextMessage, sendImageMessage } from '@/lib/bonfire-utils';
import { useAuthStore } from '@/store/authStore';

interface MessageInputProps {
  bonfireId: string;
  onMessageSent?: () => void;
}

export function MessageInput({ bonfireId, onMessageSent }: MessageInputProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    width: number;
    height: number;
    sizeBytes: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const handlePickImage = async () => {
    if (!user) return;

    try {
      setUploading(true);
      const result = await pickAndUploadBonfireImage(
        bonfireId,
        user.id,
        (progress) => {
          console.log(`Upload progress: ${Math.round(progress * 100)}%`);
        }
      );

      if (result) {
        setImagePreview(result);
      }
    } catch (error) {
      console.error('MessageInput: Failed to pick and upload image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!user) return;

    try {
      setUploading(true);
      const result = await takeAndUploadBonfireImage(
        bonfireId,
        user.id,
        (progress) => {
          console.log(`Upload progress: ${Math.round(progress * 100)}%`);
        }
      );

      if (result) {
        setImagePreview(result);
      }
    } catch (error) {
      console.error('MessageInput: Failed to take and upload photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!user) return;
    if (!content.trim() && !imagePreview) return;

    try {
      setSending(true);

      if (imagePreview) {
        await sendImageMessage(
          bonfireId,
          imagePreview.url,
          imagePreview.width,
          imagePreview.height,
          imagePreview.sizeBytes,
          content.trim() || undefined
        );
      } else {
        await sendTextMessage(bonfireId, content.trim());
      }

      setContent('');
      setImagePreview(null);
      onMessageSent?.();
    } catch (error) {
      console.error('MessageInput: Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  return (
    <Box className="border-t border-gray-200 bg-white p-3">
      {/* Image preview */}
      {imagePreview && (
        <Box className="mb-2 relative">
          <Image
            source={{ uri: imagePreview.url }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
          <Button
            size="xs"
            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
            onPress={handleRemoveImage}
          >
            <ButtonIcon as={X} className="text-white" size="sm" />
          </Button>
        </Box>
      )}

      {/* Input row */}
      <HStack className="items-center gap-2">
        {/* Image picker button */}
        <Button
          size="sm"
          variant="outline"
          onPress={handlePickImage}
          disabled={uploading || sending || !!imagePreview}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FF6B35" />
          ) : (
            <ButtonIcon as={ImageIcon} />
          )}
        </Button>

        {/* Camera button */}
        {Platform.OS !== 'web' && (
          <Button
            size="sm"
            variant="outline"
            onPress={handleTakePhoto}
            disabled={uploading || sending || !!imagePreview}
          >
            <ButtonIcon as={Camera} />
          </Button>
        )}

        {/* Text input */}
        <Input className="flex-1">
          <InputField
            placeholder={imagePreview ? 'Add a caption (optional)' : 'Type a message...'}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={imagePreview ? 500 : 2000}
            editable={!sending}
          />
        </Input>

        {/* Send button */}
        <Button
          size="sm"
          onPress={handleSend}
          disabled={(!content.trim() && !imagePreview) || sending}
          className="bg-primary-600"
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonIcon as={Send} className="text-white" />
          )}
        </Button>
      </HStack>
    </Box>
  );
}
