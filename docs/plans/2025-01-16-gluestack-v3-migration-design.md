# Bonfire - Gluestack UI v3 Migration Design

**Date:** 2025-01-16
**Status:** Approved
**Type:** Major Migration

## Overview

Migrate the entire Bonfire app from gluestack-ui v1 (themed approach) to gluestack-ui v3 with NativeWind (Tailwind CSS for React Native). This is a comprehensive "big bang" migration that will modernize the UI framework, reduce bundle size, and improve developer experience.

## Goals

- Replace gluestack-ui v1 (@gluestack-ui/themed) with v3 (NativeWind-based)
- Adopt Tailwind CSS styling via NativeWind
- Use CLI-based component installation (components in `app/components/ui/`)
- Replace all `Alert.alert()` with Toast notifications
- Remove all StyleSheet.create() usage
- Maintain 100% functional parity with current implementation

## Design Decisions

### Styling Approach: NativeWind (Tailwind CSS)
**Decision:** Use NativeWind with Tailwind classes instead of the legacy themed approach.

**Rationale:**
- NativeWind is the recommended approach for gluestack v3
- Better tree-shaking leads to smaller bundle sizes
- Modern developer experience with Tailwind utility classes
- Better community support and ecosystem
- More familiar to developers (Tailwind is widely adopted)

**Trade-off:** Requires additional NativeWind setup, but pays off long-term

### Migration Strategy: Big Bang
**Decision:** Replace everything at once instead of incremental migration.

**Rationale:**
- Small codebase (7 screens + 1 component)
- On a feature branch (safe to break temporarily)
- Faster overall completion
- Cleaner end result (no mixed v1/v3 code)
- Less complex than maintaining both versions temporarily

**Trade-off:** App won't work until migration is complete, but acceptable on feature branch

### Component Installation: CLI-based
**Decision:** Use `npx gluestack-ui add <component>` instead of npm packages.

**Rationale:**
- This is how gluestack v3 is designed to work
- Components copied as source code into `app/components/ui/`
- Full ownership and customization capability
- Easier to modify styles and behavior
- Better for understanding component internals

**Trade-off:** More files in codebase, but better control

### Error Handling: Toast Notifications
**Decision:** Replace all `Alert.alert()` calls with gluestack Toast component.

**Rationale:**
- Non-blocking UI (better UX)
- Customizable appearance and positioning
- Consistent with modern app design patterns
- Built-in variants for error/success/warning/info
- Auto-dismissible with manual dismiss option

**Trade-off:** Slight learning curve for Toast API, but much better UX

## Architecture

### Tech Stack Changes

**Remove:**
- `@gluestack-ui/themed`
- `@gluestack-ui/config`
- `@gluestack-style/react`
- All `StyleSheet` usage
- All `Alert.alert()` calls

**Add:**
- `nativewind` - Tailwind CSS for React Native
- `tailwindcss` - Tailwind CSS core
- gluestack-ui v3 components via CLI
- Babel plugin for NativeWind

**Keep:**
- `react-native-svg` (required by gluestack v3)
- All Supabase packages
- All Expo packages
- `react-hook-form` (works perfectly with gluestack v3)
- `zustand` (state management)

### Project Structure

```
app/
├── components/
│   ├── ui/                           # NEW: CLI-installed gluestack components
│   │   ├── gluestack-ui-provider/
│   │   ├── button/
│   │   ├── input/
│   │   ├── form-control/
│   │   ├── toast/
│   │   └── ...other components
│   └── OAuthButton.tsx               # Migrated to use gluestack v3
├── app/
│   ├── _layout.tsx                   # Updated provider
│   ├── (auth)/
│   │   ├── sign-in.tsx              # Migrated
│   │   ├── sign-up.tsx              # Migrated
│   │   └── select-nickname.tsx      # Migrated
│   └── (app)/
│       ├── index.tsx                # Migrated
│       └── profile.tsx              # Migrated
├── tailwind.config.js                # NEW: Tailwind configuration
└── package.json                      # Updated dependencies
```

### Component Inventory

Based on current codebase analysis, we need these gluestack v3 components:

**Layout:**
- `box` - General container (replaces View)
- `vstack` - Vertical layouts with automatic spacing
- `hstack` - Horizontal layouts with automatic spacing
- `center` - Centering wrapper

**Forms:**
- `input` - Text inputs (email, password, nickname)
- `button` - All action buttons and links
- `form-control` - Form field wrappers with labels/errors

**Feedback:**
- `toast` - Error/success/info messages
- `spinner` - Loading states

**Typography:**
- `text` - General text elements
- `heading` - Titles and headers

