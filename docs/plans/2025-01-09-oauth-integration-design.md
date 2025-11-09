# Bonfire - OAuth Integration Design

**Date:** 2025-01-09
**Status:** Approved
**Type:** Feature Addition

## Overview

Add Apple Sign-In and Google Sign-In to Bonfire alongside existing email/password authentication. All three methods will be available on both iOS and Android platforms, with automatic account linking for users who authenticate with the same email across different providers.

## Goals

- Provide faster onboarding through social authentication
- Support all three authentication methods on both platforms
- Auto-link accounts when email addresses match
- Maintain consistent user experience across sign-in methods
- No breaking changes to existing email/password flow

## Design Decisions

### Authentication Methods
- Apple Sign-In (iOS and Android)
- Google Sign-In (iOS and Android)
- Email/Password (existing, unchanged)

### Account Linking Strategy
**Auto-link accounts with matching emails** - Supabase automatically links OAuth identities to existing users when email matches, allowing users to sign in with any method.

### Profile Creation
**Auto-create with provider info** - Use name from Apple/Google (or email prefix if unavailable) for nickname. If nickname conflict occurs, prompt user to choose a different one.

### Avatar Handling
**Don't auto-import** - Leave avatar blank for OAuth users. They can upload their own through profile settings.

### UI Layout
**Social buttons on top** - Emphasize Apple and Google buttons at top of sign-in screen, with email/password form below a divider.

## Architecture

### Dependencies

```json
{
  "expo-auth-session": "~5.x",
  "expo-crypto": "~13.x",
  "expo-web-browser": "~13.x"
}
```

### Expo Configuration

```json
{
  "expo": {
    "scheme": "bonfire",
    "ios": {
      "bundleIdentifier": "com.yourcompany.bonfire",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.yourcompany.bonfire"
    }
  }
}
```

### Supabase Configuration

**Providers to Enable:**
- Apple provider (requires Apple Developer account, App ID, Service ID)
- Google provider (requires Google Cloud project, OAuth 2.0 credentials)

**Redirect URLs:**
- Development: `exp://127.0.0.1:8081/--/(auth)/callback`
- Production: `bonfire://(auth)/callback`

**Account Linking:**
- Enable automatic linking in Supabase Auth settings
- When OAuth email matches existing user, link identity automatically
- Existing profile remains unchanged

### Database Schema

No schema changes needed. Existing `profiles` table and trigger work as-is:
- `auth.users` handles multiple identities (Supabase built-in)
- Profile trigger creates profile on first sign-up
- Linked accounts share same user ID and profile

## Authentication Flows

### Sign-Up Flow (New User with OAuth)

1. User taps "Continue with Apple" or "Continue with Google"
2. `AuthSession` opens provider's OAuth flow
3. User authenticates and grants permissions
4. Provider redirects with authorization code
5. Supabase exchanges code for session, creates `auth.users` entry
6. Database trigger creates profile entry
7. App generates nickname and checks uniqueness:
   - **If unique:** Profile creation complete, redirect to app
   - **If conflict:** Show nickname selection screen, update profile, redirect
8. Session stored in Zustand

### Auto-Generated Nickname Logic

Priority order:
1. Full name from provider (sanitized: lowercase, spaces→underscores, alphanumeric only)
2. Email prefix if no name provided
3. Check uniqueness in `profiles` table
4. If taken, show nickname selection screen

### Sign-In Flow (Returning User)

1. User taps OAuth button
2. OAuth flow completes
3. Supabase recognizes existing user, returns session
4. App loads profile from database
5. Redirect to app

### Account Linking Flow

1. User with existing account (any method) signs in with OAuth using same email
2. Supabase auto-links OAuth identity to existing user
3. Returns session for existing account
4. Profile unchanged
5. User can now sign in with any linked method

## UI Components

### Sign-In Screen (`app/(auth)/sign-in.tsx`)

```
┌─────────────────────────────────┐
│   Continue with Apple  (black) │
│   Continue with Google (white) │
│                                 │
│   ────── or continue with ──────│
│                                 │
│   Email: [____________]         │
│   Password: [____________]      │
│   [Sign In Button]              │
│                                 │
│   Don't have an account? Sign up│
└─────────────────────────────────┘
```

### Sign-Up Screen (`app/(auth)/sign-up.tsx`)

Same layout with nickname field for email signups:
- Apple/Google buttons at top
- Divider
- Email, Password, Nickname fields
- Sign up button

### Nickname Selection Screen (`app/(auth)/select-nickname.tsx`)

Only shown when OAuth auto-generated nickname conflicts:

```
┌─────────────────────────────────┐
│   Choose Your Nickname          │
│                                 │
│   The nickname "john_smith"     │
│   is already taken.             │
│                                 │
│   Nickname: [____________]      │
│   (3-20 characters)             │
│                                 │
│   [Continue Button]             │
└─────────────────────────────────┘
```

### Reusable Components

**OAuthButton Component:**
- Props: `provider: 'apple' | 'google'`, `onPress`, `loading`
- Apple: Black background, white text, Apple icon
- Google: White background, Google logo, standard styling
- Handles platform-specific styling differences

