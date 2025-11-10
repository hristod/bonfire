# Gluestack UI Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all screens and components from React Native primitives to gluestack-ui for consistent design system, better accessibility, and maintainability.

**Architecture:** Replace View/Text/TextInput/TouchableOpacity with gluestack equivalents (Box/VStack/HStack/Text/Input/Button/FormControl), use Toast instead of Alert.alert, remove all StyleSheet.create code.

**Tech Stack:** @gluestack-ui/themed, @gluestack-ui/config, React Hook Form, Zustand

---

## Task 1: Create Custom Theme Configuration

**Files:**
- Create: `app/config/gluestack-theme.config.ts`

**Step 1: Create config directory**

```bash
mkdir -p app/config
```

Expected: Directory created

**Step 2: Create theme config file**

Create `app/config/gluestack-theme.config.ts`:

```typescript
import { config as defaultConfig } from '@gluestack-ui/config';

// Extend the default gluestack config with custom tokens
export const config = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Add any custom colors here if needed
      // For now, we use defaults and override inline where needed (e.g., black for Apple button)
    },
  },
} as const;
```

Expected: Theme config file created with minimal customization

**Step 3: Verify the file**

```bash
cat app/config/gluestack-theme.config.ts | head -5
```

Expected: See import and config export

**Step 4: Commit**

```bash
git add app/config/gluestack-theme.config.ts
git commit -m "feat: add custom gluestack theme configuration

- Extend default gluestack config
- Minimal customization (use defaults where possible)
- Foundation for future theme tokens

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Update Root Layout to Use Custom Theme

**Files:**
- Modify: `app/app/_layout.tsx:4`
- Modify: `app/app/_layout.tsx:6`
- Modify: `app/app/_layout.tsx:32-36`

**Step 1: Update import to use custom config**

Change line 4 from:
```typescript
import { config } from '@gluestack-ui/config';
```

To:
```typescript
import { config } from '../config/gluestack-theme.config';
```

**Step 2: Replace loading indicator with gluestack components**

Update imports at line 6, add gluestack components:
```typescript
import { Box, Spinner } from '@gluestack-ui/themed';
```

**Step 3: Replace loading View with gluestack Box and Spinner**

Replace lines 32-36:
```typescript
return (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);
```

With:
```typescript
return (
  <Box flex={1} justifyContent="center" alignItems="center">
    <Spinner size="large" />
  </Box>
);
```

**Step 4: Remove unused React Native imports**

Remove `View, ActivityIndicator` from line 6:
```typescript
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../config/gluestack-theme.config';
import { useAuthStore } from '../store/authStore';
import { Box, Spinner } from '@gluestack-ui/themed';
```

**Step 5: Test the app runs**

```bash
cd app && pnpm start
```

Expected: App starts without errors, loading screen shows Spinner

**Step 6: Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat: use custom theme config and gluestack loading indicator

- Import custom theme from config directory
- Replace View/ActivityIndicator with Box/Spinner
- Remove React Native primitive imports

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Refactor OAuthButton Component

**Files:**
- Modify: `app/components/OAuthButton.tsx`

**Step 1: Replace imports**

Replace lines 1-2:
```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
```

With:
```typescript
import React from 'react';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
```

**Step 2: Refactor component to use gluestack Button**

Replace the entire component (lines 11-36) with:
```typescript
export default function OAuthButton({ provider, onPress, loading = false }: OAuthButtonProps) {
  const isApple = provider === 'apple';
  const buttonText = isApple ? 'Continue with Apple' : 'Continue with Google';

  return (
    <Button
      variant={isApple ? "solid" : "outline"}
      bg={isApple ? "$black" : undefined}
      isDisabled={loading}
      onPress={onPress}
      mb="$2.5"
    >
      {loading ? (
        <ButtonSpinner color={isApple ? "$white" : "$black"} />
      ) : (
        <ButtonText>{buttonText}</ButtonText>
      )}
    </Button>
  );
}
```

**Step 3: Remove StyleSheet**

Delete lines 38-71 (the entire StyleSheet.create block)

**Step 4: Verify the file**

```bash
cat app/components/OAuthButton.tsx
```

Expected: See gluestack Button component, no StyleSheet code

**Step 5: Test OAuthButton renders**

Start app and navigate to sign-in screen:
```bash
cd app && pnpm start
```

Expected: OAuth buttons render with correct styling (Apple black, Google outline)

**Step 6: Commit**

```bash
git add app/components/OAuthButton.tsx
git commit -m "refactor: migrate OAuthButton to gluestack-ui