**Media:**
- `avatar` - User profile pictures

**Optional (if needed):**
- `pressable` - Custom touchable areas
- `icon` - Icon support (uses lucide-react-native)

## Component Migration Patterns

### Basic Component Mapping

**React Native → Gluestack v3:**
```tsx
// BEFORE (v1)
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

<View style={styles.container}>
  <Text style={styles.title}>Welcome</Text>
  <TextInput style={styles.input} placeholder="Email" />
  <TouchableOpacity style={styles.button}>
    <Text style={styles.buttonText}>Submit</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  input: { borderWidth: 1, padding: 10 },
  button: { backgroundColor: '#007AFF', padding: 15 },
  buttonText: { color: 'white' },
});

// AFTER (v3 with NativeWind)
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

<Box className="flex-1 p-5">
  <Heading size="xl">Welcome</Heading>
  <Input>
    <InputField placeholder="Email" />
  </Input>
  <Button>
    <ButtonText>Submit</ButtonText>
  </Button>
</Box>
```

### Form Pattern with React Hook Form

**BEFORE (Current):**
```tsx
<Controller
  control={control}
  name="email"
  rules={{ required: 'Email is required' }}
  render={({ field: { onChange, onBlur, value } }) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        onChangeText={onChange}
        onBlur={onBlur}
        value={value}
      />
      {errors.email && (
        <Text style={styles.error}>{errors.email.message}</Text>
      )}
    </View>
  )}
/>
```

**AFTER (v3 with FormControl):**
```tsx
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";

<FormControl isInvalid={!!errors.email}>
  <FormControlLabel>
    <FormControlLabelText>Email</FormControlLabelText>
  </FormControlLabel>
  <Controller
    control={control}
    name="email"
    rules={{ required: 'Email is required' }}
    render={({ field: { onChange, onBlur, value } }) => (
      <Input>
        <InputField
          placeholder="Email"
          onChangeText={onChange}
          onBlur={onBlur}
          value={value}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Input>
    )}
  />
  <FormControlError>
    <FormControlErrorText>{errors.email?.message}</FormControlErrorText>
  </FormControlError>
</FormControl>
```

**Benefits:**
- `isInvalid` prop automatically styles input with error state
- Built-in accessibility (labels, error announcements)
- `FormControlError` only shows when error exists
- Consistent error styling across all forms

### Toast Pattern (Replacing Alert.alert)

**BEFORE:**
```tsx
if (error) {
  Alert.alert('Error', error.message);
}
```

**AFTER:**
```tsx
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { VStack } from "@/components/ui/vstack";

const toast = useToast();

// Error toast
if (error && error.message !== 'User cancelled') {
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

// Success toast
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={`toast-${id}`} action="success">
      <VStack space="xs" className="flex-1">
        <ToastTitle>Success</ToastTitle>
        <ToastDescription>Operation completed successfully!</ToastDescription>
      </VStack>
    </Toast>
  ),
});
```

**Toast Actions:**
- `action="error"` - Red background for errors
- `action="success"` - Green background for success
- `action="warning"` - Yellow background for warnings
- `action="info"` - Blue background for info messages
- `action="attention"` - For important notices

**Note:** Always filter "User cancelled" OAuth errors to avoid showing unnecessary error messages.

### Layout Patterns with VStack/HStack

**Vertical spacing with VStack:**
```tsx
// BEFORE
<View>
  <View style={{ marginBottom: 15 }}>
    <TextInput />
  </View>
  <View style={{ marginBottom: 15 }}>
    <TextInput />
  </View>
  <View style={{ marginBottom: 15 }}>
    <TouchableOpacity />
  </View>
</View>

// AFTER
<VStack space="md">
  <Input><InputField /></Input>
  <Input><InputField /></Input>
  <Button><ButtonText>Submit</ButtonText></Button>
</VStack>
```

**Space values:** `xs`, `sm`, `md`, `lg`, `xl`, `2xl`

**Horizontal layout with HStack:**
```tsx
<HStack space="md" className="items-center justify-between">
  <Text>Label</Text>
  <Button size="sm"><ButtonText>Action</ButtonText></Button>
</HStack>
```

### Divider Pattern

**BEFORE:**
```tsx
<View style={styles.divider}>
  <View style={styles.dividerLine} />
  <Text style={styles.dividerText}>or continue with</Text>
  <View style={styles.dividerLine} />
</View>

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 10, color: '#666' },
});
```

**AFTER:**
```tsx
<HStack space="md" className="items-center my-5">
  <Box className="flex-1 h-px bg-border-300" />
  <Text size="sm" className="text-typography-500">or continue with</Text>
  <Box className="flex-1 h-px bg-border-300" />
</HStack>
```

