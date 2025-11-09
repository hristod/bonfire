import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { supabase } from '../../lib/supabase';
import { pickAndUploadAvatar } from '../../lib/uploadAvatar';

interface ProfileForm {
  nickname: string;
}

export default function ProfileScreen() {
  const { profile, user, setProfile } = useAuthStore();
  const { isUploading, uploadProgress, setUploading, setProgress, resetProgress } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      nickname: profile?.nickname || '',
    },
  });

  const onSave = async (data: ProfileForm) => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: data.nickname,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Update local state
      if (profile) {
        setProfile({ ...profile, nickname: data.nickname });
      }

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    if (!user) return;

    setUploading(true);
    resetProgress();

    try {
      const avatarUrl = await pickAndUploadAvatar(user.id, setProgress);

      if (avatarUrl) {
        // Update profile with new avatar URL
        const { error } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          throw error;
        }

        // Update local state
        if (profile) {
          setProfile({ ...profile, avatar_url: avatarUrl });
        }

        Alert.alert('Success', 'Avatar updated successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload avatar');
      console.error(error);
    } finally {
      resetProgress();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <TouchableOpacity onPress={handlePickImage} disabled={isUploading}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {profile?.nickname?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="white" />
              <Text style={styles.uploadingText}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

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
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              style={styles.input}
              placeholder="Nickname"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
            />
            {errors.nickname && (
              <Text style={styles.error}>{errors.nickname.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, (saving || isUploading) && styles.buttonDisabled]}
        onPress={handleSubmit(onSave)}
        disabled={saving || isUploading}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    marginTop: 5,
    fontWeight: '600',
  },
  changePhotoText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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
