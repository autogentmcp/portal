/**
 * Simple logger utility for consistent logging
 */

/**
 * Log informational messages
 * @param message The message to log
 * @param data Optional data to include
 */
export function logInfo(message: string, data?: any): void {
  console.log(`[INFO] ${message}`, data ? data : '');
}

/**
 * Log warning messages
 * @param message The message to log
 * @param data Optional data to include
 */
export function logWarning(message: string, data?: any): void {
  console.warn(`[WARNING] ${message}`, data ? data : '');
}

/**
 * Log error messages
 * @param message The message to log
 * @param error Optional error object or data to include
 */
export function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${message}`);
  if (error) {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }
  }
}
