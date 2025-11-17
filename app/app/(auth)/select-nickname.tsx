import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlError, FormControlErrorText, FormControlHelper, FormControlHelperText } from '@/components/ui/form-control';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { useAuthStore } from '../../store/authStore';
import { updateProfileNickname, isNicknameAvailable } from '../../lib/profile-utils';

interface NicknameForm {
  nickname: string;
}

export default function SelectNicknameScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, setPendingNickname } = useAuthStore();
  const { control, handleSubmit, formState: { errors }, setError } = useForm<NicknameForm>();
  const toast = useToast();

  const onSubmit = async (data: NicknameForm) => {
    if (!user) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error">
            <VStack space="xs" className="flex-1">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>No user found</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
      return;
    }

    setLoading(true);

    try {
      // Check if nickname is available
      const available = await isNicknameAvailable(data.nickname);

      if (!available) {
        setError('nickname', {
          type: 'manual',
          message: 'This nickname is already taken',
        });
        setLoading(false);
        return;
      }

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
          <Toast nativeID={`toast-${id}`} action="error">
            <VStack space="xs" className="flex-1">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Unable to save nickname. Please try again.</ToastDescription>
            </VStack>
          </Toast>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="flex-1 p-5 justify-center">
      <VStack space="lg">
        <VStack space="xs">
          <Heading size="2xl">Choose Your Nickname</Heading>
          <Text size="sm" className="text-typography-500">
            The auto-generated nickname is already taken. Please choose a different one.
          </Text>
        </VStack>

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
                message: 'Nickname must be at most 20 characters',
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
                  autoFocus
                />
              </Input>
            )}
          />
          <FormControlHelper>
            <FormControlHelperText>
              3-20 characters, letters, numbers, and underscores only
            </FormControlHelperText>
          </FormControlHelper>
          <FormControlError>
            <FormControlErrorText>{errors.nickname?.message}</FormControlErrorText>
          </FormControlError>
        </FormControl>

        <Button
          isDisabled={loading}
          onPress={handleSubmit(onSubmit)}
        >
          <ButtonText>{loading ? 'Saving...' : 'Continue'}</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
