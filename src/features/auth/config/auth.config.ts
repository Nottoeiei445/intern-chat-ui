// src/features/auth/config/auth.config.ts
import { ENV } from '@/lib/env'; 
import { get } from 'http';
import { refresh } from 'next/cache';

/**
 * Auth Configuration
 * Centralized settings for authentication and token management
 */
export const AUTH_CONFIG = {
  // API Configuration
  api: {
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
    login: "/auth/sessions",         // POST: สร้าง Session (Login)
    refresh: "/auth/sessions", // POST: รีเฟรช Token
    getCurrentUser: "/auth/sessions", // GET: ดึงข้อมูล Session ปัจจุบัน (Me)
    logout: "/auth/sessions",        // DELETE: ทำลาย Session (ถ้าเพื่อนทำไว้นะ)
    register: "/auth/register",      // POST: ลงทะเบียน (เหมือนเดิม)
    guestMode: "/auth/guests",       // POST: สร้าง Guest session
  },

  session: {
    tokenCheckIntervalMs: 60000, // 1 minute
    refreshTokenCookieName: "refreshToken",
    accessTokenStorageKey: "access_token",
    tokenExpiryStorageKey: "expires_at",
    userStorageKey: "user",
    guestIdStorageKey: "guest_id",
    guestStartTimeStorageKey: "guest_start_time",
    guestWarningMinutesBeforeExpiry: 3,
    guestCheckIntervalMs: 60000, // Check every minute for guest expiry
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