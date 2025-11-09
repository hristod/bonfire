# Bonfire - Initial Setup & Authentication Design

**Date:** 2025-11-09
**Status:** Approved
**Type:** Foundation / Initial Setup

## Overview

This design covers the initial setup for Bonfire, a mobile application built with React Native + Expo and Supabase backend. This first iteration establishes the foundation: project structure, authentication, and basic user profiles with nickname and avatar support.

## Tech Stack

- **Frontend:** React Native + Expo (with Expo Router)
- **Backend:** Supabase (Auth, Database, Storage)
- **Language:** TypeScript throughout
- **Package Manager:** pnpm with workspaces
- **State Management:** Zustand
- **UI Components:** gluestack-ui
- **Forms:** React Hook Form
- **Navigation:** Expo Router (stack-based)
- **Image Handling:** expo-image-picker + expo-image-manipulator

## Project Structure

```
bonfire/
├── app/                    # Expo React Native app
│   ├── app/               # Expo Router pages
│   │   ├── (auth)/       # Auth-related screens (login, signup)
│   │   ├── (app)/        # Main app screens (stack navigation)
│   │   └── _layout.tsx   # Root layout
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utilities and Supabase client
│   ├── store/            # Zustand stores
│   └── package.json
├── supabase/
│   ├── migrations/        # Database migrations
│   ├── seed.sql          # Seed data
│   └── config.toml       # Supabase config
├── shared/               # Shared TypeScript types
├── docs/
│   └── plans/            # Design documents
├── pnpm-workspace.yaml   # pnpm workspace config
└── package.json          # Root package.json
```

## Database Schema

### Profiles Table

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text unique not null,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);
```

### Database Trigger

A trigger automatically creates a profile row when a new user signs up via `auth.users` insert.

### Storage Bucket

**Bucket name:** `avatars`
**Type:** Private
**File size limit:** 5MB

**RLS Policies:**
- Authenticated users can read all avatars (to view other profiles)
- Users can only upload files named with their own user ID
- Users can delete their own avatar files

## Authentication Flow

### Sign-Up Flow

1. User enters email, password, and nickname
2. App calls `supabase.auth.signUp()`
3. Database trigger creates profile with nickname
4. Session stored in Zustand, user redirected to app
5. Email verification optional for MVP

### Sign-In Flow

1. User enters email and password
2. App calls `supabase.auth.signInWithPassword()`
3. Session stored in Zustand, user redirected to app

### Navigation Structure

**Unauthenticated state** (`/app/(auth)/`):
- `sign-in.tsx` - Email/password login form
- `sign-up.tsx` - Email/password registration + nickname selection

**Authenticated state** (`/app/(app)/`):
- `index.tsx` - Home/main screen
- `profile.tsx` - View and edit profile (nickname, avatar)

**Root layout** (`_layout.tsx`):
- Checks authentication state on app load using `onAuthStateChange`
- Stores user session in Zustand
- Redirects based on auth state
- Shows loading screen during auth check

## Profile Picture Upload

### Image Selection & Processing

1. User taps on avatar or "Add Photo" button
2. `expo-image-picker` launches with camera/library options
3. Selected image is resized/compressed with `expo-image-manipulator`:
   - Max dimensions: 512x512px
   - Quality: 0.8
   - Format: JPEG

### Upload Flow

1. Generate unique filename: `{user_id}_{timestamp}.jpg`
2. Upload to `avatars` bucket
3. Get public URL (requires auth token for private bucket)
4. Update `profiles.avatar_url` with new URL
5. Delete old avatar file if exists

### UI Optimizations

- Show loading indicator during upload
- Local preview before upload completes
- Handle errors gracefully

## State Management

### Auth Store (`store/authStore.ts`)

```typescript
interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}
```

Holds current user, session, and profile data.

### Profile Store (`store/profileStore.ts`)

```typescript
interface ProfileStore {
  isUploading: boolean;
  uploadProgress: number;
  setUploading: (uploading: boolean) => void;
  setProgress: (progress: number) => void;
}
```

Manages profile editing UI state and upload progress.

## Form Validation

### Sign-Up Form

- Email: Valid email format, required
- Password: Min 8 characters, required
- Nickname: 3-20 characters, alphanumeric + underscores, required, unique

### Sign-In Form

- Email: Valid email format, required
- Password: Required

### Profile Edit Form

- Nickname: Same validation as sign-up

## Error Handling

### Supabase Errors

- Auth errors → User-friendly message below form
- Network errors → Toast: "Connection issue, please try again"
- Rate limiting → "Too many attempts, please wait"

### Image Upload Errors

- File too large → "Image must be under 5MB"
- Upload failed → "Upload failed, please try again"
- Permission denied → "Unable to upload image"

### General Pattern

- Toast notifications for transient errors
- Inline errors for form validation
- Detailed errors logged to console
- Never expose raw Supabase errors to users

## Development Workflow

### Environment Setup

**Local Development:**
- `.env.local` with localhost Supabase URLs
- All development against local Supabase instance
- Run `pnpm supabase start` for local backend

**Production (deployment ready, not used during MVP):**
- `.env.production` with hosted Supabase URLs
- Migrations pushed via `pnpm supabase db push`
- App deployed with EAS Build

### Initial Setup Steps

1. Initialize Expo app with TypeScript template
2. Set up Supabase CLI and initialize local instance
3. Configure pnpm workspaces in `pnpm-workspace.yaml`
4. Install dependencies
5. Create Supabase client with environment variables

### Development Commands

```bash
pnpm supabase start       # Start local Supabase
pnpm supabase db reset    # Run migrations
cd app && pnpm expo start # Start Expo dev server
pnpm supabase gen types typescript  # Generate types from schema
```

## Testing

### Manual Testing Checklist

- Sign up with valid/invalid data
- Sign in with correct/incorrect credentials
- Upload profile picture (small and large files)
- Edit nickname
- Sign out and sign back in (session persistence)
- Test offline behavior

### Future Testing

- Jest + React Native Testing Library for components
- E2E tests with Detox as app grows

## Success Criteria

This initial iteration is complete when:

- Project structure is set up (monorepo, workspaces, TypeScript)
- Local Supabase is running with auth + profiles + storage
- Users can sign up, sign in, and edit profile locally
- Foundation is ready for building additional features

## Future Considerations

This is the foundation for Bonfire. Additional features will be built on top of this setup in future iterations.
