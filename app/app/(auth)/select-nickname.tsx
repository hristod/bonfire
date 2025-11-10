import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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

  const onSubmit = async (data: NicknameForm) => {
    if (!user) {
      Alert.alert('Error', 'No user found');
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
      Alert.alert('Error', 'Unable to save nickname. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Nickname</Text>
      <Text style={styles.subtitle}>
        The auto-generated nickname is already taken. Please choose a different one.
      </Text>

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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nickname"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              autoFocus
            />
            {errors.nickname && (
              <Text style={styles.error}>{errors.nickname.message}</Text>
            )}
            <Text style={styles.hint}>3-20 characters, letters, numbers, and underscores only</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
