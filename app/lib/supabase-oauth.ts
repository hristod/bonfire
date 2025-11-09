import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';
import { Provider } from '@supabase/supabase-js';

// Warm up the browser for faster OAuth flows
WebBrowser.maybeCompleteAuthSession();

/**
 * Get the redirect URI for OAuth callbacks
 */
export function getRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'bonfire',
    path: 'auth/callback',
  });
}

/**
 * Sign in with OAuth provider (Apple or Google)
 * Opens browser for OAuth flow, returns session on success
 */
export async function signInWithOAuth(provider: Provider): Promise<{
  error: Error | null;
  data: any;
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
      return { error, data: null };
    }

    // Open browser for OAuth
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'cancel') {
        return { error: new Error('User cancelled'), data: null };
      }

      if (result.type === 'success' && result.url) {
        // Extract the session from the URL
        // Supabase SDK will handle the session via onAuthStateChange
        return { error: null, data: result };
      }
    }

    return { error: new Error('OAuth flow failed'), data: null };
  } catch (err) {
    console.error('OAuth error:', err);
    return { error: err as Error, data: null };
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
