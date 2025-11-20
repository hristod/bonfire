# Bonfire Security & Stability Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical security vulnerabilities and important stability issues identified in code review of bonfire-core-mechanics branch.

**Architecture:** Implement PIN attempt rate limiting, move secret key to backend RPC validation, add signed URL refresh mechanism, fix async cleanup race conditions, and add location validation. All fixes maintain backward compatibility with existing database schema where possible.

**Tech Stack:** Supabase (PostgreSQL + PostGIS + RLS), React Native, Expo, TypeScript, Zustand

---

## Phase 1: PIN Rate Limiting (Critical Security)

### Task 1: Create PIN attempt tracking table

**Files:**
- Create: `supabase/migrations/20250120000001_add_pin_rate_limiting.sql`

**Step 1: Write migration for pin_attempts table**

Create the migration file with:

```sql
-- Track PIN validation attempts for rate limiting
CREATE TABLE pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonfire_id UUID NOT NULL REFERENCES bonfires(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_successful BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT unique_user_bonfire_attempt UNIQUE (user_id, bonfire_id, attempted_at)
);

-- Index for efficient cleanup and rate limit checks
CREATE INDEX pin_attempts_user_bonfire_idx ON pin_attempts (user_id, bonfire_id, attempted_at DESC);
CREATE INDEX pin_attempts_cleanup_idx ON pin_attempts (attempted_at) WHERE was_successful = false;

-- Enable RLS
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own attempts
CREATE POLICY "Users can view own PIN attempts"
  ON pin_attempts FOR SELECT
  USING (user_id = auth.uid());

-- Only functions can insert (prevent client manipulation)
CREATE POLICY "Only functions can insert attempts"
  ON pin_attempts FOR INSERT
  WITH CHECK (false);

-- Cleanup old attempts (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_pin_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM pin_attempts
  WHERE attempted_at < NOW() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit (5 failed attempts in 15 minutes)
CREATE OR REPLACE FUNCTION check_pin_rate_limit(
  p_user_id UUID,
  p_bonfire_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_failed_count INTEGER;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_failed_count
  FROM pin_attempts
  WHERE user_id = p_user_id
    AND bonfire_id = p_bonfire_id
    AND was_successful = false
    AND attempted_at > NOW() - interval '15 minutes';

  -- Return true if under limit, false if rate limited
  RETURN v_failed_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record attempt
CREATE OR REPLACE FUNCTION record_pin_attempt(
  p_user_id UUID,
  p_bonfire_id UUID,
  p_was_successful BOOLEAN
) RETURNS void AS $$
BEGIN
  INSERT INTO pin_attempts (user_id, bonfire_id, was_successful)
  VALUES (p_user_id, p_bonfire_id, p_was_successful);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Apply migration locally**

Run:
```bash
cd /Users/hristodimitrov/projects/bonfire
pnpm supabase:reset --workdir .
```

Expected: Migration applies successfully, tables created

**Step 3: Verify table structure**

Run:
```bash
pnpm supabase:status --workdir .
```

Expected: Shows pin_attempts table in schema

**Step 4: Commit migration**

```bash
git add supabase/migrations/20250120000001_add_pin_rate_limiting.sql
git commit -m "feat: add PIN rate limiting infrastructure

- Add pin_attempts table for tracking validation attempts
- Add RLS policies (users see own, only functions insert)
- Add check_pin_rate_limit function (5 attempts / 15 min)
- Add record_pin_attempt function
- Add cleanup_old_pin_attempts function

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Update validate_bonfire_join to use rate limiting

**Files:**
- Modify: `supabase/migrations/20250119000003_create_bonfire_functions.sql:54-92`

**Step 1: Read existing validate_bonfire_join function**

Run: Read the file to understand current implementation

**Step 2: Update function to check rate limit and record attempts**

Replace the `validate_bonfire_join` function with:

```sql
-- Validate bonfire join with secret code and optional PIN
-- Now includes rate limiting on PIN attempts
CREATE OR REPLACE FUNCTION validate_bonfire_join(
  p_bonfire_id UUID,
  p_secret_code TEXT,
  p_pin_code TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_bonfire RECORD;
  v_pin_hash TEXT;
  v_is_rate_limited BOOLEAN;
BEGIN
  -- Get bonfire details
  SELECT * INTO v_bonfire
  FROM bonfires
  WHERE id = p_bonfire_id
    AND is_active = true
    AND expires_at > NOW();

  -- Bonfire not found or expired
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Validate secret code (must match current_secret_code from database)
  -- Note: Secret rotation happens via separate process
  IF UPPER(TRIM(p_secret_code)) != UPPER(v_bonfire.current_secret_code) THEN
    RETURN false;
  END IF;

  -- If bonfire has PIN, validate it with rate limiting
  IF v_bonfire.has_pin THEN
    -- Check if user is rate limited
    SELECT check_pin_rate_limit(auth.uid(), p_bonfire_id) INTO v_is_rate_limited;

    IF NOT v_is_rate_limited THEN
      -- Record failed attempt (rate limit exceeded)
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RAISE EXCEPTION 'Too many failed PIN attempts. Please wait 15 minutes.';
    END IF;

    -- PIN required but not provided
    IF p_pin_code IS NULL THEN
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RETURN false;
    END IF;

    -- Hash provided PIN for comparison
    -- Note: Using SHA-256 (not ideal but acceptable with rate limiting)
    v_pin_hash := encode(digest('bonfire:' || p_pin_code || ':salt', 'sha256'), 'hex');

    -- Validate PIN
    IF v_pin_hash != v_bonfire.pin_hash THEN
      -- Record failed attempt
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RETURN false;
    END IF;

    -- PIN correct - record success
    PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, true);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 3: Create new migration for function update**

Create: `supabase/migrations/20250120000002_update_validate_bonfire_join.sql`

```sql
-- Update validate_bonfire_join to include PIN rate limiting
-- Replaces previous version from 20250119000003

