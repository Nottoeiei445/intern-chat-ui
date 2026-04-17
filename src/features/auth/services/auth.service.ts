// src/features/auth/services/auth.service.ts
import axios from "axios";
import { AuthResponse, LoginCredentials, RegisterCredentials } from "../types";
import { AUTH_CONFIG } from "../config/auth.config";

// ==========================================
// Axios Instance Setup (เฉพาะสำหรับ Auth)
// ==========================================
const api = axios.create({
  baseURL: AUTH_CONFIG.api.baseURL, // 🚀 ตอนนี้มันดึงจาก ENV ที่เราทำไว้แล้ว!
  withCredentials: AUTH_CONFIG.api.withCredentials,
  headers: AUTH_CONFIG.api.headers,
});

// In-memory current access token
let currentAccessToken: string | null = null;

// ==========================================
// Interceptors: การจัดการ Token อัตโนมัติ
// ==========================================
api.interceptors.request.use(
  (config) => {
    if (currentAccessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ลอจิกจัดการคิวเมื่อ Token หมดอายุ (Pro-level implementation 🚀)
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute =
      originalRequest.url?.includes(AUTH_CONFIG.endpoints.login) ||
      originalRequest.url?.includes(AUTH_CONFIG.endpoints.refresh);

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
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
          const expiresIn = response.data?.data?.expiresIn || AUTH_CONFIG.token.accessTokenExpiryMinutes * 60;
          const expiresAt = Date.now() + expiresIn * 1000;
          
          if (typeof window !== "undefined") {
            localStorage.setItem(AUTH_CONFIG.session.tokenExpiryStorageKey, expiresAt.toString());
            // 🚀 ตรงนี้สำคัญ: เซฟทับ Key เดิม ทำให้ apiClient (Chat/Map) หยิบไปใช้ต่อได้ทันที
            localStorage.setItem(AUTH_CONFIG.session.accessTokenStorageKey, newToken);
          }

          currentAccessToken = newToken;
          onRefreshed(newToken);
          return api(originalRequest);
        }
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
            localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
          } catch (e) { /* ignore */ }
          localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
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

const calculateExpiresAt = (expiresInSeconds?: number): number => {
  const expiresIn = expiresInSeconds || AUTH_CONFIG.token.accessTokenExpiryMinutes * 60;
  return Date.now() + expiresIn * 1000;
};

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

const storeTokenExpiry = (expiresAt: number): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_CONFIG.session.tokenExpiryStorageKey, expiresAt.toString());
  } catch (e) { /* ignore */ }
};

const getStoredTokenExpiry = (): number | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
  return stored ? parseInt(stored, 10) : null;
};

const isTokenExpiringSoon = (): boolean => {
  const expiresAt = getStoredTokenExpiry();
  if (!expiresAt) return true;

  const thresholdMs = AUTH_CONFIG.token.refreshThresholdMinutes * 60 * 1000;
  return expiresAt - Date.now() <= thresholdMs;
};

// ==========================================
// Auth Service Methods
// ==========================================

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post(AUTH_CONFIG.endpoints.login, credentials);
      const data = response.data;

      if (data?.data) {
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);

        localStorage.setItem(AUTH_CONFIG.session.userStorageKey, JSON.stringify(data.data.user));
        authService.setSessionToken(data.data.accessToken ?? null);

        authService.logEvent("✅ [Auth] Login successful! Token received.");
      }
      return data;
    } catch (error: any) {
      throw createApiError(error, "Cannot connect to the server or CORS blocked.");
    }
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const { confirmPassword, ...payload } = credentials;
      const response = await api.post(AUTH_CONFIG.endpoints.register, payload);
      const data = response.data;

      if (data?.data) {
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);

        if (data.data.user) {
          localStorage.setItem(AUTH_CONFIG.session.userStorageKey, JSON.stringify(data.data.user));
        }

        authService.setSessionToken(data.data.accessToken ?? null);
        authService.logEvent("✅ [Auth] Registration successful!");
      }
      return data;
    } catch (error: any) {
      if (error.response) {
        const backendMsg = error.response.data?.message || "";
        if (/email.*(exists|already|registered)/i.test(backendMsg)) {
          throw createApiError(error, "Email already registered");
        }
        if (/username.*(taken|exists|already)/i.test(backendMsg)) {
          throw createApiError(error, "Username already taken");
        }
      }
      throw createApiError(error, "Cannot connect to the server or CORS blocked.");
    }
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post(AUTH_CONFIG.endpoints.refresh, {});
      const data = response.data;

      if (data?.data) {
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);
        authService.setSessionToken(data.data.accessToken ?? null);

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
        } catch (e) { /* ignore */ }
        localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
      }
      authService.setSessionToken(null);
      throw createApiError(error, "Session expired or not found.");
    }
  },

  refreshAccessToken: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post(AUTH_CONFIG.endpoints.refresh);
      const data = response.data;

      if (data?.data) {
        const expiresAt = calculateExpiresAt(data.data.expiresIn);
        storeTokenExpiry(expiresAt);
        authService.setSessionToken(data.data.accessToken ?? null);
        authService.logEvent("✅ [Auth] Token refreshed successfully.");
      }
      return data;
    } catch (error: any) {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
          localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
        } catch (e) { /* ignore */ }
        localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
      }
      authService.setSessionToken(null);
      throw createApiError(error, "Failed to refresh token.");
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post(AUTH_CONFIG.endpoints.logout);
    } catch (error) {
      authService.logEvent("ℹ️ [Auth] Backend logout failed, clearing client session.");
    } finally {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
          localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
        } catch (e) { /* ignore */ }
        localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
      }
      authService.setSessionToken(null);
      authService.logEvent("ℹ️ [Auth] Session cleared.");
    }
  },

  isTokenExpiringSoon: (): boolean => isTokenExpiringSoon(),

  getTimeUntilExpiry: (): number => {
    const expiresAt = getStoredTokenExpiry();
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  },

  logEvent: (message: string): void => {
    if (AUTH_CONFIG.features.enableAuthLogging) console.log(message);
  },

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
    } catch (e) { /* ignore */ }
  },

  getConfig: () => AUTH_CONFIG,
};