### Button Patterns

**Primary button:**
```tsx
<Button>
  <ButtonText>Submit</ButtonText>
</Button>
```

**Outline button:**
```tsx
<Button variant="outline">
  <ButtonText>Cancel</ButtonText>
</Button>
```

**Link button:**
```tsx
<Button variant="link">
  <ButtonText>Forgot password?</ButtonText>
</Button>
```

**Button with loading state:**
```tsx
import { ButtonSpinner } from "@/components/ui/button";

<Button isDisabled={loading}>
  {loading ? (
    <ButtonSpinner />
  ) : (
    <ButtonText>Submit</ButtonText>
  )}
</Button>
```

**OAuth button pattern (Apple/Google):**
```tsx
// Apple - solid black button
<Button variant="solid" className="bg-black">
  <ButtonText>Continue with Apple</ButtonText>
</Button>

// Google - outline button
<Button variant="outline">
  <ButtonText>Continue with Google</ButtonText>
</Button>
```

## NativeWind/Tailwind Common Classes

### Spacing
- `p-4`, `px-5`, `py-2` - Padding
- `m-4`, `mt-2`, `mb-3` - Margin
- `gap-3`, `space-4` - Gaps between items

### Flexbox
- `flex-1` - Flex grow
- `flex-row` - Horizontal flex
- `items-center` - Align items center
- `justify-between` - Space between
- `justify-center` - Center content

### Sizing
- `w-full` - Full width
- `h-12` - Fixed height
- `max-w-96` - Max width
- `min-h-screen` - Minimum full screen height

### Borders
- `border` - Add border
- `border-background-300` - Border color
- `rounded-lg` - Rounded corners
- `rounded-full` - Fully rounded (circles)

### Typography
- `text-sm`, `text-lg`, `text-xl` - Text sizes
- `font-semibold`, `font-bold` - Font weights
- `text-center` - Text alignment
- `text-typography-500` - Text color

### Background
- `bg-white`, `bg-background-0` - Background colors
- `bg-primary` - Primary brand color

## Migration Execution Order

