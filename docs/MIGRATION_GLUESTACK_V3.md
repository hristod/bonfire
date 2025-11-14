# Gluestack UI v3 Migration Guide

## What Changed

This migration updates the Bonfire app from Gluestack UI v1 to v3, fundamentally changing how we style and structure UI components.

### High-Level Changes

- **UI Library:** Gluestack UI v1 → v3
- **Styling System:** gluestack-style with utility props → NativeWind/Tailwind CSS with className
- **Component Distribution:** npm packages → copy-pasteable components in codebase
- **Configuration:** Centralized config → Individual component files

## Component Mapping

### Layout Components

| v1 Component | v3 Replacement | Notes |
|--------------|----------------|-------|
| `Box` | `View` with `className` | Use React Native's View directly |
| `VStack` | Custom `VStack` component | Custom wrapper around View with flex-col |
| `HStack` | Custom `HStack` component | Custom wrapper around View with flex-row |
| `ScrollView` | `ScrollView` with `className` | Use React Native's ScrollView |

### Form Components

| v1 Component | v3 Replacement | Notes |
|--------------|----------------|-------|
| `FormControl` | `FormControl` (v3) | New component structure |
| `FormControlLabel` | `FormControlLabel` (v3) | Same name, different implementation |
| `FormControlError` | `FormControlError` (v3) | Same name, different implementation |
| `Input` / `InputField` | `Input` / `InputField` (v3) | Same API, new styling |

### Interactive Components

| v1 Component | v3 Replacement | Notes |
|--------------|----------------|-------|
| `Button` / `ButtonText` | `Button` / `ButtonText` (v3) | Same API, new styling |
| `ButtonSpinner` | `ActivityIndicator` | Use React Native's ActivityIndicator |
| `Spinner` | `Spinner` (v3) or `ActivityIndicator` | v3 component or native |
| `Toast` | `Toast` (v3) | New component structure |

### Typography

| v1 Component | v3 Replacement | Notes |
|--------------|----------------|-------|
| `Text` with props | `Text` with `className` | Use React Native's Text |
| `Heading` | `Text` with `className` | Style with Tailwind classes |

## Styling Changes

### Before (v1): Utility Props

```tsx
import { Box, VStack, Text, Button, ButtonText } from '@gluestack-ui/themed';

<Box bg="$white" p="$4" borderRadius="$md">
  <VStack space="md">
    <Text color="$primary500" size="lg" fontWeight="$bold">
      Hello World
    </Text>
    <Button bg="$primary600" size="lg">
      <ButtonText>Click Me</ButtonText>
    </Button>
  </VStack>
</Box>
```

### After (v3): Tailwind CSS Classes

```tsx
import { View, Text } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';

<View className="bg-white p-4 rounded-md">
  <VStack space="md">
    <Text className="text-primary-500 text-lg font-bold">
      Hello World
    </Text>
    <Button className="bg-primary-600" size="lg">
      <ButtonText>Click Me</ButtonText>
    </Button>
  </VStack>
</View>
```

### Color Tokens

| v1 Token | v3 Tailwind Class | Hex Value |
|----------|-------------------|-----------|
| `$primary500` | `text-primary-500` or `bg-primary-500` | #8B5CF6 |
| `$primary600` | `text-primary-600` or `bg-primary-600` | #7C3AED |
| `$white` | `bg-white` or `text-white` | #FFFFFF |
| `$black` | `bg-black` or `text-black` | #000000 |
| `$error500` | `text-error-500` or `bg-error-500` | #EF4444 |
| `$success500` | `text-success-500` or `bg-success-500` | #10B981 |

### Spacing

| v1 Prop | v3 Tailwind Class |
|---------|-------------------|
| `p="$1"` | `p-1` (4px) |
| `p="$2"` | `p-2` (8px) |
| `p="$4"` | `p-4` (16px) |
| `p="$6"` | `p-6` (24px) |
| `space="md"` | `space-3` or custom via VStack/HStack |

### Common Patterns

**Loading States:**
```tsx
// Before (v1)
<Button>
  {loading && <ButtonSpinner />}
  <ButtonText>Submit</ButtonText>
</Button>

// After (v3)
import { ActivityIndicator } from 'react-native';

<Button>
  {loading ? (
    <ActivityIndicator size="small" color="white" />
  ) : (
    <ButtonText>Submit</ButtonText>
  )}
</Button>
```

**Form Validation:**
```tsx
// Before (v1)
<FormControl isInvalid={!!errors.field}>
  <FormControlLabel>
    <FormControlLabelText>Email</FormControlLabelText>
  </FormControlLabel>
  <Input>
    <InputField placeholder="you@example.com" />
  </Input>
  <FormControlError>
    <FormControlErrorText>{errors.field?.message}</FormControlErrorText>
  </FormControlError>
</FormControl>

// After (v3) - Same API!
<FormControl isInvalid={!!errors.field}>
  <FormControlLabel>
    <FormControlLabelText>Email</FormControlLabelText>
  </FormControlLabel>
  <Input>
    <InputField placeholder="you@example.com" />
  </Input>
  <FormControlError>
    <FormControlErrorText>{errors.field?.message}</FormControlErrorText>
  </FormControlError>
</FormControl>
```

## Mobile UX Improvements

Beyond the visual migration, we added several mobile-native improvements:

### KeyboardAvoidingView

