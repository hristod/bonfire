# Supabase OAuth Configuration

This document describes how to configure Apple and Google OAuth providers in Supabase.

## Prerequisites

- Supabase project (local or hosted)
- Apple Developer Account (for Apple Sign-In)
- Google Cloud Project (for Google Sign-In)

## Apple Sign-In Configuration

### 1. Apple Developer Setup

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Create an App ID for Bonfire
   - Bundle ID: `com.bonfire.app` (matches app.json)
   - Enable "Sign In with Apple" capability
3. Create a Services ID
   - Identifier: `com.bonfire.app.service`
   - Enable "Sign In with Apple"
   - Configure Return URLs:
     - Development: `http://127.0.0.1:54321/auth/v1/callback`
     - Production: `https://your-project.supabase.co/auth/v1/callback`

### 2. Supabase Dashboard Setup

1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Apple provider
3. Enter Services ID: `com.bonfire.app.service`
4. Upload your Apple private key (.p8 file)
5. Enter Key ID and Team ID from Apple Developer portal
6. Save configuration

## Google Sign-In Configuration

### 1. Google Cloud Setup

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Configure OAuth consent screen
6. Create OAuth Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://127.0.0.1:54321/auth/v1/callback`
     - Production: `https://your-project.supabase.co/auth/v1/callback`
7. Note the Client ID and Client Secret

### 2. Supabase Dashboard Setup

1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Google provider
3. Enter Client ID and Client Secret from Google Cloud
4. Save configuration

## Account Linking Configuration

1. Go to Authentication > Settings in Supabase Dashboard
2. Under "Security and Protection"
3. Enable "Automatic account linking"
4. This allows users with same email across providers to link automatically

## Local Testing

For local development:
- Use Supabase CLI: `pnpm supabase start`
- OAuth redirect: `http://127.0.0.1:54321/auth/v1/callback`
- Mobile app redirect: `exp://127.0.0.1:8081/--/auth/callback`

## Production Deployment

Before deploying:
- Update OAuth redirect URLs in Apple/Google consoles
- Update Supabase production provider settings
- Test OAuth flows on physical devices
