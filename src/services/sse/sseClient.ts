/**
 * Server-Sent Events (SSE) Client for the Maestro Waiter App
 *
 * Features:
 * - Connect to SSE endpoint with session headers
 * - Subscribe to topics: waiter, org, kitchen, bar
 * - Handle reconnection on disconnect with exponential backoff
 * - Store last event ID for replay on reconnection
 * - Parse and dispatch events to registered handlers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import EventSource, { type EventSourceEvent, type EventSourceOptions } from 'react-native-sse';
import type {
  OrderCreatedEvent,
  OrderItemCreatedEvent,
  OrderItemUpdatedEvent,
  OrderUpdatedEvent,
  SSEEventType,
  SSETopic,
  WaiterCallAcknowledgedEvent,
  WaiterCallCancelledEvent,
  WaiterCallCompletedEvent,
  WaiterCallEvent,
} from '../../types/api';

// Storage key for last event ID
const LAST_EVENT_ID_KEY = 'maestro_sse_last_event_id';

// Reconnection configuration
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Connection state for the SSE client
 */
export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Event payload types mapped to event names
 */
export interface SSEEventPayloads {
  'waiter:call': WaiterCallEvent;
  'waiter:call-acknowledged': WaiterCallAcknowledgedEvent;
  'waiter:call-completed': WaiterCallCompletedEvent;
  'waiter:call-cancelled': WaiterCallCancelledEvent;
  'order:created': OrderCreatedEvent;
  'order:updated': OrderUpdatedEvent;
  'order-item:created': OrderItemCreatedEvent;
  'order-item:updated': OrderItemUpdatedEvent;
}

/**
 * Event handler function type
 */
export type SSEEventHandler<T extends SSEEventType> = (event: SSEEventPayloads[T]) => void;

/**
 * Connection state change handler
 */
export type SSEConnectionStateHandler = (state: SSEConnectionState) => void;

/**
 * Error handler
 */
export type SSEErrorHandler = (error: Error) => void;

/**
 * Configuration for the SSE client
 */
export interface SSEClientConfig {
  baseURL: string;
  sessionId: string;
  topics: SSETopic[];
  onConnectionStateChange?: SSEConnectionStateHandler;
  onError?: SSEErrorHandler;
}

