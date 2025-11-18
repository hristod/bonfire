import { useState } from "react";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { signInWithApple, signInWithGoogle } from "../../lib/supabase-oauth";
import {
  generateNickname,
  createProfileWithNickname,
} from "../../lib/profile-utils";
import OAuthButton from "../../components/OAuthButton";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import {
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import { VStack } from "@/components/ui/vstack";

interface SignInForm {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>();
  const { oauthLoading, setOAuthLoading, setPendingNickname, user } =
    useAuthStore();
  const toast = useToast();

  const handleOAuthSignIn = async (provider: "apple" | "google") => {
    setOAuthLoading(true);

    try {
      const { error } =
        provider === "apple"
          ? await signInWithApple()
          : await signInWithGoogle();

      if (error) {
        if (error.message !== "User cancelled") {
          toast.show({
            placement: "top",
            render: ({ id }) => (
              <Toast nativeID={`toast-${id}`} action="error">
                <VStack space="xs" className="flex-1">
                  <ToastTitle>Error</ToastTitle>
                  <ToastDescription>
                    Authentication failed. Please try again.
                  </ToastDescription>
                </VStack>
              </Toast>
            ),
          });
        }
      }
      // Success handling happens in auth state listener
    } catch (error) {
      console.error("OAuth error:", error);
      toast.show({
        placement: "top",
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

  const onSignIn = async (data: SignInForm) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.show({
          placement: "top",
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
        placement: "top",
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
        <Heading size="2xl" className="mb-8 text-center">
          Welcome Back
        </Heading>

        <VStack space="sm">
          <OAuthButton
            provider="apple"
            onPress={() => handleOAuthSignIn("apple")}
            loading={oauthLoading}
          />

          <OAuthButton
            provider="google"
            onPress={() => handleOAuthSignIn("google")}
            loading={oauthLoading}
          />
        </VStack>

        <HStack space="md" className="items-center my-5">
          <Box className="flex-1 h-px bg-border-300" />
          <Text size="sm" className="text-typography-500">
            or continue with
          </Text>
          <Box className="flex-1 h-px bg-border-300" />
        </HStack>

        <VStack space="md">
          <FormControl isInvalid={!!errors.email}>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
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
              <FormControlErrorText>
                {errors.email?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <Controller
              control={control}
              name="password"
              rules={{
                required: "Password is required",
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
              <FormControlErrorText>
                {errors.password?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>

          <Button
            isDisabled={loading}
            onPress={handleSubmit(onSignIn)}
            className="mt-2"
          >
            <ButtonText>{loading ? "Signing in..." : "Sign In"}</ButtonText>
          </Button>

          <Button variant="link" onPress={() => router.push("/(auth)/sign-up")}>
            <ButtonText>Don't have an account? Sign Up</ButtonText>
          </Button>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}
