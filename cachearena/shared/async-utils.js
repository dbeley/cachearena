/**
 * Async utilities for timing and data parsing
 */
/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Safely parse JSON with fallback value
 */
export function safeJsonParse(raw, fallback = null) {
    if (!raw)
        return fallback;
    try {
        return JSON.parse(raw);
    }
    catch (err) {
        console.warn("[async-utils] unable to parse JSON", err);
        return fallback;
    }
}
