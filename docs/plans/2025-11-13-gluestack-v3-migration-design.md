# Gluestack UI v3 + NativeWind Migration Design

**Date:** 2025-11-13
**Status:** Design Phase
**Target:** Complete UI library modernization while maintaining mobile-native UX

## Executive Summary

Migrate Bonfire from Gluestack UI v1 (bundled library with utility props) to Gluestack UI v3 (copy-pasteable components with Tailwind/NativeWind) while keeping Expo SDK 54 and React Native 0.81.5 stable. This migration modernizes the UI layer, improves developer experience with Tailwind CSS, and enables opportunistic UX improvements.

**Timeline:** 4-5 days of focused work
**Risk Level:** Medium (isolated worktree, thorough testing)

## Goals

### Primary Goals
1. ✅ Modernize UI library to Gluestack v3 with NativeWind/Tailwind
2. ✅ Maintain all existing functionality (auth flows, profiles, OAuth)
3. ✅ Improve mobile-native UX patterns
4. ✅ Enhance accessibility (VoiceOver/TalkBack)
5. ✅ Keep platform stability (Expo 54, RN 0.81.5)

### Non-Goals
- ❌ Upgrade Expo SDK or React Native (already latest stable)
- ❌ Change database schema or backend logic
- ❌ Add web-style patterns to mobile app
- ❌ Rewrite business logic or state management

## Current vs Target Stack

### Current Stack (2025-01)
```json
{
  "expo": "~54.0.23",
  "react-native": "0.81.5",
  "react": "19.1.0",
  "@gluestack-ui/themed": "^1.1.73",
  "@gluestack-style/react": "^1.0.57",
  "@gluestack-ui/config": "^1.1.20"
}
```

### Target Stack
```json
{
  "expo": "~54.0.23",           // No change
  "react-native": "0.81.5",     // No change
  "react": "19.1.0",            // No change
  "nativewind": "^4.0.36",      // NEW
  "tailwindcss": "^3.4.1"       // NEW
  // Gluestack v3 components (copy-pasted, not npm)
}
```

### What's Changing

**Removing:**
- `@gluestack-style/react` - proprietary styling engine
- `@gluestack-ui/config` - v1 theme config
- `@gluestack-ui/themed` - v1 bundled components

**Adding:**
- `nativewind` - Tailwind CSS for React Native
- `tailwindcss` - CSS utility framework
- Gluestack v3 components (via CLI, copy-pasted into `components/ui/`)

**Key Architectural Shift:**
- **v1:** npm install components, use utility props (`bg="$primary500"`)
- **v3:** Copy-paste components, use Tailwind classes (`className="bg-primary-500"`)

## Migration Strategy

### Approach: Methodical, Phased, Isolated

1. **Use git worktree** for complete isolation from main branch
2. **Set up foundation** (NativeWind, Tailwind, Gluestack v3 CLI)
3. **Migrate screen-by-screen** with testing between each
4. **Improve UX opportunistically** (mobile-native patterns)
5. **Thorough testing** before merging to main

### Why This Approach?

- ✅ Main branch stays stable during migration
- ✅ Can test thoroughly without pressure
- ✅ Easy to abandon if issues arise
- ✅ Screen-by-screen reduces risk
- ✅ Testing between phases catches issues early

## Phase 1: Foundation Setup (Day 1, ~4-6 hours)

### Step 1.1: Create Isolated Worktree

```bash
# From bonfire root
git worktree add .worktrees/gluestack-v3-migration main
cd .worktrees/gluestack-v3-migration

# Update Supabase config to avoid Docker conflicts
# Edit supabase/config.toml
# Change: project_id = "bonfire-gluestack-v3"
```

### Step 1.2: Install NativeWind & Tailwind

```bash
cd app
pnpm add nativewind@^4.0.36
pnpm add -D tailwindcss@^3.4.1
```

### Step 1.3: Configure Build Tools

