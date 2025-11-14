import { useState } from 'react';
import { View, ScrollView, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { supabase } from '../../lib/supabase';
import { pickAndUploadAvatar } from '../../lib/uploadAvatar';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';

interface ProfileForm {
  nickname: string;
}

export default function ProfileScreen() {
  const { profile, user, setProfile, initialize } = useAuthStore();
  const { isUploading, uploadProgress, setUploading, setProgress, resetProgress } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      nickname: profile?.nickname || '',
    },
  });
  const toast = useToast();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await initialize();
    } catch (error) {
      console.error('ProfileScreen onRefresh: Failed to refresh profile', error);
    } finally {
      setRefreshing(false);
    }
  };

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
      console.error('ProfileScreen onSave:', error);
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
      console.error('ProfileScreen handlePickImage:', error);
    } finally {
      resetProgress();
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B5CF6"
          colors={['#8B5CF6']}
        />
      }
    >
      <View className="flex-1 p-5">
        <VStack space="lg">
          <Text className="text-3xl font-bold text-typography-900 mb-4">
            Profile
          </Text>

          <Button
            variant="link"
            onPress={handlePickImage}
            disabled={isUploading}
            className="self-center"
          >
            <VStack space="sm" className="items-center">
              <View className="relative">
                <Avatar size="2xl" className="bg-primary-500">
                  {profile?.avatar_url ? (
                    <AvatarImage source={{ uri: profile.avatar_url }} alt="Profile" />
                  ) : (
                    <AvatarFallbackText>
                      {profile?.nickname?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallbackText>
                  )}
                </Avatar>
                {isUploading && (
                  <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 rounded-full justify-center items-center">
                    <Spinner color="white" />
                    <Text className="text-white mt-1 font-semibold">
                      {Math.round(uploadProgress * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-primary-500 text-base">
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
            disabled={saving || isUploading}
            onPress={handleSubmit(onSave)}
            className="bg-primary-600 active:bg-primary-700 mt-2"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <ButtonText className="text-white font-semibold">Save Changes</ButtonText>
            )}
          </Button>
        </VStack>
      </View>
    </ScrollView>
  );
}
