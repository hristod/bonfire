import * as Crypto from 'expo-crypto';

const WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SECRET_LENGTH = 16;

// Use a fixed master key for HMAC (in production, store in env)
const MASTER_KEY = process.env.EXPO_PUBLIC_BONFIRE_SECRET_KEY || 'bonfire-dev-key-change-in-production';

export interface SecretWindow {
  windowStart: Date;
  secret: string;
}

/**
 * Get the current 5-minute time window
 */
export function getCurrentWindow(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const windowMinutes = Math.floor(minutes / 5) * 5;
  now.setMinutes(windowMinutes, 0, 0);
  return now;
}

/**
 * Get the previous 5-minute time window (for overlap validation)
 */
export function getPreviousWindow(): Date {
  const current = getCurrentWindow();
  return new Date(current.getTime() - WINDOW_DURATION_MS);
}

/**
 * Generate secret code for a specific bonfire and time window
 */
export async function generateSecretForWindow(
  bonfireId: string,
  windowStart: Date
): Promise<string> {
  const payload = `${bonfireId}:${windowStart.toISOString()}`;
  const hmac = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${MASTER_KEY}:${payload}`
  );

  // Take first 16 characters of hex and convert to uppercase
  return hmac.substring(0, SECRET_LENGTH).toUpperCase();
}

/**
 * Generate secret code for current time window
 */
export async function generateCurrentSecret(bonfireId: string): Promise<SecretWindow> {
  const windowStart = getCurrentWindow();
  const secret = await generateSecretForWindow(bonfireId, windowStart);

  return { windowStart, secret };
}

/**
 * Validate a provided secret code against current and previous windows
 */
export async function isSecretValid(
  bonfireId: string,
  providedSecret: string
): Promise<boolean> {
  const currentWindow = getCurrentWindow();
  const previousWindow = getPreviousWindow();

  const currentSecret = await generateSecretForWindow(bonfireId, currentWindow);
  const previousSecret = await generateSecretForWindow(bonfireId, previousWindow);

  const provided = providedSecret.toUpperCase().trim();
  return provided === currentSecret || provided === previousSecret;
}
