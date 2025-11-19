import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { Lock } from 'lucide-react-native';
import { joinBonfire } from '@/lib/bonfire-utils';

interface JoinBonfireForm {
  pin?: string;
}

export default function JoinBonfireScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bonfireId: string;
    secretCode: string;
    hasPin: string;
    bonfireName: string;
    description: string;
  }>();

  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinBonfireForm>();

  const hasPin = params.hasPin === 'true';

  const onJoinBonfire = async (data: JoinBonfireForm) => {
    if (!params.bonfireId || !params.secretCode) {
      Alert.alert('Error', 'Missing bonfire information');
      return;
    }

    setLoading(true);

    try {
      await joinBonfire({
        bonfireId: params.bonfireId,
        secretCode: params.secretCode,
        pin: hasPin ? data.pin : undefined,
      });

      // Navigate to bonfire chat on success
      router.replace(`/bonfire/${params.bonfireId}`);
    } catch (error) {
      console.error('JoinBonfireScreen: Failed to join bonfire:', error);

      // Show user-friendly error message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to join bonfire';

      Alert.alert(
        'Join Failed',
        errorMessage.includes('Invalid')
          ? 'Invalid secret code or PIN. Please check and try again.'
          : 'Failed to join bonfire. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Box className="flex-1 p-5 justify-center">
            <VStack space="lg" className="w-full">
              {/* Header */}
              <VStack space="sm" className="items-center">
                <Heading size="2xl" className="text-center">
                  Join Bonfire
                </Heading>
                <Text className="text-gray-600 text-center">
                  You're about to join this bonfire
                </Text>
              </VStack>

              {/* Bonfire details */}
              <Box className="bg-white rounded-lg p-4 border border-gray-200">
                <VStack space="sm">
                  <VStack space="xs">
                    <Text className="text-sm text-gray-500">Bonfire Name</Text>
                    <Text className="text-lg font-bold text-gray-900">
                      {params.bonfireName}
                    </Text>
                  </VStack>

                  {params.description && (
                    <VStack space="xs">
                      <Text className="text-sm text-gray-500">Description</Text>
                      <Text className="text-gray-700">
                        {params.description}
                      </Text>
                    </VStack>
                  )}

                  {hasPin && (
                    <VStack space="xs">
                      <Text className="text-sm text-gray-500">Security</Text>
                      <Box className="flex-row items-center gap-2">
                        <Lock size={16} color="#6B7280" />
                        <Text className="text-sm text-gray-700">
                          PIN protected
                        </Text>
                      </Box>
                    </VStack>
                  )}
                </VStack>
              </Box>

              {/* Join form */}
              <VStack space="md">
                {/* Secret code (read-only, auto-filled) */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText>Secret Code</FormControlLabelText>
                  </FormControlLabel>
                  <Input isReadOnly>
                    <InputField
                      value={params.secretCode}
                      editable={false}
                    />
                  </Input>
                </FormControl>

                {/* PIN input (conditional) */}
                {hasPin && (
                  <FormControl isInvalid={!!errors.pin}>
                    <FormControlLabel>
                      <FormControlLabelText>PIN</FormControlLabelText>
                    </FormControlLabel>
                    <Controller
                      control={control}
                      name="pin"
                      rules={{
                        required: hasPin ? 'PIN is required' : false,
                        pattern: {
                          value: /^\d{4,6}$/,
                          message: 'PIN must be 4-6 digits',
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input>
                          <InputField
                            placeholder="Enter 4-6 digit PIN"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            keyboardType="numeric"
                            maxLength={6}
                            secureTextEntry
                          />
                        </Input>
                      )}
                    />
                    <FormControlError>
                      <FormControlErrorText>
                        {errors.pin?.message}
                      </FormControlErrorText>
                    </FormControlError>
                  </FormControl>
                )}

                {/* Join button */}
                <Button
                  isDisabled={loading}
                  onPress={handleSubmit(onJoinBonfire)}
                  className="mt-2 bg-primary-600"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ButtonText>Join Bonfire</ButtonText>
                  )}
                </Button>

                {/* Cancel button */}
                <Button
                  variant="outline"
                  onPress={() => router.back()}
                  isDisabled={loading}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
              </VStack>
            </VStack>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