All form screens now use `KeyboardAvoidingView` to prevent the keyboard from covering inputs:

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1"
>
  <ScrollView>
    {/* Form content */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Pull-to-Refresh

Profile and list screens support pull-to-refresh:

```tsx
import { RefreshControl } from 'react-native';

const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await reloadData();
  setRefreshing(false);
};

<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
  {/* Content */}
</ScrollView>
```

### Native Components

Prefer native React Native components over custom wrappers:

- `ActivityIndicator` instead of `ButtonSpinner`
- `Text` with className instead of custom `Text`
- `View` with className instead of `Box`

### Platform-Specific Behavior

Use `Platform.OS` for platform-specific adjustments:

```tsx
import { Platform } from 'react-native';

<View className={Platform.OS === 'ios' ? 'pt-safe-area' : 'pt-4'}>
```

## Configuration Files

### New Files Created

1. **`app/tailwind.config.js`** - Tailwind CSS configuration with custom colors
2. **`app/global.css`** - Tailwind directives
3. **`app/components/ui/`** - Copy-pasted Gluestack v3 components
4. **`app/components/ui/vstack/index.tsx`** - Custom VStack wrapper
5. **`app/components/ui/hstack/index.tsx`** - Custom HStack wrapper

### Modified Files

1. **`app/metro.config.js`** - Added NativeWind integration
2. **`app/babel.config.js`** - Added NativeWind and JSX import source
3. **`app/tsconfig.json`** - Added path alias for `@/*` imports
4. **`app/app/_layout.tsx`** - Import global.css, use GluestackUIProvider v3

### Removed Dependencies

```json
{
  "@gluestack-ui/themed": "REMOVED",
  "@gluestack-ui/config": "REMOVED",
  "@gluestack-style/react": "REMOVED"
}
```

### Added Dependencies

```json
{
  "nativewind": "^4.0.36",
  "tailwindcss": "^3.4.1",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0"
}
```

## Migration Checklist for New Screens

When creating new screens or components:

- [ ] Import `View` from `react-native` instead of `Box` from gluestack
- [ ] Use `className` prop for styling instead of utility props
- [ ] Import Gluestack v3 components from `@/components/ui/*`
- [ ] Use `VStack` and `HStack` from `@/components/ui/vstack` and `@/components/ui/hstack`
- [ ] Use `ActivityIndicator` from `react-native` for loading states
- [ ] Add `KeyboardAvoidingView` for forms
- [ ] Use Tailwind color classes from `tailwind.config.js`
- [ ] Test on both iOS and Android
- [ ] Verify accessibility (labels, hints, roles)

## Testing

All existing functionality was tested and verified:

### Authentication Flows
- ✅ Email/password sign-up
- ✅ Email/password sign-in
- ✅ OAuth with Apple
- ✅ OAuth with Google
- ✅ Account linking (same email across providers)
- ✅ Nickname conflict resolution

### Profile Features
- ✅ Profile view
- ✅ Profile editing
- ✅ Avatar upload
- ✅ Avatar display
- ✅ Pull-to-refresh

### Platform Testing
- ✅ iOS Simulator
- ✅ Android Emulator
- ✅ Physical devices (both platforms)

### Build Testing
- ✅ Development builds (EAS)
- ✅ Metro bundler compiles successfully
- ✅ No TypeScript errors
- ✅ No console warnings (related to migration)

## Troubleshooting

### Common Issues

**Issue:** `className` prop not working
- **Solution:** Ensure `import '../global.css'` is in `_layout.tsx` and Metro is configured correctly

**Issue:** Tailwind classes not applying
- **Solution:** Check that file paths are in `tailwind.config.js` content array

**Issue:** Components not found
- **Solution:** Run `npx gluestack-ui add <component-name>` to install missing components

**Issue:** Type errors on Gluestack components
- **Solution:** Ensure you're importing from v3 components (`@/components/ui/*`), not v1 packages

**Issue:** Colors not matching design
- **Solution:** Check `tailwind.config.js` theme.extend.colors for custom color tokens

### Metro Cache Issues

If you see old styling or components not updating:

```bash
cd app
rm -rf node_modules/.cache
pnpm start --clear
```

### TypeScript Errors

After migration, run:

```bash
npx tsc --noEmit
```

This should show no errors. If you see errors about old imports, search for remaining v1 imports:

```bash
grep -r "@gluestack-ui/themed" app/
```

## Performance Considerations

### Bundle Size

Gluestack v3 with NativeWind results in:
- **Smaller initial bundle** (no full component library)
- **Better tree-shaking** (only components you use)
- **Slightly larger first-time CSS generation** (Tailwind processing)

### Runtime Performance

- **No change** in runtime performance
- Tailwind classes compile to React Native styles at build time
- No performance difference between v1 utility props and v3 className

### Developer Experience

- **Faster iteration** (change Tailwind classes without recompiling)
- **Better autocomplete** (Tailwind IntelliSense)
- **More familiar** for developers with web experience

## Resources

### Documentation
- [Gluestack UI v3 Docs](https://ui.gluestack.io/)
- [NativeWind Docs](https://www.nativewind.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Migration Support
- [Gluestack v1 to v3 Migration Guide](https://ui.gluestack.io/docs/migration)
- [NativeWind Setup Guide](https://www.nativewind.dev/quick-starts/expo)

### Internal References
- Component examples: `app/components/ui/*/index.tsx`
- Screen examples: `app/app/(auth)/sign-in.tsx`, `app/app/(app)/profile.tsx`
- Tailwind config: `app/tailwind.config.js`

## Summary

This migration modernizes our styling approach while maintaining all existing functionality. The move to Tailwind CSS aligns us with industry standards, improves developer experience, and provides better tooling support. The component-based approach of Gluestack v3 gives us full control over our UI layer while reducing dependency complexity.

**No breaking changes for end users** - all features work exactly as before, with improved mobile-native UX enhancements.
