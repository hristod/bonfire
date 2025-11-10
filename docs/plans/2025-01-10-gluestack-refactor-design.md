# Bonfire - Gluestack UI Refactor Design

**Date:** 2025-01-10
**Status:** Approved
**Type:** Refactor

## Overview

Migrate all existing screens and components from React Native primitives (View, Text, TextInput, etc.) to gluestack-ui components. This comprehensive refactor will establish a consistent design system, improve accessibility, and create a foundation for future theming capabilities.

## Goals

- Replace all React Native primitives with gluestack-ui equivalents
- Establish a custom theme configuration extending gluestack defaults
- Standardize form handling with FormControl + React Hook Form
- Replace Alert.alert() with Toast for better UX
- Use VStack/HStack for all layouts with consistent spacing
- Remove all StyleSheet.create() code
- Maintain 100% functional parity with current implementation

## Design Decisions

### Theme Strategy
**Use gluestack defaults with minimal customization** - Start with `@gluestack-ui/config` default theme and only customize specific tokens where needed (e.g., brand colors). This gives us professional defaults while allowing future customization.

### Migration Approach
**Comprehensive refactor** - Full adoption including layout components (VStack, HStack), form components (FormControl), and styling via gluestack props instead of StyleSheet. No half-measures.

### OAuth Button Styling
**Use gluestack variants** - Map Apple to `variant="solid"` with black background, Google to `variant="outline"`. Accept slight visual differences from current implementation in favor of consistency.

### Form Pattern
**FormControl integration** - Wrap all inputs in gluestack's FormControl component for built-in error styling and accessibility, while keeping React Hook Form for validation logic.

### Error Messaging
**Toast instead of Alert** - Replace all Alert.alert() calls with gluestack Toast for customizable, on-brand error and success messages.

### Layout Components
**VStack/HStack everywhere** - Replace all View containers with semantic layout components using `space` prop for consistent spacing.

## Architecture

### Theme Configuration

**File structure:**
```
app/
├── config/
│   └── gluestack-theme.config.ts  # Custom theme extending defaults
└── app/
    └── _layout.tsx                 # Wrap with GluestackUIProvider
```

**Theme config approach:**
- Extend `@gluestack-ui/config` default theme
- Customize only specific tokens:
  - Colors: Add brand-specific colors if needed
  - Spacing: Use gluestack's default spacing scale
  - Typography: Use default unless specific needs arise
- Single source of truth for all design tokens

**Provider setup in _layout.tsx:**
```tsx
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../config/gluestack-theme.config';

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      {/* App content */}
    </GluestackUIProvider>
  );
}
```

### Component Mapping

**Primitives:**
- `View` → `Box` (general container) or `VStack`/`HStack` (layout)
- `Text` → `Text` (gluestack version with variants)
- `TextInput` → `Input` wrapped in `FormControl`
- `TouchableOpacity` → `Button` or `Pressable`
- `ActivityIndicator` → `Spinner` or `ButtonSpinner`
- `Alert.alert()` → `useToast()` hook with `Toast` component

**Layout components:**
- `VStack` - Vertical stack with automatic spacing via `space` prop
- `HStack` - Horizontal stack with automatic spacing
- `Box` - General container for custom layouts
- `Center` - Centers children both horizontally and vertically

### Form Handling Pattern

**Standard form field structure:**
```tsx
<FormControl isInvalid={!!errors.fieldName}>
  <FormControlLabel>
    <FormControlLabelText>Label</FormControlLabelText>
  </FormControlLabel>
  <Controller
    control={control}
    name="fieldName"
    rules={{ required: 'Error message' }}
    render={({ field: { onChange, onBlur, value } }) => (
      <Input>
        <InputField
          onChangeText={onChange}
          onBlur={onBlur}
          value={value}
          placeholder="Placeholder"
        />
      </Input>
    )}
  />
  <FormControlError>
    <FormControlErrorText>{errors.fieldName?.message}</FormControlErrorText>
  </FormControlError>
</FormControl>
```

