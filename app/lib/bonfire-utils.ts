import { supabase } from './supabase';
import {
  CreateBonfireData,
  JoinBonfireData,
  Bonfire,
  NearbyBonfire,
  BonfireMessage,
  BonfireParticipant,
} from '@bonfire/shared';
import { generateCurrentSecret } from './secret-code';
import * as Crypto from 'expo-crypto';

/**
 * Type for the RPC return from get_bonfire_with_participants
 */
interface BonfireWithParticipantsRow {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  latitude: number;
  longitude: number;
  proximity_radius_meters: number;
  expires_at: string;
  participant_id: string | null;
  participant_nickname: string | null;
  participant_avatar_url: string | null;
  participant_joined_at: string | null;
  participant_last_seen_at: string | null;
}

/**
 * Hash a PIN using SHA-256 (bcrypt not available in React Native)
 * Note: In production, consider using a backend function for proper bcrypt
 */
async function hashPin(pin: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `bonfire:${pin}:salt` // Add salt
  );
  return hash;
}

/**
 * Create a new bonfire
 */
export async function createBonfire(data: CreateBonfireData): Promise<Bonfire> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Generate initial secret code
    const { windowStart, secret } = await generateCurrentSecret(user.id);

    // Hash PIN if provided
    let pinHash: string | null = null;
    if (data.pin) {
      if (!/^\d{4,6}$/.test(data.pin)) {
        throw new Error('PIN must be 4-6 digits');
      }
      pinHash = await hashPin(data.pin);
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + data.expiryHours);

    // Insert bonfire
    const { data: bonfire, error } = await supabase
      .from('bonfires')
      .insert({
        creator_id: user.id,
        name: data.name,
        description: data.description || null,
        latitude: data.latitude,
        longitude: data.longitude,
        proximity_radius_meters: data.proximityRadiusMeters,
        current_secret_code: secret,
        secret_window_start: windowStart.toISOString(),
        has_pin: !!data.pin,
        pin_hash: pinHash,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bonfire:', error);
      throw error;
    }

    // Add creator as first participant
    const { error: participantError } = await supabase
      .from('bonfire_participants')
      .insert({
        bonfire_id: bonfire.id,
        user_id: user.id,
      });

    if (participantError) {
      console.error('Error adding creator as participant:', participantError);
      throw participantError;
    }

    return bonfire;
  } catch (error) {
    console.error('Failed to create bonfire:', error);
    throw error;
  }
}

/**
 * Find nearby bonfires
 */
export async function findNearbyBonfires(
  latitude: number,
  longitude: number,
  maxDistance: number = 50
): Promise<NearbyBonfire[]> {
  try {
    const { data, error } = await supabase.rpc('find_nearby_bonfires', {
      user_lat: latitude,
      user_lng: longitude,
      max_distance_meters: maxDistance,
    });

    if (error) {
      console.error('Error finding nearby bonfires:', error);
      throw error;
    }

    return data as NearbyBonfire[];
  } catch (error) {
    console.error('Failed to find nearby bonfires:', error);
    throw error;
  }
}

/**
 * Join a bonfire
 */
export async function joinBonfire(data: JoinBonfireData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Validate join attempt using database function
    const { data: isValid, error: validationError } = await supabase.rpc(
      'validate_bonfire_join',
      {
        p_bonfire_id: data.bonfireId,
        p_secret_code: data.secretCode,
        p_pin_code: data.pin || null,
      }
    );

    if (validationError) {
      console.error('joinBonfire: Error validating bonfire join:', validationError);

      // Check for rate limit error
      if (validationError.message?.includes('Too many failed PIN attempts')) {
        throw new Error('Too many incorrect PIN attempts. Please wait 15 minutes before trying again.');
      }

      throw validationError;
    }

    if (!isValid) {
      throw new Error('Invalid secret code or PIN');
    }

    // Check if already a participant
    const { data: existingParticipant } = await supabase
      .from('bonfire_participants')
      .select('user_id')
      .eq('bonfire_id', data.bonfireId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingParticipant) {
      // Already joined, just return
      return;
    }

    // Add user as participant
    const { error: insertError } = await supabase
      .from('bonfire_participants')
      .insert({
        bonfire_id: data.bonfireId,
        user_id: user.id,
      });

    if (insertError) {
      console.error('joinBonfire: Error joining bonfire:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('joinBonfire: Failed to join bonfire:', error);
    throw error;
  }
}

/**
 * Get bonfire with participants
 */
export async function getBonfireWithParticipants(bonfireId: string): Promise<{
  bonfire: Bonfire;
  participants: BonfireParticipant[];
}> {
  try {
    const { data, error } = await supabase.rpc('get_bonfire_with_participants', {
      p_bonfire_id: bonfireId,
    });

    if (error) {
      console.error('Error getting bonfire with participants:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Bonfire not found');
    }

    // Parse result (first row contains bonfire data, all rows contain participants)
    const typedData = data as BonfireWithParticipantsRow[];
    const firstRow = typedData[0];
    const bonfire: Bonfire = {
      id: firstRow.id,
      creator_id: firstRow.creator_id,
      name: firstRow.name,
      description: firstRow.description,
      latitude: firstRow.latitude,
      longitude: firstRow.longitude,
      proximity_radius_meters: firstRow.proximity_radius_meters,
      expires_at: firstRow.expires_at,
    } as Bonfire;

    const participants: BonfireParticipant[] = typedData
      .filter((row): row is BonfireWithParticipantsRow & { participant_id: string } => row.participant_id !== null)
      .map((row) => ({
        bonfire_id: bonfireId,
        user_id: row.participant_id,
        nickname: row.participant_nickname ?? undefined,
        avatar_url: row.participant_avatar_url ?? undefined,
        joined_at: row.participant_joined_at ?? new Date().toISOString(),
        last_seen_at: row.participant_last_seen_at ?? new Date().toISOString(),
      }));

    return { bonfire, participants };
  } catch (error) {
    console.error('Failed to get bonfire with participants:', error);
    throw error;
  }
}

/**
 * Send a text message
 */
export async function sendTextMessage(
  bonfireId: string,
  content: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    const { error } = await supabase.from('bonfire_messages').insert({
      bonfire_id: bonfireId,
      user_id: user.id,
      message_type: 'text',
      content: content.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

/**
 * Send an image message
 */
export async function sendImageMessage(
  bonfireId: string,
  imageUrl: string,
  width: number,
  height: number,
  sizeBytes: number,
  caption?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase.from('bonfire_messages').insert({
      bonfire_id: bonfireId,
      user_id: user.id,
      message_type: 'image',
      content: caption?.trim() || null,
      image_url: imageUrl,
      image_width: width,
      image_height: height,
      image_size_bytes: sizeBytes,
    });

    if (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to send image message:', error);
    throw error;
  }
}

/**
 * End a bonfire (creator only)
 */
export async function endBonfire(bonfireId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('bonfires')
      .update({ is_active: false })
      .eq('id', bonfireId)
      .eq('creator_id', user.id);

    if (error) {
      console.error('Error ending bonfire:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to end bonfire:', error);
    throw error;
  }
}

/**
 * Leave a bonfire (non-creator only)
 */
export async function leaveBonfire(bonfireId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('bonfire_participants')
      .delete()
      .eq('bonfire_id', bonfireId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving bonfire:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to leave bonfire:', error);
    throw error;
  }
}

/**
 * Update participant presence (last_seen_at)
 */
export async function updatePresence(bonfireId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('update_participant_presence', {
      p_bonfire_id: bonfireId,
      p_user_id: user.id,
    });
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
}
