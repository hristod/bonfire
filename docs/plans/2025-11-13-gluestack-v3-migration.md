# Gluestack UI v3 + NativeWind Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from Gluestack UI v1 to v3 with NativeWind/Tailwind CSS, maintaining all functionality while improving mobile-native UX.

**Architecture:** Replace bundled Gluestack v1 components with copy-pasteable v3 components using Tailwind CSS via NativeWind. Keep Expo SDK 54 and React Native 0.81.5 stable. Migrate screen-by-screen with testing between each.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, NativeWind v4, Tailwind CSS v3.4, Gluestack UI v3

---

## Task 1: Create Isolated Worktree

**Files:**
- Create: `.worktrees/gluestack-v3-migration/` (directory)
- Modify: `supabase/config.toml` (in worktree)

**Step 1: Create worktree from main branch**

```bash
cd /Users/hristodimitrov/projects/bonfire
git worktree add .worktrees/gluestack-v3-migration main
```

Expected: Worktree created successfully

**Step 2: Navigate to worktree**

```bash
cd .worktrees/gluestack-v3-migration
```

Expected: In worktree directory

**Step 3: Update Supabase project ID to avoid conflicts**

Open `supabase/config.toml` and change:
```toml
project_id = "bonfire-gluestack-v3"
```

**Step 4: Verify worktree is clean**

```bash
git status
```

Expected: On branch main, no uncommitted changes

**Step 5: Commit Supabase config change**

```bash
git add supabase/config.toml
git commit -m "chore: update Supabase project ID for worktree

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Install NativeWind and Tailwind CSS

**Files:**
- Modify: `app/package.json` (dependencies)

**Step 1: Navigate to app directory**

```bash
cd app
```

**Step 2: Install NativeWind**

```bash
pnpm add nativewind@^4.0.36
```

Expected: nativewind installed successfully

**Step 3: Install Tailwind CSS as dev dependency**

```bash
pnpm add -D tailwindcss@^3.4.1
```

Expected: tailwindcss installed successfully

**Step 4: Verify installations**

```bash
pnpm list nativewind tailwindcss
```

Expected: Both packages listed with correct versions

**Step 5: Commit dependency changes**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add NativeWind and Tailwind CSS dependencies

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create Tailwind Configuration

**Files:**
- Create: `app/tailwind.config.js`
- Create: `app/global.css`

**Step 1: Create tailwind.config.js**

Create `app/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./ui/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        background: {
          light: '#FFFFFF',
          dark: '#111827',
        },
        typography: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        success: {
          500: '#10B981',
        },
      },
    },
  },
  plugins: [],
}
```

**Step 2: Create global.css**

Create `app/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Commit configuration files**

```bash
git add tailwind.config.js global.css
git commit -m "feat: add Tailwind CSS configuration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update Metro Configuration

**Files:**
- Modify: `app/metro.config.js`

**Step 1: Read current metro.config.js**

Check existing content in `app/metro.config.js`

**Step 2: Update metro.config.js for NativeWind**

Replace content with:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Step 3: Verify syntax**

```bash
node -c metro.config.js
```

Expected: No syntax errors

**Step 4: Commit metro config changes**

```bash
git add metro.config.js
git commit -m "feat: configure Metro for NativeWind

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update Babel Configuration

**Files:**
- Modify: `app/babel.config.js`

**Step 1: Read current babel.config.js**

Check existing content in `app/babel.config.js`

**Step 2: Update babel.config.js for NativeWind**

Replace content with:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }]
    ],
    plugins: [
      "nativewind/babel",
      "react-native-reanimated/plugin",
    ],
  };
};
```

**Step 3: Verify syntax**

```bash
node -c babel.config.js
```

Expected: No syntax errors

**Step 4: Commit babel config changes**

```bash
git add babel.config.js
git commit -m "feat: configure Babel for NativeWind

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update TypeScript Configuration

**Files:**
- Modify: `app/tsconfig.json`

