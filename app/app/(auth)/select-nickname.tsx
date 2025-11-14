import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import { updateProfileNickname, isNicknameAvailable } from '../../lib/profile-utils';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';

// Helper functions for nickname validation and sanitization
function sanitizeNickname(nickname: string): string {
  return nickname
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

function validateNickname(nickname: string): string | null {
  if (nickname.length < 3) {
    return 'Nickname must be at least 3 characters';
  }
  if (nickname.length > 20) {
    return 'Nickname must be at most 20 characters';
  }
  if (!/^[a-z0-9_]+$/.test(nickname)) {
    return 'Nickname can only contain letters, numbers, and underscores';
  }
  return null;
}

interface NicknameForm {
  nickname: string;
}

export default function SelectNicknameScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState('3-20 characters, letters, numbers, and underscores only');
  const { user, setPendingNickname } = useAuthStore();
  const { control, handleSubmit, formState: { errors } } = useForm<NicknameForm>();
  const toast = useToast();

  const checkNicknameAvailability = async (nickname: string) => {
    if (nickname.length < 3) {
      setNicknameStatus('3-20 characters, letters, numbers, and underscores only');
      setNicknameAvailable(false);
      return;
    }

    const error = validateNickname(nickname);
    if (error) {
      setNicknameStatus(error);
      setNicknameAvailable(false);
      return;
    }

    try {
      const available = await isNicknameAvailable(nickname);
      if (available) {
        setNicknameStatus('✓ Nickname is available');
        setNicknameAvailable(true);
      } else {
        setNicknameStatus('This nickname is already taken');
        setNicknameAvailable(false);
      }
    } catch (error) {
      console.error('Error checking nickname availability:', error);
      setNicknameStatus('Unable to check availability');
      setNicknameAvailable(false);
    }
  };

  const onSubmit = async (data: NicknameForm) => {
    if (!user) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>No user found</ToastDescription>
          </Toast>
        ),
      });
      return;
    }

    if (!nicknameAvailable) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Please choose an available nickname</ToastDescription>
          </Toast>
        ),
      });
      return;
    }

    setLoading(true);

    try {
      // Update profile with new nickname
      await updateProfileNickname(user.id, data.nickname);

      // Clear pending state and navigate to app
      setPendingNickname(false);
      router.replace('/(app)');
    } catch (error) {
      console.error('Error updating nickname:', error);
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Unable to save nickname. Please try again.</ToastDescription>
          </Toast>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="p-6">
          <VStack space="lg">
            <View>
              <Text className="text-3xl font-bold text-typography-900 mb-2">
                Choose Your Nickname
              </Text>
              <Text className="text-base text-typography-500">
                The nickname you wanted is taken. Please choose another.
              </Text>
            </View>

            <FormControl isInvalid={!!errors.nickname}>
              <FormControlLabel>
                <FormControlLabelText>Nickname</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="nickname"
                rules={{
                  required: 'Nickname is required',
                  validate: (value) => {
                    const error = validateNickname(value);
                    return error || true;
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="your_nickname"
                      value={value}
                      onChangeText={(text) => {
                        const sanitized = sanitizeNickname(text);
                        onChange(sanitized);
                        checkNicknameAvailability(sanitized);
                      }}
                      autoCapitalize="none"
                      autoFocus
                    />
                  </Input>
                )}
              />
              <FormControlError>
                <FormControlErrorText>
                  {errors.nickname?.message}
                </FormControlErrorText>
              </FormControlError>
              <FormControlHelper>
                <FormControlHelperText className={nicknameAvailable ? 'text-success-500' : 'text-typography-500'}>
                  {nicknameStatus}
                </FormControlHelperText>
              </FormControlHelper>
            </FormControl>

            <Button
              disabled={loading || !nicknameAvailable}
              onPress={handleSubmit(onSubmit)}
              className="bg-primary-600 active:bg-primary-700"
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ButtonText className="text-white font-semibold">
                  Continue
                </ButtonText>
              )}
            </Button>
          </VStack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
