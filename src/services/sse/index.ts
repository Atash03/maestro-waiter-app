/**
 * SSE Services
 * Export all SSE-related functionality
 */

export {
  getSSEClient,
  initializeSSEClient,
  isSSEClientInitialized,
  resetSSEClient,
  SSEClient,
  type SSEClientConfig,
  type SSEConnectionState,
  type SSEConnectionStateHandler,
  type SSEErrorHandler,
  type SSEEventHandler,
  type SSEEventPayloads,
} from './sseClient';
