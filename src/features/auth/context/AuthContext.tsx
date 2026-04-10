"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
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

  const refreshCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const proactiveRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // 1. Initialize Session on App Load
  // ==========================================
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // 1) If session persistence is enabled, check localStorage for a valid token
        if (
          AUTH_CONFIG.features.enableSessionPersistence &&
          typeof window !== "undefined"
        ) {
          const storedToken = localStorage.getItem(
            AUTH_CONFIG.session.accessTokenStorageKey
          );
          const storedExpires = localStorage.getItem(
            AUTH_CONFIG.session.tokenExpiryStorageKey
          );

          const expiresAt = storedExpires ? parseInt(storedExpires, 10) : null;

          if (storedToken && expiresAt && Date.now() < expiresAt) {
            // Token still valid — use it directly and avoid calling /refresh
            authService.setSessionToken(storedToken);
            setAccessToken(storedToken);

            const storedUser = localStorage.getItem(
              AUTH_CONFIG.session.userStorageKey
            );
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch {
                setUser(null);
              }
            }

            authService.logEvent(
              "Session restored from localStorage; skipping refresh."
            );
            setIsInitialized(true);
            return;
          }
        }

        // 2) No valid token in localStorage — try refreshing using refresh token
        const response = await authService.refreshAccessToken();

        if (response && response.data) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user ?? null);
          authService.logEvent("Session restored successfully on app load.");
        }
      } catch (err) {
        authService.logEvent("No active session. User needs to login.");

        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(
              AUTH_CONFIG.session.accessTokenStorageKey
            );
            localStorage.removeItem(
              AUTH_CONFIG.session.tokenExpiryStorageKey
            );
          } catch (e) {
            /* ignore */
          }
          localStorage.removeItem(AUTH_CONFIG.session.userStorageKey);
        }

        // Clear in-memory auth state; do NOT redirect here — let routing/AuthGuard handle navigation.
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, []);

  // ==========================================
  // 2. Token Expiration Checker
  // ==========================================
  useEffect(() => {
    if (!AUTH_CONFIG.features.enableProactiveRefresh) return;

    const checkTokenExpiry = async () => {
      const timeRemaining = authService.getTimeUntilExpiry();
      setTimeUntilExpiry(Math.max(0, timeRemaining));

      if (authService.isTokenExpiringSoon() && accessToken) {
        authService.logEvent(
          "Token expiring soon. Attempting proactive refresh..."
        );

        try {
          const response = await authService.refreshAccessToken();

          if (response && response.data) {
            setAccessToken(response.data.accessToken);
            authService.logEvent(
              "Proactive token refresh successful."
            );
          }
        } catch (err) {
          authService.logEvent(
            "Proactive token refresh failed: " + (err as Error).message
          );
        }
      }
    };

    refreshCheckIntervalRef.current = setInterval(
      checkTokenExpiry,
      AUTH_CONFIG.session.tokenCheckIntervalMs
    );

    return () => {
      if (refreshCheckIntervalRef.current) {
        clearInterval(refreshCheckIntervalRef.current);
      }
    };
  }, [accessToken]);

  // ==========================================
  // 3. Login Function
  // ==========================================
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);

      if (response && response.data) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        authService.logEvent("Login successful! Token received.");
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Login failed";
      setError(errorMsg);
      authService.logEvent("Login failed: " + errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 4. Register Function
  // ==========================================
  // ==========================================
  // 4. Register Function (With Auto-Login)
  // ==========================================
  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register(credentials);

      // กรณีที่ 1: Backend ส่ง accessToken กลับมาให้ตั้งแต่ตอนสมัคร
      if (response && response.data && response.data.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        authService.logEvent("Registration successful! Token received.");
      } 
      // กรณีที่ 2: สมัครสำเร็จ แต่ Backend ไม่ได้ส่ง Token มาให้ 
      else if (response) {
        authService.logEvent("Registration successful. Auto-logging in...");
        
        // แอบเรียกฟังก์ชัน login ซ้อนทันที โดยใช้อีเมลและรหัสผ่านที่เพิ่งกรอก
        await login({
          email: credentials.email,
          password: credentials.password,
        });
      } 
      else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Registration failed";
      setError(errorMsg);
      authService.logEvent("Registration failed: " + errorMsg);
      // โยน Error ออกไปให้ RegisterForm.tsx จับไปโชว์ Toast
      throw err; 
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 5. Logout Function
  // ==========================================
  const logout = async () => {
    if (refreshCheckIntervalRef.current) {
      clearInterval(refreshCheckIntervalRef.current);
    }
    if (proactiveRefreshTimeoutRef.current) {
      clearTimeout(proactiveRefreshTimeoutRef.current);
    }

    try {
      await authService.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
      setTimeUntilExpiry(0);
      authService.logEvent("Logged out successfully.");

      // Perform a single redirect to the configured logout page (if not already there)
      if (typeof window !== "undefined") {
        try {
          if (window.location.pathname !== AUTH_CONFIG.redirect.afterLogoutUrl) {
            window.location.href = AUTH_CONFIG.redirect.afterLogoutUrl;
          }
        } catch (e) {
          /* ignore */
        }
      }
    }
  };

  // ==========================================
  // 6. Manual Token Refresh Function
  // ==========================================
  const refreshToken = async () => {
    try {
      const response = await authService.refreshAccessToken();

      if (response && response.data) {
        setAccessToken(response.data.accessToken);
        authService.logEvent(
          "Token manually refreshed successfully."
        );
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Token refresh failed";
      setError(errorMsg);
      authService.logEvent("Token refresh failed: " + errorMsg);
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