# Gluestack UI v3 Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Bonfire app from gluestack-ui v1 to v3 with NativeWind, replacing all React Native primitives with modern gluestack components.

**Architecture:** Big bang migration replacing all UI components at once. NativeWind provides Tailwind CSS styling. CLI-installed components live in `app/components/ui/`. Toast notifications replace Alert.alert().

**Tech Stack:** React Native 0.81.5, Expo 54, gluestack-ui v3, NativeWind, Tailwind CSS, TypeScript

---

## Phase 1: Setup & Configuration

### Task 1: Install NativeWind Dependencies

**Files:**
- Modify: `app/package.json`

**Step 1: Navigate to app directory**

```bash
cd app
```

**Step 2: Install NativeWind and Tailwind CSS**

```bash
pnpm add nativewind
pnpm add -D tailwindcss
```

Expected: Packages installed successfully

**Step 3: Verify installation**

```bash
pnpm list nativewind tailwindcss
```

Expected output should show both packages installed

---

### Task 2: Create Tailwind Configuration

**Files:**
- Create: `app/tailwind.config.js`

**Step 1: Create tailwind.config.js**

Create file at `app/tailwind.config.js` with this exact content:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 2: Verify file created**

```bash
cat tailwind.config.js
```

Expected: File contents match above

---

### Task 3: Configure Babel for NativeWind

**Files:**
- Modify: `app/babel.config.js`

**Step 1: Read current babel.config.js**

Current file should look like:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

**Step 2: Update babel.config.js to add NativeWind plugin**

Replace with:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

**Step 3: Verify changes**

```bash
cat babel.config.js
```

Expected: Shows nativewind/babel in plugins array

---

### Task 4: Configure Metro for NativeWind