**Step 1: Read current tsconfig.json**

Check existing content in `app/tsconfig.json`

**Step 2: Add path alias for components**

Add to `compilerOptions`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Step 3: Verify TypeScript config is valid**

```bash
npx tsc --noEmit
```

Expected: No errors (may have some from old gluestack imports)

**Step 4: Commit tsconfig changes**

```bash
git add tsconfig.json
git commit -m "feat: add path alias for component imports

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Initialize Gluestack UI v3

**Files:**
- Create: `app/components/ui/` (directory and files via CLI)

**Step 1: Run Gluestack UI init command**

```bash
cd app
npx gluestack-ui@latest init
```

Follow prompts:
- Select TypeScript
- Select path: `./components/ui`
- Confirm configuration

Expected: Components directory created with provider setup

**Step 2: Verify directory structure**

```bash
ls -la components/ui/gluestack-ui-provider/
```

Expected: index.tsx, index.web.tsx, script.ts files created

**Step 3: Commit Gluestack v3 initialization**

```bash
git add components/ui/
git commit -m "feat: initialize Gluestack UI v3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Install Core UI Components

**Files:**
- Create: `app/components/ui/button/`, `app/components/ui/input/`, etc.

**Step 1: Install Button component**

```bash
npx gluestack-ui add button
```

Expected: Button component files created in components/ui/button/

**Step 2: Install Input component**

```bash
npx gluestack-ui add input
```

Expected: Input component files created

**Step 3: Install FormControl component**

```bash
npx gluestack-ui add form-control
```

Expected: FormControl component files created

**Step 4: Install Toast component**

```bash
npx gluestack-ui add toast
```

Expected: Toast component files created

**Step 5: Install Spinner component**

```bash
npx gluestack-ui add spinner
```

Expected: Spinner component files created

**Step 6: Commit all component files**

```bash
git add components/ui/
git commit -m "feat: add core Gluestack UI v3 components

- Button
- Input
- FormControl
- Toast
- Spinner

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Create Layout Helper Components

**Files:**
- Create: `app/components/ui/vstack/index.tsx`
- Create: `app/components/ui/hstack/index.tsx`

**Step 1: Create VStack component**

Create `app/components/ui/vstack/index.tsx`:
```typescript
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface VStackProps extends ViewProps {
  className?: string;
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const spaceMap = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  xl: 'gap-6',
};

export function VStack({ className, space = 'md', children, ...props }: VStackProps) {
  return (
    <View
      className={cn('flex flex-col', space && spaceMap[space], className)}
      {...props}
    >
      {children}
    </View>
  );
}
```

**Step 2: Create HStack component**

Create `app/components/ui/hstack/index.tsx`:
```typescript
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface HStackProps extends ViewProps {
  className?: string;
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const spaceMap = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  xl: 'gap-6',
};

export function HStack({ className, space = 'md', children, ...props }: HStackProps) {
  return (
    <View
      className={cn('flex flex-row', space && spaceMap[space], className)}
      {...props}
    >
      {children}
    </View>
  );
}
```

**Step 3: Check if lib/utils.ts exists**

Check if `app/lib/utils.ts` exists (for cn utility)

**Step 4: Create lib/utils.ts if it doesn't exist**

If not exists, create `app/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 5: Install clsx and tailwind-merge if needed**

```bash
pnpm add clsx tailwind-merge
```

**Step 6: Commit layout components**

```bash
git add components/ui/vstack/ components/ui/hstack/ lib/utils.ts package.json pnpm-lock.yaml
git commit -m "feat: add VStack and HStack layout components

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Update Root Layout with GluestackUIProvider

**Files:**
- Modify: `app/app/_layout.tsx`

**Step 1: Read current _layout.tsx**

Check existing content in `app/app/_layout.tsx`

**Step 2: Update imports to include global.css and new provider**

Replace imports and wrapper:
```typescript
import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
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
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, initialized, loading, segments]);

  if (!initialized || loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <GluestackUIProvider mode="light">
      <Slot />
    </GluestackUIProvider>
  );
}
```

**Step 3: Commit root layout changes**

```bash
git add app/_layout.tsx
git commit -m "feat: update root layout for Gluestack UI v3

