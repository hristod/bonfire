# OAuth Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Apple and Google OAuth authentication to Bonfire alongside existing email/password auth, with automatic account linking.

**Architecture:** Use expo-auth-session for OAuth flows with PKCE, Supabase handles provider configuration and account linking. Auto-generate nicknames from provider data with conflict resolution UI.

**Tech Stack:** Expo AuthSession, Supabase Auth (Apple/Google providers), React Hook Form, Zustand

---

## Task 1: Install OAuth Dependencies

**Files:**
- Modify: `app/package.json`

**Step 1: Install expo-auth-session packages**

```bash
cd app && pnpm add expo-auth-session expo-crypto expo-web-browser
```

Expected: Packages installed successfully

**Step 2: Verify installation**

```bash
cat package.json | grep -E "(expo-auth-session|expo-crypto|expo-web-browser)"
```

Expected: See version numbers for all three packages

**Step 3: Commit**

```bash
git add app/package.json app/pnpm-lock.yaml
git commit -m "feat: add OAuth dependencies

- expo-auth-session for OAuth flows
- expo-crypto for PKCE code generation
- expo-web-browser for OAuth browser

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Update Expo Configuration for OAuth

**Files:**
- Modify: `app/app.json`

**Step 1: Add OAuth configuration**

Update the `ios` section to include Apple Sign-In capability:

```json
{
  "expo": {
    "name": "Bonfire",
    "slug": "bonfire",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.bonfire.app",
      "usesAppleSignIn": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.bonfire.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router"
    ],
    "scheme": "bonfire"
  }
}
```

**Step 2: Verify configuration**

```bash
cat app/app.json | grep -A 2 "usesAppleSignIn"
```

Expected: See `"usesAppleSignIn": true`

**Step 3: Commit**

```bash
git add app/app.json
git commit -m "feat: enable Apple Sign-In in Expo config

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create Profile Utilities

**Files:**
- Create: `app/lib/profile-utils.ts`

**Step 1: Create utility file with nickname generation**

```typescript
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
```

**Step 2: Verify file created**

```bash
cat app/lib/profile-utils.ts | head -5
```

Expected: See file with imports and first function

**Step 3: Commit**

```bash
git add app/lib/profile-utils.ts
git commit -m "feat: add profile utility functions for OAuth

- generateNickname from provider data or email
- isNicknameAvailable check
- createProfileWithNickname with conflict detection
- updateProfileNickname for conflict resolution

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Create OAuth Helper Functions

**Files:**
- Create: `app/lib/supabase-oauth.ts`

**Step 1: Create OAuth helper with Apple and Google sign-in**

```typescript
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
```

**Step 2: Verify file created**

```bash
cat app/lib/supabase-oauth.ts | grep -E "(signInWithApple|signInWithGoogle)"
```

Expected: See both function definitions

**Step 3: Commit**

```bash
git add app/lib/supabase-oauth.ts
git commit -m "feat: add OAuth helper functions

- signInWithOAuth for Apple and Google
- getRedirectUri for OAuth callbacks
- Browser warmup for faster flows

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update Auth Store for OAuth

**Files:**
- Modify: `app/store/authStore.ts`

**Step 1: Add OAuth state and actions to auth store**

Add these new properties to the `AuthStore` interface (after line 11):

```typescript
  oauthLoading: boolean;
  pendingNickname: boolean;
```

Add these new methods to the interface (after line 18):

```typescript
  setOAuthLoading: (loading: boolean) => void;
  setPendingNickname: (pending: boolean) => void;
```

Add these to the initial state (after line 28):

```typescript
  oauthLoading: false,
  pendingNickname: false,
```

Add these implementations at the end, before the closing of the create function (after line 57):

```typescript
  setOAuthLoading: (loading) => set({ oauthLoading: loading }),

  setPendingNickname: (pending) => set({ pendingNickname: pending }),
```

**Step 2: Verify changes**

```bash
cat app/store/authStore.ts | grep -E "(oauthLoading|pendingNickname)"
```

Expected: See all new properties and methods

**Step 3: Commit**

