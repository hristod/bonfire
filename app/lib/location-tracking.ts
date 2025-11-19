import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { LocationCoords, NearbyBonfire } from '@bonfire/shared';

const LOCATION_TRACKING_TASK = 'bonfire-location-tracking';

// Store of bonfire IDs we've already notified about (in-memory for this session)
const notifiedBonfires = new Set<string>();

// Define the background task
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTracking] Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    if (!location) return;

    const locationData: LocationCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
      timestamp: location.timestamp,
    };

    try {
      // Update creator's bonfire location if they have an active one
      await updateCreatorBonfireLocation(locationData);

      // Check for nearby bonfires and send notifications
      await checkForNearbyBonfires(locationData);
    } catch (err) {
      console.error('[LocationTracking] Failed to process location update:', err);
    }
  }
});

export async function startLocationTracking(): Promise<void> {
  try {
    // Request foreground permissions first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    // Request background permissions
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error('Background location permission not granted. You can still use Bonfire, but discovery will only work when the app is open.');
    }

    // Check if task is defined
    const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TRACKING_TASK);
    if (!isTaskDefined) {
      console.error('[LocationTracking] Task is not defined');
      return;
    }

    // Check if already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    if (hasStarted) {
      console.log('[LocationTracking] Already running');
      return;
    }

    // Start location updates
    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      accuracy: Location.Accuracy.Balanced, // ~100m accuracy, good battery life
      distanceInterval: 20, // Update every 20 meters
      timeInterval: 30000, // Or every 30 seconds (whichever comes first)
      showsBackgroundLocationIndicator: true, // iOS indicator
      foregroundService: {
        notificationTitle: 'Bonfire is active',
        notificationBody: 'Discovering nearby chat sessions',
        notificationColor: '#FF6B35',
      },
    });

    console.log('[LocationTracking] Started successfully');
  } catch (error) {
    console.error('[LocationTracking] Failed to start:', error);
    throw error;
  }
}

export async function stopLocationTracking(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      console.log('[LocationTracking] Stopped successfully');
    }
  } catch (error) {
    console.error('[LocationTracking] Failed to stop:', error);
  }
}

export async function getCurrentLocation(): Promise<LocationCoords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? undefined,
    timestamp: location.timestamp,
  };
}

async function updateCreatorBonfireLocation(location: LocationCoords): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user is a bonfire creator with an active bonfire
    const { data: activeBonfire, error } = await supabase
      .from('bonfires')
      .select('id')
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[LocationTracking] Error checking active bonfire:', error);
      return;
    }

    if (activeBonfire) {
      // Update bonfire location (creator is moving)
      const { error: updateError } = await supabase
        .from('bonfires')
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
        })
        .eq('id', activeBonfire.id);

      if (updateError) {
        console.error('[LocationTracking] Error updating bonfire location:', updateError);
      }
    }
  } catch (error) {
    console.error('[LocationTracking] Error in updateCreatorBonfireLocation:', error);
  }
}

async function checkForNearbyBonfires(location: LocationCoords): Promise<void> {
  try {
    // Query Supabase for bonfires within range
    const { data: nearbyBonfires, error } = await supabase.rpc('find_nearby_bonfires', {
      user_lat: location.latitude,
      user_lng: location.longitude,
      max_distance_meters: 50, // Search radius
    });

    if (error) {
      console.error('[LocationTracking] Failed to find nearby bonfires:', error);
      return;
    }

    if (!nearbyBonfires || nearbyBonfires.length === 0) {
      return;
    }

    // Filter to only notify about bonfires we haven't notified about yet
    const newBonfires = (nearbyBonfires as NearbyBonfire[]).filter(
      (bonfire) => !notifiedBonfires.has(bonfire.id)
    );

    for (const bonfire of newBonfires) {
      await sendBonfireNotification(bonfire);
      notifiedBonfires.add(bonfire.id);
    }
  } catch (error) {
    console.error('[LocationTracking] Error in checkForNearbyBonfires:', error);
  }
}

async function sendBonfireNotification(bonfire: NearbyBonfire): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Bonfire nearby!',
        body: `"${bonfire.name}" is ${Math.round(bonfire.distance_meters)}m away`,
        data: {
          bonfireId: bonfire.id,
          type: 'bonfire_discovery',
        },
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('[LocationTracking] Failed to send notification:', error);
  }
}

export function clearNotifiedBonfires(): void {
  notifiedBonfires.clear();
}
