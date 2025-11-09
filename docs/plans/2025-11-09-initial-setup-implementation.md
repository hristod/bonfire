# Bonfire Initial Setup & Authentication - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Bonfire mobile app foundation with Expo, Supabase backend, authentication, and basic user profiles.

**Architecture:** Monorepo with pnpm workspaces containing Expo React Native app and Supabase configuration. Local Supabase for development, TypeScript throughout, Expo Router for navigation.

**Tech Stack:** React Native, Expo, Supabase, TypeScript, pnpm, Zustand, gluestack-ui, React Hook Form, expo-image-picker

---

## Task 1: Initialize Root Project Structure

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`

**Step 1: Create root package.json**

```bash
cd /Users/hristodimitrov/projects/bonfire/.worktrees/initial-setup
```

Create `package.json`:

```json
{
  "name": "bonfire",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:types": "supabase gen types typescript --local > shared/types/database.types.ts",
    "app:start": "cd app && pnpm expo start",
    "app:ios": "cd app && pnpm expo start --ios",
    "app:android": "cd app && pnpm expo start --android"
  },
  "devDependencies": {
    "supabase": "^1.200.3"
  }
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'app'
  - 'shared'
```

**Step 3: Create .npmrc**

```
node-linker=hoisted
```

**Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml .npmrc
git commit -m "chore: initialize root project with pnpm workspaces"
```

---

## Task 2: Initialize Supabase

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/`

**Step 1: Install Supabase CLI**

```bash
pnpm install
```

Expected: Installs Supabase CLI as dev dependency

**Step 2: Initialize Supabase**

```bash
pnpm supabase init
```

Expected: Creates `supabase/` directory with config files

**Step 3: Verify Supabase can start**

```bash
pnpm supabase start
```

Expected: Downloads Docker images and starts local Supabase (this may take a few minutes first time)

**Step 4: Note credentials**

The `supabase start` command outputs important credentials:
- API URL (http://localhost:54321)
- anon key
- service_role key

Save these for later use.

**Step 5: Stop Supabase for now**

```bash
pnpm supabase stop
```

**Step 6: Commit**

```bash
git add supabase/
git commit -m "chore: initialize Supabase local development"
```

---

## Task 3: Create Database Migration for Profiles

**Files:**
- Create: `supabase/migrations/20251109000001_create_profiles.sql`

**Step 1: Create migration file**

```bash
pnpm supabase migration new create_profiles
```

This creates a timestamped migration file in `supabase/migrations/`

**Step 2: Add profiles table and policies**

Edit the created migration file:

```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text unique not null,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policies: Anyone can view profiles
create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data->>'nickname');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add profiles table with RLS and auto-creation trigger"
```

---

## Task 4: Create Storage Bucket Migration

**Files:**
- Create: `supabase/migrations/20251109000002_create_avatars_bucket.sql`

**Step 1: Create migration file**

```bash
pnpm supabase migration new create_avatars_bucket
```

**Step 2: Add storage bucket and policies**

Edit the created migration file:

```sql
-- Create avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false);

-- Allow authenticated users to read all avatars
create policy "Authenticated users can view avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

-- Allow users to upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Step 3: Test migrations**

```bash
pnpm supabase start
pnpm supabase db reset
```

Expected: Migrations apply successfully, profiles table and avatars bucket created

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add avatars storage bucket with RLS policies"
```

---

## Task 5: Initialize Expo App

**Files:**
- Create: `app/` directory with Expo project

**Step 1: Create Expo app**

```bash
pnpm create expo-app app --template expo-template-blank-typescript
```

Expected: Creates `app/` directory with TypeScript Expo project

**Step 2: Navigate to app directory**

```bash
cd app
```

**Step 3: Install Expo Router dependencies**

```bash
pnpm add expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

**Step 4: Update app.json for Expo Router**

Edit `app/app.json`:

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
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.bonfire.app"
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

**Step 5: Update package.json**

Edit `app/package.json` and update the `main` field:

```json
{
  "main": "expo-router/entry"
}
```

**Step 6: Commit**

```bash
cd ..
git add app/
git commit -m "chore: initialize Expo app with TypeScript and Expo Router"
```

---

## Task 6: Install App Dependencies

**Files:**
- Modify: `app/package.json`

**Step 1: Install Supabase client**

```bash
cd app
pnpm add @supabase/supabase-js
```

**Step 2: Install async storage for Supabase**

```bash
pnpm add @react-native-async-storage/async-storage
```

**Step 3: Install Zustand**

```bash
pnpm add zustand
```

**Step 4: Install React Hook Form**

```bash
pnpm add react-hook-form
```

**Step 5: Install gluestack-ui**

```bash
pnpm add @gluestack-ui/themed @gluestack-style/react react-native-svg
```