**Files:**
- Create: `app/metro.config.js` (if doesn't exist)
- Modify: `app/metro.config.js` (if exists)

**Step 1: Check if metro.config.js exists**

```bash
test -f metro.config.js && echo "EXISTS" || echo "DOES NOT EXIST"
```

**Step 2: Create/update metro.config.js**

If file doesn't exist, create it with this content:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Step 3: Verify metro config**

```bash
cat metro.config.js
```

Expected: Shows withNativeWind wrapper

---

### Task 5: Create Global CSS File

**Files:**
- Create: `app/global.css`

**Step 1: Create global.css**

Create file at `app/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Verify file**

```bash
cat global.css
```

Expected: Shows three @tailwind directives

---

### Task 6: Update TypeScript Configuration

**Files:**
- Modify: `app/tsconfig.json`

**Step 1: Read current tsconfig.json**

```bash
cat tsconfig.json
```

**Step 2: Add path alias for @/ if not present**

Ensure the `compilerOptions.paths` section includes:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

If `paths` doesn't exist, add it to `compilerOptions`. If `@/*` mapping doesn't exist, add it.

**Step 3: Verify TypeScript config**

```bash
cat tsconfig.json | grep -A 5 "paths"
```

Expected: Shows @/* path mapping

---

### Task 7: Initialize Gluestack UI v3

**Files:**
- Creates: `app/components/ui/gluestack-ui-provider/`
- Modifies: `app/tsconfig.json` (may update paths)

**Step 1: Run gluestack-ui init**

```bash
npx gluestack-ui@latest init
```

Follow prompts:
- Select: "NativeWind"
- Confirm component directory: `components/ui`

Expected: Provider files created in `components/ui/gluestack-ui-provider/`

**Step 2: Verify provider directory created**

```bash
ls -la components/ui/gluestack-ui-provider/
```

Expected: Shows index.tsx and other provider files

**Step 3: Check that global.css import was added**

The init command should have added an import to your root layout. Verify:

```bash
grep -r "global.css" app/
```

Expected: Should show import in _layout.tsx or similar

---

### Task 8: Install Required Gluestack Components

**Files:**
- Creates multiple directories in: `app/components/ui/`

**Step 1: Install layout components**

```bash
npx gluestack-ui add box vstack hstack center
```

Expected: Components added to `components/ui/`

**Step 2: Install form components**

```bash
npx gluestack-ui add input button form-control
```

Expected: Components added

**Step 3: Install feedback components**

```bash
npx gluestack-ui add toast spinner
```

Expected: Components added

**Step 4: Install typography components**

```bash
npx gluestack-ui add text heading
```

Expected: Components added

**Step 5: Install avatar component**

```bash
npx gluestack-ui add avatar
```

Expected: Component added

**Step 6: Verify all components installed**

```bash
ls -1 components/ui/
```

Expected output should include:
- avatar
- box
- button
- center
- form-control
- gluestack-ui-provider
- heading
- hstack
- input
- spinner
- text
- toast
- vstack

---

### Task 9: Update Root Layout with New Provider

**Files:**
- Modify: `app/app/_layout.tsx`

**Step 1: Read current _layout.tsx**

```bash
cat app/_layout.tsx
```

**Step 2: Update imports**

Replace:
```typescript
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { View, ActivityIndicator } from 'react-native';
```

With:
```typescript
import '@/global.css';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
```

**Step 3: Update loading state JSX**

Replace:
```typescript
if (!initialized || loading) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
```

With:
```typescript
if (!initialized || loading) {
  return (
    <Center className="flex-1">
      <Spinner size="large" />
    </Center>
  );
}
```

**Step 4: Update provider JSX**

Replace:
```typescript
<GluestackUIProvider config={config}>
  <Slot />
</GluestackUIProvider>
```

With:
```typescript
<GluestackUIProvider>
  <Slot />
</GluestackUIProvider>
```

**Step 5: Verify changes**

```bash
cat app/_layout.tsx
```

Expected: No imports from @gluestack-ui/themed, no View/ActivityIndicator imports, uses new components

---

### Task 10: Remove Old Gluestack v1 Packages

**Files:**
- Modify: `app/package.json`

**Step 1: Remove old gluestack packages**

```bash
pnpm remove @gluestack-ui/themed @gluestack-ui/config @gluestack-style/react
```

Expected: Packages removed from package.json

**Step 2: Verify removal**

```bash
cat package.json | grep gluestack
```

Expected: Should NOT show @gluestack-ui/themed, @gluestack-ui/config, or @gluestack-style/react

**Step 3: Clean install to update lockfile**

```bash
pnpm install
```

Expected: Lockfile updated, no old gluestack v1 packages

**Step 4: Commit Phase 1**

```bash
git add .
git commit -m "feat: setup gluestack-ui v3 with NativeWind

- Install NativeWind and Tailwind CSS
- Configure Babel and Metro for NativeWind
- Initialize gluestack-ui v3 with CLI
- Install required UI components
- Update root layout to use new provider
- Remove old gluestack v1 packages

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Component Migration

### Task 11: Migrate OAuthButton Component

**Files:**
- Modify: `app/components/OAuthButton.tsx`

**Step 1: Read current OAuthButton.tsx**

```bash
cat components/OAuthButton.tsx
```

**Step 2: Replace entire file content**

Replace with:

```typescript
import React from 'react';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
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
    <Button
      variant={isApple ? 'solid' : 'outline'}
      className={isApple ? 'bg-black mb-2.5' : 'mb-2.5'}
      isDisabled={loading}
      onPress={onPress}
    >
      {loading ? (
        <ButtonSpinner />
      ) : (
        <ButtonText>{buttonText}</ButtonText>
      )}
    </Button>
  );
}
```

**Step 3: Verify changes**

```bash
cat components/OAuthButton.tsx
```

Expected:
- No imports from react-native
- No StyleSheet
- Uses gluestack Button components
- File is much shorter (~30 lines vs 72)

**Step 4: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors in OAuthButton.tsx

**Step 5: Commit**

```bash
git add components/OAuthButton.tsx
git commit -m "refactor: migrate OAuthButton to gluestack-ui v3

- Replace TouchableOpacity with Button
- Replace ActivityIndicator with ButtonSpinner
- Use variant prop for Apple/Google styling
- Remove all StyleSheet code
- Reduce from 72 lines to 30 lines

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: Auth Screens Migration

### Task 12: Migrate Sign-In Screen

**Files:**
- Modify: `app/app/(auth)/sign-in.tsx`

**Step 1: Read current sign-in.tsx**

```bash
cat app/\(auth\)/sign-in.tsx
```

**Step 2: Replace imports section**

Replace:
```typescript
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
```

With:
```typescript
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
```

**Step 3: Add useToast hook at top of component**

After the existing hooks, add:

```typescript
const toast = useToast();
```

**Step 4: Replace Alert.alert with Toast - OAuth errors**

Replace:
```typescript
if (error) {
  if (error.message !== 'User cancelled') {
    Alert.alert('Error', 'Authentication failed. Please try again.');
  }
}
```

With:
```typescript
if (error) {
  if (error.message !== 'User cancelled') {
    toast.show({
      placement: 'top',
      render: ({ id }) => (
        <Toast nativeID={`toast-${id}`} action="error">
          <VStack space="xs" className="flex-1">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Authentication failed. Please try again.</ToastDescription>
          </VStack>
        </Toast>
      ),
    });
  }
}
```

**Step 5: Replace Alert.alert with Toast - sign-in errors**

Replace both Alert.alert calls in onSignIn function with:

```typescript
// For the error case
if (error) {
  toast.show({
    placement: 'top',
    render: ({ id }) => (
      <Toast nativeID={`toast-${id}`} action="error">
        <VStack space="xs" className="flex-1">
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>{error.message}</ToastDescription>
        </VStack>
      </Toast>
    ),
  });
}

// For the catch block
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={`toast-${id}`} action="error">
      <VStack space="xs" className="flex-1">
        <ToastTitle>Error</ToastTitle>
        <ToastDescription>An unexpected error occurred</ToastDescription>
      </VStack>
    </Toast>
  ),
});
```

**Step 6: Replace JSX structure**

Replace the entire return statement with:

```typescript
return (
  <Box className="flex-1 p-5 justify-center">
    <Heading size="2xl" className="mb-8 text-center">Welcome Back</Heading>

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

    <HStack space="md" className="items-center my-5">
      <Box className="flex-1 h-px bg-border-300" />
      <Text size="sm" className="text-typography-500">or continue with</Text>
      <Box className="flex-1 h-px bg-border-300" />
    </HStack>

    <VStack space="md">
      <FormControl isInvalid={!!errors.email}>
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
            <Input>
              <InputField
                placeholder="Email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Input>
          )}
        />
        <FormControlError>
          <FormControlErrorText>{errors.email?.message}</FormControlErrorText>
        </FormControlError>
      </FormControl>

      <FormControl isInvalid={!!errors.password}>
        <Controller
          control={control}
          name="password"
          rules={{
            required: 'Password is required',
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input>
              <InputField
                placeholder="Password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                secureTextEntry
              />
            </Input>
          )}
        />
        <FormControlError>
          <FormControlErrorText>{errors.password?.message}</FormControlErrorText>
        </FormControlError>
      </FormControl>

      <Button
        isDisabled={loading}
        onPress={handleSubmit(onSignIn)}
        className="mt-2"
      >
        <ButtonText>{loading ? 'Signing in...' : 'Sign In'}</ButtonText>
      </Button>

      <Button
        variant="link"
        onPress={() => router.push('/(auth)/sign-up')}
      >
        <ButtonText>Don't have an account? Sign Up</ButtonText>
      </Button>
    </VStack>
  </Box>
);
```

**Step 7: Remove StyleSheet**

Delete the entire `const styles = StyleSheet.create({...})` block at the end of the file.

**Step 8: Verify changes**

```bash
cat app/\(auth\)/sign-in.tsx | grep -E "(StyleSheet|Alert|View|TextInput|TouchableOpacity)"
```

Expected: No matches (none of these should be in the file)

**Step 9: Test TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors in sign-in.tsx

**Step 10: Commit**

```bash
git add app/\(auth\)/sign-in.tsx
git commit -m "refactor: migrate sign-in screen to gluestack-ui v3

- Replace all React Native primitives with gluestack components
- Use FormControl for form fields
- Replace Alert.alert with Toast notifications
- Use VStack/HStack for layout
- Remove all StyleSheet code
- Add Tailwind classes for styling

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Migrate Sign-Up Screen

**Files:**
- Modify: `app/app/(auth)/sign-up.tsx`

**Step 1: Read current sign-up.tsx**

```bash
cat app/\(auth\)/sign-up.tsx
```

**Step 2: Apply same pattern as sign-in.tsx**

The sign-up screen follows the exact same pattern as sign-in but with an additional "confirm password" field.

Update imports:
```typescript
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
```

Add useToast hook:
```typescript
const toast = useToast();
```

**Step 3: Replace Alert.alert calls with Toast**

Same pattern as sign-in for OAuth and sign-up errors.

**Step 4: Update JSX structure**

```typescript
return (
  <Box className="flex-1 p-5 justify-center">
    <Heading size="2xl" className="mb-8 text-center">Create Account</Heading>

    <VStack space="sm">
      <OAuthButton
        provider="apple"
        onPress={() => handleOAuthSignUp('apple')}
        loading={oauthLoading}
      />

      <OAuthButton
        provider="google"
        onPress={() => handleOAuthSignUp('google')}
        loading={oauthLoading}
      />
    </VStack>

    <HStack space="md" className="items-center my-5">
      <Box className="flex-1 h-px bg-border-300" />
      <Text size="sm" className="text-typography-500">or continue with</Text>
      <Box className="flex-1 h-px bg-border-300" />
    </HStack>

    <VStack space="md">
      <FormControl isInvalid={!!errors.email}>
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
            <Input>
              <InputField
                placeholder="Email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Input>
          )}
        />
        <FormControlError>
          <FormControlErrorText>{errors.email?.message}</FormControlErrorText>
        </FormControlError>
      </FormControl>

      <FormControl isInvalid={!!errors.password}>
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
          render={({ field: { onChange, onBlur, value } }) => (
            <Input>
              <InputField
                placeholder="Password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                secureTextEntry
              />
            </Input>
          )}
        />
        <FormControlError>
          <FormControlErrorText>{errors.password?.message}</FormControlErrorText>
        </FormControlError>
      </FormControl>

      <FormControl isInvalid={!!errors.confirmPassword}>
        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: 'Please confirm your password',
            validate: (value) =>
              value === password || 'Passwords do not match',
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input>
              <InputField
                placeholder="Confirm Password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                secureTextEntry
              />
            </Input>
          )}
        />
        <FormControlError>
          <FormControlErrorText>{errors.confirmPassword?.message}</FormControlErrorText>
        </FormControlError>
      </FormControl>

      <Button
        isDisabled={loading}
        onPress={handleSubmit(onSignUp)}
        className="mt-2"
      >
        <ButtonText>{loading ? 'Creating account...' : 'Sign Up'}</ButtonText>
      </Button>

      <Button
        variant="link"
        onPress={() => router.push('/(auth)/sign-in')}
      >
        <ButtonText>Already have an account? Sign In</ButtonText>
      </Button>
    </VStack>
  </Box>
);
```

**Step 5: Remove StyleSheet**

Delete the `const styles = StyleSheet.create({...})` block.

**Step 6: Verify changes**

```bash
cat app/\(auth\)/sign-up.tsx | grep -E "(StyleSheet|Alert|View|TextInput|TouchableOpacity)"
```

Expected: No matches

**Step 7: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 8: Commit**

```bash
git add app/\(auth\)/sign-up.tsx
git commit -m "refactor: migrate sign-up screen to gluestack-ui v3

- Replace all React Native primitives with gluestack components
- Use FormControl for all form fields
- Replace Alert.alert with Toast notifications
- Add confirm password field with validation
- Remove all StyleSheet code

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: Migrate Select Nickname Screen

**Files:**
- Modify: `app/app/(auth)/select-nickname.tsx`

**Step 1: Read current select-nickname.tsx**

```bash
cat app/\(auth\)/select-nickname.tsx
```

**Step 2: Update imports**

```typescript
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlError, FormControlErrorText, FormControlHelper, FormControlHelperText } from '@/components/ui/form-control';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
```

Add useToast hook:
```typescript
const toast = useToast();
```

**Step 3: Replace Alert.alert with Toast**

For all error cases (nickname taken, save errors, etc.):

```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={`toast-${id}`} action="error">
      <VStack space="xs" className="flex-1">
        <ToastTitle>Error</ToastTitle>
        <ToastDescription>{errorMessage}</ToastDescription>
      </VStack>
    </Toast>
  ),
});
```

**Step 4: Update JSX structure**

```typescript
return (
  <Box className="flex-1 p-5 justify-center">
    <VStack space="lg">
      <VStack space="xs">
        <Heading size="2xl">Choose Your Nickname</Heading>
        <Text size="sm" className="text-typography-500">
          This nickname is already taken. Please choose another one.
        </Text>
      </VStack>

      <FormControl isInvalid={!!errors.nickname}>
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
              value: /^[a-z0-9_]+$/,
              message: 'Only lowercase letters, numbers, and underscores allowed',
            },
            validate: async (value) => {
              if (!value || value.length < 3) return true;
              const isAvailable = await checkNicknameAvailability(value);
              return isAvailable || 'This nickname is already taken';
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input>
              <InputField
                placeholder="Enter nickname"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
              />
            </Input>
          )}
        />
        <FormControlHelper>
          <FormControlHelperText>
            3-20 characters, lowercase letters, numbers, and underscores only
          </FormControlHelperText>
        </FormControlHelper>
        <FormControlError>
          <FormControlErrorText>{errors.nickname?.message}</FormControlErrorText>
        </FormControlError>
      </FormControl>

      <Button
        isDisabled={loading || !!errors.nickname}
        onPress={handleSubmit(onSave)}
      >
        <ButtonText>{loading ? 'Saving...' : 'Continue'}</ButtonText>
      </Button>
    </VStack>
  </Box>
);
```

**Step 5: Remove StyleSheet**

Delete the StyleSheet block.

**Step 6: Verify changes**

```bash
cat app/\(auth\)/select-nickname.tsx | grep -E "(StyleSheet|Alert|View|TextInput|TouchableOpacity)"
```

Expected: No matches

**Step 7: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 8: Commit**

```bash
git add app/\(auth\)/select-nickname.tsx
git commit -m "refactor: migrate select-nickname screen to gluestack-ui v3

- Replace primitives with gluestack components
- Use FormControl with async validation
- Add FormControlHelper for input guidance
- Replace Alert.alert with Toast
- Remove StyleSheet code

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: App Screens Migration

### Task 15: Migrate Home/Index Screen

**Files:**
- Modify: `app/app/(app)/index.tsx`

**Step 1: Read current index.tsx**

```bash
cat app/\(app\)/index.tsx
```

**Step 2: Update imports**

```typescript
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
```

**Step 3: Update JSX structure**

Replace the return statement with:

```typescript
return (
  <Box className="flex-1 p-5 justify-center items-center">
    <VStack space="lg" className="items-center">
      <Heading size="2xl">Welcome to Bonfire!</Heading>
      <Text size="md" className="text-center">
        You're signed in as {user?.email}
      </Text>
      <Button onPress={() => router.push('/(app)/profile')}>
        <ButtonText>View Profile</ButtonText>
      </Button>
    </VStack>
  </Box>
);
```

**Step 4: Remove StyleSheet**

Delete the StyleSheet block if present.

**Step 5: Verify changes**

```bash
cat app/\(app\)/index.tsx | grep -E "(StyleSheet|View|Text.*style)"
```

Expected: No matches

**Step 6: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 7: Commit**

```bash
git add app/\(app\)/index.tsx
git commit -m "refactor: migrate index screen to gluestack-ui v3

- Replace primitives with gluestack components
- Use VStack for layout
- Add Tailwind classes for styling
- Remove StyleSheet code

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: Migrate Profile Screen

**Files:**
- Modify: `app/app/(app)/profile.tsx`

**Step 1: Read current profile.tsx**

```bash
cat app/\(app\)/profile.tsx
```

**Step 2: Update imports**

```typescript
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
```

Add useToast:
```typescript
const toast = useToast();
```

**Step 3: Replace Alert.alert for image upload success**

Replace success Alert with:

```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={`toast-${id}`} action="success">
      <VStack space="xs" className="flex-1">
        <ToastTitle>Success</ToastTitle>
        <ToastDescription>Profile picture updated successfully!</ToastDescription>
      </VStack>
    </Toast>
  ),
});
```

Replace error Alert with:

```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={`toast-${id}`} action="error">
      <VStack space="xs" className="flex-1">
        <ToastTitle>Error</ToastTitle>
        <ToastDescription>{error.message || 'Failed to upload image'}</ToastDescription>
      </VStack>
    </Toast>
  ),
});
```

**Step 4: Update JSX structure**

```typescript
if (loading) {
  return (
    <Box className="flex-1 justify-center items-center">
      <Spinner size="large" />
    </Box>
  );
}

return (
  <Box className="flex-1 p-5">
    <VStack space="xl">
      <Heading size="2xl" className="text-center">Profile</Heading>

      <VStack space="lg" className="items-center">
        <Avatar size="xl">
          {profile?.avatar_url ? (
            <AvatarImage source={{ uri: profile.avatar_url }} />
          ) : (
            <AvatarFallbackText>{profile?.nickname || 'User'}</AvatarFallbackText>
          )}
        </Avatar>

        <Button
          size="sm"
          variant="outline"
          onPress={handleImagePick}
          isDisabled={uploading}
        >
          <ButtonText>
            {uploading ? 'Uploading...' : 'Change Photo'}
          </ButtonText>
        </Button>
      </VStack>

      <VStack space="md">
        <VStack space="xs">
          <Text size="sm" className="text-typography-500">Nickname</Text>
          <Text size="lg" className="font-semibold">{profile?.nickname}</Text>
        </VStack>

        <VStack space="xs">
          <Text size="sm" className="text-typography-500">Email</Text>
          <Text size="lg">{user?.email}</Text>
        </VStack>
      </VStack>

      <Button
        variant="outline"
        action="negative"
        onPress={handleSignOut}
        className="mt-auto"
      >
        <ButtonText>Sign Out</ButtonText>
      </Button>
    </VStack>
  </Box>
);
```

**Step 5: Remove StyleSheet**

Delete the StyleSheet block.

**Step 6: Verify changes**

```bash
cat app/\(app\)/profile.tsx | grep -E "(StyleSheet|Alert|View|Text.*style|Image[^a-zA-Z])"
```

Expected: No matches (except AvatarImage which is fine)

**Step 7: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 8: Commit**

```bash
git add app/\(app\)/profile.tsx
git commit -m "refactor: migrate profile screen to gluestack-ui v3

- Replace primitives with gluestack components
- Use Avatar component for profile picture
- Use Toast for upload success/error feedback
- Use VStack for layout
- Remove StyleSheet code

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5: Cleanup & Validation

### Task 17: Verify No StyleSheet Usage Remains

**Files:**
- Search all: `app/**/*.tsx`

**Step 1: Search for StyleSheet imports**

```bash
grep -r "from 'react-native'" app/ | grep StyleSheet
```

Expected: No output (no StyleSheet imports found)

**Step 2: Search for StyleSheet.create**

```bash
grep -r "StyleSheet.create" app/
```

Expected: No output

**Step 3: Search for Alert.alert**

```bash
grep -r "Alert.alert" app/
```

Expected: No output

**Step 4: Document findings**

If any files still have StyleSheet or Alert.alert, note them and fix manually.

---

### Task 18: Verify No React Native Primitive Imports

**Files:**
- Search all: `app/**/*.tsx`

**Step 1: Search for View imports**

```bash
grep -r "import.*View.*from 'react-native'" app/
```

Expected: Should only appear in files that legitimately need View (none should in our app)

**Step 2: Search for Text imports from react-native**

```bash
grep -r "import.*Text.*from 'react-native'" app/ | grep -v "ButtonText"
```

Expected: No output

**Step 3: Search for TextInput**

```bash
grep -r "TextInput" app/
```

Expected: No output

**Step 4: Search for TouchableOpacity**

```bash
grep -r "TouchableOpacity" app/
```

Expected: No output

**Step 5: Document any remaining primitives**

If found, fix them manually by replacing with gluestack equivalents.

---

### Task 19: Clear Metro Cache and Test Build

**Files:**
- None (testing only)

**Step 1: Kill any running Metro instances**

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
```

**Step 2: Clear Metro cache**

```bash
npx expo start -c
```

**Step 3: Wait for bundle to compile**

Wait for "Logs for your project will appear below" message.

Expected: No errors during bundling

**Step 4: Check for any NativeWind/Tailwind errors**

Look for errors related to:
- "className" not recognized
- Tailwind classes not applying
- CSS import errors

Expected: No such errors

**Step 5: Stop the server**

Press Ctrl+C to stop

---

### Task 20: Test TypeScript Compilation

**Files:**
- None (testing only)

**Step 1: Run TypeScript compiler**

```bash
cd app
npx tsc --noEmit
```

Expected: No errors

**Step 2: If errors exist, fix them**

Common issues:
- Missing type definitions for gluestack components
- Incorrect prop types
- Path alias not working

Fix any errors found.

**Step 3: Re-run until clean**

```bash
npx tsc --noEmit
```

Expected: "No errors"

---

### Task 21: Manual Testing Preparation

**Files:**
- None (documentation)

**Step 1: Start Expo dev server**

```bash
npx expo start
```

**Step 2: Connect device or simulator**

- Scan QR code with Expo Go app, OR
- Press 'i' for iOS simulator, OR
- Press 'a' for Android emulator

**Step 3: Test auth flows**

Manually test:
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Apple OAuth (if configured)
- [ ] Google OAuth (if configured)
- [ ] Nickname selection if needed
- [ ] Form validation (try invalid email, short password)
- [ ] Error toasts appear correctly
- [ ] OAuth "User cancelled" doesn't show toast

**Step 4: Test app screens**

- [ ] Home/index screen shows user info
- [ ] Navigate to profile
- [ ] Profile shows user data and avatar
- [ ] Change profile picture (if image picker working)
- [ ] Sign out button works
- [ ] Redirects to sign-in after sign out

**Step 5: Visual checks**

- [ ] No layout issues
- [ ] Buttons styled correctly (Apple black, Google outline)
- [ ] Forms have proper spacing
- [ ] Toasts appear at top
- [ ] Loading spinners show during async ops
- [ ] Text is readable
- [ ] Dividers look correct

**Step 6: Document any issues**

Create a list of any bugs or issues found during testing.

---

### Task 22: Final Commit

**Files:**
- All remaining changes

**Step 1: Check git status**

```bash
git status
```

**Step 2: Stage any remaining files**

```bash
git add .
```

**Step 3: Commit cleanup**

```bash
git commit -m "chore: complete gluestack-ui v3 migration

- Verified all StyleSheet usage removed
- Verified all Alert.alert replaced with Toast
- Verified all React Native primitives replaced
- TypeScript compilation successful
- Manual testing complete

Migration complete: All screens and components now use gluestack-ui v3 with NativeWind.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Step 4: Push to remote**

```bash
git push origin upgrade-to-gluestack-3
```

Expected: Branch pushed successfully

---

## Success Criteria

### Technical Checklist
- [ ] All gluestack v1 packages removed from package.json
- [ ] NativeWind and Tailwind CSS installed and configured
- [ ] All components installed via CLI into `app/components/ui/`
- [ ] Zero `StyleSheet.create` usage
- [ ] Zero `Alert.alert` usage
- [ ] Zero React Native primitive imports (View, Text, TextInput, TouchableOpacity)
- [ ] TypeScript compiles without errors
- [ ] Metro bundler builds successfully

### Functional Checklist
- [ ] Email/password sign-up works
- [ ] Email/password sign-in works
- [ ] OAuth sign-up/sign-in works (if configured)
- [ ] Form validation displays errors correctly
- [ ] Toast notifications appear and dismiss
- [ ] Navigation between screens works
- [ ] Profile screen displays user data
- [ ] Avatar upload works (if feature enabled)
- [ ] Sign out redirects to sign-in

### Quality Checklist
- [ ] Code is cleaner (no StyleSheet blocks)
- [ ] Styling is consistent (Tailwind classes)
- [ ] Components follow gluestack v3 patterns
- [ ] Forms use FormControl properly
- [ ] Layouts use VStack/HStack
- [ ] All commits follow conventional commit format

---

## Troubleshooting

### Metro Bundler Not Recognizing className
**Problem:** className prop not recognized or Tailwind classes not applying

**Solution:**
1. Verify `nativewind/babel` in babel.config.js plugins
2. Clear Metro cache: `npx expo start -c`
3. Restart Metro bundler completely
4. Check that global.css is imported in root layout

### TypeScript Errors on Gluestack Components
**Problem:** Type errors when using gluestack components

**Solution:**
1. Verify `@/*` path alias in tsconfig.json
2. Check that components were installed via CLI (not npm packages)
3. Restart TypeScript server in VS Code
4. Check import paths match exactly: `@/components/ui/<component>`

### Toast Not Showing
**Problem:** Toast.show() called but nothing appears

**Solution:**
1. Verify Toast component installed: `ls components/ui/toast`
2. Check useToast hook is called inside component
3. Verify GluestackUIProvider wraps app in _layout.tsx
4. Check console for errors
5. Ensure `nativeID` prop is unique

### Components Look Unstyled
**Problem:** Components render but look plain/unstyled

**Solution:**
1. Verify Tailwind CSS configured correctly
2. Check global.css is imported
3. Verify Metro config has withNativeWind wrapper
4. Clear Metro cache and restart
5. Check that className props have valid Tailwind classes

### Avatar Component Not Found
**Problem:** Import error for Avatar component

**Solution:**
1. Verify avatar installed: `npx gluestack-ui add avatar`
2. Check import path: `@/components/ui/avatar`
3. Clear TypeScript cache
4. Restart dev server

---

## Notes for Engineer

- **Take your time:** Each task should take 2-5 minutes. Don't rush.
- **Commit frequently:** After each task completion, commit your work.
- **Test as you go:** Run `npx tsc --noEmit` after each file migration.
- **Read the design doc:** Refer to `docs/plans/2025-01-16-gluestack-v3-migration-design.md` for patterns and rationale.
- **Ask for help:** If blocked, ask questions. Don't guess.
- **Metro restarts:** You'll need to restart Metro bundler with cache clear (`-c` flag) at least once after initial setup.
- **VS Code IntelliSense:** Install Tailwind CSS IntelliSense extension for autocomplete.

Good luck! This migration will significantly improve the codebase maintainability.