/**
 * SSE Client class for handling real-time events
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private config: SSEClientConfig;
  private connectionState: SSEConnectionState = 'disconnected';
  private lastEventId: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Map<SSEEventType, Set<SSEEventHandler<SSEEventType>>> = new Map();
  private isManualDisconnect = false;

  constructor(config: SSEClientConfig) {
    this.config = config;
    this.loadLastEventId();
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): SSEConnectionState {
    return this.connectionState;
  }

  /**
   * Update session ID (e.g., after re-authentication)
   */
  public updateSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
    // If connected, reconnect with new session
    if (this.connectionState === 'connected') {
      this.disconnect();
      this.connect();
    }
  }

  /**
   * Update topics to subscribe to
   */
  public updateTopics(topics: SSETopic[]): void {
    this.config.topics = topics;
    // If connected, reconnect with new topics
    if (this.connectionState === 'connected') {
      this.disconnect();
      this.connect();
    }
  }

  /**
   * Connect to the SSE endpoint
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.isManualDisconnect = false;
    this.setConnectionState('connecting');

    try {
      // Load last event ID for replay
      await this.loadLastEventId();

      const url = `${this.config.baseURL}/sse`;
      const headers: Record<string, string> = {
        'maestro-session-id': this.config.sessionId,
        'x-maestro-topics': this.config.topics.join(','),
      };

      // Include last event ID for replay if available
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }

      const options: EventSourceOptions = {
        headers,
        // react-native-sse specific options
        timeoutBeforeConnection: 500,
        pollingInterval: 0, // Disable polling, use true SSE
      };

      this.eventSource = new EventSource(url, options);
      this.setupEventListeners();
    } catch (error) {
      this.setConnectionState('disconnected');
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to connect to SSE'));
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the SSE endpoint
   */
  public disconnect(): void {
    this.isManualDisconnect = true;
    this.cleanup();
    this.setConnectionState('disconnected');
  }

  /**
   * Register an event handler for a specific event type
   */
  public on<T extends SSEEventType>(eventType: T, handler: SSEEventHandler<T>): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)?.add(handler as SSEEventHandler<SSEEventType>);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unregister an event handler
   */
  public off<T extends SSEEventType>(eventType: T, handler: SSEEventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as SSEEventHandler<SSEEventType>);
    }
  }

  /**
   * Clear all handlers for a specific event type
   */
  public clearHandlers(eventType?: SSEEventType): void {
    if (eventType) {
      this.eventHandlers.delete(eventType);
    } else {
      this.eventHandlers.clear();
    }
  }

  /**
   * Set up event listeners on the EventSource
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Connection opened
    this.eventSource.addEventListener('open', () => {
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
    });

    // Connection closed
    this.eventSource.addEventListener('close', () => {
      if (!this.isManualDisconnect) {
        this.handleDisconnect();
      }
    });

    // Error handling
    this.eventSource.addEventListener('error', (event: EventSourceEvent) => {
      const error = new Error(event.message || 'SSE connection error');
      this.config.onError?.(error);

      if (!this.isManualDisconnect) {
        this.handleDisconnect();
      }
    });

    // Connected event (custom server event)
    this.eventSource.addEventListener('connected', (event: EventSourceEvent) => {
      // Server sends this event on successful connection
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          if (data.clientId) {
            // Store client ID if needed for debugging
          }
        } catch {
          // Ignore parse errors for connected event
        }
      }
    });

    // Register handlers for all SSE event types
    const eventTypes: SSEEventType[] = [
      'waiter:call',
      'waiter:call-acknowledged',
      'waiter:call-completed',
      'waiter:call-cancelled',
      'order:created',
      'order:updated',
      'order-item:created',
      'order-item:updated',
    ];

    for (const eventType of eventTypes) {
      this.eventSource.addEventListener(eventType, (event: EventSourceEvent) => {
        this.handleEvent(eventType, event);
      });
    }
  }

  /**
   * Handle incoming SSE event
   */
  private handleEvent(eventType: SSEEventType, event: EventSourceEvent): void {
    // Store last event ID for reconnection replay
    if (event.lastEventId) {
      this.lastEventId = event.lastEventId;
      this.saveLastEventId(event.lastEventId);
    }

    // Parse event data
    if (!event.data) return;

    try {
      const data = JSON.parse(event.data);

      // Dispatch to registered handlers
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch {
            // Handler errors are silently ignored to not break the event loop
          }
        }
      }
    } catch {
      // Parse errors are silently ignored
    }
  }

  /**
   * Handle disconnection and schedule reconnect
   */
  private handleDisconnect(): void {
    this.cleanup();
    this.setConnectionState('reconnecting');
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this.config.onError?.(new Error('Max reconnection attempts reached'));
        this.setConnectionState('disconnected');
      }
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * RECONNECT_BACKOFF_MULTIPLIER ** this.reconnectAttempts,
      MAX_RECONNECT_DELAY
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Set connection state and notify handler
   */
  private setConnectionState(state: SSEConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.config.onConnectionStateChange?.(state);
    }
  }

  /**
   * Load last event ID from storage
   */
  private async loadLastEventId(): Promise<void> {
    try {
      const id = await AsyncStorage.getItem(LAST_EVENT_ID_KEY);
      this.lastEventId = id;
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save last event ID to storage
   */
  private saveLastEventId(id: string): void {
    AsyncStorage.setItem(LAST_EVENT_ID_KEY, id).catch(() => {
      // Ignore storage errors
    });
  }

  /**
   * Clear stored last event ID
   */
  public async clearLastEventId(): Promise<void> {
    this.lastEventId = null;
    try {
      await AsyncStorage.removeItem(LAST_EVENT_ID_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Reset reconnection attempts (useful after manual reconnect)
   */
  public resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

// Singleton instance
let sseClientInstance: SSEClient | null = null;

/**
 * Initialize the SSE client with configuration
 */
export function initializeSSEClient(config: SSEClientConfig): SSEClient {
  sseClientInstance = new SSEClient(config);
  return sseClientInstance;
}

/**
 * Get the SSE client instance
 * Throws if not initialized
 */
export function getSSEClient(): SSEClient {
  if (!sseClientInstance) {
    throw new Error('SSE client not initialized. Call initializeSSEClient() first.');
  }
  return sseClientInstance;
}

/**
 * Check if SSE client is initialized
 */
export function isSSEClientInitialized(): boolean {
  return sseClientInstance !== null;
}

/**
 * Reset the SSE client instance (useful for testing or logout)
 */
export function resetSSEClient(): void {
  if (sseClientInstance) {
    sseClientInstance.disconnect();
    sseClientInstance = null;
  }
}