- Import global.css for Tailwind
- Replace GluestackUIProvider with v3 version
- Use View with className instead of Box

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Test Build Configuration

**Files:**
- None (verification step)

**Step 1: Clear Metro bundler cache**

```bash
cd app
rm -rf node_modules/.cache
```

**Step 2: Start Metro bundler**

```bash
pnpm start --clear
```

Expected: Metro bundler starts successfully

**Step 3: Check for build errors**

Look for any errors in the Metro output
Expected: May see errors about old Gluestack imports (that's OK for now)

**Step 4: Stop Metro bundler**

Press `Ctrl+C` to stop

**Step 5: Document build test completion**

```bash
git commit --allow-empty -m "test: verify build configuration

Metro bundler starts successfully with NativeWind
Old gluestack imports expected to fail (will fix in next tasks)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Migrate Select Nickname Screen

**Files:**
- Modify: `app/app/(auth)/select-nickname.tsx`

**Step 1: Read current select-nickname.tsx**

Read `app/app/(auth)/select-nickname.tsx` to understand current structure

**Step 2: Update imports**

Replace Gluestack v1 imports with v3:
```typescript
import { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { validateNickname, sanitizeNickname } from '../../../lib/profile-utils';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { Text } from 'react-native';
```

**Step 3: Update component JSX to use Tailwind classes**

Replace the return statement with:
```typescript
return (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    className="flex-1"
  >
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <VStack space="lg">
          <View>
            <Text className="text-3xl font-bold text-typography-900 mb-2">
              Choose Your Nickname
            </Text>
            <Text className="text-base text-typography-500">
              The nickname you wanted is taken. Please choose another.
            </Text>
          </View>

          <FormControl isInvalid={!!errors.nickname}>
            <FormControlLabel>
              <FormControlLabelText>Nickname</FormControlLabelText>
            </FormControlLabel>
            <Controller
              control={control}
              name="nickname"
              rules={{
                required: 'Nickname is required',
                validate: (value) => {
                  const error = validateNickname(value);
                  return error || true;
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input>
                  <InputField
                    placeholder="your_nickname"
                    value={value}
                    onChangeText={(text) => {
                      const sanitized = sanitizeNickname(text);
                      onChange(sanitized);
                      checkNicknameAvailability(sanitized);
                    }}
                    autoCapitalize="none"
                    autoFocus
                  />
                </Input>
              )}
            />
            <FormControlError>
              <FormControlErrorText>
                {errors.nickname?.message}
              </FormControlErrorText>
            </FormControlError>
            <FormControlHelper>
              <FormControlHelperText className={nicknameAvailable ? 'text-success-500' : 'text-typography-500'}>
                {nicknameStatus}
              </FormControlHelperText>
            </FormControlHelper>
          </FormControl>

          <Button
            disabled={loading || !nicknameAvailable}
            onPress={handleSubmit(onSubmit)}
            className="bg-primary-600 active:bg-primary-700"
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <ButtonText className="text-white font-semibold">
                Continue
              </ButtonText>
            )}
          </Button>
        </VStack>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
);
```

**Step 4: Test the screen compiles**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors in select-nickname.tsx

**Step 5: Commit migrated select-nickname screen**

```bash
git add app/(auth)/select-nickname.tsx
git commit -m "feat: migrate select-nickname screen to Gluestack v3

- Replace v1 components with v3
- Use Tailwind className instead of utility props
- Add KeyboardAvoidingView for mobile-native UX
- Use native ActivityIndicator

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: Migrate Sign In Screen

**Files:**
- Modify: `app/app/(auth)/sign-in.tsx`

**Step 1: Read current sign-in.tsx**

Read `app/app/(auth)/sign-in.tsx` to understand current structure

**Step 2: Update imports**

Replace Gluestack v1 imports with v3 and mobile components:
```typescript
import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase-oauth';
import { generateNickname, createProfileWithNickname } from '../../lib/profile-utils';
import OAuthButton from '../../components/OAuthButton';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
} from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
```

**Step 3: Update component JSX to use Tailwind classes**

Replace return statement - maintain all logic, just update UI:
```typescript
return (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    className="flex-1"
  >
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <VStack space="lg">
          <View className="mb-4">
            <Text className="text-3xl font-bold text-typography-900 mb-2">
              Welcome Back
            </Text>
            <Text className="text-base text-typography-500">
              Sign in to your account
            </Text>
          </View>

          {/* OAuth Buttons */}
          <VStack space="sm">
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
          </VStack>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-typography-200" />
            <Text className="px-4 text-typography-500">or</Text>
            <View className="flex-1 h-px bg-typography-200" />
          </View>

          {/* Email Field */}
          <FormControl isInvalid={!!errors.email}>
            <FormControlLabel>
              <FormControlLabelText>Email</FormControlLabelText>
            </FormControlLabel>
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
              render={({ field: { onChange, value } }) => (
                <Input>
                  <InputField
                    placeholder="you@example.com"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </Input>
              )}
            />
            <FormControlError>
              <FormControlErrorText>
                {errors.email?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>

          {/* Password Field */}
          <FormControl isInvalid={!!errors.password}>
            <FormControlLabel>
              <FormControlLabelText>Password</FormControlLabelText>
            </FormControlLabel>
            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input>
                  <InputField
                    placeholder="••••••••"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                  />
                </Input>
              )}
            />
            <FormControlError>
              <FormControlErrorText>
                {errors.password?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>

          {/* Sign In Button */}
          <Button
            disabled={loading}
            onPress={handleSubmit(onSignIn)}
            className="bg-primary-600 active:bg-primary-700 mt-2"
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <ButtonText className="text-white font-semibold">
                Sign In
              </ButtonText>
            )}
          </Button>

          {/* Sign Up Link */}
          <Button
            variant="link"
            onPress={() => router.push('/(auth)/sign-up')}
            className="mt-2"
          >
            <ButtonText className="text-primary-600">
              Don't have an account? Sign Up
            </ButtonText>
          </Button>
        </VStack>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
);
```

**Step 4: Test TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors in sign-in.tsx

**Step 5: Commit migrated sign-in screen**

```bash
git add app/(auth)/sign-in.tsx
git commit -m "feat: migrate sign-in screen to Gluestack v3

- Replace v1 components with v3
- Use Tailwind className
- Add KeyboardAvoidingView
- Improve visual hierarchy
- Native ActivityIndicator

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 14: Migrate OAuth Button Component

**Files:**
- Modify: `app/components/OAuthButton.tsx`

**Step 1: Read current OAuthButton.tsx**

Read `app/components/OAuthButton.tsx`

**Step 2: Update imports**

Replace imports:
```typescript
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { Provider } from '@supabase/supabase-js';
```

**Step 3: Update component to use Tailwind classes**

```typescript
export default function OAuthButton({ provider, onPress, loading = false }: OAuthButtonProps) {
  const isApple = provider === 'apple';
  const buttonText = isApple ? 'Continue with Apple' : 'Continue with Google';

  return (
    <Button
      variant={isApple ? "solid" : "outline"}
      className={isApple ? "bg-black active:bg-gray-900" : "border-typography-300 active:bg-gray-50"}
      disabled={loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isApple ? "white" : "black"} />
      ) : (
        <ButtonText className={isApple ? "text-white" : "text-black"}>
          {buttonText}
        </ButtonText>
      )}
    </Button>
  );
}
```

**Step 4: Test TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

**Step 5: Commit OAuth button migration**

```bash
git add components/OAuthButton.tsx
git commit -m "feat: migrate OAuth button to Gluestack v3