**Step 6: Install image picker and manipulator**

```bash
pnpm add expo-image-picker expo-image-manipulator
```

**Step 7: Install environment variables support**

```bash
pnpm add expo-constants
```

**Step 8: Commit**

```bash
cd ..
git add app/package.json app/pnpm-lock.yaml
git commit -m "chore: install app dependencies"
```

---

## Task 7: Create Shared Types Package

**Files:**
- Create: `shared/package.json`
- Create: `shared/types/database.types.ts`
- Create: `shared/types/index.ts`

**Step 1: Create shared directory**

```bash
mkdir -p shared/types
```

**Step 2: Create shared/package.json**

```json
{
  "name": "@bonfire/shared",
  "version": "0.1.0",
  "main": "types/index.ts",
  "types": "types/index.ts"
}
```

**Step 3: Generate database types**

```bash
pnpm supabase gen types typescript --local > shared/types/database.types.ts
```

Expected: Creates TypeScript types from database schema

**Step 4: Create shared/types/index.ts**

```typescript
export * from './database.types';

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: create shared types package with database types"
```

---

## Task 8: Configure Environment Variables

**Files:**
- Create: `app/.env.local`
- Create: `app/.env.production`
- Modify: `.gitignore`

**Step 1: Update .gitignore**

Add to `.gitignore`:

```
# Environment files
app/.env.local
app/.env.production

# Supabase
supabase/.branches
supabase/.temp
```

**Step 2: Create app/.env.local template**

Get the credentials from `pnpm supabase status`:

```bash
pnpm supabase status
```

Create `app/.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-anon-key-here` with the actual anon key from `supabase status`.

**Step 3: Create app/.env.production template**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

**Step 4: Commit gitignore only**

```bash
git add .gitignore
git commit -m "chore: add environment files to gitignore"
```

Note: `.env.local` should NOT be committed (contains actual credentials)

---

## Task 9: Create Supabase Client

**Files:**
- Create: `app/lib/supabase.ts`

**Step 1: Create lib directory**

```bash
mkdir -p app/lib
```

**Step 2: Create Supabase client**

Create `app/lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Step 3: Update app.config.js**

Create `app/app.config.js` to expose env vars:

```javascript
module.exports = {
  expo: {
    name: 'Bonfire',
    slug: 'bonfire',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bonfire.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.bonfire.app'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: ['expo-router'],
    scheme: 'bonfire',
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
};
```

**Step 4: Install URL polyfill**

```bash
cd app
pnpm add react-native-url-polyfill
```

**Step 5: Commit**

```bash
cd ..
git add app/lib/supabase.ts app/app.config.js app/package.json
git commit -m "feat: create Supabase client configuration"
```

---

## Task 10: Create Auth Store

**Files:**
- Create: `app/store/authStore.ts`

**Step 1: Create store directory**

```bash
mkdir -p app/store
```

**Step 2: Create auth store**

Create `app/store/authStore.ts`:

```typescript
import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@bonfire/shared';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setAuth: (user, session) => set({ user, session }),

  setProfile: (profile) => set({ profile }),

  setLoading: (loading) => set({ loading }),

  setInitialized: (initialized) => set({ initialized }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  initialize: async () => {
    const { setAuth, setProfile, setLoading, setInitialized } = get();

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setAuth(session.user, session);

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setProfile(profile);
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        setAuth(session?.user ?? null, session);

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setProfile(profile);
          }
        } else {
          setProfile(null);
        }
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  },
}));
```

**Step 3: Commit**

```bash
git add app/store/
git commit -m "feat: create auth store with Zustand"
```

---

## Task 11: Create Profile Store

**Files:**
- Create: `app/store/profileStore.ts`

**Step 1: Create profile store**

Create `app/store/profileStore.ts`:

```typescript
import { create } from 'zustand';

interface ProfileStore {
  isUploading: boolean;
  uploadProgress: number;
  setUploading: (uploading: boolean) => void;
  setProgress: (progress: number) => void;
  resetProgress: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  isUploading: false,
  uploadProgress: 0,

  setUploading: (uploading) => set({ isUploading: uploading }),

  setProgress: (progress) => set({ uploadProgress: progress }),

