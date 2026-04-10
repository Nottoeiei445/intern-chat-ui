"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { UserProfile, LoginCredentials, RegisterCredentials } from "../types";
import { authService } from "../services/auth.service";
import { AUTH_CONFIG } from "../config/auth.config";

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  timeUntilExpiry: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number>(0);

  // ใช้ Ref เก็บ Interval เพื่อให้สั่งล้าง (Cleanup) ได้จากทุกที่
  const refreshCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const proactiveRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🧹 ฟังก์ชันสำหรับ "ล้างไพ่" ทุกอย่าง (Internal Helper)
  // ช่วยทั้งเรื่อง Security (ไม่เหลือข้อมูลค้าง) และ Performance (ล้างแรม)
  const clearAuthState = useCallback(() => {
    // 1. ล้าง State ใน Memory
    setUser(null);
    setAccessToken(null);
    setError(null);
    setTimeUntilExpiry(0);

    // 2. ล้างตัวดักจับ (Intervals/Timeouts) เพื่อป้องกัน Memory Leak
    if (refreshCheckIntervalRef.current) {
      clearInterval(refreshCheckIntervalRef.current);
      refreshCheckIntervalRef.current = null;
    }
    if (proactiveRefreshTimeoutRef.current) {
      clearTimeout(proactiveRefreshTimeoutRef.current);
      proactiveRefreshTimeoutRef.current = null;
    }

    // 3. ล้างขยะใน Storage
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_CONFIG.session.accessTokenStorageKey);
      localStorage.removeItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
      localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
    }
    
    authService.logEvent("🧹 Cleaned up all auth states and intervals.");
  }, []);

  // ==========================================
  // 1. Initialize Session on App Load
  // ==========================================
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (AUTH_CONFIG.features.enableSessionPersistence && typeof window !== "undefined") {
          const storedToken = localStorage.getItem(AUTH_CONFIG.session.accessTokenStorageKey);
          const storedExpires = localStorage.getItem(AUTH_CONFIG.session.tokenExpiryStorageKey);
          const expiresAt = storedExpires ? parseInt(storedExpires, 10) : null;

          if (storedToken && expiresAt && Date.now() < expiresAt) {
            authService.setSessionToken(storedToken);
            setAccessToken(storedToken);

            const storedUser = localStorage.getItem(AUTH_CONFIG.session.userStorageKey);
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch {
                setUser(null);
              }
            }
            setIsInitialized(true);
            return;
          }
        }

        const response = await authService.refreshAccessToken();
        if (response?.data) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user ?? null);
        }
      } catch (err) {
        // 🧹 ถ้า Initialize พลาด ให้ล้างขยะที่อาจค้างอยู่ทันที
        clearAuthState();
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSession();
    
    // Cleanup เมื่อ Component ถูกทำลาย (Unmount)
    return () => clearAuthState();
  }, [clearAuthState]);

  // ==========================================
  // 2. Token Expiration Checker (Performance Point)
  // ==========================================
  useEffect(() => {
    if (!AUTH_CONFIG.features.enableProactiveRefresh || !accessToken) return;

    const checkTokenExpiry = async () => {
      const timeRemaining = authService.getTimeUntilExpiry();
      setTimeUntilExpiry(Math.max(0, timeRemaining));

      if (authService.isTokenExpiringSoon()) {
        try {
          const response = await authService.refreshAccessToken();
          if (response?.data) {
            setAccessToken(response.data.accessToken);
          }
        } catch (err) {
          authService.logEvent("Proactive refresh failed.");
          // ถ้า Refresh ไม่ผ่าน (Token อาจจะตายสนิท) ให้สั่ง Logout ล้างเครื่องเลย
          logout(); 
        }
      }
    };

    refreshCheckIntervalRef.current = setInterval(
      checkTokenExpiry,
      AUTH_CONFIG.session.tokenCheckIntervalMs
    );

    // 🧹 ต้องมีตัว Return เพื่อล้าง Interval เก่าทิ้งทุกครั้งที่ Token เปลี่ยน
    return () => {
      if (refreshCheckIntervalRef.current) {
        clearInterval(refreshCheckIntervalRef.current);
      }
    };
  }, [accessToken]);

  // ==========================================
  // 3. Login & 4. Register
  // ==========================================
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      if (response?.data) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(credentials);
      if (response?.data?.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
      } else {
        await login({ email: credentials.email, password: credentials.password });
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 5. Logout Function (Security & Cleanup Master)
  // ==========================================
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // 🧹 สั่งล้างทุกอย่างในเครื่องก่อนดีด User ออกไปหน้า Login
      clearAuthState();

      if (typeof window !== "undefined") {
        if (window.location.pathname !== AUTH_CONFIG.redirect.afterLogoutUrl) {
          window.location.href = AUTH_CONFIG.redirect.afterLogoutUrl;
        }
      }
    }
  };

  const refreshToken = async () => {
    try {
      const response = await authService.refreshAccessToken();
      if (response?.data) {
        setAccessToken(response.data.accessToken);
      }
    } catch (err: any) {
      setError(err.message || "Token refresh failed");
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isInitialized,
    error,
    login,
    register,
    logout,
    refreshToken,
    timeUntilExpiry,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isInitialized ? (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};