- Use Tailwind classes
- Native ActivityIndicator
- Maintain Apple/Google styling

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 15: Migrate Sign Up Screen

**Files:**
- Modify: `app/app/(auth)/sign-up.tsx`

**Step 1: Read current sign-up.tsx**

Read `app/app/(auth)/sign-up.tsx`

**Step 2: Update imports (same pattern as sign-in)**

Replace Gluestack v1 imports with v3

**Step 3: Update JSX (similar to sign-in but with sign-up logic)**

Replace return statement with Tailwind classes, maintaining all business logic

**Step 4: Test TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

**Step 5: Commit sign-up screen migration**

```bash
git add app/(auth)/sign-up.tsx
git commit -m "feat: migrate sign-up screen to Gluestack v3

- Replace v1 components with v3
- Use Tailwind className
- Add KeyboardAvoidingView
- Match sign-in screen styling

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 16: Migrate Profile Screen

**Files:**
- Modify: `app/app/(app)/profile.tsx`

**Step 1: Read current profile.tsx**

Read `app/app/(app)/profile.tsx` - this is more complex with image picker

**Step 2: Update imports**

Replace Gluestack v1 imports with v3

**Step 3: Update JSX with Tailwind classes**

Maintain image picker logic, just update UI components

**Step 4: Add pull-to-refresh for mobile UX**

```typescript
import { RefreshControl } from 'react-native';

