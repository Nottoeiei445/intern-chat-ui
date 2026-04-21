// src/features/auth/config/auth.config.ts
import { ENV } from '@/lib/env'; // 🚀 Import ENV เข้ามา

/**
 * Auth Configuration
 * Centralized settings for authentication and token management
 */
export const AUTH_CONFIG = {
  // API Configuration
  api: {
    // 🚀 เปลี่ยนมาใช้ ENV.AUTH_API_URL
    baseURL: ENV.AUTH_API_URL || "http://localhost:3000",
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  },

  token: {
    accessTokenExpiryMinutes: 10,
    refreshTokenExpiryMinutes: 10080, // 7 days
    refreshThresholdMinutes: 1,
    guestExpiryMinutes: 60, // 1 hour for guest sessions
  },

  endpoints: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    getCurrentUser: "/auth/me",
    register: "/auth/register",
    guestMode: "/auth/guestmode",
  },

  session: {
    tokenCheckIntervalMs: 60000, // 1 minute
    refreshTokenCookieName: "refreshToken",
    accessTokenStorageKey: "access_token",
    tokenExpiryStorageKey: "expires_at",
    userStorageKey: "user",
    guestIdStorageKey: "guest_id",
  },

  redirect: {
    afterLoginUrl: "/",
    afterLogoutUrl: "/login",
    unauthorizedUrl: "/login",
  },

  validation: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumber: true,
    usernameMinLength: 3,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  features: {
    enableProactiveRefresh: true,
    enableSessionPersistence: true,
    enableAuthLogging: true,
  },
};

export type AuthConfig = typeof AUTH_CONFIG;