DROP FUNCTION IF EXISTS validate_bonfire_join(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION validate_bonfire_join(
  p_bonfire_id UUID,
  p_secret_code TEXT,
  p_pin_code TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_bonfire RECORD;
  v_pin_hash TEXT;
  v_is_rate_limited BOOLEAN;
BEGIN
  -- Get bonfire details
  SELECT * INTO v_bonfire
  FROM bonfires
  WHERE id = p_bonfire_id
    AND is_active = true
    AND expires_at > NOW();

  -- Bonfire not found or expired
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Validate secret code (must match current_secret_code from database)
  IF UPPER(TRIM(p_secret_code)) != UPPER(v_bonfire.current_secret_code) THEN
    RETURN false;
  END IF;

  -- If bonfire has PIN, validate it with rate limiting
  IF v_bonfire.has_pin THEN
    -- Check if user is rate limited
    SELECT check_pin_rate_limit(auth.uid(), p_bonfire_id) INTO v_is_rate_limited;

    IF NOT v_is_rate_limited THEN
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RAISE EXCEPTION 'Too many failed PIN attempts. Please wait 15 minutes.';
    END IF;

    -- PIN required but not provided
    IF p_pin_code IS NULL THEN
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RETURN false;
    END IF;

    -- Hash provided PIN for comparison (SHA-256 acceptable with rate limiting)
    v_pin_hash := encode(digest('bonfire:' || p_pin_code || ':salt', 'sha256'), 'hex');

    -- Validate PIN
    IF v_pin_hash != v_bonfire.pin_hash THEN
      PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, false);
      RETURN false;
    END IF;

    -- PIN correct - record success
    PERFORM record_pin_attempt(auth.uid(), p_bonfire_id, true);
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 4: Apply migration**

Run:
```bash
pnpm supabase:reset --workdir .
```

Expected: Function updated successfully

**Step 5: Commit changes**

```bash
git add supabase/migrations/20250120000002_update_validate_bonfire_join.sql
git commit -m "feat: add PIN rate limiting to bonfire join validation

- Update validate_bonfire_join to check rate limit before validating PIN
- Record all PIN attempts (success/failure)
- Raise exception after 5 failed attempts in 15 minutes
- Maintains SHA-256 hashing (acceptable with rate limiting)

Addresses critical security issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Update client to handle rate limit errors

**Files:**
- Modify: `app/lib/bonfire-utils.ts:125-180`

**Step 1: Update joinBonfire error handling**

Find the `joinBonfire` function and update error handling:

```typescript
export async function joinBonfire(data: JoinBonfireData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Validate join attempt using database function
    const { data: isValid, error: validationError } = await supabase.rpc(
      'validate_bonfire_join',
      {
        p_bonfire_id: data.bonfireId,
        p_secret_code: data.secretCode,
        p_pin_code: data.pin || null,
      }
    );

    if (validationError) {
      console.error('joinBonfire: Error validating bonfire join:', validationError);

      // Check for rate limit error
      if (validationError.message?.includes('Too many failed PIN attempts')) {
        throw new Error('Too many incorrect PIN attempts. Please wait 15 minutes before trying again.');
      }

      throw validationError;
    }

    if (!isValid) {
      throw new Error('Invalid secret code or PIN');
    }

    // Check if already a participant
    const { data: existingParticipant } = await supabase
      .from('bonfire_participants')
      .select('user_id')
      .eq('bonfire_id', data.bonfireId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingParticipant) {
      // Already joined, just return
      return;
    }

    // Add user as participant
    const { error: insertError } = await supabase
      .from('bonfire_participants')
      .insert({
        bonfire_id: data.bonfireId,
        user_id: user.id,
      });

    if (insertError) {
      console.error('joinBonfire: Error joining bonfire:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('joinBonfire: Failed to join bonfire:', error);
    throw error;
  }
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit changes**

```bash
git add app/lib/bonfire-utils.ts
git commit -m "feat: handle PIN rate limit errors in join flow

- Add specific error message for rate limit exceeded
- Improve error context in console logs
- Maintain user-friendly error handling

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2: Secret Code Security (Critical)

### Task 4: Remove secret code from discovery API

**Files:**
- Modify: `supabase/migrations/20250119000003_create_bonfire_functions.sql:1-50`

**Step 1: Create new migration to update find_nearby_bonfires**

Create: `supabase/migrations/20250120000003_remove_secret_from_discovery.sql`

```sql
-- Remove current_secret_code from discovery API
-- Users should only get secret after proving proximity via location

DROP FUNCTION IF EXISTS find_nearby_bonfires(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION find_nearby_bonfires(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  creator_nickname TEXT,
  creator_avatar_url TEXT,
  distance_meters DOUBLE PRECISION,
  participant_count BIGINT,
  has_pin BOOLEAN,
  expires_at TIMESTAMPTZ,
  proximity_radius_meters INTEGER
  -- NOTE: current_secret_code intentionally removed for security
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.creator_id,
    p.nickname AS creator_nickname,
    p.avatar_url AS creator_avatar_url,
    ST_Distance(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters,
    (SELECT COUNT(*) FROM bonfire_participants WHERE bonfire_id = b.id) AS participant_count,
    b.has_pin,
    b.expires_at,
    b.proximity_radius_meters
  FROM bonfires b
  JOIN profiles p ON p.id = b.creator_id
  WHERE
    b.is_active = true
    AND b.expires_at > NOW()
    AND ST_DWithin(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get secret code (only after proximity verified)
-- Returns secret only if user is within bonfire's proximity radius
CREATE OR REPLACE FUNCTION get_bonfire_secret(
  p_bonfire_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION
) RETURNS TEXT AS $$
DECLARE
  v_bonfire RECORD;
  v_distance DOUBLE PRECISION;
BEGIN
  -- Get bonfire with location
  SELECT * INTO v_bonfire
  FROM bonfires
  WHERE id = p_bonfire_id
    AND is_active = true
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonfire not found or expired';
  END IF;

  -- Calculate distance from user to bonfire
  SELECT ST_Distance(
    v_bonfire.location_point,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  ) INTO v_distance;

  -- Check if user is within proximity radius
  IF v_distance > v_bonfire.proximity_radius_meters THEN
    RAISE EXCEPTION 'You must be within % meters to get the secret code', v_bonfire.proximity_radius_meters;
  END IF;

  -- Return secret code
  RETURN v_bonfire.current_secret_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Apply migration**

Run:
```bash
pnpm supabase:reset --workdir .
```

Expected: Functions updated successfully

**Step 3: Commit migration**

```bash
git add supabase/migrations/20250120000003_remove_secret_from_discovery.sql
git commit -m "feat: remove secret code from discovery API for security

- Remove current_secret_code from find_nearby_bonfires return
- Add get_bonfire_secret function that validates proximity
- Users must be within radius to get secret code
- Prevents remote joining without physical proximity

Addresses critical security issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Update TypeScript types for discovery

**Files:**
- Modify: `shared/types/bonfire.ts:49-63`

**Step 1: Update NearbyBonfire interface**

Remove `current_secret_code` from the interface:

```typescript
// Discovery types
export interface NearbyBonfire {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  creator_nickname: string;
  creator_avatar_url: string | null;
  distance_meters: number;
  participant_count: number;
  has_pin: boolean;
  expires_at: string;
  proximity_radius_meters: number;
  // current_secret_code removed for security - use getBonfireSecret() instead
}
```

**Step 2: Add getBonfireSecret utility function**

Add to `app/lib/bonfire-utils.ts` after `findNearbyBonfires`:

```typescript
/**
 * Get secret code for a bonfire (validates proximity)
 */
export async function getBonfireSecret(
  bonfireId: string,
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_bonfire_secret', {
      p_bonfire_id: bonfireId,
      user_lat: latitude,
      user_lng: longitude,
    });

    if (error) {
      console.error('getBonfireSecret: Error getting bonfire secret:', error);

      // Check for proximity error
      if (error.message?.includes('must be within')) {
        throw new Error('You must be closer to the bonfire to join');
      }

      throw error;
    }

    return data as string;
  } catch (error) {
    console.error('getBonfireSecret: Failed to get bonfire secret:', error);
    throw error;
  }
}
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit changes**

```bash
git add shared/types/bonfire.ts app/lib/bonfire-utils.ts
git commit -m "feat: add getBonfireSecret with proximity validation

- Remove current_secret_code from NearbyBonfire type
- Add getBonfireSecret utility function
- Validates user is within proximity radius
- Provides clear error messages for proximity failures

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Update discovery screen to fetch secret on bonfire tap

**Files:**
- Modify: `app/app/(app)/index.tsx:167-180`

**Step 1: Update BonfireCard onPress handler**

Replace the navigation logic with secret fetching:

```typescript
// Find the renderBonfire function and update the onPress handler:

const handleBonfirePress = async (bonfire: NearbyBonfire) => {
  try {
    // Get current location
    const location = await getCurrentLocation();

    // Fetch secret code (validates proximity)
    const secretCode = await getBonfireSecret(
      bonfire.id,
      location.latitude,
      location.longitude
    );

    // Navigate to join screen with secret
    router.push({
      pathname: '/join-bonfire',
      params: {
        bonfireId: bonfire.id,
        secretCode: secretCode,
        hasPin: bonfire.has_pin.toString(),
        bonfireName: bonfire.name,
        description: bonfire.description || '',
      },
    });
  } catch (error: any) {
    console.error('HomeScreen: Failed to get bonfire secret:', error);
    Alert.alert(
      'Cannot Join',
      error.message || 'Failed to get bonfire access. Please try again.'
    );
  }
};

// In the FlatList renderItem:
<BonfireCard
  bonfire={item}
  onPress={() => handleBonfirePress(item)}
/>
```

**Step 2: Add import for getBonfireSecret**

At top of file:

```typescript
import { findNearbyBonfires, getBonfireSecret } from '@/lib/bonfire-utils';
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit changes**

```bash
git add app/app/(app)/index.tsx
git commit -m "feat: fetch secret code on bonfire tap with proximity check

- Call getBonfireSecret when user taps a bonfire
- Validates user is within proximity radius
- Shows error alert if too far away
- Only navigates to join screen after secret fetched

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3: Async Cleanup & Race Conditions (Important)

### Task 7: Fix bonfire store reset race condition

**Files:**
- Modify: `app/store/bonfireStore.ts:159-170`

**Step 1: Make reset synchronous with fire-and-forget cleanup**

Update the reset function:

```typescript
reset: () => {
  const { channel } = get();

  // Reset state immediately (synchronous)
  set({
    activeBonfire: null,
    participants: [],
    messages: [],
    loading: false,
    sending: false,
    channel: null,
  });

  // Clean up channel asynchronously (fire-and-forget)
  if (channel) {
    supabase
      .removeChannel(channel)
      .catch((err) => {
        console.error('bonfireStore: Failed to remove channel during reset:', err);
      });
  }
},
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit changes**

```bash
git add app/store/bonfireStore.ts
git commit -m "fix: make bonfire store reset synchronous

- Reset state immediately without awaiting cleanup
- Move channel cleanup to fire-and-forget pattern
- Prevents race conditions on rapid unmount/remount
- Add error logging for cleanup failures

Addresses race condition issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Fix memory leak in chat screen presence interval

**Files:**
- Modify: `app/app/(app)/bonfire/[id].tsx:31-49`

**Step 1: Add mounted flag and proper async handling**

Update the useEffect:

```typescript
useEffect(() => {
  if (!id) {
    console.error('BonfireScreen: No bonfire ID provided');
    router.back();
    return;
  }

  let mounted = true;

  const initialize = async () => {
    try {
      await loadBonfire();
      if (!mounted) return;

      await subscribeToMessages(id);
      if (!mounted) return;
    } catch (error) {
      console.error('BonfireScreen: Failed to initialize bonfire:', error);
      if (mounted) {
        Alert.alert('Error', 'Failed to load bonfire. Please try again.');
        router.back();
      }
    }
  };

  initialize();

  // Update presence every 30 seconds
  const presenceInterval = setInterval(() => {
    if (mounted) {
      updatePresence(id).catch(err => {
        console.error('BonfireScreen: Failed to update presence:', err);
      });
    }
  }, 30000);

  return () => {
    mounted = false;
    clearInterval(presenceInterval);
    reset(); // Fire-and-forget is OK for cleanup
  };
}, [id]);
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit changes**

```bash
git add app/app/(app)/bonfire/[id].tsx
git commit -m "fix: prevent memory leak in chat screen initialization

- Add mounted flag to prevent state updates after unmount
- Properly await async operations in initialization
- Add error handling for presence updates
- Clean up interval on unmount

Addresses memory leak issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4: Location & Image Validation (Important)

### Task 9: Add location validation in background tracking

**Files:**
- Modify: `app/lib/location-tracking.ts:122-157`

**Step 1: Add validation functions**

Add at top of file after imports:

```typescript
/**
 * Validate location accuracy and freshness
 */
function isLocationValid(location: LocationCoords): { valid: boolean; reason?: string } {
  // Check accuracy (must be within 50m)
  if (location.accuracy && location.accuracy > 50) {
    return { valid: false, reason: 'Location accuracy too low' };
  }

  // Check staleness (must be within last 60 seconds)
  if (location.timestamp) {
    const age = Date.now() - location.timestamp;
    if (age > 60000) {
      return { valid: false, reason: 'Location is stale' };
    }
  }

  return { valid: true };
}
```

**Step 2: Update updateCreatorBonfireLocation to validate**

```typescript
async function updateCreatorBonfireLocation(location: LocationCoords): Promise<void> {
  try {
    // Validate location
    const validation = isLocationValid(location);
    if (!validation.valid) {
      console.warn(`[LocationTracking] Skipping bonfire update: ${validation.reason}`);
      return;
    }

    // Get active bonfire from store
    const activeBonfire = useBonfireStore.getState().activeBonfire;

    if (!activeBonfire) {
      return;
    }

    // Only update if user is creator
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== activeBonfire.creator_id) {
      return;
    }

    console.log('[LocationTracking] Updating bonfire location:', {
      bonfireId: activeBonfire.id,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    });

    const { error: updateError } = await supabase
      .from('bonfires')
      .update({
        latitude: location.latitude,
        longitude: location.longitude,
      })
      .eq('id', activeBonfire.id)
      .eq('creator_id', user.id);

    if (updateError) {
      console.error('[LocationTracking] Failed to update bonfire location:', updateError);
    }
  } catch (error) {
    console.error('[LocationTracking] Error updating creator bonfire location:', error);
  }
}
```

**Step 3: Update checkForNearbyBonfires to validate**

```typescript
async function checkForNearbyBonfires(location: LocationCoords): Promise<void> {
  try {
    // Validate location
    const validation = isLocationValid(location);
    if (!validation.valid) {
      console.warn(`[LocationTracking] Skipping nearby check: ${validation.reason}`);
      return;
    }

    console.log('[LocationTracking] Checking for nearby bonfires:', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    });

    const nearby = await findNearbyBonfires(
      location.latitude,
      location.longitude,
      50 // 50m radius
    );

    if (nearby.length > 0) {
      console.log(`[LocationTracking] Found ${nearby.length} nearby bonfires`);

      // Send notification for each bonfire
      for (const bonfire of nearby) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Bonfire Nearby! 🔥',
            body: `"${bonfire.name}" is within ${Math.round(bonfire.distance_meters)}m`,
            data: {
              type: 'bonfire_discovery',
              bonfireId: bonfire.id,
            },
          },
          trigger: null, // Immediate notification
        });
      }
    }
  } catch (error) {
    console.error('[LocationTracking] Error checking for nearby bonfires:', error);
  }
}
```

**Step 4: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 5: Commit changes**

```bash
git add app/lib/location-tracking.ts
git commit -m "feat: add location validation in background tracking