```bash
git add app/store/authStore.ts
git commit -m "feat: add OAuth state to auth store

- oauthLoading for OAuth flow loading state
- pendingNickname for nickname selection flow

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Create OAuth Button Component

**Files:**
- Create: `app/components/OAuthButton.tsx`

**Step 1: Create reusable OAuth button component**

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Provider } from '@supabase/supabase-js';

interface OAuthButtonProps {
  provider: Provider;
  onPress: () => void;
  loading?: boolean;
}

export default function OAuthButton({ provider, onPress, loading = false }: OAuthButtonProps) {
  const isApple = provider === 'apple';
  const buttonText = isApple ? 'Continue with Apple' : 'Continue with Google';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isApple ? styles.appleButton : styles.googleButton,
        loading && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={isApple ? 'white' : 'black'} />
        ) : (
          <Text style={[styles.buttonText, isApple ? styles.appleText : styles.googleText]}>
            {buttonText}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  appleText: {
    color: '#FFFFFF',
  },
  googleText: {
    color: '#000000',
  },
});
```

**Step 2: Verify component created**

```bash
cat app/components/OAuthButton.tsx | grep "export default"
```

Expected: See component export

**Step 3: Commit**

```bash
git add app/components/OAuthButton.tsx
git commit -m "feat: add OAuth button component

- Platform-specific styling for Apple/Google
- Loading states
- Reusable across sign-in/sign-up screens

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Create Nickname Selection Screen

**Files:**
- Create: `app/app/(auth)/select-nickname.tsx`

**Step 1: Create nickname selection screen**

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import { updateProfileNickname, isNicknameAvailable } from '../../lib/profile-utils';

interface NicknameForm {
  nickname: string;
}

export default function SelectNicknameScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, setPendingNickname } = useAuthStore();
  const { control, handleSubmit, formState: { errors }, setError } = useForm<NicknameForm>();

  const onSubmit = async (data: NicknameForm) => {
    if (!user) {
      Alert.alert('Error', 'No user found');
      return;
    }

    setLoading(true);

    try {
      // Check if nickname is available
      const available = await isNicknameAvailable(data.nickname);

      if (!available) {
        setError('nickname', {
          type: 'manual',
          message: 'This nickname is already taken',
        });
        setLoading(false);
        return;
      }

      // Update profile with new nickname
      await updateProfileNickname(user.id, data.nickname);

      // Clear pending state and navigate to app
      setPendingNickname(false);
      router.replace('/(app)');
    } catch (error) {
      console.error('Error updating nickname:', error);
      Alert.alert('Error', 'Unable to save nickname. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Nickname</Text>
      <Text style={styles.subtitle}>
        The auto-generated nickname is already taken. Please choose a different one.
      </Text>

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
            message: 'Nickname must be at most 20 characters',
          },
          pattern: {
            value: /^[a-zA-Z0-9_]+$/,
            message: 'Nickname can only contain letters, numbers, and underscores',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nickname"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              autoFocus
            />
            {errors.nickname && (
              <Text style={styles.error}>{errors.nickname.message}</Text>
            )}
            <Text style={styles.hint}>3-20 characters, letters, numbers, and underscores only</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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
```

**Step 2: Verify screen created**

```bash
cat app/app/\(auth\)/select-nickname.tsx | grep "export default"
```

Expected: See screen export

**Step 3: Commit**