const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  // Reload profile data
  await initialize();
  setRefreshing(false);
};

// In ScrollView
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
```

**Step 5: Test TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors

**Step 6: Commit profile screen migration**

```bash
git add app/(app)/profile.tsx
git commit -m "feat: migrate profile screen to Gluestack v3

- Replace v1 components with v3
- Add pull-to-refresh (mobile UX)
- Maintain image picker functionality
- Use Tailwind classes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 17: Remove Old Gluestack v1 Dependencies

**Files:**
- Modify: `app/package.json`

**Step 1: Remove Gluestack v1 packages**

```bash
cd app
pnpm remove @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react
```

Expected: Packages removed successfully

**Step 2: Verify package.json**

Check that old packages are gone from dependencies

**Step 3: Clean install dependencies**

```bash
pnpm install
```

Expected: Clean install with only new dependencies

**Step 4: Commit dependency cleanup**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: remove Gluestack UI v1 dependencies

Migration to v3 complete, removing old packages

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 18: Test Complete Build

**Files:**
- None (verification)

**Step 1: Clear all caches**

```bash
cd app
rm -rf node_modules/.cache
pnpm start --clear
```

**Step 2: Build for Android**

```bash
pnpm build:dev:android
```

Expected: Build completes successfully

**Step 3: Build for iOS (if on Mac)**

```bash
pnpm build:dev:ios
```

Expected: Build completes successfully (or skip if not on Mac)

**Step 4: Test on device/simulator**

Run the app and test:
- Sign in with email/password
- Sign up flow
- OAuth flows (Apple, Google)
- Profile screen
- Nickname selection

**Step 5: Document test results**

```bash
git commit --allow-empty -m "test: verify complete migration build

All screens migrated successfully
Builds complete on Android/iOS
All auth flows tested and working

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 19: Update Documentation

**Files:**
- Create: `docs/MIGRATION_GLUESTACK_V3.md`
- Modify: `.claude/CLAUDE.md`

**Step 1: Create migration documentation**

Create `docs/MIGRATION_GLUESTACK_V3.md`:
```markdown
# Gluestack UI v3 Migration Guide

## What Changed

- **UI Library:** Gluestack UI v1 → v3
- **Styling:** gluestack-style → NativeWind/Tailwind CSS
- **Components:** npm packages → copy-pasteable components

## Component Mapping

