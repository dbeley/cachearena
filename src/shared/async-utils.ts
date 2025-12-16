/**
 * Async utilities for timing and data parsing
 */

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with fallback value
 */
export function safeJsonParse<T = any>(
  raw: string | null | undefined,
  fallback: T | null = null
): T | null {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[async-utils] unable to parse JSON", err);
    return fallback;
  }
}