```bash
git add app/app/\(auth\)/select-nickname.tsx
git commit -m "feat: add nickname selection screen

- Shown when OAuth nickname conflicts
- Form validation for nickname format
- Availability check before saving

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update Sign-In Screen with OAuth Buttons

**Files:**
- Modify: `app/app/(auth)/sign-in.tsx`

**Step 1: Add imports at the top**

After line 5, add:

```typescript
import { useAuthStore } from '../../store/authStore';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase-oauth';
import { generateNickname, createProfileWithNickname } from '../../lib/profile-utils';
import OAuthButton from '../../components/OAuthButton';
```

**Step 2: Add OAuth state and handler inside component**

After line 14 (after the `useForm` hook), add:

```typescript
  const { oauthLoading, setOAuthLoading, setPendingNickname, user } = useAuthStore();

  const handleOAuthSignIn = async (provider: 'apple' | 'google') => {
    setOAuthLoading(true);

    try {
      const { error } = provider === 'apple'
        ? await signInWithApple()
        : await signInWithGoogle();

      if (error) {
        if (error.message !== 'User cancelled') {
          Alert.alert('Error', 'Authentication failed. Please try again.');
        }
      }
      // Success handling happens in auth state listener
    } catch (error) {
      console.error('OAuth error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setOAuthLoading(false);
    }
  };
```

**Step 3: Add OAuth buttons to UI**

After line 39 (after `<Text style={styles.title}>Welcome Back</Text>`), add:

```typescript
      <OAuthButton
        provider="apple"
        onPress={() => handleOAuthSignIn('apple')}
        loading={oauthLoading}
      />

      <OAuthButton
        provider="google"
        onPress={() => handleOAuthSignIn('google')}
        loading={oauthLoading}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>
```

**Step 4: Add divider styles**

Add these styles to the `StyleSheet.create` section at the end:

```typescript
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
```

**Step 5: Verify changes**

```bash
cat app/app/\(auth\)/sign-in.tsx | grep -E "(OAuthButton|handleOAuthSignIn)"
```

Expected: See OAuth button and handler

**Step 6: Commit**

```bash
git add app/app/\(auth\)/sign-in.tsx
git commit -m "feat: add OAuth buttons to sign-in screen

- Apple and Google sign-in at top
- Divider before email/password
- OAuth loading states

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Update Sign-Up Screen with OAuth Buttons

**Files:**
- Modify: `app/app/(auth)/sign-up.tsx`

**Step 1: Read existing sign-up screen**

```bash
cat app/app/\(auth\)/sign-up.tsx
```

Expected: See current sign-up screen structure

**Step 2: Add same OAuth imports and functionality**

Add the same imports as sign-in screen:

```typescript
import { useAuthStore } from '../../store/authStore';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase-oauth';
import OAuthButton from '../../components/OAuthButton';
```

Add the same OAuth handler and state after the `useForm` hook:

```typescript
  const { oauthLoading, setOAuthLoading } = useAuthStore();

  const handleOAuthSignIn = async (provider: 'apple' | 'google') => {
    setOAuthLoading(true);

    try {
      const { error } = provider === 'apple'
        ? await signInWithApple()
        : await signInWithGoogle();

      if (error) {
        if (error.message !== 'User cancelled') {
          Alert.alert('Error', 'Authentication failed. Please try again.');
        }
      }
      // Success handling happens in auth state listener
    } catch (error) {
      console.error('OAuth error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setOAuthLoading(false);
    }
  };
```

Add OAuth buttons and divider at the top of the form (similar to sign-in), and add divider styles.

**Step 3: Verify changes**

```bash
cat app/app/\(auth\)/sign-up.tsx | grep "OAuthButton"
```

Expected: See OAuth buttons

**Step 4: Commit**

```bash
git add app/app/\(auth\)/sign-up.tsx
git commit -m "feat: add OAuth buttons to sign-up screen

- Apple and Google sign-up at top
- Same layout as sign-in screen
- OAuth loading states

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Handle OAuth Profile Creation in Auth Store

**Files:**
- Modify: `app/store/authStore.ts`

**Step 1: Import profile utilities at top**

Add after line 4:

```typescript
import { generateNickname, createProfileWithNickname } from '../lib/profile-utils';
```

**Step 2: Update the onAuthStateChange listener**

Find the `onAuthStateChange` callback (around line 91) and update the session handling logic to handle OAuth profile creation. Replace the session handling section with:

```typescript
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setAuth(session?.user ?? null, session);

        if (session?.user) {
          // Fetch profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile on auth change:', profileError);
          } else if (profile) {
            setProfile(profile);
            set({ pendingNickname: false });
          } else if (event === 'SIGNED_IN') {
            // No profile exists - this is OAuth sign-up
            // Generate and try to create profile
            const nickname = generateNickname(session.user);
            const created = await createProfileWithNickname(session.user.id, nickname);

            if (created) {
              // Profile created successfully, fetch it
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (newProfile) {
                setProfile(newProfile);
                set({ pendingNickname: false });
              }
            } else {
              // Nickname conflict - need user to choose
              set({ pendingNickname: true });
            }
          }
        } else {
          setProfile(null);
          set({ pendingNickname: false });
        }
      });
