import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import { ImageUploadResult } from '@bonfire/shared';

async function processAndUploadImage(
  asset: ImagePicker.ImagePickerAsset,
  bonfireId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult> {
  // Validate asset dimensions exist
  if (!asset.width || !asset.height) {
    throw new Error('processAndUploadImage: Invalid image - missing dimensions');
  }

  // Resize to max 1920px (preserve aspect ratio)
  const maxWidth = 1920;
  const maxHeight = 1920;
  let resizeOptions: { width?: number; height?: number } = {};

  if (asset.width > maxWidth || asset.height > maxHeight) {
    const aspectRatio = asset.width / asset.height;
    if (aspectRatio > 1) {
      resizeOptions.width = Math.min(asset.width, maxWidth);
    } else {
      resizeOptions.height = Math.min(asset.height, maxHeight);
    }
  }

  onProgress?.(0.4);

  const manipulatedImage = await ImageManipulator.manipulateAsync(
    asset.uri,
    resizeOptions.width || resizeOptions.height ? [{ resize: resizeOptions }] : [],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  onProgress?.(0.6);

  const response = await fetch(manipulatedImage.uri);
  const blob = await response.blob();
  const sizeBytes = blob.size;

  if (sizeBytes > 10 * 1024 * 1024) {
    throw new Error('Image is too large. Maximum size is 10MB.');
  }

  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        const filename = `${bonfireId}/${userId}/${Date.now()}.jpg`;

        onProgress?.(0.8);

        const { error } = await supabase.storage
          .from('bonfire-images')
          .upload(filename, decode(base64Data), {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        onProgress?.(0.95);

        const { data, error: urlError } = await supabase.storage
          .from('bonfire-images')
          .createSignedUrl(filename, 60 * 60 * 24 * 7); // 7 days

        if (urlError || !data?.signedUrl) {
          console.error('processAndUploadImage: Failed to generate signed URL:', urlError);
          throw new Error('processAndUploadImage: Failed to generate signed URL for uploaded image');
        }

        onProgress?.(1);

        resolve({
          url: data.signedUrl,
          width: manipulatedImage.width,
          height: manipulatedImage.height,
          sizeBytes,
        });
      } catch (error) {
        console.error('processAndUploadImage: Error processing and uploading image:', error);
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function pickAndUploadBonfireImage(
  bonfireId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    onProgress?.(0.2);

    return await processAndUploadImage(asset, bonfireId, userId, onProgress);
  } catch (error) {
    console.error('pickAndUploadBonfireImage: Error uploading bonfire image:', error);
    throw error;
  }
}

export async function takeAndUploadBonfireImage(
  bonfireId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    onProgress?.(0.2);

    return await processAndUploadImage(asset, bonfireId, userId, onProgress);
  } catch (error) {
    console.error('takeAndUploadBonfireImage: Error taking and uploading photo:', error);
    throw error;
  }
}
