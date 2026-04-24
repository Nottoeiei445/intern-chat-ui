"use client"

import axios from "axios";
import { AuthResponse, LoginCredentials, RegisterCredentials } from "../types";
import { AUTH_CONFIG } from "../config/auth.config";
import { storage } from "../../../lib/storage";

const api = axios.create({
  baseURL: AUTH_CONFIG.api.baseURL,
  withCredentials: AUTH_CONFIG.api.withCredentials,
  headers: AUTH_CONFIG.api.headers,
});

let currentAccessToken: string | null = null;

const clearAuthSession = () => {
  storage.removeCookie(AUTH_CONFIG.session.tokenExpiryStorageKey);
  storage.removeCookie(AUTH_CONFIG.session.accessTokenStorageKey);
  storage.removeLocal(AUTH_CONFIG.session.userStorageKey);
  storage.removeCookie(AUTH_CONFIG.session.guestIdStorageKey);
  currentAccessToken = null;
};

const saveAuthSession = (data: any) => {
  if (!data) return;
  
  const gId = data.guest_id || data.guestId;
  
  const defaultExpiryMinutes = gId 
    ? AUTH_CONFIG.token.guestExpiryMinutes 
    : AUTH_CONFIG.token.accessTokenExpiryMinutes;

  const expiresIn = data.expiresIn || defaultExpiryMinutes * 60;
  const expiresAt = Date.now() + expiresIn * 1000;

  storage.setCookie(AUTH_CONFIG.session.tokenExpiryStorageKey, expiresAt.toString(), expiresAt);
  
  if (data.accessToken) {
    storage.setCookie(AUTH_CONFIG.session.accessTokenStorageKey, data.accessToken, expiresAt);
    currentAccessToken = data.accessToken;
  }
  
  if (gId) {
    storage.setCookie(AUTH_CONFIG.session.guestIdStorageKey, gId, expiresAt);
  }
  
  if (data.user) {
    storage.setLocal(AUTH_CONFIG.session.userStorageKey, data.user);
  }
};

const getStoredTokenExpiry = (): number | null => {
  const stored = storage.getCookie(AUTH_CONFIG.session.tokenExpiryStorageKey);
  return stored ? parseInt(stored, 10) : null;
};

api.interceptors.request.use(
  (config) => {
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
    
    // ⚠️ แก้ตรงนี้: เช็คให้ครอบคลุมชื่อ endpoint ใหม่
    const isAuthRoute =
      originalRequest.url?.includes('/auth/sessions') || // ครอบคลุมทั้ง Login และ Refresh
      originalRequest.url?.includes('/auth/guests');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      // ... (ลอจิก Refresh เดิม)
      
      try {
        // ยิงไปที่ endpoint ใหม่ (มักจะเป็น /auth/sessions ด้วย Method POST หรือ PUT)
        const response = await axios.post(
          `${AUTH_CONFIG.api.baseURL}/auth/sessions`, 
          {},
          { withCredentials: true }
        );
        // ...
      } catch (refreshError) {
        clearAuthSession();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

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

export const authService = {
  initializeGuest: async (): Promise<any> => {
    try {
      // Path ใน config จะกลายเป็น /auth/guests
      const { data } = await api.post(AUTH_CONFIG.endpoints.guestMode); 
      if (data?.data) {
        saveAuthSession(data.data);
      }
      return data;
    } catch (error: any) {
      throw createApiError(error, "Failed to initialize guest mode.");
    }
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const guest_id = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
      
      const finalPayload = {
        ...credentials,
        ...(guest_id && { guest_id })
      };

      const { data } = await api.post(AUTH_CONFIG.endpoints.login, finalPayload);
      if (data?.data) {
        saveAuthSession(data.data);
        storage.removeCookie(AUTH_CONFIG.session.guestIdStorageKey);
        authService.logEvent("✅ [Auth] Login successful!");
      }
      return data;
    } catch (error: any) { 
      throw createApiError(error, "Login failed."); 
    }
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const { confirmPassword, ...payload } = credentials;
      
      const guest_id = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
      
      const finalPayload = {
        ...payload,
        ...(guest_id && { guest_id }) 
      };

      const { data } = await api.post(AUTH_CONFIG.endpoints.register, finalPayload);
      
      if (data?.data) {
        saveAuthSession(data.data);
        storage.removeCookie(AUTH_CONFIG.session.guestIdStorageKey);
        authService.logEvent("✅ [Auth] Registration successful!");
      }
      return data;
    } catch (error: any) {
      if (error.response) {
        const backendMsg = error.response.data?.message || "";
        if (/email.*(exists|already|registered)/i.test(backendMsg)) throw createApiError(error, "Email already registered");
        if (/username.*(taken|exists|already)/i.test(backendMsg)) throw createApiError(error, "Username already taken");
      }
      throw createApiError(error, "Registration failed.");
    }
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      // เปลี่ยนจาก .post เป็น .get และ Path ใน config คือ /auth/sessions
      const { data } = await api.get(AUTH_CONFIG.endpoints.getCurrentUser); 
      if (data?.data) {
        saveAuthSession(data.data);
        // ... (ลอจิกเดิม)
      }
      return data;
    } catch (error: any) {
      clearAuthSession();
      throw createApiError(error, "Session expired.");
    }
  },

  refreshAccessToken: async (): Promise<AuthResponse> => {
    try {
      const { data } = await api.post(AUTH_CONFIG.endpoints.refresh);
      if (data?.data) {
        saveAuthSession(data.data);
      }
      return data;
    } catch (error: any) {
      clearAuthSession();
      throw createApiError(error, "Failed to refresh token.");
    }
  },

  logout: async (): Promise<void> => {
    try {
      // เปลี่ยนจาก .post เป็น .delete และ Path ใน config คือ /auth/sessions
      await api.delete(AUTH_CONFIG.endpoints.logout); 
    } catch (error) {
      authService.logEvent("ℹ️ [Auth] Backend logout failed.");
    } finally {
      clearAuthSession();
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