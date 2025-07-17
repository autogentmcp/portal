"use strict";
/**
 * Simple logger utility for consistent logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logWarning = logWarning;
exports.logError = logError;
/**
 * Log informational messages
 * @param message The message to log
 * @param data Optional data to include
 */
function logInfo(message, data) {
    console.log(`[INFO] ${message}`, data ? data : '');
}
/**
 * Log warning messages
 * @param message The message to log
 * @param data Optional data to include
 */
function logWarning(message, data) {
    console.warn(`[WARNING] ${message}`, data ? data : '');
}
/**
 * Log error messages
 * @param message The message to log
 * @param error Optional error object or data to include
 */
function logError(message, error) {
    console.error(`[ERROR] ${message}`);
    if (error) {
        if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
        }
        else {
            console.error(error);
        }
    }
}
