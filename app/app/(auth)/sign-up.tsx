import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
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
              <Toast nativeID={`toast-${id}`} action="error">
                <VStack space="xs" className="flex-1">
                  <ToastTitle>Error</ToastTitle>
                  <ToastDescription>Authentication failed. Please try again.</ToastDescription>
                </VStack>
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
          <Toast nativeID={`toast-${id}`} action="error">
            <VStack space="xs" className="flex-1">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>An unexpected error occurred</ToastDescription>
            </VStack>
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
            <Toast nativeID={`toast-${id}`} action="error">
              <VStack space="xs" className="flex-1">
                <ToastTitle>Error</ToastTitle>
                <ToastDescription>{error.message}</ToastDescription>
              </VStack>
            </Toast>
          ),
        });
      }
    } catch (error) {
      console.error(error);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box className="flex-1 p-5 justify-center">
        <Heading size="2xl" className="mb-8 text-center">Create Account</Heading>

        <VStack space="sm">
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
      </VStack>

      <HStack space="md" className="items-center my-5">
        <Box className="flex-1 h-px bg-border-300" />
        <Text size="sm" className="text-typography-500">or continue with</Text>
        <Box className="flex-1 h-px bg-border-300" />
      </HStack>

      <VStack space="md">
        <FormControl isInvalid={!!errors.email}>
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
                  secureTextEntry
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
          className="mt-2"
        >
          <ButtonText>{loading ? 'Creating account...' : 'Sign Up'}</ButtonText>
        </Button>

          <Button
            variant="link"
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <ButtonText>Already have an account? Sign In</ButtonText>
          </Button>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}
