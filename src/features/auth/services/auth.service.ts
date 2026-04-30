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
  storage.removeCookie(AUTH_CONFIG.session.refreshTokenCookieName); 
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

  const incomingRefreshToken = data.refreshToken || data.refresh_token; 
  if (incomingRefreshToken) {
    const refreshExpiresAt = Date.now() + (AUTH_CONFIG.token.refreshTokenExpiryMinutes * 60 * 1000);
    storage.setCookie(AUTH_CONFIG.session.refreshTokenCookieName, incomingRefreshToken, refreshExpiresAt);
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
    
    // ดักไว้ว่าถ้าเส้นที่พังคือเส้น Auth เอง (เช่นกำลัง Login หรือ กำลัง Refresh) ห้ามดัก! ปล่อยให้มันพังไป
    const isAuthRoute =
      (originalRequest.url?.includes('/auth/sessions') && 
       ['post', 'put'].includes(originalRequest.method?.toLowerCase() || '')) || 
      originalRequest.url?.includes('/auth/guests');

    // ถ้าเจอ 401, ยังไม่เคย Retry และไม่ใช่เส้น Auth
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true; // ทำเครื่องหมายไว้ว่า "กำลังจะลองใหม่นะ ห้ามวนลูป"

      if (isRefreshing) {
        // ถ้ามีคนกำลังไปขอตั๋วอยู่แล้ว ให้คนนี้ "เข้าคิวรอ"
        return new Promise(function(resolve) {
          addRefreshSubscriber((token: string) => {
            // พอได้ตั๋วมาปุ๊บ ค่อยเอามาแปะ Header แล้วยิง Request เดิมต่อ
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      // ถ้ายังไม่มีใครไปขอตั๋ว ให้ฉันเป็นคนไปขอ!
      isRefreshing = true;

      try {
        const responseData = await authService.refreshAccessToken();
        
        // ถ้าได้ Access Token อันใหม่มา...
        if (responseData?.data?.accessToken) {
          const newToken = responseData.data.accessToken;
          // 1. อัปเดตตัวแปรกลาง
          currentAccessToken = newToken;
          // 2. เรียกคนที่รออยู่ในคิวให้ทำงานต่อ
          onRefreshed(newToken);
          // 3. เอา Token ใหม่แปะให้ Request ของตัวเอง แล้วยิงซ้ำ
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          isRefreshing = false; // ปลดล็อคคิว
          return api(originalRequest); // ยิง Request เดิมอีกรอบด้วยพลังใหม่!
        }
      } catch (refreshError) {
        // ถ้า Refresh พัง (เช่น หมดอายุ 7 วันไปแล้ว)
        isRefreshing = false;
        clearAuthSession(); // ล้างบางได้เลย (เพราะหมดหนทางรอดแล้วจริงๆ)
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
      const { data } = await api.get(AUTH_CONFIG.endpoints.getCurrentUser); 
      if (data?.data) {
        saveAuthSession(data.data);
      }
      return data;
    } catch (error: any) {
      clearAuthSession();
      throw createApiError(error, "Session expired.");
    }
  },

  refreshAccessToken: async (): Promise<AuthResponse> => {
    try {
      const isGuest = !!storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
      if (isGuest) {
        return Promise.reject("Guest session does not use refresh tokens.");
      }

      const { data } = await api.put(AUTH_CONFIG.endpoints.refresh);

      if (data?.data) {
        saveAuthSession(data.data);
      }
      return data;
    } catch (error: any) {
      const isGuest = !!storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
      if (!isGuest) {
        clearAuthSession(); 
      }
      throw createApiError(error, "Failed to refresh token.");
    }
  },

  logout: async (): Promise<void> => {
    try {
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