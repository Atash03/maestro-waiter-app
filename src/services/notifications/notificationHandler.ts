/**
 * Notification Handler for the Maestro Waiter App
 *
 * Features:
 * - Handle waiter call SSE events
 * - Play sound notifications for new calls
 * - Trigger vibration for new calls
 * - Integration with notification store
 * - Respects user preferences for sound/vibration
 */

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '../../stores/notificationStore';
import type {
  OrderItemUpdatedEvent,
  WaiterCallAcknowledgedEvent,
  WaiterCallCancelledEvent,
  WaiterCallCompletedEvent,
  WaiterCallEvent,
} from '../../types/api';
import { OrderItemStatus } from '../../types/enums';
import type { SSEClient } from '../sse/sseClient';

// Cleanup functions for event subscriptions
type UnsubscribeFn = () => void;

// Notification sound URL (using a reliable free notification sound)
// Can be replaced with a local asset once a proper sound file is added to assets/sounds/
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Notification Handler class for managing waiter call notifications
 */
export class NotificationHandler {
  private sseClient: SSEClient;
  private unsubscribeFunctions: UnsubscribeFn[] = [];
  private notificationSound: Audio.Sound | null = null;
  private isInitialized = false;
  private soundLoadAttempted = false;

  constructor(sseClient: SSEClient) {
    this.sseClient = sseClient;
  }