**Benefits:**
- Built-in accessibility (labels, error announcements)
- Consistent error styling across all forms
- `isInvalid` prop automatically styles the input
- FormControlError only shows when there's an error

**Apply to:**
- Sign-in: email + password fields
- Sign-up: email + password + confirm password fields
- Select-nickname: nickname field with async validation

### Toast Implementation

**Pattern for error messages:**
```tsx
const toast = useToast();

toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="error" variant="solid">
      <ToastTitle>Error</ToastTitle>
      <ToastDescription>{errorMessage}</ToastDescription>
    </Toast>
  ),
});
```

**Pattern for success messages:**
```tsx
toast.show({
  placement: 'top',
  render: ({ id }) => (
    <Toast nativeID={id} action="success" variant="solid">
      <ToastTitle>Success</ToastTitle>
      <ToastDescription>{successMessage}</ToastDescription>
    </Toast>
  ),
});
```

**Usage across screens:**
- Sign-in: OAuth errors, sign-in errors
- Sign-up: Sign-up errors, validation errors
- Select-nickname: Nickname taken errors, save errors
- Profile: Avatar upload success/errors

**Benefits:**
- Non-blocking (user can dismiss or it auto-dismisses)
- Customizable appearance via theme
- Consistent positioning and styling
- Better UX than native alerts

### Button Implementation

**OAuth Buttons:**
```tsx
<Button
  variant={isApple ? "solid" : "outline"}
  bg={isApple ? "$black" : undefined}
  isDisabled={loading}
  onPress={onPress}
>
  {loading ? (
    <ButtonSpinner />
  ) : (
    <ButtonText>{buttonText}</ButtonText>
  )}
</Button>
```

**Variant mapping:**
- **Apple button:** `variant="solid"` with `bg="$black"`
- **Google button:** `variant="outline"` with default outline styling
- **Primary actions:** `variant="solid"` with default primary color
- **Loading state:** `isDisabled` prop + `ButtonSpinner`

**Apply to:**
- OAuthButton component refactor
- All form submit buttons
- Any action buttons in profile screen

### Layout Structure

**Screen-level structure:**
```tsx
<Box flex={1} bg="$white" p="$5">
  <VStack space="$4">
    {/* Screen content with automatic spacing */}
  </VStack>
</Box>
```

**Form layouts:**
```tsx
<VStack space="$4">
  <FormControl>...</FormControl>
  <FormControl>...</FormControl>
  <Button>Submit</Button>
</VStack>
```

**OAuth buttons group:**
```tsx
<VStack space="$3">
  <OAuthButton provider="apple" />
  <OAuthButton provider="google" />
</VStack>
```

**Dividers with text:**
```tsx
<HStack space="$3" alignItems="center" my="$5">
  <Box flex={1} height={1} bg="$borderLight200" />
  <Text size="sm" color="$textLight500">or continue with</Text>
  <Box flex={1} height={1} bg="$borderLight200" />
</HStack>
```

**Benefits:**
- `space` prop handles all child spacing automatically
- Semantic naming makes layout intent clear
- Responsive by default
- Easy to change spacing globally via theme

## Migration Scope

### Files to Modify

**Theme setup (new files):**
- `app/config/gluestack-theme.config.ts` - Custom theme extending defaults
- `app/app/_layout.tsx` - Wrap with GluestackUIProvider

**Components:**
- `app/components/OAuthButton.tsx` - Refactor to use Button, ButtonText, ButtonSpinner

**Auth screens:**
- `app/app/(auth)/sign-in.tsx` - VStack, FormControl, Input, Button, Toast
- `app/app/(auth)/sign-up.tsx` - Same pattern as sign-in
- `app/app/(auth)/select-nickname.tsx` - Same pattern with async validation

**App screens:**
- `app/app/(app)/index.tsx` - Box, VStack, Text, Button
- `app/app/(app)/profile.tsx` - Full gluestack layout and components

### Import Changes

