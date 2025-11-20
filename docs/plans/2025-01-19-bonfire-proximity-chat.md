# Bonfire Proximity Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a location-based proximity chat system where users create "bonfires" (chat rooms) discoverable via GPS within 10-50m range, with time-windowed secret codes for secure joining and real-time messaging with image support.

**Architecture:** Location-based discovery using PostGIS spatial queries, time-windowed HMAC secret codes (5-min windows, 2-min overlap), Supabase realtime for chat, background location tracking via Expo Task Manager, and image attachments via Supabase Storage with automatic resize/compression.

**Tech Stack:** React Native, Expo (Location, Task Manager, Notifications), Supabase (PostGIS, Realtime, Storage, RLS), TypeScript, Zustand, Gluestack UI v3, NativeWind

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

## Phase 1: Backend Infrastructure ✅ COMPLETED

### Task 1.1: Create Bonfire Tables Migration ✅

**Files:**
- ✅ Created: `supabase/migrations/20250119000001_create_bonfires_tables.sql`

**What was done:**
- Created `bonfires` table with PostGIS location_point column for spatial queries
- Created `bonfire_participants` table for tracking membership
- Created `bonfire_messages` table with support for text and image message types
- Added spatial indexes on location_point for performance
- Configured RLS policies: anyone can discover active bonfires, only participants can read messages

### Task 1.2: Create Image Storage Bucket ✅

**Files:**
- ✅ Created: `supabase/migrations/20250119000002_create_bonfire_images_bucket.sql`

**What was done:**
- Created `bonfire-images` storage bucket with 10MB file size limit
- Added RLS policies: only bonfire participants can view/upload images
- Allowed senders to delete their images within 5 minutes

### Task 1.3: Create Database Functions ✅

**Files:**
- ✅ Created: `supabase/migrations/20250119000003_create_bonfire_functions.sql`

**What was done:**
- `find_nearby_bonfires`: PostGIS spatial query returning bonfires within radius
- `validate_bonfire_join`: Validates secret code + optional PIN for join attempts
- `update_participant_presence`: Updates last_seen_at for presence tracking
- `get_bonfire_with_participants`: Fetches bonfire with participant list

---

## Phase 2: TypeScript Types ✅ COMPLETED

### Task 2.1: Create Bonfire Type Definitions ✅

**Files:**
- ✅ Created: `shared/types/bonfire.ts`
- ✅ Modified: `shared/types/index.ts`

**What was done:**
- Exported database row types (BonfireRow, BonfireMessageRow, etc.)
- Created extended interfaces with joined data (Bonfire, BonfireMessage, BonfireParticipant)
- Defined form data types (CreateBonfireData, JoinBonfireData)
- Added discovery and location types (NearbyBonfire, LocationCoords, ImageUploadResult)

---

## Phase 3: Location & Notifications ✅ COMPLETED

### Task 3.1: Create Location Tracking Utility ✅

**Files:**
- ✅ Created: `app/lib/location-tracking.ts`

**What was done:**
- Defined background task `bonfire-location-tracking` with TaskManager
- Implemented `startLocationTracking`: Requests permissions, starts background updates every 20m/30s
- Implemented `updateCreatorBonfireLocation`: Updates bonfire location if user is creator
- Implemented `checkForNearbyBonfires`: Queries for nearby bonfires, sends notifications
- Tracks notified bonfires in-memory to avoid duplicate notifications

### Task 3.2: Create Notification Setup Utility ✅

**Files:**
- ✅ Created: `app/lib/notifications.ts`

**What was done:**
- Configured notification handler for foreground alerts
- Implemented `registerForPushNotifications`: Requests permissions, sets up Android channel
- Implemented `setupNotificationListeners`: Handles notification taps, navigates to discovery/chat

---

## Phase 4: Business Logic ✅ COMPLETED

### Task 4.1: Create Secret Code Generator ✅

**Files:**
- ✅ Created: `app/lib/secret-code.ts`

**What was done:**
- Implemented time-windowed secret generation (5-min windows)
- `generateSecretForWindow`: Creates HMAC-SHA256 from bonfireId + timestamp
- `generateCurrentSecret`: Generates secret for current window
- `isSecretValid`: Validates against current + previous window (2-min overlap)

### Task 4.2: Create Bonfire Utilities ✅

**Files:**
- ✅ Created: `app/lib/bonfire-utils.ts`

