import * as WebBrowser from 'expo-web-browser';
import { WebBrowserAuthSessionResult } from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';
import { Provider } from '@supabase/supabase-js';

// Constants
const ERROR_USER_CANCELLED = 'User cancelled';

// Warm up the browser for faster OAuth flows
WebBrowser.maybeCompleteAuthSession();

/**
 * Validate a URL string
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'bonfire:';
  } catch {
    return false;
  }
}

/**
 * Get the redirect URI for OAuth callbacks
 */
export function getRedirectUri(): string {
  const redirectUri = makeRedirectUri({
    scheme: 'bonfire',
    path: 'auth/callback',
  });

  if (!isValidUrl(redirectUri)) {
    throw new Error(`Invalid redirect URI generated: ${redirectUri}`);
  }

  return redirectUri;
}

/**
 * Sign in with OAuth provider (Apple or Google)
 * Opens browser for OAuth flow, returns session on success
 */
export async function signInWithOAuth(provider: Provider): Promise<{
  error: Error | null;
  data: WebBrowserAuthSessionResult | null;
}> {
  try {
    const redirectUri = getRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error(`OAuth error for ${provider}:`, error);
      return { error, data: null };
    }

    // Open browser for OAuth
    if (data?.url) {
      // Validate OAuth URL before opening
      if (!isValidUrl(data.url)) {
        const validationError = new Error(`Invalid OAuth URL received from ${provider}`);
        console.error(`OAuth error for ${provider}:`, validationError);
        return { error: validationError, data: null };
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'cancel') {
        return { error: new Error(ERROR_USER_CANCELLED), data: null };
      }

      if (result.type === 'success' && result.url) {
        // Extract the session from the URL
        // Supabase SDK will handle the session via onAuthStateChange
        return { error: null, data: result };
      }
    }

    const flowError = new Error(`OAuth flow failed for ${provider}`);
    console.error(`OAuth error for ${provider}:`, flowError);
    return { error: flowError, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`OAuth error for ${provider}:`, error);
    return { error, data: null };
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple() {
  return signInWithOAuth('apple');
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  return signInWithOAuth('google');
}
