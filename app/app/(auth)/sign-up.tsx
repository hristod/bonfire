import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
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
} from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase-oauth';
import OAuthButton from '../../components/OAuthButton';

interface SignUpForm {
  email: string;
  password: string;
  nickname: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignUpForm>();
  const { oauthLoading, setOAuthLoading } = useAuthStore();
  const toast = useToast();

  const handleOAuthSignIn = async (provider: 'apple' | 'google') => {
    setOAuthLoading(true);

    try {
      const { error } = provider === 'apple'
        ? await signInWithApple()
        : await signInWithGoogle();

      if (error) {
        if (error.message !== 'User cancelled') {
          toast.show({
            placement: 'top',
            render: ({ id }) => (
              <Toast nativeID={id} action="error" variant="solid">
                <ToastTitle>Error</ToastTitle>
                <ToastDescription>Authentication failed. Please try again.</ToastDescription>
              </Toast>
            ),
          });
        }
      }
      // Success handling happens in auth state listener
    } catch (error) {
      console.error('OAuth error:', error);
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>An unexpected error occurred</ToastDescription>
          </Toast>
        ),
      });
    } finally {
      setOAuthLoading(false);
    }
  };

  const onSignUp = async (data: SignUpForm) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nickname: data.nickname,
          },
        },
      });

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
      }
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
      setLoading(false);
    }
  };

  return (
    <Box flex={1} bg="$white" p="$5" justifyContent="center">
      <VStack space="$4">
        <Text size="2xl" bold textAlign="center" mb="$2">
          Create Account
        </Text>

        <OAuthButton
          provider="apple"
          onPress={() => handleOAuthSignIn('apple')}
          loading={oauthLoading}
        />

        <OAuthButton
          provider="google"
          onPress={() => handleOAuthSignIn('google')}
          loading={oauthLoading}
        />

        <HStack space="$3" alignItems="center" my="$3">
          <Box flex={1} height={1} bg="$borderLight200" />
          <Text size="sm" color="$textLight500">
            or continue with
          </Text>
          <Box flex={1} height={1} bg="$borderLight200" />
        </HStack>

        <FormControl isInvalid={!!errors.email}>
          <FormControlLabel>
            <FormControlLabelText>Email</FormControlLabelText>
          </FormControlLabel>
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input>
                <InputField
                  placeholder="Email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Input>
            )}
          />
          <FormControlError>
            <FormControlErrorText>{errors.email?.message}</FormControlErrorText>
          </FormControlError>
        </FormControl>

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

        <FormControl isInvalid={!!errors.password}>
          <FormControlLabel>
            <FormControlLabelText>Password</FormControlLabelText>
          </FormControlLabel>
          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input>
                <InputField
                  placeholder="Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  type="password"
                />
              </Input>
            )}
          />
          <FormControlError>
            <FormControlErrorText>{errors.password?.message}</FormControlErrorText>
          </FormControlError>
        </FormControl>

        <Button
          isDisabled={loading}
          onPress={handleSubmit(onSignUp)}
          mt="$2"
        >
          {loading ? (
            <ButtonSpinner color="$white" />
          ) : (
            <ButtonText>Sign Up</ButtonText>
          )}
        </Button>

        <Button
          variant="link"
          onPress={() => router.push('/(auth)/sign-in')}
          mt="$2"
        >
          <ButtonText>Already have an account? Sign In</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}