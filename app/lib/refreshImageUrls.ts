import { supabase } from './supabase';
import { BonfireMessage } from '@bonfire/shared';

const URL_EXPIRY_BUFFER = 3600000; // 1 hour in milliseconds

/**
 * Check if signed URL is expiring soon
 */
function isUrlExpiringSoon(url: string): boolean {
  try {
    // Extract token expiry from signed URL
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    if (!token) return true;

    // Signed URLs from Supabase include expiry in token (base64 encoded)
    // For simplicity, refresh if URL exists (conservative approach)
    return true;
  } catch {
    return true;
  }
}

/**
 * Refresh signed URL for an image
 */
async function refreshImageUrl(imagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('bonfire-images')
      .createSignedUrl(imagePath, 60 * 60 * 24 * 7); // 7 days

    if (error) {
      console.error('refreshImageUrl: Failed to refresh URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('refreshImageUrl: Error refreshing image URL:', error);
    return null;
  }
}

/**
 * Refresh image URLs in messages that are expiring
 * Returns updated messages with fresh URLs
 */
export async function refreshExpiredImageUrls(
  messages: BonfireMessage[]
): Promise<BonfireMessage[]> {
  const updatedMessages = [...messages];
  let refreshCount = 0;

  for (let i = 0; i < updatedMessages.length; i++) {
    const msg = updatedMessages[i];

    // Skip non-image messages
    if (msg.message_type !== 'image' || !msg.image_url) {
      continue;
    }

    // Check if URL needs refresh
    if (isUrlExpiringSoon(msg.image_url)) {
      // Extract path from URL (remove domain and signature)
      const urlObj = new URL(msg.image_url);
      const path = urlObj.pathname.split('/object/sign/bonfire-images/')[1];

      if (path) {
        const freshUrl = await refreshImageUrl(path);
        if (freshUrl) {
          updatedMessages[i] = {
            ...msg,
            image_url: freshUrl,
          };
          refreshCount++;
        }
      }
    }
  }

  if (refreshCount > 0) {
    console.log(`refreshExpiredImageUrls: Refreshed ${refreshCount} image URLs`);
  }

  return updatedMessages;
}
