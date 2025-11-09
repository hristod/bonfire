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
