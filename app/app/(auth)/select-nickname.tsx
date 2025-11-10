import { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  Input,
  InputField,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
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
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>No user found</ToastDescription>
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
    <Box flex={1} bg="$white" p="$5" justifyContent="center">
      <VStack space="$4">
        <Text size="2xl" bold textAlign="center" mb="$2">
          Choose Your Nickname
        </Text>
        <Text size="md" color="$textLight500" textAlign="center" mb="$4">
          The auto-generated nickname is already taken. Please choose a different one.
        </Text>

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
          <FormControlError>
            <FormControlErrorText>{errors.nickname?.message}</FormControlErrorText>
          </FormControlError>
          <FormControlHelper>
            <FormControlHelperText>
              3-20 characters, letters, numbers, and underscores only
            </FormControlHelperText>
          </FormControlHelper>
        </FormControl>

        <Button
          isDisabled={loading}
          onPress={handleSubmit(onSubmit)}
          mt="$2"
        >
          {loading ? (
            <ButtonSpinner />
          ) : (
            <ButtonText>Continue</ButtonText>
          )}
        </Button>
      </VStack>
    </Box>
  );
}
