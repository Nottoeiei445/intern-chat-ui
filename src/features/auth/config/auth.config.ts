/**
 * Auth Configuration
 * Centralized settings for authentication and token management
 */

export const AUTH_CONFIG = {
  // API Configuration
  api: {
    baseURL: "https://ada-anthropopathic-ai.ngrok-free.dev",
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  },

  token: {
    // Access token expiration time (typically 15-30 minutes)
    accessTokenExpiryMinutes: 10,

    // Refresh token expiration time (typically 7-30 days)
    refreshTokenExpiryMinutes: 10080, // 7 days

    // Time before expiration to refresh proactively (in minutes)
    // This prevents the token from expiring while the user is active
    refreshThresholdMinutes: 1,
  },

  // Endpoints
  endpoints: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    getCurrentUser: "/auth/me",
    register: "/auth/register",
  },

  // Session Management
  session: {
    // Interval to check token expiration status (in milliseconds)
    tokenCheckIntervalMs: 60000, // 1 minute

    // Cookie name for refresh token
    refreshTokenCookieName: "refreshToken",
    // Keys used for persistence (stored in localStorage)
    accessTokenStorageKey: "access_token",
    // Cache token expiration timestamp (ms since epoch)
    tokenExpiryStorageKey: "expires_at",
    userStorageKey: "user",
  },

  // Redirect Configuration
  redirect: {
    // URL to redirect to after login
    afterLoginUrl: "/",

    // URL to redirect to after logout
    afterLogoutUrl: "/login",

    // URL to redirect to on authentication errors
    unauthorizedUrl: "/login",
  },

  // Validation settings used by the frontend registration form
  validation: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumber: true,
    usernameMinLength: 3,
    // Simple email regex — sufficient for standard validation before backend call
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // Feature Flags
  features: {
    // Enable automatic token refresh before expiration
    enableProactiveRefresh: true,

    // Enable persistent session (restore session on page reload)
    enableSessionPersistence: true,

    // Log auth events for debugging
    enableAuthLogging: true,
  },
};

export type AuthConfig = typeof AUTH_CONFIG;