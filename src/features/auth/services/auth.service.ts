import axios from "axios";
import { AuthResponse, LoginCredentials, RegisterCredentials } from "../types";
import { AUTH_CONFIG } from "../config/auth.config";

// ==========================================
// Axios Instance Setup
// ==========================================
const api = axios.create({
  baseURL: AUTH_CONFIG.api.baseURL,
  withCredentials: AUTH_CONFIG.api.withCredentials,
  headers: AUTH_CONFIG.api.headers,
});

// In-memory current access token
let currentAccessToken: string | null = null;

// Request interceptor: attach in-memory token if present
api.interceptors.request.use(
  (config) => {
    if (currentAccessToken) {
      const cfg = config as any;
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Keep track of ongoing refresh request to avoid multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// ==========================================
// Response Interceptor: Handle Token Refresh
// (INTENTIONALLY LEFT UNCHANGED per constraint — concurrency queue preserved)
// ==========================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute =
      originalRequest.url?.includes(AUTH_CONFIG.endpoints.login) ||
      originalRequest.url?.includes(AUTH_CONFIG.endpoints.refresh);

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${AUTH_CONFIG.api.baseURL}${AUTH_CONFIG.endpoints.refresh}`,
          {},
          { withCredentials: AUTH_CONFIG.api.withCredentials }
        );

        const newToken = response.data?.data?.accessToken;
        if (newToken) {
          // Store token expiration time
          const expiresIn =
            response.data?.data?.expiresIn ||
            AUTH_CONFIG.token.accessTokenExpiryMinutes * 60; // fallback to config
          const expiresAt = Date.now() + expiresIn * 1000;
          if (typeof window !== "undefined") {
            localStorage.setItem(
              AUTH_CONFIG.session.tokenExpiryStorageKey,
              expiresAt.toString()
            );
            // store access token in localStorage as well
            localStorage.setItem(
              AUTH_CONFIG.session.accessTokenStorageKey,
              newToken
            );
          }

          // update in-memory token so request interceptor uses it
          currentAccessToken = newToken;

          onRefreshed(newToken);
          return api(originalRequest);
        }
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          // Clear stored auth data in localStorage
          try {
            localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
            localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
          } catch (e) {
            /* ignore */
          }
          // Also remove stored user. Do NOT redirect here—let routing/auth guard handle it.
          localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
          // Clear in-memory token
          currentAccessToken = null;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ==========================================
// Helper Functions
// ==========================================

/**
 * Calculate expiration timestamp from expiresIn (seconds)
 */
const calculateExpiresAt = (expiresInSeconds?: number): number => {
  const expiresIn =
    expiresInSeconds ||
    AUTH_CONFIG.token.accessTokenExpiryMinutes * 60;
  return Date.now() + expiresIn * 1000;
};

/**
 * Normalize axios/server errors into an Error with metadata
 */
const createApiError = (error: any, fallbackMessage = "An unexpected error occurred.") => {
  const responseData = error?.response?.data ?? error?.data ?? null;

  const deriveMessage = (data: any): string | null => {
    if (!data) return null;
    if (typeof data === "string") return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    if (Array.isArray(data.errors) && data.errors.length) {
      const first = data.errors[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") return first.message ?? JSON.stringify(first);
    }
    return null;
  };

  const serverMessage = deriveMessage(responseData);
  const message = serverMessage ?? error?.message ?? fallbackMessage;
  const apiError = new Error(message) as any;
  apiError.status = error?.response?.status ?? error?.status ?? null;
  apiError.data = responseData;
  apiError.response = error?.response ?? null;
  return apiError;
};

/**
 * Store token expiration time in localStorage
 */
const storeTokenExpiry = (expiresAt: number): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      AUTH_CONFIG.session.tokenExpiryStorageKey,
      expiresAt.toString()
    );
  } catch (e) {
    /* ignore storage errors */
  }
};

/**
 * Get stored token expiration time from localStorage
 */
const getStoredTokenExpiry = (): number | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(
    AUTH_CONFIG.session.tokenExpiryStorageKey
  );
  return stored ? parseInt(stored, 10) : null;
};

/**
 * Check if token is expired or about to expire
 */
const isTokenExpiringSoon = (): boolean => {
  const expiresAt = getStoredTokenExpiry();
  if (!expiresAt) return true;

  const thresholdMs = AUTH_CONFIG.token.refreshThresholdMinutes * 60 * 1000;
  const expiresAtMs = expiresAt;
  const now = Date.now();

  return expiresAtMs - now <= thresholdMs;
};

// ==========================================
// Auth Service Methods
// ==========================================

export const authService = {
  /**
   * Login with credentials
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post(AUTH_CONFIG.endpoints.login, credentials);
      const data = response.data;

      if (data && data.data) {
        // Store token expiration time
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);

        // Store user data for persistence
        localStorage.setItem(
          AUTH_CONFIG.session.userStorageKey,
          JSON.stringify(data.data.user)
        );

        // Sync in-memory token if provided
        authService.setSessionToken(data.data.accessToken ?? null);

        authService.logEvent("✅ [Auth] Login successful! Token received.");
      }

      return data;
    } catch (error: any) {
      throw createApiError(error, "Cannot connect to the server or CORS blocked.");
    }
  },

  /**
   * Register with credentials
   * NOTE: `confirmPassword` is removed from payload before sending to backend
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const { confirmPassword, ...payload } = credentials;
      const response = await api.post(AUTH_CONFIG.endpoints.register, payload);
      const data = response.data;

      if (data && data.data) {
        // Store token expiration time if provided
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);

        // Store user data if provided
        if (data.data.user) {
          localStorage.setItem(
            AUTH_CONFIG.session.userStorageKey,
            JSON.stringify(data.data.user)
          );
        }

        // Sync in-memory token if provided
        authService.setSessionToken(data.data.accessToken ?? null);

        authService.logEvent("✅ [Auth] Registration successful!");
      }

      return data;
    } catch (error: any) {
      if (error.response) {
        const backendMsg = (error.response.data && error.response.data.message) || "";
        if (/email.*(exists|already|registered)/i.test(backendMsg)) {
          const e = new Error("Email already registered") as any;
          e.status = error.response.status;
          e.data = error.response.data;
          throw e;
        }
        if (/username.*(taken|exists|already)/i.test(backendMsg)) {
          const e = new Error("Username already taken") as any;
          e.status = error.response.status;
          e.data = error.response.data;
          throw e;
        }
        throw createApiError(error);
      }
      throw createApiError(error, "Cannot connect to the server or CORS blocked.");
    }
  },

  /**
   * Get current user (restore session)
   */
  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post(AUTH_CONFIG.endpoints.refresh, {});
      const data = response.data;

      if (data && data.data) {
        // Store token expiration time
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);

        // Sync in-memory token if provided
        authService.setSessionToken(data.data.accessToken ?? null);

        // Restore user from LocalStorage if backend doesn't send it
        if (!data.data.user) {
          const storedUser = localStorage.getItem(AUTH_CONFIG.session.userStorageKey);
          if (storedUser) {
            try {
              data.data.user = JSON.parse(storedUser);
            } catch (parseError) {
              authService.logEvent("⚠️ [Auth] Failed to parse stored user data.");
            }
          }
        }
      }

      return data;
    } catch (error: any) {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
          localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
        } catch (e) {
          /* ignore */
        }
        localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
      }
      authService.setSessionToken(null);
      throw createApiError(error, "Session expired or not found.");
    }
  },

  /**
   * Refresh access token using refresh token (from cookie)
   */
  refreshAccessToken: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post(AUTH_CONFIG.endpoints.refresh);
      const data = response.data;

      if (data && data.data) {
        // Store token expiration time
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);

        // Sync in-memory token if provided
        authService.setSessionToken(data.data.accessToken ?? null);

        authService.logEvent(
          "✅ [Auth] Token refreshed successfully using refresh token."
        );
      }

      return data;
    } catch (error: any) {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
          localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
        } catch (e) {
          /* ignore */
        }
        localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
      }
      authService.setSessionToken(null);
      throw createApiError(error, "Failed to refresh token.");
    }
  },

  /**
   * Logout and clear session
   */
  logout: async (): Promise<void> => {
    try {
      // Attempt to notify backend
      await api.post(AUTH_CONFIG.endpoints.logout);
    } catch (error) {
      // Logout anyway even if backend call fails
      authService.logEvent("ℹ️ [Auth] Backend logout failed, clearing client session.");
    } finally {
      // Clear client-side session
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
          localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
        } catch (e) {
          /* ignore */
        }
        localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
      }
      authService.setSessionToken(null);
      authService.logEvent("ℹ️ [Auth] Session cleared.");
    }
  },

  /**
   * Check if token is expiring soon
   */
  isTokenExpiringSoon: (): boolean => {
    return isTokenExpiringSoon();
  },

  /**
   * Get time until token expiration (in milliseconds)
   */
  getTimeUntilExpiry: (): number => {
    const expiresAt = getStoredTokenExpiry();
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  },

  /**
   * Utility: Log auth events (respects config flag)
   */
  logEvent: (message: string): void => {
    if (AUTH_CONFIG.features.enableAuthLogging) {
      console.log(message);
    }
  },

  /**
   * Set or clear the in-memory access token
   */
    setSessionToken: (token: string | null): void => {
    currentAccessToken = token;
    if (typeof window === "undefined") return;
    try {
      if (token) {
        localStorage.setItem(AUTH_CONFIG.session.accessTokenStorageKey, token);
      } else {
        localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
        localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
      }
    } catch (e) {
      /* ignore */
    }
  },

  /**
   * Get auth config (useful for components that need config values)
   */
  getConfig: () => AUTH_CONFIG,
};