```

**Step 3: Verify changes**

```bash
cat app/store/authStore.ts | grep "generateNickname"
```

Expected: See generateNickname import and usage

**Step 4: Commit**

```bash
git add app/store/authStore.ts
git commit -m "feat: handle OAuth profile creation in auth store

- Auto-generate nickname on OAuth sign-up
- Detect nickname conflicts
- Set pendingNickname state for conflict resolution

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Update Auth Layout for Nickname Selection Flow

**Files:**
- Modify: `app/app/(auth)/_layout.tsx`

**Step 1: Read current auth layout**

```bash
cat app/app/\(auth\)/_layout.tsx
```

Expected: See current auth layout structure

**Step 2: Update layout to handle pendingNickname state**

The layout should check `pendingNickname` state and redirect to select-nickname screen when true. Update the component to check this state and handle navigation accordingly.

Add import:

```typescript
import { useAuthStore } from '../../store/authStore';
```

Add redirect logic for pendingNickname state in the component:

```typescript
  const { pendingNickname } = useAuthStore();

  useEffect(() => {
    if (pendingNickname) {
      router.replace('/(auth)/select-nickname');
    }
  }, [pendingNickname]);
```

**Step 3: Verify changes**

```bash
cat app/app/\(auth\)/_layout.tsx | grep "pendingNickname"
```

Expected: See pendingNickname usage

**Step 4: Commit**

```bash
git add app/app/\(auth\)/_layout.tsx
git commit -m "feat: handle nickname selection in auth layout

- Redirect to select-nickname when pendingNickname true
- Prevents bypassing nickname selection

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Configure Supabase OAuth Providers

**Files:**
- N/A (Supabase Dashboard configuration)

**Step 1: Document OAuth configuration requirements**

Create a document for manual Supabase configuration:

```bash
cat > docs/SUPABASE_OAUTH_SETUP.md << 'EOF'
# Supabase OAuth Configuration

This document describes how to configure Apple and Google OAuth providers in Supabase.

## Prerequisites

- Supabase project (local or hosted)
- Apple Developer Account (for Apple Sign-In)
- Google Cloud Project (for Google Sign-In)

## Apple Sign-In Configuration

### 1. Apple Developer Setup

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Create an App ID for Bonfire
   - Bundle ID: `com.bonfire.app` (matches app.json)
   - Enable "Sign In with Apple" capability
3. Create a Services ID
   - Identifier: `com.bonfire.app.service`
   - Enable "Sign In with Apple"
   - Configure Return URLs:
     - Development: `http://127.0.0.1:54321/auth/v1/callback`
     - Production: `https://your-project.supabase.co/auth/v1/callback`

### 2. Supabase Dashboard Setup

1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Apple provider
3. Enter Services ID: `com.bonfire.app.service`
4. Upload your Apple private key (.p8 file)
5. Enter Key ID and Team ID from Apple Developer portal
6. Save configuration

## Google Sign-In Configuration

### 1. Google Cloud Setup

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Configure OAuth consent screen
6. Create OAuth Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://127.0.0.1:54321/auth/v1/callback`
     - Production: `https://your-project.supabase.co/auth/v1/callback`
7. Note the Client ID and Client Secret

### 2. Supabase Dashboard Setup

1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Google provider
3. Enter Client ID and Client Secret from Google Cloud
4. Save configuration

## Account Linking Configuration

1. Go to Authentication > Settings in Supabase Dashboard
2. Under "Security and Protection"
3. Enable "Automatic account linking"
4. This allows users with same email across providers to link automatically

## Local Testing

For local development:
- Use Supabase CLI: `pnpm supabase start`
- OAuth redirect: `http://127.0.0.1:54321/auth/v1/callback`
- Mobile app redirect: `exp://127.0.0.1:8081/--/auth/callback`

## Production Deployment

Before deploying:
- Update OAuth redirect URLs in Apple/Google consoles
- Update Supabase production provider settings
- Test OAuth flows on physical devices
EOF
```

**Step 2: Verify documentation created**

```bash
cat docs/SUPABASE_OAUTH_SETUP.md | head -10
```

Expected: See OAuth setup documentation

**Step 3: Commit**

```bash
git add docs/SUPABASE_OAUTH_SETUP.md
git commit -m "docs: add Supabase OAuth configuration guide

