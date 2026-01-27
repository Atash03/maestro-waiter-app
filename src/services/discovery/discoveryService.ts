/**
 * Zeroconf/Bonjour Discovery Service for finding the Maestro backend on the local network.
 *
 * Wraps react-native-zeroconf in the project's singleton service pattern.
 * The backend publishes a Bonjour service with:
 *   name: 'maestro-backend', type: 'http', port: <PORT>, txt: { organizationId }
 */

import Zeroconf from 'react-native-zeroconf';

const TAG = '[Discovery]';

// Default configuration
const DEFAULT_SERVICE_TYPE = 'http';
const DEFAULT_PROTOCOL = 'tcp';
const DEFAULT_DOMAIN = 'local.';
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const DEFAULT_API_PATH = '/api/v1';
const DEFAULT_SERVICE_NAME = 'maestro-backend';

/**
 * Represents a discovered Maestro server
 */
export interface DiscoveredServer {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt: Record<string, string>;
  url: string; // e.g., http://192.168.1.100:3000/api/v1
}

/**
 * Configuration for the discovery service
 */
export interface DiscoveryServiceConfig {
  serviceType?: string;
  protocol?: string;
  domain?: string;
  timeout?: number;
  apiPath?: string;
  serviceName?: string;
}

/**
 * Error thrown when discovery times out
 */
export class DiscoveryTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Service discovery timed out after ${timeout}ms`);
    this.name = 'DiscoveryTimeoutError';
  }
}

/**
 * Error thrown when discovery encounters an error
 */
export class DiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

/**
 * Get the first IPv4 address from an addresses array.
 * Filters out IPv6 addresses (contain ':').
 */
function getIPv4Address(addresses: string[]): string | null {
  return addresses.find((addr) => !addr.includes(':')) ?? null;
}

/**
 * Discovery Service class
 */
export class DiscoveryService {
  private zeroconf: Zeroconf | null = null;
  private readonly config: Required<DiscoveryServiceConfig>;

  constructor(config?: DiscoveryServiceConfig) {
    this.config = {
      serviceType: config?.serviceType ?? DEFAULT_SERVICE_TYPE,
      protocol: config?.protocol ?? DEFAULT_PROTOCOL,
      domain: config?.domain ?? DEFAULT_DOMAIN,
      timeout: config?.timeout ?? DEFAULT_TIMEOUT,
      apiPath: config?.apiPath ?? DEFAULT_API_PATH,
      serviceName: config?.serviceName ?? DEFAULT_SERVICE_NAME,
    };
  }

  /**
   * Start scanning for the Maestro backend service.
   * Returns a Promise that resolves with the first matching server found,
   * or rejects on timeout/error.
   */
  public discover(): Promise<DiscoveredServer> {
    return new Promise<DiscoveredServer>((resolve, reject) => {
      // Clean up any previous scan
      this.stop();

      this.zeroconf = new Zeroconf();
      let settled = false;

      console.log(TAG, `Starting scan for _${this.config.serviceType}._${this.config.protocol} in ${this.config.domain} (timeout: ${this.config.timeout}ms, looking for: "${this.config.serviceName}")`);

      const settle = (result: { server?: DiscoveredServer; error?: Error }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.stop();
        if (result.server) {
          console.log(TAG, `Resolved server: ${result.server.url} (name: ${result.server.name}, host: ${result.server.host})`);
          resolve(result.server);
        } else {
          console.warn(TAG, `Discovery failed: ${result.error?.message}`);
          reject(result.error);
        }
      };

      // Timeout handler
      const timeoutId = setTimeout(() => {
        console.warn(TAG, `Timed out after ${this.config.timeout}ms`);
        settle({ error: new DiscoveryTimeoutError(this.config.timeout) });
      }, this.config.timeout);

      // Scan started
      this.zeroconf.on('start', () => {
        console.log(TAG, 'Scan started');
      });

      // Service found (not yet resolved)
      this.zeroconf.on('found', (name) => {
        console.log(TAG, `Found service: "${name}"`);
      });

      // Service resolved - check if it matches our expected service name
      this.zeroconf.on('resolved', (service) => {
        console.log(TAG, `Resolved service: "${service.name}" at ${service.host}:${service.port} addresses=[${service.addresses?.join(', ')}] txt=${JSON.stringify(service.txt)}`);

        if (service.name !== this.config.serviceName) {
          console.log(TAG, `Skipping "${service.name}" (not "${this.config.serviceName}")`);
          return;
        }

        const ipv4 = getIPv4Address(service.addresses || []);
        if (!ipv4) {
          console.warn(TAG, `No IPv4 address found for "${service.name}", skipping`);
          return;
        }

        const url = `http://${ipv4}:${service.port}${this.config.apiPath}`;
        console.log(TAG, `Matched! Using ${url}`);

        settle({
          server: {
            name: service.name,
            host: service.host,
            port: service.port,
            addresses: service.addresses || [],
            txt: service.txt || {},
            url,
          },
        });
      });

      // Service removed
      this.zeroconf.on('remove', (name) => {
        console.log(TAG, `Service removed: "${name}"`);
      });

      // Error handler
      this.zeroconf.on('error', (err) => {
        console.error(TAG, `Zeroconf error: ${err.message}`);
        settle({ error: new DiscoveryError(err.message || 'Unknown discovery error') });
      });

      // Start scanning
      this.zeroconf.scan(this.config.serviceType, this.config.protocol, this.config.domain);
    });
  }

  /**
   * Stop any active scan
   */
  public stop(): void {
    if (this.zeroconf) {
      try {
        console.log(TAG, 'Stopping scan');
        this.zeroconf.stop();
      } catch {
        // Ignore stop errors
      }
    }
  }

  /**
   * Full cleanup - stop scan and remove all listeners
   */
  public cleanup(): void {
    if (this.zeroconf) {
      try {
        console.log(TAG, 'Cleaning up');
        this.zeroconf.stop();
        this.zeroconf.removeDeviceListeners();
      } catch {
        // Ignore cleanup errors
      }
      this.zeroconf = null;
    }
  }
}

// ============================================================================
// Singleton pattern (matches sseClient.ts / client.ts conventions)
// ============================================================================

let discoveryServiceInstance: DiscoveryService | null = null;

/**
 * Initialize the discovery service with configuration
 */
export function initializeDiscoveryService(config?: DiscoveryServiceConfig): DiscoveryService {
  discoveryServiceInstance = new DiscoveryService(config);
  return discoveryServiceInstance;
}

/**
 * Get the discovery service instance. Creates one with defaults if not initialized.
 */
export function getDiscoveryService(): DiscoveryService {
  if (!discoveryServiceInstance) {
    discoveryServiceInstance = new DiscoveryService();
  }
  return discoveryServiceInstance;
}

/**
 * Reset the discovery service instance
 */
export function resetDiscoveryService(): void {
  if (discoveryServiceInstance) {
    discoveryServiceInstance.cleanup();
    discoveryServiceInstance = null;
  }
}