**Remove from all screens:**
```tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
```

**Add to screens as needed:**
```tsx
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
  ToastDescription
} from '@gluestack-ui/themed';
```

**Remove from all screens:**
- All `StyleSheet.create()` blocks
- All `style` props
- All `Alert.alert()` calls

## Testing & Validation

### Manual Testing Checklist

**Visual validation:**
- All screens render without crashes
- Form fields are properly sized and spaced
- Buttons have consistent styling
- OAuth buttons maintain platform-specific appearance
- Toast messages appear and dismiss correctly
- Loading states show spinners appropriately

**Functional validation:**
- Sign-in with email/password works
- Sign-up with email/password works
- OAuth sign-in (Apple/Google) works
- Nickname selection and validation works
- Form validation shows errors correctly
- Error messages display via Toast
- Profile screen displays user data
- Navigation between screens works

**Accessibility validation:**
- Form labels are announced by screen readers
- Error messages are announced
- Buttons have proper accessibility labels
- Focus management works correctly

### Testing Approach

1. Test each screen individually after refactoring
2. Test complete auth flows (sign-up → nickname → app)
3. Test OAuth flows end-to-end
4. Test on both iOS and Android if possible
5. Test with screen reader enabled

### Rollback Plan

- Use git worktree for isolated refactor work
- Commit after each screen is validated
- Can cherry-pick successful screens if needed

## Implementation Plan

### Phase 1: Foundation (Tasks 1-2)
1. Create theme configuration and setup GluestackUIProvider
2. Test that app still runs with provider wrapper

### Phase 2: Component Migration (Task 3)
3. Refactor OAuthButton component to gluestack primitives

### Phase 3: Auth Screens (Tasks 4-6)
4. Refactor sign-in screen (FormControl, Input, Button, Toast, VStack)
5. Refactor sign-up screen (same pattern as sign-in)
6. Refactor select-nickname screen (async validation with FormControl)

### Phase 4: App Screens (Tasks 7-8)
7. Refactor index screen
8. Refactor profile screen

### Phase 5: Cleanup & Validation (Task 9)
9. Remove any unused imports, verify all StyleSheet.create removed, end-to-end testing

### Success Criteria Per Task
- Screen renders without errors
- All functionality works as before
- No StyleSheet code remains
- Toast replaces all Alert.alert
- Proper gluestack components used throughout

### Estimated Effort
- Phase 1: 30 minutes
- Phase 2: 30 minutes
- Phase 3: 2 hours (most complex, forms + validation)
- Phase 4: 1.5 hours
- Phase 5: 1 hour
- **Total: ~5-6 hours**

## Documentation

### Updates to Project Memory

Add to `.claude/CLAUDE.md`:
- Section on gluestack component usage patterns
- Custom theme config location
- FormControl + React Hook Form pattern examples
- Toast usage instead of Alert.alert
- VStack/HStack spacing conventions

### Migration Guide

Create `docs/gluestack-migration.md` with:
- Before/after examples for common patterns
- Component mapping reference (View → Box, etc.)
- Form pattern template
- Toast usage examples
- Common pitfalls and solutions

## Benefits

**Immediate benefits:**
- Consistent design system across all screens
- Better accessibility out of the box
- Easier theming and style updates
- Less custom styling code to maintain
- Professional UI components with built-in best practices

**Future benefits:**
- Foundation for dark mode support
- Easy theme customization for rebranding
- Faster feature development with component library
- Better maintenance with fewer custom styles
- Improved developer experience with semantic components

## Future Considerations

- Dark mode support (gluestack themes make this easy)
- Custom component variants (if needed for brand consistency)
- Additional theme tokens for brand colors
- Shared form components to reduce duplication
- Animation and transition enhancements via gluestack

## Next Steps

1. ✅ Design approved
2. Write detailed implementation plan with code examples
3. Set up git worktree for isolated refactor work
4. Execute refactor phase by phase with validation
5. Update project documentation
6. End-to-end testing before merge
