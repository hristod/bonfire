import { useState } from 'react';
import { ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { VStack } from '@/components/ui/vstack';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { createBonfire } from '@/lib/bonfire-utils';
import { getCurrentLocation } from '@/lib/location-tracking';
import { CreateBonfireData } from '@bonfire/shared';

interface CreateBonfireForm {
  name: string;
  description?: string;
  expiryHours: string;
  proximityRadiusMeters: string;
  pin?: string;
}

export default function CreateBonfireScreen() {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBonfireForm>({
    defaultValues: {
      name: '',
      description: '',
      expiryHours: '12',
      proximityRadiusMeters: '30',
      pin: '',
    },
  });

  const onSubmit = async (data: CreateBonfireForm) => {
    try {
      setLoading(true);

      // Get current location
      const location = await getCurrentLocation();

      // Validate PIN if provided
      if (data.pin && data.pin.trim() !== '') {
        if (!/^\d{4,6}$/.test(data.pin)) {
          Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
          setLoading(false);
          return;
        }
      }

      // Create bonfire
      const bonfireData: CreateBonfireData = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        proximityRadiusMeters: parseInt(data.proximityRadiusMeters, 10),
        expiryHours: parseInt(data.expiryHours, 10),
        pin: data.pin?.trim() || undefined,
      };

      const bonfire = await createBonfire(bonfireData);

      Alert.alert('Success', 'Bonfire created!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/bonfire/${bonfire.id}`),
        },
      ]);
    } catch (error) {
      console.error('CreateBonfireScreen: Failed to create bonfire:', error);
      Alert.alert('Error', 'Failed to create bonfire. Please try again.');
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
        <ScrollView className="flex-1 bg-white">
          <Box className="p-4">
            <Text className="text-2xl font-bold mb-4">Create Bonfire</Text>

            <VStack space="lg" className="gap-4">
              {/* Name */}
              <FormControl isInvalid={!!errors.name}>
                <FormControlLabel>
                  <FormControlLabelText>Name</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="name"
                  rules={{
                    required: 'Name is required',
                    minLength: { value: 3, message: 'Name must be at least 3 characters' },
                    maxLength: { value: 50, message: 'Name must be at most 50 characters' },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input>
                      <InputField
                        placeholder="My Bonfire"
                        value={value}
                        onChangeText={onChange}
                      />
                    </Input>
                  )}
                />
                {errors.name && (
                  <FormControlError>
                    <FormControlErrorText>{errors.name.message}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Description */}
              <FormControl isInvalid={!!errors.description}>
                <FormControlLabel>
                  <FormControlLabelText>Description (optional)</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="description"
                  rules={{
                    maxLength: { value: 200, message: 'Description must be at most 200 characters' },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input>
                      <InputField
                        placeholder="What's this bonfire about?"
                        value={value}
                        onChangeText={onChange}
                        multiline
                      />
                    </Input>
                  )}
                />
                {errors.description && (
                  <FormControlError>
                    <FormControlErrorText>{errors.description.message}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Expiry Hours */}
              <FormControl isInvalid={!!errors.expiryHours}>
                <FormControlLabel>
                  <FormControlLabelText>Expires in (hours)</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="expiryHours"
                  rules={{
                    required: 'Expiry time is required',
                    pattern: { value: /^\d+$/, message: 'Must be a number' },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input>
                      <InputField
                        placeholder="12"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                      />
                    </Input>
                  )}
                />
                {errors.expiryHours && (
                  <FormControlError>
                    <FormControlErrorText>{errors.expiryHours.message}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Proximity Radius */}
              <FormControl isInvalid={!!errors.proximityRadiusMeters}>
                <FormControlLabel>
                  <FormControlLabelText>Proximity radius (meters)</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="proximityRadiusMeters"
                  rules={{
                    required: 'Proximity radius is required',
                    pattern: { value: /^\d+$/, message: 'Must be a number' },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input>
                      <InputField
                        placeholder="30"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                      />
                    </Input>
                  )}
                />
                {errors.proximityRadiusMeters && (
                  <FormControlError>
                    <FormControlErrorText>{errors.proximityRadiusMeters.message}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* PIN (optional) */}
              <FormControl isInvalid={!!errors.pin}>
                <FormControlLabel>
                  <FormControlLabelText>PIN (optional, 4-6 digits)</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="pin"
                  rules={{
                    pattern: { value: /^\d{4,6}$|^$/, message: 'PIN must be 4-6 digits' },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input>
                      <InputField
                        placeholder="Leave empty for public bonfire"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        secureTextEntry
                      />
                    </Input>
                  )}
                />
                {errors.pin && (
                  <FormControlError>
                    <FormControlErrorText>{errors.pin.message}</FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>

              {/* Submit button */}
              <Button
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                className="bg-primary-600 mt-4"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ButtonText>Create Bonfire</ButtonText>
                )}
              </Button>
            </VStack>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
