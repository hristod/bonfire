# Three-Section Bonfire List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the home screen into three sections: "My Bonfires" (active joined), "Nearby Bonfires" (not joined), and "Past Bonfires" (expired joined), with direct navigation for joined bonfires and improved UX indicators.

**Architecture:** Create a new RPC function `get_my_bonfires()` to fetch all bonfires the user has joined. Modify `find_nearby_bonfires()` to exclude already-joined bonfires. Update the home screen to display three sections with different behaviors: direct chat navigation for joined bonfires, normal join flow for nearby bonfires. Add "Host" badge for creator-owned bonfires and greyed-out styling for expired bonfires.

**Tech Stack:** Supabase (PostgreSQL functions, RLS), React Native, Expo Router, TypeScript, Gluestack UI v3, NativeWind

---

## Task 1: Create get_my_bonfires Database Function

**Files:**
- Create: `supabase/migrations/20251124000002_create_get_my_bonfires.sql`

**Step 1: Write migration for get_my_bonfires function**

Create the migration file with the following content:

```sql
-- Create function to get all bonfires the current user has joined
-- Returns bonfire data with participation metadata

CREATE OR REPLACE FUNCTION get_my_bonfires()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  creator_id UUID,
  creator_nickname TEXT,
  creator_avatar_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  proximity_radius_meters INTEGER,
  participant_count BIGINT,
  has_pin BOOLEAN,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  is_creator BOOLEAN,
  joined_at TIMESTAMPTZ
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
    b.latitude,
    b.longitude,
    b.proximity_radius_meters,
    (SELECT COUNT(*) FROM bonfire_participants WHERE bonfire_id = b.id) AS participant_count,
    b.has_pin,
    b.expires_at,
    b.is_active,
    (b.creator_id = auth.uid()) AS is_creator,
    bp.joined_at
  FROM bonfires b
  INNER JOIN bonfire_participants bp ON b.id = bp.bonfire_id
  LEFT JOIN profiles p ON b.creator_id = p.id
  WHERE bp.user_id = auth.uid()
  ORDER BY
    b.is_active DESC,
    bp.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_bonfires() TO authenticated;
```

**Step 2: Apply migration**

Run: `pnpm supabase:reset`

Expected: Migration applies successfully, function created

**Step 3: Commit migration**

```bash
git add supabase/migrations/20251124000002_create_get_my_bonfires.sql
git commit -m "feat: add get_my_bonfires RPC function

- Returns all bonfires user has joined with metadata
- Includes is_creator flag and joined_at timestamp
- Sorted by active status then join date"
```

---

## Task 2: Modify find_nearby_bonfires to Exclude Joined Bonfires

**Files:**
- Create: `supabase/migrations/20251124000003_exclude_joined_from_nearby.sql`

**Step 1: Write migration to modify find_nearby_bonfires**

Create migration file with the following content:

```sql
-- Modify find_nearby_bonfires to exclude bonfires user has already joined
-- This prevents duplicates between "My Bonfires" and "Nearby Bonfires" sections

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
  LEFT JOIN profiles p ON b.creator_id = p.id
  WHERE
    b.is_active = true
    AND b.expires_at > NOW()
    AND ST_DWithin(
      b.location_point,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_meters
    )
    -- Exclude bonfires user has already joined
    AND NOT EXISTS (
      SELECT 1 FROM bonfire_participants bp
      WHERE bp.bonfire_id = b.id
      AND bp.user_id = auth.uid()
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_nearby_bonfires(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
```

**Step 2: Apply migration**

Run: `pnpm supabase:reset`

Expected: Migration applies successfully, function updated

**Step 3: Commit migration**

```bash
git add supabase/migrations/20251124000003_exclude_joined_from_nearby.sql
git commit -m "feat: exclude joined bonfires from nearby results

- Prevents duplicates between My Bonfires and Nearby sections
- Adds NOT EXISTS check for bonfire_participants"
```

---

## Task 3: Add MyBonfire Type to Shared Types

**Files:**
- Modify: `shared/types/index.ts`

**Step 1: Read current types file**

Run: Read `shared/types/index.ts` to see existing Bonfire and NearbyBonfire types

**Step 2: Add MyBonfire type**

Add the following type after the NearbyBonfire type:

```typescript
export interface MyBonfire {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  creator_nickname: string | null;
  creator_avatar_url: string | null;
  latitude: number;
  longitude: number;
  proximity_radius_meters: number;
  participant_count: number;
  has_pin: boolean;
  expires_at: string;
  is_active: boolean;
  is_creator: boolean;
  joined_at: string;
}
```

**Step 3: Verify types compile**

Run: `cd app && pnpm tsc --noEmit`

Expected: No type errors

**Step 4: Commit type changes**

```bash
git add shared/types/index.ts
git commit -m "feat: add MyBonfire type for joined bonfires

- Includes is_creator and joined_at fields
- Used for My Bonfires and Past Bonfires sections"
```

---

## Task 4: Add getMyBonfires Utility Function

**Files:**
- Modify: `app/lib/bonfire-utils.ts`

**Step 1: Add getMyBonfires function**

Add this function after the `findNearbyBonfires` function:

```typescript
/**
 * Get all bonfires the current user has joined
 */
export async function getMyBonfires(): Promise<MyBonfire[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.rpc('get_my_bonfires');

    if (error) {
      console.error('getMyBonfires: Error fetching my bonfires:', error);
      throw error;
    }

    return data as MyBonfire[];
  } catch (error) {
    console.error('getMyBonfires: Failed to fetch my bonfires:', error);
    throw error;
  }
}
```

**Step 2: Add import for MyBonfire type**

At the top of the file, update the import from `@bonfire/shared`:

```typescript
import {
  CreateBonfireData,
  JoinBonfireData,
  Bonfire,
  NearbyBonfire,
  MyBonfire, // Add this
  BonfireMessage,
  BonfireParticipant,
} from '@bonfire/shared';
```

**Step 3: Verify types compile**

Run: `cd app && pnpm tsc --noEmit`

Expected: No type errors

**Step 4: Commit utility function**

```bash
git add app/lib/bonfire-utils.ts
git commit -m "feat: add getMyBonfires utility function

- Calls get_my_bonfires RPC
- Returns MyBonfire[] with participation metadata"
```

---

## Task 5: Update BonfireCard Component with Host Badge and Expired Styling

**Files:**
- Modify: `app/components/bonfire/BonfireCard.tsx`

**Step 1: Read current BonfireCard component**

Run: Read `app/components/bonfire/BonfireCard.tsx` to understand current structure

**Step 2: Update component props and styling**

Modify the component to accept new props and apply conditional styling:

```typescript
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Pressable } from 'react-native';
import { MapPin, Users, Clock } from 'lucide-react-native';
import { NearbyBonfire, MyBonfire } from '@bonfire/shared';

interface BonfireCardProps {
  bonfire: NearbyBonfire | MyBonfire;
  onPress: () => void;
  variant?: 'default' | 'expired';
  showHostBadge?: boolean;
}

export function BonfireCard({
  bonfire,
  onPress,
  variant = 'default',
  showHostBadge = false
}: BonfireCardProps) {
  const isExpired = variant === 'expired';
  const cardOpacity = isExpired ? 'opacity-60' : 'opacity-100';
  const cardScale = isExpired ? 'scale-95' : 'scale-100';

  // Calculate time remaining
  const expiresAt = new Date(bonfire.expires_at);
  const now = new Date();
  const hoursRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Pressable onPress={onPress}>
      <Box className={`bg-white rounded-lg p-4 mb-3 border border-gray-200 ${cardOpacity} ${cardScale}`}>
        <VStack space="sm">
          {/* Header with name and host badge */}
          <HStack space="sm" className="items-center justify-between">
            <HStack space="sm" className="items-center flex-1">
              <Text className="text-lg font-bold text-gray-900 flex-shrink">
                {bonfire.name}
              </Text>
              {showHostBadge && (
                <Badge action="success" variant="solid" size="sm">
                  <BadgeText>Host</BadgeText>
                </Badge>
              )}
            </HStack>
          </HStack>

          {/* Description */}
          {bonfire.description && (
            <Text className="text-gray-600 text-sm" numberOfLines={2}>
              {bonfire.description}
            </Text>
          )}

          {/* Metadata */}
          <HStack space="md" className="flex-wrap">
            {/* Participant count */}
            <HStack space="xs" className="items-center">
              <Users size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600">
                {bonfire.participant_count} {bonfire.participant_count === 1 ? 'person' : 'people'}
              </Text>
            </HStack>

            {/* Distance (only for NearbyBonfire) */}
            {'distance_meters' in bonfire && (
              <HStack space="xs" className="items-center">
                <MapPin size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600">
                  {Math.round(bonfire.distance_meters)}m away
                </Text>
              </HStack>
            )}

            {/* Time remaining */}
            {!isExpired && (
              <HStack space="xs" className="items-center">
                <Clock size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600">
                  {hoursRemaining > 0 ? `${hoursRemaining}h left` : 'Ending soon'}
                </Text>
              </HStack>
            )}

            {/* Expired indicator */}
            {isExpired && (
              <HStack space="xs" className="items-center">
                <Clock size={16} color="#DC2626" />
                <Text className="text-sm text-red-600">
                  Ended
                </Text>
              </HStack>
            )}
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );
}
```