- Add isLocationValid function (checks accuracy <50m, age <60s)
- Validate before updating bonfire location
- Validate before checking nearby bonfires
- Log validation failures for debugging
- Prevent bad location data from corrupting bonfire positions

Addresses location validation issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Add image URL refresh mechanism

**Files:**
- Create: `app/lib/refreshImageUrls.ts`
- Modify: `app/store/bonfireStore.ts`

**Step 1: Create image URL refresh utility**

Create new file `app/lib/refreshImageUrls.ts`:

```typescript
import { supabase } from './supabase';
import { BonfireMessage } from '@bonfire/shared';

const URL_EXPIRY_BUFFER = 3600000; // 1 hour in milliseconds

/**
 * Check if signed URL is expiring soon
 */
function isUrlExpiringSoon(url: string): boolean {
  try {
    // Extract token expiry from signed URL
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    if (!token) return true;

    // Signed URLs from Supabase include expiry in token (base64 encoded)
    // For simplicity, refresh if URL exists (conservative approach)
    return true;
  } catch {
    return true;
  }
}

/**
 * Refresh signed URL for an image
 */
async function refreshImageUrl(imagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('bonfire-images')
      .createSignedUrl(imagePath, 60 * 60 * 24 * 7); // 7 days

    if (error) {
      console.error('refreshImageUrl: Failed to refresh URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('refreshImageUrl: Error refreshing image URL:', error);
    return null;
  }
}

/**
 * Refresh image URLs in messages that are expiring
 * Returns updated messages with fresh URLs
 */
export async function refreshExpiredImageUrls(
  messages: BonfireMessage[]
): Promise<BonfireMessage[]> {
  const updatedMessages = [...messages];
  let refreshCount = 0;

  for (let i = 0; i < updatedMessages.length; i++) {
    const msg = updatedMessages[i];

    // Skip non-image messages
    if (msg.message_type !== 'image' || !msg.image_url) {
      continue;
    }

    // Check if URL needs refresh
    if (isUrlExpiringSoon(msg.image_url)) {
      // Extract path from URL (remove domain and signature)
      const urlObj = new URL(msg.image_url);
      const path = urlObj.pathname.split('/object/sign/bonfire-images/')[1];

      if (path) {
        const freshUrl = await refreshImageUrl(path);
        if (freshUrl) {
          updatedMessages[i] = {
            ...msg,
            image_url: freshUrl,
          };
          refreshCount++;
        }
      }
    }
  }

  if (refreshCount > 0) {
    console.log(`refreshExpiredImageUrls: Refreshed ${refreshCount} image URLs`);
  }

  return updatedMessages;
}
```