- Replace TouchableOpacity with Button
- Use variant prop for styling (solid/outline)
- Replace ActivityIndicator with ButtonSpinner
- Remove StyleSheet.create entirely

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Refactor Sign-In Screen

**Files:**
- Modify: `app/app/(auth)/sign-in.tsx`

**Step 1: Update imports**

Replace lines 2:
```typescript
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
```

With:
```typescript
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Input,
  InputField,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from '@gluestack-ui/themed';
```

**Step 2: Add toast to component**

After line 20, add:
```typescript
const toast = useToast();
```

**Step 3: Replace Alert.alert with toast - OAuth handler**

Replace lines 32-33:
```typescript
Alert.alert('Error', 'Authentication failed. Please try again.');
```

With:
```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="error" variant="solid">
      <ToastTitle>Error</ToastTitle>
      <ToastDescription>Authentication failed. Please try again.</ToastDescription>
    </Toast>
  ),
});
```

Replace lines 38:
```typescript
Alert.alert('Error', 'An unexpected error occurred');
```

With:
```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="error" variant="solid">
      <ToastTitle>Error</ToastTitle>
      <ToastDescription>An unexpected error occurred</ToastDescription>
    </Toast>
  ),
});
```

**Step 4: Replace Alert.alert with toast - sign-in handler**

Replace line 54:
```typescript
Alert.alert('Error', error.message);
```

With:
```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="error" variant="solid">
      <ToastTitle>Error</ToastTitle>
      <ToastDescription>{error.message}</ToastDescription>
    </Toast>
  ),
});
```

Replace line 57:
```typescript
Alert.alert('Error', 'An unexpected error occurred');
```

With:
```typescript
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="error" variant="solid">
      <ToastTitle>Error</ToastTitle>
      <ToastDescription>An unexpected error occurred</ToastDescription>
    </Toast>
  ),
});
```

**Step 5: Replace render with gluestack components**

Replace the entire return statement (lines 64-151) with:
```typescript
return (
  <Box flex={1} bg="$white" p="$5" justifyContent="center">
    <VStack space="$4">
      <Text size="2xl" bold textAlign="center" mb="$2">
        Welcome Back
      </Text>

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

      <HStack space="$3" alignItems="center" my="$3">
        <Box flex={1} height={1} bg="$borderLight200" />
        <Text size="sm" color="$textLight500">
          or continue with
        </Text>
        <Box flex={1} height={1} bg="$borderLight200" />
      </HStack>

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
        <FormControlLabel>
          <FormControlLabelText>Password</FormControlLabelText>
        </FormControlLabel>
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
                type="password"
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
        mt="$2"
      >
        {loading ? (
          <ButtonSpinner />
        ) : (
          <ButtonText>Sign In</ButtonText>
        )}
      </Button>

      <Button
        variant="link"
        onPress={() => router.push('/(auth)/sign-up')}
        mt="$2"
      >
        <ButtonText>Don't have an account? Sign Up</ButtonText>
      </Button>
    </VStack>
  </Box>
);
```

**Step 6: Remove StyleSheet**

Delete lines 154-216 (the entire StyleSheet.create block)

**Step 7: Test sign-in screen**

```bash
cd app && pnpm start
```

Navigate to sign-in screen and verify:
- Screen renders without errors
- Form fields show labels
- Validation errors appear correctly
- OAuth buttons work
- Sign-in button works
- Toast messages appear (test by entering invalid credentials)

Expected: All functionality works, no StyleSheet code, toast messages replace alerts

**Step 8: Commit**

```bash
git add app/app/\(auth\)/sign-in.tsx
git commit -m "refactor: migrate sign-in screen to gluestack-ui

- Replace View/Text/TextInput/TouchableOpacity with gluestack components
- Use FormControl for form fields with labels and error messages
- Replace Alert.alert with Toast for all error messages
- Use VStack/HStack for layout with space prop
- Remove StyleSheet.create entirely

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Refactor Sign-Up Screen

**Files:**
- Modify: `app/app/(auth)/sign-up.tsx`

**Step 1: Read current sign-up screen**

```bash
cat app/app/\(auth\)/sign-up.tsx
```

Expected: See current implementation with React Native primitives

**Step 2: Apply same pattern as sign-in screen**

Update imports (same as sign-in):
```typescript
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Input,
  InputField,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from '@gluestack-ui/themed';