**Step 3: Verify component compiles**

Run: `cd app && pnpm tsc --noEmit`

Expected: No type errors

**Step 4: Commit component changes**

```bash
git add app/components/bonfire/BonfireCard.tsx
git commit -m "feat: add host badge and expired variant to BonfireCard

- Add variant prop for expired styling (greyed, smaller)
- Add showHostBadge prop for creator indicator
- Support both NearbyBonfire and MyBonfire types"
```

---

## Task 6: Update Home Screen with Three Sections

**Files:**
- Modify: `app/app/(app)/index.tsx`

**Step 1: Update imports and state**

Replace the imports and state management:

```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '@/lib/location-tracking';
import { findNearbyBonfires, getMyBonfires, getBonfireSecret } from '@/lib/bonfire-utils';
import { NearbyBonfire, MyBonfire } from '@bonfire/shared';
import { BonfireCard } from '@/components/bonfire/BonfireCard';

interface BonfireSection {
  title: string;
  data: (MyBonfire | NearbyBonfire)[];
  type: 'my' | 'nearby' | 'past';
}
```

**Step 2: Update state variables**

Replace the state variables:

```typescript
export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const [myBonfires, setMyBonfires] = useState<MyBonfire[]>([]);
  const [nearbyBonfires, setNearbyBonfires] = useState<NearbyBonfire[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
```

**Step 3: Update data loading functions**

Replace the `loadNearbyBonfires` function with:

```typescript
  async function loadBonfires() {
    try {
      setLoading(true);

      // Load my bonfires (always available)
      const myBonfiresData = await getMyBonfires();
      setMyBonfires(myBonfiresData);

      // Load nearby bonfires (requires location)
      if (locationEnabled) {
        const location = await getCurrentLocation();
        const nearbyBonfiresData = await findNearbyBonfires(
          location.latitude,
          location.longitude,
          50 // 50m search radius
        );
        setNearbyBonfires(nearbyBonfiresData);
      }
    } catch (error: any) {
      console.error('HomeScreen: Failed to load bonfires:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load bonfires. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }
```

**Step 4: Update initialization function**

Modify `initializeLocationTracking`:

```typescript
  async function initializeLocationTracking() {
    try {
      await startLocationTracking();
      setLocationEnabled(true);
      await loadBonfires();
    } catch (error) {
      console.error('HomeScreen: Failed to start location tracking:', error);
      setLocationEnabled(false);
      // Still load my bonfires even without location
      try {
        const myBonfiresData = await getMyBonfires();
        setMyBonfires(myBonfiresData);
      } catch (err) {
        console.error('HomeScreen: Failed to load my bonfires:', err);
      }
      Alert.alert(
        'Location Required',
        'Please enable location permissions to discover nearby bonfires.',
        [{ text: 'OK' }]
      );
    } finally {
      setInitialLoad(false);
    }
  }
```

**Step 5: Add section data preparation**

Add this before the return statement:

```typescript
  // Split my bonfires into active and expired
  const activeBonfires = myBonfires.filter(b => b.is_active && new Date(b.expires_at) > new Date());
  const expiredBonfires = myBonfires.filter(b => !b.is_active || new Date(b.expires_at) <= new Date());

  // Prepare sections data
  const sections: BonfireSection[] = [
    { title: 'My Bonfires', data: activeBonfires, type: 'my' },
    { title: 'Nearby Bonfires', data: nearbyBonfires, type: 'nearby' },
    ...(expiredBonfires.length > 0
      ? [{ title: 'Past Bonfires', data: expiredBonfires, type: 'past' as const }]
      : []
    ),
  ];
```

**Step 6: Update tap handlers**

Replace `handleBonfirePress` with section-specific handlers:

```typescript
  const handleMyBonfirePress = (bonfire: MyBonfire) => {
    // Direct navigation to chat for joined bonfires
    router.push(`/bonfire/${bonfire.id}`);
  };

  const handleNearbyBonfirePress = async (bonfire: NearbyBonfire) => {
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
```

**Step 7: Replace FlatList with SectionList**

Replace the entire FlatList component with:

```typescript
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={({ item, section }) => {
                const isMyBonfire = section.type === 'my' || section.type === 'past';
                const bonfire = item as MyBonfire | NearbyBonfire;

                return (
                  <BonfireCard
                    bonfire={bonfire}
                    onPress={() => {
                      if (section.type === 'nearby') {
                        handleNearbyBonfirePress(bonfire as NearbyBonfire);
                      } else {
                        handleMyBonfirePress(bonfire as MyBonfire);
                      }
                    }}
                    variant={section.type === 'past' ? 'expired' : 'default'}
                    showHostBadge={isMyBonfire && (bonfire as MyBonfire).is_creator}
                  />
                );
              }}
              renderSectionHeader={({ section }) => (
                <Box className="bg-gray-50 px-4 py-2">
                  <Heading size="md" className="text-gray-700">
                    {section.title}
                  </Heading>
                </Box>
              )}
              renderSectionFooter={({ section }) => {
                if (section.data.length === 0) {
                  let emptyMessage = '';
                  if (section.type === 'my') {
                    emptyMessage = "You haven't joined any bonfires yet. Discover one nearby or create your own!";
                  } else if (section.type === 'nearby') {
                    emptyMessage = locationEnabled
                      ? 'No bonfires nearby. Create one!'
                      : 'Enable location to discover bonfires';
                  }

                  return (
                    <Box className="px-4 py-3">
                      <Text className="text-gray-500 text-sm text-center">
                        {emptyMessage}
                      </Text>
                    </Box>
                  );
                }
                return null;
              }}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadBonfires}
                />
              }
              contentContainerStyle={{ paddingBottom: 16 }}
              stickySectionHeadersEnabled={false}
            />
```

**Step 8: Update page title**

Change the header from "Nearby Bonfires" to "Bonfires":

```typescript
          <Heading size="2xl" className="mb-1">
            Bonfires
          </Heading>
```

**Step 9: Verify component compiles**

Run: `cd app && pnpm tsc --noEmit`

Expected: No type errors

**Step 10: Commit home screen changes**

```bash
git add app/app/\(app\)/index.tsx
git commit -m "feat: implement three-section bonfire list

- Add My Bonfires, Nearby Bonfires, Past Bonfires sections
- Direct navigation to chat for joined bonfires
- Show Host badge for creator-owned bonfires
- Grey out expired bonfires in Past Bonfires section
- Use SectionList for section headers and empty states"
```

---

## Task 7: Add Expired State to Bonfire Chat Screen

**Files:**
- Modify: `app/app/(app)/bonfire/[id].tsx`

**Step 1: Read current bonfire chat screen**

Run: Read `app/app/(app)/bonfire/[id].tsx` to understand current structure

**Step 2: Add expired state detection**

Add state and check after bonfire data loads:

```typescript
  const [isExpired, setIsExpired] = useState(false);

  // In the useEffect where bonfire is loaded, add:
  useEffect(() => {
    if (bonfire) {
      const expired = !bonfire.is_active || new Date(bonfire.expires_at) <= new Date();
      setIsExpired(expired);
    }
  }, [bonfire]);
```

**Step 3: Add expired banner component**

Add this banner component above the messages list:

```typescript
          {/* Expired banner */}
          {isExpired && (
            <Box className="bg-amber-50 border-b border-amber-200 p-3">
              <Text className="text-amber-800 text-sm text-center font-medium">
                This bonfire has ended. You can view the chat history but cannot send new messages.
              </Text>
            </Box>
          )}
```

**Step 4: Disable message input when expired**

Find the MessageInput component and add the disabled prop:

```typescript
        <MessageInput
          bonfireId={bonfireId}
          onSendMessage={handleSendMessage}
          disabled={isExpired}
        />
```

**Step 5: Update MessageInput component**

Modify `app/components/bonfire/MessageInput.tsx` to accept and handle disabled state:

Add `disabled?: boolean` to props interface and disable the input and button:

```typescript
interface MessageInputProps {
  bonfireId: string;
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ bonfireId, onSendMessage, disabled = false }: MessageInputProps) {
  // ...existing code...

  return (
    <Box className={`bg-white border-t border-gray-200 p-4 ${disabled ? 'opacity-50' : ''}`}>
      <HStack space="sm">
        <Input className="flex-1" isDisabled={disabled}>
          <InputField
            placeholder={disabled ? "This bonfire has ended" : "Type a message..."}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={!disabled}
          />
        </Input>
        <Button
          onPress={handleSend}
          isDisabled={loading || !message.trim() || disabled}
          className="bg-primary-600"
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Send size={20} color="white" />
          )}
        </Button>
      </HStack>
    </Box>
  );
}
```

**Step 6: Verify component compiles**

Run: `cd app && pnpm tsc --noEmit`

Expected: No type errors

**Step 7: Commit expired state changes**

```bash
git add app/app/\(app\)/bonfire/\[id\].tsx app/components/bonfire/MessageInput.tsx
git commit -m "feat: add expired state to bonfire chat screen

- Show banner when bonfire has ended
- Disable message input for expired bonfires
- Allow viewing chat history in read-only mode"
```

---

## Task 8: Generate TypeScript Types from Database

**Files:**
- Modify: `shared/types/database.types.ts` (auto-generated)

**Step 1: Generate types from Supabase**

Run: `pnpm supabase:types`

Expected: Types regenerated with new RPC function signatures

**Step 2: Verify types compile**

Run: `cd app && pnpm tsc --noEmit`

Expected: No type errors

**Step 3: Commit generated types**

```bash
git add shared/types/database.types.ts
git commit -m "chore: regenerate database types

- Add get_my_bonfires RPC signature
- Update find_nearby_bonfires RPC signature"
```

---

## Task 9: Test Three-Section Layout

**Step 1: Reset database and restart services**

Run: `pnpm supabase:reset`

Expected: All migrations apply successfully

**Step 2: Start app**

Run: `cd app && pnpm start`

Expected: App starts without errors

**Step 3: Manual testing checklist**

Test the following scenarios:

1. **Fresh user with no bonfires:**
   - My Bonfires: Shows empty state
   - Nearby Bonfires: Shows empty state if none nearby
   - Past Bonfires: Section hidden

2. **Create a bonfire:**
   - Appears in "My Bonfires" section
   - Shows "Host" badge
   - Tap navigates directly to chat (no join screen)

3. **Join someone else's bonfire:**
   - Tap nearby bonfire shows join screen
   - After joining, appears in "My Bonfires"
   - No longer appears in "Nearby Bonfires"
   - No "Host" badge shown

4. **Expired bonfire:**
   - Wait for bonfire to expire or manually set expires_at in past
   - Expired bonfire moves to "Past Bonfires" section
   - Card is greyed out and slightly smaller
   - Shows "Ended" status
   - Tap navigates to chat with disabled input
   - Shows expired banner

5. **Pull to refresh:**
   - Refreshes all three sections
   - Loading indicator shows

**Step 4: Document any issues found**

If issues found, create follow-up tasks to fix them.

---

## Testing Notes

**Manual Testing Required:**
- This is a UI-heavy feature with complex state management
- Automated tests for React Native components require additional setup (Jest, React Native Testing Library)
- For initial implementation, focus on manual testing

**Future Test Coverage:**
- Unit tests for `getMyBonfires()` utility function
- Unit tests for section filtering logic
- Integration tests for navigation flows
- Visual regression tests for expired card styling

---

## Verification Checklist

After completing all tasks:

- [ ] `pnpm supabase:reset` runs without errors
- [ ] `cd app && pnpm tsc --noEmit` shows no type errors
- [ ] App starts and home screen loads
- [ ] My Bonfires section shows joined bonfires
- [ ] Nearby Bonfires section excludes joined bonfires
- [ ] Past Bonfires section shows expired bonfires
- [ ] Host badge appears for creator-owned bonfires
- [ ] Expired cards are greyed out and smaller
- [ ] Tapping My Bonfire goes directly to chat
- [ ] Tapping Nearby Bonfire goes to join screen
- [ ] Expired bonfire chat shows banner and disabled input
- [ ] All sections have appropriate empty states
- [ ] Pull to refresh works for all sections

---

## Notes

- **DRY:** BonfireCard component reused across all sections with variants
- **YAGNI:** No premature optimization; simple filtering logic
- **Frequent commits:** Each task has a clear commit point
- **Zero context:** All file paths, code snippets, and commands are explicit