### Phase 1: Setup (Foundation)
1. Install NativeWind dependencies (`nativewind`, `tailwindcss`)
2. Create `tailwind.config.js` with React Native preset
3. Configure Babel for NativeWind
4. Configure Metro bundler for CSS
5. Run `npx gluestack-ui init` (creates provider and config)
6. Install all needed components via CLI
7. Update `app/app/_layout.tsx` to use new provider
8. Test that app runs (will have errors, that's expected)
9. Remove old gluestack v1 packages

### Phase 2: Components (Bottom-Up)
10. Migrate `OAuthButton.tsx` component
    - Replace TouchableOpacity → Button
    - Replace ActivityIndicator → ButtonSpinner
    - Remove StyleSheet
    - Test OAuth buttons render

### Phase 3: Auth Screens
11. Migrate `sign-in.tsx`
    - Replace all primitives with gluestack components
    - Add FormControl around inputs
    - Replace Alert.alert with Toast
    - Remove StyleSheet

12. Migrate `sign-up.tsx`
    - Same pattern as sign-in
    - Handle password confirmation field

13. Migrate `select-nickname.tsx`
    - FormControl with async validation
    - Toast for errors

14. Update `(auth)/_layout.tsx` if needed

### Phase 4: App Screens
15. Migrate `(app)/index.tsx`
    - Replace primitives with gluestack
    - Simple screen, good for testing

16. Migrate `(app)/profile.tsx`
    - Avatar component
    - Form patterns
    - Image picker integration

17. Update `(app)/_layout.tsx` if needed

### Phase 5: Cleanup & Validation
18. Search and remove all StyleSheet imports/usage
19. Search and remove all React Native primitive imports
20. Verify no Alert.alert() calls remain
21. Run full end-to-end testing

## File-Specific Changes

### app/app/_layout.tsx
**Current imports:**
```tsx
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { View, ActivityIndicator } from 'react-native';
```

**New imports:**
```tsx
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
```

**Loading state change:**
```tsx
// BEFORE
if (!initialized || loading) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

// AFTER
if (!initialized || loading) {
  return (
    <Center className="flex-1">
      <Spinner size="large" />
    </Center>
  );
}
```

**Provider change:**
```tsx
// BEFORE
<GluestackUIProvider config={config}>
  <Slot />
</GluestackUIProvider>

// AFTER
<GluestackUIProvider>
  <Slot />
</GluestackUIProvider>
```

### app/components/OAuthButton.tsx

**Complete transformation:**
```tsx
// BEFORE
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Provider } from '@supabase/supabase-js';

export default function OAuthButton({ provider, onPress, loading = false }) {
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
  button: { padding: 15, borderRadius: 8, marginBottom: 10 },
  appleButton: { backgroundColor: '#000000' },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDDDDD' },
  buttonDisabled: { opacity: 0.5 },
  buttonContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  appleText: { color: '#FFFFFF' },
  googleText: { color: '#000000' },
});

// AFTER
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

**Key changes:**
- Removed all StyleSheet code (72 lines → 30 lines)
- Using Button variants instead of custom styles
- ButtonSpinner replaces ActivityIndicator
- Tailwind classes for margin
- TypeScript interface for props

## Testing & Validation

### Manual Testing Checklist

**Authentication Flows:**
- [ ] Email/password sign-up works
- [ ] Email/password sign-in works
- [ ] Apple OAuth sign-in/sign-up works
- [ ] Google OAuth sign-in/sign-up works
- [ ] Account linking works (OAuth with matching email)
- [ ] Nickname conflict resolution works
- [ ] "User cancelled" OAuth errors are filtered (no toast shown)

**Visual Validation:**
- [ ] All screens render without crashes
- [ ] Forms are properly sized and aligned
- [ ] Buttons have correct styling (Apple black solid, Google outline)
- [ ] Toast messages appear at top placement
- [ ] Toast messages auto-dismiss after a few seconds
- [ ] Loading spinners show during async operations
- [ ] Error messages display correctly in FormControl
- [ ] Spacing is consistent across screens

**Form Functionality:**
- [ ] Form validation triggers on submit
- [ ] Error messages appear in FormControlError
- [ ] Input fields have proper keyboard types
- [ ] Password fields hide text
- [ ] Email fields lowercase automatically
- [ ] Required field validation works

**Navigation:**
- [ ] Can navigate between sign-in and sign-up
- [ ] Auth guard redirects unauthenticated users
- [ ] Authenticated users see app screens
- [ ] Nickname selection shows when needed
- [ ] Back navigation works correctly

**Profile Features:**
- [ ] Profile screen shows user data
- [ ] Avatar displays correctly
- [ ] Avatar upload still works
- [ ] Profile update functions work

### Important Considerations

**1. NativeWind Setup Requirements:**
- Metro bundler MUST be restarted after `tailwind.config.js` changes
- Tailwind classes won't work until Babel plugin is properly configured
- Clear Metro cache if styles not applying: `npx expo start -c`
- VSCode Tailwind IntelliSense extension highly recommended

**2. Component Import Paths:**
All gluestack components import from `@/components/ui/*`:
```tsx
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { FormControl, FormControlError } from "@/components/ui/form-control";
import { useToast, Toast, ToastTitle } from "@/components/ui/toast";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
```

**3. Breaking Changes from v1:**
- No more `$` prefix for design tokens (was `bg="$primary"`, now `className="bg-primary"`)
- No more `config` prop on GluestackUIProvider
- Component structure changed (Input requires InputField child, Button requires ButtonText child)
- All styling via `className` prop, not individual props
- Must use compound components (Input + InputField, not just Input)

**4. TypeScript Considerations:**
- Path alias `@/*` must be configured in `tsconfig.json`
- Component prop types come from gluestack-ui type definitions
- NativeWind extends React Native's `className` prop types

**5. Performance Notes:**
- NativeWind compiles Tailwind classes at build time
- Smaller bundle size than v1 due to tree-shaking
- No runtime style calculations (all done at build time)

## Benefits

### Immediate Benefits
- **Smaller bundle size:** NativeWind's tree-shaking removes unused styles
- **Better DX:** Tailwind classes are faster to write than StyleSheet
- **Modern library:** v3 is actively maintained, v1 is legacy
- **Better accessibility:** FormControl provides built-in ARIA attributes
- **Improved UX:** Toast notifications are non-blocking vs Alert.alert
- **Less boilerplate:** No more StyleSheet.create blocks
- **Component ownership:** Source code in repo, full control to customize

### Long-term Benefits
- **Easier theming:** Tailwind config is centralized and flexible
- **Better hiring:** Tailwind knowledge is common, easier to onboard
- **Community support:** NativeWind has large, active community
- **Future-proof:** Modern architecture aligned with web dev trends
- **Maintainability:** Less custom styling code to maintain
- **Consistency:** Tailwind enforces consistent spacing/sizing
- **Faster development:** Utility classes speed up UI iteration

## Risks & Mitigations

### Risk 1: NativeWind Setup Complexity
**Risk:** NativeWind requires specific Babel and Metro configuration that could fail.

**Likelihood:** Medium
**Impact:** High (blocks entire migration)

**Mitigation:**
- Use `npx gluestack-ui init` for automatic setup
- Follow official gluestack-ui Expo installation guide exactly
- Test setup with simple component before full migration

**Fallback:**
- Detailed documentation available for manual configuration
- Can reference gluestack-ui example projects for working configs
- Community support on Discord/GitHub

### Risk 2: App Non-Functional During Migration
**Risk:** "Big bang" approach means app won't work until migration complete.

**Likelihood:** High (expected)
**Impact:** Medium (on feature branch)

**Mitigation:**
- We're on `upgrade-to-gluestack-3` feature branch (safe to break)
- Can pause and test at each phase
- Main branch remains stable

**Fallback:**
- Full git revert if needed: `git reset --hard <commit-before-migration>`
- Can switch back to main branch at any time

### Risk 3: Visual Differences from Current UI
**Risk:** Gluestack v3 components may look different, breaking visual consistency.

**Likelihood:** Medium
**Impact:** Low

**Mitigation:**
- Test thoroughly on each screen
- Use similar spacing values (map 15px → p-4, 20px → p-5)
- Gluestack components are customizable via Tailwind classes
- Can tweak colors/sizes in `tailwind.config.js`

**Fallback:**
- Components are in source, can modify directly
- Can add custom Tailwind utilities if needed

### Risk 4: Learning Curve for NativeWind
**Risk:** Team unfamiliar with Tailwind CSS utility-first approach.

**Likelihood:** Low (Tailwind is popular)
**Impact:** Low

**Mitigation:**
- Common patterns documented in this design
- VSCode IntelliSense helps discover classes
- Tailwind docs are excellent
- Many examples in gluestack docs

**Fallback:**
- Can write custom CSS classes if needed
- Team can learn incrementally during implementation

### Risk 5: React Hook Form Integration Issues
**Risk:** React Hook Form might not work well with gluestack v3 components.

**Likelihood:** Very Low
**Impact:** High

**Mitigation:**
- Gluestack docs show React Hook Form examples
- Controller pattern stays the same, just UI components change
- FormControl designed to work with form libraries

**Fallback:**
- Can use uncontrolled forms if needed
- React Hook Form is framework-agnostic

## Success Criteria

### Technical Success
- [ ] All gluestack v1 packages removed from package.json
- [ ] NativeWind properly configured and working
- [ ] All screens migrated to gluestack v3 components
- [ ] Zero StyleSheet usage remaining
- [ ] Zero Alert.alert() usage remaining
- [ ] All components installed via CLI into `app/components/ui/`
- [ ] TypeScript compiles without errors
- [ ] Metro bundler builds successfully
- [ ] App runs on iOS/Android without crashes

### Functional Success
- [ ] All authentication flows work correctly
- [ ] Form validation works as before
- [ ] Error messages display via Toast
- [ ] OAuth flows complete successfully
- [ ] Account linking functions properly
- [ ] Profile features work (avatar upload, data display)
- [ ] Navigation works between all screens
- [ ] No regressions in existing features

### Quality Success
- [ ] Code is cleaner and more maintainable
- [ ] Bundle size is smaller than v1
- [ ] UI is responsive and performant
- [ ] Accessibility is improved
- [ ] Documentation updated (this design + project README)

## Next Steps

1. **Document this design** ✅
   - Save to `docs/plans/2025-01-16-gluestack-v3-migration-design.md`
   - Commit to git

2. **Create implementation plan**
   - Use `superpowers:writing-plans` skill
   - Break down into detailed, step-by-step tasks
   - Include exact commands and code snippets
   - Specify success criteria for each task

3. **Execute migration**
   - Option A: Use `superpowers:executing-plans` for batch execution
   - Option B: Use `superpowers:subagent-driven-development` for parallel execution
   - Follow tasks in order
   - Test after each major phase
   - Commit working code at phase boundaries

4. **Update documentation**
   - Update `.claude/CLAUDE.md` with gluestack v3 patterns
   - Document new component usage conventions
   - Add Tailwind class naming conventions
   - Update testing checklist

5. **Final validation**
   - Run complete manual test suite
   - Visual regression testing
   - Performance testing (bundle size, load time)
   - Accessibility audit

## Resources

- [Gluestack UI v3 Documentation](https://github.com/gluestack/gluestack-ui/tree/v3.0.0)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Gluestack CLI Reference](https://github.com/gluestack/gluestack-ui/tree/v3.0.0#cli)
- [Expo + NativeWind Setup](https://www.nativewind.dev/getting-started/expo-router)
