import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Generate a nickname from OAuth provider user data
 * Priority: full_name from metadata -> email prefix
 * Sanitizes to lowercase, alphanumeric + underscores only
 */
export function generateNickname(user: User): string {
  // Try to get full name from user metadata
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name;

  if (fullName) {
    // Sanitize: lowercase, replace spaces with underscores, keep only alphanumeric and underscores
    return fullName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20); // Max 20 characters
  }

  // Fallback to email prefix
  const email = user.email || '';
  const emailPrefix = email.split('@')[0];

  return emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

/**
 * Check if a nickname is available (not already taken)
 */
export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('nickname', nickname)
    .maybeSingle();

  if (error) {
    console.error('Error checking nickname availability:', error);
    throw error;
  }

  // Available if no profile found with this nickname
  return data === null;
}

/**
 * Create profile with auto-generated nickname
 * Returns true if created successfully, false if nickname conflict
 */
export async function createProfileWithNickname(
  userId: string,
  nickname: string
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      nickname,
    });

  if (error) {
    // Check if it's a unique constraint violation
    if (error.code === '23505') {
      return false; // Nickname conflict
    }
    console.error('Error creating profile:', error);
    throw error;
  }

  return true;
}

/**
 * Update profile nickname (for conflict resolution)
 */
export async function updateProfileNickname(
  userId: string,
  nickname: string
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ nickname })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile nickname:', error);
    throw error;
  }
}