- Apple Sign-In setup instructions
- Google Sign-In setup instructions
- Account linking configuration
- Local and production deployment notes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: Manual Testing Checklist

**Files:**
- N/A (Manual testing)

**Step 1: Test OAuth sign-up flows**

Before testing, ensure:
- Supabase OAuth providers are configured (see docs/SUPABASE_OAUTH_SETUP.md)
- Local Supabase is running: `pnpm supabase start`
- Expo dev server is running: `cd app && pnpm start`

Test scenarios:
1. Sign up with Apple (new user, unique nickname)
2. Sign up with Google (new user, unique nickname)
3. Sign up with Apple (nickname conflict) → select-nickname screen
4. Sign up with Google (nickname conflict) → select-nickname screen
5. Cancel OAuth flow → stays on sign-in screen

**Step 2: Test OAuth sign-in flows**

Test scenarios:
1. Sign in with Apple (existing user)
2. Sign in with Google (existing user)
3. Profile loads correctly after OAuth sign-in

**Step 3: Test account linking**

Test scenarios:
1. Email user signs in with Apple (same email) → accounts linked
2. Email user signs in with Google (same email) → accounts linked
3. Apple user signs in with Google (same email) → accounts linked
4. Sign out and sign in with different method → works

**Step 4: Test edge cases**

Test scenarios:
1. User with no name in provider profile → uses email prefix
2. Offline during OAuth → shows error
3. Invalid nickname in select-nickname → validation errors
4. Nickname taken in select-nickname → shows error

**Step 5: Document test results**

Create a test results file:

```bash
cat > docs/OAUTH_TEST_RESULTS.md << 'EOF'
# OAuth Integration Test Results

Date: [FILL IN]
Tester: [FILL IN]

## OAuth Sign-Up (New Users)

- [ ] Sign up with Apple - unique nickname auto-created
- [ ] Sign up with Google - unique nickname auto-created
- [ ] Sign up with Apple - nickname conflict, prompted to choose
- [ ] Sign up with Google - nickname conflict, prompted to choose
- [ ] Cancel OAuth flow - stays on sign-in screen
- [ ] Network error during OAuth - shows error, can retry

## OAuth Sign-In (Returning Users)

- [ ] Sign in with Apple - existing account recognized
- [ ] Sign in with Google - existing account recognized
- [ ] Profile loads correctly after OAuth sign-in

## Account Linking

- [ ] Email user signs in with Apple (same email) - accounts linked
- [ ] Email user signs in with Google (same email) - accounts linked
- [ ] Apple user signs in with Google (same email) - accounts linked
- [ ] User can sign in with any linked method afterward

## UI/UX

- [ ] OAuth buttons render correctly on iOS and Android
- [ ] Loading states show during OAuth flow
- [ ] Error messages are user-friendly
- [ ] Nickname selection screen validates input properly

## Edge Cases

- [ ] User with no name in Apple profile - uses email prefix
- [ ] Offline during OAuth - shows appropriate error
- [ ] Multiple rapid OAuth attempts - handled gracefully

## Notes

[Add any issues or observations here]
EOF
```

**Step 6: Commit test documentation**

```bash
git add docs/OAUTH_TEST_RESULTS.md
git commit -m "docs: add OAuth testing checklist

- Comprehensive test scenarios
- UI/UX verification
- Edge case coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

This implementation adds Apple and Google OAuth authentication to Bonfire with:

- OAuth helper functions using expo-auth-session
- Automatic nickname generation from provider data
- Nickname conflict resolution UI
- OAuth buttons on sign-in/sign-up screens
- Account linking support via Supabase
- Comprehensive error handling

**Next steps after implementation:**
1. Configure OAuth providers in Supabase Dashboard (see docs/SUPABASE_OAUTH_SETUP.md)
2. Test all OAuth flows (see docs/OAUTH_TEST_RESULTS.md)
3. Deploy and test on physical devices

**Total tasks:** 13
**Estimated time:** 2-3 hours