```

Add toast after useForm:
```typescript
const toast = useToast();
```

Replace all Alert.alert calls with toast.show (same pattern as sign-in)

Replace render with gluestack components using same pattern:
- Box as root container with flex={1} bg="$white" p="$5" justifyContent="center"
- VStack for vertical layout with space="$4"
- Text for title with size="2xl" bold textAlign="center"
- OAuth buttons (if present)
- Divider with HStack (if present)
- FormControl for each field (email, password, confirm password) with:
  - FormControlLabel + FormControlLabelText
  - Controller with Input + InputField
  - FormControlError + FormControlErrorText
- Button for submit with ButtonSpinner/ButtonText
- Button variant="link" for navigation to sign-in

Remove StyleSheet.create block

**Step 3: Verify sign-up screen**

```bash
cd app && pnpm start
```

Navigate to sign-up screen and test:
- Form validation works
- OAuth buttons work
- Toast messages appear
- Sign-up flow completes

Expected: All functionality works with gluestack components

**Step 4: Commit**

```bash
git add app/app/\(auth\)/sign-up.tsx
git commit -m "refactor: migrate sign-up screen to gluestack-ui

- Apply same pattern as sign-in screen
- Use FormControl for all form fields
- Replace Alert.alert with Toast
- Use VStack/HStack for layout
- Remove StyleSheet.create

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Refactor Select-Nickname Screen

**Files:**
- Modify: `app/app/(auth)/select-nickname.tsx`

**Step 1: Read current select-nickname screen**

```bash
cat app/app/\(auth\)/select-nickname.tsx
```

Expected: See current implementation

**Step 2: Update imports**

Same gluestack imports as sign-in/sign-up screens

**Step 3: Add toast**

```typescript
const toast = useToast();
```

**Step 4: Replace Alert.alert calls with toast**

Find all Alert.alert calls and replace with toast.show pattern

**Step 5: Replace render with gluestack components**

Use same pattern:
- Box as root with flex={1} bg="$white" p="$5" justifyContent="center"
- VStack for layout with space="$4"
- Text for title and subtitle
- FormControl for nickname field with:
  - Label (FormControlLabel + FormControlLabelText)
  - Controller with Input + InputField
  - Error (FormControlError + FormControlErrorText)
  - Helper text with FormControlHelper
- Button for submit

**Step 6: Remove StyleSheet**

Delete StyleSheet.create block

**Step 7: Test nickname selection**

```bash
cd app && pnpm start
```

Test nickname selection flow:
- Validation works (3-20 chars, alphanumeric + underscore)
- Availability check works
- Error messages appear via toast
- Success flow completes

Expected: All functionality works

**Step 8: Commit**

