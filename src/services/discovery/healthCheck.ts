/**
 * Health Check utility for verifying Maestro backend connectivity.
 *
 * Uses raw fetch (not ApiClient) because this runs before the API client is initialized.
 */

const TAG = '[HealthCheck]';
const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Check if a Maestro backend server is reachable and healthy.
 * Hits the baseUrl directly (e.g., GET /api/v1) which returns { status: 'ok' }.
 *
 * @param baseUrl - The base URL to check (e.g., "http://192.168.1.100:3000/api/v1")
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns true if the server responds with { status: 'ok' }
 */
export async function checkServerHealth(baseUrl: string, timeout = DEFAULT_TIMEOUT): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const url = baseUrl.replace(/\/+$/, '');

  console.log(TAG, `Checking ${url} (timeout: ${timeout}ms)`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(TAG, `Unhealthy response: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    const healthy = data?.status === 'ok';
    console.log(TAG, healthy ? 'Server is healthy' : `Unexpected response: ${JSON.stringify(data)}`);
    return healthy;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(TAG, `Failed: ${message}`);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