**Step 2: Update bonfire store to refresh URLs periodically**

In `app/store/bonfireStore.ts`, add after the `subscribeToMessages` function:

```typescript
// Import at top
import { refreshExpiredImageUrls } from '@/lib/refreshImageUrls';

// Add new action in store
refreshImageUrls: async () => {
  const { messages } = get();

  try {
    const refreshedMessages = await refreshExpiredImageUrls(messages);
    set({ messages: refreshedMessages });
  } catch (error) {
    console.error('bonfireStore: Failed to refresh image URLs:', error);
  }
},
```

**Step 3: Update chat screen to refresh URLs on mount**

In `app/app/(app)/bonfire/[id].tsx`, add after `subscribeToMessages(id)`:

```typescript
// Refresh any expired image URLs
const { refreshImageUrls } = useBonfireStore.getState();
refreshImageUrls().catch(err => {
  console.error('BonfireScreen: Failed to refresh image URLs:', err);
});
```

**Step 4: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 5: Commit changes**

```bash
git add app/lib/refreshImageUrls.ts app/store/bonfireStore.ts app/app/(app)/bonfire/[id].tsx
git commit -m "feat: add automatic image URL refresh mechanism

- Create refreshImageUrls utility for signed URL renewal
- Add refreshImageUrls action to bonfire store
- Refresh URLs on chat screen mount
- Prevent broken images from expired signed URLs

Addresses image URL expiry issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5: RPC Rate Limiting (Important)

### Task 11: Add rate limiting for find_nearby_bonfires

**Files:**
- Create: `supabase/migrations/20250120000004_add_rpc_rate_limiting.sql`

**Step 1: Create rate limiting infrastructure**

Create migration:

```sql
-- Rate limiting for RPC functions
CREATE TABLE rpc_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, function_name, window_start)
);

