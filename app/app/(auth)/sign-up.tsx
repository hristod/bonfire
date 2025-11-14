import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase-oauth';
import OAuthButton from '../../components/OAuthButton';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="p-6">
          <VStack space="lg">
            <View className="mb-4">
              <Text className="text-3xl font-bold text-typography-900 mb-2">
                Create Account
              </Text>
              <Text className="text-base text-typography-500">
                Sign up to get started
              </Text>
            </View>

            {/* OAuth Buttons */}
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

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-typography-200" />
              <Text className="px-4 text-typography-500">or</Text>
              <View className="flex-1 h-px bg-typography-200" />
            </View>

            {/* Email Field */}
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
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="you@example.com"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoFocus
                    />
                  </Input>
                )}
              />
              <FormControlError>
                <FormControlErrorText>
                  {errors.email?.message}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>

            {/* Nickname Field */}
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
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="your_nickname"
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                    />
                  </Input>
                )}
              />
              <FormControlError>
                <FormControlErrorText>
                  {errors.nickname?.message}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>

            {/* Password Field */}
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
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="••••••••"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry
                    />
                  </Input>
                )}
              />
              <FormControlError>
                <FormControlErrorText>
                  {errors.password?.message}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>

            {/* Sign Up Button */}
            <Button
              disabled={loading}
              onPress={handleSubmit(onSignUp)}
              className="bg-primary-600 active:bg-primary-700 mt-2"
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ButtonText className="text-white font-semibold">
                  Sign Up
                </ButtonText>
              )}
            </Button>

            {/* Sign In Link */}
            <Button
              variant="link"
              onPress={() => router.push('/(auth)/sign-in')}
              className="mt-2"
            >
              <ButtonText className="text-primary-600">
                Already have an account? Sign In
              </ButtonText>
            </Button>
          </VStack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}