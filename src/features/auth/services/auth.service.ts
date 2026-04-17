// src/features/auth/services/auth.service.ts
import axios from "axios";
import { AuthResponse, LoginCredentials, RegisterCredentials } from "../types";
import { AUTH_CONFIG } from "../config/auth.config";
import { storage } from "../../../lib/storage"; // 🚀 เรียกใช้จากส่วนกลางที่เราเพิ่งสร้าง

const api = axios.create({
  baseURL: AUTH_CONFIG.api.baseURL,
  withCredentials: AUTH_CONFIG.api.withCredentials,
  headers: AUTH_CONFIG.api.headers,
});

let currentAccessToken: string | null = null;

// ==========================================
// 🛠️ Helper ภายใน Auth (ลดโค้ดซ้ำ)
// ==========================================
const clearAuthSession = () => {
  storage.removeCookie(AUTH_CONFIG.session.tokenExpiryStorageKey);
  storage.removeCookie(AUTH_CONFIG.session.accessTokenStorageKey);
  storage.removeLocal(AUTH_CONFIG.session.userStorageKey);
  currentAccessToken = null;
};

const saveAuthSession = (data: any) => {
  if (!data) return;
  
  const expiresIn = data.expiresIn || AUTH_CONFIG.token.accessTokenExpiryMinutes * 60;
  const expiresAt = Date.now() + expiresIn * 1000;

  storage.setCookie(AUTH_CONFIG.session.tokenExpiryStorageKey, expiresAt.toString(), expiresAt);
  
  if (data.accessToken) {
    storage.setCookie(AUTH_CONFIG.session.accessTokenStorageKey, data.accessToken, expiresAt);
    currentAccessToken = data.accessToken;
  }
  
  if (data.user) {
    storage.setLocal(AUTH_CONFIG.session.userStorageKey, data.user);
  }
};

const getStoredTokenExpiry = (): number | null => {
  const stored = storage.getCookie(AUTH_CONFIG.session.tokenExpiryStorageKey);
  return stored ? parseInt(stored, 10) : null;
};

// ==========================================
// Interceptors
// ==========================================
api.interceptors.request.use(
  (config) => {
    // 🚀 เปลี่ยนมาดึงผ่าน storage.getCookie
    const token = currentAccessToken || storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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

        if (response.data?.data?.accessToken) {
          saveAuthSession(response.data.data); // 🚀 เก็บลงที่ใหม่
          onRefreshed(response.data.data.accessToken);
          return api(originalRequest);
        }
      } catch (refreshError) {
        clearAuthSession(); // 🚀 ล้างที่เดียวจบ
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Helper Error Functions
// ==========================================
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
      return typeof first === "string" ? first : (first?.message ?? JSON.stringify(first));
    }
    return null;
  };

  const serverMessage = deriveMessage(responseData);
  const apiError = new Error(serverMessage ?? error?.message ?? fallbackMessage) as any;
  apiError.status = error?.response?.status ?? error?.status ?? null;
  apiError.data = responseData;
  apiError.response = error?.response ?? null;
  return apiError;
};

// ==========================================
// Auth Service Methods
// ==========================================
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const { data } = await api.post(AUTH_CONFIG.endpoints.login, credentials);
      if (data?.data) {
        saveAuthSession(data.data);
        authService.logEvent("✅ [Auth] Login successful!");
      }
      return data;
    } catch (error: any) { throw createApiError(error, "Cannot connect to the server or CORS blocked."); }
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const { confirmPassword, ...payload } = credentials;
      const { data } = await api.post(AUTH_CONFIG.endpoints.register, payload);
      if (data?.data) {
        saveAuthSession(data.data);
        authService.logEvent("✅ [Auth] Registration successful!");
      }
      return data;
    } catch (error: any) {
      if (error.response) {
        const backendMsg = error.response.data?.message || "";
        if (/email.*(exists|already|registered)/i.test(backendMsg)) throw createApiError(error, "Email already registered");
        if (/username.*(taken|exists|already)/i.test(backendMsg)) throw createApiError(error, "Username already taken");
      }
      throw createApiError(error, "Cannot connect to the server or CORS blocked.");
    }
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      const { data } = await api.post(AUTH_CONFIG.endpoints.refresh, {});
      if (data?.data) {
        saveAuthSession(data.data);
        if (!data.data.user) {
          const storedUser = storage.getLocal(AUTH_CONFIG.session.userStorageKey);
          if (storedUser) {
            try { data.data.user = JSON.parse(storedUser); } catch { /* ignore */ }
          }
        }
      }
      return data;
    } catch (error: any) {
      clearAuthSession();
      throw createApiError(error, "Session expired or not found.");
    }
  },

  refreshAccessToken: async (): Promise<AuthResponse> => {
    try {
      const { data } = await api.post(AUTH_CONFIG.endpoints.refresh);
      if (data?.data) {
        saveAuthSession(data.data);
        authService.logEvent("✅ [Auth] Token refreshed successfully.");
      }
      return data;
    } catch (error: any) {
      clearAuthSession();
      throw createApiError(error, "Failed to refresh token.");
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post(AUTH_CONFIG.endpoints.logout);
    } catch (error) {
      authService.logEvent("ℹ️ [Auth] Backend logout failed, clearing client session.");
    } finally {
      clearAuthSession();
      authService.logEvent("ℹ️ [Auth] Session cleared.");
    }
  },

  isTokenExpiringSoon: (): boolean => {
    const expiresAt = getStoredTokenExpiry();
    if (!expiresAt) return true;
    return expiresAt - Date.now() <= (AUTH_CONFIG.token.refreshThresholdMinutes * 60 * 1000);
  },

  getTimeUntilExpiry: (): number => {
    const expiresAt = getStoredTokenExpiry();
    return expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;
  },

  logEvent: (message: string): void => {
    if (AUTH_CONFIG.features.enableAuthLogging) console.log(message);
  },

  setSessionToken: (token: string | null): void => {
    if (token) {
      currentAccessToken = token;
      const expiresAt = getStoredTokenExpiry() || undefined;
      storage.setCookie(AUTH_CONFIG.session.accessTokenStorageKey, token, expiresAt);
    } else {
      clearAuthSession();
    }
  },

  getConfig: () => AUTH_CONFIG,
};