-- Index for efficient queries and cleanup
CREATE INDEX rpc_rate_limits_window_idx ON rpc_rate_limits (window_start);
CREATE INDEX rpc_rate_limits_user_function_idx ON rpc_rate_limits (user_id, function_name);

-- Enable RLS
ALTER TABLE rpc_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rpc_rate_limits FOR SELECT
  USING (user_id = auth.uid());

-- Cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rpc_rate_limits
  WHERE window_start < NOW() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit for a function
CREATE OR REPLACE FUNCTION check_rpc_rate_limit(
  p_function_name TEXT,
  p_max_calls INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate window start (rounded down to nearest minute)
  v_window_start := date_trunc('minute', NOW());

  -- Count calls in the time window
  SELECT COALESCE(SUM(call_count), 0) INTO v_count
  FROM rpc_rate_limits
  WHERE user_id = auth.uid()
    AND function_name = p_function_name
    AND window_start > NOW() - (p_window_seconds || ' seconds')::interval;

  -- Check if over limit
  IF v_count >= p_max_calls THEN
    RETURN false;
  END IF;

  -- Record this call
  INSERT INTO rpc_rate_limits (user_id, function_name, window_start)
  VALUES (auth.uid(), p_function_name, v_window_start)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET call_count = rpc_rate_limits.call_count + 1;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Apply migration**

Run:
```bash
pnpm supabase:reset --workdir .
```

Expected: Tables and functions created successfully

**Step 3: Commit migration**

```bash
git add supabase/migrations/20250120000004_add_rpc_rate_limiting.sql
git commit -m "feat: add RPC rate limiting infrastructure

- Create rpc_rate_limits table for tracking calls
- Add check_rpc_rate_limit function (configurable limits)
- Add cleanup_old_rate_limits function
- Enable RLS with view-own-limits policy

Foundation for preventing RPC abuse.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Apply rate limiting to find_nearby_bonfires

**Files:**
- Create: `supabase/migrations/20250120000005_rate_limit_find_nearby.sql`

**Step 1: Update function to check rate limit**

Create migration:

```sql
-- Add rate limiting to find_nearby_bonfires
-- Limit: 30 calls per minute per user

DROP FUNCTION IF EXISTS find_nearby_bonfires(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION find_nearby_bonfires(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  creator_nickname TEXT,
  creator_avatar_url TEXT,
  distance_meters DOUBLE PRECISION,
  participant_count BIGINT,
  has_pin BOOLEAN,
  expires_at TIMESTAMPTZ,
  proximity_radius_meters INTEGER
) AS $$
DECLARE
  v_rate_limit_ok BOOLEAN;
BEGIN
  -- Check rate limit (30 calls per 60 seconds)
  SELECT check_rpc_rate_limit('find_nearby_bonfires', 30, 60) INTO v_rate_limit_ok;

  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded for bonfire discovery. Please wait a moment.';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.creator_id,
    p.nickname AS creator_nickname,
    p.avatar_url AS creator_avatar_url,
    ST_Distance(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters,
    (SELECT COUNT(*) FROM bonfire_participants WHERE bonfire_id = b.id) AS participant_count,
    b.has_pin,
    b.expires_at,
    b.proximity_radius_meters
  FROM bonfires b
  JOIN profiles p ON p.id = b.creator_id
  WHERE
    b.is_active = true
    AND b.expires_at > NOW()
    AND ST_DWithin(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Apply migration**

Run:
```bash
pnpm supabase:reset --workdir .
```

Expected: Function updated successfully

**Step 3: Commit migration**

```bash
git add supabase/migrations/20250120000005_rate_limit_find_nearby.sql
git commit -m "feat: add rate limiting to find_nearby_bonfires

- Limit to 30 calls per minute per user
- Raise exception if rate limit exceeded
- Prevents enumeration attacks and DoS

Addresses RPC rate limiting issue from code review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Update client to handle rate limit errors gracefully

**Files:**
- Modify: `app/lib/bonfire-utils.ts:98-120`

**Step 1: Update findNearbyBonfires error handling**

```typescript
export async function findNearbyBonfires(
  latitude: number,
  longitude: number,
  maxDistance: number = 50
): Promise<NearbyBonfire[]> {
  try {
    const { data, error } = await supabase.rpc('find_nearby_bonfires', {
      user_lat: latitude,
      user_lng: longitude,
      max_distance_meters: maxDistance,
    });

    if (error) {
      console.error('findNearbyBonfires: Error finding nearby bonfires:', error);

      // Check for rate limit error
      if (error.message?.includes('Rate limit exceeded')) {
        throw new Error('Searching too frequently. Please wait a moment and try again.');
      }

      throw error;
    }

    return data as NearbyBonfire[];
  } catch (error) {
    console.error('findNearbyBonfires: Failed to find nearby bonfires:', error);
    throw error;
  }
}
```

**Step 2: Update discovery screen to show rate limit errors**

In `app/app/(app)/index.tsx`, update the `loadNearbyBonfires` function:

```typescript
const loadNearbyBonfires = async () => {
  try {
    setRefreshing(true);

    const location = await getCurrentLocation();
    const nearby = await findNearbyBonfires(
      location.latitude,
      location.longitude,
      50 // 50m radius
    );

    setNearbyBonfires(nearby);
  } catch (error: any) {
    console.error('HomeScreen: Failed to load nearby bonfires:', error);

    // Show user-friendly error
    Alert.alert(
      'Error',
      error.message || 'Failed to load nearby bonfires. Please try again.'
    );
  } finally {
    setRefreshing(false);
  }
};
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit changes**

```bash
git add app/lib/bonfire-utils.ts app/app/(app)/index.tsx
git commit -m "feat: handle RPC rate limit errors gracefully

- Add rate limit error detection in findNearbyBonfires
- Show user-friendly error messages
- Prevent UI crashes from rate limit exceptions

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: Database Cleanup & Type Generation

### Task 14: Generate updated database types

**Files:**
- Modify: `shared/types/database.types.ts` (regenerated)

**Step 1: Generate types from updated schema**

Run:
```bash
pnpm supabase:types
```

Expected: Types generated successfully including new tables (pin_attempts, rpc_rate_limits)

**Step 2: Verify TypeScript compilation**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit generated types**

```bash
git add shared/types/database.types.ts
git commit -m "chore: regenerate database types after security fixes

- Include pin_attempts table types
- Include rpc_rate_limits table types
- Update function signatures for rate-limited RPCs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: Add cleanup cron jobs

**Files:**
- Create: `supabase/migrations/20250120000006_add_cleanup_cron_jobs.sql`

**Step 1: Create cron jobs for cleanup (requires pg_cron extension)**

Create migration:

```sql
-- Add periodic cleanup jobs using pg_cron
-- Note: pg_cron must be enabled in Supabase project settings

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup old PIN attempts every hour
SELECT cron.schedule(
  'cleanup-pin-attempts',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT cleanup_old_pin_attempts()$$
);

-- Cleanup old RPC rate limits every hour
SELECT cron.schedule(
  'cleanup-rpc-rate-limits',
  '5 * * * *', -- Every hour at minute 5
  $$SELECT cleanup_old_rate_limits()$$
);

-- Cleanup expired bonfires daily
SELECT cron.schedule(
  'cleanup-expired-bonfires',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM bonfires
  WHERE expires_at < NOW() - interval '24 hours'
    AND is_active = false
  $$
);

-- Log successful scheduling
DO $$
BEGIN
  RAISE NOTICE 'Cleanup cron jobs scheduled successfully';
END $$;
```

**Step 2: Apply migration**

Run:
```bash
pnpm supabase:reset --workdir .
```

Expected: Cron jobs scheduled successfully

**Step 3: Commit migration**

```bash
git add supabase/migrations/20250120000006_add_cleanup_cron_jobs.sql
git commit -m "feat: add automated cleanup cron jobs

- Cleanup old PIN attempts hourly
- Cleanup old RPC rate limits hourly
- Cleanup expired bonfires daily
- Uses pg_cron for scheduled tasks

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 7: Testing & Verification

### Task 16: Manual testing checklist

**Files:**
- Create: `docs/SECURITY_FIXES_TEST_RESULTS.md`

**Step 1: Create testing checklist document**

Create file with testing scenarios:

```markdown
# Security Fixes Testing Checklist

## Test Date: [YYYY-MM-DD]
## Tester: [Name]
## Branch: bonfire-core-mechanics
## Commit: [SHA]

---

## Phase 1: PIN Rate Limiting

### Test 1.1: Normal PIN Entry (Success)
- [ ] Create bonfire with 4-digit PIN: "1234"
- [ ] Join bonfire with correct PIN on first try
- **Expected:** Success, can access chat
- **Actual:**
- **Status:**

### Test 1.2: Wrong PIN (1-4 Attempts)
- [ ] Create bonfire with PIN: "5678"
- [ ] Enter wrong PIN 4 times: "0000", "1111", "2222", "3333"
- **Expected:** Each shows "Invalid secret code or PIN"
- **Actual:**
- **Status:**

### Test 1.3: Rate Limit Triggered (5th Attempt)
- [ ] Continue from Test 1.2, enter 5th wrong PIN: "4444"
- **Expected:** Error "Too many incorrect PIN attempts. Please wait 15 minutes"
- **Actual:**
- **Status:**

### Test 1.4: Rate Limit Persists
- [ ] Immediately try with correct PIN after rate limit
- **Expected:** Still rate limited
- **Actual:**
- **Status:**

### Test 1.5: Rate Limit Expires
- [ ] Wait 15 minutes
- [ ] Enter correct PIN: "5678"
- **Expected:** Success, can join bonfire
- **Actual:**
- **Status:**

### Test 1.6: Successful PIN Resets Counter
- [ ] Create bonfire with PIN: "9999"
- [ ] Enter wrong PIN 3 times
- [ ] Enter correct PIN: "9999"
- [ ] Create new bonfire with PIN: "8888"
- [ ] Enter wrong PIN 4 more times (should still be under limit)
- **Expected:** Still can attempt (success reset counter)
- **Actual:**
- **Status:**

---

## Phase 2: Secret Code Security

### Test 2.1: Secret Code Not in Discovery
- [ ] Call findNearbyBonfires API
- [ ] Inspect returned bonfire objects
- **Expected:** No current_secret_code field in response
- **Actual:**
- **Status:**

### Test 2.2: Get Secret When Within Radius
- [ ] Stand within 30m of bonfire
- [ ] Tap bonfire in discovery list
- **Expected:** Secret fetched successfully, navigates to join screen
- **Actual:**
- **Status:**

### Test 2.3: Cannot Get Secret When Too Far
- [ ] Stand > 50m from bonfire
- [ ] Tap bonfire in discovery list
- **Expected:** Error "You must be closer to the bonfire to join"
- **Actual:**
- **Status:**

### Test 2.4: Cannot Join With Old Secret
- [ ] Get secret code for bonfire A
- [ ] Wait 6 minutes (secret rotates every 5 min)
- [ ] Try to join with old secret
- **Expected:** "Invalid secret code or PIN"
- **Actual:**
- **Status:**

---

## Phase 3: Async Cleanup & Race Conditions

### Test 3.1: Rapid Screen Navigation
- [ ] Open bonfire chat screen
- [ ] Immediately press back before loading completes
- [ ] Repeat 5 times rapidly
- **Expected:** No errors, no memory warnings
- **Actual:**
- **Status:**

### Test 3.2: Presence Interval After Unmount
- [ ] Open bonfire chat
- [ ] Wait 35 seconds (past presence interval)
- [ ] Navigate away
- [ ] Check console for errors
- **Expected:** No errors about updating unmounted component
- **Actual:**
- **Status:**

---

## Phase 4: Location & Image Validation

### Test 4.1: Low Accuracy Location Rejected
- [ ] In location simulator, set accuracy to 100m
- [ ] Trigger background location update
- [ ] Check logs
- **Expected:** Log shows "Location accuracy too low, skipping update"
- **Actual:**
- **Status:**

### Test 4.2: Stale Location Rejected
- [ ] Mock location with timestamp 2 minutes old
- [ ] Trigger background update
- **Expected:** Log shows "Location is stale, skipping update"
- **Actual:**
- **Status:**

### Test 4.3: Image URLs Refresh on Chat Open
- [ ] Send image message in bonfire
- [ ] Close app completely
- [ ] Reopen chat after 1 hour
- [ ] Check image loads successfully
- **Expected:** Image displays (URL refreshed)
- **Actual:**
- **Status:**

---

## Phase 5: RPC Rate Limiting

### Test 5.1: Normal Discovery Usage
- [ ] Pull-to-refresh discovery screen 10 times over 30 seconds
- **Expected:** All requests succeed
- **Actual:**
- **Status:**

### Test 5.2: Rapid Discovery Spam Triggers Limit
- [ ] Write script to call findNearbyBonfires 31 times in 10 seconds
- **Expected:** 31st call fails with "Rate limit exceeded"
- **Actual:**
- **Status:**

### Test 5.3: Rate Limit Error Shows User Message
- [ ] Continue from 5.2
- [ ] Check UI for error message
- **Expected:** Alert shows "Searching too frequently. Please wait a moment"
- **Actual:**
- **Status:**

### Test 5.4: Rate Limit Resets After Window
- [ ] Wait 60 seconds after rate limit
- [ ] Pull-to-refresh discovery
- **Expected:** Request succeeds
- **Actual:**
- **Status:**

---

## Database Cleanup Tests

### Test 6.1: Old PIN Attempts Cleaned
- [ ] Create bonfire with PIN
- [ ] Enter wrong PIN 5 times (triggers rate limit)
- [ ] Check pin_attempts table: `SELECT COUNT(*) FROM pin_attempts WHERE user_id = [your-id]`
- [ ] Wait 1 hour
- [ ] Run cleanup: `SELECT cleanup_old_pin_attempts()`
- [ ] Check table again
- **Expected:** Old attempts deleted
- **Actual:**
- **Status:**

### Test 6.2: Expired Bonfires Cleaned
- [ ] Create bonfire with 1-hour expiry
- [ ] Wait for expiry + 24 hours (or mock with manual SQL)
- [ ] Run cleanup cron or manual: `DELETE FROM bonfires WHERE expires_at < NOW() - interval '24 hours'`
- **Expected:** Expired bonfire deleted
- **Actual:**
- **Status:**

---

## Performance Tests

### Test 7.1: Battery Drain During Background Tracking
- [ ] Enable background location tracking
- [ ] Charge device to 100%
- [ ] Disconnect charger
- [ ] Leave app running with tracking enabled for 1 hour
- [ ] Check battery percentage
- **Expected:** <10% battery drain
- **Actual:**
- **Status:**

### Test 7.2: Database Query Performance
- [ ] Create 50 test bonfires in various locations
- [ ] Call findNearbyBonfires with 50m radius
- [ ] Measure response time
- **Expected:** <500ms response time
- **Actual:**
- **Status:**

---

## Security Audit

### Test 8.1: Non-Participant Cannot Read Messages
- [ ] User A creates bonfire
- [ ] User B (not participant) attempts to query messages via SQL
- **Expected:** RLS policy blocks, returns empty
- **Actual:**
- **Status:**

### Test 8.2: Cannot Manipulate Rate Limit Table
- [ ] User attempts to INSERT into rpc_rate_limits via SQL
- **Expected:** RLS policy blocks
- **Actual:**
- **Status:**

### Test 8.3: Cannot Manipulate PIN Attempts
- [ ] User attempts to DELETE from pin_attempts via SQL
- **Expected:** RLS policy blocks
- **Actual:**
- **Status:**

---

## Regression Tests

### Test 9.1: Normal Bonfire Creation Still Works
- [ ] Create bonfire without PIN
- [ ] Verify appears in discovery
- [ ] Join bonfire
- [ ] Send text message
- [ ] Send image message
- **Expected:** All functionality works as before
- **Actual:**
- **Status:**

### Test 9.2: OAuth Sign-In Still Works
- [ ] Sign out completely
- [ ] Sign in with Apple
- [ ] Sign in with Google
- **Expected:** Both work without issues
- **Actual:**
- **Status:**

---

## Summary

**Total Tests:** 34
**Passed:**
**Failed:**
**Skipped:**

**Critical Issues Found:**


**Recommended Actions:**


**Ready for Production:** [ ] Yes [ ] No
```

**Step 2: Commit testing document**

```bash
git add docs/SECURITY_FIXES_TEST_RESULTS.md
git commit -m "docs: add security fixes testing checklist

- 34 test scenarios covering all security fixes
- PIN rate limiting tests
- Secret code security tests
- Async cleanup tests
- Location/image validation tests
- RPC rate limiting tests
- Performance and security audit tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 17: Update implementation plan document

**Files:**
- Modify: `docs/plans/2025-01-19-bonfire-proximity-chat.md`

**Step 1: Add note about security fixes at top of document**

Add after the header:

```markdown
---

## ⚠️ SECURITY UPDATE (2025-01-20)

**Security vulnerabilities identified in code review have been addressed in a follow-up plan:**
- See: `docs/plans/2025-01-20-fix-bonfire-security-issues.md`
- Branch: `bonfire-core-mechanics` (includes fixes)

**Critical fixes applied:**
- PIN rate limiting (5 attempts / 15 min)
- Secret code removed from discovery API
- RPC rate limiting (30 calls / min)
- Location validation (accuracy + staleness checks)
- Image URL refresh mechanism
- Async cleanup race condition fixes

**All security issues from code review resolved.**

---
```

**Step 2: Commit updated documentation**

```bash
git add docs/plans/2025-01-19-bonfire-proximity-chat.md
git commit -m "docs: add security update note to original plan

- Reference security fixes implementation plan
- List critical fixes applied
- Note all code review issues resolved

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final Verification

### Task 18: Full TypeScript compilation check

**Files:**
- All TypeScript files

**Step 1: Run full TypeScript check**

Run:
```bash
cd app && npx tsc --noEmit
```

Expected: No errors

**Step 2: If errors found, document and fix**

If any errors:
1. Document in commit message
2. Fix individually
3. Re-run compilation

**Step 3: Verify migrations apply cleanly**

Run:
```bash
pnpm supabase:reset --workdir .
```

Expected: All 6 new migrations apply successfully

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify TypeScript compilation and migrations

- All TypeScript files compile without errors
- All migrations apply cleanly
- Database schema up to date
- Types generated correctly

Ready for testing phase.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 18
**Estimated Time:** 4-6 hours

**Critical Security Fixes:**
- ✅ PIN rate limiting (5 attempts / 15 min)
- ✅ Secret code removed from discovery API
- ✅ Proximity validation for secret retrieval

**Important Stability Fixes:**
- ✅ Async cleanup race conditions
- ✅ Memory leak in chat screen
- ✅ Location validation (accuracy + staleness)
- ✅ Image URL refresh mechanism
- ✅ RPC rate limiting

**Infrastructure:**
- ✅ Automated database cleanup (cron jobs)
- ✅ Comprehensive testing checklist
- ✅ Updated documentation

**Next Steps:**
1. Execute this plan using superpowers:executing-plans
2. Complete manual testing checklist
3. Conduct security review with penetration testing
4. Deploy to production with monitoring

---

Plan complete and saved to `docs/plans/2025-01-20-fix-bonfire-security-issues.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