**Create `tailwind.config.js`:**
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
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        background: {
          light: '#FFFFFF',
          dark: '#111827',
        },
        typography: {
          500: '#6B7280',
          900: '#111827',
        },
        error: {
          500: '#EF4444',
        },
      },
    },
  },
  plugins: [],
}
```

**Create `global.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Update `metro.config.js`:**
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Update `babel.config.js`:**
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

**Update `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Step 1.4: Initialize Gluestack v3

```bash
npx gluestack-ui@latest init
```

Creates:
- `components/ui/gluestack-ui-provider/` - Provider setup
- Base configuration for copy-paste components

### Step 1.5: Update Root Layout

**Modify `app/app/_layout.tsx`:**
```typescript
import '../global.css'; // Import Tailwind styles
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

### Step 1.6: Install Core Components

```bash
npx gluestack-ui add button
npx gluestack-ui add input
npx gluestack-ui add form-control
npx gluestack-ui add toast
npx gluestack-ui add spinner
```

### Step 1.7: Test Build

```bash
pnpm start
# Expected: App builds but UI is broken (this is normal!)
```

**Success criteria:**
- ✅ App compiles without TypeScript errors
- ✅ Metro bundler runs successfully
- ✅ NativeWind processes Tailwind classes
- ❌ UI looks broken (expected - old components don't work)

## Phase 2: Component Migration (Days 2-4, ~12-16 hours)

### Migration Pattern

**Before (Gluestack v1):**
```tsx
import { Box, VStack, Button, ButtonText } from '@gluestack-ui/themed';

<Box bg="$white" p="$4" flex={1}>
  <VStack space="md">
    <Button bg="$primary500">
      <ButtonText>Sign In</ButtonText>
    </Button>
  </VStack>
</Box>
```

**After (Gluestack v3):**
```tsx
import { View } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';

<View className="bg-white p-4 flex-1">
  <VStack className="gap-3">
    <Button className="bg-primary-500">
      <ButtonText>Sign In</ButtonText>
    </Button>
  </VStack>
</View>
```

### Design Token Mapping

| Gluestack v1 | Tailwind v3 | Usage |
|--------------|-------------|-------|
| `$white` | `bg-white` | Backgrounds |
| `$primary500` | `bg-primary-500` | Primary actions |
| `$black` | `bg-black` | Apple button |
| `$red500` | `bg-error-500` | Error states |
| `p="$4"` | `p-4` | Padding |
| `mt="$2"` | `mt-2` | Margin top |
| `flex={1}` | `flex-1` | Flex grow |
| `space="md"` | `gap-3` | Stack spacing |

### Migration Order (Least to Most Complex)

**Day 2:**
1. Select Nickname screen (simplest - single form)
2. Sign In screen
3. Sign Up screen

**Day 3:**
4. Profile screen (complex - image picker, validation)
5. OAuth Button component

**Day 4:**
6. Auth layout
7. App layout
8. Polish and final testing

### Mobile-Native UX Improvements

**Add to each screen where appropriate:**

1. **Haptic Feedback**
```typescript
import * as Haptics from 'expo-haptics';

const handlePress = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // ... rest of logic
};
```

2. **Keyboard Handling**
```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1"
>
  {/* Form content */}
</KeyboardAvoidingView>
```

3. **Native Loading States**
```tsx
import { ActivityIndicator } from 'react-native';

<Button disabled={loading}>
  {loading ? (
    <ActivityIndicator size="small" color="white" />
  ) : (
    <ButtonText>Sign In</ButtonText>
  )}
</Button>
```

4. **Accessibility**
```tsx
<Button
  accessible={true}
  accessibilityLabel="Sign in to your account"
  accessibilityHint="Double tap to sign in"
  accessibilityRole="button"
>
  <ButtonText>Sign In</ButtonText>
</Button>
```

5. **Pull-to-Refresh (Profile Screen)**
```tsx
import { RefreshControl, ScrollView } from 'react-native';

<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
  {/* Profile content */}
</ScrollView>
```

### Testing Strategy Per Screen

For each migrated screen:
1. ✅ Visual regression (screenshot comparison)
2. ✅ Functionality (all interactions work)
3. ✅ Error states (validation, network errors)
4. ✅ Loading states (spinners, disabled buttons)
5. ✅ Navigation flows (routing)
6. ✅ OAuth flows (Apple/Google)
7. ✅ Accessibility (VoiceOver/TalkBack)

## Phase 3: Polish (Day 5, ~4-6 hours)

### Platform-Specific Enhancements

**iOS:**
- Safe area insets (notch/dynamic island)
- Native keyboard behavior
- iOS-specific haptics

**Android:**
- Back button handling
- Edge-to-edge display
- Material Design ripple effects

### Performance Verification

**Mobile-specific checks:**
- ✅ App startup time < 2s on mid-range devices
- ✅ Screen transitions smooth (60fps)
- ✅ Image loading optimized
- ✅ Bundle size < 50MB
- ✅ Memory usage stable

### Final Testing Checklist

**Device testing (physical devices, not simulators):**
- ✅ iPhone with notch (safe area insets)
- ✅ Android with gesture navigation
- ✅ Low-end device (performance)
- ✅ Airplane mode (offline behavior)
- ✅ Background/foreground transitions
- ✅ Deep linking (OAuth callbacks)

**Flow testing:**
- ✅ Fresh install → sign up → profile → sign out → sign in
- ✅ OAuth (Apple) → auto-nickname
- ✅ OAuth (Google) → nickname conflict
- ✅ Account linking (email matches)
- ✅ Profile picture upload
- ✅ App backgrounding during OAuth

## Phase 4: Deployment (Day 5, ~2-3 hours)

### Documentation Updates

Create/update:
- `docs/MIGRATION_GLUESTACK_V3.md` - Migration details
- Update `CLAUDE.md` - New stack info
- Component mapping guide
- Tailwind token reference

### Merge Strategy

```bash
# Commit all changes
git add .
git commit -m "feat: migrate to Gluestack UI v3 with NativeWind

- Replace Gluestack v1 with v3 (copy-pasteable components)
- Add NativeWind v4 + Tailwind CSS
- Migrate all screens to Tailwind className syntax
- Improve mobile UX (haptics, keyboards, accessibility)
- Update component patterns and documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push and create PR
git push -u origin gluestack-v3-migration
gh pr create --title "Migrate to Gluestack UI v3 + NativeWind" --body "..."

# After approval
git checkout main
git merge gluestack-v3-migration
git worktree remove .worktrees/gluestack-v3-migration
```

## Risk Assessment

### Medium Risks
- **UI regression:** Thorough testing per screen mitigates
- **Build config errors:** Test builds frequently
- **Performance impact:** Monitor bundle size and runtime

### Low Risks
- **Breaking OAuth flows:** No backend changes
- **Data loss:** No database changes
- **Platform instability:** Not upgrading Expo/RN

### Mitigation Strategies
1. Use isolated worktree (easy rollback)
2. Test each screen thoroughly before moving on
3. Maintain parallel v1 implementation until v3 works
4. Test on physical devices, not just simulators

## Success Criteria

**Must have:**
- ✅ All screens migrated to Gluestack v3
- ✅ All auth flows working (email, Apple, Google)
- ✅ Profile creation and updates working
- ✅ Production builds successful (iOS + Android)
- ✅ No TypeScript errors
- ✅ Performance maintained or improved

**Nice to have:**
- ✅ Improved accessibility scores
- ✅ Better loading states
- ✅ Enhanced mobile UX patterns
- ✅ Comprehensive documentation

## Timeline Summary

**Day 1:** Foundation setup (worktree, NativeWind, Tailwind, Gluestack v3)
**Day 2:** Migrate auth screens (select-nickname, sign-in, sign-up)
**Day 3:** Migrate profile screen + OAuth component
**Day 4:** Migrate layouts + UX polish
**Day 5:** Testing, documentation, deployment

**Total:** 4-5 days focused work

## Next Steps

1. Review and approve this design
2. Create worktree and start Phase 1
3. Proceed methodically through phases
4. Test thoroughly at each step
5. Document learnings and issues

---

**Design Status:** Ready for implementation
**Approved By:** [To be filled]
**Implementation Start:** [To be scheduled]