  resetProgress: () => set({ uploadProgress: 0, isUploading: false }),
}));
```

**Step 2: Commit**

```bash
git add app/store/profileStore.ts
git commit -m "feat: create profile store for upload state"
```

---

## Task 12: Setup Expo Router Directory Structure

**Files:**
- Create: `app/app/_layout.tsx`
- Create: `app/app/(auth)/_layout.tsx`
- Create: `app/app/(app)/_layout.tsx`
- Remove: `app/App.tsx` (if exists)

**Step 1: Create app directory**

```bash
mkdir -p app/app
mkdir -p app/app/\(auth\)
mkdir -p app/app/\(app\)
```

**Step 2: Create root layout**

Create `app/app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to app if authenticated
      router.replace('/(app)');
    }
  }, [user, initialized, loading, segments]);

  if (!initialized || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GluestackUIProvider config={config}>
      <Slot />
    </GluestackUIProvider>
  );
}
```

**Step 3: Create auth layout**

Create `app/app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
```

**Step 4: Create app layout**

Create `app/app/(app)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    />
  );
}
```

**Step 5: Remove old App.tsx if exists**

```bash
rm -f app/App.tsx
```

**Step 6: Commit**

```bash
git add app/app/
git commit -m "feat: setup Expo Router with auth-protected navigation"
```

---

## Task 13: Create Sign Up Screen

**Files:**
- Create: `app/app/(auth)/sign-up.tsx`

**Step 1: Create sign up screen**

Create `app/app/(auth)/sign-up.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';

interface SignUpForm {
  email: string;
  password: string;
  nickname: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignUpForm>();