## Implementation Files

### New Files

**`app/lib/supabase-oauth.ts`** - OAuth flow utilities
- `signInWithApple()` - Initiates Apple OAuth with PKCE
- `signInWithGoogle()` - Initiates Google OAuth with PKCE
- `handleOAuthCallback()` - Processes redirect, exchanges code
- Uses `AuthSession.useAuthRequest()` for session management

**`app/lib/profile-utils.ts`** - Profile creation utilities
- `generateNickname(user: User): string` - Generate from provider data
- `isNicknameAvailable(nickname: string): Promise<boolean>` - Check uniqueness
- `handleOAuthProfile(user: User): Promise<void>` - Create/update after OAuth

**`app/components/OAuthButton.tsx`** - Reusable OAuth button
- Platform-specific styling
- Loading states
- Icon rendering

**`app/app/(auth)/select-nickname.tsx`** - Nickname selection screen
- Form with validation
- Error handling
- Navigation after successful save

**`app/app/(auth)/callback.tsx`** - OAuth redirect handler
- Receives OAuth callback
- Exchanges code for session
- Handles errors

### Modified Files

**`app/app/(auth)/sign-in.tsx`**
- Add OAuth buttons at top
- Add divider
- Keep existing email/password form

**`app/app/(auth)/sign-up.tsx`**
- Same OAuth button additions
- Keep existing form

**`app/store/authStore.ts`**
- Add `oauthLoading: boolean`
- Add `pendingNickname: boolean`
- Add `setOAuthLoading(loading: boolean)`
- Add `setPendingNickname(pending: boolean)`
- Add `handleOAuthSignIn(provider: 'apple' | 'google'): Promise<void>`

## Error Handling

### OAuth Flow Errors

- **User cancels:** Silent failure, stay on sign-in screen
- **Network timeout:** Toast "Connection failed, please try again"
- **Invalid credentials:** Toast "Authentication failed"
- **Provider unavailable:** Toast "Service temporarily unavailable"

### Account Linking Errors

- **Email exists, linking disabled:** Toast "Account with this email already exists. Please sign in with email."
- **Profile creation fails:** Toast "Unable to create profile, please try again"

### Nickname Selection Errors

- **Nickname taken:** Inline error "This nickname is already taken"
- **Invalid format:** Inline error "3-20 characters, letters, numbers, underscores only"
- **Network error during save:** Toast "Unable to save, please try again"

### General Pattern

- All OAuth errors logged with full details to console
- Users see friendly messages only
- Retry mechanism for transient network failures
- Never expose raw provider errors to users

## State Management

### Navigation Flow

- `pendingNickname: true` → Show nickname selection screen
- `pendingNickname: false` + `session` → Redirect to app
- Prevents bypassing nickname selection

### Auth Store State

```typescript
interface AuthStore {
  // Existing
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  // New OAuth
  oauthLoading: boolean;
  pendingNickname: boolean;

  // Actions
  setOAuthLoading: (loading: boolean) => void;
  setPendingNickname: (pending: boolean) => void;
  handleOAuthSignIn: (provider: 'apple' | 'google') => Promise<void>;
}
```

## Testing Checklist

### OAuth Sign-Up (New Users)

- [ ] Sign up with Apple - unique nickname auto-created
- [ ] Sign up with Google - unique nickname auto-created
- [ ] Sign up with Apple - nickname conflict, prompted to choose
- [ ] Sign up with Google - nickname conflict, prompted to choose
- [ ] Cancel OAuth flow - stays on sign-in screen
- [ ] Network error during OAuth - shows error, can retry

### OAuth Sign-In (Returning Users)

- [ ] Sign in with Apple - existing account recognized
- [ ] Sign in with Google - existing account recognized
- [ ] Profile loads correctly after OAuth sign-in

### Account Linking

- [ ] Email user signs in with Apple (same email) - accounts linked
- [ ] Email user signs in with Google (same email) - accounts linked
- [ ] Apple user signs in with Google (same email) - accounts linked
- [ ] User can sign in with any linked method afterward

### UI/UX

- [ ] OAuth buttons render correctly on iOS and Android
- [ ] Loading states show during OAuth flow
- [ ] Error messages are user-friendly
- [ ] Nickname selection screen validates input properly

### Edge Cases

- [ ] User with no name in Apple profile - uses email prefix
- [ ] Offline during OAuth - shows appropriate error
- [ ] Multiple rapid OAuth attempts - handled gracefully

## Success Criteria

This feature is complete when:

- [ ] Apple and Google sign-in work on both iOS and Android
- [ ] Account linking works automatically for matching emails
- [ ] OAuth users get auto-generated nicknames with conflict resolution
- [ ] All three authentication methods coexist without issues
- [ ] Error handling provides clear, user-friendly messages
- [ ] All testing checklist items pass

## Future Considerations

- Add more OAuth providers (Facebook, Twitter, etc.)
- Allow users to unlink authentication methods
- Show connected accounts in profile settings
- Add email verification requirement for OAuth accounts