  /**
   * Initialize the notification handler
   * Sets up audio and registers SSE event handlers
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize notification store
    await useNotificationStore.getState().initialize();

    // Set up audio mode for notifications
    await this.setupAudio();

    // Preload notification sound for faster playback
    this.preloadSound();

    // Register SSE event handlers
    this.registerEventHandlers();

    this.isInitialized = true;
  }

  /**
   * Set up audio for notification sounds
   */
  private async setupAudio(): Promise<void> {
    try {
      // Configure audio mode for notifications
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {
      // Audio setup errors are silently ignored - notifications will work without sound
    }
  }

  /**
   * Pre-load the notification sound for faster playback
   */
  private async preloadSound(): Promise<void> {
    if (this.soundLoadAttempted) return;
    this.soundLoadAttempted = true;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: false, volume: 1.0 }
      );
      this.notificationSound = sound;
    } catch {
      // Sound preload errors are silently ignored
    }
  }

  /**
   * Play notification sound
   */
  private async playSound(): Promise<void> {
    const { preferences } = useNotificationStore.getState();

    if (!preferences.soundEnabled) return;

    try {
      // If we have a preloaded sound, replay it
      if (this.notificationSound) {
        await this.notificationSound.setPositionAsync(0);
        await this.notificationSound.playAsync();
        return;
      }

      // Otherwise, load and play fresh
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: true, volume: 1.0 }
      );

      this.notificationSound = sound;

      // Clean up after playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          // Keep sound loaded for reuse, just stop it
          sound.stopAsync().catch(() => {
            // Ignore errors
          });
        }
      });
    } catch {
      // Sound playback errors are silently ignored
      // App continues to function without sound
    }
  }

  /**
   * Trigger vibration feedback
   */
  private async vibrate(): Promise<void> {
    const { preferences } = useNotificationStore.getState();

    if (!preferences.vibrationEnabled) return;

    try {
      // Use heavy impact for important notifications
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Add a short delay then vibrate again for emphasis
      setTimeout(async () => {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Ignore vibration errors
        }
      }, 300);
    } catch {
      // Vibration errors are silently ignored
    }
  }

  /**
   * Play notification feedback (sound + vibration)
   */
  private async playNotificationFeedback(): Promise<void> {
    // Run sound and vibration in parallel
    await Promise.all([this.playSound(), this.vibrate()]);
  }

  /**
   * Register SSE event handlers for waiter calls
   */
  private registerEventHandlers(): void {
    // Handler for new waiter calls
    const unsubWaiterCall = this.sseClient.on('waiter:call', (event: WaiterCallEvent) => {
      this.handleNewCall(event);
    });
    this.unsubscribeFunctions.push(unsubWaiterCall);

    // Handler for acknowledged calls
    const unsubAcknowledged = this.sseClient.on(
      'waiter:call-acknowledged',
      (event: WaiterCallAcknowledgedEvent) => {
        this.handleCallAcknowledged(event);
      }
    );
    this.unsubscribeFunctions.push(unsubAcknowledged);

    // Handler for completed calls
    const unsubCompleted = this.sseClient.on(
      'waiter:call-completed',
      (event: WaiterCallCompletedEvent) => {
        this.handleCallCompleted(event);
      }
    );
    this.unsubscribeFunctions.push(unsubCompleted);

    // Handler for cancelled calls
    const unsubCancelled = this.sseClient.on(
      'waiter:call-cancelled',
      (event: WaiterCallCancelledEvent) => {
        this.handleCallCancelled(event);
      }
    );
    this.unsubscribeFunctions.push(unsubCancelled);

    // Handler for order item updates (notify when item is ready)
    const unsubOrderItemUpdated = this.sseClient.on(
      'order-item:updated',
      (event: OrderItemUpdatedEvent) => {
        this.handleOrderItemUpdated(event);
      }
    );
    this.unsubscribeFunctions.push(unsubOrderItemUpdated);
  }

  /**
   * Handle new waiter call event
   */
  private handleNewCall(event: WaiterCallEvent): void {
    const store = useNotificationStore.getState();

    // Add call to the store
    store.addCall(event);

    // Play notification feedback
    this.playNotificationFeedback();
  }

  /**
   * Handle call acknowledged event
   */
  private handleCallAcknowledged(event: WaiterCallAcknowledgedEvent): void {
    const store = useNotificationStore.getState();
    store.acknowledgeCall(event);
  }

  /**
   * Handle call completed event
   */
  private handleCallCompleted(event: WaiterCallCompletedEvent): void {
    const store = useNotificationStore.getState();
    store.completeCall(event);
  }

  /**
   * Handle call cancelled event
   */
  private handleCallCancelled(event: WaiterCallCancelledEvent): void {
    const store = useNotificationStore.getState();
    store.cancelCall(event);
  }

  /**
   * Handle order item updated event
   * Plays notification when an item becomes ready
   */
  private handleOrderItemUpdated(event: OrderItemUpdatedEvent): void {
    // Only notify when item becomes Ready
    if (event.status === OrderItemStatus.READY) {
      // Light vibration for ready items
      const { preferences } = useNotificationStore.getState();
      if (preferences.vibrationEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
          // Ignore vibration errors
        });
      }
    }
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Unsubscribe from all events
    for (const unsubscribe of this.unsubscribeFunctions) {
      unsubscribe();
    }
    this.unsubscribeFunctions = [];

    // Unload sound
    if (this.notificationSound) {
      try {
        await this.notificationSound.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      this.notificationSound = null;
    }

    this.isInitialized = false;
  }

  /**
   * Check if handler is initialized
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
let notificationHandlerInstance: NotificationHandler | null = null;

/**
 * Initialize the notification handler with an SSE client
 */
export function initializeNotificationHandler(sseClient: SSEClient): NotificationHandler {
  notificationHandlerInstance = new NotificationHandler(sseClient);
  return notificationHandlerInstance;
}

/**
 * Get the notification handler instance
 * Throws if not initialized
 */
export function getNotificationHandler(): NotificationHandler {
  if (!notificationHandlerInstance) {
    throw new Error(
      'Notification handler not initialized. Call initializeNotificationHandler() first.'
    );
  }
  return notificationHandlerInstance;
}

/**
 * Check if notification handler is initialized
 */
export function isNotificationHandlerInitialized(): boolean {
  return notificationHandlerInstance !== null;
}

/**
 * Reset the notification handler instance (useful for testing or logout)
 */
export async function resetNotificationHandler(): Promise<void> {
  if (notificationHandlerInstance) {
    await notificationHandlerInstance.cleanup();
    notificationHandlerInstance = null;
  }
}