**What was done:**
- `createBonfire`: Creates bonfire with secret code, optional PIN hash, adds creator as participant
- `findNearbyBonfires`: Wraps RPC call to find_nearby_bonfires
- `joinBonfire`: Validates secret/PIN via RPC, adds user to participants
- `getBonfireWithParticipants`: Fetches bonfire + participant list
- `sendTextMessage` / `sendImageMessage`: Inserts messages with type validation
- `endBonfire` / `leaveBonfire`: Deactivates bonfire or removes participant
- `updatePresence`: Updates last_seen_at timestamp

---

## Phase 5: Image Upload (IN PROGRESS)

### Task 5.1: Create Image Upload Utility

**Files:**
- Create: `app/lib/uploadBonfireImage.ts`

**Implementation:**

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import { ImageUploadResult } from '@bonfire/shared';

async function processAndUploadImage(
  asset: ImagePicker.ImagePickerAsset,
  bonfireId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult> {
  // Resize to max 1920px (preserve aspect ratio)
  const maxWidth = 1920;
  const maxHeight = 1920;
  let resizeOptions: { width?: number; height?: number } = {};

  if (asset.width > maxWidth || asset.height > maxHeight) {
    const aspectRatio = asset.width / asset.height;
    if (aspectRatio > 1) {
      resizeOptions.width = Math.min(asset.width, maxWidth);
    } else {
      resizeOptions.height = Math.min(asset.height, maxHeight);
    }
  }

  onProgress?.(0.4);

  const manipulatedImage = await ImageManipulator.manipulateAsync(
    asset.uri,
    resizeOptions.width || resizeOptions.height ? [{ resize: resizeOptions }] : [],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  onProgress?.(0.6);

  const response = await fetch(manipulatedImage.uri);
  const blob = await response.blob();
  const sizeBytes = blob.size;

  if (sizeBytes > 10 * 1024 * 1024) {
    throw new Error('Image is too large. Maximum size is 10MB.');
  }

  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        const filename = `${bonfireId}/${userId}/${Date.now()}.jpg`;

        onProgress?.(0.8);

        const { error } = await supabase.storage
          .from('bonfire-images')
          .upload(filename, decode(base64Data), {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        onProgress?.(0.95);

        const { data: { publicUrl } } = supabase.storage
          .from('bonfire-images')
          .getPublicUrl(filename);

        if (!publicUrl) {
          throw new Error('Failed to get URL for uploaded image');
        }

        onProgress?.(1);

        resolve({
          url: publicUrl,
          width: manipulatedImage.width,
          height: manipulatedImage.height,
          sizeBytes,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function pickAndUploadBonfireImage(
  bonfireId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    onProgress?.(0.2);

    return await processAndUploadImage(asset, bonfireId, userId, onProgress);
  } catch (error) {
    console.error('Error uploading bonfire image:', error);
    throw error;
  }
}

export async function takeAndUploadBonfireImage(
  bonfireId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    onProgress?.(0.2);

    return await processAndUploadImage(asset, bonfireId, userId, onProgress);
  } catch (error) {
    console.error('Error taking and uploading photo:', error);
    throw error;
  }
}
```

**Step 1: Create the file**

```bash
# File: app/lib/uploadBonfireImage.ts
# Copy the implementation above
```

**Step 2: Verify imports**

Check that all dependencies exist:
- `expo-image-picker` ✅ (in package.json)
- `expo-image-manipulator` ✅ (in package.json)
- `base64-arraybuffer` ✅ (in package.json)

**Step 3: Commit**

```bash
git add app/lib/uploadBonfireImage.ts
git commit -m "feat: add bonfire image upload utility with resize/compress"
```

---

## Phase 6: State Management

### Task 6.1: Create Bonfire Store

**Files:**
- Create: `app/store/bonfireStore.ts`

**Implementation:**

```typescript
import { create } from 'zustand';
import { Bonfire, BonfireMessage, BonfireParticipant } from '@bonfire/shared';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface BonfireStore {
  // Current active bonfire
  activeBonfire: Bonfire | null;
  participants: BonfireParticipant[];
  messages: BonfireMessage[];

  // Loading states
  loading: boolean;
  sending: boolean;

  // Realtime subscription
  channel: RealtimeChannel | null;

  // Actions
  setActiveBonfire: (bonfire: Bonfire | null) => void;
  setParticipants: (participants: BonfireParticipant[]) => void;
  addMessage: (message: BonfireMessage) => void;
  setMessages: (messages: BonfireMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;

  // Realtime subscription management
  subscribeToMessages: (bonfireId: string) => Promise<void>;
  unsubscribe: () => void;

  // Cleanup
  reset: () => void;
}

export const useBonfireStore = create<BonfireStore>((set, get) => ({
  activeBonfire: null,
  participants: [],
  messages: [],
  loading: false,
  sending: false,
  channel: null,

  setActiveBonfire: (bonfire) => set({ activeBonfire: bonfire }),

  setParticipants: (participants) => set({ participants }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })),

  setMessages: (messages) =>
    set({
      messages: messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }),

  setLoading: (loading) => set({ loading }),

  setSending: (sending) => set({ sending }),

  subscribeToMessages: async (bonfireId: string) => {
    const { channel: existingChannel } = get();

    // Unsubscribe from existing channel
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
    }

    // Fetch existing messages
    const { data: messages, error } = await supabase
      .from('bonfire_messages')
      .select(`
        *,
        profiles:user_id (
          nickname,
          avatar_url
        )
      `)
      .eq('bonfire_id', bonfireId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else if (messages) {
      const formattedMessages = messages.map((msg) => ({
        ...msg,
        sender_nickname: (msg.profiles as any)?.nickname,
        sender_avatar_url: (msg.profiles as any)?.avatar_url,
      }));
      set({ messages: formattedMessages });
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`bonfire:${bonfireId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bonfire_messages',
          filter: `bonfire_id=eq.${bonfireId}`,
        },
        async (payload) => {
          // Fetch the message with profile data
          const { data: newMessage } = await supabase
            .from('bonfire_messages')
            .select(`
              *,
              profiles:user_id (
                nickname,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            const formattedMessage = {
              ...newMessage,
              sender_nickname: (newMessage.profiles as any)?.nickname,
              sender_avatar_url: (newMessage.profiles as any)?.avatar_url,
            };
            get().addMessage(formattedMessage);
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: async () => {
    const { channel } = get();
    if (channel) {
      await supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  reset: () => {
    const { unsubscribe } = get();
    unsubscribe();
    set({
      activeBonfire: null,
      participants: [],
      messages: [],
      loading: false,
      sending: false,
      channel: null,
    });
  },
}));
```

**Step 1: Create the file**

```bash
# File: app/store/bonfireStore.ts
# Copy the implementation above
```

**Step 2: Verify Zustand pattern**

Compare with existing `app/store/authStore.ts` to ensure consistent patterns.

**Step 3: Commit**

```bash
git add app/store/bonfireStore.ts
git commit -m "feat: add bonfire Zustand store with realtime subscriptions"
```

---

## Phase 7: UI Components

### Task 7.1: Create Bonfire Card Component

**Files:**
- Create: `app/components/bonfire/BonfireCard.tsx`

**Implementation:**

```typescript
import { Pressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Image } from 'react-native';
import { Lock, Users } from 'lucide-react-native';
import { NearbyBonfire } from '@bonfire/shared';

interface BonfireCardProps {
  bonfire: NearbyBonfire;
  onPress: () => void;
}

export function BonfireCard({ bonfire, onPress }: BonfireCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Box className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
        <HStack className="items-start gap-3">
          {/* Creator avatar */}
          <Box className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
            {bonfire.creator_avatar_url ? (
              <Image
                source={{ uri: bonfire.creator_avatar_url }}
                style={{ width: 48, height: 48 }}
                resizeMode="cover"
              />
            ) : (
              <Box className="w-12 h-12 bg-primary-100 items-center justify-center">
                <Text className="text-primary-600 font-bold text-lg">
                  {bonfire.creator_nickname[0].toUpperCase()}
                </Text>
              </Box>
            )}
          </Box>

          {/* Bonfire info */}
          <VStack className="flex-1 gap-1">
            <HStack className="items-center gap-2">
              <Text className="text-lg font-bold text-gray-900">
                {bonfire.name}
              </Text>
              {bonfire.has_pin && (
                <Lock size={16} color="#6B7280" />
              )}
            </HStack>

            <Text className="text-sm text-gray-600">
              by {bonfire.creator_nickname}
            </Text>

            {bonfire.description && (
              <Text className="text-sm text-gray-700 mt-1">
                {bonfire.description}
              </Text>
            )}

            <HStack className="items-center gap-4 mt-2">
              <HStack className="items-center gap-1">
                <Users size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600">
                  {bonfire.participant_count}
                </Text>
              </HStack>

              <Text className="text-xs text-gray-500">
                {Math.round(bonfire.distance_meters)}m away
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
```

**Step 1: Create component directory**

```bash
mkdir -p app/components/bonfire
```

**Step 2: Create the file**

```bash
# File: app/components/bonfire/BonfireCard.tsx
# Copy the implementation above
```

**Step 3: Verify UI imports**

Ensure Gluestack UI v3 components exist:
- `@/components/ui/box` ✅
- `@/components/ui/text` ✅
- `@/components/ui/hstack` ✅
- `@/components/ui/vstack` ✅

**Step 4: Commit**

```bash
git add app/components/bonfire/BonfireCard.tsx
git commit -m "feat: add BonfireCard component for discovery list"
```

### Task 7.2: Create Message Bubble Component

**Files:**
- Create: `app/components/bonfire/MessageBubble.tsx`

**Implementation:**

```typescript
import { View, Image, Pressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { BonfireMessage } from '@bonfire/shared';
import { useState } from 'react';

interface MessageBubbleProps {
  message: BonfireMessage;
  isOwnMessage: boolean;
  onImagePress?: (imageUrl: string) => void;
}

export function MessageBubble({ message, isOwnMessage, onImagePress }: MessageBubbleProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Box
      className={`mb-2 max-w-[80%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}
    >
      {/* Sender info (if not own message) */}
      {!isOwnMessage && (
        <Text className="text-xs text-gray-500 mb-1">
          {message.sender_nickname || 'Unknown'}
        </Text>
      )}

      {/* Message bubble */}
      <Box
        className={`rounded-2xl p-3 ${
          isOwnMessage
            ? 'bg-primary-600'
            : 'bg-gray-200'
        }`}
      >
        {/* Image message */}
        {message.message_type === 'image' && message.image_url && (
          <VStack className="gap-2">
            <Pressable onPress={() => onImagePress?.(message.image_url!)}>
              <Image
                source={{ uri: message.image_url }}
                style={{
                  width: 250,
                  height: message.image_height && message.image_width
                    ? (250 * message.image_height) / message.image_width
                    : 250,
                  borderRadius: 8,
                  backgroundColor: '#f0f0f0',
                }}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <Box className="absolute inset-0 items-center justify-center bg-gray-100 rounded-lg">
                  <Text className="text-gray-400">Loading...</Text>
                </Box>
              )}
            </Pressable>

            {/* Caption */}
            {message.content && (
              <Text className={isOwnMessage ? 'text-white' : 'text-gray-900'}>
                {message.content}
              </Text>
            )}
          </VStack>
        )}

        {/* Text message */}
        {message.message_type === 'text' && (
          <Text className={isOwnMessage ? 'text-white' : 'text-gray-900'}>
            {message.content}
          </Text>
        )}
      </Box>

      {/* Timestamp */}
      <Text className="text-xs text-gray-400 mt-1">
        {new Date(message.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Box>
  );
}
```

**Step 1: Create the file**

```bash
# File: app/components/bonfire/MessageBubble.tsx
# Copy the implementation above
```

**Step 2: Commit**

```bash
git add app/components/bonfire/MessageBubble.tsx
git commit -m "feat: add MessageBubble component with image support"
```

### Task 7.3: Create Message Input Component

**Files:**
- Create: `app/components/bonfire/MessageInput.tsx`

**Implementation:**

```typescript
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform } from 'react-native';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { HStack } from '@/components/ui/hstack';
import { Image } from 'react-native';
import { Camera, Image as ImageIcon, Send, X } from 'lucide-react-native';
import { pickAndUploadBonfireImage, takeAndUploadBonfireImage } from '@/lib/uploadBonfireImage';
import { sendTextMessage, sendImageMessage } from '@/lib/bonfire-utils';
import { useAuthStore } from '@/store/authStore';

interface MessageInputProps {
  bonfireId: string;
  onMessageSent?: () => void;
}

export function MessageInput({ bonfireId, onMessageSent }: MessageInputProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    width: number;
    height: number;
    sizeBytes: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const handlePickImage = async () => {
    if (!user) return;

    try {
      setUploading(true);
      const result = await pickAndUploadBonfireImage(
        bonfireId,
        user.id,
        (progress) => {
          console.log(`Upload progress: ${Math.round(progress * 100)}%`);
        }
      );

      if (result) {
        setImagePreview(result);
      }
    } catch (error) {
      console.error('Failed to pick and upload image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!user) return;

    try {
      setUploading(true);
      const result = await takeAndUploadBonfireImage(
        bonfireId,
        user.id,
        (progress) => {
          console.log(`Upload progress: ${Math.round(progress * 100)}%`);
        }
      );

      if (result) {
        setImagePreview(result);
      }
    } catch (error) {
      console.error('Failed to take and upload photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!user) return;
    if (!content.trim() && !imagePreview) return;

    try {
      setSending(true);

      if (imagePreview) {
        await sendImageMessage(
          bonfireId,
          imagePreview.url,
          imagePreview.width,
          imagePreview.height,
          imagePreview.sizeBytes,
          content.trim() || undefined
        );
      } else {
        await sendTextMessage(bonfireId, content.trim());
      }

      setContent('');
      setImagePreview(null);
      onMessageSent?.();
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  return (
    <Box className="border-t border-gray-200 bg-white p-3">
      {/* Image preview */}
      {imagePreview && (
        <Box className="mb-2 relative">
          <Image
            source={{ uri: imagePreview.url }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
          <Button
            size="xs"
            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
            onPress={handleRemoveImage}
          >
            <ButtonIcon as={X} className="text-white" size="sm" />
          </Button>
        </Box>
      )}

      {/* Input row */}
      <HStack className="items-center gap-2">
        {/* Image picker button */}
        <Button
          size="sm"
          variant="outline"
          onPress={handlePickImage}
          disabled={uploading || sending || !!imagePreview}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FF6B35" />
          ) : (
            <ButtonIcon as={ImageIcon} />
          )}
        </Button>

        {/* Camera button */}
        {Platform.OS !== 'web' && (
          <Button
            size="sm"
            variant="outline"
            onPress={handleTakePhoto}
            disabled={uploading || sending || !!imagePreview}
          >
            <ButtonIcon as={Camera} />
          </Button>
        )}

        {/* Text input */}
        <Input className="flex-1">
          <InputField
            placeholder={imagePreview ? 'Add a caption (optional)' : 'Type a message...'}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={imagePreview ? 500 : 2000}
            editable={!sending}
          />
        </Input>

        {/* Send button */}
        <Button
          size="sm"
          onPress={handleSend}
          disabled={(!content.trim() && !imagePreview) || sending}
          className="bg-primary-600"
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonIcon as={Send} className="text-white" />
          )}
        </Button>
      </HStack>
    </Box>
  );
}
```

**Step 1: Create the file**

```bash
# File: app/components/bonfire/MessageInput.tsx
# Copy the implementation above
```

**Step 2: Commit**

```bash
git add app/components/bonfire/MessageInput.tsx
git commit -m "feat: add MessageInput component with image picker/camera"
```

### Task 7.4: Create Image Viewer Modal

**Files:**
- Create: `app/components/bonfire/ImageViewerModal.tsx`

**Implementation:**

```typescript
import { Modal, Pressable, Image, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon } from '@/components/ui/button';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageViewerModal({ visible, imageUrl, onClose }: ImageViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <Box className="flex-1 bg-black">
          {/* Close button */}
          <Box className="absolute top-4 right-4 z-10">
            <Button
              size="sm"
              className="bg-white/20 rounded-full"
              onPress={onClose}
            >
              <ButtonIcon as={X} className="text-white" />
            </Button>
          </Box>

          {/* Full-screen image */}
          <Pressable onPress={onClose} style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </Pressable>
        </Box>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
```

**Step 1: Create the file**

```bash
# File: app/components/bonfire/ImageViewerModal.tsx
# Copy the implementation above
```

**Step 2: Commit**

```bash
git add app/components/bonfire/ImageViewerModal.tsx
git commit -m "feat: add ImageViewerModal for full-screen image viewing"
```

---

## Phase 8: Screen Implementation

### Task 8.1: Update Home Screen with Discovery

**Files:**
- Modify: `app/app/(app)/index.tsx`

**Step 1: Read existing home screen**

```bash
cat app/app/(app)/index.tsx
```

**Step 2: Add bonfire discovery to home screen**

Add the following imports and state:

```typescript
import { useEffect, useState } from 'react';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '@/lib/location-tracking';
import { findNearbyBonfires } from '@/lib/bonfire-utils';
import { NearbyBonfire } from '@bonfire/shared';
import { BonfireCard } from '@/components/bonfire/BonfireCard';
import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
```

Add state management:

```typescript
const [nearbyBonfires, setNearbyBonfires] = useState<NearbyBonfire[]>([]);
const [loading, setLoading] = useState(false);
const [locationEnabled, setLocationEnabled] = useState(false);
```

Add location tracking initialization:

```typescript
useEffect(() => {
  initializeLocationTracking();
  return () => {
    stopLocationTracking();
  };
}, []);

async function initializeLocationTracking() {
  try {
    await startLocationTracking();
    setLocationEnabled(true);
    await loadNearbyBonfires();
  } catch (error) {
    console.error('Failed to start location tracking:', error);
  }
}

async function loadNearbyBonfires() {
  try {
    setLoading(true);
    const location = await getCurrentLocation();
    const bonfires = await findNearbyBonfires(
      location.latitude,
      location.longitude,
      50 // 50m search radius
    );
    setNearbyBonfires(bonfires);
  } catch (error) {
    console.error('Failed to load nearby bonfires:', error);
  } finally {
    setLoading(false);
  }
}
```

Add UI for bonfire list:

```typescript
<FlatList
  data={nearbyBonfires}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <BonfireCard
      bonfire={item}
      onPress={() => router.push(`/bonfire/${item.id}`)}
    />
  )}
  refreshControl={
    <RefreshControl
      refreshing={loading}
      onRefresh={loadNearbyBonfires}
    />
  }
  ListEmptyComponent={
    <Box className="p-4 items-center">
      <Text className="text-gray-500">
        No bonfires nearby. Create one!
      </Text>
    </Box>
  }
/>
```

**Step 3: Commit**

```bash
git add app/app/(app)/index.tsx
git commit -m "feat: add bonfire discovery to home screen"
```

### Task 8.2: Create Bonfire Screen (Chat)

**Files:**
- Create: `app/app/(app)/bonfire/[id].tsx`

**Step 1: Create bonfire directory**

```bash
mkdir -p app/app/\(app\)/bonfire
```

**Step 2: Create bonfire chat screen**

```typescript
import { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import { useBonfireStore } from '@/store/bonfireStore';
import { useAuthStore } from '@/store/authStore';
import { MessageBubble } from '@/components/bonfire/MessageBubble';
import { MessageInput } from '@/components/bonfire/MessageInput';
import { ImageViewerModal } from '@/components/bonfire/ImageViewerModal';
import { getBonfireWithParticipants, updatePresence } from '@/lib/bonfire-utils';

export default function BonfireScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    activeBonfire,
    participants,
    messages,
    loading,
    setActiveBonfire,
    setParticipants,
    subscribeToMessages,
    reset,
  } = useBonfireStore();

  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) {
      router.back();
      return;
    }

    loadBonfire();
    subscribeToMessages(id);

    // Update presence every 30 seconds
    const presenceInterval = setInterval(() => {
      updatePresence(id);
    }, 30000);

    return () => {
      clearInterval(presenceInterval);
      reset();
    };
  }, [id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  async function loadBonfire() {
    if (!id) return;

    try {
      const { bonfire, participants } = await getBonfireWithParticipants(id);
      setActiveBonfire(bonfire);
      setParticipants(participants);
    } catch (error) {
      console.error('Failed to load bonfire:', error);
      router.back();
    }
  }

  if (!activeBonfire || !id) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Box className="flex-1 items-center justify-center">
          <Text>Loading...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <Box className="flex-1 bg-gray-50">
          {/* Header */}
          <Box className="bg-white border-b border-gray-200 p-4">
            <Text className="text-xl font-bold text-gray-900">
              {activeBonfire.name}
            </Text>
            <Text className="text-sm text-gray-600">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </Text>
          </Box>

          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwnMessage={item.user_id === user?.id}
                onImagePress={(url) => setImageViewerUrl(url)}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Box className="flex-1 items-center justify-center py-8">
                <Text className="text-gray-500">No messages yet</Text>
                <Text className="text-gray-400 text-sm mt-1">
                  Be the first to say something!
                </Text>
              </Box>
            }
          />

          {/* Message input */}
          <MessageInput bonfireId={id} />
        </Box>
      </KeyboardAvoidingView>

      {/* Image viewer */}
      <ImageViewerModal
        visible={!!imageViewerUrl}
        imageUrl={imageViewerUrl}
        onClose={() => setImageViewerUrl(null)}
      />
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add app/app/\(app\)/bonfire/\[id\].tsx
git commit -m "feat: add bonfire chat screen with realtime messaging"
```

### Task 8.3: Create Bonfire Creation Screen

**Files:**
- Create: `app/app/(app)/create-bonfire.tsx`

**Implementation:**

```typescript
import { useState } from 'react';
import { ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText, FormControlError, FormControlErrorText } from '@/components/ui/form-control';
import { VStack } from '@/components/ui/vstack';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { createBonfire } from '@/lib/bonfire-utils';
import { getCurrentLocation } from '@/lib/location-tracking';
import { CreateBonfireData } from '@bonfire/shared';

interface CreateBonfireForm {
  name: string;
  description?: string;
  expiryHours: string;
  proximityRadiusMeters: string;
  pin?: string;
}

export default function CreateBonfireScreen() {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBonfireForm>({
    defaultValues: {
      name: '',
      description: '',
      expiryHours: '12',
      proximityRadiusMeters: '30',
      pin: '',
    },
  });

  const onSubmit = async (data: CreateBonfireForm) => {
    try {
      setLoading(true);

      // Get current location
      const location = await getCurrentLocation();

      // Validate PIN if provided
      if (data.pin && !/^\d{4,6}$/.test(data.pin)) {
        Alert.alert('Invalid PIN', 'PIN must be 4-6 digits');
        return;
      }

      // Create bonfire
      const bonfireData: CreateBonfireData = {
        name: data.name.trim(),
        description: data.description?.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        proximityRadiusMeters: parseInt(data.proximityRadiusMeters, 10),
        expiryHours: parseInt(data.expiryHours, 10),
        pin: data.pin?.trim() || undefined,
      };

      const bonfire = await createBonfire(bonfireData);

      Alert.alert('Success', 'Bonfire created!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/bonfire/${bonfire.id}`),
        },
      ]);
    } catch (error) {
      console.error('Failed to create bonfire:', error);
      Alert.alert('Error', 'Failed to create bonfire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView className="flex-1 bg-white">
        <Box className="p-4">
          <Text className="text-2xl font-bold mb-4">Create Bonfire</Text>

          <VStack className="gap-4">
            {/* Name */}
            <FormControl isInvalid={!!errors.name}>
              <FormControlLabel>
                <FormControlLabelText>Name</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="name"
                rules={{
                  required: 'Name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' },
                  maxLength: { value: 50, message: 'Name must be at most 50 characters' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="My Bonfire"
                      value={value}
                      onChangeText={onChange}
                    />
                  </Input>
                )}
              />
              {errors.name && (
                <FormControlError>
                  <FormControlErrorText>{errors.name.message}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Description */}
            <FormControl isInvalid={!!errors.description}>
              <FormControlLabel>
                <FormControlLabelText>Description (optional)</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="description"
                rules={{
                  maxLength: { value: 200, message: 'Description must be at most 200 characters' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="What's this bonfire about?"
                      value={value}
                      onChangeText={onChange}
                      multiline
                    />
                  </Input>
                )}
              />
              {errors.description && (
                <FormControlError>
                  <FormControlErrorText>{errors.description.message}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Expiry Hours */}
            <FormControl isInvalid={!!errors.expiryHours}>
              <FormControlLabel>
                <FormControlLabelText>Expires in (hours)</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="expiryHours"
                rules={{
                  required: 'Expiry time is required',
                  pattern: { value: /^\d+$/, message: 'Must be a number' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="12"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                    />
                  </Input>
                )}
              />
              {errors.expiryHours && (
                <FormControlError>
                  <FormControlErrorText>{errors.expiryHours.message}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Proximity Radius */}
            <FormControl isInvalid={!!errors.proximityRadiusMeters}>
              <FormControlLabel>
                <FormControlLabelText>Proximity radius (meters)</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="proximityRadiusMeters"
                rules={{
                  required: 'Proximity radius is required',
                  pattern: { value: /^\d+$/, message: 'Must be a number' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="30"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                    />
                  </Input>
                )}
              />
              {errors.proximityRadiusMeters && (
                <FormControlError>
                  <FormControlErrorText>{errors.proximityRadiusMeters.message}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* PIN (optional) */}
            <FormControl isInvalid={!!errors.pin}>
              <FormControlLabel>
                <FormControlLabelText>PIN (optional, 4-6 digits)</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="pin"
                rules={{
                  pattern: { value: /^\d{4,6}$|^$/, message: 'PIN must be 4-6 digits' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input>
                    <InputField
                      placeholder="Leave empty for public bonfire"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      secureTextEntry
                    />
                  </Input>
                )}
              />
              {errors.pin && (
                <FormControlError>
                  <FormControlErrorText>{errors.pin.message}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {/* Submit button */}
            <Button
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              className="bg-primary-600 mt-4"
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ButtonText>Create Bonfire</ButtonText>
              )}
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 1: Create the file**

```bash
# File: app/app/(app)/create-bonfire.tsx
# Copy the implementation above
```

**Step 2: Commit**

```bash
git add app/app/\(app\)/create-bonfire.tsx
git commit -m "feat: add bonfire creation screen with form validation"
```

---

## Phase 9: Configuration

### Task 9.1: Update app.json for Permissions

**Files:**
- Modify: `app/app.json`

**Step 1: Add location and notification permissions**

Add to the `expo` object:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Bonfire to discover nearby chat sessions even when the app is in the background.",
          "locationWhenInUsePermission": "Allow Bonfire to discover nearby chat sessions.",
          "isAndroidBackgroundLocationEnabled": true,
          "isIosBackgroundLocationEnabled": true
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FF6B35"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location", "remote-notification"],
        "NSLocationWhenInUseUsageDescription": "Bonfire needs your location to discover nearby chat sessions.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Bonfire needs your location to discover nearby chat sessions even when the app is in the background.",
        "NSCameraUsageDescription": "Bonfire needs camera access to take photos for chat messages.",
        "NSPhotoLibraryUsageDescription": "Bonfire needs photo library access to share images in chat."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

**Step 2: Commit**

```bash
git add app/app.json
git commit -m "feat: add location, camera, and notification permissions"
```

### Task 9.2: Install Additional Dependencies

**Files:**
- Modify: `app/package.json`

**Step 1: Add missing dependencies**

```bash
cd app
pnpm add expo-location expo-task-manager expo-notifications lucide-react-native
```

**Step 2: Commit**

```bash
git add app/package.json app/pnpm-lock.yaml
git commit -m "chore: add expo-location, task-manager, notifications, and icons"
```

---

## Phase 10: Testing & Deployment

### Task 10.1: Run Database Migrations

**Step 1: Apply migrations to local Supabase**

```bash
cd /Users/hristodimitrov/projects/bonfire
pnpm supabase:reset
```

**Step 2: Verify tables exist**

```bash
pnpm supabase status
# Check that PostGIS extension is enabled
# Check that bonfires, bonfire_participants, bonfire_messages tables exist
```

**Step 3: Generate TypeScript types**

```bash
pnpm supabase:types
```

**Step 4: Verify generated types include bonfire tables**

```bash
cat shared/types/database.types.ts | grep -A 5 "bonfires"
```

### Task 10.2: Build Expo Development Client

**Step 1: Build for iOS (if on macOS)**

```bash
cd app
pnpm build:dev:ios
```

**Step 2: Build for Android**

```bash
cd app
pnpm build:dev:android
```

**Step 3: Install development client on physical device**

Follow Expo EAS Build instructions to install the development client.

### Task 10.3: Test Core Flows

**Manual testing checklist:**

1. **Create Bonfire Flow:**
   - Open app, navigate to create bonfire
   - Fill in name, description, expiry, radius
   - Optional: add PIN
   - Submit form
   - Verify bonfire created in database
   - Verify navigation to bonfire chat screen

2. **Discovery Flow:**
   - Enable location permissions
   - Navigate to home screen
   - Verify location tracking starts
   - Create bonfire on second device
   - Verify notification appears on first device
   - Tap notification, verify navigation to discovery list
   - Verify bonfire appears in list with distance

3. **Join Bonfire Flow:**
   - Tap bonfire card in discovery list
   - Enter secret code (auto-captured from backend)
   - If PIN required, enter PIN
   - Submit join
   - Verify navigation to bonfire chat screen

4. **Chat Flow:**
   - Send text message
   - Verify message appears in real-time
   - Send image from gallery
   - Verify image uploads and appears in chat
   - Take photo with camera
   - Verify photo uploads and appears in chat
   - Tap image to view full-screen
   - Verify full-screen viewer opens

5. **Background Location:**
   - Lock device or switch to another app
   - Move 20+ meters
   - Verify location updates in database
   - Verify no excessive battery drain

---

## Success Criteria

✅ Users can create bonfires with location, expiry, and optional PIN
✅ Background location tracking discovers nearby bonfires (<50m)
✅ Push notifications alert users to new bonfires
✅ Secret code validation prevents unauthorized access
✅ Real-time chat works with text and image messages
✅ Images auto-resize to 1920px max, compress to 0.8 quality
✅ RLS policies enforce participant-only message access
✅ Battery drain <10% per hour for creators with background tracking

---

## Next Steps (Phase 2: BLE Enhancement)

After Phase 1 is complete and tested:

1. Add `react-native-ble-plx` for BLE beacon broadcasting
2. Implement beacon scanning for automatic secret capture
3. Add "BLE Verified" badge for proximity-verified joins
4. Fall back to location-based discovery if BLE unavailable

---

## Notes for Engineer

- **Existing patterns:** Follow `authStore.ts` for Zustand patterns, `uploadAvatar.ts` for image uploads
- **Mobile-first:** This is a mobile app, not a website. No hover states, use native keyboard types, touch-optimized UI
- **Location permissions:** Background location requires careful user messaging. Show value before requesting.
- **Secret codes:** HMAC-based with 5-min windows. Current + previous window accepted for 2-min overlap.
- **Testing:** Must use physical devices for location/camera testing. Simulators won't work.
- **Performance:** Monitor battery drain during testing. Adjust location update intervals if needed.
- **Security:** RLS policies prevent unauthorized message access. Test with multiple users.

