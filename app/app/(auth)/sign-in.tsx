import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase-oauth';
import { generateNickname, createProfileWithNickname } from '../../lib/profile-utils';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="p-6">
          <VStack space="lg">
            <View className="mb-4">
              <Text className="text-3xl font-bold text-typography-900 mb-2">
                Welcome Back
              </Text>
              <Text className="text-base text-typography-500">
                Sign in to your account
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
                    value: 6,
                    message: 'Password must be at least 6 characters',
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

            {/* Sign In Button */}
            <Button
              disabled={loading}
              onPress={handleSubmit(onSignIn)}
              className="bg-primary-600 active:bg-primary-700 mt-2"
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ButtonText className="text-white font-semibold">
                  Sign In
                </ButtonText>
              )}
            </Button>

            {/* Sign Up Link */}
            <Button
              variant="link"
              onPress={() => router.push('/(auth)/sign-up')}
              className="mt-2"
            >
              <ButtonText className="text-primary-600">
                Don't have an account? Sign Up
              </ButtonText>
            </Button>
          </VStack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
