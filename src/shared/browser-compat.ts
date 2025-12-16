/**
 * Cross-browser compatibility utilities
 * Provides a unified interface for browser APIs across Firefox and Chrome
 */

// Cross-browser compatibility: Firefox uses 'browser', Chrome uses 'chrome'
export const browserAPI = (globalThis as any).browser || (globalThis as any).chrome;

/**
 * Storage API wrapper with Promise-based interface
 */
export const storage = {
  get: <T = any>(key: string): Promise<Record<string, T>> =>
    new Promise((resolve) => browserAPI.storage.local.get(key, resolve)),

  set: (values: Record<string, any>): Promise<void> =>
    new Promise((resolve) => browserAPI.storage.local.set(values, resolve)),

  remove: (key: string): Promise<void> =>
    new Promise((resolve) => browserAPI.storage.local.remove(key, resolve)),
};

/**
 * Send message to background script with Promise-based interface
 */
export function sendMessage<T = any>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage(message, (response: T) => {
      if (browserAPI.runtime.lastError) {
        reject(browserAPI.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Check if downloads API is available
 */
export function hasDownloadsApi(): boolean {
  return !!(
    browserAPI &&
    browserAPI.downloads &&
    typeof browserAPI.downloads.download === "function"
  );
}

/**
 * Check if browser info API is available (Firefox-specific)
 */
export function shouldPromptForDownload(): boolean {
  return !!(
    browserAPI &&
    browserAPI.runtime &&
    typeof browserAPI.runtime.getBrowserInfo === "function"
  );
}

/**
 * Trigger a file download
 */
export function triggerDownload(url: string, filename: string): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const maybePromise = browserAPI.downloads.download(
        {
          url,
          filename,
          // Firefox honors the user's "always ask" preference only when saveAs is true
          saveAs: shouldPromptForDownload(),
        },
        (downloadId: number) => {
          if (browserAPI.runtime.lastError) {
            reject(browserAPI.runtime.lastError);
            return;
          }
          resolve(downloadId);
        }
      );

      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve, reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}