  const onSignUp = async (data: SignUpForm) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nickname: data.nickname,
          },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <Controller
        control={control}
        name="email"
        rules={{
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email && (
              <Text style={styles.error}>{errors.email.message}</Text>
            )}
          </View>
        )}
      />

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
            message: 'Nickname must be less than 20 characters',
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
            />
            {errors.nickname && (
              <Text style={styles.error}>{errors.nickname.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
            />
            {errors.password && (
              <Text style={styles.error}>{errors.password.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSignUp)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
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
  link: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 15,
  },
});
```

**Step 2: Commit**

```bash
git add app/app/\(auth\)/sign-up.tsx
git commit -m "feat: create sign up screen with validation"
```

---

## Task 14: Create Sign In Screen

**Files:**
- Create: `app/app/(auth)/sign-in.tsx`

**Step 1: Create sign in screen**

Create `app/app/(auth)/sign-in.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';

interface SignInForm {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<SignInForm>();

  const onSignIn = async (data: SignInForm) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        Alert.alert('Error', error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <Controller
        control={control}
        name="email"
        rules={{
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email && (
              <Text style={styles.error}>{errors.email.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{
          required: 'Password is required',
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
            />
            {errors.password && (
              <Text style={styles.error}>{errors.password.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSignIn)}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
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
  link: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 15,
  },
});
```

**Step 2: Commit**

```bash
git add app/app/\(auth\)/sign-in.tsx
git commit -m "feat: create sign in screen with validation"
```

---

## Task 15: Create Home Screen

**Files:**
- Create: `app/app/(app)/index.tsx`

**Step 1: Create home screen**

Create `app/app/(app)/index.tsx`:

```typescript
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {profile?.nickname}!</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(app)/profile')}
      >
        <Text style={styles.buttonText}>View Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.signOutButton]}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginTop: 10,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add app/app/\(app\)/index.tsx
git commit -m "feat: create home screen with profile navigation"
```

---

## Task 16: Create Profile Screen with Image Upload

**Files:**
- Create: `app/app/(app)/profile.tsx`
- Create: `app/lib/uploadAvatar.ts`

**Step 1: Create avatar upload utility**

Create `app/lib/uploadAvatar.ts`:

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export async function pickAndUploadAvatar(
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    onProgress?.(0.3);

    // Resize and compress image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 512, height: 512 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    onProgress?.(0.6);

    // Convert to base64 for upload
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];

          // Generate filename
          const filename = `${userId}/${Date.now()}.jpg`;

          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filename, decode(base64Data), {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (error) {
            throw error;
          }

          onProgress?.(1);

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filename);

          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}
```

**Step 2: Install base64-arraybuffer**

```bash
cd app
pnpm add base64-arraybuffer
```

**Step 3: Create profile screen**

Create `app/app/(app)/profile.tsx`:

```typescript
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { supabase } from '../../lib/supabase';
import { pickAndUploadAvatar } from '../../lib/uploadAvatar';

interface ProfileForm {
  nickname: string;
}

export default function ProfileScreen() {
  const { profile, user, setProfile } = useAuthStore();
  const { isUploading, uploadProgress, setUploading, setProgress, resetProgress } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      nickname: profile?.nickname || '',
    },
  });

  const onSave = async (data: ProfileForm) => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: data.nickname })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Update local state
      if (profile) {
        setProfile({ ...profile, nickname: data.nickname });
      }

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    if (!user) return;

    setUploading(true);
    resetProgress();

    try {
      const avatarUrl = await pickAndUploadAvatar(user.id, setProgress);

      if (avatarUrl) {
        // Update profile with new avatar URL
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (error) {
          throw error;
        }

        // Update local state
        if (profile) {
          setProfile({ ...profile, avatar_url: avatarUrl });
        }

        Alert.alert('Success', 'Avatar updated successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload avatar');
      console.error(error);
    } finally {
      resetProgress();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <TouchableOpacity onPress={handlePickImage} disabled={isUploading}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {profile?.nickname?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="white" />
              <Text style={styles.uploadingText}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

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
            message: 'Nickname must be less than 20 characters',
          },
          pattern: {
            value: /^[a-zA-Z0-9_]+$/,
            message: 'Nickname can only contain letters, numbers, and underscores',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              style={styles.input}
              placeholder="Nickname"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
            />
            {errors.nickname && (
              <Text style={styles.error}>{errors.nickname.message}</Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, (saving || isUploading) && styles.buttonDisabled]}
        onPress={handleSubmit(onSave)}
        disabled={saving || isUploading}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    marginTop: 5,
    fontWeight: '600',
  },
  changePhotoText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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

**Step 4: Commit**

```bash
cd ..
git add app/lib/uploadAvatar.ts app/app/\(app\)/profile.tsx app/package.json
git commit -m "feat: create profile screen with avatar upload"
```

---

## Task 17: Test the Application

**Files:**
- None (manual testing)

**Step 1: Start Supabase**

```bash
pnpm supabase start
```

Wait for Supabase to start completely.

**Step 2: Start Expo**

```bash
cd app
pnpm expo start
```

**Step 3: Manual testing checklist**

Test the following flows:

1. **Sign Up Flow:**
   - Open app, should redirect to sign-in
   - Navigate to sign-up
   - Try invalid email → should show error
   - Try short password → should show error
   - Try invalid nickname → should show error
   - Sign up with valid data → should create account and redirect to home

2. **Sign In Flow:**
   - Sign out from home screen
   - Try invalid credentials → should show error
   - Sign in with valid credentials → should redirect to home

3. **Profile Flow:**
   - Navigate to profile from home
   - Try to change nickname to invalid value → should show error
   - Change nickname to valid value → should save successfully
   - Upload avatar image → should show progress and update

4. **Session Persistence:**
   - Close and reopen app → should remain logged in
   - Check home screen shows correct nickname

**Step 4: Document results**

Create a test results file if issues found, otherwise proceed.

**Step 5: Stop Supabase when done**

```bash
pnpm supabase stop
```

---

## Task 18: Create README Documentation

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Update `README.md`:

```markdown
# Bonfire

A mobile application built with React Native, Expo, and Supabase.

## Tech Stack

- **Frontend:** React Native + Expo (TypeScript)
- **Backend:** Supabase (Auth, Database, Storage)
- **Navigation:** Expo Router
- **State Management:** Zustand
- **UI:** gluestack-ui
- **Forms:** React Hook Form

## Project Structure

```
bonfire/
├── app/                    # Expo React Native app
│   ├── app/               # Expo Router pages
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utilities and Supabase client
│   └── store/            # Zustand stores
├── supabase/              # Supabase configuration
│   └── migrations/        # Database migrations
├── shared/                # Shared TypeScript types
└── docs/                  # Documentation and plans
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local Supabase)
- Expo Go app on your phone, or iOS Simulator/Android Emulator

### Setup

1. **Install dependencies:**

```bash
pnpm install
```

2. **Set up environment variables:**

Create `app/.env.local` with your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get the anon key by running `pnpm supabase status` after starting Supabase.

3. **Start local Supabase:**

```bash
pnpm supabase start
```

First time will take several minutes to download Docker images.

4. **Start Expo development server:**

```bash
pnpm app:start
```

Then scan the QR code with Expo Go app (iOS/Android) or press 'i' for iOS simulator or 'a' for Android emulator.

## Available Scripts

```bash
pnpm supabase:start      # Start local Supabase
pnpm supabase:stop       # Stop local Supabase
pnpm supabase:reset      # Reset database and run migrations
pnpm supabase:types      # Generate TypeScript types from database

pnpm app:start           # Start Expo development server
pnpm app:ios             # Start on iOS simulator
pnpm app:android         # Start on Android emulator
```

## Features

- ✅ Email/password authentication
- ✅ User profiles with nickname
- ✅ Profile picture upload with auto-resize
- ✅ Protected routes with automatic redirect
- ✅ Session persistence

## Development

- All development happens against local Supabase instance
- Database changes should be made via migrations in `supabase/migrations/`
- Generate types after schema changes: `pnpm supabase:types`

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with setup instructions"
```

---

## Completion

Once all tasks are complete:

1. Verify all tests pass
2. Ensure Supabase migrations are working
3. Test authentication flow end-to-end
4. Verify profile picture upload works
5. Test session persistence

The foundation is ready for building additional features!
