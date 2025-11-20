import { Database } from './database.types';

// Database row types
export type BonfireRow = Database['public']['Tables']['bonfires']['Row'];
export type BonfireInsert = Database['public']['Tables']['bonfires']['Insert'];
export type BonfireUpdate = Database['public']['Tables']['bonfires']['Update'];

export type BonfireParticipantRow = Database['public']['Tables']['bonfire_participants']['Row'];
export type BonfireMessageRow = Database['public']['Tables']['bonfire_messages']['Row'];

// Message types
export type MessageType = 'text' | 'image';

// Extended types with joined data
export interface Bonfire extends BonfireRow {
  creator_nickname?: string;
  creator_avatar_url?: string;
  participant_count?: number;
  distance_meters?: number;
}

export interface BonfireParticipant extends BonfireParticipantRow {
  nickname?: string;
  avatar_url?: string;
}

export interface BonfireMessage extends BonfireMessageRow {
  sender_nickname?: string;
  sender_avatar_url?: string;
}

// Form data types
export interface CreateBonfireData {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  proximityRadiusMeters: number;
  expiryHours: number;
  pin?: string; // 4-6 digit PIN
}

export interface JoinBonfireData {
  bonfireId: string;
  secretCode: string;
  pin?: string;
}

// Discovery types
export interface NearbyBonfire {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  creator_nickname: string;
  creator_avatar_url: string | null;
  distance_meters: number;
  participant_count: number;
  has_pin: boolean;
  expires_at: string;
  proximity_radius_meters: number;
  // current_secret_code removed for security - use getBonfireSecret() instead
}

// Location types
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// Image upload result
export interface ImageUploadResult {
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}
