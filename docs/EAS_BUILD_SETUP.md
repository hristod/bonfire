# EAS Build Setup Guide

This document explains how to build your Bonfire app using Expo Application Services (EAS).

## Prerequisites

1. **Expo account** - Sign up at https://expo.dev
2. **EAS CLI** - Available via `pnpm dlx eas-cli` (no global install needed)
3. **Environment variables** - Set up your `.env` file (see `app/.env.md`)

## Initial Setup

### 1. Login to EAS

```bash
pnpm dlx eas-cli login
```

### 2. Configure Your Project

```bash
pnpm dlx eas-cli build:configure
```

This was already done - the `eas.json` file is configured with three build profiles:
- **development** - For testing with Expo Dev Client (includes debugging tools)
- **preview** - Internal testing builds (APK for Android)
- **production** - Store submission builds

## Building Your App

### Development Builds (Recommended for Testing)

Development builds include the Expo Dev Client, which allows you to:
- Load your app from Metro bundler
- Use debugging tools
- Test native changes

**Android:**
```bash
pnpm build:dev:android
```

**iOS:**
```bash
pnpm build:dev:ios
```

### Preview Builds (Internal Testing)

Preview builds are optimized but still allow internal distribution:

```bash
# Android APK
pnpm dlx eas-cli build --profile preview --platform android

# iOS for TestFlight
pnpm dlx eas-cli build --profile preview --platform ios
```

### Production Builds (Store Submission)

Production builds for App Store and Google Play Store:

```bash
# Both platforms
pnpm build

# Or individually
pnpm dlx eas-cli build --profile production --platform android
pnpm dlx eas-cli build --profile production --platform ios
```

## Build Profiles Explained

### Development Profile

```json
{
  "developmentClient": true,
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

- Builds include Expo Dev Client
- APK format for easy Android installation
- Internal distribution (not for stores)
- Can connect to local Metro bundler

### Preview Profile

```json
{
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

- Production-like builds
- APK for easy sharing
- Good for QA testing

### Production Profile

```json
{
  "ios": {
    "resourceClass": "m-medium"
  },
  "android": {
    "resourceClass": "medium"
  }
}
```

- AAB for Google Play Store
- Optimized for store submission
- Full production optimizations

## Installing Builds

### Android

After build completes:

```bash
# Install latest build on connected device/emulator
pnpm dlx eas-cli build:run -p android --latest
```

Or download APK from the EAS dashboard and install manually:
```bash
adb install path/to/build.apk
```

### iOS

For iOS simulator builds:
```bash
pnpm dlx eas-cli build:run -p ios --latest
```

For device testing, use TestFlight (requires preview/production build).

## Managing Environment Variables

### For EAS Builds

Set secrets that will be used during builds:

```bash
# Required for Supabase
pnpm dlx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
pnpm dlx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."

# Optional - OAuth credentials
pnpm dlx eas-cli secret:create --name EXPO_PUBLIC_APPLE_CLIENT_ID --value "..."
pnpm dlx eas-cli secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID --value "..."
```

List all secrets:
```bash
pnpm dlx eas-cli secret:list
```

### Per-Profile Environment Variables

You can also set environment variables in `eas.json`:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

## Build Status and Logs

### Check Build Status

```bash
pnpm dlx eas-cli build:list
```

### View Build Details

```bash
pnpm dlx eas-cli build:view [BUILD_ID]
```

### Monitor Active Build

The CLI will provide a link to monitor your build in real-time on the EAS dashboard.

## Troubleshooting

### Build Failed with Gradle Error (react-native-reanimated)

The most common issue is incompatible dependency versions. This was fixed by:

1. **Installed correct dependency versions for React Native 0.81.5:**
   - `react-native-reanimated@~3.19.0` (required by gluestack-ui, RN 0.81 compatible)
   - `react-native-gesture-handler@latest` (~2.29.1, RN 0.81 compatible)
   - `expo-build-properties@^1.0.9` (for Android build optimization)
   - **Note:** `react-native-worklets` is NOT needed - Reanimated 3.19.x includes worklets internally

2. **Added Babel configuration:**
   - Created `babel.config.js` with Reanimated plugin

3. **Updated app.config.js:**
   - Added `expo-build-properties` plugin for Android optimization

**Why these specific versions?**
- Expo SDK 54 uses React Native 0.81.5, which is very new (September 2025)
- Older versions have compilation errors with RN 0.81's breaking API changes

**Reanimated 3.19.x fixes:**
- `Systrace.TRACE_TAG_REACT_JAVA_BRIDGE` symbol removed in RN 0.81
- `LengthPercentage.resolve()` API signature changed
- React Native 0.80+ compatibility
- **Includes worklets internally** - do NOT install `react-native-worklets` separately

**Gesture Handler 2.29.x fixes:**
- `getEventDispatcher()` method signature changed
- `BaseReactPackage` interface changes (getViewManagerNames, createViewManager)
- React Native 0.81 ViewManager API updates
- Use latest version (`@latest`) for best RN 0.81 compatibility

**Important Notes:**
- Reanimated 4.x may be incompatible with RN 0.81.5
- Gesture Handler < 2.29.x is incompatible with RN 0.81.5
- Earlier Reanimated versions (3.16.x and below) required separate `react-native-worklets` package
- Reanimated 3.19.x+ bundles worklets internally - installing both causes duplicate class errors

### Environment Variables Not Working

1. Ensure variable names start with `EXPO_PUBLIC_`
2. Check secrets are set: `pnpm dlx eas-cli secret:list`
3. Secrets are only used during cloud builds (not local development)

### iOS Build Requires Apple Developer Account

For iOS builds, you need:
- Apple Developer account ($99/year)
- EAS will guide you through certificate setup

### Android Keystore

EAS automatically manages Android keystores for you. On first build:
- EAS creates a new keystore
- Stores it securely
- Reuses it for all future builds

## Build Performance

Build times depend on resource class:

- **medium** - ~10-15 minutes (default)
- **m-medium** (iOS) - ~10-15 minutes (M1 Mac)
- **large** - ~8-12 minutes (faster, costs more credits)

You can change resource class in `eas.json`.

## Cost and Credits

- Free tier: Limited builds per month
- Paid tiers: More builds and faster resource classes
- See: https://expo.dev/pricing

## Common Commands Reference

```bash
# Login
pnpm dlx eas-cli login

# Build development
pnpm build:dev:android
pnpm build:dev:ios

# Build production
pnpm build

# List builds
pnpm dlx eas-cli build:list

# Install build
pnpm dlx eas-cli build:run -p android --latest

# Manage secrets
pnpm dlx eas-cli secret:list
pnpm dlx eas-cli secret:create --name NAME --value "VALUE"
pnpm dlx eas-cli secret:delete --name NAME

# View credentials
pnpm dlx eas-cli credentials
```

## Next Steps

1. Complete your `.env` file with Supabase credentials
2. Set EAS secrets for cloud builds
3. Run a development build to test
4. Once working, create preview builds for QA
5. Submit production builds to stores

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Build Configuration](https://docs.expo.dev/build-reference/eas-json/)
- [Environment Variables in EAS](https://docs.expo.dev/build-reference/variables/)
- [App Signing with EAS](https://docs.expo.dev/app-signing/app-credentials/)
