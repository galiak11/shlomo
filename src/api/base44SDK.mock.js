/**
 * Mock @base44/sdk for local development
 *
 * Provides stub implementations of SDK exports to prevent
 * socket connection errors when running locally without Base44 backend.
 */

console.log('[DEV] Using mock @base44/sdk (no socket connection)');

export function createClient(config) {
  return {
    appId: config?.appId || 'local-dev',
    serverUrl: null,
    token: null,
    functionsVersion: null,
    requiresAuth: false,
    auth: {
      isAuthenticated: async () => true,
      me: async () => ({ id: 'local-user', email: 'dev@local', full_name: 'Local Dev' }),
      redirectToLogin: () => console.log('[DEV] Mock redirectToLogin'),
      logout: () => console.log('[DEV] Mock logout'),
    },
    appLogs: { logUserInApp: () => Promise.resolve() },
    analytics: { track: () => Promise.resolve() },
    entities: {},
    integrations: {},
    functions: {},
  };
}

export function createAxiosClient() {
  return {
    get: async () => ({ id: 'mock', public_settings: {} }),
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  };
}

export const utils = { createAxiosClient };
