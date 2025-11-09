import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export async function pickAndUploadAvatar(
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    onProgress?.(0.3);

    // Resize and compress image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 512, height: 512 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    onProgress?.(0.6);

    // Convert to base64 for upload
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];

          // Generate filename
          const filename = `${userId}/${Date.now()}.jpg`;

          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filename, decode(base64Data), {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (error) {
            throw error;
          }

          onProgress?.(1);

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filename);

          if (!publicUrl) {
            throw new Error('Failed to get public URL for uploaded avatar');
          }

          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}
