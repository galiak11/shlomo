/**
 * Shared utility functions for the application
 */

// Dev context for feature flags - set once at load time
// On Base44 (non-localhost), all flags are false
// On local dev, all flags are true
const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const DevContext = {
  isLocal,
  showDevFeatures: isLocal,
};