| v1 Component | v3 Component |
|--------------|--------------|
| `Box` | `View` with `className` |
| `VStack` | Custom `VStack` component |
| `HStack` | Custom `HStack` component |
| `Button` | `Button` (v3) |
| `Input` | `Input` (v3) |
| `FormControl` | `FormControl` (v3) |

## Styling Changes

### Before (v1)
```tsx
<Box bg="$white" p="$4">
  <Text color="$primary500">Hello</Text>
</Box>
```

### After (v3)
```tsx
<View className="bg-white p-4">
  <Text className="text-primary-500">Hello</Text>
</View>
```

## Mobile UX Improvements

- Added `KeyboardAvoidingView` for forms
- Native `ActivityIndicator` for loading states
- Pull-to-refresh on profile screen
- Better accessibility labels
- Platform-specific behaviors

## Testing

All existing flows tested:
- ✅ Email/password authentication
- ✅ OAuth (Apple, Google)
- ✅ Profile updates
- ✅ Nickname conflict resolution
```

**Step 2: Update CLAUDE.md**

Update Tech Stack section in `.claude/CLAUDE.md`:
```markdown
## Tech Stack

**Current (as of 2025-01):**
- **UI Library:** Gluestack UI v3.0.0 (with NativeWind)
- **Styling:** NativeWind v4 + Tailwind CSS v3.4
```

Update Code Conventions section with new patterns

**Step 3: Commit documentation**

```bash
git add docs/MIGRATION_GLUESTACK_V3.md .claude/CLAUDE.md
git commit -m "docs: add Gluestack v3 migration documentation

- Migration guide with component mapping
- Update project memory with new stack
- Document styling changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 20: Create Pull Request

**Files:**
- None (git operations)

**Step 1: Push branch to remote**

```bash
git push -u origin gluestack-v3-migration
```

Expected: Branch pushed successfully

**Step 2: Create PR with comprehensive description**

```bash
gh pr create --title "Migrate to Gluestack UI v3 + NativeWind" --body "$(cat <<'EOF'
## Summary

Migrate from Gluestack UI v1 (bundled library with utility props) to v3 (copy-pasteable components with Tailwind CSS/NativeWind).

### What Changed

- **Removed:** `@gluestack-ui/themed`, `@gluestack-style/react`, `@gluestack-ui/config`
- **Added:** `nativewind@4.0.36`, `tailwindcss@3.4.1`, Gluestack v3 components
- **Styling:** Utility props → Tailwind className
- **Components:** npm packages → copy-pasted components

### Screens Migrated

- ✅ Select nickname screen
- ✅ Sign in screen
- ✅ Sign up screen
- ✅ Profile screen
- ✅ OAuth button component

### Mobile UX Improvements

- Added KeyboardAvoidingView for forms
- Native ActivityIndicator for loading states
- Pull-to-refresh on profile screen
- Better accessibility labels
- Platform-specific behaviors

### Testing Completed

- ✅ Email/password authentication
- ✅ OAuth (Apple, Google) flows
- ✅ Profile creation and updates
- ✅ Nickname conflict resolution
- ✅ Android build successful
- ✅ iOS build successful

### Documentation

- Added migration guide: `docs/MIGRATION_GLUESTACK_V3.md`
- Updated CLAUDE.md with new stack info
- Component mapping reference included

### Breaking Changes

None - all functionality maintained

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Expected: PR created successfully

**Step 3: Document PR creation**

Note the PR URL for review

---

## Completion Checklist

After all tasks complete, verify:

- ✅ Worktree created and isolated
- ✅ NativeWind and Tailwind installed
- ✅ Gluestack v3 initialized
- ✅ All screens migrated
- ✅ Old dependencies removed
- ✅ Builds successful (Android + iOS)
- ✅ All auth flows tested
- ✅ Documentation updated
- ✅ PR created

**Estimated Time:** 4-5 days focused work

**Risk Level:** Medium (isolated worktree allows easy rollback)

---

**Plan Status:** Ready for execution
**Next Step:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement
