# Bonfire - Project Memory

## Project Overview

Bonfire is a React Native mobile application built with Expo and Supabase. The app provides social authentication and user profiles with a focus on clean architecture and production-ready code.

## Tech Stack

- **Frontend:** React Native with TypeScript
- **Framework:** Expo with Expo Router (file-based routing)
- **Backend:** Supabase (Auth, Database, Storage)
- **State Management:** Zustand
- **Forms:** React Hook Form
- **UI Library:** gluestack-ui
- **Package Manager:** pnpm

## Architecture Patterns

### Authentication System

**Three authentication methods:**
1. Email/Password (original implementation)
2. Apple Sign-In (OAuth with PKCE)
3. Google Sign-In (OAuth with PKCE)

**Key features:**
- Automatic account linking when email matches across providers
- Profile creation with auto-generated nicknames from provider data
- Nickname conflict resolution flow (user selects alternative if auto-generated nickname is taken)
- Session persistence via Zustand store

**Implementation details:**
- OAuth helpers in `app/lib/supabase-oauth.ts` use expo-auth-session and expo-web-browser
- Profile utilities in `app/lib/profile-utils.ts` handle nickname generation and validation
- Auth store (`app/store/authStore.ts`) manages authentication state and profile creation
- Nickname selection screen (`app/app/(auth)/select-nickname.tsx`) handles conflicts

### File-Based Routing (Expo Router)

```
app/app/
├── _layout.tsx           # Root layout
├── (app)/               # Protected app routes (main screens)
│   └── _layout.tsx      # App layout with auth guard
└── (auth)/              # Authentication routes
    ├── _layout.tsx      # Auth layout (redirects to nickname selection if needed)
    ├── sign-in.tsx      # Sign-in screen with email + OAuth
    ├── sign-up.tsx      # Sign-up screen with email + OAuth
    └── select-nickname.tsx  # Nickname selection for OAuth conflicts
```

### Database Schema

**Profiles table:**
- `id` (uuid, references auth.users)
- `nickname` (text, unique, not null) - 3-20 chars, alphanumeric + underscores
- `avatar_url` (text, nullable)
- `created_at` / `updated_at` timestamps

**Authentication:**
- Supabase handles multiple OAuth identities per user
- Database trigger creates profiles on first sign-up
- Linked accounts share the same user ID and profile

### State Management

**Zustand stores:**
- `authStore.ts` - Authentication state, user session, profile data, OAuth state
  - `oauthLoading`: boolean - tracks OAuth flow loading
  - `pendingNickname`: boolean - triggers nickname selection screen

### Profile System

**Nickname generation priority:**
1. Full name from OAuth provider metadata (`user_metadata.full_name` or `user_metadata.name`)
2. Email prefix (before @)
3. Fallback: `user_${userId.slice(0, 8)}`

**Sanitization rules:**
- Lowercase only
- Spaces converted to underscores
- Only alphanumeric and underscores allowed
- Max 20 characters

**Conflict resolution:**
- On OAuth sign-up, if auto-generated nickname exists, `pendingNickname` flag is set
- Auth layout redirects to select-nickname screen
- User chooses alternative nickname with real-time availability check
- Profile updated, user proceeds to app

## Code Conventions

### Gluestack UI Patterns

**Always use gluestack-ui components:**
- Box/VStack/HStack for layout (never View)
- Text component with size/color props
- FormControl for all form fields with labels and errors
- Input + InputField for text inputs
- Button + ButtonText + ButtonSpinner for buttons
- Toast via useToast() hook (never Alert.alert)
- Spacing via `space` prop on VStack/HStack
- Styling via gluestack props (bg, p, m, etc.) - no StyleSheet

**Form pattern:**
```typescript
<FormControl isInvalid={!!errors.field}>
  <FormControlLabel>
    <FormControlLabelText>Label</FormControlLabelText>
  </FormControlLabel>
  <Controller render={...} />
  <FormControlError>
    <FormControlErrorText>{errors.field?.message}</FormControlErrorText>
  </FormControlError>
</FormControl>
```

**Toast pattern:**
```typescript
const toast = useToast();
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="error" variant="solid">
      <ToastTitle>Error</ToastTitle>
      <ToastDescription>{message}</ToastDescription>
    </Toast>
  ),
});
```

**Why gluestack-ui:**
- Consistent design system across the app
- Built-in accessibility
- Theme support
- Responsive utilities
- Type-safe component props

### TypeScript

- Strict mode enabled
- No `any` types - use proper types or branded types
- Concrete types preferred over interfaces for simple shapes
- Input validation on all exported functions

### Error Handling

- Console.error before throwing errors
- Provide context in error messages (include function/component name)
- Use Supabase error codes for specific handling (e.g., `23505` for unique constraint violations)
- Filter "User cancelled" OAuth errors - don't show as errors to users

### Component Patterns

- Functional components with TypeScript interfaces for props
- Default exports for screens/pages
- Named exports for reusable components
- Use gluestack-ui props for styling (no StyleSheet.create)
- Loading states and disabled states on interactive elements

### File Organization

```
app/
├── app/                 # Expo Router pages (screens)
├── components/          # Reusable UI components
├── lib/                # Utilities, helpers, Supabase client
├── store/              # Zustand state stores
└── package.json
```

## Development Workflow

### Local Development

1. **Start Supabase:** `pnpm supabase start` (local Docker instance)
2. **Start Expo:** `cd app && pnpm start`
3. **Run on device:** Scan QR with Expo Go or use simulator

### Database Changes

- All schema changes via migrations in `supabase/migrations/`
- Generate types after migrations: `pnpm supabase:types`
- Types exported to `shared/types/database.types.ts`

### Git Worktrees with Supabase

**Problem:** Supabase CLI initializes based on directory name, causing conflicts when using worktrees with custom names.

**Solution:** Always use `--workdir` flag with Supabase CLI commands to point to the project root containing `supabase/` directory.

**Project structure:**
```
bonfire/                          # Main git repository
├── .worktrees/                   # Worktrees directory (gitignored)
│   └── feature-name/             # Feature worktree
│       ├── supabase/             # Supabase config (lives here)
│       ├── app/                  # Expo app
│       └── package.json          # Scripts with --workdir flag
└── supabase/                     # Does NOT exist in main repo
```

**All package.json scripts use `--workdir .`:**
```json
{
  "scripts": {
    "supabase:start": "supabase start --workdir .",
    "supabase:stop": "supabase stop --workdir .",
    "supabase:reset": "supabase db reset --workdir .",
    "supabase:status": "supabase status --workdir .",
    "supabase:types": "supabase gen types typescript --local --workdir . > shared/types/supabase.ts"
  }
}
```

**Manual commands:**
```bash
# Always include --workdir . when in a worktree
supabase start --workdir .
supabase status --workdir .
supabase migration new my_migration --workdir .
```

**Best practices:**
1. Always use `--workdir` flag when working in worktrees
2. Use unique `project_id` in each worktree's `supabase/config.toml` to avoid Docker conflicts
3. Run commands from worktree root where `supabase/` directory exists
4. Use npm/pnpm scripts rather than direct CLI commands

**Troubleshooting:**
- "cannot read config" error means Supabase is looking in wrong directory - verify `--workdir .` flag
- Multiple Supabase instances running: stop all Docker containers and restart with correct flag

See `docs/SUPABASE_WORKTREE_SETUP.md` for full details.

### OAuth Configuration

- Requires manual setup in Supabase Dashboard (see `docs/SUPABASE_OAUTH_SETUP.md`)
- Apple: Needs Apple Developer account, App ID, Service ID
- Google: Needs Google Cloud project, OAuth 2.0 credentials
- Redirect URIs configured for local (127.0.0.1:54321) and production

## Testing

### Manual Testing

- Comprehensive checklist in `docs/OAUTH_TEST_RESULTS.md`
- Cover OAuth sign-up, sign-in, account linking, nickname conflicts, edge cases

### Test Before Deploying

- Email/password authentication still works
- OAuth flows complete successfully
- Nickname generation and conflict resolution
- Account linking with matching emails
- Profile creation and updates

## Important Notes

### Security

- OAuth uses PKCE (Proof Key for Code Exchange) for security
- All OAuth URLs validated before opening browser
- Input validation on all profile utility functions
- RLS (Row Level Security) policies on profiles table

### Performance

- Browser warmup via `WebBrowser.maybeCompleteAuthSession()` for faster OAuth
- Optimistic UI updates where possible
- Session persistence via Zustand

### Git Workflow

- Feature branches encouraged (can use worktrees, see `docs/SUPABASE_WORKTREE_SETUP.md`)
- Conventional commit messages (feat:, fix:, docs:, etc.)
- All commits include Claude Code attribution footer

## Documentation

- Design docs in `docs/plans/` (design + implementation)
- Setup guides in `docs/` (OAuth setup, worktree setup)
- Test checklists in `docs/` (OAuth test results)

## Common Tasks

### Add new auth method
1. Create helper in `app/lib/`
2. Update auth store with new state
3. Add UI buttons to sign-in/sign-up screens
4. Update auth layout if new flows needed

### Modify profile schema
1. Create migration in `supabase/migrations/`
2. Run `pnpm supabase reset` locally
3. Generate types: `pnpm supabase:types`
4. Update profile utilities in `app/lib/profile-utils.ts`

### Debug OAuth issues
1. Check Supabase Dashboard provider configuration
2. Verify redirect URIs match exactly
3. Check browser console for OAuth errors
4. Verify environment variables (`.env.local`)

## Current State

✅ Email/password authentication
✅ User profiles with nicknames and avatars
✅ Apple and Google OAuth authentication
✅ Automatic account linking
✅ Nickname conflict resolution
✅ Profile picture upload with auto-resize
✅ Protected routes with auth guards
✅ Session persistence

## Next Features

Consider adding:
- Social features (follow, posts, etc.)
- Push notifications
- Real-time messaging
- Search and discovery
