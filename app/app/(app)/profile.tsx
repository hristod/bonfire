import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { supabase } from '../../lib/supabase';
import { pickAndUploadAvatar } from '../../lib/uploadAvatar';

interface ProfileForm {
  nickname: string;
}

export default function ProfileScreen() {
  const { profile, user, setProfile } = useAuthStore();
  const { isUploading, uploadProgress, setUploading, setProgress, resetProgress } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      nickname: profile?.nickname || '',
    },
  });
  const toast = useToast();

  const onSave = async (data: ProfileForm) => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: data.nickname,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error">
              <VStack space="xs" className="flex-1">
                <ToastTitle>Error</ToastTitle>
                <ToastDescription>{error.message}</ToastDescription>
              </VStack>
            </Toast>
          ),
        });
        return;
      }

      // Update local state
      if (profile) {
        setProfile({ ...profile, nickname: data.nickname });
      }

      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="success">
            <VStack space="xs" className="flex-1">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Profile updated successfully</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
    } catch (error) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error">
            <VStack space="xs" className="flex-1">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>An unexpected error occurred</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    if (!user) return;

    setUploading(true);
    resetProgress();

    try {
      const avatarUrl = await pickAndUploadAvatar(user.id, setProgress);

      if (avatarUrl) {
        // Update profile with new avatar URL
        const { error } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          throw error;
        }

        // Update local state
        if (profile) {
          setProfile({ ...profile, avatar_url: avatarUrl });
        }

        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="success">
              <VStack space="xs" className="flex-1">
                <ToastTitle>Success</ToastTitle>
                <ToastDescription>Avatar updated successfully</ToastDescription>
              </VStack>
            </Toast>
          ),
        });
      }
    } catch (error: any) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error">
            <VStack space="xs" className="flex-1">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>{error.message || 'Failed to upload avatar'}</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
      console.error(error);
    } finally {
      resetProgress();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box className="flex-1 p-5">
        <VStack space="lg">
        <Heading size="2xl" className="mb-5">Profile</Heading>

        <Button
          variant="link"
          onPress={handlePickImage}
          isDisabled={isUploading}
          className="self-center mb-5"
        >
          <VStack space="xs" className="items-center">
            <Box className="relative">
              <Avatar size="2xl">
                {profile?.avatar_url && (
                  <AvatarImage source={{ uri: profile.avatar_url }} alt="Profile avatar" />
                )}
                <AvatarFallbackText>
                  {profile?.nickname || 'User'}
                </AvatarFallbackText>
              </Avatar>
              {isUploading && (
                <Box className="absolute inset-0 bg-black/50 rounded-full justify-center items-center">
                  <Spinner size="small" color="white" />
                  <Text className="text-white text-sm font-semibold mt-1">
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                </Box>
              )}
            </Box>
            <Text className="text-primary-500 text-base">Change Photo</Text>
          </VStack>
        </Button>

        <FormControl isInvalid={!!errors.nickname}>
          <Controller
            control={control}
            name="nickname"
            rules={{
              required: 'Nickname is required',
              minLength: {
                value: 3,
                message: 'Nickname must be at least 3 characters',
              },
              maxLength: {
                value: 20,
                message: 'Nickname must be less than 20 characters',
              },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: 'Nickname can only contain letters, numbers, and underscores',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <VStack space="xs">
                <Text className="text-sm font-semibold text-typography-700">Nickname</Text>
                <Input>
                  <InputField
                    placeholder="Nickname"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                  />
                </Input>
              </VStack>
            )}
          />
          <FormControlError>
            <FormControlErrorText>{errors.nickname?.message}</FormControlErrorText>
          </FormControlError>
        </FormControl>

          <Button
            isDisabled={saving || isUploading}
            onPress={handleSubmit(onSave)}
            className="mt-2"
          >
            <ButtonText>{saving ? 'Saving...' : 'Save Changes'}</ButtonText>
          </Button>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}