```bash
git add app/app/\(auth\)/select-nickname.tsx
git commit -m "refactor: migrate select-nickname screen to gluestack-ui

- Use FormControl for nickname field
- Replace Alert.alert with Toast
- Use VStack for layout
- Remove StyleSheet.create

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Refactor Index Screen

**Files:**
- Modify: `app/app/(app)/index.tsx`

**Step 1: Read current index screen**

```bash
cat app/app/\(app\)/index.tsx
```

Expected: See current implementation

**Step 2: Update imports**

Replace React Native imports with gluestack:
```typescript
import {
  Box,
  VStack,
  Text,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
```

**Step 3: Replace components with gluestack equivalents**

- View → Box or VStack
- Text → Text (gluestack version)
- TouchableOpacity → Button (if present)

Use props like:
- flex={1}
- bg="$white"
- p="$5"
- space="$4" (for VStack)
- size="xl" / size="md" (for Text)

**Step 4: Remove StyleSheet**

Delete StyleSheet.create block

**Step 5: Test index screen**

```bash
cd app && pnpm start
```

Expected: Screen renders correctly with gluestack components

**Step 6: Commit**

```bash
git add app/app/\(app\)/index.tsx
git commit -m "refactor: migrate index screen to gluestack-ui

- Replace View/Text with Box/VStack/Text
- Use gluestack props for styling
- Remove StyleSheet.create

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Refactor Profile Screen

**Files:**
- Modify: `app/app/(app)/profile.tsx`

**Step 1: Read current profile screen**

```bash
cat app/app/\(app\)/profile.tsx
```

Expected: See current implementation with avatar upload

**Step 2: Update imports**

Add gluestack components:
```typescript
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from '@gluestack-ui/themed';
```

**Step 3: Add toast for upload feedback**

```typescript
const toast = useToast();
```

**Step 4: Replace Alert.alert with toast**

Replace all Alert.alert calls with toast.show for upload success/errors

**Step 5: Replace components with gluestack**

- View → Box or VStack/HStack
- Text → Text with size props
- TouchableOpacity → Button
- Image → Avatar with AvatarImage (if showing profile picture)

Layout structure:
- Box as root
- VStack for vertical layout
- Avatar component for profile picture
- Text for user info (nickname, email)
- Button for actions (sign out, upload avatar)

**Step 6: Remove StyleSheet**

Delete StyleSheet.create block

**Step 7: Test profile screen**

```bash
cd app && pnpm start
```

Test profile functionality:
- Profile data displays
- Avatar upload works
- Toast messages appear
- Sign out works

Expected: All functionality works with gluestack

**Step 8: Commit**

```bash
git add app/app/\(app\)/profile.tsx
git commit -m "refactor: migrate profile screen to gluestack-ui

- Use Avatar component for profile picture
- Replace View/Text/TouchableOpacity with gluestack components
- Replace Alert.alert with Toast
- Use VStack/HStack for layout
- Remove StyleSheet.create

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Final Cleanup and Validation

**Files:**
- Verify all files in: `app/app/` and `app/components/`

**Step 1: Search for remaining StyleSheet usage**

```bash
grep -r "StyleSheet.create" app/
```

Expected: No results (all StyleSheet code removed)

**Step 2: Search for remaining Alert usage**

```bash
grep -r "Alert.alert" app/
```

Expected: No results (all Alert.alert replaced with Toast)

**Step 3: Search for remaining React Native primitive imports**

```bash
grep -r "from 'react-native'" app/ | grep -v "react-native-image-picker" | grep -v "expo"
```

Expected: Only necessary imports (Platform, etc.), no View/Text/TextInput/TouchableOpacity

**Step 4: Run full test suite**

Start app and test all flows:
```bash
cd app && pnpm start
```

Test checklist:
- [ ] Sign-in with email works
- [ ] Sign-in with Apple works
- [ ] Sign-in with Google works
- [ ] Sign-up with email works
- [ ] Sign-up with OAuth works
- [ ] Nickname selection works
- [ ] Form validation shows errors correctly
- [ ] Toast messages appear and dismiss
- [ ] Profile screen displays correctly
- [ ] Avatar upload works
- [ ] Sign out works
- [ ] Navigation between screens works
- [ ] Loading states show spinners
- [ ] No console errors

**Step 5: Update project memory**

Add to `.claude/CLAUDE.md` after "## Code Conventions":

```markdown
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
```

**Step 6: Final commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: add gluestack-ui patterns to project memory

- Document component usage patterns
- Add FormControl + React Hook Form template
- Add Toast usage pattern
- Establish gluestack-only convention

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Step 7: Create summary**

Review changes:
```bash
git log --oneline -9
```

Expected: See all 9 commits for the refactor

---

## Summary

This implementation refactored all screens and components from React Native primitives to gluestack-ui:

**Migrated files:**
- Theme: `app/config/gluestack-theme.config.ts` (new)
- Layout: `app/app/_layout.tsx`
- Component: `app/components/OAuthButton.tsx`
- Auth screens: sign-in, sign-up, select-nickname
- App screens: index, profile

**Key changes:**
- All StyleSheet.create removed
- All Alert.alert replaced with Toast
- All forms use FormControl for accessibility
- All layouts use VStack/HStack with space prop
- Consistent design system via gluestack tokens

**Benefits achieved:**
- Better accessibility out of the box
- Consistent design system
- Easier theming and style updates
- Less custom styling code to maintain
- Foundation for dark mode

**Next steps:**
- Test on both iOS and Android
- Consider adding dark mode support
- Create reusable form components if needed
