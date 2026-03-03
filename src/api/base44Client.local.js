/**
 * Mock Base44 client for local development
 *
 * Minimal stub — all content is public for MVP.
 * In local dev, auth always returns isAuthenticated: true.
 */

console.log('[DEV] Using mock base44 client (no SDK connection)');

export const DEV_STORAGE_KEYS = {
  TOKEN: 'shlomo_app_auth_token',
  USER: 'shlomo_app_current_user'
};

const DEFAULT_USER = {
  id: 'local-user',
  email: 'dev@local',
  full_name: 'Local Dev',
  role: 'user'
};

export const base44 = {
  appId: 'local-dev',
  serverUrl: null,
  token: null,
  functionsVersion: null,
  requiresAuth: false,

  auth: {
    isAuthenticated: async () => true,
    me: async () => DEFAULT_USER,
    redirectToLogin: () => console.log('[DEV] Mock redirectToLogin'),
    logout: () => {
      localStorage.removeItem(DEV_STORAGE_KEYS.TOKEN);
      console.log('[DEV] Mock logout');
    }
  },

  appLogs: { logUserInApp: () => Promise.resolve() },
  analytics: { track: () => Promise.resolve() },
  entities: {},
  integrations: {},
  functions: {},
};

export default base44;
