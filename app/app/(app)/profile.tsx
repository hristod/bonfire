import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Input,
  InputField,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Spinner,
} from '@gluestack-ui/themed';
import { useForm, Controller } from 'react-hook-form';
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
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>{error.message}</ToastDescription>
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
          <Toast nativeID={id} action="success" variant="solid">
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Profile updated successfully</ToastDescription>
          </Toast>
        ),
      });
    } catch (error) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>An unexpected error occurred</ToastDescription>
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
            <Toast nativeID={id} action="success" variant="solid">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Avatar updated successfully</ToastDescription>
            </Toast>
          ),
        });
      }
    } catch (error: any) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{error.message || 'Failed to upload avatar'}</ToastDescription>
          </Toast>
        ),
      });
      console.error(error);
    } finally {
      resetProgress();
    }
  };

  return (
    <Box flex={1} bg="$white" p="$5">
      <VStack space="$6">
        <Text size="2xl" bold mb="$4">
          Profile
        </Text>

        <Button variant="link" onPress={handlePickImage} isDisabled={isUploading} alignSelf="center">
          <VStack space="$2" alignItems="center">
            <Box position="relative">
              <Avatar size="2xl" bg="$primary500">
                {profile?.avatar_url ? (
                  <AvatarImage source={{ uri: profile.avatar_url }} alt="Profile" />
                ) : (
                  <AvatarFallbackText>
                    {profile?.nickname?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallbackText>
                )}
              </Avatar>
              {isUploading && (
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="rgba(0, 0, 0, 0.5)"
                  borderRadius="$full"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Spinner color="$white" />
                  <Text color="$white" mt="$1" fontWeight="$semibold">
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                </Box>
              )}
            </Box>
            <Text color="$primary500" size="md">
              Change Photo
            </Text>
          </VStack>
        </Button>

        <FormControl isInvalid={!!errors.nickname}>
          <FormControlLabel>
            <FormControlLabelText>Nickname</FormControlLabelText>
          </FormControlLabel>
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
              <Input>
                <InputField
                  placeholder="Nickname"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="none"
                />
              </Input>
            )}
          />
          <FormControlError>
            <FormControlErrorText>{errors.nickname?.message}</FormControlErrorText>
          </FormControlError>
        </FormControl>

        <Button
          isDisabled={saving || isUploading}
          onPress={handleSubmit(onSave)}
          mt="$2"
        >
          {saving ? (
            <ButtonSpinner color="$white" />
          ) : (
            <ButtonText>Save Changes</ButtonText>
          )}
        </Button>
      </VStack>
    </Box>
  );
}
