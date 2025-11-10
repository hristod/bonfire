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
import { generateNickname, createProfileWithNickname } from '../../lib/profile-utils';
import OAuthButton from '../../components/OAuthButton';

interface SignInForm {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignInForm>();
  const { oauthLoading, setOAuthLoading, setPendingNickname, user } = useAuthStore();
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

  const onSignIn = async (data: SignInForm) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
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
          Welcome Back
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

        <FormControl isInvalid={!!errors.password}>
          <FormControlLabel>
            <FormControlLabelText>Password</FormControlLabelText>
          </FormControlLabel>
          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
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
          onPress={handleSubmit(onSignIn)}
          mt="$2"
        >
          {loading ? (
            <ButtonSpinner />
          ) : (
            <ButtonText>Sign In</ButtonText>
          )}
        </Button>

        <Button
          variant="link"
          onPress={() => router.push('/(auth)/sign-up')}
          mt="$2"
        >
          <ButtonText>Don't have an account? Sign Up</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
